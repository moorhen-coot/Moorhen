import { TextField } from "@mui/material";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { useCommandCentre, usePaths } from "../../InstanceManager";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { readTextFile } from "../../utils/utils";
import { MoorhenButton, MoorhenFileInput, MoorhenSelect, MoorhenTextInput, MoorhenToggle } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenInfoCard, MoorhenStack } from "../interface-base";

const ImportLigandDictionary = (props: {
    id: string;
    menuItemText: string;
    createInstance: boolean;
    setCreateInstance: React.Dispatch<React.SetStateAction<boolean>>;
    panelContent: React.JSX.Element;
    fetchLigandDict: () => Promise<string>;
    addToMoleculeValueRef: React.MutableRefObject<number>;
    addToMolecule: string;
    setAddToMolecule: React.Dispatch<React.SetStateAction<string>>;
    tlc: string;
    createRef: React.MutableRefObject<boolean>;
    moleculeSelectRef: React.RefObject<HTMLSelectElement>;
    addToRef: React.RefObject<HTMLSelectElement>;
    moleculeSelectValueRef: React.MutableRefObject<string>;
}) => {
    const dispatch = useDispatch();
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const store = useStore();
    const commandCentre = useCommandCentre();
    const monomerLibraryPath = usePaths().monomerLibraryPath;
    const {
        createInstance,
        setCreateInstance,
        addToMolecule,
        fetchLigandDict,
        panelContent,
        setAddToMolecule,
        tlc,
        createRef,
        moleculeSelectRef,
        addToRef,
        moleculeSelectValueRef,
        addToMoleculeValueRef,
        menuItemText,
        id,
    } = props;

    const originState = useSelector((state: moorhen.State) => state.glRef.origin);

    const handleFileContent = useCallback(
        async (fileContent: string) => {
            let newMolecule: moorhen.Molecule;
            let selectedMoleculeIndex: number;
            const molNosToUpdate: number[] = [];

            if (moleculeSelectValueRef.current) {
                selectedMoleculeIndex = parseInt(moleculeSelectValueRef.current);
                const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMoleculeIndex);
                if (typeof selectedMolecule !== "undefined") {
                    await selectedMolecule.addDict(fileContent);
                    await selectedMolecule.redraw();
                    molNosToUpdate.push(selectedMolecule.molNo);
                }
            } else {
                selectedMoleculeIndex = -999999;
                await commandCentre.current.cootCommand(
                    {
                        returnType: "status",
                        command: "read_dictionary_string",
                        commandArgs: [fileContent, selectedMoleculeIndex],
                        changesMolecules: [],
                    },
                    false
                );
                await Promise.all(
                    molecules.map(molecule => {
                        molecule.cacheLigandDict(fileContent);
                        molNosToUpdate.push(molecule.molNo);
                        return molecule.redraw();
                    })
                );
            }

            if (createRef.current) {
                const instanceName = tlc;
                const result = (await commandCentre.current.cootCommand(
                    {
                        returnType: "status",
                        command: "get_monomer_and_position_at",
                        commandArgs: [instanceName, selectedMoleculeIndex, ...originState.map(coord => -coord)],
                    },
                    true
                )) as moorhen.WorkerResponse<number>;
                if (result.data.result.status === "Completed") {
                    newMolecule = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
                    newMolecule.molNo = result.data.result.result;
                    newMolecule.name = instanceName;
                    newMolecule.setBackgroundColour(backgroundColor);
                    newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness;
                    newMolecule.coordsFormat = "mmcif";
                    await Promise.all([newMolecule.fetchDefaultColourRules(), newMolecule.addDict(fileContent)]);
                    await newMolecule.fetchIfDirtyAndDraw("CBs");
                    dispatch(addMolecule(newMolecule));
                    if (addToMoleculeValueRef.current !== -1) {
                        const toMolecule = molecules.find(molecule => molecule.molNo === addToMoleculeValueRef.current);
                        if (typeof toMolecule !== "undefined") {
                            molNosToUpdate.push(toMolecule.molNo);
                            const otherMolecules = [newMolecule];
                            await toMolecule.mergeMolecules(otherMolecules, true);
                            await toMolecule.redraw();
                        } else {
                            await newMolecule.redraw();
                        }
                    }
                }
            }

            [...new Set(molNosToUpdate)].map(molNo => dispatch(triggerUpdate(molNo)));
        },
        [moleculeSelectValueRef, createRef, molecules, commandCentre, tlc, backgroundColor, defaultBondSmoothness, addToMoleculeValueRef]
    );

    const popoverContent = (
        <>
            {panelContent}
            <MoorhenStack inputGrid>
                <MoorhenMoleculeSelect
                    molecules={molecules}
                    allowAny={true}
                    ref={moleculeSelectRef}
                    label="Make monomer available to"
                    onChange={evt => {
                        // eslint-disable-next-line react-hooks/react-compiler
                        moleculeSelectValueRef.current = evt.target.value;
                    }}
                />

                <MoorhenToggle
                    label="Create instance on read"
                    checked={createInstance}
                    onChange={() => setCreateInstance(!createInstance)}
                />
                {createInstance ? (
                    <MoorhenSelect
                        disabled={!createInstance}
                        ref={addToRef}
                        value={addToMolecule}
                        onChange={e => {
                            setAddToMolecule(e.target.value);
                            addToMoleculeValueRef.current = parseInt(e.target.value);
                        }}
                    >
                        <option key={-1} value={"-1"}>
                            {createInstance ? "...create new molecule" : ""}
                        </option>
                        {molecules.map(molecule => (
                            <option key={molecule.molNo} value={molecule.molNo}>
                                ...add to {molecule.name}
                            </option>
                        ))}
                    </MoorhenSelect>
                ) : (
                    <div />
                )}
            </MoorhenStack>
        </>
    );

    const onCompleted = useCallback(async () => {
        const ligandDict = await fetchLigandDict();
        if (ligandDict) {
            handleFileContent(ligandDict);
        } else {
            console.log("Unable to get ligand dict...");
        }
    }, [handleFileContent, fetchLigandDict]);

    return (
        <>
            {popoverContent}
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </>
    );
};

