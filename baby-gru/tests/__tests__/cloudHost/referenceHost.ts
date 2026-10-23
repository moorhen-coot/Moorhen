/*
 * COPY of MoorhenWrapper's src/ccp4cloudHelpers.ts (owned by CCP4 Cloud), used as the driver for the cloudHost
 * suite. Only the imports differ (`@/...` instead of `moorhen/web-component`). When the helpers change in
 * MoorhenWrapper, copy them over again and re-run the suite.
 */
/*
 * CCP4 Cloud helpers for driving Moorhen directly (the parts of MoorhenWrapper that are CCP4 Cloud policy).
 *
 * These are owned by CCP4 Cloud: change them as you need. They reproduce what MoorhenWrapper does today
 * (loadLigandData + getMonomerOnStart, and exit(): getMoleculeData, getLigData, getViewSettings).
 *
 * WARNING: they use Moorhen internals that are not part of Moorhen's public API, so a Moorhen upgrade can
 * break them without a type error. Re-check these when upgrading Moorhen:
 * - `instance.store.getState().sceneSettings` fields and `glRef.quat` (view data)
 * - `instance.commandCentre.history.headIsDetached` / `getModifiedMolNo()` (modified molecules)
 * - `molecule.ligandDicts`, `isLigand`, `isMRSearchModel`, `getAtoms()`, `cacheLigandDict()`
 * - the Coot commands `read_dictionary_string`, `get_monomer_and_position_at`, `molecule_to_mmCIF_string`
 *   and `close_molecule`
 *
 * Only `moorhen/web-component` is used (one copy of Moorhen in the page). Monomers are therefore created through
 * the public `files.loadCifString` rather than by constructing a MoorhenMolecule.
 *
 * Moorhen plans an `instance.dictionaries` API (see Moorhen's src/.roadmaps/ligand-dictionaries.md); once it
 * exists, loadCloudDictionary and the ligData part of getCloudExitData can switch to it.
 */
import type { MoorhenInstance } from "@/InstanceManager";
import type { LoadFilesResult } from "@/InstanceManager/MoorhenInstance";

/** The view as saved by CCP4 Cloud in view_settings.json */
export type CloudViewData = {
    origin: [number, number, number];
    backgroundColor: [number, number, number, number];
    ambientLight: [number, number, number, number];
    diffuseLight: [number, number, number, number];
    lightPosition: [number, number, number, number];
    specularLight: [number, number, number, number];
    specularPower: number;
    fogStart: number;
    fogEnd: number;
    zoom: number;
    doDrawClickedAtomLines: boolean;
    clipStart: number;
    clipEnd: number;
    quat4: number[];
    doPerspectiveProjection: boolean;
    edgeDetection: { enabled: boolean; depthScale: number; depthThreshold: number; normalScale: number; normalThreshold: number };
    shadows: boolean;
    ssao: { enabled: boolean; radius: number; bias: number };
    blur: { enabled: boolean; radius: number; depth: number };
};

/** What CCP4 Cloud's exit callback receives (MoorhenWrapper's ExitData) */
export type CloudExitData = {
    viewData: CloudViewData;
    molData: { molName: string; pdbData: string; mmcifData: string; isMRSearchModel: boolean }[];
    ligData: string[];
};

type CootReply<T> = { data: { result: { status: string; result: T } } };

/** Dictionaries loaded with loadCloudDictionary, per instance, so they are included in the exit data */
const loadedDictionaries = new WeakMap<MoorhenInstance, string[]>();

/**
 * Register a ligand dictionary with Coot for all molecules (imol -999999), without creating a molecule for
 * each compound as `loadFiles` does, and optionally create monomers. Call it before loading the structures
 * that need the dictionary.
 * @param url - The dictionary URL
 * @param createMonomers - Compound codes to create a monomer molecule for (default none)
 * @returns One `{ type: "molecule", ... }` entry per monomer created
 */
