import { LinearProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MoorhenButton, MoorhenColourPicker } from "@/components/inputs";
import { MoorhenAccordion, MoorhenInfoCard, MoorhenStack } from "@/components/interface-base";
import { moorhen } from "../../../../types/moorhen";
import { MoorhenToggle } from "@/components/inputs/MoorhenToggle/Toggle"
import { addVectors, removeVectors, MoorhenVector } from "../../../../store/vectorsSlice";
import { useMoorhenInstance } from "../../../../InstanceManager";

export interface MoorhenXPIDResult {
    H_atom : string
    X_atom : string
    X_chain : string
    X_id : number
    X_res : string
    X_xyz_x : number
    X_xyz_y : number
    X_xyz_z : number
    angle_xh_pi : number
    angle_xpcn : number
    dist_X_Pi : number
    method : string
    model : string
    pdb : string
    pi_center_x : number
    pi_center_y : number
    pi_center_z : number
    pi_chain : string
    pi_id : number
    pi_res : string
    proj_dist : number
    theta : number
}

const XPID_MONOMER_ROOT = "data/ccp4_lib/data/monomers";
const XPID_STANDARD_MONOMER_PROBE = `${XPID_MONOMER_ROOT}/p/PHE.cif`;
const XPID_DEFAULT_VECTOR_RADIUS = 0.055;
const XPID_DEFAULT_DASH_SPACING = 0.22;
const XPID_ARROW_HEAD_LENGTH = 0.42;
const XPID_ARROW_HEAD_RADIUS_SCALE = 2.2;
const XPID_DISTANCE_LABEL_FONT_SIZE = 20;
const XPID_DISTANCE_LABEL_SCREEN_OFFSET_X = 0.25;
const XPID_DISTANCE_DECIMALS = 2;
let xpidCootDataPromise: Promise<void> | null = null;

const wasmPathExists = (path: string) => {
    try {
        (window.CCP4Module as any).FS.stat(path);
        return true;
    } catch (_err) {
        return false;
    }
};

const ensureWasmDirectory = (dirPath: string) => {
    const parts = dirPath.split("/").filter(part => part.length > 0);
    let currentPath = "";
    parts.forEach(part => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        try {
            (window.CCP4Module as any).FS.mkdir(currentPath);
        } catch (_err) {
            // Existing MEMFS directories throw; that is fine here.
        }
    });
};

const ensureXpidCootDataAvailable = async (urlPrefix: string) => {
    if (wasmPathExists(XPID_STANDARD_MONOMER_PROBE)) return;
    if (xpidCootDataPromise) return xpidCootDataPromise;

    xpidCootDataPromise = (async () => {
        const normalisedUrlPrefix = urlPrefix?.replace(/\/$/, "") || "/MoorhenAssets";
        const response = await fetch(`${normalisedUrlPrefix}/data.tar.gz`);
        if (!response.ok) {
            throw new Error(`Unable to fetch Moorhen data archive from ${normalisedUrlPrefix}/data.tar.gz`);
        }

        const fileData = new Uint8Array(await response.arrayBuffer());
        const doUnzip = fileData[0] === 0x1F && fileData[1] === 0x8B;
        const tarFileName = doUnzip ? "data.tar.gz" : "data.tar";
        const unzipName = doUnzip ? "data_tmp/data.tar" : "";

        ensureWasmDirectory("data_tmp");
        try {
            window.CCP4Module.FS_unlink(`data_tmp/${tarFileName}`);
        } catch (_err) {
            // The archive is only cached transiently while unpacking.
        }

        window.CCP4Module.FS_createDataFile("data_tmp", tarFileName, fileData, true, true);
        try {
            (window.CCP4Module as any).unpackCootDataFile(`data_tmp/${tarFileName}`, doUnzip, unzipName, "");
        } finally {
            try {
                window.CCP4Module.FS_unlink(`data_tmp/${tarFileName}`);
            } catch (_err) {
                // Unpacking may already have moved or removed the temporary file.
            }
        }

        if (!wasmPathExists(XPID_STANDARD_MONOMER_PROBE)) {
            console.warn(`XPID could not find ${XPID_STANDARD_MONOMER_PROBE} after unpacking Moorhen data.`);
        }
    })().catch(err => {
        xpidCootDataPromise = null;
        throw err;
    });

    return xpidCootDataPromise;
};

