import fetch from 'node-fetch'
import { MoorhenMolecule } from "../../src/utils/MoorhenMolecule"
import { MoorhenMap } from "../../src/utils/MoorhenMap"
import { MockMoorhenCommandCentre } from "../__mocks__/mockMoorhenCommandCentre"
import { _MoorhenReduxStore as MoorhenReduxStore} from "../../src/store/MoorhenReduxStore"
import { MockWebGL } from "../__mocks__/mockWebGL"
import { getCidAltConf, parseAtomInfoLabel, residueCidForRefinement, restrictCidToAltConf } from "../../src/utils/utils"
import { setActiveMap } from "../../src/store/generalStatesSlice"
import moorhen_test_use_gemmi from '../MoorhenTestsSettings'
import { MockMoorhenInstance } from '../__mocks__/mockMoorhenInstance'

jest.setTimeout(60000)

        const mockMoorhenInstance = {
            store: MoorhenReduxStore,
            paths: {
                monomerLibraryPath: "https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/"
            },
            commandCentre: new MockMoorhenCommandCentre(),
            triggerMoleculeChanged: jest.fn()

        }

const fs = require('fs')
const path = require('path')
const {gzip, ungzip} = require('node-gzip');
const createCootModule = require('../../public/MoorhenAssets/wasm/moorhen')
const createGemmiModule = require('../../public/MoorhenAssets/wasm/gemmi')

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

beforeAll(async () => {
    cootModule = await createCootModule({
        print: (t) => console.log(["output", t]),
        printErr: (t) => console.log(["output", t]),
    })

    const gemmiModule = await createGemmiModule({
        print: (t) => console.log(["output", t]),
        printErr: (t) => console.log(["output", t]),
    })

    global.window = {
        CCP4Module: cootModule,
        gemmiModule: gemmiModule,
    }

    await setupFunctions.copyTestDataToFauxFS()
})

