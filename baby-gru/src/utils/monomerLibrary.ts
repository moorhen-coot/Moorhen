/**
 * Fetch the restraints dictionary of a monomer: from the local monomer library first, then from the
 * MonomerLibrary repository on GitHub, then from PDBe.
 * @param compId - The monomer's three-letter (or longer) code
 * @param monomerLibraryPath - The local monomer library, laid out as `<path>/<first letter>/<CODE>.cif`
 * @returns The dictionary text, or undefined if no source has it
 */
export const fetchMonomerDictionary = async (compId: string, monomerLibraryPath: string): Promise<string | undefined> => {
    let fileContent = "";
    try {
        const response = await fetch(`${monomerLibraryPath}/${compId.toLowerCase()[0]}/${compId.toUpperCase()}.cif`);
        if (response.ok) {
            fileContent = await response.text();
        }
    } catch (err) {
        console.log(err);
        console.log(`Unable to fetch ligand dictionary ${compId} from local url`);
    }
    // A server without the file may answer 200 with an HTML page (e.g. a SPA fallback)
    if (fileContent.includes("data_")) {
        return fileContent;
    }

    console.log(`Unable to fetch ligand dictionary ${compId} from local monomer library...`);
    try {
        const url = `https://raw.githubusercontent.com/MonomerLibrary/monomers/master/${compId.toLowerCase()[0]}/${compId.toUpperCase()}.cif`;
        let response = await fetch(url);
        if (response.ok) {
            return await response.text();
        }
        console.log(`Unable to fetch ligand dictionary ${compId} from remote monomer library...`);
        response = await fetch(`https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/${compId.toUpperCase()}.cif`);
        if (response.ok) {
            return await response.text();
        }
        console.log(`Unable to fetch ligand dictionary ${compId} from PDBe chem...`);
    } catch (err) {
        console.log(err);
        console.log(`Unable to fetch ligand dictionary ${compId}`);
    }
    return undefined;
};
