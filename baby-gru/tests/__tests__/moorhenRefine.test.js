import fetch from 'node-fetch'
import { MoorhenMolecule } from "../../tsDist/src/utils/MoorhenMolecule"
import { MoorhenMap } from "../../tsDist/src/utils/MoorhenMap"
import { MockMoorhenCommandCentre } from "../__mocks__/mockMoorhenCommandCentre"
import { MoorhenReduxStore } from "../../src/store/MoorhenReduxStore"
import { MockWebGL } from "../__mocks__/mockWebGL"
import { parseAtomInfoLabel } from "../../tsDist/src/utils/utils"
import moorhen_test_use_gemmi from '../MoorhenTestsSettings'

jest.setTimeout(60000)

const fs = require('fs')
const path = require('path')
const {gzip, ungzip} = require('node-gzip');
const createCootModule = require('../../public/moorhen')

let cootModule;

const mockMonomerLibraryPath = "https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/"

global.fetch = (url) => {
    if (url.includes(mockMonomerLibraryPath)) {
        return fetch(url)
    } else if (url.includes('https:/files.rcsb.org/download/')) {
        return fetch(url)
    } else {
        const fileContents = fs.readFileSync(url, { encoding: 'utf8', flag: 'r' })
        return Promise.resolve({
            ok: true,
            text: async () => {
                return fileContents
            },
            blob: async () => {
                return {
                    arrayBuffer: async () => {
                        const fileContents = fs.readFileSync(url)
                        const buff = fileContents.buffer
                        return buff
                    }
                }
            }
        })
    }
}

// Mock DOMParser which is used to get ligand SVGs
global.DOMParser = class DOMParser {
    constructor() {

    }

    parseFromString(input, type) {
        return {
            getElementsByTagName: () => { return [] }
        }
    }
}

beforeAll(() => {
    return createCootModule({
        print(t) { () => console.log(["output", t]) },
        printErr(t) { () => console.log(["output", t]); }
    }).then(moduleCreated => {
        cootModule = moduleCreated
        global.window = {
            CCP4Module: cootModule,
        }
        return setupFunctions.copyTestDataToFauxFS()
    })
})

let molecules_container = null
let commandCentre = null
let glRef = null

describe("Testing MoorhenMolecule", () => {

    beforeEach(() => {
        if (molecules_container !== null) {
            molecules_container.delete?.()
        }
        molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.set_use_gemmi(moorhen_test_use_gemmi)
        glRef = {
            current: new MockWebGL()
        }
        commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
    })

    test("refineResiduesUsingAtomCidAnimated", async () => {
        const fileUrl_1 = path.join(__dirname, '..', 'test_data', '5a3h-nitrobenzene.pdb')
        const molecule_1 = new MoorhenMolecule(commandCentre, MoorhenReduxStore, mockMonomerLibraryPath)
        await molecule_1.loadToCootFromURL(fileUrl_1, 'mol-test-1')

        const ligandFileName_1 = path.join(__dirname, '..', 'test_data', 'full-nitrobenzene.cif')
        const ligandFileContents_1 = fs.readFileSync(ligandFileName_1, { encoding: 'utf8', flag: 'r' })
        await molecule_1.addDict(ligandFileContents_1)

        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false })
        await map.setActive()
        const cid = `//A/301`
        const refineResult = await molecule_1.refineResiduesUsingAtomCidAnimated(cid, map, -1.0, false)

        //Residue A/301 is a nitrobenzene, so should have 14 bonds
        const acedrgTypesForBondData = await commandCentre.current.cootCommand({
            returnType: 'acedrg_types_for_bond_data',
            command: "get_acedrg_atom_types_for_ligand",
            commandArgs: [
                molecule_1.molNo, '/1/A/301/*'
            ]
        })
        //const result_301 = molecules_container.get_acedrg_atom_types_for_ligand(molecule_1.molNo, '/1/A/301/*')
        //console.log(acedrgTypesForBondData.data.result.result)
        expect(acedrgTypesForBondData.data.result.result).toHaveLength(14)
        expect(acedrgTypesForBondData.data.result.result.every(bond=>bond.bond_length<2.25)).toBeTruthy()
    })
})

const testDataFiles = ['5fjj.pdb', '5a3h.pdb', '5a3h.mmcif', '5a3h_no_ligand.pdb', 'LZA.cif', 'nitrobenzene.cif', 'benzene.cif', '5a3h_sigmaa.mtz', 'rnasa-1.8-all_refmac1.mtz', 'tm-A.pdb', 'full-nitrobenzene.cif']

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
        const cootDataZipped = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'baby-gru', 'data.tar.gz' ), { encoding: null, flag: 'r' })
        return ungzip(cootDataZipped).then((cootData) => {
            cootModule.FS.mkdir("data_tmp")
            cootModule.FS_createDataFile("data_tmp", "data.tar", cootData, true, true);
            cootModule.unpackCootDataFile("data_tmp/data.tar",false,"","")
            cootModule.FS_unlink("data_tmp/data.tar")
        })
        cootModule.FS.mkdir("COOT_BACKUP");
    }
}
