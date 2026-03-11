import Fasta from "biojs-io-fasta";
import { enqueueSnackbar } from "notistack";
import type { Dispatch, Store, StoreCreator } from "redux";
import { MoorhenReduxStoreType, hideMap } from "@/store";
import { moorhensession } from "../protobuf/MoorhenSession";
import { setActiveMap } from "../store/generalStatesSlice";
import { setValidationJson } from "../store/jsonValidation";
import { addMap, addMapList } from "../store/mapsSlice";
import { showModal } from "../store/modalsSlice";
import { addMolecule, addMoleculeList } from "../store/moleculesSlice";
import { setAfJson, setEsmJson, setHomologsJson, setMrParseModels, setTargetSequence } from "../store/mrParseSlice";
import { moorhen } from "../types/moorhen";
import { MoorhenTimeCapsule } from "../utils/MoorhenTimeCapsule";
import { modalKeys } from "../utils/enums";
import { MoorhenMap } from "./MoorhenMap";
import { MoorhenMolecule } from "./MoorhenMolecule";

interface MrParsePDBModelJson {
    chain_id: string;
    ellg: number;
    frac_scat: null | number;
    length: number;
    molecular_weight: number;
    name: string;
    ncopies: null | number;
    pdb_file: null | string;
    pdb_id: string;
    pdb_url: string;
    query_start: number;
    query_stop: number;
    range: string;
    region_id: number;
    region_index: number;
    resolution: number;
    rmsd: null | number;
    score: number;
    seq_ident: number;
    total_frac_scat: null | number;
    total_frac_scat_known: null | number;
}

interface MrParseAFModelJson {
    chain_id: string;
    ellg: number;
    frac_scat: null | number;
    length: number;
    molecular_weight: number;
    name: string;
    ncopies: any;
    pdb_file: null | string;
    pdb_id: string;
    pdb_url: string;
    query_start: number;
    query_stop: number;
    range: string;
    region_id: number;
    region_index: number;
    resolution: number;
    rmsd: null | number;
    score: number;
    seq_ident: number;
    total_frac_scat: null | number;
    total_frac_scat_known: null | number;
}

export const parseCifDict = async (file: File) => {
    const result: { comp_id: string; dict_contents: string }[] = [];
    const fileContent = await file.text();
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

const readCoordsString = async (
    fileString: string,
    fileName: string,
    commandCentre: React.RefObject<moorhen.CommandCentre>,
    store: Store,
    monomerLibraryPath: string,
    backgroundColor: [number, number, number, number],
    defaultBondSmoothness: number | null
): Promise<moorhen.Molecule> => {
    const newMolecule = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
    newMolecule.setBackgroundColour(backgroundColor);
    newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness;
    await newMolecule.loadToCootFromString(fileString, fileName);
    return newMolecule;
};

export const drawModels = async (newMolecules: moorhen.Molecule[]) => {
    const drawPromises: Promise<void>[] = [];
    if (newMolecules.length === 0) {
        return;
    }

    for (const newMolecule of newMolecules) {
        drawPromises.push(newMolecule.fetchIfDirtyAndDraw("CRs"));
    }
    await Promise.all(drawPromises);
};

export const loadCoordFiles = async (
    files: File[],
    commandCentre: React.RefObject<moorhen.CommandCentre>,
    store: Store,
    monomerLibraryPath: string,
    backgroundColor: [number, number, number, number],
    defaultBondSmoothness: number | null
): Promise<Promise<moorhen.Molecule>[]> => {
    const loadPromises: Promise<moorhen.Molecule>[] = [];
    for (const file of files) {
        if (file.name.endsWith(".pdb") || file.name.endsWith(".ent") || file.name.endsWith(".cif") || file.name.endsWith(".mmcif")) {
            const contents = await file.text();
            loadPromises.push(
                readCoordsString(contents, file.name, commandCentre, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness)
            );
        }
    }
    return loadPromises;
};

const loadSession = async (
    session: string | object,
    commandCentre: React.RefObject<moorhen.CommandCentre>,
    store: Store,
    monomerLibraryPath: string,
    molecules: moorhen.Molecule[],
    maps: moorhen.Map[],
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>,
    dispatch: Dispatch
) => {
    commandCentre.current.history.reset();
    let status = -1;
    if (typeof session === "string") {
        status = await MoorhenTimeCapsule.loadSessionFromJsonString(
            session as string,
            monomerLibraryPath,
            molecules,
            maps,
            commandCentre,
            timeCapsuleRef,
            store,
            dispatch
        );
    } else {
        status = await MoorhenTimeCapsule.loadSessionFromProtoMessage(
            session,
            monomerLibraryPath,
            molecules,
            maps,
            commandCentre,
            timeCapsuleRef,
            store,
            dispatch
        );
    }
    if (status === -1) {
        throw new Error("Failed to read backup (deprecated format)");
    }
};

export const handleSessionUpload = async (
    file: File,
    commandCentre: React.RefObject<moorhen.CommandCentre>,
    store: Store,
    monomerLibraryPath: string,
    molecules: moorhen.Molecule[],
    maps: moorhen.Map[],
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>,
    dispatch: Dispatch
) => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const sessionMessage = moorhensession.Session.decode(bytes, undefined, undefined);
    await loadSession(sessionMessage, commandCentre, store, monomerLibraryPath, molecules, maps, timeCapsuleRef, dispatch);
};

