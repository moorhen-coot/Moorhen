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
    } else if (url.includes('https:/files.rcsb.org/download/')) {
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
        expect(coordData).toHaveLength(258719)
    }) 

    test("Test get_number_of_atoms", async () => {
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
        expect(molecule.atomCount).toBe(2765)
        const atomCount = await molecule.getNumberOfAtoms()
        expect(atomCount).toBe(2765)
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

        expect(coordData_1).toBe(coordData_2)
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

        expect(coordData_1).toBe(coordData_2)
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

    test("Test gemmiAtomsForCid 1", async () => {
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

    test("Test gemmiAtomsForCid 2", async () => {
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
        await molecule.hideCid("/*/A/29-30/*")
        const gemmiAtoms = await molecule.gemmiAtomsForCid('//A/30-31/CA', true)
        expect(f).toHaveBeenCalled()
        expect(gemmiAtoms).toEqual([
            {
              res_name: 'GLY',
              res_no: '31',
              mol_name: '1',
              chain_id: 'A',
              pos: [ 70.995, 43.686, 22.449 ],
              x: 70.995,
              y: 43.686,
              z: 22.449,
              charge: 0,
              element: 'C',
              symbol: 'C',
              tempFactor: 9.109999656677246,
              serial: 213,
              name: 'CA',
              has_altloc: false,
              alt_loc: "",
              label: '/1/A/31(GLY)/CA'
            }
        ])
        expect(gemmiAtoms.map(atomInfo => atomInfo.label)).toEqual([ "/1/A/31(GLY)/CA" ])
    })

    test("Test updateAtoms", async () => {
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
        
        const sequence_1 = molecule.sequences.find(seq => seq.chain === 'A')
        const length_1 = sequence_1.sequence.length
        molecules_container.delete_using_cid(molecule.molNo, "A/32-33/*", "LITERAL")
        await molecule.updateAtoms()
        const sequence_2 = molecule.sequences.find(seq => seq.chain === 'A')
        expect(sequence_2.sequence).toHaveLength(length_1 - 2)
       
        molecules_container.delete_using_cid(molecule.molNo, "//B", "LITERAL")
        await molecule.updateAtoms()
        expect(molecule.ligands).toHaveLength(0)
    })

    test("Test getNeighborResiduesCids", async () => {
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
        
        const result = await molecule.getNeighborResiduesCids('//A/33/CA', 3)
        expect(result).toEqual(['//A/32-34/*'])
    })

    test("Test checkIsLigand", async () => {
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
        expect(molecule.isLigand).toBeFalsy()

        const result_cid = molecules_container.delete_using_cid(molecule.molNo, "//A", "LITERAL")
        expect(result_cid.first).toBe(1)

        molecule.setAtomsDirty(true)
        await molecule.updateAtoms()
        expect(molecule.isLigand).toBeTruthy()
        const isLigand = molecule.checkIsLigand()
        expect(isLigand).toBeTruthy()
    })

    test.skip("Test importing ligands with same name", async () => {
        /**
         * First create a molecules_container_js and load nitrobenzene so that we
         * get the "correct" bonds mesh.
         */
        const molecules_container_1 = new cootModule.molecules_container_js(false)
        const commandCentre_1 = {
            current: new MockMoorhenCommandCentre(molecules_container_1, cootModule)
        }

        const coordMolNo_1 = molecules_container_1.read_pdb('./5a3h.pdb')
        const result_import_dict_1 = molecules_container_1.import_cif_dictionary('./nitrobenzene.cif', coordMolNo_1)
        expect(result_import_dict_1).toBe(1)
        const ligandMolNo_1 = molecules_container_1.get_monomer_and_position_at(
            'LIG', coordMolNo_1, 0, 0, 0
        )
        // This bond mesh contains the "correct" bonds for the ligand
        const simpleMesh_1 = await commandCentre_1.current.cootCommand({
            returnType: 'instanced_mesh',
            command: "get_bonds_mesh_instanced",
            commandArgs: [
                ligandMolNo_1,
                'COLOUR-BY-CHAIN-AND-DICTIONARY',
                false, 0.1, 1, 1
            ]
        })

        
        /**
         * Create new molecules_container_js and import two dictionaries for two different ligands
         * that share the same name "LIG". Each ligand is added to a different molecule. You 
         * would expect that the nitrobenzene here would have the same bonds as the ones
         * we got previously.
         */
        const molecules_container_2 = new cootModule.molecules_container_js(false)
        const commandCentre_2 = {
            current: new MockMoorhenCommandCentre(molecules_container_2, cootModule)
        }

        const coordMolNo_2 = molecules_container_2.read_pdb('./5a3h.pdb')
        const result_import_dict_2 = molecules_container_2.import_cif_dictionary('./benzene.cif', coordMolNo_2)
        expect(result_import_dict_2).toBe(1)
        
        const coordMolNo_3 = molecules_container_2.read_pdb('./5a3h.pdb')
        const result_import_dict_3 = molecules_container_2.import_cif_dictionary('./nitrobenzene.cif', coordMolNo_3)
        expect(result_import_dict_3).toBe(1)
        const ligandMolNo_3 = molecules_container_2.get_monomer_and_position_at(
            'LIG', coordMolNo_3, 0, 0, 0
        )
        // This bond mesh contains "weird" bonds that do not correspond with nitrobenzene
        const simpleMesh_3 = await commandCentre_2.current.cootCommand({
            returnType: 'instanced_mesh',
            command: "get_bonds_mesh_instanced",
            commandArgs: [
                ligandMolNo_3,
                'COLOUR-BY-CHAIN-AND-DICTIONARY',
                false, 0.1, 1, 1
            ]
        })

        expect(simpleMesh_3.data.result.result.idx_tri).toEqual(simpleMesh_1.data.result.result.idx_tri)
        expect(simpleMesh_3.data.result.result.vert_tri).toEqual(simpleMesh_1.data.result.result.vert_tri)
        expect(simpleMesh_3.data.result.result.norm_tri).toEqual(simpleMesh_1.data.result.result.norm_tri)
        expect(simpleMesh_3.data.result.result.instance_origins).toEqual(simpleMesh_1.data.result.result.instance_origins)
        expect(simpleMesh_3.data.result.result.instance_orientations).toEqual(simpleMesh_1.data.result.result.instance_orientations)
        expect(simpleMesh_3.data.result.result.instance_sizes).toEqual(simpleMesh_1.data.result.result.instance_sizes)
    })

    test.skip("Test hideCid", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h.pdb')
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const glRef = {
            current: new MockWebGL()
        }

        const molecule_1 = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule_1.loadToCootFromURL(fileUrl, 'mol-test-1')
        expect(molecule_1.molNo).toBe(0)
        await molecule_1.hideCid("A/32-33/*")
        expect(molecule_1.excludedSelections).toEqual([ "A/32-33/*" ])
        expect(molecule_1.excludedCids).toEqual([ '//A/32/*', '//A/33/*' ])
        const instancedMesh_1 = await commandCentre.current.cootCommand({
            returnType: 'instanced_mesh',
            command: "get_bonds_mesh_instanced",
            commandArgs: [
                molecule_1.molNo,
                'COLOUR-BY-CHAIN-AND-DICTIONARY',
                false, 0.1, 1, 1
            ]
        })
        const instancedMesh_2 = await commandCentre.current.cootCommand({
            returnType: 'instanced_mesh',
            command: "get_bonds_mesh_for_selection_instanced",
            commandArgs: [
                molecule_1.molNo,
                '//',
                'COLOUR-BY-CHAIN-AND-DICTIONARY',
                false, 0.1, 1, 1
            ]
        })

        expect(instancedMesh_1.data.result.result.idx_tri).toEqual(instancedMesh_2.data.result.result.idx_tri)
        expect(instancedMesh_1.data.result.result.vert_tri).toEqual(instancedMesh_2.data.result.result.vert_tri)
        expect(instancedMesh_1.data.result.result.norm_tri).toEqual(instancedMesh_2.data.result.result.norm_tri)
        expect(instancedMesh_1.data.result.result.instance_origins).toEqual(instancedMesh_2.data.result.result.instance_origins)
        expect(instancedMesh_1.data.result.result.instance_orientations).toEqual(instancedMesh_2.data.result.result.instance_orientations)
        expect(instancedMesh_1.data.result.result.instance_sizes).toEqual(instancedMesh_2.data.result.result.instance_sizes)

        const molecule_2 = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule_2.loadToCootFromURL(fileUrl, 'mol-test-2')
        expect(molecule_2.molNo).toBe(1)
        const result_cid = molecules_container.delete_using_cid(molecule_2.molNo, "A/32-33/*", "LITERAL")
        expect(result_cid.first).toBe(1)
        
        const instancedMesh_3 = await commandCentre.current.cootCommand({
            returnType: 'instanced_mesh',
            command: "get_bonds_mesh_instanced",
            commandArgs: [
                molecule_2.molNo,
                'COLOUR-BY-CHAIN-AND-DICTIONARY',
                false, 0.1, 1, 1
            ]
        })

        expect(instancedMesh_1.data.result.result.idx_tri).toEqual(instancedMesh_3.data.result.result.idx_tri)
        expect(instancedMesh_1.data.result.result.vert_tri).toEqual(instancedMesh_3.data.result.result.vert_tri)
        expect(instancedMesh_1.data.result.result.norm_tri).toEqual(instancedMesh_3.data.result.result.norm_tri)
        expect(instancedMesh_1.data.result.result.instance_origins).toEqual(instancedMesh_3.data.result.result.instance_origins)
        expect(instancedMesh_1.data.result.result.instance_orientations).toEqual(instancedMesh_3.data.result.result.instance_orientations)
        expect(instancedMesh_1.data.result.result.instance_sizes).toEqual(instancedMesh_3.data.result.result.instance_sizes)

        const instancedMesh_4 = await commandCentre.current.cootCommand({
            returnType: 'instanced_mesh',
            command: "get_bonds_mesh_for_selection_instanced",
            commandArgs: [
                molecule_2.molNo,
                '//',
                'COLOUR-BY-CHAIN-AND-DICTIONARY',
                false, 0.1, 1, 1
            ]
        })

        expect(instancedMesh_2.data.result.result.idx_tri).toEqual(instancedMesh_4.data.result.result.idx_tri)
        expect(instancedMesh_2.data.result.result.vert_tri).toEqual(instancedMesh_4.data.result.result.vert_tri)
        expect(instancedMesh_2.data.result.result.norm_tri).toEqual(instancedMesh_4.data.result.result.norm_tri)
        expect(instancedMesh_2.data.result.result.instance_origins).toEqual(instancedMesh_4.data.result.result.instance_origins)
        expect(instancedMesh_2.data.result.result.instance_orientations).toEqual(instancedMesh_4.data.result.result.instance_orientations)
        expect(instancedMesh_2.data.result.result.instance_sizes).toEqual(instancedMesh_4.data.result.result.instance_sizes)
    })

    test("Test hasDNA", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join('https://files.rcsb.org/download/3L1P.pdb')
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const glRef = {
            current: new MockWebGL()
        }

        const molecule = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule.loadToCootFromURL(fileUrl, 'mol-test-1')
        expect(molecule.molNo).toBe(0)
        expect(molecule.hasDNA).toBeTruthy()
    })

    test("Test hasGlycans", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_no_ligand.pdb')
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const glRef = {
            current: new MockWebGL()
        }

        const molecule = new MoorhenMolecule(commandCentre, glRef, mockMonomerLibraryPath)
        await molecule.loadToCootFromURL(fileUrl, 'mol-test-1')
        expect(molecule.hasGlycans).toBeFalsy()
        await molecule.addLigandOfType('NAG')
        expect(molecule.hasGlycans).toBeTruthy()
    })
})

const testDataFiles = ['5fjj.pdb', '5a3h.pdb', '5a3h_no_ligand.pdb', 'LZA.cif', 'nitrobenzene.cif', 'benzene.cif', '5a3h_sigmaa.mtz', 'rnasa-1.8-all_refmac1.mtz', 'tm-A.pdb']

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
