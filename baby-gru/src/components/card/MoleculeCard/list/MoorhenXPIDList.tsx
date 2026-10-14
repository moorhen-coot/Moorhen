import { MoorhenLinearProgress } from "@/components/icons"
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { MoorhenButton, MoorhenColourPicker } from "@/components/inputs";
import { MoorhenAccordion, MoorhenInfoCard, MoorhenStack } from "@/components/interface-base";
import { moorhen } from "../../../../types/moorhen";
import { MoorhenToggle } from "@/components/inputs/MoorhenToggle/Toggle"
import { addVectors, removeVectors, MoorhenVector } from "../../../../store/vectorsSlice";
import { useCommandCentre, useMoorhenInstance } from "../../../../InstanceManager";

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

const XPID_DEFAULT_VECTOR_RADIUS = 0.055;
const XPID_DEFAULT_DASH_SPACING = 0.22;
const XPID_ARROW_HEAD_LENGTH = 0.42;
const XPID_ARROW_HEAD_RADIUS_SCALE = 2.2;
const XPID_DISTANCE_LABEL_FONT_SIZE = 20;
const XPID_DISTANCE_LABEL_SCREEN_OFFSET_DISTANCE = 0.12;
const XPID_DISTANCE_DECIMALS = 2;
const XPID_VIRTUAL_ROW_HEIGHT = 48;
const XPID_VIRTUAL_VIEWPORT_HEIGHT = 360;
const XPID_VIRTUAL_OVERSCAN = 4;

const getXpidMoleculeDictionaries = async (molecule: moorhen.Molecule) => {
    try {
        await molecule.loadMissingMonomers();
    } catch (_err) {
        // XPID can still run with the dictionaries already bundled in the worker.
    }

    const ligandDicts = { ...(molecule.ligandDicts ?? {}) };
    const ligandCompIds = [...new Set((molecule.ligands ?? [])
        .map(ligand => ligand.resName?.trim().toUpperCase())
        .filter((compId): compId is string => Boolean(compId)))];

    await Promise.all(ligandCompIds
        .filter(compId => !Object.hasOwn(ligandDicts, compId))
        .map(async compId => {
            if (!molecule.monomerLibraryPath) return;
            try {
                const response = await fetch(`${molecule.monomerLibraryPath}/${compId[0].toLowerCase()}/${compId}.cif`);
                if (!response.ok) return;
                const dictionary = await response.text();
                if (dictionary.includes("data_")) {
                    ligandDicts[compId] = dictionary;
                }
            } catch (_err) {
                // Missing ligand dictionaries should not block XPID.
            }
        }));

    return ligandDicts;
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
    const [xpidFirstVisibleIndex, setXpidFirstVisibleIndex] = useState(0);
    const xpidVirtualListRef = useRef<HTMLDivElement | null>(null);

    const commandCentre = useCommandCentre();
    const moorhenGlobalInstance = useMoorhenInstance();

    const validate = async () => {
        props.setBusy?.(true);
        try {
            const ligandDicts = await getXpidMoleculeDictionaries(props.molecule);
            const coordString = props.molecule.gemmiStructure && !props.molecule.gemmiStructure.isDeleted()
                ? props.molecule.gemmiStructure.as_string()
                : null;
            const response = (await commandCentre.current.cootCommand(
                {
                    returnType: "string",
                    command: "shim_detect_xhpi_interactions",
                    commandArgs: [props.molecule.molNo, ligandDicts, coordString],
                },
                false
            )) as moorhen.WorkerResponse<string>;
            if (response.data.result.status !== "Completed") {
                throw new Error(`XPID failed with status ${response.data.result.status}`);
            }
            const result = response.data.result.result;
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
                    labelScreenOffsetDistance: XPID_DISTANCE_LABEL_SCREEN_OFFSET_DISTANCE,
                };
                theVectors.push(aVector)
            })
            setXpidList(interactions);
            setXpidVisibleList(visibleList);
            setXpidVectorsList(theVectors)
            setXpidFirstVisibleIndex(0);
            if (xpidVirtualListRef.current) {
                xpidVirtualListRef.current.scrollTop = 0;
            }
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
        : `XH-\u03C0 Interactions (detected ${xpidList.length} in total)`;

    const xpidVirtualRenderStart = Math.max(0, xpidFirstVisibleIndex - XPID_VIRTUAL_OVERSCAN);
    const xpidVirtualVisibleRows = Math.ceil(XPID_VIRTUAL_VIEWPORT_HEIGHT / XPID_VIRTUAL_ROW_HEIGHT);
    const xpidVirtualRenderEnd = Math.min(
        xpidList?.length ?? 0,
        xpidFirstVisibleIndex + xpidVirtualVisibleRows + XPID_VIRTUAL_OVERSCAN
    );

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
                <MoorhenLinearProgress />
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
                <div
                    ref={xpidVirtualListRef}
                    aria-label="XH-pi interaction results"
                    onScroll={evt => {
                        const nextFirstVisibleIndex = Math.floor(evt.currentTarget.scrollTop / XPID_VIRTUAL_ROW_HEIGHT);
                        setXpidFirstVisibleIndex(previousIndex => previousIndex === nextFirstVisibleIndex ? previousIndex : nextFirstVisibleIndex);
                    }}
                    style={{
                        position: "relative",
                        height: Math.min(XPID_VIRTUAL_VIEWPORT_HEIGHT, xpidList.length * XPID_VIRTUAL_ROW_HEIGHT),
                        overflowY: "auto",
                        overflowX: "hidden",
                        contain: "strict",
                    }}
                >
                    <div style={{ position: "relative", height: xpidList.length * XPID_VIRTUAL_ROW_HEIGHT }}>
                    {xpidList.slice(xpidVirtualRenderStart, xpidVirtualRenderEnd).map((xpi,localIdx) => {
                        const idx = xpidVirtualRenderStart + localIdx
                        const key = xpi.X_id+"_"+xpi.H_atom+"_"+xpi.X_atom+"_"+xpi.X_chain+"_"+xpi.X_res+xpi.pi_id+"_"+"_"+xpi.pi_chain+"_"+xpi.pi_res + "_" + idx
                        const text = xpi.X_chain+"/"+xpi.X_id+"/"+xpi.X_res+"/"+xpi.X_atom+" \u2192 " +xpi.pi_chain+"/"+xpi.pi_id+"/"+xpi.pi_res
                        const rowColour = xpidVectorsList?.[idx]?.vectorColour ?? vectorColour
                        return (<div
                            key={key}
                            data-xpid-index={idx}
                            style={{
                                position: "absolute",
                                top: idx * XPID_VIRTUAL_ROW_HEIGHT,
                                left: 0,
                                right: 0,
                                height: XPID_VIRTUAL_ROW_HEIGHT,
                                overflow: "hidden",
                            }}
                        >
                        <MoorhenStack
                            direction="row"
                            align="center"
                            gap="0.35rem"
                            style={{ width: "100%", height: "100%", minWidth: 0 }}
                        >
                        <MoorhenToggle label={<span title={text} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", whiteSpace: "normal", overflowWrap: "anywhere", overflow: "hidden", lineHeight: 1.15 }}>{text}</span>} checked={xpidVisibleList[idx]} style={{ flex: "1 1 auto", minWidth: 0, margin: 0 }} onChange={() => {
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
                        </MoorhenStack>
                        </div>)
                    })}
                    </div>
                </div>
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
