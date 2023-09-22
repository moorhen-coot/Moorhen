import { MoorhenMolecule } from "../../tsDist/src/utils/MoorhenMolecule"
import { MockMoorhenCommandCentre } from "../helpers/mockMoorhenCommandCentre"
import { MockWebGL } from "../helpers/mockWebGL"
import fetch from 'node-fetch';

jest.setTimeout(40000)

const fs = require('fs')
const path = require('path')
const createCootModule = require('../../public/baby-gru/wasm/moorhen')
let cootModule;

const mockMonomerLibraryPath = "https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/"

global.fetch = (url) => {
    if (url.includes(mockMonomerLibraryPath)) {
        return fetch(url)
    } else {
        const fileContents = fs.readFileSync(url, { encoding: 'utf8', flag: 'r' })
        return Promise.resolve({
            ok: true,
            text: async () => {
                return fileContents
            }
        })
    }
}

beforeAll(() => {   
    return createCootModule({
        print(t) { () => console.log(["output", t]) },
        printErr(t) { () => console.log(["output", t]); }
    }).then(moduleCreated => {
        cootModule = moduleCreated
        setupFunctions.copyTestDataToFauxFS()
        global.window = {
            CCP4Module: cootModule,
        }
        return Promise.resolve()
    })
})

describe("Testing MoorhenMolecule", () => {

    test("Test loadToCootFromURL", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h.pdb')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const molecule = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule.loadToCootFromURL(fileUrl, 'mol-test')
        expect(molecule.molNo).toBe(0)
    })

    test("Test delete", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h.pdb')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const molecule = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule.loadToCootFromURL(fileUrl, 'mol-test')
        await molecule.delete()
        const isValid = molecules_container.is_valid_model_molecule(molecule.molNo)
        expect(isValid).toBeFalsy()
    })

    test("Test get_atoms", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h.pdb')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const molecule = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule.loadToCootFromURL(fileUrl, 'mol-test')
        const coordData = await molecule.getAtoms('pdb')
        expect(coordData.data.result.result).toHaveLength(258718)
    }) 

    test("Test replaceModelWithFile", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl_1 = path.join(__dirname, '..', 'test_data', '5a3h.pdb')
        const fileUrl_2 = path.join(__dirname, '..', 'test_data', '5fjj.pdb')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }

        const molecule_1 = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule_1.loadToCootFromURL(fileUrl_1, 'mol-test')
        await molecule_1.replaceModelWithFile(fileUrl_2, 'mol-test')
        const coordData_1 = await molecule_1.getAtoms('pdb')

        const molecule_2 = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule_2.loadToCootFromURL(fileUrl_2, 'mol-test')
        const coordData_2 = await molecule_2.getAtoms('pdb')

        expect(coordData_1.data.result.result).toBe(coordData_2.data.result.result)
    })

    test("Test copyMolecule", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h.pdb')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }

        const molecule_1 = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule_1.loadToCootFromURL(fileUrl, 'mol-test')
        const coordData_1 = await molecule_1.getAtoms('pdb')

        const molecule_2 = await molecule_1.copyMolecule()
        const coordData_2 = await molecule_2.getAtoms('pdb')

        expect(coordData_1.data.result.result).toBe(coordData_2.data.result.result)
    })

    test("Test copyFragmentUsingCid", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h.pdb')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }

        const molecule_1 = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule_1.loadToCootFromURL(fileUrl, 'mol-test')
        const molecule_2 = await molecule_1.copyFragmentUsingCid("//A/32-33/*", false)
        const atomCount = molecules_container.get_number_of_atoms(molecule_2.molNo)
        expect(molecule_2.molNo).not.toBe(-1)
        expect(atomCount).toBe(14)
    })

    test("Test mergeMolecules", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl_1 = path.join(__dirname, '..', 'test_data', '5a3h_no_ligand.pdb')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }

        const molecule_1 = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule_1.loadToCootFromURL(fileUrl_1, 'mol-test')
        const atom_count_1 = molecules_container.get_number_of_atoms(molecule_1.molNo)

        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', -999999)
        expect(result_import_dict).toBe(1)
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'LZA', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)
        const atom_count_2 = molecules_container.get_number_of_atoms(ligandMolNo)

        await molecule_1.mergeMolecules([{ molNo: ligandMolNo, representations: [], ligandDicts: {} }], false)
        const atom_count_merged = molecules_container.get_number_of_atoms(molecule_1.molNo)
        expect(atom_count_merged).toBe(atom_count_1 + atom_count_2)
    })

    test("Test addLigandOfType", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl_1 = path.join(__dirname, '..', 'test_data', '5a3h_no_ligand.pdb')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }

        const molecule = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule.loadToCootFromURL(fileUrl_1, 'mol-test')
        const atom_count_1 = molecules_container.get_number_of_atoms(molecule.molNo)

        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', -999999)
        expect(result_import_dict).toBe(1)
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'LZA', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)
        const atom_count_2 = molecules_container.get_number_of_atoms(ligandMolNo)

        expect(molecule.ligands).toHaveLength(0)
        await molecule.addLigandOfType('LZA')
        const atom_count_merged = molecules_container.get_number_of_atoms(molecule.molNo)
        expect(atom_count_merged).toBe(atom_count_1 + atom_count_2)
        expect(molecule.ligands).toHaveLength(1)
        expect(molecule.ligands).toEqual([{"chainName": "B", "cid": "/1/B/1(LZA)", "modelName": "1", "resName": "LZA", "resNum": "1"}])
    })

    test("Test loadMissingMonomers", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl_1 = path.join(__dirname, '..', 'test_data', '5a3h.pdb')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }

        const molecule = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        const f_1 = jest.spyOn(molecule, 'loadMissingMonomers')
        const f_2 = jest.spyOn(molecule, 'loadMissingMonomer')
        await molecule.loadToCootFromURL(fileUrl_1, 'mol-test')
        expect(f_1).toHaveBeenCalled()
        expect(f_2).toHaveBeenCalledTimes(2)
        expect(Object.keys(molecule.ligandDicts).sort()).toEqual([ 'BGC', 'G2F' ])
    })

    test("Test gemmiAtomsForCid", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl_1 = path.join(__dirname, '..', 'test_data', '5a3h.pdb')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }

        const molecule = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        const f = jest.spyOn(molecule, 'updateAtoms')
        await molecule.loadToCootFromURL(fileUrl_1, 'mol-test')
        molecule.setAtomsDirty(true)
        const gemmiAtoms = await molecule.gemmiAtomsForCid('//A/30-31/CA')
        expect(f).toHaveBeenCalled()
        expect(gemmiAtoms).toHaveLength(2)
        expect(gemmiAtoms.map(atomInfo => atomInfo.label)).toEqual([ "/1/A/30(LYS)/CA", "/1/A/31(GLY)/CA" ])
    })

})

