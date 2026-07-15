import { useDispatch, useSelector, useStore } from "react-redux";
import { useRef, useState } from "react";
import { RootState, enqueueSnackbar, showModal } from "@/store";
import { useCommandCentre, useMoorhenInstance, usePaths } from "../../InstanceManager";
import { setBusy } from "../../store/globalUISlice";
import { usePersistentState } from "../../store/menusSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { ColourRule } from "../../utils/MoorhenColourRule";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { getMultiColourRuleArgs } from "../../utils/utils";
import { MoorhenButton, MoorhenToggle } from "../inputs";
import "../inputs/MoorhenInput.css";

export const FetchOnlineSources = () => {
    const defaultProps = {
        sources: ["PDBe", "PDB-REDO", "AFDB", "EMDB"],
        downloadMaps: true,
    };

   "ligand test 5hes, glyco test 5fjj";

    const { sources, downloadMaps } = { ...defaultProps };
    const moorhenInstance = useMoorhenInstance();
    const pdbCodeFetchInputRef = useRef<HTMLInputElement | null>(null);
    const [fetchExtra, setFetchExtra] = usePersistentState("file", "fetch-extra", false, true);

    const [remoteSource, setRemoteSource] = useState<string>("PDBe");
    const [isValidPdbId, setIsValidPdbId] = useState<boolean>(true);

    const dispatch = useDispatch();


    const defaultBondSmoothness = useSelector((state: RootState) => state.sceneSettings.defaultBondSmoothness);
    const backgroundColor = useSelector((state: RootState) => state.sceneSettings.backgroundColor);

    const fetchFiles = (): void => {
        if (pdbCodeFetchInputRef.current.value === "") {
            return;
        }
        dispatch(setBusy(true));
        if (remoteSource === "PDBe") {
            fetchFilesFromEBI();
        } else if (remoteSource === "PDB-REDO") {
            fetchFilesFromPDBRedo();
        } else if (remoteSource === "AFDB") {
            fetchFilesFromAFDB();
        } else if (remoteSource === "EMDB") {
            fetchMapFromEMDB();
        } else {
            console.log(`Unrecognised remote source! ${remoteSource}`);
        }
        document.body.click();
    };

    const fetchMapFromEMDB = async () => {
        const emdbCode = pdbCodeFetchInputRef.current.value.toLowerCase().trim();
        if (emdbCode) {
            const mapUrl = `https://ftp.ebi.ac.uk/pub/databases/emdb/structures/EMD-${emdbCode}/map/emd_${emdbCode}.map.gz`;
            // const mapInfoResponse = await fetch(`https://www.ebi.ac.uk/emdb/api/entry/map/${emdbCode}`);
            // let level: number;
            // if (mapInfoResponse.ok) {
            //     const data = await mapInfoResponse.json();
            //     level = data.map.contour_list.contour.find(item => item.primary)?.level as number;
            // }
            moorhenInstance.files.loadFiles(mapUrl)
            // newMap.centreOnMap();
        } else {
            console.log("Error: no EMDB entry provided");
        }
    };

    const fetchFilesFromEBI = () => {
        const pdbCode = pdbCodeFetchInputRef.current.value.toLowerCase().trim();
        const coordUrl = `https://www.ebi.ac.uk/pdbe/entry-files/download/${pdbCode}.cif`;
        const mapUrl = `https://www.ebi.ac.uk/pdbe/entry-files/${pdbCode}.ccp4`;
        const diffMapUrl = `https://www.ebi.ac.uk/pdbe/entry-files/${pdbCode}_diff.ccp4`;
        if (pdbCode && fetchExtra) {
            moorhenInstance.files.loadFiles([coordUrl, mapUrl, diffMapUrl], "PDBe");
        } else if (pdbCode) {
            moorhenInstance.files.loadFiles(coordUrl, "PDBe");
        }
    };

    const fetchFilesFromAFDB = async () => {
        const uniprotID: string = pdbCodeFetchInputRef.current.value.toUpperCase().trim();

        if (!uniprotID) return;

        const infoUrl = `https://alphafold.ebi.ac.uk/api/prediction/${uniprotID}`;

        try {
            const infoResponse = await fetch(infoUrl);
            if (infoResponse.ok) {
                const infoJson = await infoResponse.json();
                //A search might get more than 1 hit.
                //By default we just pick the first and then look for exact match in loop below.
                let bestEntry: number = -1;
                if (infoJson.length > 0) {
                    bestEntry = 0;
                    for (const modelEntry of infoJson) {
                        if (modelEntry.entryId === `AF-${uniprotID}-F1`) {
                            break;
                        }
                        bestEntry++;
                    }
                    if (bestEntry > infoJson.length) bestEntry = 0;
                    const coordUrl = infoJson[bestEntry].pdbUrl;
                    fetchMoleculeFromURL(coordUrl, `${uniprotID}`, true);
                    if (fetchExtra) {
                        dispatch(showModal({ key: "pae-plot", openDocked: "right", modalProps: { loadMoleculeOnOpen: uniprotID } }));
                    }
                }
            } else {
                dispatch(enqueueSnackbar({ message: `Cannot find EBI AlphaFold server entry for ${uniprotID}`, variant: "error" }));
                console.log(`Cannot fetch json info from EBI/AF server for ${uniprotID}`);
                setIsValidPdbId(false);
                dispatch(setBusy(false));
            }
        } catch (e) {
            dispatch(enqueueSnackbar({ message: `Cannot find EBI AlphaFold server entry for ${uniprotID}`, variant: "error" }));
            console.log(`Cannot fetch json info from EBI/AF server for ${uniprotID}`);
            setIsValidPdbId(false);
            dispatch(setBusy(false));
        }
    };

    const fetchFilesFromPDBRedo = () => {
        const pdbCode = pdbCodeFetchInputRef.current.value;
        const coordUrl = `https://pdb-redo.eu/db/${pdbCode}/${pdbCode}_final.cif`;
        const mtzUrl = `https://pdb-redo.eu/db/${pdbCode}/${pdbCode}_final.mtz`;
        moorhenInstance.files.loadFiles([coordUrl, mtzUrl], "PDBRedo")
    };

    const fetchMoleculeFromURL = async (url: RequestInfo | URL, molName: string, isAF2?: boolean): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(moorhenInstance);
        newMolecule.setBackgroundColour(backgroundColor);
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness;
        try {
            await newMolecule.loadToCootFromURL(url, molName);
            if (newMolecule.molNo === -1) {
                throw new Error("Cannot read the fetched molecule...");
            } else if (isAF2) {
                const newColourRule = new ColourRule("af2-plddt", "/*/*/*/*", "#ffffff", moorhenInstance.commandCentre, true);
                newColourRule.setLabel("PLDDT");
                const ruleArgs = await getMultiColourRuleArgs(newMolecule, "af2-plddt");
                newColourRule.setArgs([ruleArgs]);
                newColourRule.setParentMolecule(newMolecule);
                newMolecule.defaultColourRules = [newColourRule];
            }
            await newMolecule.fetchIfDirtyAndDraw(newMolecule.atomCount >= 50000 ? "CRs" : "CBs");
            await newMolecule.centreOn("/*/*/*/*", true);
            dispatch(addMolecule(newMolecule));
            // props.onMoleculeLoad?.(newMolecule);
            return newMolecule;
        } catch (err) {
            dispatch(enqueueSnackbar({ message: "Failed to read molecule", variant: "error" }));
            console.log(`Cannot fetch molecule from ${url}`);
            setIsValidPdbId(false);
            dispatch(setBusy(false));
        }
    };

    // };

    const fetchExtraLabel =
        remoteSource === "PDBe" || remoteSource === "PDB-REDO"
            ? "fetch map files"
            : remoteSource === "AFDB"
              ? "open PAE data"
              : "fetch map files";
    return (
        <>
            <label htmlFor="fetch-pdbe-form" className="moorhen__input__label-menu">
                Fetch from online services
            </label>
            <div className="moorhen__input-fetch-online-container">
                <select
                    name="source-select"
                    id="source-select"
                    className="moorhen__input-fetch-online-select "
                    onChange={e => setRemoteSource(e.target.value)}
                >
                    {sources.map(source => {
                        return <option key={source}>{source}</option>;
                    })}
                </select>
                <input
                    type="text"
                    className="moorhen__input-fetch-online-text-input"
                    style={{ borderColor: isValidPdbId ? "" : "red", textTransform: "uppercase" }}
                    name="fetch-pdbe-form"
                    id="fetch-pdbe-form"
                    ref={pdbCodeFetchInputRef}
                    onKeyDown={e => {
                        setIsValidPdbId(true);
                        if (e.code === "Enter") {
                            fetchFiles();
                        }
                    }}
                />
                <MoorhenButton onClick={fetchFiles} className="moorhen__input-fetch-online-button">
                    Fetch
                </MoorhenButton>
            </div>
            <label style={{ display: isValidPdbId ? "none" : "block", alignContent: "center", textAlign: "center" }}>
                Problem fetching
            </label>
            {
                <div style={{ marginLeft: "0.9rem", display: "flex", alignItems: "center", marginTop: "0.5rem" }}>
                    <MoorhenToggle checked={fetchExtra} onChange={() => setFetchExtra(!fetchExtra)} label={fetchExtraLabel} />
                </div>
            }
        </>
    );
};