export const SMILESToLigand = () => {
    const commandCentre = useCommandCentre();
    const [smile, setSmile] = useState<string>("");
    const [tlc, setTlc] = useState<string>("NewLig");
    const [createInstance, setCreateInstance] = useState<boolean>(true);
    const [addToMolecule, setAddToMolecule] = useState<string>("");
    const [conformerCount, setConformerCount] = useState<number>(10);
    const [iterationCount, setIterationCount] = useState<number>(100);
    const [source, setSource] = useState<string>("smiles");

    const createRef = useRef<boolean>(true);
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const moleculeSelectValueRef = useRef<null | string>(null);
    const addToRef = useRef<null | HTMLSelectElement>(null);
    const addToMoleculeValueRef = useRef<null | number>(null);
    const conformerCountRef = useRef<number>(10);
    const iterationCountRef = useRef<number>(100);
    const sourceSelectRef = useRef<HTMLSelectElement | null>(null);

    const collectedProps = {
        smile,
        setSmile,
        tlc,
        setTlc,
        createInstance,
        setCreateInstance,
        addToMolecule,
        setAddToMolecule,
        createRef,
        moleculeSelectRef,
        addToRef,
        addToMoleculeValueRef,
        moleculeSelectValueRef,
    };

    const smilesToPDB = async (): Promise<string> => {
        let smilesText = "";
        if (sourceSelectRef.current.value === "pubchem") {
            const molSearchUrl = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/" + smile + "/cids/TXT";
            console.log(molSearchUrl);
            const moleculeSearchResponse = await fetch(molSearchUrl);
            const moleculeIds = await moleculeSearchResponse.text();
            const smilesSearchUrl =
                "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + moleculeIds.split("\n")[0] + "/property/CanonicalSMILES/TXT";
            const smilesResponse = await fetch(smilesSearchUrl);
            const pubchemSmiles = await smilesResponse.text();
            console.log(pubchemSmiles);
            smilesText = pubchemSmiles;
        } else {
            smilesText = smile;
        }

        if (!smilesText) {
            console.log("Empty smile, do nothing...");
            return;
        }

        let n_conformer: number;
        let n_iteration: number;
        try {
            n_conformer = conformerCountRef.current;
            n_iteration = iterationCountRef.current;
        } catch (err) {
            console.log(err);
            return;
        }

        if (
            isNaN(n_conformer) ||
            n_conformer < 0 ||
            n_conformer === Infinity ||
            isNaN(n_iteration) ||
            n_iteration < 0 ||
            n_iteration === Infinity
        ) {
            console.log("Unable to parse n_conformer / n_iteration count into a valid int...");
            return;
        }

        const response = (await commandCentre.current.cootCommand(
            {
                command: "smiles_to_pdb",
                commandArgs: [smilesText, tlc, n_conformer, n_iteration],
                returnType: "str_str_pair",
            },
            true
        )) as moorhen.WorkerResponse<libcootApi.PairType<string, string>>;
        const result = response.data.result.result.second;

        if (result) {
            return result;
        } else {
            console.log("Error creating molecule... Wrong SMILES?");
        }
    };

    const handleSourceChange = async evt => {
        setSource(evt.target.value);
    };

    const panelContent = (
        <MoorhenStack inputGrid>
            <span>
                Source...
                <MoorhenInfoCard
                    infoText={
                        <em>
                            By default, a structure will be created from a user inputted SMILES string. Alternatively, a molecule name can
                            be used in which case the SMILES string will be generated by searching PubChem.
                        </em>
                    }
                />
            </span>
            <MoorhenSelect ref={sourceSelectRef} value={source} onChange={handleSourceChange}>
                <option value={"smiles"}>SMILES</option>
                <option value={"pubchem"}>PubChem search</option>
            </MoorhenSelect>
            <MoorhenTextInput
                text={smile}
                label={source === "smiles" ? "Enter SMILES string" : "Enter molecule name"}
                onChange={e => {
                    setSmile(e.target.value);
                }}
            />
            <MoorhenTextInput
                label="Assign a name"
                text={tlc}
                onChange={e => {
                    setTlc(e.target.value);
                }}
            />
            <TextField
                style={{ margin: "0.5rem", width: "9rem" }}
                id="conformer-count"
                label="No. of conformers"
                type="number"
                variant="standard"
                error={isNaN(conformerCount) || conformerCount < 0 || conformerCount === Infinity}
                value={conformerCount}
                onChange={evt => {
                    conformerCountRef.current = parseInt(evt.target.value);
                    setConformerCount(parseInt(evt.target.value));
                }}
            />
            <TextField
                style={{ margin: "0.5rem", width: "9rem" }}
                id="iteration-count"
                label="No. of iterations"
                type="number"
                variant="standard"
                error={isNaN(iterationCount) || iterationCount < 0 || iterationCount === Infinity}
                value={iterationCount}
                onChange={evt => {
                    iterationCountRef.current = parseInt(evt.target.value);
                    setIterationCount(parseInt(evt.target.value));
                }}
            />
        </MoorhenStack>
    );

    return (
        <ImportLigandDictionary
            id="smiles-to-ligand-menu-item"
            menuItemText="From SMILES..."
            panelContent={panelContent}
            fetchLigandDict={smilesToPDB}
            {...collectedProps}
        />
    );
};

