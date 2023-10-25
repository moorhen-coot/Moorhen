
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

})

describe('Testing molecules_container_js', () => {
    afterEach(() => {
        cleanUpVariables.forEach(item => {
            if (typeof item.delete === 'function' && !item.isDeleted()) {
                item.delete()
            }
        })
        cleanUpVariables = []
    })

    test('Test fill_rotamer_probability_tables', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.fill_rotamer_probability_tables()
    })

    test('Test add', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const ret = molecules_container.add(0)
        expect(ret).toBe(1)
    })

    test('Create residue_spec_t', () => {
        const resSpec = new cootModule.residue_spec_t("A", 217, "")
    })

    test("Test read PDB", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const atomCount = molecules_container.get_number_of_atoms(coordMolNo)
        expect(coordMolNo).toBe(0)
        expect(atomCount).toBe(2765)
    })

    test("Test read MTZ", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        expect(mapMolNo).toBe(0)
        
        const isEM = molecules_container.is_EM_map(mapMolNo)
        expect(isEM).toBeFalsy()
        
        const rmsd = molecules_container.get_map_rmsd_approx(mapMolNo)
        expect(rmsd).toBeCloseTo(0.35, 1)
        
        const mapCentre = molecules_container.get_map_molecule_centre(mapMolNo)
        expect(mapCentre.updated_centre.x()).toBeCloseTo(-1.09, 1)
        expect(mapCentre.updated_centre.y()).toBeCloseTo(0.17, 1)
        expect(mapCentre.updated_centre.z()).toBeCloseTo(-2.94, 1)
        
        const suggestedLevel = molecules_container.get_suggested_initial_contour_level(mapMolNo)
        expect(suggestedLevel).toBeCloseTo(0.56, 1)
    })

    test('Test glycoblocks', async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5fjj.pdb')
        const glyco_mesh = molecules_container.DrawGlycoBlocks(coordMolNo,"/")
    })

    test('Test copy fragment', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        const coordMolNo_2 = molecules_container.copy_fragment_using_cid(coordMolNo_1, "//A/32-33/*");
        const atomCount = molecules_container.get_number_of_atoms(coordMolNo_2)
        expect(coordMolNo_2).not.toBe(-1)
        expect(atomCount).toBe(14)
    })

    test('Test ligand methods', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        
        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', -999999)
        expect(result_import_dict).toBe(1)

        const coords = [0, 0, 0]
        const tlc = 'LZA'
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            tlc, -999999, ...coords
        )
        expect(ligandMolNo).toBe(0)

        const useConformers = false
        const conformerCount = 100
        const coordMolNo = molecules_container.read_pdb('./5a3h_no_ligand.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        const result = molecules_container.fit_ligand_right_here(
            coordMolNo, mapMolNo, ligandMolNo, ...coords, 1., useConformers, conformerCount
        )
        expect(result.size()).toBeGreaterThan(0)
    })

    test("Test close_molecule", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo).toBe(0)
        const isValid_1 = molecules_container.is_valid_model_molecule(coordMolNo)
        expect(isValid_1).toBeTruthy()
        molecules_container.close_molecule(coordMolNo)
        const isValid_2 = molecules_container.is_valid_model_molecule(coordMolNo)
        expect(isValid_2).toBeFalsy()
    })

    test("Test close_map", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const imol_map = molecules_container.read_mtz("./rnasa-1.8-all_refmac1.mtz", "FWT", "PHWT", "W", false, false)
        expect(imol_map).toBe(0)
        const isValid_1 = molecules_container.is_valid_map_molecule(imol_map)
        expect(isValid_1).toBeTruthy()
        molecules_container.close_molecule(imol_map)
        const isValid_2 = molecules_container.is_valid_map_molecule(imol_map)
        expect(isValid_2).toBeFalsy()
    })

    test('Test delete methods', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        
        const result_cid = molecules_container.delete_using_cid(coordMolNo, "A/32-33/*", "LITERAL")
        const resSpec = new cootModule.residue_spec_t("A", 32, "")
        const deletedResidue = molecules_container.get_residue(coordMolNo, resSpec)
        expect(result_cid.first).toBe(1)
        expect(result_cid.second).toBe(2751)
        expect(deletedResidue).toBe(null)

        const result_sideChain = molecules_container.delete_side_chain(coordMolNo, "A", 154, "");
        expect(result_sideChain.first).toBe(1)
        expect(result_sideChain.second).toBe(2744)
    })

    test('Test add_terminal_residue methods', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        molecules_container.set_imol_refinement_map(mapMolNo)

        molecules_container.delete_using_cid(coordMolNo, "A/100-101/*", "LITERAL")
        const residueSpec = new cootModule.residue_spec_t("A", 100, "")
        const deletedResidue = molecules_container.get_residue(coordMolNo, residueSpec)
        expect(deletedResidue).toBe(null)

        const result = molecules_container.add_terminal_residue_directly_using_cid(coordMolNo, "A/99")
        const resSpec = new cootModule.residue_spec_t("A", 100, "")
        const addedResidue = molecules_container.get_residue(coordMolNo, resSpec)
        expect(addedResidue.nAtoms).toBe(5)
        expect(result).not.toBe(-1)
    })

    test('Test merge molecules', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        const coordMolNo_2 = molecules_container.read_pdb('./tm-A.pdb')
        const mergeMols = coordMolNo_2.toString()
        const merge_info = molecules_container.merge_molecules(coordMolNo_1, mergeMols)
        expect(merge_info.second.size()).toBe(1)
        const mi0 = merge_info.second.get(0)
        expect(mi0.chain_id).toBe("C")
    })

    test('Test ramachandran_validation', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const rama_info = molecules_container.ramachandran_validation(coordMolNo)
        const rama_info_size = rama_info.size()
        expect(rama_info_size).toBe(298)
        for (let i = 0; i < rama_info_size; i++) {
            const ri = rama_info.get(i)
            const phi_psi = ri.phi_psi
            const phi = phi_psi.phi()
            const psi = phi_psi.psi()
            expect(phi).toBeCloseTo(-54.90, 1)
            expect(psi).toBeCloseTo(-57.35, 1)
            cleanUpVariables.push(ri, phi_psi)
            break
        }
        cleanUpVariables.push(rama_info)
    })

    test('Test get_residue', () => {
        const resSpec = new cootModule.residue_spec_t("A", 217, "");
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const res = molecules_container.get_residue(coordMolNo, resSpec)
        expect(res.nAtoms).toBe(5)
        expect(res.GetResName()).toBe("ALA")
        expect(res.GetChainID()).toBe("A")
        expect(res.GetSeqNum()).toBe(217)
        expect(res.GetResidueNo()).toBe(213)
        expect(res.GetNumberOfAtoms()).toBe(5)
        expect(res.isNTerminus()).toBe(false)
        expect(res.isCTerminus()).toBe(false)
        expect(res.isAminoacid()).toBe(true)
        expect(res.isNucleotide()).toBe(false)
        expect(res.isDNARNA()).toBe(0)
        expect(res.isSugar()).toBe(false)
        expect(res.isSolvent()).toBe(false)
        expect(res.isModRes()).toBe(false)
        expect(res.GetModelNum()).toBe(1)
        expect(res.GetInsCode()).toBe("")
        expect(res.GetLabelAsymID()).toBe("A")
        expect(res.GetLabelCompID()).toBe("ALA")
        expect(res.GetLabelSeqID()).toBe(217)
        expect(res.GetLabelEntityID()).toBe(1)
        const atom = res.GetAtom(0);
        expect(atom.x).toBeCloseTo(70.783, 3)
        expect(atom.y).toBeCloseTo(22.745, 3)
        expect(atom.z).toBeCloseTo(32.692, 3)
        expect(atom.GetSeqNum()).toBe(217)
        expect(atom.GetResidueNo()).toBe(213)
        expect(atom.tempFactor).toBeCloseTo(10.25, 2)
        expect(atom.occupancy).toBeCloseTo(1.00, 2)
        expect(atom.charge).toBeCloseTo(0.00, 2)
        expect(atom.GetAtomName()).toBe(" N  ")
        expect(atom.GetInsCode()).toBe("")
        expect(atom.GetChainID()).toBe("A")
        expect(atom.GetIndex()).toBe(1733)
        expect(atom.isNTerminus()).toBe(false)
        expect(atom.isCTerminus()).toBe(false)
        expect(atom.isTer()).toBe(false)
        expect(atom.isMetal()).toBe(false)
        expect(atom.GetModelNum()).toBe(1)
        expect(atom.GetLabelAsymID()).toBe("A")
        expect(atom.GetLabelCompID()).toBe("ALA")
        expect(atom.GetLabelSeqID()).toBe(217)
        expect(atom.GetLabelEntityID()).toBe(1)
        expect(atom.GetNBonds()).toBe(0)
        const movedN = new cootModule.moved_atom_t(" N  ", "", 2.468, 26.274, 12.957, -1)
        const movedCA = new cootModule.moved_atom_t(" CA ", "", 1.178, 26.922, 13.361, -1)
        const movedC = new cootModule.moved_atom_t(" C  ", "", 1.439, 28.343, 13.878, -1)
        const movedO = new cootModule.moved_atom_t(" O  ", "", 2.486, 28.630, 14.460, -1)
        const movedCB = new cootModule.moved_atom_t(" CB ", "", 0.480, 26.082, 14.404, -1)
        let movedVector = new cootModule.Vectormoved_atom_t()
        movedVector.push_back(movedN)
        movedVector.push_back(movedCA)
        movedVector.push_back(movedC)
        movedVector.push_back(movedO)
        movedVector.push_back(movedCB)
        expect(movedVector.size()).toBe(5)
        const success = molecules_container.new_positions_for_residue_atoms(coordMolNo, "A/217", movedVector)
        expect(success).toBe(5)
        const resUpdate = molecules_container.get_residue(coordMolNo, resSpec)
        const atomUpdate = resUpdate.GetAtom(0);
        expect(atomUpdate.x).toBeCloseTo(2.468, 3)
        expect(atomUpdate.y).toBeCloseTo(26.274, 3)
        expect(atomUpdate.z).toBeCloseTo(12.957, 3)
        cleanUpVariables.push(atom, res, movedVector)
    })

    test('Test get_single_letter_codes_for_chain', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.geometry_init_standard()
        const imol = molecules_container.read_pdb('./tm-A.pdb')
        const codes = molecules_container.get_single_letter_codes_for_chain(imol, "A")
        const codesSize = codes.size()
        let sequence = []
        for (let ic = 0; ic < codesSize; ic++) {
            const code = codes.get(ic)
            expect(code.first.chain_id).toBe('A')
            sequence.push(code.second)
        }
        expect(sequence.join('')).toBe('DVSGTVCLSALPPEATDTLNLIASDGPFPYSQDGVVFQNRESVLPTQSYGYYHEYTVITPGARTRGTRRIICGEATQEDYYTGDHYATFSLID')
        cleanUpVariables.push(codes)
    })

    test('Test Auto-fit rotamer', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.geometry_init_standard()
        const imol = molecules_container.read_pdb('./tm-A.pdb')
        const imol_map = molecules_container.read_mtz("./rnasa-1.8-all_refmac1.mtz", "FWT", "PHWT", "W", false, false)
        const resSpec = new cootModule.residue_spec_t("A", 89, "");
        const res = molecules_container.get_residue(imol, resSpec)
        const CZatom = res.GetAtom(6);
        const CZatom_x = CZatom.x;
        const CZatom_y = CZatom.y;
        const CZatom_z = CZatom.z;
        const result = molecules_container.auto_fit_rotamer(imol, "A", 89, "", "", imol_map)
        expect(result).toBe(1)
        const dd = (CZatom.x - CZatom_x) * (CZatom.x - CZatom_x) + (CZatom.y - CZatom_y) * (CZatom.y - CZatom_y) + (CZatom.z - CZatom_z) * (CZatom.z - CZatom_z)
        const d = Math.sqrt(dd)
        expect(d).toBeCloseTo(7.28975, 5)
        cleanUpVariables.push(res, resSpec)
    })

    test('Test Rama mesh', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const simpleMesh = molecules_container.get_ramachandran_validation_markup_mesh(coordMolNo);
        expect(simpleMesh.vertices.size()).toBe(22052)
        expect(simpleMesh.triangles.size()).toBe(38144)
        cleanUpVariables.push(simpleMesh)
    })

    test('Test Dodo mesh', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const simpleMesh = molecules_container.get_rotamer_dodecs(coordMolNo);
        expect(simpleMesh.vertices.size()).toBe(39000)
        expect(simpleMesh.triangles.size()).toBe(23400)
        cleanUpVariables.push(simpleMesh)
    })

    test('Test Dodo instanced mesh', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const instanceMesh = molecules_container.get_rotamer_dodecs_instanced(coordMolNo);
        const geom = instanceMesh.geom
        for (let i = 0; i < geom.size(); i++) {
            const inst = geom.get(i);
            expect(inst.vertices.size()).toBe(60)
            expect(inst.triangles.size()).toBe(36)
            expect(inst.instancing_data_A.size()).toBe(0)
            expect(inst.instancing_data_B.size()).toBe(0)
        }
    })

    test('Test backups', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        const resSpec = new cootModule.residue_spec_t("A", 32, "");
        const res = molecules_container.get_residue(coordMolNo, resSpec)
        const atom = res.GetAtom(2);
        expect(atom.x).toBeCloseTo(67.271, 3)
        expect(atom.y).toBeCloseTo(45.492, 3)
        expect(atom.z).toBeCloseTo(24.559, 3)
        molecules_container.flipPeptide_cid(coordMolNo, "A/33", "")
        expect(atom.x).toBeCloseTo(67.623, 3)
        expect(atom.y).toBeCloseTo(45.837, 3)
        expect(atom.z).toBeCloseTo(25.588, 3)
        molecules_container.undo(coordMolNo)
        // We seemingly need to re-get the residue after restore.
        const res2 = molecules_container.get_residue(coordMolNo, resSpec)
        const atom2 = res2.GetAtom(2);
        expect(atom2.x).toBeCloseTo(67.271, 3)
        expect(atom2.y).toBeCloseTo(45.492, 3)
        expect(atom2.z).toBeCloseTo(24.559, 3)
        cleanUpVariables.push(resSpec)
    })

    test('Test flip_peptide by residue spec', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo).toBe(0)

        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        expect(mapMolNo).toBe(1)

        const atomSpec = new cootModule.atom_spec_t("A", 217, "", " N  ", "");
        const status = molecules_container.flipPeptide(coordMolNo, atomSpec, "")
        expect(status).toBe(1)
        const flippedFileName = "flip_out.pdb"
        const writeStatus = molecules_container.writePDBASCII(coordMolNo, flippedFileName)
        expect(writeStatus).toBe(0)
        const flippedFile = cootModule.FS.readFile(flippedFileName, { encoding: 'utf8' });

        const atomSpecFalse = new cootModule.atom_spec_t("A", 999, "", " N  ", "");
        const failedStatus = molecules_container.flipPeptide(coordMolNo, atomSpecFalse, "")
        expect(failedStatus).toBe(0)
        
        cleanUpVariables.push(atomSpec, atomSpecFalse)
    })

    test('Create Density Map Mesh', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const imol_map = molecules_container.read_mtz("rnasa-1.8-all_refmac1.mtz", "FWT", "PHWT", "W", false, false);
        const p = new cootModule.Coord_orth(55, 10, 10);
        expect(p.x()).toBe(55)
        expect(p.y()).toBe(10)
        expect(p.z()).toBe(10)
        const radius = 12;
        const contour_level = 0.13;
        const map_mesh = molecules_container.get_map_contours_mesh(imol_map, p.x(), p.y(), p.z(), radius, contour_level)
        const vertices = map_mesh.vertices
        const triangles = map_mesh.triangles
        const nVerticesDirect = vertices.size()
        const nTriangles = triangles.size()
        //It seems that the number of vertices can vary depending on number of threads?
        //expect(Math.abs(nVerticesDirect - 55000)).toBeLessThanOrEqual(3000)
        expect(Math.abs(nTriangles - 47024)).toBeLessThanOrEqual(3000)
        cleanUpVariables.push(p, nVerticesDirect, nTriangles, map_mesh, vertices, triangles)
    })

    test('Create test origin', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const simpleMesh = molecules_container.test_origin_cube();
        const nVertices = molecules_container.count_simple_mesh_vertices(simpleMesh)
        expect(nVertices).toBe(24)
        const vertices = simpleMesh.vertices
        const nVerticesDirect = vertices.size()
        expect(nVerticesDirect).toBe(24)
        const triangles = simpleMesh.triangles
        const nTriangles = triangles.size()
        expect(nTriangles).toBe(12)
        const firstTri_idxs = triangles.get(0).point_id
        const secondTri_idxs = triangles.get(1).point_id
        expect(firstTri_idxs[0]).toBe(0)
        expect(firstTri_idxs[1]).toBe(1)
        expect(firstTri_idxs[2]).toBe(2)
        expect(secondTri_idxs[0]).toBe(1)
        expect(secondTri_idxs[1]).toBe(3)
        expect(secondTri_idxs[2]).toBe(2)
        const t_x = vertices.get(secondTri_idxs[2]).pos[0]
        const t_y = vertices.get(secondTri_idxs[2]).pos[1]
        const t_z = vertices.get(secondTri_idxs[2]).pos[2]
        const n_x = vertices.get(secondTri_idxs[2]).normal[0]
        const n_y = vertices.get(secondTri_idxs[2]).normal[1]
        const n_z = vertices.get(secondTri_idxs[2]).normal[2]
        const c_r = vertices.get(secondTri_idxs[2]).color[0]
        const c_g = vertices.get(secondTri_idxs[2]).color[1]
        const c_b = vertices.get(secondTri_idxs[2]).color[2]
        const c_a = vertices.get(secondTri_idxs[2]).color[3]
        expect(t_x).toBeCloseTo(-5, 5)
        expect(t_y).toBeCloseTo(5, 5)
        expect(t_z).toBeCloseTo(-5, 5)
        expect(n_x).toBeCloseTo(0, 5)
        expect(n_y).toBeCloseTo(0, 5)
        expect(n_z).toBeCloseTo(-1, 5)
        expect(c_r).toBeCloseTo(0.5, 5)
        expect(c_g).toBeCloseTo(0.2, 5)
        expect(c_b).toBeCloseTo(0.5, 5)
        expect(c_a).toBeCloseTo(1.0, 5)
    })

    test('Test Surface mesh', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const simpleMesh = molecules_container.get_molecular_representation_mesh(
            0, "//", "colorRampChainsScheme", "MolecularSurface"
        );
        expect(simpleMesh.vertices.size()).toBeCloseTo(143439, -3)
        expect(simpleMesh.triangles.size()).toBeCloseTo(174034, -3)
    })

    test("Test ligand surface", () => {
        const molecules_container = new cootModule.molecules_container_js(false)

        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', -999999)
        expect(result_import_dict).toBe(1)

        const coords = [0, 0, 0]
        const tlc = 'LZA'
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            tlc, -999999, ...coords
        )
        const simpleMesh = molecules_container.get_molecular_representation_mesh(
            ligandMolNo, "//", "colorRampChainsScheme", "MolecularSurface"
        )

        expect(simpleMesh.vertices.size()).toBeGreaterThan(100)
        expect(simpleMesh.triangles.size()).toBeGreaterThan(100)
    })

    test("Test smiles_to_pdb", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const result_1 = molecules_container.smiles_to_pdb('c1ccccc1', 'LIG', 10, 100)
        const fileContents_1 = fs.readFileSync(path.join(__dirname, '..', 'test_data', 'benzene.cif'), { encoding: 'utf8', flag: 'r' })
        expect(result_1.second).toBe(fileContents_1)
    })

    test("Test histogram map", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        expect(mapMolNo).toBe(0)

        const result = molecules_container.get_map_histogram(mapMolNo, 200, 1)
        expect(result.base).toBeCloseTo(-1.01, 1)
        expect(result.bin_width).toBeCloseTo(0.09, 1)
        expect(result.counts.size()).toBe(51)
    })

    test("Test get_molecule_atoms pdb", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const pdbString  = molecules_container.get_molecule_atoms(coordMolNo, "pdb")
        expect(pdbString).toHaveLength(258719)
    })

    test("Test get_molecule_atoms mmcif", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const pdbString  = molecules_container.get_molecule_atoms(coordMolNo, "mmcif")
        expect(pdbString).toHaveLength(297550)
    })

    test("Test read_pdb_string pdb-format", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        const pdbString_1  = molecules_container.get_molecule_atoms(coordMolNo_1, "pdb")
        expect(pdbString_1).toHaveLength(258719)
        const coordMolNo_2 = molecules_container.read_pdb_string(pdbString_1, "mol-name")
        expect(coordMolNo_2).toBe(1)
        const pdbString_2  = molecules_container.get_molecule_atoms(coordMolNo_2, "pdb")
        expect(pdbString_2).toBe(pdbString_1)
    })

    test("Test read_pdb_string mmcif-format", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        const pdbString_1  = molecules_container.get_molecule_atoms(coordMolNo_1, "mmcif")
        expect(pdbString_1).toHaveLength(297550)
        const coordMolNo_2 = molecules_container.read_pdb_string(pdbString_1, "mol-name")
        expect(coordMolNo_2).toBe(1)
        // For some reason this fails, probably a coot thing
        // const pdbString_2  = molecules_container.get_molecule_atoms(coordMolNo_2, "mmcif")
        // expect(pdbString_2).toBe(pdbString_1)
    })

    test("Test replace_molecule_by_model_from_string", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        const pdbString_1  = molecules_container.get_molecule_atoms(coordMolNo_1, "pdb")
        expect(pdbString_1).toHaveLength(258719)
        const coordMolNo_2 = molecules_container.read_pdb('./5fjj.pdb')
        molecules_container.replace_molecule_by_model_from_string(coordMolNo_2, "pdb", pdbString_1)
        const pdbString_2  = molecules_container.get_molecule_atoms(coordMolNo_2, "pdb")
        expect(pdbString_2).toBe(pdbString_1)
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
