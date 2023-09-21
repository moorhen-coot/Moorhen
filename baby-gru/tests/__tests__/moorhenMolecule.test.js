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

    test("Test get_atoms", async() => {
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

    test("Test replaceModelWithFile", async() => {
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

    test("Test copyMolecule", async() => {
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