export const ImportDictionary = () => {
    const tlcsOfFileRef = useRef<{ comp_id: string; dict_contents: string }[]>([]);
    const filesRef = useRef<null | HTMLInputElement>(null);
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const moleculeSelectValueRef = useRef<null | string>(null);
    const addToRef = useRef<null | HTMLSelectElement>(null);
    const addToMoleculeValueRef = useRef<null | number>(null);
    const tlcSelectRef = useRef<null | HTMLSelectElement>(null);
    const tlcValueRef = useRef<null | string>(null);
    const createRef = useRef<boolean>(true);

    const [tlc, setTlc] = useState<string>("");
    const [addToMolecule, setAddToMolecule] = useState<string>("");
    const [createInstance, setCreateInstance] = useState<boolean>(true);
    const [validDictFile, setValidDictFile] = useState<boolean>(true);
    const [tlcsOfFile, setTlcsOfFile] = useState<{ comp_id: string; dict_contents: string }[]>([]);

    const { enqueueSnackbar } = useSnackbar();

    const collectedProps = {
        tlc,
        setTlc,
        createInstance,
        setCreateInstance,
        addToMolecule,
        setAddToMolecule,
        createRef,
        moleculeSelectRef,
        addToRef,
        addToMoleculeValueRef,
        moleculeSelectValueRef,
    };

    const parseCifDict = async (file: File) => {
        const result: { comp_id: string; dict_contents: string }[] = [];
        const fileContent = (await readTextFile(file)) as string;
        const compIdsVector = window.CCP4Module.parse_ligand_dict_info(fileContent);
        const compIdsVectorSize = compIdsVector.size();
        for (let i = 0; i < compIdsVectorSize; i++) {
            const ligandInfo = compIdsVector.get(i);
            if (ligandInfo.comp_id.length > 0) {
                result.push({ ...ligandInfo });
            }
        }
        compIdsVector.delete();
        return result;
    };

    const panelContent = (
        <>
            <MoorhenFileInput
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const tlcs = await parseCifDict(e.target.files[0]);
                    if (tlcs.length > 0) {
                        tlcsOfFileRef.current = tlcs;
                        setTlcsOfFile(tlcs);
                        setTlc(tlcs[0].comp_id);
                        setValidDictFile(true);
                    } else {
                        setValidDictFile(false);
                    }
                }}
            />
            {!validDictFile && <span>Unable to parse</span>}
            <MoorhenSelect
                label={"Monomer identifier"}
                ref={tlcSelectRef}
                value={tlc}
                onChange={newVal => {
                    setTlc(newVal.target.value);
                    tlcValueRef.current = newVal.target.value;
                }}
            >
                {tlcsOfFile.map(tlcOfFile => (
                    <option key={tlcOfFile.comp_id} value={tlcOfFile.comp_id}>
                        {tlcOfFile.comp_id}
                    </option>
                ))}
            </MoorhenSelect>
        </>
    );

    const fetchLigandDict = async (): Promise<string> => {
        if (filesRef.current.files.length > 0 && tlcValueRef.current) {
            const ligandInfo = tlcsOfFileRef.current.find(lig => lig.comp_id === tlcValueRef.current);
            if (ligandInfo) {
                return ligandInfo.dict_contents;
            } else {
                console.warn(`Unable to parse ligand dictionary`);
                enqueueSnackbar("Unable to import ligand", { variant: "error" });
            }
        }
    };

    return (
        <ImportLigandDictionary
            id="import-dict-menu-item"
            menuItemText="Import dictionary..."
            panelContent={panelContent}
            fetchLigandDict={fetchLigandDict}
            {...collectedProps}
        />
    );
};