const parseJSONAndGetModelFiles = (json_contents, dispatch) => {
    const fastaContents = json_contents.fastaContents;
    const afModelContents = json_contents.afModelContents;
    const esmModelContents = json_contents.esmModelContents;
    const homologsContents = json_contents.homologsContents;

    const modelFiles: string[] = [];
    if (fastaContents) {
        try {
            const seqs = Fasta.parse(fastaContents);
            dispatch(setTargetSequence(seqs[0].seq));
        } catch (e) {
            console.log("Failed to extract sequence from input.fasta");
        }
    }
    if (afModelContents) {
        const json = JSON.parse(afModelContents);
        dispatch(setAfJson(json));
        for (const iter of Object.entries(json)) {
            const key: string = iter[0];
            const value: MrParseAFModelJson = iter[1] as MrParseAFModelJson;
            const fullName = value["pdb_file"];
            console.log(fullName);
            if (fullName) {
                const relName = fullName.substring(fullName.lastIndexOf("models/") + "models/".length);
                modelFiles.push(fullName);
            }
        }
    }
    if (esmModelContents) {
        const json = JSON.parse(esmModelContents);
        dispatch(setEsmJson(json));
        for (const iter of Object.entries(json)) {
            const key: string = iter[0];
            const value: any = iter[1];
            //console.log(value)
        }
    }
    if (homologsContents) {
        const json = JSON.parse(homologsContents);
        dispatch(setHomologsJson(json));
        for (const iter of Object.entries(json)) {
            const key: string = iter[0];
            const value: MrParsePDBModelJson = iter[1] as MrParsePDBModelJson;
            const fullName = value["pdb_file"];
            if (fullName) {
                const relName = fullName.substring(fullName.lastIndexOf("homologs/") + "homologs/".length);
                modelFiles.push(fullName);
            }
        }
    }
    return modelFiles;
};

const loadMrParseJson = async (files: File[]) => {
    if (files.length === 0) return;

    let fastaContents = "";
    let afModelContents = "";
    let esmModelContents = "";
    let homologsContents = "";

    for (const file of files) {
        if (file.name.endsWith("input.fasta")) {
            fastaContents = await file.text();
        }
        if (file.name.endsWith("af_models.json")) {
            afModelContents = await file.text();
        }
        if (file.name.endsWith("esm_models.json")) {
            esmModelContents = await file.text();
        }
        if (file.name.endsWith("homologs.json")) {
            homologsContents = await file.text();
        }
    }

    return { fastaContents, afModelContents, esmModelContents, homologsContents };
};