const testDataFiles = ['5fjj.pdb', '5a3h.pdb', '5a3h_no_ligand.pdb', 'LZA.cif', '5a3h_sigmaa.mtz', 'rnasa-1.8-all_refmac1.mtz', 'tm-A.pdb']

const setupFunctions = {
    removeTestDataFromFauxFS: () => {
        testDataFiles.forEach(fileName => {
            cootModule.FS_unlink(fileName)
        })
    },
    copyTestDataToFauxFS: () => {
        testDataFiles.forEach(fileName => {
            let dirName
            if (fileName === 'rnasa-1.8-all_refmac1.mtz') {
                dirName = path.join(__dirname, '..', '..', '..', 'checkout', 'coot-1.0', 'data')
            } else if (fileName === 'tm-A.pdb') {
                dirName = path.join(__dirname, '..', '..', '..', 'checkout', 'coot-1.0', 'api')
            } else {
                dirName = path.join(__dirname, '..', 'test_data')
            }
            const coordData = fs.readFileSync(path.join(dirName, fileName), { encoding: fileName.includes('mtz') ? null : 'utf8', flag: 'r' })
            cootModule.FS_createDataFile(".", fileName, coordData, true, true);
        })
        cootModule.FS.mkdir("COOT_BACKUP");
    }
}
