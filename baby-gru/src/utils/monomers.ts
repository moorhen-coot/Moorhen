import type { MoorhenInstance } from "@/InstanceManager/MoorhenInstance";
import type { moorhen } from "@/types/moorhen";
import { ALL_MOLECULES, readDictionary } from "./dictionaries";
import { fetchMonomerDictionary } from "./monomerLibrary";

/**
 * Where a monomer's dictionary is looked for:
 * - "default": the dictionaries loaded in the session (store `dictionaries`), then what Coot has of
 *   its own, else the monomer libraries and PDBe, in that order (fetchMonomerDictionary);
 * - "libcoot-api": only the loaded dictionaries and what Coot has of its own;
 * - one source only: the local monomer library, the remote one (GitHub), or PDBe.
 */
export type MonomerSource = "default" | "libcoot-api" | "local-monomer-library" | "remote-monomer-library" | "pdbe";

const dictionaryUrl = (source: MonomerSource, code: string, monomerLibraryPath: string): string | null => {
    switch (source) {
        case "pdbe":
            return `https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/${code.toUpperCase()}.cif`;
        case "remote-monomer-library":
            return `https://raw.githubusercontent.com/MonomerLibrary/monomers/master/${code.toLowerCase()[0]}/${code.toUpperCase()}.cif`;
        case "local-monomer-library":
            return `${monomerLibraryPath}/${code.toLowerCase()[0]}/${code.toUpperCase()}.cif`;
        default:
            return null;
    }
};

/**
 * Make a monomer in Coot (a new Coot molecule with the monomer's ideal coordinates, placed at
 * `position`), reading its dictionary from `source` if needed: what Get Monomer does, for the Get
 * Monomer menu and for fitting a ligand by its code. The caller makes a MoorhenMolecule of it, or
 * deletes it when done.
 * @param code - The monomer's code (three letters, or more)
 * @param options.fromMolNo - Whose dictionaries to prefer, and to read a fetched one for; every molecule by
 * default. A dictionary loaded for one molecule only is found whichever molecule that is.
 * @param options.position - Where to put it (Coot coordinates)
 * @returns Its Coot molecule number and, when the dictionary came with this call or from that molecule,
 * the dictionary text (to cache on the new molecule); null if no monomer could be made
 */
export const getMonomerMolecule = async (
    instance: MoorhenInstance,
    code: string,
    options: { source?: MonomerSource; fromMolNo?: number; position?: [number, number, number] } = {}
): Promise<{ molNo: number; dictionary?: string } | null> => {
    const { source = "default", fromMolNo = ALL_MOLECULES, position = [0, 0, 0] } = options;
    const tlc = code.toUpperCase();
    const fromMolecule = instance.getMoleculeList().find(molecule => molecule.molNo === fromMolNo);

    const getMonomer = async (molNo: number) => {
        const response = (await instance.commandCentre.cootCommand(
            {
                returnType: "status",
                command: "get_monomer_and_position_at",
                commandArgs: [tlc, molNo, ...position],
            },
            true
        )) as moorhen.WorkerResponse<number>;
        const result = response.data.result;
        return result.status === "Completed" && result.result !== -1 ? result.result : null;
    };

    /** Read a dictionary for the molecule asked for (cached on it), or for every molecule */
    const read = async (dictionary: string, label: string) => {
        if (fromMolecule) await fromMolecule.addDict(dictionary);
        else await readDictionary(instance, dictionary, fromMolNo === ALL_MOLECULES ? null : { molNo: fromMolNo }, label);
    };

    const url = dictionaryUrl(source, tlc, instance.paths.monomerLibraryPath);
    if (url) {
        // One source: its dictionary, read for every molecule (the molecule choice is not offered then)
        let dictionary: string | undefined;
        try {
            const response = await fetch(url);
            if (response.ok) dictionary = await response.text();
        } catch (err) {
            console.warn(`Cannot fetch ${url}`, err);
        }
        if (!dictionary) return null;
        await readDictionary(instance, dictionary, null, "Get monomer");
        const molNo = await getMonomer(ALL_MOLECULES);
        return molNo === null ? null : { molNo, dictionary };
    }

    // The dictionaries loaded in the session: one for every molecule, else the one read for the
    // molecule asked for, else one read for any other molecule. Made with that molecule's number, so
    // that Coot uses its dictionary as it is, neither read again nor for every molecule.
    const loaded = Object.values(instance.store.getState().dictionaries.loaded).filter(dictionary => dictionary.compId === tlc);
    const owners = instance.getMoleculeList();
    const ownerOf = (uniqueId: string | null) => (uniqueId === null ? null : owners.find(molecule => molecule.uniqueId === uniqueId));
    const candidates = [
        ...loaded.filter(dictionary => dictionary.moleculeUid === null).map(dictionary => ({ dictionary, molNo: ALL_MOLECULES })),
        ...loaded
            .filter(dictionary => dictionary.moleculeUid !== null && ownerOf(dictionary.moleculeUid))
            .sort((a, b) => Number(b.moleculeUid === fromMolecule?.uniqueId) - Number(a.moleculeUid === fromMolecule?.uniqueId))
            .map(dictionary => ({ dictionary, molNo: ownerOf(dictionary.moleculeUid).molNo })),
    ];
    for (const candidate of candidates) {
        const molNo = await getMonomer(candidate.molNo);
        if (molNo !== null) return { molNo, dictionary: candidate.dictionary.content };
    }

    // What Coot has of its own (its monomer library), for the molecule asked for
    let molNo = await getMonomer(fromMolNo);
    if (molNo === null && source === "default") {
        // Not known to Coot: looked up in the monomer libraries, then PDBe
        const dictionary = await fetchMonomerDictionary(tlc, instance.paths.monomerLibraryPath);
        if (dictionary) {
            await read(dictionary, "monomer library");
            molNo = await getMonomer(fromMolNo);
        }
    }
    return molNo === null ? null : { molNo, dictionary: fromMolecule?.getDict(tlc) };
};