const loadCoordinateFilesFromFileList = async (
    files: File[],
    modelFiles: string[],
    commandCentre,
    store,
    monomerLibraryPath,
    backgroundColor,
    defaultBondSmoothness
) => {
    let newMolecules: moorhen.Molecule[] = [];

    const loadPromises: Promise<moorhen.Molecule>[] = [];
    for (const file of files) {
        for (const modelFile of modelFiles) {
            if (file.webkitRelativePath.includes(modelFile) || (file.webkitRelativePath.length === 0 && modelFile.includes(file.name))) {
                const contents = await file.text();
                loadPromises.push(
                    readCoordsString(contents, file.name, commandCentre, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness)
                );
            }
        }
    }

    if (loadPromises.length === 0) return newMolecules;

    newMolecules = await Promise.all(loadPromises);
    if (!newMolecules.every(molecule => molecule.molNo !== -1)) {
        //enqueueSnackbar("Failed to read molecule", { variant: "warning" })
        console.log("Failed to read molecule");
        newMolecules = newMolecules.filter(molecule => molecule.molNo !== -1);
    }

    return newMolecules;
};

export const loadMrParseFiles = async (
    files: File[],
    commandCentre,
    store,
    monomerLibraryPath,
    backgroundColor,
    defaultBondSmoothness,
    dispatch
) => {
    const json_contents = await loadMrParseJson(files);
    const modelFiles: string[] = parseJSONAndGetModelFiles(json_contents, dispatch);
    const newMolecules: moorhen.Molecule[] = await loadCoordinateFilesFromFileList(
        files,
        modelFiles,
        commandCentre,
        store,
        monomerLibraryPath,
        backgroundColor,
        defaultBondSmoothness
    );

    await drawModels(newMolecules);
    dispatch(addMoleculeList(newMolecules));
    newMolecules.at(-1).centreOn("/*/*/*/*", true);

    dispatch(setMrParseModels(newMolecules));
};

const loadMrParseJsonUrl = async urlBase => {
    let fastaContents = "";
    let afModelContents = "";
    let esmModelContents = "";
    let homologsContents = "";

    let response = await fetch(urlBase + "/input.fasta");
    if (response.ok) {
        fastaContents = await response.text();
    }
    response = await fetch(urlBase + "/af_models.json");
    if (response.ok) {
        afModelContents = await response.text();
    }
    response = await fetch(urlBase + "/esm_models.json");
    if (response.ok) {
        esmModelContents = await response.text();
    }
    response = await fetch(urlBase + "/homologs.json");
    if (response.ok) {
        homologsContents = await response.text();
    }

    return { fastaContents, afModelContents, esmModelContents, homologsContents };
};

const loadCoordinateFilesFromURL = async (
    url: string,
    modelFiles: string[],
    commandCentre,
    store,
    monomerLibraryPath,
    backgroundColor,
    defaultBondSmoothness
) => {
    let newMolecules: moorhen.Molecule[];

    const loadPromises: Promise<moorhen.Molecule>[] = [];
    for (const modelFile of modelFiles) {
        const response = await fetch(url + "/" + modelFile);
        if (response.ok) {
            const contents = await response.text();
            loadPromises.push(
                readCoordsString(
                    contents,
                    modelFile.split("/").reverse()[0],
                    commandCentre,
                    store,
                    monomerLibraryPath,
                    backgroundColor,
                    defaultBondSmoothness
                )
            );
        }
    }

    if (loadPromises.length === 0) return newMolecules;

    newMolecules = await Promise.all(loadPromises);
    if (!newMolecules.every(molecule => molecule.molNo !== -1)) {
        //enqueueSnackbar("Failed to read molecule", { variant: "warning" })
        newMolecules = newMolecules.filter(molecule => molecule.molNo !== -1);
    }

    return newMolecules;
};

