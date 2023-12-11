
jest.setTimeout(40000)

const fs = require('fs')
const path = require('path')
const createCootModule = require('../../public/baby-gru/wasm/moorhen')

let cootModule;
let cleanUpVariables = []

beforeAll(() => {   
    return createCootModule({
        print(t) { () => console.log(["output", t]) },
        printErr(t) { () => console.log(["output", t]); }
    }).then(moduleCreated => {
        cootModule = moduleCreated
        setupFunctions.copyTestDataToFauxFS()
        return Promise.resolve()
    })
})

afterAll(() => {
    setupFunctions.removeTestDataFromFauxFS()
})

describe("Testing gemmi", () => {

    afterEach(() => {
        cleanUpVariables.forEach(item => {
            if (typeof item.delete === 'function' && !item.isDeleted()) {
                item.delete()
            }
        })
        cleanUpVariables = []
    })

    test("Test read structure file", () => {
        const st = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        const models = st.models
        expect(st.has_origx).toBeTruthy()
        expect(st.spacegroup_hm).toBe('P 21 21 21')
        expect(models.size()).toBe(1)

        const model = st.first_model()
        const modelMass = cootModule.calculate_mass_model(model)
        expect(modelMass).toBeCloseTo(37224.72, 1)
        
        const chains = model.chains
        expect(chains.size()).toBe(3)

        const chain = chains.get(0)
        expect(cootModule.calculate_mass_chain(chain)).toBeCloseTo(31365.81, 1)
        expect(chain.name).toBe('A')

        const residues = chain.residues
        expect(residues.size()).toBe(300)

        const residue = residues.get(0)
        expect(residue.name).toBe('SER')

        const atoms = residue.atoms
        expect(atoms.size()).toBe(6)

        const atom = atoms.get(0)
        expect(atom.name).toBe('N')
        expect(cootModule.getElementNameAsString(atom.element)).toBe('N')
        cleanUpVariables.push(st, model, models, chain, chains, residue, residues, atom, atoms)
    })

    test("Test ligands", () => {
        const st = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        cootModule.gemmi_setup_entities(st)
        const model = st.first_model()
        const chains = model.chains
        
        const chain = chains.get(1)
        expect(chain.name).toBe('B')
        
        const ligands = chain.get_ligands_const()
        expect(ligands.size()).toBe(2)

        const ligand = ligands.at(0)
        expect(ligand.name).toBe('G2F')

        cleanUpVariables.push(st, model, chain, chains, ligand, ligands)
    })

    test("Test waters", () => {
        const st = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        cootModule.gemmi_setup_entities(st)
        const model = st.first_model()
        const chains = model.chains
        
        const chain = chains.get(2)
        expect(chain.name).toBe('A')
        
        const waters = chain.get_waters_const()
        expect(waters.size()).toBe(348)

        const water = waters.at(0)
        expect(water.name).toBe('HOH')
        const waterSeqId = water.seqid
        expect(waterSeqId.str()).toBe('901')
        
        cleanUpVariables.push(st, model, chain, chains, water, waters, waterSeqId)

    })

    test("Test remove waters and ligands", () => {
        const st = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        cootModule.gemmi_setup_entities(st)
        cootModule.remove_ligands_and_waters_structure(st)
        st.remove_empty_chains()
        const model = st.first_model()
        const chains = model.chains
        expect(chains.size()).toBe(1)
        cleanUpVariables.push(st, model, chains)
    })

    test("Test spacegroups", () => {
        const sgp1 = cootModule.get_spacegroup_by_name('P1')
        expect(cootModule.getSpaceGroupHMAsString(sgp1)).toBe('P 1')
        expect(sgp1.hm()).toBe('P 1')
        expect(cootModule.getSpaceGroupHallAsString(sgp1)).toBe('P 1')
        expect(cootModule.getSpaceGroupHallAsString(sgp1)).toBe('P 1')
        cleanUpVariables.push(sgp1)
    })

    test("Test count_residues_in_selection", () => {
        const selection = new cootModule.Selection('//A/31-33/*')
        const st = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        const residue_count = cootModule.count_residues_in_selection(st, selection)
        expect(residue_count).toBe(3)
        cleanUpVariables.push(st)
    })

    test("Test remove_non_selected_residues", () => {
        const selection = new cootModule.Selection('//A/31-33/*')
        const st_1 = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        cootModule.gemmi_setup_entities(st_1)
        const st_2 = cootModule.remove_non_selected_residues(st_1, selection)

        const model_1 = st_1.first_model()
        const chains_1 = model_1.chains
        // Expect the original structure to be unchanged
        expect(chains_1.size()).toBe(3)

        const model_2 = st_2.first_model()
        const chains_2 = model_2.chains
        const chain_2 = chains_2.get(0)
        const residues_2 = chain_2.residues
        const residue_2 = residues_2.get(0)
        const residue_2_seqId = residue_2.seqid
        expect(chains_2.size()).toBe(1)
        expect(chain_2.name).toBe('A')
        expect(residues_2.size()).toBe(3)
        expect(residue_2_seqId.str()).toBe('31')

        cleanUpVariables.push(st_1, st_2, model_1, chains_1, model_2, chains_2, chain_2, residues_2, residue_2_seqId, residue_2)
    })

    test("Test structure_is_ligand", () => {
        const st_1 = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        cootModule.gemmi_setup_entities(st_1)
        
        const is_ligand_1 = cootModule.structure_is_ligand(st_1)
        expect(is_ligand_1).toBeFalsy()

        const selection = new cootModule.Selection('//B')
        const st_2 = cootModule.remove_non_selected_residues(st_1, selection)
        const is_ligand_2 = cootModule.structure_is_ligand(st_2)
        expect(is_ligand_2).toBeTruthy()
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
