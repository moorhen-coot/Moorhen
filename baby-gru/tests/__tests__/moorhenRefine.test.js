import { MoorhenMolecule } from "../../tsDist/src/utils/MoorhenMolecule"
import { MoorhenMap } from "../../tsDist/src/utils/MoorhenMap"
import { MockMoorhenCommandCentre } from "../__mocks__/mockMoorhenCommandCentre"
import { MoorhenReduxStore } from "../../tsDist/src/store/MoorhenReduxStore"
import { MockWebGL } from "../__mocks__/mockWebGL"
import { parseAtomInfoLabel } from "../../tsDist/src/utils/utils"
import fetch from 'node-fetch'

jest.setTimeout(60000)

const fs = require('fs')
const path = require('path')
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
        setupFunctions.copyTestDataToFauxFS()
        global.window = {
            CCP4Module: cootModule,
        }
        return Promise.resolve()
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
        molecules_container.set_use_gemmi(false)
        glRef = {
            current: new MockWebGL()
        }
        commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
    })

    test("Test refineResiduesUsingAtomCidAnimated", async () => {
        const fileUrl_1 = path.join(__dirname, '..', 'test_data', '5a3h-nitrobenzene.pdb')
        const molecule_1 = new MoorhenMolecule(commandCentre, glRef, MoorhenReduxStore, mockMonomerLibraryPath)
        await molecule_1.loadToCootFromURL(fileUrl_1, 'mol-test-1')

        const ligandFileName_1 = path.join(__dirname, '..', 'test_data', 'nitrobenzene.cif')
        const ligandFileContents_1 = fs.readFileSync(ligandFileName_1, { encoding: 'utf8', flag: 'r' })
        await molecule_1.addDict(ligandFileContents_1)
        expect(molecule_1.ligandDicts).toEqual({
            "LIG": ligandFileContents_1
        })

        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false })
        await map.setActive()
        const cid = `//A/301`
        const refineResult = await molecule_1.refineResiduesUsingAtomCidAnimated(cid, map, -1.0, false)

        let bondSettings = [
            "COLOUR-BY-CHAIN-AND-DICTIONARY",
            molecule_1.isDarkBackground
        ]
        bondSettings.push(
            molecule_1.defaultBondOptions.width * 1.5,
            molecule_1.defaultBondOptions.atomRadiusBondRatio * 1.5,
            molecule_1.defaultBondOptions.smoothness
        )

        const response = await commandCentre.current.cootCommand({
            returnType: "instanced_mesh",
            command: "get_bonds_mesh_for_selection_instanced",
            commandArgs: [
                molecule_1.molNo,
                cid,
                ...bondSettings
            ]
        }, false)

        console.log({ "response.data.result": response.data.result.result.instance_sizes[0][0] })
        expect('Black').toBe('White')
    })
})

const testDataFiles = ['5fjj.pdb', '5a3h.pdb', '5a3h.mmcif', '5a3h_no_ligand.pdb', 'LZA.cif', 'nitrobenzene.cif', 'benzene.cif', '5a3h_sigmaa.mtz', 'rnasa-1.8-all_refmac1.mtz', 'tm-A.pdb']

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