const cacheXpidMonomerDict = (compId: string, dictionary: string) => {
    const upperCompId = compId.trim().toUpperCase();
    if (!upperCompId || !dictionary) return;

    const targetDir = `${XPID_MONOMER_ROOT}/${upperCompId[0].toLowerCase()}`;
    const targetPath = `${targetDir}/${upperCompId}.cif`;
    ensureWasmDirectory(targetDir);

    try {
        window.CCP4Module.FS_unlink(targetPath);
    } catch (_err) {
        // The dictionary may not have been cached before.
    }
    window.CCP4Module.FS_createDataFile(targetDir, `${upperCompId}.cif`, new TextEncoder().encode(dictionary), true, true);
};

const cacheXpidMoleculeDictionaries = async (molecule: moorhen.Molecule) => {
    try {
        await molecule.loadMissingMonomers();
    } catch (_err) {
        // XPID can still run with the dictionaries already bundled in Moorhen.
    }

    const cachedCompIds = new Set<string>();
    Object.entries(molecule.ligandDicts ?? {}).forEach(([compId, dictionary]) => {
        cachedCompIds.add(compId.toUpperCase());
        cacheXpidMonomerDict(compId, dictionary);
    });

    const ligandCompIds = [...new Set((molecule.ligands ?? [])
        .map(ligand => ligand.resName?.trim().toUpperCase())
        .filter((compId): compId is string => Boolean(compId)))];

    await Promise.all(ligandCompIds
        .filter(compId => !cachedCompIds.has(compId))
        .map(async compId => {
            if (!molecule.monomerLibraryPath) return;
            try {
                const response = await fetch(`${molecule.monomerLibraryPath}/${compId[0].toLowerCase()}/${compId}.cif`);
                if (!response.ok) return;
                cacheXpidMonomerDict(compId, await response.text());
            } catch (_err) {
                // Missing dictionaries should not block XPID
            }
        }));
};

const formatXpidDistanceLabel = (interaction: MoorhenXPIDResult) => {
    return `${interaction.dist_X_Pi.toFixed(XPID_DISTANCE_DECIMALS)} \u00C5`;
};