let molecules_container = null
let commandCentre = null
let mockInstance = null
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

        commandCentre ={current: new MockMoorhenCommandCentre(molecules_container, cootModule)};
        mockInstance = new MockMoorhenInstance(commandCentre.current);
    })

    test("refineResiduesUsingAtomCidAnimated", async () => {
        const fileUrl_1 = path.join(__dirname, '..', 'test_data', '5a3h-nitrobenzene.pdb')
        const molecule_1 = new MoorhenMolecule(mockMoorhenInstance)
        await molecule_1.loadToCootFromURL(fileUrl_1, 'mol-test-1')

        const ligandFileName_1 = path.join(__dirname, '..', 'test_data', 'full-nitrobenzene.cif')
        const ligandFileContents_1 = fs.readFileSync(ligandFileName_1, { encoding: 'utf8', flag: 'r' })
        await molecule_1.addDict(ligandFileContents_1)

        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const map = new MoorhenMap(mockInstance)
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

describe("Alternate conformation refinement (7avk)", () => {
    // 7avk: A/1243-1252 has a whole alternate A/B segment, A/1221 has A/B side chains on a shared backbone

    const atomsFromPdb = (pdbString) => {
        const atoms = new Map()
        pdbString.split('\n').filter(line => line.startsWith('ATOM') || line.startsWith('HETATM')).forEach(line => {
            const alt = line.substring(16, 17).trim()
            const key = `${line.substring(20, 22).trim()}/${parseInt(line.substring(22, 26))}/${line.substring(12, 16).trim()}:${alt}`
            atoms.set(key, { alt, xyz: [30, 38, 46].map(i => parseFloat(line.substring(i, i + 8))) })
        })
        return atoms
    }

    // Number of atoms that moved, keyed by alt conf ('' for atoms without one)
    const movedAtomsByAltConf = (before, after) => {
        expect([...after.keys()].sort()).toEqual([...before.keys()].sort())
        const moved = {}
        before.forEach((atom, key) => {
            const d = Math.hypot(...atom.xyz.map((v, i) => v - after.get(key).xyz[i]))
            if (d > 0.001) moved[atom.alt] = (moved[atom.alt] ?? 0) + 1
        })
        return moved
    }

    const setupMoleculeAndMap = async () => {
        const molecule = new MoorhenMolecule(mockMoorhenInstance)
        await molecule.loadToCootFromURL(path.join(__dirname, '..', 'test_data', '7avk.cif'), '7avk')
        const map = new MoorhenMap(mockInstance)
        await map.loadToCootFromMtzURL(path.join(__dirname, '..', 'test_data', '7avk_map.mtz'), '7avk-map', {
            F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false
        })
        await commandCentre.current.cootCommand({ returnType: 'status', command: 'set_imol_refinement_map', commandArgs: [map.molNo] })
        MoorhenReduxStore.dispatch(setActiveMap(map))
        const getAtoms = () => atomsFromPdb(molecules_container.molecule_to_PDB_string(molecule.molNo))
        return { molecule, map, getAtoms }
    }

    beforeEach(() => {
        if (molecules_container !== null) {
            molecules_container.delete?.()
        }
        molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.set_use_gemmi(moorhen_test_use_gemmi)
        commandCentre = { current: new MockMoorhenCommandCentre(molecules_container, cootModule) }
        mockInstance = new MockMoorhenInstance(commandCentre.current)
    })

    afterEach(() => {
        MoorhenReduxStore.dispatch(setActiveMap(null))
    })

    test("CID alt conf helpers", () => {
        expect(getCidAltConf('//A/42')).toBeNull()
        expect(getCidAltConf('//A/42/*:B')).toBe('B')
        expect(getCidAltConf('//A/42/CA:B')).toBe('B')
        expect(getCidAltConf('//A/41-43/*:,B')).toBe('B')
        expect(getCidAltConf('//A/41-43/*:,B||//A/12/*:,B')).toBe('B')
        expect(getCidAltConf('//A/41-43/*:,B||//A/12/*')).toBeNull()
        expect(getCidAltConf('//A/41-43/*:A||//A/12/*:B')).toBeNull()
        expect(restrictCidToAltConf('//A/41-43/*', 'B')).toBe('//A/41-43/*:,B')
        expect(restrictCidToAltConf('//A/42/CA:A||//A/12', 'B')).toBe('//A/42/*:,B||//A/12/*:,B')
        expect(residueCidForRefinement({ chain_id: 'A', res_no: 42, alt_conf: '' })).toBe('//A/42')
        expect(residueCidForRefinement({ chain_id: 'A', res_no: 42, alt_conf: 'B' })).toBe('//A/42/*:B')
    })

    test("Refining without an alt conf moves every conformation", async () => {
        const { molecule, getAtoms } = await setupMoleculeAndMap()
        const before = getAtoms()
        await molecule.refineResiduesUsingAtomCid('//A/1246', 'TRIPLE', 4000, false)
        const moved = movedAtomsByAltConf(before, getAtoms())
        expect(moved.A).toBeGreaterThan(0)
        expect(moved.B).toBeGreaterThan(0)
    })

    test.each([
        ['TRIPLE', '//A/1246/*:B', 'B', 'A'],
        ['SINGLE', '//A/1246/*:A', 'A', 'B'],
        ['SPHERE', '//A/1246/*:B', 'B', 'A'],
    ])("refineResiduesUsingAtomCid %s %s only moves that alt conf", async (mode, cid, refined, fixed) => {
        const { molecule, getAtoms } = await setupMoleculeAndMap()
        const before = getAtoms()
        await molecule.refineResiduesUsingAtomCid(cid, mode, 4000, false)
        const moved = movedAtomsByAltConf(before, getAtoms())
        expect(moved[refined]).toBeGreaterThan(0)
        expect(moved[fixed]).toBeUndefined()
    })

    test("Alt conf side chain refinement keeps the shared backbone connected", async () => {
        const { molecule, getAtoms } = await setupMoleculeAndMap()
        const before = getAtoms()
        await molecule.refineResiduesUsingAtomCid('//A/1221/*:A', 'TRIPLE', 4000, false)
        const after = getAtoms()
        const moved = movedAtomsByAltConf(before, after)
        expect(moved.A).toBeGreaterThan(0)
        expect(moved.B).toBeUndefined()
        // N, C and O of 1221 have no alt conf: the CA of each conformation stays bonded to the shared N
        expect(moved['']).toBeGreaterThan(0)
        for (const alt of ['A', 'B']) {
            const n = after.get('A/1221/N:').xyz
            const ca = after.get(`A/1221/CA:${alt}`).xyz
            expect(Math.hypot(...n.map((v, i) => v - ca[i]))).toBeCloseTo(1.46, 1)
        }
    })

    test.each([
        ['B', 'A'],
        ['A', 'B'],
    ])("autoFitRotamer alt conf %s keeps alt conf %s", async (fitted, fixed) => {
        // libcoot's auto_fit_rotamer on A/1246 alt B also writes the fitted coordinates over alt A
        const { molecule, map, getAtoms } = await setupMoleculeAndMap()
        const before = getAtoms()
        const status = await molecule.autoFitRotamer('A', 1246, '', fitted, map)
        const after = getAtoms()
        expect(status).toBe(1)
        const moved = movedAtomsByAltConf(before, after)
        expect(moved[fitted]).toBeGreaterThan(0)
        expect(moved[fixed]).toBeUndefined()
        expect(Object.keys(moved)).toEqual([fitted])
        // the two conformations are still distinct
        const ca = alt => after.get(`A/1246/CA:${alt}`).xyz
        expect(Math.hypot(...ca('A').map((v, i) => v - ca('B')[i]))).toBeGreaterThan(0.5)
    })

    test("residueHasMissingAtoms", async () => {
        // decides between fill_partial_residue and autoFitRotamer in the auto-fit rotamer context button
        const { molecule } = await setupMoleculeAndMap()
        expect(await molecule.residueHasMissingAtoms('A', 1221)).toBe(false)
        expect(await molecule.residueHasMissingAtoms('A', 1246)).toBe(false)
        expect(await molecule.residueHasMissingAtoms('A', 1222)).toBe(false)
        const deleteAtoms = cid => commandCentre.current.cootCommand({ returnType: 'status', command: 'delete_using_cid', commandArgs: [molecule.molNo, cid, 'LITERAL'] })
        await deleteAtoms('//A/1222/CZ||//A/1222/CE1||//A/1222/CE2||//A/1222/HZ||//A/1222/HE1||//A/1222/HE2')
        expect(await molecule.residueHasMissingAtoms('A', 1222)).toBe(true)
        // atoms missing from one alt conf only are not reported (fill_partial_residue cannot fill them anyway)
        await deleteAtoms('//A/1221/CD:B||//A/1221/OE1:B||//A/1221/OE2:B||//A/1221/HG2:B||//A/1221/HG3:B')
        expect(await molecule.residueHasMissingAtoms('A', 1221)).toBe(false)
    })

    test("autoFitRotamer without alt conf", async () => {
        const { molecule, map, getAtoms } = await setupMoleculeAndMap()
        const before = getAtoms()
        const status = await molecule.autoFitRotamer('A', 1216, '', '', map)
        expect(status).toBe(1)
        movedAtomsByAltConf(before, getAtoms())
    })

    test("refineResiduesUsingAtomCidAnimated only moves the chosen alt conf", async () => {
        const { molecule, map, getAtoms } = await setupMoleculeAndMap()
        const before = getAtoms()
        await molecule.refineResiduesUsingAtomCidAnimated('//A/1246/*:B', map, 2, false)
        const moved = movedAtomsByAltConf(before, getAtoms())
        expect(moved.B).toBeGreaterThan(0)
        expect(moved.A).toBeUndefined()
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
        const cootDataZipped = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'MoorhenAssets', 'data.tar.gz' ), { encoding: null, flag: 'r' })
        return ungzip(cootDataZipped).then((cootData) => {
            cootModule.FS.mkdir("data_tmp")
            cootModule.FS_createDataFile("data_tmp", "data.tar", cootData, true, true);
            cootModule.unpackCootDataFile("data_tmp/data.tar",false,"","")
            cootModule.FS_unlink("data_tmp/data.tar")
        })
        cootModule.FS.mkdir("COOT_BACKUP");
    }
}
