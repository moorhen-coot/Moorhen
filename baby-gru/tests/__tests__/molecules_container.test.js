
jest.setTimeout(40000)

const fs = require('fs')
const path = require('path')
const createCootModule = require('../../public/moorhen')

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

let molecules_container = null

describe('Testing molecules_container_js', () => {

    beforeEach(() => {
        if (molecules_container !== null) {
            molecules_container.delete?.()
        }
        molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.set_use_gemmi(false)
    })

    afterEach(() => {
        cleanUpVariables.forEach(item => {
            if (typeof item.delete === 'function' && !item.isDeleted()) {
                item.delete()
            }
        })
        cleanUpVariables = []
    })

    test('Test fill_rotamer_probability_tables', () => {
        molecules_container.fill_rotamer_probability_tables()
    })

    test('Test add', () => {
        const ret = molecules_container.add(0)
        expect(ret).toBe(1)
    })

    test("Test metaballs", () => {
        const coordMol = molecules_container.read_pdb('./5a3h.pdb')
        const gridSize = 0.15
        const radius = 0.65
        const isoLevel = 1.8
        const mesh = molecules_container.DrawMoorhenMetaBalls(coordMol, "B/1-2", gridSize, radius, isoLevel)
        expect(mesh.vertices.size()).toBeGreaterThan(1000)
        expect(mesh.triangles.size()).toBeGreaterThan(1000)
    })

    test("Test read PDB", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const atomCount = molecules_container.get_number_of_atoms(coordMolNo)
        expect(coordMolNo).toBe(0)
        expect(atomCount).toBe(2765)
    })

    test("Test read MTZ", () => {
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
        const coordMolNo = molecules_container.read_pdb('./5fjj.pdb')
        const glycoMeshData = molecules_container.DrawGlycoBlocks(coordMolNo, "//")
        const geom = glycoMeshData.geom
        const meshData = geom.get(0)
        const triangles = meshData.triangles
        
        expect(triangles.size()).toBeGreaterThan(10)
        cleanUpVariables.push(triangles, meshData, geom)
    })

    test('Test copy fragment', () => {
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        const coordMolNo_2 = molecules_container.copy_fragment_using_cid(coordMolNo_1, "//A/32-33/*");
        const atomCount = molecules_container.get_number_of_atoms(coordMolNo_2)
        expect(coordMolNo_2).not.toBe(-1)
        expect(atomCount).toBe(14)
    })

    test("Test get_svg_for_residue_type", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        
        const svg_1 = molecules_container.get_svg_for_residue_type(coordMolNo, "LZA", false, false)
        expect(svg_1).toBe("No dictionary for LZA")

        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', coordMolNo)
        expect(result_import_dict).toBe(1)
        
        const svg_2 = molecules_container.get_svg_for_residue_type(coordMolNo, "LZA", false, false)
        expect(svg_2).not.toBe("No dictionary for LZA")
    })

    test("Test get_svg_for_residue_type -- any molecule", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.mmcif')
        
        const svg_1 = molecules_container.get_svg_for_residue_type(coordMolNo, "LZA", false, false)
        expect(svg_1).toBe("No dictionary for LZA")

        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', -999999)
        expect(result_import_dict).toBe(1)
        
        const svg_2 = molecules_container.get_svg_for_residue_type(coordMolNo, "LZA", false, false)
        expect(svg_2).not.toBe("No dictionary for LZA")
    })

    test('Test fit_ligand_right_here 1', () => {
        
        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', -999999)
        expect(result_import_dict).toBe(1)

        const coords = [0, 0, 0]
        const tlc = 'LZA'
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            tlc, -999999, ...coords
        )
        expect(ligandMolNo).toBe(0)

        const useConformers = false
        const conformerCount = 10
        const coordMolNo = molecules_container.read_pdb('./5a3h_no_ligand.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        const result = molecules_container.fit_ligand_right_here(
            coordMolNo, mapMolNo, ligandMolNo, ...coords, 1., useConformers, conformerCount
        )
        expect(result.size()).toBeGreaterThan(0)
    })

    test('Test fit_ligand_right_here 2', () => {
        
        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', -999999)
        expect(result_import_dict).toBe(1)

        const coords = [0, 0, 0]
        const tlc = 'LZA'
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            tlc, -999999, ...coords
        )
        expect(ligandMolNo).toBe(0)

        const useConformers = true
        const conformerCount = 50
        const coordMolNo = molecules_container.read_pdb('./5a3h_no_ligand.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        const result = molecules_container.fit_ligand_right_here(
            coordMolNo, mapMolNo, ligandMolNo, ...coords, 1., useConformers, conformerCount
        )
        expect(result.size()).toBeGreaterThan(0)
    })

    test("Test close_molecule", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo).toBe(0)
        const isValid_1 = molecules_container.is_valid_model_molecule(coordMolNo)
        expect(isValid_1).toBeTruthy()
        molecules_container.close_molecule(coordMolNo)
        const isValid_2 = molecules_container.is_valid_model_molecule(coordMolNo)
        expect(isValid_2).toBeFalsy()
    })

    test("Test close_map", () => {
        const imol_map = molecules_container.read_mtz("./rnasa-1.8-all_refmac1.mtz", "FWT", "PHWT", "W", false, false)
        expect(imol_map).toBe(0)
        const isValid_1 = molecules_container.is_valid_map_molecule(imol_map)
        expect(isValid_1).toBeTruthy()
        molecules_container.close_molecule(imol_map)
        const isValid_2 = molecules_container.is_valid_map_molecule(imol_map)
        expect(isValid_2).toBeFalsy()
    })

    test("Test pop_back", () => {
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo_1).toBe(0)
        const isValid_1 = molecules_container.is_valid_model_molecule(coordMolNo_1)
        expect(isValid_1).toBeTruthy()
        molecules_container.pop_back()
        const isValid_2 = molecules_container.is_valid_model_molecule(coordMolNo_1)
        expect(isValid_2).toBeFalsy()
        const coordMolNo_2 = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo_2).toBe(coordMolNo_1)
    })

    test('Test delete methods', () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        
        const result_cid = molecules_container.delete_using_cid(coordMolNo, "A/32-33/*", "LITERAL")
        expect(result_cid.first).toBe(1)
        expect(result_cid.second).toBe(2751)

        const result_sideChain = molecules_container.delete_side_chain(coordMolNo, "A", 154, "");
        expect(result_sideChain.first).toBe(1)
        expect(result_sideChain.second).toBe(2744)
    })

    test('Test add_terminal_residue methods', () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        molecules_container.set_imol_refinement_map(mapMolNo)

        const atom_count_1 = molecules_container.get_number_of_atoms(coordMolNo)
        molecules_container.delete_using_cid(coordMolNo, "A/100-101/*", "LITERAL")
        const atom_count_2 = molecules_container.get_number_of_atoms(coordMolNo)
        expect(atom_count_2).toBe(atom_count_1 - 24)

        const result = molecules_container.add_terminal_residue_directly_using_cid(coordMolNo, "A/99")
        expect(result).not.toBe(-1)
        const atom_count_3 = molecules_container.get_number_of_atoms(coordMolNo)
        expect(atom_count_3).toBe(atom_count_2 + 5)
    })

    test('Test merge molecules', () => {
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        const coordMolNo_2 = molecules_container.read_pdb('./tm-A.pdb')
        const mergeMols = coordMolNo_2.toString()
        const merge_info = molecules_container.merge_molecules(coordMolNo_1, mergeMols)
        expect(merge_info.second.size()).toBe(1)
        const mi0 = merge_info.second.get(0)
        expect(mi0.chain_id).toBe("C")
    })

    test("Test water validation", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        expect(coordMolNo).toBe(0)
        expect(mapMolNo).toBe(1)

        const bad_water_info = molecules_container.find_water_baddies(
            coordMolNo, mapMolNo, 60.0, 0.8, 2.3, 3.5, false, false
        )

        const bad_water_info_size = bad_water_info.size()
        expect(bad_water_info_size).toBeGreaterThan(0)
  
        cleanUpVariables.push(bad_water_info)
    })

    test('Test ramachandran_validation', () => {
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

    test.skip('Test get_residue', () => {
        const resSpec = new cootModule.residue_spec_t("A", 217, "");
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

    test.skip('Test auto_fit_rotamer', () => {
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

    test.skip("Test change rotamer", () => {
        molecules_container.geometry_init_standard()
        const imol_molecule = molecules_container.read_pdb('./5a3h.pdb')
        
        // Create a fragment and change rotamer
        const imol_fragment = molecules_container.copy_fragment_using_cid(imol_molecule, '//A/179')
        molecules_container.change_to_next_rotamer(imol_fragment, '//A/179', '')
        
        // Get the OG atom for that new rotamer (still in the fragment)
        const resSpec = new cootModule.residue_spec_t("A", 179, "");
        const res_fragment = molecules_container.get_residue(imol_fragment, resSpec)
        const atom_fragment = res_fragment.GetAtom(5)

        // Replace fragment back into the molecule and get new OG atom
        molecules_container.replace_fragment(imol_molecule, imol_fragment, '//A/179')
        const res_new = molecules_container.get_residue(imol_molecule, resSpec)
        const atom_new = res_new.GetAtom(5)

        // This fails...
        expect(atom_new.x).toBe(atom_fragment.x)
        expect(atom_new.y).toBe(atom_fragment.y)
        expect(atom_new.z).toBe(atom_fragment.z)
    })

    test('Test Rama mesh', () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const simpleMesh = molecules_container.get_ramachandran_validation_markup_mesh(coordMolNo);
        expect(simpleMesh.vertices.size()).toBe(22052)
        expect(simpleMesh.triangles.size()).toBe(38144)
        cleanUpVariables.push(simpleMesh)
    })

    test('Test Dodo mesh', () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const simpleMesh = molecules_container.get_rotamer_dodecs(coordMolNo);
        expect(simpleMesh.vertices.size()).toBe(39000)
        expect(simpleMesh.triangles.size()).toBe(23400)
        cleanUpVariables.push(simpleMesh)
    })

    test('Test Dodo instanced mesh', () => {
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

    test.skip('Test backups', () => {
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

    test.skip('Test flip_peptide by residue spec', () => {
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
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const simpleMesh = molecules_container.get_molecular_representation_mesh(
            0, "//", "colorRampChainsScheme", "MolecularSurface"
        );
        expect(simpleMesh.vertices.size()).toBeCloseTo(143439, -3)
        expect(simpleMesh.triangles.size()).toBeCloseTo(174034, -3)
    })

    test("Test ligand surface", () => {

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

    test.skip("Test import ligands with same name and animated refinement", () => {
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        const coordMolNo_2 = molecules_container.read_pdb('./5fjj.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)

        molecules_container.import_cif_dictionary('./benzene.cif', coordMolNo_1)
        molecules_container.import_cif_dictionary('./nitrobenzene.cif', coordMolNo_2)

        const coords = [0, 0, 0]
        const tlc = 'LIG'
        
        const ligandMolNo_1 = molecules_container.get_monomer_and_position_at(tlc, coordMolNo_1, ...coords)
        const merge_info_1 = molecules_container.merge_molecules(coordMolNo_1, ligandMolNo_1.toString())
        expect(merge_info_1.second.size()).toBe(1)

        const ligandMolNo_2 = molecules_container.get_monomer_and_position_at(tlc, coordMolNo_2, ...coords)
        const merge_info_2 = molecules_container.merge_molecules(coordMolNo_2, ligandMolNo_2.toString())
        expect(merge_info_2.second.size()).toBe(1)

        const copyMolNo_1 = molecules_container.copy_fragment_for_refinement_using_cid(coordMolNo_1, '/1/C/1/*')
        molecules_container.init_refinement_of_molecule_as_fragment_based_on_reference(copyMolNo_1, coordMolNo_1, mapMolNo)
        molecules_container.copy_dictionary('LIG', coordMolNo_1, copyMolNo_1)
        let result_1 = []
        const refine_result_1 = molecules_container.refine(copyMolNo_1, 5000)
        const instanced_mesh_1 = refine_result_1.second
        const geom_vec_1 = instanced_mesh_1.geom
        const geom_vec_1_size = geom_vec_1.size()
        for (let i = 0; i < geom_vec_1_size; i++) {
            const geom = geom_vec_1.get(i)
            const inst_data_B_vec = geom.instancing_data_B
            const inst_data_B_vec_size = inst_data_B_vec.size()
            for (let j = 0; j < inst_data_B_vec_size; j++) {
                const inst_data_B = inst_data_B_vec.get(j)
                result_1.push(inst_data_B.size)
            }
            cleanUpVariables.push(geom, inst_data_B_vec)
        }
        molecules_container.clear_refinement(coordMolNo_1)

        const copyMolNo_2 = molecules_container.copy_fragment_for_refinement_using_cid(coordMolNo_2, '/1/j/1/*')
        molecules_container.init_refinement_of_molecule_as_fragment_based_on_reference(copyMolNo_2, coordMolNo_2, mapMolNo)
        molecules_container.copy_dictionary('LIG', coordMolNo_2, copyMolNo_2)
        let result_2 = []
        const refine_result_2 = molecules_container.refine(copyMolNo_2, 5000)
        const instanced_mesh_2 = refine_result_2.second
        const geom_vec_2 = instanced_mesh_2.geom
        const geom_vec_2_size = geom_vec_2.size()
        for (let i = 0; i < geom_vec_2_size; i++) {
            const geom = geom_vec_2.get(i)
            const inst_data_B_vec = geom.instancing_data_B
            const inst_data_B_vec_size = inst_data_B_vec.size()
            for (let j = 0; j < inst_data_B_vec_size; j++) {
                const inst_data_B = inst_data_B_vec.get(j)
                result_2.push(inst_data_B.size)
            }
            cleanUpVariables.push(geom, inst_data_B_vec)
        }
        molecules_container.clear_refinement(coordMolNo_2)

        expect(result_1).toHaveLength(15)
        expect(result_2).toHaveLength(22)
        expect(result_1.every(size => size <= 2.25)).toBeTruthy()
        expect(result_2.every(size => size <= 2.25)).toBeTruthy()

        cleanUpVariables.push(instanced_mesh_1, instanced_mesh_2, geom_vec_1, geom_vec_2)
    })

    test("Test smiles_to_pdb", () => {
        const result_1 = molecules_container.smiles_to_pdb('c1ccccc1', 'LIG', 10, 100)
        const fileContents_1 = fs.readFileSync(path.join(__dirname, '..', 'test_data', 'benzene.cif'), { encoding: 'utf8', flag: 'r' })
        expect(result_1.second).toBe(fileContents_1)
    })

    test("Test histogram map", () => {
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        expect(mapMolNo).toBe(0)

        const result = molecules_container.get_map_histogram(mapMolNo, 200, 1)
        expect(result.base).toBeCloseTo(-1.01, 1)
        expect(result.bin_width).toBeCloseTo(0.02, 1)
        expect(result.counts.size()).toBe(200)
    })

    test("Test get_molecule_atoms pdb", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const pdbString  = molecules_container.get_molecule_atoms(coordMolNo, "pdb")
        expect(pdbString).toHaveLength(258719)
    })

    test("Test get_molecule_atoms mmcif", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const pdbString  = molecules_container.get_molecule_atoms(coordMolNo, "mmcif")
        expect(pdbString).toHaveLength(297616)
    })

    test("Test read_coords_string pdb-format", () => {
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        const pdbString_1  = molecules_container.get_molecule_atoms(coordMolNo_1, "pdb")
        expect(pdbString_1).toHaveLength(258719)
        const coordMolNo_2 = molecules_container.read_coords_string(pdbString_1, "mol-name")
        expect(coordMolNo_2.first).toBe(1)
        expect(coordMolNo_2.second).toBe("pdb")
        const pdbString_2  = molecules_container.get_molecule_atoms(coordMolNo_2.first, "pdb")
        expect(pdbString_2).toBe(pdbString_1)
    })

    test("Test read_coords_string mmcif-format", () => {
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        const pdbString_1  = molecules_container.get_molecule_atoms(coordMolNo_1, "mmcif")
        expect(pdbString_1).toHaveLength(297616)
        const coordMolNo_2 = molecules_container.read_coords_string(pdbString_1, "mol-name")
        expect(coordMolNo_2.first).toBe(1)
        expect(coordMolNo_2.second).toBe("mmcif")
        // For some reason this fails, probably a coot thing
        // const pdbString_2  = molecules_container.get_molecule_atoms(coordMolNo_2.first, "mmcif")
        // expect(pdbString_2).toBe(pdbString_1)
    })

    test("Test replace_molecule_by_model_from_string", () => {
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        const pdbString_1  = molecules_container.get_molecule_atoms(coordMolNo_1, "pdb")
        expect(pdbString_1).toHaveLength(258719)
        const coordMolNo_2 = molecules_container.read_pdb('./5fjj.pdb')
        molecules_container.replace_molecule_by_model_from_string(coordMolNo_2, pdbString_1)
        const pdbString_2  = molecules_container.get_molecule_atoms(coordMolNo_2, "pdb")
        expect(pdbString_2).toBe(pdbString_1)
    })

    test("Test get_gphl_chem_comp_info 1 -pdb", () => {
        
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo_1).toBe(0)
        
        const result_import_dict = molecules_container.import_cif_dictionary('./MOI.restraints.cif', -999999)
        expect(result_import_dict).toBe(1)
        
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'MOI', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)
        
        const result_1 = molecules_container.get_gphl_chem_comp_info('MOI', coordMolNo_1)
        expect(result_1.size()).toBe(30)
        
        const result_2 = molecules_container.get_gphl_chem_comp_info('MOI', ligandMolNo)
        expect(result_2.size()).toBe(30)

        const merge_info = molecules_container.merge_molecules(coordMolNo_1, ligandMolNo.toString())
        expect(merge_info.second.size()).toBe(1)
        
        const result_3 = molecules_container.get_gphl_chem_comp_info('MOI', coordMolNo_1)
        expect(result_3.size()).toBe(30)
        
        const result_4 = molecules_container.get_gphl_chem_comp_info('MOI', ligandMolNo)
        expect(result_4.size()).toBe(30)

        cleanUpVariables.push(merge_info, result_1, result_2, result_3, result_4)
    })

    test("Test get_gphl_chem_comp_info 1 -mmcif", () => {
        
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.mmcif')
        expect(coordMolNo_1).toBe(0)
        
        const result_import_dict = molecules_container.import_cif_dictionary('./MOI.restraints.cif', -999999)
        expect(result_import_dict).toBe(1)
        
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'MOI', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)
        
        const result_1 = molecules_container.get_gphl_chem_comp_info('MOI', coordMolNo_1)
        expect(result_1.size()).toBe(30)
        
        const result_2 = molecules_container.get_gphl_chem_comp_info('MOI', ligandMolNo)
        expect(result_2.size()).toBe(30)

        const merge_info = molecules_container.merge_molecules(coordMolNo_1, ligandMolNo.toString())
        expect(merge_info.second.size()).toBe(1)
        
        const result_3 = molecules_container.get_gphl_chem_comp_info('MOI', coordMolNo_1)
        expect(result_3.size()).toBe(30)
        
        const result_4 = molecules_container.get_gphl_chem_comp_info('MOI', ligandMolNo)
        expect(result_4.size()).toBe(30)

        cleanUpVariables.push(merge_info, result_1, result_2, result_3, result_4)
    })

    test("Test get_gphl_chem_comp_info 2", () => {
        
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo_1).toBe(0)
        
        const result_import_dict = molecules_container.import_cif_dictionary('./MOI.restraints.cif', coordMolNo_1)
        expect(result_import_dict).toBe(1)
        
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'MOI', coordMolNo_1, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)
        
        const result_1 = molecules_container.get_gphl_chem_comp_info('MOI', coordMolNo_1)
        expect(result_1.size()).toBe(30)
        
        const result_2 = molecules_container.get_gphl_chem_comp_info('MOI', ligandMolNo)
        expect(result_2.size()).toBe(0)

        const merge_info = molecules_container.merge_molecules(coordMolNo_1, ligandMolNo.toString())
        expect(merge_info.second.size()).toBe(1)
        
        const result_3 = molecules_container.get_gphl_chem_comp_info('MOI', coordMolNo_1)
        expect(result_3.size()).toBe(30)
        
        const result_4 = molecules_container.get_gphl_chem_comp_info('MOI', ligandMolNo)
        expect(result_4.size()).toBe(0)

        cleanUpVariables.push(merge_info, result_1, result_2, result_3, result_4)
    })

    test.skip("Test get_gphl_chem_comp_info 3", () => {
        
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo_1).toBe(0)
        
        const result_import_dict_1 = molecules_container.import_cif_dictionary('./MOI.restraints.cif', -999999)
        expect(result_import_dict_1).toBe(1)
        
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'MOI', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)
        
        const result_import_dict_2 = molecules_container.import_cif_dictionary('./MOI.restraints.cif', ligandMolNo)
        expect(result_import_dict_2).toBe(1)

        const result_1 = molecules_container.get_gphl_chem_comp_info('MOI', coordMolNo_1)
        expect(result_1.size()).toBe(30)
        
        const result_2 = molecules_container.get_gphl_chem_comp_info('MOI', ligandMolNo)
        expect(result_2.size()).toBe(30)

        cleanUpVariables.push(merge_info, result_1, result_2, result_3, result_4)
    })

    test("Test merge ligand and gemmi parse -mmcif", () => {
        
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.mmcif')
        expect(coordMolNo_1).toBe(0)
        
        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', -999999)
        expect(result_import_dict).toBe(1)
        
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'LZA', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)

        const merge_info = molecules_container.merge_molecules(coordMolNo_1, ligandMolNo.toString())
        expect(merge_info.second.size()).toBe(1)
        
        const mmcifString = molecules_container.get_molecule_atoms(coordMolNo_1, 'mmcif')        
        const st = cootModule.read_structure_from_string(mmcifString, 'test-molecule')
        cootModule.gemmi_setup_entities(st)
        cootModule.gemmi_add_entity_types(st, true)
        const model = st.first_model()
        const chains = model.chains
        const chain = chains.get(2)
        const ligands = chain.get_ligands_const()
        expect(ligands.length()).toBe(1)

        cleanUpVariables.push(merge_info, st, model, chains, chain, ligands)
    })

    test("Test merge ligand and gemmi parse -pdb", () => {
        
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo_1).toBe(0)
        
        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', -999999)
        expect(result_import_dict).toBe(1)
        
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'LZA', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)

        const merge_info = molecules_container.merge_molecules(coordMolNo_1, ligandMolNo.toString())
        expect(merge_info.second.size()).toBe(1)
        
        const mmcifString = molecules_container.get_molecule_atoms(coordMolNo_1, 'pdb')
        const st = cootModule.read_structure_from_string(mmcifString, 'test-molecule')
        cootModule.gemmi_setup_entities(st)
        cootModule.gemmi_add_entity_types(st, true)
        const model = st.first_model()
        const chains = model.chains
        const chain = chains.get(2)
        const ligands = chain.get_ligands_const()
        expect(ligands.length()).toBe(1)

        cleanUpVariables.push(merge_info, st, model, chains, chain, ligands)
    })

    test("Test merge ligand.restraints dict and gemmi parse -pdb", () => {
        
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo_1).toBe(0)
        
        const result_import_dict = molecules_container.import_cif_dictionary('./MOI.restraints.cif', -999999)
        expect(result_import_dict).toBe(1)
        
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'MOI', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)

        const merge_info = molecules_container.merge_molecules(coordMolNo_1, ligandMolNo.toString())
        expect(merge_info.second.size()).toBe(1)
        
        const mmcifString = molecules_container.get_molecule_atoms(coordMolNo_1, 'pdb')
        const st = cootModule.read_structure_from_string(mmcifString, 'test-molecule')
        cootModule.gemmi_setup_entities(st)
        cootModule.gemmi_add_entity_types(st, true)
        const model = st.first_model()
        const chains = model.chains
        const chain = chains.get(2)
        const ligands = chain.get_ligands_const()
        expect(ligands.length()).toBe(1)

        cleanUpVariables.push(merge_info, st, model, chains, chain, ligands)
    })

    test("Test merge ligand.restraints dict and gemmi parse -mmcif", () => {
        
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.mmcif')
        expect(coordMolNo_1).toBe(0)
        
        const result_import_dict = molecules_container.import_cif_dictionary('./MOI.restraints.cif', -999999)
        expect(result_import_dict).toBe(1)
        
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'MOI', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)

        const merge_info = molecules_container.merge_molecules(coordMolNo_1, ligandMolNo.toString())
        expect(merge_info.second.size()).toBe(1)
        
        const mmcifString = molecules_container.get_molecule_atoms(coordMolNo_1, 'mmcif')
        const st = cootModule.read_structure_from_string(mmcifString, 'test-molecule')
        cootModule.gemmi_setup_entities(st)
        cootModule.gemmi_add_entity_types(st, true)
        const model = st.first_model()
        const chains = model.chains
        const chain = chains.get(2)
        const ligands = chain.get_ligands_const()
        expect(ligands.length()).toBe(1)

        cleanUpVariables.push(merge_info, st, model, chains, chain, ligands)
    })

    test("Test merge ligand and gemmi parse cross-format 1", () => {
        
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo_1).toBe(0)

        const old_mmcifString = molecules_container.get_molecule_atoms(coordMolNo_1, 'mmcif')
        const old_st = cootModule.read_structure_from_string(old_mmcifString, 'test-molecule')
        cootModule.gemmi_setup_entities(old_st)
        cootModule.gemmi_add_entity_types(old_st, true)
        const old_model = old_st.first_model()
        const old_chains = old_model.chains

        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', -999999)
        expect(result_import_dict).toBe(1)
        
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'LZA', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)

        const merge_info = molecules_container.merge_molecules(coordMolNo_1, ligandMolNo.toString())
        expect(merge_info.second.size()).toBe(1)
        
        const mmcifString = molecules_container.get_molecule_atoms(coordMolNo_1, 'mmcif')
        const st = cootModule.read_structure_from_string(mmcifString, 'test-molecule')
        cootModule.gemmi_setup_entities(st)
        cootModule.gemmi_add_entity_types(st, true)
        const model = st.first_model()
        const chains = model.chains
        expect(chains.size()).toBe(old_chains.size() + 1)
        const chain = chains.get(2)
        const ligands = chain.get_ligands_const()
        expect(ligands.length()).toBe(1)

        cleanUpVariables.push(merge_info, old_chains, old_model, old_st, st, model, chains, chain, ligands)
    })

    test("Test merge ligand and gemmi parse cross-format 2", () => {
        
        const coordMolNo_1 = molecules_container.read_pdb('./5a3h.mmcif')
        expect(coordMolNo_1).toBe(0)

        const old_mmcifString = molecules_container.get_molecule_atoms(coordMolNo_1, 'pdb')
        const old_st = cootModule.read_structure_from_string(old_mmcifString, 'test-molecule')
        cootModule.gemmi_setup_entities(old_st)
        cootModule.gemmi_add_entity_types(old_st, true)
        const old_model = old_st.first_model()
        const old_chains = old_model.chains

        const result_import_dict = molecules_container.import_cif_dictionary('./LZA.cif', -999999)
        expect(result_import_dict).toBe(1)
        
        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            'LZA', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(1)

        const merge_info = molecules_container.merge_molecules(coordMolNo_1, ligandMolNo.toString())
        expect(merge_info.second.size()).toBe(1)
        
        const mmcifString = molecules_container.get_molecule_atoms(coordMolNo_1, 'pdb')
        const st = cootModule.read_structure_from_string(mmcifString, 'test-molecule')
        cootModule.gemmi_setup_entities(st)
        cootModule.gemmi_add_entity_types(st, true)
        const model = st.first_model()
        const chains = model.chains
        expect(chains.size()).toBe(old_chains.size() + 1)
        const chain = chains.get(2)
        const ligands = chain.get_ligands_const()
        expect(ligands.length()).toBe(1)

        cleanUpVariables.push(merge_info, old_chains, old_model, old_st, st, model, chains, chain, ligands)
    })

    test.skip('Test test_the_threading --pool false', () => {
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        expect(mapMolNo).toBe(0)

        molecules_container.set_map_is_contoured_with_thread_pool(false)
        const maxThreads = 8
        molecules_container.set_max_number_of_threads_in_thread_pool(maxThreads)
        for (let nThreads = 1; nThreads < 9; nThreads++) {
            for (let nIteration = 0; nIteration < 6; nIteration++) {
                const t = molecules_container.test_the_threading(nThreads, mapMolNo)
                console.log(`RESULT: ${nIteration} ${nThreads} ${t} 0 ${maxThreads}`)    
            }
        }
    })

    test.skip('Test test_the_threading --pool true', () => {
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        expect(mapMolNo).toBe(0)

        molecules_container.set_map_is_contoured_with_thread_pool(true)
        for (let nThreads = 1; nThreads < 9; nThreads++) {
            for (let nIteration = 0; nIteration < 6; nIteration++) {
                const t = molecules_container.test_the_threading(nThreads, mapMolNo)
                console.log(`RESULT: ${nIteration} ${nThreads} ${t} 1 0`)    
            }
        }
    })

    test.skip("Test find ligand (long ligand name)", () => {
        const coordMolNo = molecules_container.read_pdb('./1cxq.cif')
        const mapMolNo = molecules_container.read_mtz('./1cxq_phases.mtz', 'FWT', 'PHWT', "", false, false)
        expect(coordMolNo).toBe(0)
        expect(mapMolNo).toBe(1)

        // Delete the original ligand
        const result_cid = molecules_container.delete_using_cid(coordMolNo, "/1/A/300/*", "LITERAL")

        // Import ligand with long name
        const result_import_dict = molecules_container.import_cif_dictionary('./7ZTVU.cif', -999999)
        expect(result_import_dict).toBe(1)

        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            '7ZTVU', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(2)

        // Find and merge the ligand
        const fit_ligand_result = molecules_container.fit_ligand(
            coordMolNo, mapMolNo, ligandMolNo, 1., false, 10
        )
        expect(fit_ligand_result.size()).toBeGreaterThan(0)
        const first_fitted_ligand_imol = fit_ligand_result.get(0).imol
        const mergeMols = first_fitted_ligand_imol.toString()
        molecules_container.merge_molecules(coordMolNo, mergeMols)

        // Now parse the result with GEMMI
        const mmcif_string = molecules_container.molecule_to_mmCIF_string(coordMolNo)
        const gemmi_structure = cootModule.read_structure_from_string(mmcif_string, '1cxq')
        cootModule.gemmi_setup_entities(gemmi_structure)
        cootModule.gemmi_add_entity_types(gemmi_structure, true)

        const model = gemmi_structure.first_model()
        const chains = model.chains
        
        const chain = chains.get(0)
        expect(chain.name).toBe('A')
        
        const ligands = chain.get_ligands_const()
        expect(ligands.size()).toBe(3) // ---> HERE IT FAILS. There were already 2 ligands in this chain so I'm looking for 3

        const ligand = ligands.at(2)
        expect(ligand.name).toBe('7ZTVU')

        cleanUpVariables.push(fit_ligand_result, model, chain, ligands, gemmi_structure)

    })

    test.skip("Test merge ligand (long ligand name)", () => {
        const coordMolNo = molecules_container.read_pdb('./1cxq.cif')
        const mapMolNo = molecules_container.read_mtz('./1cxq_phases.mtz', 'FWT', 'PHWT', "", false, false)
        expect(coordMolNo).toBe(0)
        expect(mapMolNo).toBe(1)

        // Delete the original ligand
        const result_cid = molecules_container.delete_using_cid(coordMolNo, "/1/A/300/*", "LITERAL")

        // Import ligand with long name
        const result_import_dict = molecules_container.import_cif_dictionary('./7ZTVU.cif', -999999)
        expect(result_import_dict).toBe(1)

        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            '7ZTVU', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(2)

        // Merge the ligand (WITHOUT USING FIND LIGAND)
        const mergeMols = ligandMolNo.toString()
        molecules_container.merge_molecules(coordMolNo, mergeMols)

        // Now parse the result with GEMMI
        const mmcif_string = molecules_container.molecule_to_mmCIF_string(coordMolNo)
        const gemmi_structure = cootModule.read_structure_from_string(mmcif_string, '1cxq')
        cootModule.gemmi_setup_entities(gemmi_structure)
        cootModule.gemmi_add_entity_types(gemmi_structure, true)

        const model = gemmi_structure.first_model()
        const chains = model.chains
        
        // Unlike in previous test, the ligand gets added to chain B instead of A
        const chain = chains.get(1)
        expect(chain.name).toBe('B')
        
        const ligands = chain.get_ligands_const()
        expect(ligands.size()).toBe(1)

        const ligand = ligands.at(0)
        expect(ligand.name).toBe('7ZTVU')

        cleanUpVariables.push(model, chain, ligands, gemmi_structure)

    })

    test.skip("Test refine & merge ligand (long ligand name)", () => {
        const coordMolNo = molecules_container.read_pdb('./1cxq.cif')
        const mapMolNo = molecules_container.read_mtz('./1cxq_phases.mtz', 'FWT', 'PHWT', "", false, false)
        expect(coordMolNo).toBe(0)
        expect(mapMolNo).toBe(1)

        // Delete the original ligand
        const result_cid = molecules_container.delete_using_cid(coordMolNo, "/1/A/300/*", "LITERAL")

        // Import ligand with long name
        const result_import_dict = molecules_container.import_cif_dictionary('./7ZTVU.cif', -999999)
        expect(result_import_dict).toBe(1)

        const ligandMolNo = molecules_container.get_monomer_and_position_at(
            '7ZTVU', -999999, 0, 0, 0
        )
        expect(ligandMolNo).toBe(2)

        // Now refine the ligand
        molecules_container.refine_residues_using_atom_cid(ligandMolNo, "//", "LITERAL", 4000)

        // Merge the ligand (WITHOUT USING FIND LIGAND)
        const mergeMols = ligandMolNo.toString()
        molecules_container.merge_molecules(coordMolNo, mergeMols)

        // Now parse the result with GEMMI
        const mmcif_string = molecules_container.molecule_to_mmCIF_string(coordMolNo)
        const gemmi_structure = cootModule.read_structure_from_string(mmcif_string, '1cxq')
        cootModule.gemmi_setup_entities(gemmi_structure)
        cootModule.gemmi_add_entity_types(gemmi_structure, true)

        const model = gemmi_structure.first_model()
        const chains = model.chains
        
        // Unlike in previous test, the ligand gets added to chain B instead of A
        const chain = chains.get(1)
        expect(chain.name).toBe('B')
        
        const ligands = chain.get_ligands_const()
        expect(ligands.size()).toBe(1)

        const ligand = ligands.at(0)
        expect(ligand.name).toBe('7ZTVU')

        cleanUpVariables.push(model, chain, ligands, gemmi_structure)

    })

    test("Test updating maps", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', 'FOM', false, false)
        const diffMapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'DELFWT', 'PHDELWT', 'FOM', false, true)
        expect(coordMolNo).toBe(0)
        expect(mapMolNo).toBe(1)
        expect(diffMapMolNo).toBe(2)

        molecules_container.associate_data_mtz_file_with_map(mapMolNo, './5a3h_sigmaa.mtz', 'FP', 'SIGFP', 'FREE')
        molecules_container.connect_updating_maps(coordMolNo, mapMolNo, mapMolNo, diffMapMolNo)
        molecules_container.sfcalc_genmaps_using_bulk_solvent(coordMolNo, mapMolNo, diffMapMolNo, mapMolNo)

        const scores_1 =  molecules_container.get_r_factor_stats()
        const map_mesh_1 = molecules_container.get_map_contours_mesh(mapMolNo, 0, 0, 0, 13, 0.48)
        expect(scores_1.r_factor).toBeCloseTo(0.103, 2)
        expect(scores_1.free_r_factor).toBeCloseTo(0.155, 2)
        expect(scores_1.rail_points_total).toBe(0)
        expect(scores_1.rail_points_new).toBe(0)

        molecules_container.delete_using_cid(coordMolNo, "/1/A/300/*", "LITERAL")
        const map_mesh_2 = molecules_container.get_map_contours_mesh(mapMolNo, 0, 0, 0, 13, 0.48)
        const scores_2 =  molecules_container.get_r_factor_stats()
        expect(scores_2.r_factor).toBeCloseTo(0.108, 2)
        expect(scores_2.free_r_factor).toBeCloseTo(0.158, 2)
        expect(scores_2.rail_points_total).toBe(-299)
        expect(scores_2.rail_points_new).toBe(-299)

        expect(map_mesh_1.vertices.size()).not.toBe(map_mesh_2.vertices.size())
    })

    test.skip("Test get_diff_diff_map_peaks", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', 'FOM', false, false)
        const diffMapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'DELFWT', 'PHDELWT', 'FOM', false, true)

        molecules_container.associate_data_mtz_file_with_map(mapMolNo, './5a3h_sigmaa.mtz', 'FP', 'SIGFP', 'FREE')
        molecules_container.connect_updating_maps(coordMolNo, mapMolNo, mapMolNo, diffMapMolNo)
        const result = molecules_container.sfcalc_genmaps_using_bulk_solvent(coordMolNo, mapMolNo, diffMapMolNo, mapMolNo)
        expect(result.r_factor).not.toBe(-1)

        molecules_container.get_r_factor_stats()
        molecules_container.get_map_contours_mesh(mapMolNo, 77.501, 45.049, 22.663, 13, 0.48)

        molecules_container.delete_using_cid(coordMolNo, "/1/A/300/*", "LITERAL")
        molecules_container.get_map_contours_mesh(mapMolNo, 77.501, 45.049, 22.663, 13, 0.48)
        molecules_container.get_r_factor_stats()

        const diff_diff_map_peaks = molecules_container.get_diff_diff_map_peaks(diffMapMolNo, 77.501, 45.049, 22.663)
        expect(diff_diff_map_peaks.size()).toBeGreaterThan(0)
    })

    test("Test export_model_molecule_as_gltf", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        const fileName = 'molecule-test.glb'
        molecules_container.export_model_molecule_as_gltf(coordMolNo, '//', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1, false, false, fileName)
        const fileContents = cootModule.FS.readFile(fileName, { encoding: 'binary' })
        cootModule.FS.unlink(fileName)
        expect(fileContents.byteLength).toBeGreaterThan(1000000)
    })

    test("Test export_map_molecule_as_gltf", () => {
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', 'FOM', false, false)

        const fileName = 'map-test.glb'
        molecules_container.export_map_molecule_as_gltf(mapMolNo, 0, 0, 0, 13, 0.48, fileName)
        const fileContents = cootModule.FS.readFile(fileName, { encoding: 'binary' })
        cootModule.FS.unlink(fileName)
        expect(fileContents.byteLength).toBeGreaterThan(1000000)
    })

    test("Test getSecondaryStructure", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        const ss2_vector = molecules_container.GetSecondaryStructure(coordMolNo, 1)
        expect(ss2_vector.size()).toBe(650)
        expect(ss2_vector.get(5).int_user_data).toBe(6)
        cleanUpVariables.push(ss2_vector)
    })

    test("Test privateer_validate", () => {
        const coordMolNo = molecules_container.read_pdb('./5fjj.pdb')
        const results = molecules_container.privateer_validate(coordMolNo)
        const first = results.get(0)
        expect(first.wurcs).toBe("WURCS=2.0/2,3,2/[a2122h-1b_1-5_2*NCC/3=O][a1122h-1b_1-5]/1-1-2/a4-b1_b4-c1")
        expect(results.size()).toBe(38)
        cleanUpVariables.push(results)
    });

    test("Test get molecule diameter", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const diameter = molecules_container.get_molecule_diameter(coordMolNo)
        expect(diameter).toBeLessThanOrEqual(50)
        expect(diameter).toBeGreaterThanOrEqual(30)
    })

    test("Test non-drawn bonds and selection mesh", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        const instanceMesh_1 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )
        
        molecules_container.add_to_non_drawn_bonds(coordMolNo, '//A/12-15')

        const instanceMesh_2 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )

        expect(
            instanceMesh_2.geom.get(1).instancing_data_B.size()
        ).not.toBe(
            instanceMesh_1.geom.get(1).instancing_data_B.size()
        )

        cleanUpVariables.push(instanceMesh_1, instanceMesh_2)
    })

    test("Test colour rules and bond mesh", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        const instanceMesh_1 = molecules_container.get_bonds_mesh_instanced(
            coordMolNo, 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )
        
        const geom_1 = instanceMesh_1.geom
        const geomSize_1 = geom_1.size()
        let colours_1 = []
        for (let i = 0; i < geomSize_1; i++) {
            const inst = geom_1.get(i);
            const As = inst.instancing_data_A;
            const Asize = As.size();
    
            for (let j = 0; j < Asize; j++) {
                const inst_data = As.get(j)
                const instDataColour = inst_data.colour
                colours_1.push(instDataColour[0])
                colours_1.push(instDataColour[1])
                colours_1.push(instDataColour[2])
                colours_1.push(instDataColour[3])    
            }
            As.delete()
        }

        let colourMap = new cootModule.MapIntFloat4()
        let indexedResiduesVec = new cootModule.VectorStringUInt_pair()
        
        const colours = [
            { cid: "//A/12-15", rgba: [1, 0, 0, 1] }
        ]
        colours.forEach((colour, index) => {
            colourMap.set(index + 51, colour.rgba)
            const i = { first: colour.cid, second: index + 51 }
            indexedResiduesVec.push_back(i)
        })
    
        molecules_container.set_user_defined_bond_colours(coordMolNo, colourMap)
        molecules_container.set_user_defined_atom_colour_by_selection(coordMolNo, indexedResiduesVec, false)

        const instanceMesh_2 = molecules_container.get_bonds_mesh_instanced(
            coordMolNo, 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )

        const geom_2 = instanceMesh_2.geom
        const geomSize_2 = geom_2.size()
        let colours_2 = []
        for (let i = 0; i < geomSize_2; i++) {
            const inst = geom_2.get(i);
            const As = inst.instancing_data_A;
            const Asize = As.size();
    
            for (let j = 0; j < Asize; j++) {
                const inst_data = As.get(j)
                const instDataColour = inst_data.colour
                colours_2.push(instDataColour[0])
                colours_2.push(instDataColour[1])
                colours_2.push(instDataColour[2])
                colours_2.push(instDataColour[3])    
            }
            As.delete()
        }

        expect(colours_2).not.toEqual(colours_1)

        cleanUpVariables.push(instanceMesh_1, instanceMesh_2, indexedResiduesVec, colourMap, geom_2, geom_1)
    })


    test("Test colour rules and multi CID selection mesh --first", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        const instanceMesh_1 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20||//A/25-30', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )
        
        const geom_1 = instanceMesh_1.geom
        const geomSize_1 = geom_1.size()
        let colours_1 = []
        for (let i = 0; i < geomSize_1; i++) {
            const inst = geom_1.get(i);
            const As = inst.instancing_data_A;
            const Asize = As.size();
    
            for (let j = 0; j < Asize; j++) {
                const inst_data = As.get(j)
                const instDataColour = inst_data.colour
                colours_1.push(instDataColour[0])
                colours_1.push(instDataColour[1])
                colours_1.push(instDataColour[2])
                colours_1.push(instDataColour[3])    
            }
            As.delete()
        }

        let colourMap = new cootModule.MapIntFloat4()
        let indexedResiduesVec = new cootModule.VectorStringUInt_pair()
        
        const colours = [
            { cid: "//A/12-15", rgba: [1, 0, 0, 1] }
        ]
        colours.forEach((colour, index) => {
            colourMap.set(index + 51, colour.rgba)
            const i = { first: colour.cid, second: index + 51 }
            indexedResiduesVec.push_back(i)
        })
    
        molecules_container.set_user_defined_bond_colours(coordMolNo, colourMap)
        molecules_container.set_user_defined_atom_colour_by_selection(coordMolNo, indexedResiduesVec, false)

        const instanceMesh_2 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20||//A/25-30', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )

        const geom_2 = instanceMesh_2.geom
        const geomSize_2 = geom_2.size()
        let colours_2 = []
        for (let i = 0; i < geomSize_2; i++) {
            const inst = geom_2.get(i);
            const As = inst.instancing_data_A;
            const Asize = As.size();
    
            for (let j = 0; j < Asize; j++) {
                const inst_data = As.get(j)
                const instDataColour = inst_data.colour
                colours_2.push(instDataColour[0])
                colours_2.push(instDataColour[1])
                colours_2.push(instDataColour[2])
                colours_2.push(instDataColour[3])    
            }
            As.delete()
        }

        expect(colours_2).not.toEqual(colours_1)

        cleanUpVariables.push(instanceMesh_1, instanceMesh_2, indexedResiduesVec, colourMap, geom_2, geom_1)
    })

    test("Test colour rules and multi CID selection mesh --second", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        const instanceMesh_1 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20||//A/25-30', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )
        
        const geom_1 = instanceMesh_1.geom
        const geomSize_1 = geom_1.size()
        let colours_1 = []
        for (let i = 0; i < geomSize_1; i++) {
            const inst = geom_1.get(i);
            const As = inst.instancing_data_A;
            const Asize = As.size();
    
            for (let j = 0; j < Asize; j++) {
                const inst_data = As.get(j)
                const instDataColour = inst_data.colour
                colours_1.push(instDataColour[0])
                colours_1.push(instDataColour[1])
                colours_1.push(instDataColour[2])
                colours_1.push(instDataColour[3])    
            }
            As.delete()
        }

        let colourMap = new cootModule.MapIntFloat4()
        let indexedResiduesVec = new cootModule.VectorStringUInt_pair()
        
        const colours = [
            { cid: "//A/26-29", rgba: [1, 0, 0, 1] }
        ]
        colours.forEach((colour, index) => {
            colourMap.set(index + 51, colour.rgba)
            const i = { first: colour.cid, second: index + 51 }
            indexedResiduesVec.push_back(i)
        })
    
        molecules_container.set_user_defined_bond_colours(coordMolNo, colourMap)
        molecules_container.set_user_defined_atom_colour_by_selection(coordMolNo, indexedResiduesVec, false)

        const instanceMesh_2 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20||//A/25-30', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )

        const geom_2 = instanceMesh_2.geom
        const geomSize_2 = geom_2.size()
        let colours_2 = []
        for (let i = 0; i < geomSize_2; i++) {
            const inst = geom_2.get(i);
            const As = inst.instancing_data_A;
            const Asize = As.size();
    
            for (let j = 0; j < Asize; j++) {
                const inst_data = As.get(j)
                const instDataColour = inst_data.colour
                colours_2.push(instDataColour[0])
                colours_2.push(instDataColour[1])
                colours_2.push(instDataColour[2])
                colours_2.push(instDataColour[3])    
            }
            As.delete()
        }

        expect(colours_2).not.toEqual(colours_1)

        cleanUpVariables.push(instanceMesh_1, instanceMesh_2, indexedResiduesVec, colourMap, geom_2, geom_1)
    })

    test("Test colour rules and multi CID selection mesh --third", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        const instanceMesh_1 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20||//A/25-30', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )
        
        const geom_1 = instanceMesh_1.geom
        const geomSize_1 = geom_1.size()
        let colours_1 = []
        for (let i = 0; i < geomSize_1; i++) {
            const inst = geom_1.get(i);
            const As = inst.instancing_data_A;
            const Asize = As.size();
    
            for (let j = 0; j < Asize; j++) {
                const inst_data = As.get(j)
                const instDataColour = inst_data.colour
                colours_1.push(instDataColour[0])
                colours_1.push(instDataColour[1])
                colours_1.push(instDataColour[2])
                colours_1.push(instDataColour[3])    
            }
            As.delete()
        }

        let colourMap = new cootModule.MapIntFloat4()
        let indexedResiduesVec = new cootModule.VectorStringUInt_pair()
        
        const colours = [
            { cid: "//A", rgba: [1, 0, 0, 1] }
        ]
        colours.forEach((colour, index) => {
            colourMap.set(index + 51, colour.rgba)
            const i = { first: colour.cid, second: index + 51 }
            indexedResiduesVec.push_back(i)
        })
    
        molecules_container.set_user_defined_bond_colours(coordMolNo, colourMap)
        molecules_container.set_user_defined_atom_colour_by_selection(coordMolNo, indexedResiduesVec, false)

        const instanceMesh_2 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20||//A/25-30', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )

        const geom_2 = instanceMesh_2.geom
        const geomSize_2 = geom_2.size()
        let colours_2 = []
        for (let i = 0; i < geomSize_2; i++) {
            const inst = geom_2.get(i);
            const As = inst.instancing_data_A;
            const Asize = As.size();
    
            for (let j = 0; j < Asize; j++) {
                const inst_data = As.get(j)
                const instDataColour = inst_data.colour
                colours_2.push(instDataColour[0])
                colours_2.push(instDataColour[1])
                colours_2.push(instDataColour[2])
                colours_2.push(instDataColour[3])    
            }
            As.delete()
        }

        expect(colours_2).not.toEqual(colours_1)

        cleanUpVariables.push(instanceMesh_1, instanceMesh_2, indexedResiduesVec, colourMap, geom_2, geom_1)
    })

    test("Test non-drawn bonds and multi CID selection mesh --first", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        const instanceMesh_1 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20||//A/25-30', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )
        
        molecules_container.add_to_non_drawn_bonds(coordMolNo, '//A/12-15')

        const instanceMesh_2 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20||//A/25-30', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )

        expect(
            instanceMesh_2.geom.get(1).instancing_data_B.size()
        ).not.toBe(
            instanceMesh_1.geom.get(1).instancing_data_B.size()
        )

        cleanUpVariables.push(instanceMesh_1, instanceMesh_2)
    })

    test("Test non-drawn bonds and multi CID selection mesh --second", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        const instanceMesh_1 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20||//A/25-30', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )
        
        molecules_container.add_to_non_drawn_bonds(coordMolNo, '//A/26-27')

        const instanceMesh_2 = molecules_container.get_bonds_mesh_for_selection_instanced(
            coordMolNo, '//A/10-20||//A/25-30', 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )

        expect(
            instanceMesh_2.geom.get(1).instancing_data_B.size()
        ).not.toBe(
            instanceMesh_1.geom.get(1).instancing_data_B.size()
        )

        expect(
            instanceMesh_2.geom.get(0).instancing_data_A.size()
        ).not.toBe(
            instanceMesh_1.geom.get(0).instancing_data_A.size()
        )

        cleanUpVariables.push(instanceMesh_1, instanceMesh_2)
    })

    test("Test non-drawn bonds and bonds mesh", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        const instanceMesh_1 = molecules_container.get_bonds_mesh_instanced(
            coordMolNo, 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )
        
        molecules_container.add_to_non_drawn_bonds(coordMolNo, '//A/12-15')

        const instanceMesh_2 = molecules_container.get_bonds_mesh_instanced(
            coordMolNo, 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )

        expect(
            instanceMesh_2.geom.get(1).instancing_data_B.size()
        ).not.toBe(
            instanceMesh_1.geom.get(1).instancing_data_B.size()
        )

        cleanUpVariables.push(instanceMesh_1, instanceMesh_2)
    })

    test("Test change chain ID -- whole chain", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        let original_chains = []
        const original_chains_vec = molecules_container.get_chains_in_model(coordMolNo)
        const original_chains_vec_size = original_chains_vec.size()
        for (let i = 0; i < original_chains_vec_size; i++) {
            const chain_name = original_chains_vec.get(i)
            original_chains.push(chain_name)
        }

        molecules_container.change_chain_id(coordMolNo, 'A', 'X', false, 0, 0)
        
        let new_chains = []
        const new_chains_vec = molecules_container.get_chains_in_model(coordMolNo)
        const new_chains_vec_size = new_chains_vec.size()
        for (let i = 0; i < new_chains_vec_size; i++) {
            const chain_name = new_chains_vec.get(i)
            new_chains.push(chain_name)
        }

        expect(new_chains).not.toEqual(original_chains)
        expect(original_chains.includes('X')).toBeFalsy()
        expect(new_chains.includes('A')).toBeFalsy()
        expect(new_chains.includes('X')).toBeTruthy()

        cleanUpVariables.push(original_chains_vec, new_chains_vec)
    })

    test("Test change chain ID -- residue range", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        let original_chains = []
        const original_chains_vec = molecules_container.get_chains_in_model(coordMolNo)
        const original_chains_vec_size = original_chains_vec.size()
        for (let i = 0; i < original_chains_vec_size; i++) {
            const chain_name = original_chains_vec.get(i)
            original_chains.push(chain_name)
        }

        molecules_container.change_chain_id(coordMolNo, 'A', 'X', true, 10, 20)
        
        let new_chains = []
        const new_chains_vec = molecules_container.get_chains_in_model(coordMolNo)
        const new_chains_vec_size = new_chains_vec.size()
        for (let i = 0; i < new_chains_vec_size; i++) {
            const chain_name = new_chains_vec.get(i)
            new_chains.push(chain_name)
        }

        expect(new_chains).not.toEqual(original_chains)
        expect(original_chains.includes('X')).toBeFalsy()
        expect(new_chains.includes('X')).toBeTruthy()

        const original_chain_res_names = []
        for (let idx = 10; idx < 21; idx++) {
            const resName = molecules_container.get_residue_name(coordMolNo, 'A', idx, '')
            original_chain_res_names.push(resName)   
        }

        const new_chain_res_names = []
        for (let idx = 10; idx < 21; idx++) {
            const resName = molecules_container.get_residue_name(coordMolNo, 'X', idx, '')
            new_chain_res_names.push(resName)   
        }

        expect(new_chain_res_names.every(item => item !== '')).toBeTruthy()
        expect(original_chain_res_names.every(item => item === '')).toBeTruthy()
        
        cleanUpVariables.push(original_chains_vec, new_chains_vec)
    })

    test("Test change chain ID -- colour rules", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')

        molecules_container.delete_colour_rules(coordMolNo)

        let colourMap = new cootModule.MapIntFloat4()
        let indexedResiduesVec = new cootModule.VectorStringUInt_pair()

        const colours = [
            { cid: "//A", rgba: [1, 0, 0, 1] },
            { cid: "//B", rgba: [0, 0, 1, 1] }
        ]
        colours.forEach((colour, index) => {
            colourMap.set(index + 51, colour.rgba)
            const i = { first: colour.cid, second: index + 51 }
            indexedResiduesVec.push_back(i)
        })
    
        molecules_container.set_user_defined_bond_colours(coordMolNo, colourMap)
        molecules_container.set_user_defined_atom_colour_by_selection(coordMolNo, indexedResiduesVec, false)
        molecules_container.add_colour_rule(coordMolNo, '//A', '#ff0000')
        molecules_container.add_colour_rule(coordMolNo, '//B', '#0000ff')

        const instanceMesh_1 = molecules_container.get_bonds_mesh_instanced(
            coordMolNo, 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )

        let original_chains = []
        const original_chains_vec = molecules_container.get_chains_in_model(coordMolNo)
        const original_chains_vec_size = original_chains_vec.size()
        for (let i = 0; i < original_chains_vec_size; i++) {
            const chain_name = original_chains_vec.get(i)
            original_chains.push(chain_name)
        }

        molecules_container.change_chain_id(coordMolNo, 'A', 'X', false, 0, 0)
        
        let new_chains = []
        const new_chains_vec = molecules_container.get_chains_in_model(coordMolNo)
        const new_chains_vec_size = new_chains_vec.size()
        for (let i = 0; i < new_chains_vec_size; i++) {
            const chain_name = new_chains_vec.get(i)
            new_chains.push(chain_name)
        }

        expect(new_chains).not.toEqual(original_chains)
        expect(original_chains.includes('X')).toBeFalsy()
        expect(new_chains.includes('A')).toBeFalsy()
        expect(new_chains.includes('X')).toBeTruthy()
        
        molecules_container.delete_colour_rules(coordMolNo)

        let colourMap_2 = new cootModule.MapIntFloat4()
        let indexedResiduesVec_2 = new cootModule.VectorStringUInt_pair()

        const colours_2 = [
            { cid: "//A", rgba: [1, 0, 0, 1] },
            { cid: "//B", rgba: [0, 0, 1, 1] },
            { cid: "//X", rgba: [0, 1, 0, 1] }
        ]
        colours_2.forEach((colour, index) => {
            colourMap_2.set(index + 51, colour.rgba)
            const i = { first: colour.cid, second: index + 51 }
            indexedResiduesVec_2.push_back(i)
        })
        
        molecules_container.set_user_defined_bond_colours(coordMolNo, colourMap_2)
        molecules_container.set_user_defined_atom_colour_by_selection(coordMolNo, indexedResiduesVec_2, false)
        molecules_container.add_colour_rule(coordMolNo, '//A', '#ff0000')
        molecules_container.add_colour_rule(coordMolNo, '//B', '#0000ff')
        molecules_container.add_colour_rule(coordMolNo, '//X', '#0000ff')
        
        const instanceMesh_2 = molecules_container.get_bonds_mesh_instanced(
            coordMolNo, 'COLOUR-BY-CHAIN-AND-DICTIONARY', false, 0.1, 1, 1
        )
        
        expect(
            instanceMesh_2.geom.get(1).instancing_data_B.size()
        ).toBe(
            instanceMesh_1.geom.get(1).instancing_data_B.size()
        )

        cleanUpVariables.push(original_chains_vec, new_chains_vec, instanceMesh_1, instanceMesh_2, colourMap_2, colourMap, indexedResiduesVec)
    })

    test.skip("Test shift_field_b_factor_refinement", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', 'FOM', false, false)
        const diffMapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'DELFWT', 'PHDELWT', 'FOM', false, true)
        expect(coordMolNo).toBe(0)
        expect(mapMolNo).toBe(1)
        expect(diffMapMolNo).toBe(2)

        const pdbString_1  = molecules_container.get_molecule_atoms(coordMolNo, "pdb")
        const st_1 = cootModule.read_structure_from_string(pdbString_1, 'test-molecule')
        cootModule.gemmi_setup_entities(st_1)
        cootModule.gemmi_add_entity_types(st_1, true)
        const bfactor_vec_1 = cootModule.get_structure_bfactors(st_1)
        const bfactor_vec_1_size = bfactor_vec_1.size()
        let bfactors_1 = []
        for (let i = 0; i < bfactor_vec_1_size; i++) {
            const resInfo = bfactor_vec_1.get(i)
            bfactors_1.push({...resInfo})
        }

        molecules_container.associate_data_mtz_file_with_map(mapMolNo, './5a3h_sigmaa.mtz', 'FP', 'SIGFP', 'FREE')
        molecules_container.connect_updating_maps(coordMolNo, mapMolNo, mapMolNo, diffMapMolNo)
        molecules_container.sfcalc_genmaps_using_bulk_solvent(coordMolNo, mapMolNo, diffMapMolNo, mapMolNo)

        const scores_1 =  molecules_container.get_r_factor_stats()
        const map_mesh_1 = molecules_container.get_map_contours_mesh(mapMolNo, 0, 0, 0, 13, 0.48)
        expect(scores_1.r_factor).not.toBe(-1)

        const result = molecules_container.shift_field_b_factor_refinement(coordMolNo, mapMolNo)
        expect(result).toBeTruthy()

        const pdbString_2  = molecules_container.get_molecule_atoms(coordMolNo, "pdb")
        const st_2 = cootModule.read_structure_from_string(pdbString_2, 'test-molecule')
        cootModule.gemmi_setup_entities(st_2)
        cootModule.gemmi_add_entity_types(st_2, true)
        const bfactor_vec_2 = cootModule.get_structure_bfactors(st_2)
        const bfactor_vec_2_size = bfactor_vec_2.size()
        let bfactors_2 = []
        for (let i = 0; i < bfactor_vec_2_size; i++) {
            const resInfo = bfactor_vec_2.get(i)
            bfactors_2.push({...resInfo})
        }

        const map_mesh_2 = molecules_container.get_map_contours_mesh(mapMolNo, 0, 0, 0, 13, 0.48)
        const scores_2 =  molecules_container.get_r_factor_stats()

        expect(scores_2.r_factor).not.toBe(-1)
        expect(scores_1).not.toEqual(scores_2)

        expect(
            bfactors_1.map(item => item.cid)
        ).toEqual(
            bfactors_2.map(item => item.cid)
        )

        expect(
            bfactors_1.map(item => item.bFactor)
        ).not.toEqual(
            bfactors_2.map(item => item.bFactor)
        )
        
        expect(
            bfactors_1.map(item => item.normalised_bFactor)
        ).not.toEqual(
            bfactors_2.map(item => item.normalised_bFactor)
        )
        
        cleanUpVariables.push(
            st_2, bfactor_vec_2, bfactor_vec_1
        )
    })

    test("Test multiply_residue_temperature_factors", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', 'FOM', false, false)
        const diffMapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'DELFWT', 'PHDELWT', 'FOM', false, true)
        expect(coordMolNo).toBe(0)
        expect(mapMolNo).toBe(1)
        expect(diffMapMolNo).toBe(2)

        const pdbString_1  = molecules_container.get_molecule_atoms(coordMolNo, "pdb")
        const st_1 = cootModule.read_structure_from_string(pdbString_1, 'test-molecule')
        cootModule.gemmi_setup_entities(st_1)
        cootModule.gemmi_add_entity_types(st_1, true)
        const bfactor_vec_1 = cootModule.get_structure_bfactors(st_1)
        const bfactor_vec_1_size = bfactor_vec_1.size()
        let bfactors_1 = []
        for (let i = 0; i < bfactor_vec_1_size; i++) {
            const resInfo = bfactor_vec_1.get(i)
            bfactors_1.push({...resInfo})
        }

        molecules_container.associate_data_mtz_file_with_map(mapMolNo, './5a3h_sigmaa.mtz', 'FP', 'SIGFP', 'FREE')
        molecules_container.connect_updating_maps(coordMolNo, mapMolNo, mapMolNo, diffMapMolNo)
        molecules_container.sfcalc_genmaps_using_bulk_solvent(coordMolNo, mapMolNo, diffMapMolNo, mapMolNo)

        const scores_1 =  molecules_container.get_r_factor_stats()
        molecules_container.get_map_contours_mesh(mapMolNo, 0, 0, 0, 13, 0.48)
        expect(scores_1.r_factor).not.toBe(-1)

        molecules_container.multiply_residue_temperature_factors(coordMolNo, '//', 2)
        
        const pdbString_2  = molecules_container.get_molecule_atoms(coordMolNo, "pdb")
        const st_2 = cootModule.read_structure_from_string(pdbString_2, 'test-molecule')
        cootModule.gemmi_setup_entities(st_2)
        cootModule.gemmi_add_entity_types(st_2, true)
        const bfactor_vec_2 = cootModule.get_structure_bfactors(st_2)
        const bfactor_vec_2_size = bfactor_vec_2.size()
        let bfactors_2 = []
        for (let i = 0; i < bfactor_vec_2_size; i++) {
            const resInfo = bfactor_vec_2.get(i)
            bfactors_2.push({...resInfo})
        }

        molecules_container.get_map_contours_mesh(mapMolNo, 0, 0, 0, 13, 0.48)
        const scores_2 =  molecules_container.get_r_factor_stats()

        expect(scores_2.r_factor).not.toBe(-1)
        expect(scores_1).not.toEqual(scores_2)

        expect(
            bfactors_1.map(item => item.cid)
        ).toEqual(
            bfactors_2.map(item => item.cid)
        )

        expect(
            bfactors_1.map(item => item.bFactor * 2)
        ).toEqual(
            bfactors_2.map(item => item.bFactor)
        )
        
        expect(
            bfactors_1.map(item => item.normalised_bFactor)
        ).toEqual(
            bfactors_2.map(item => item.normalised_bFactor)
        )
        
        cleanUpVariables.push(
            st_2, bfactor_vec_2, bfactor_vec_1
        )
    })

    test("Test clear", () => {
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', 'FOM', false, false)
        const diffMapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'DELFWT', 'PHDELWT', 'FOM', false, true)
        expect(coordMolNo).toBe(0)
        expect(mapMolNo).toBe(1)
        expect(diffMapMolNo).toBe(2)

        const isValid_1 = molecules_container.is_valid_model_molecule(coordMolNo)
        const isValid_2 = molecules_container.is_valid_map_molecule(mapMolNo)
        const isValid_3 = molecules_container.is_valid_map_molecule(diffMapMolNo)
        expect(isValid_1).toBeTruthy()
        expect(isValid_2).toBeTruthy()
        expect(isValid_3).toBeTruthy()

        molecules_container.clear()

        const isValid_4 = molecules_container.is_valid_model_molecule(coordMolNo)
        const isValid_5 = molecules_container.is_valid_map_molecule(mapMolNo)
        const isValid_6 = molecules_container.is_valid_map_molecule(diffMapMolNo)
        expect(isValid_4).toBeFalsy()
        expect(isValid_5).toBeFalsy()
        expect(isValid_6).toBeFalsy()

    })
})

const testDataFiles = ['1cxq_phases.mtz', '1cxq.cif', '7ZTVU.cif', '5fjj.pdb', '5a3h.pdb', '5a3h.mmcif', '5a3h_no_ligand.pdb', 'MOI.restraints.cif', 'LZA.cif', 'nitrobenzene.cif', 'benzene.cif', '5a3h_sigmaa.mtz', 'rnasa-1.8-all_refmac1.mtz', 'tm-A.pdb']

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