export const loadMrParseUrl = async (
    urlBase,
    commandCentre,
    store,
    monomerLibraryPath,
    backgroundColor,
    defaultBondSmoothness,
    dispatch
) => {
    const json_contents = await loadMrParseJsonUrl(urlBase);
    const modelFiles: string[] = parseJSONAndGetModelFiles(json_contents, dispatch);
    const newMolecules: moorhen.Molecule[] = await loadCoordinateFilesFromURL(
        urlBase,
        modelFiles,
        commandCentre,
        store,
        monomerLibraryPath,
        backgroundColor,
        defaultBondSmoothness
    );

    await drawModels(newMolecules);
    dispatch(addMoleculeList(newMolecules));
    newMolecules.at(-1).centreOn("/*/*/*/*", true);

    dispatch(setMrParseModels(newMolecules));
};

const readCifDictionary = async (file: File, commandCentre, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness) => {
    const dictionary = await parseCifDict(file);
    if (dictionary.length === 0) {
        return null;
    }
    const newMonomers: MoorhenMolecule[] = [];
    for (const dict of dictionary) {
        const newMonomer = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
        await commandCentre.current.cootCommand(
            {
                returnType: "status",
                command: "read_dictionary_string",
                commandArgs: [dict.dict_contents, -999999],
                changesMolecules: [],
            },
            false
        );
        // dictionaryFilesContent.push(content);
        // const compIdsVector = window.CCP4Module.parse_ligand_dict_info(content);

        const result: moorhen.WorkerResponse<number> = await commandCentre.current.cootCommand(
            {
                returnType: "status",
                command: "get_monomer_and_position_at",
                commandArgs: [dict.comp_id, -999999, ...store.getState().glRef.origin.map(coord => -coord)],
            },
            true
        );
        if (result.data.result.status === "Completed") {
            newMonomer.molNo = result.data.result.result;
            newMonomer.name = file.name;
            newMonomer.setBackgroundColour(backgroundColor);
            newMonomer.defaultBondOptions.smoothness = defaultBondSmoothness;
            newMonomer.coordsFormat = "mmcif";
            newMonomer.addDict(dict.dict_contents);
            newMonomers.push(newMonomer);
        }
    }
    return newMonomers;
};
export const autoOpenFiles = async (
    files: File[],
    commandCentre,
    store: MoorhenReduxStoreType,
    monomerLibraryPath,
    backgroundColor,
    defaultBondSmoothness,
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>,
    dispatch: Dispatch
) => {
    const molecules = store.getState().molecules.moleculeList;
    const maps = store.getState().maps;

    let isMrParse = false;
    let isRelionLocresFolder = false;
    const fileNames = files.map(file => file.name);

    // Check for MrParse directory
    if (fileNames.some(name => name.endsWith("input.fasta"))) {
        isMrParse = true;
    }
    // Check for RELION local resolution maps
    else if (fileNames.some(name => name.endsWith("_locres.mrc")) && fileNames.some(name => name.endsWith("_locres_filtered.mrc"))) {
        isRelionLocresFolder = true;
    }

    if (isMrParse) {
        console.log("I think this is an MrParse directory....");
        dispatch(showModal(modalKeys.MRPARSE));
        loadMrParseFiles(files, commandCentre, store, monomerLibraryPath, backgroundColor, defaultBondSmoothness, dispatch);
        return;
    }

    const dictionaryFilesContent: string[] = [];
    const moleculesCreated: MoorhenMolecule[] = [];
    for (const file of files) {
        //Structures
        if (file.name.endsWith(".pdb") || file.name.endsWith(".ent") || file.name.endsWith(".cif") || file.name.endsWith(".mmcif")) {
            const content = await file.text();
            const newMolecule = await readCoordsString(
                content,
                file.name,
                commandCentre,
                store,
                monomerLibraryPath,
                backgroundColor,
                defaultBondSmoothness
            );

            if (newMolecule.molNo === -1) {
                console.log("Failed to read molecule from file " + file.name + " trying to read as cif dictionary...");
                const newMonomer = await readCifDictionary(
                    file,
                    commandCentre,
                    store,
                    monomerLibraryPath,
                    backgroundColor,
                    defaultBondSmoothness
                );
                if (newMonomer === null) {
                    console.log(`Failed to read molecule ${file.name} as a cif dictionary, skipping...`);
                    enqueueSnackbar(`Failed to read molecule ${file.name} as a structure or cif dictionary`, { variant: "warning" });
                    continue;
                }
                await Promise.all(newMonomer.flatMap(monomer => [monomer.fetchIfDirtyAndDraw("CBs"), monomer.fetchDefaultColourRules()]));
                dispatch(addMoleculeList(newMonomer));
                moleculesCreated.push(...newMonomer);
            } else if (newMolecule.atomCount === 0) {
                console.log(`Molecule ${file.name} has no atoms, skipping...`);
                enqueueSnackbar(`Failed to read molecule ${file.name}, no atoms found`, { variant: "warning" });
                continue;
            } else {
                console.log(`Successfully read molecule ${file.name} molno ${newMolecule.molNo}`);
                await drawModels([newMolecule]);
                dispatch(addMoleculeList([newMolecule]));
                moleculesCreated.push(newMolecule);
            }
        } else if (file.name.endsWith(".mtz")) {
            const newMaps = await MoorhenMap.autoReadMtz(file, commandCentre, store);
            if (newMaps.length === 0) {
                enqueueSnackbar(`Failed to read mtz file ${file.name}`, { variant: "warning" });
            } else {
                dispatch(addMapList(newMaps));
                dispatch(setActiveMap(newMaps[0]));
            }
        } else if (file.name.endsWith(".pb")) {
            //Session file
            try {
                await handleSessionUpload(file, commandCentre, store, monomerLibraryPath, molecules, maps, timeCapsuleRef, dispatch);
            } catch (e) {
                enqueueSnackbar(`Failed to load session ${file.name}`, { variant: "warning" });
            }
            break; //We only load the first session.
        } else if (file.name.endsWith(".json")) {
            try {
                const fileContents = await file.text();
                const json = JSON.parse(fileContents);
                dispatch(setValidationJson(json));
                dispatch(showModal(modalKeys.JSON_VALIDATION));
            } catch (e) {
                enqueueSnackbar(`Failed to load json validation ${file.name}`, { variant: "warning" });
            }
        } else if (
            file.name.endsWith(".mrc") ||
            file.name.endsWith(".map") ||
            file.name.endsWith(".ccp4") ||
            file.name.endsWith(".mrc.gz") ||
            file.name.endsWith(".map.gz")
        ) {
            try {
                const newMap = new MoorhenMap(commandCentre, store);
                const isDiff = file.name.endsWith("_fofc.mrc");
                const isLocres = file.name.endsWith("_locres.mrc");
                try {
                    await newMap.loadToCootFromMapFile(file, isDiff);
                } catch (err) {
                    // Try again if this is a compressed file...
                    if (file.name.includes(".gz")) {
                        await newMap.loadToCootFromMapFile(file, isDiff, true);
                    } else {
                        console.warn(err);
                        throw new Error("Cannot read the fetched map...");
                    }
                }
                if (newMap.molNo === -1) {
                    throw new Error("Cannot read the map file!");
                }

                if (molecules.length === 0 && !isLocres) {
                    await newMap.centreOnMap();
                }
                if (isLocres) {
                    newMap.showOnLoad = false;
                }
                dispatch(addMap(newMap));
                if (!isLocres) {
                    dispatch(setActiveMap(newMap));
                }
            } catch (err) {
                console.warn(err);
                // enqueueSnackbar("Error reading map files", { variant: "error" });
                console.log(`Cannot read files`);
            } finally {
                document.body.click();
            }
        }
    }
    if (moleculesCreated.length > 0) {
        moleculesCreated.at(-1).centreOn("/*/*/*/*", true);
    }
    // if (dictionaryFilesContent && dictionaryFilesContent.length > 0) {
    //                 await Promise.all(
    //                     molecules.map(molecule => {
    //                         molecule.cacheLigandDict(fileContent);
    //                         molNosToUpdate.push(molecule.molNo);
    //                         return molecule.redraw();
    //                     })
    // );
    if (isRelionLocresFolder) {
        dispatch(showModal("colour-map-by-map"));
    }
};