export async function loadCloudDictionary(instance: MoorhenInstance, url: string, createMonomers: string[] = []): Promise<LoadFilesResult> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error fetching dictionary ${url}: ${response.status} ${response.statusText}`);
    }
    const dictionary = await response.text();
    const fileName = url.split("/").pop();

    return instance.execWhenReady(async () => {
        const commandCentre = instance.commandCentre;
        await commandCentre.cootCommand(
            { returnType: "status", command: "read_dictionary_string", commandArgs: [dictionary, -999999], changesMolecules: [] },
            true
        );
        loadedDictionaries.set(instance, [...(loadedDictionaries.get(instance) ?? []), dictionary]);

        const results: LoadFilesResult = [];
        for (const code of createMonomers) {
            // Place the monomer at (0, 0, 0) as MoorhenWrapper did, then load its coordinates as a regular
            // molecule named `code` (drawn as CBs, added to the store) and drop the temporary Coot molecule
            const reply = (await commandCentre.cootCommand(
                { returnType: "status", command: "get_monomer_and_position_at", commandArgs: [code, -999999, 0, 0, 0] },
                true
            )) as CootReply<number>;
            const tempMolNo = reply.data.result.result;
            if (reply.data.result.status !== "Completed" || tempMolNo === -1) {
                console.warn(`Cannot create monomer ${code}, missing dictionary?`);
                continue;
            }
            const coordinates = (await commandCentre.cootCommand(
                { returnType: "string", command: "molecule_to_mmCIF_string", commandArgs: [tempMolNo] },
                false
            )) as CootReply<string>;
            await commandCentre.cootCommand({ returnType: "status", command: "close_molecule", commandArgs: [tempMolNo] }, false);

            const loaded = (await instance.files.loadCifString(coordinates.data.result.result, code)).find(
                item => item.type === "molecule"
            );
            if (!loaded) {
                console.warn(`Cannot create monomer ${code}, its coordinates could not be loaded`);
                continue;
            }
            instance.getMolecule(loaded.uniqueID).cacheLigandDict(dictionary);
            results.push({ type: "molecule", uniqueID: loaded.uniqueID, molNo: loaded.molNo, fileName });
        }
        return results;
    });
}

/**
 * Collect what CCP4 Cloud saves on exit:
 * - `viewData`: the scene settings and orientation (view_settings.json)
 * - `molData`: molecules modified since loading (all of them if the history head is detached) and
 *   molecular-replacement search models, ligand molecules excluded
 * - `ligData`: one dictionary per compound across all molecules, plus those from loadCloudDictionary;
 *   the first one seen wins
 */
export async function getCloudExitData(instance: MoorhenInstance): Promise<CloudExitData> {
    const molecules = instance.getMoleculeList();
    const history = instance.commandCentre.history;
    const modified = history.headIsDetached ? molecules.map(molecule => molecule.molNo) : history.getModifiedMolNo();
    const selected = molecules.filter(molecule => !molecule.isLigand && (molecule.isMRSearchModel || modified.includes(molecule.molNo)));
    const molData = await Promise.all(
        selected.map(async molecule => ({
            molName: molecule.name,
            pdbData: await molecule.getAtoms("pdb"),
            mmcifData: await molecule.getAtoms("mmcif"),
            isMRSearchModel: molecule.isMRSearchModel,
        }))
    );

    const dictionaries: { [compId: string]: string } = {};
    molecules.forEach(molecule => {
        Object.entries(molecule.ligandDicts).forEach(([compId, dictionary]) => {
            dictionaries[compId] ??= dictionary;
        });
    });
    // Molecules hold a reassembled copy of each compound (cacheLigandDict), so compare by compound, not by text
    const extra = (loadedDictionaries.get(instance) ?? []).filter(dictionary => {
        const compIds = [...dictionary.matchAll(/^\s*data_comp_(\S+)/gm)].map(match => match[1]).filter(compId => compId !== "list");
        if (compIds.length > 0 && compIds.every(compId => compId in dictionaries)) {
            return false;
        }
        compIds.forEach(compId => (dictionaries[compId] ??= dictionary));
        return true;
    });
    const ligData = [...new Set([...Object.values(dictionaries), ...extra])];

    const state = instance.store.getState();
    const sceneSettings = state.sceneSettings;
    const viewData: CloudViewData = {
        origin: sceneSettings.origin as [number, number, number],
        backgroundColor: sceneSettings.backgroundColor,
        ambientLight: sceneSettings.ambient,
        diffuseLight: sceneSettings.diffuse,
        lightPosition: sceneSettings.lightPosition,
        specularLight: sceneSettings.specular,
        fogStart: sceneSettings.fogStart,
        fogEnd: sceneSettings.fogEnd,
        zoom: sceneSettings.zoom,
        doDrawClickedAtomLines: false,
        clipStart: sceneSettings.clipStart * -1,
        clipEnd: sceneSettings.clipEnd,
        specularPower: sceneSettings.specularPower,
        quat4: state.glRef.quat,
        doPerspectiveProjection: sceneSettings.doPerspectiveProjection,
        edgeDetection: {
            enabled: sceneSettings.doEdgeDetect,
            depthScale: sceneSettings.edgeDetectDepthScale,
            depthThreshold: sceneSettings.edgeDetectDepthThreshold,
            normalScale: sceneSettings.edgeDetectNormalScale,
            normalThreshold: sceneSettings.edgeDetectNormalThreshold,
        },
        shadows: sceneSettings.doShadow,
        ssao: { enabled: sceneSettings.doSSAO, radius: sceneSettings.ssaoRadius, bias: sceneSettings.ssaoBias },
        blur: { enabled: sceneSettings.useOffScreenBuffers, radius: sceneSettings.depthBlurRadius, depth: sceneSettings.depthBlurDepth },
    };

    return { viewData, molData, ligData };
}