export const MoorhenXPIDList = (props: {
    setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
    molecule: moorhen.Molecule;
    height?: number | string;
}) => {
    const dispatch = useDispatch();
    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo);
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch);
    const vectorsList = useSelector((state: moorhen.State) => state.vectors.vectorsList)
    const [vectorColour, setVectorColour] = useState({ r: 255, g: 0, b: 0 });
    const [showDistanceLabels, setShowDistanceLabels] = useState(false);

    const [xpidList, setXpidList] = useState<MoorhenXPIDResult[] | null>(null);
    const [xpidVisibleList, setXpidVisibleList] = useState<boolean[] | null>(null);
    const [xpidVectorsList, setXpidVectorsList] = useState<MoorhenVector[] | null>(null);

    const moorhenGlobalInstance = useMoorhenInstance()

    const validate = async () => {
        props.setBusy?.(true);
        try {
            try {
                await ensureXpidCootDataAvailable(moorhenGlobalInstance.paths.urlPrefix);
            } catch (err) {
                console.warn("XPID could not unpack Moorhen data into the main WASM module.", err);
            }
            await cacheXpidMoleculeDictionaries(props.molecule);
            const structure = window.CCP4Module.cloneGemmiStructureWithTrimmedAtomNames(props.molecule.gemmiStructure)
            const result = window.CCP4Module.detect_xhpi_interactions_json(structure)
            structure.delete()
            const interactions = JSON.parse(result) as MoorhenXPIDResult[]
            const theVectors: MoorhenVector[] = []
            const visibleList:boolean[]  = []
            interactions.forEach((inter,idx) => {
                const key = "__TAG_XPID_" +
                    props.molecule.uniqueId +inter.X_id+"_"+inter.H_atom+"_"+inter.X_atom+"_"+inter.X_chain+"_"+inter.X_res+inter.pi_id+"_"+"_"+inter.pi_chain+"_"+inter.pi_res + "_" + idx
                const matchingKeyVectors = vectorsList.filter(v => {
                    return v.uniqueId===key
                    })
                if(matchingKeyVectors.length===0)
                    visibleList.push(false)
                else {
                    visibleList.push(true)
                    setVectorColour(matchingKeyVectors[0].vectorColour);
                }
                const interactionColour = matchingKeyVectors[0]?.vectorColour ?? vectorColour;
                const aVector: MoorhenVector = {
                    coordsMode: "points",
                    labelMode: showDistanceLabels ? "middle" : "none",
                    labelText: showDistanceLabels ? formatXpidDistanceLabel(inter) : "vector label",
                    drawMode: "dashedcylinder",
                    arrowMode: "end",
                    xFrom: inter.X_xyz_x,
                    yFrom: inter.X_xyz_y,
                    zFrom: inter.X_xyz_z,
                    xTo: inter.pi_center_x,
                    yTo: inter.pi_center_y,
                    zTo: inter.pi_center_z,
                    cidFrom: "",
                    cidTo: "",
                    molFromUniqueId: "",
                    molToUniqueId: "",
                    uniqueId: key,
                    vectorColour: interactionColour,
                    textColour: { r: 0, g: 0, b: 0 },
                    radius: XPID_DEFAULT_VECTOR_RADIUS,
                    dashSpacing: XPID_DEFAULT_DASH_SPACING,
                    arrowHeadLength: XPID_ARROW_HEAD_LENGTH,
                    arrowHeadRadiusScale: XPID_ARROW_HEAD_RADIUS_SCALE,
                    labelFontSize: XPID_DISTANCE_LABEL_FONT_SIZE,
                    labelScreenOffsetX: XPID_DISTANCE_LABEL_SCREEN_OFFSET_X,
                };
                theVectors.push(aVector)
            })
            setXpidList(interactions);
            setXpidVisibleList(visibleList);
            setXpidVectorsList(theVectors)
        } finally {
            props.setBusy?.(false);
        }
    };

    useEffect(() => {
        if (props.molecule?.molNo === updateMolNo) {
            validate();
        }
    }, [updateSwitch]);

    useEffect(() => {
        validate();
    }, []);

    const extraControl = [
        <MoorhenInfoCard infoText={xpidInfoText} />,
    ];

    const xpidTitle = xpidList === null
        ? "XH-\u03C0 Interactions"
        : `XH-\u03C0 Interactions (detected ${xpidList.length} totally)`;

    const replaceDisplayedVectors = (newVectors: MoorhenVector[], visibleList = xpidVisibleList) => {
        if (!xpidVectorsList || !visibleList) return;

        dispatch(removeVectors(xpidVectorsList));
        const visibleVectors = newVectors.filter((_vec, vecIdx) => visibleList[vecIdx]);
        if (visibleVectors.length > 0) {
            dispatch(addVectors(visibleVectors));
        }
        setXpidVectorsList(newVectors);
    };

    const handleColorChange = (color: { r: number; g: number; b: number }) => {
        setVectorColour(color);
        if (!xpidVectorsList) return;
        replaceDisplayedVectors(xpidVectorsList.map(v => Object.assign({}, v, { vectorColour: color })));
    };

    const handleInteractionColorChange = (idx: number, color: { r: number; g: number; b: number }) => {
        if (!xpidVectorsList) return;
        replaceDisplayedVectors(xpidVectorsList.map((v, vecIdx) => vecIdx === idx ? Object.assign({}, v, { vectorColour: color }) : v));
    };

    const handleDistanceLabelsChange = () => {
        const nextShowDistanceLabels = !showDistanceLabels;
        setShowDistanceLabels(nextShowDistanceLabels);
        if (!xpidVectorsList || !xpidList) return;

        replaceDisplayedVectors(xpidVectorsList.map((v, idx) => Object.assign({}, v, {
            labelMode: nextShowDistanceLabels ? "middle" : "none",
            labelText: nextShowDistanceLabels ? formatXpidDistanceLabel(xpidList[idx]) : "vector label",
        })));
    };

    return (
        <MoorhenAccordion title={xpidTitle} extraControls={extraControl} defaultOpen>
            {xpidList === null ? (
                <LinearProgress variant="indeterminate" />
            ) : xpidList.length > 0 ? (
                <>
                <MoorhenStack direction="row" align="center" gap="0.5rem" style={{ flexWrap: "wrap", margin: "0.25rem 0.5rem 0.5rem 0.5rem" }}>
                <MoorhenButton variant="primary" onClick={() => {
                    if (!xpidVectorsList || !xpidVisibleList) return;
                    const newVisList = Array(xpidVisibleList.length).fill(true)
                    setXpidVisibleList(newVisList);
                    dispatch(removeVectors(xpidVectorsList))
                    dispatch(addVectors(xpidVectorsList))
                }}>Show&nbsp;all</MoorhenButton>
                <MoorhenButton variant="primary" onClick={() => {
                    if (!xpidVectorsList || !xpidVisibleList) return;
                    const newVisList = Array(xpidVisibleList.length).fill(false)
                    setXpidVisibleList(newVisList);
                    dispatch(removeVectors(xpidVectorsList))
                }}>Hide&nbsp;all</MoorhenButton>
                <MoorhenColourPicker
                    colour={[vectorColour.r, vectorColour.g, vectorColour.b]}
                    setColour={color => {
                        handleColorChange({ r: color[0], g: color[1], b: color[2] });
                    }}
                    position="right"
                    tooltip="Set all XH-\u03C0 vector colours"
                />
                <MoorhenToggle
                    label="Show distance"
                    checked={showDistanceLabels}
                    onChange={handleDistanceLabelsChange}
                />
                </MoorhenStack>
                <MoorhenStack direction="column" gap="0.15rem">
                    {xpidList.map((xpi,idx) => {
                        const key = xpi.X_id+"_"+xpi.H_atom+"_"+xpi.X_atom+"_"+xpi.X_chain+"_"+xpi.X_res+xpi.pi_id+"_"+"_"+xpi.pi_chain+"_"+xpi.pi_res + "_" + idx
                        const text = xpi.X_chain+"/"+xpi.X_id+"/"+xpi.X_res+"/"+xpi.X_atom+" \u2192 " +xpi.pi_chain+"/"+xpi.pi_id+"/"+xpi.pi_res
                        const rowColour = xpidVectorsList?.[idx]?.vectorColour ?? vectorColour
                        return (<MoorhenStack
                            key={key}
                            direction="row"
                            align="center"
                            gap="0.35rem"
                            style={{ width: "100%", minWidth: 0 }}
                        >
                        <MoorhenToggle label={<span style={{ whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.25 }}>{text}</span>} checked={xpidVisibleList[idx]} style={{ flex: "1 1 auto", minWidth: 0, margin: "0.15rem 0" }} onChange={() => {
                            if (!xpidVectorsList || !xpidVisibleList) return;
                            const newVisList = [...xpidVisibleList]
                            newVisList[idx] = !newVisList[idx]
                            setXpidVisibleList(newVisList);
                            dispatch(removeVectors(xpidVectorsList))
                            const visVectors = xpidVectorsList.filter((vec,vecIdx) => newVisList[vecIdx])
                            dispatch(addVectors(visVectors))
                        }}/>
                        <MoorhenColourPicker
                            colour={[rowColour.r, rowColour.g, rowColour.b]}
                            setColour={color => {
                                handleInteractionColorChange(idx, { r: color[0], g: color[1], b: color[2] });
                            }}
                            position="left"
                            tooltip="Set interaction colour"
                            style={{ width: "20px", height: "20px", minWidth: "20px", borderRadius: "6px" }}
                        />
                        <MoorhenButton
                            size="accordion"
                            onClick={() => {
                                if (!xpidVectorsList || !xpidVisibleList) return;
                                const newVisList = [...xpidVisibleList]
                                newVisList[idx] = true
                                setXpidVisibleList(newVisList);
                                dispatch(removeVectors(xpidVectorsList))
                                const visVectors = xpidVectorsList.filter((vec,vecIdx) => newVisList[vecIdx])
                                dispatch(addVectors(visVectors))
                                moorhenGlobalInstance.centerOnCoordinate(-xpi.X_xyz_x,-xpi.X_xyz_y,-xpi.X_xyz_z)
                            }}
                            type="icon-only"
                            icon="MatSymFilterFocus"
                            tooltip="Center on molecule"
                        />
                        </MoorhenStack>)
                    })}
                </MoorhenStack>
                </>
            ) : (
                <div>
                    <b>No XH-{"\u03C0"} interactions</b>
                </div>
            )}
        </MoorhenAccordion>
    );
};

const xpidInfoText = (
    <>
        <h1>XPID</h1>
        <p>This plugin uses XPID to generate XH-{"\u03C0"} data.</p>
        <a href="https://github.com/SeanWang5868/xpid_moorhen/tree/main" target="_blank" rel="noreferrer">
            XPID source
        </a>
    </>
);
