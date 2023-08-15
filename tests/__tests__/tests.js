
jest.setTimeout(40000)

const fs = require('fs')
const path = require('path')
const createCootModule = require('../moorhen.js')

let cootModule;

beforeAll(() => {
    return createCootModule({
        print(t) { async () => await console.log(["output", t]) },
        printErr(t) { async () => await console.log(["output", t]); }
    }).then(moduleCreated => {
        cootModule = moduleCreated
        return Promise.resolve()
    })
})

describe('Testing molecules_container_js', () => {

    beforeAll(() => {
        setupFunctions.copyExampleDataToFauxFS()
    })

    test('Test glycoblocks', async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5fjj.pdb')
        const glyco_mesh = molecules_container.DrawGlycoBlocks(coordMolNo,"/")
    })

    test('Test copy fragment', async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = await molecules_container.read_pdb('./5a3h.pdb')
        const coordMolNo2 = await molecules_container.copy_fragment_using_cid(coordMolNo, "//A/32-33/*");
    })

    test('Test gemmi', () => {
        console.log(cootModule.CoorFormat.Pdb)
        console.log(cootModule.CoorFormat.ChemComp)
        const st = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        console.log("structure", st)
        console.log("has_origx", st.has_origx)
        console.log("has_origx", st.has_origx)
        console.log("size", st.models.size())
        const model = st.first_model()
        console.log("mass of model", cootModule.calculate_mass_model(model))
        //cootModule.assign_cis_flags_structure(st)
        const chains = model.chains
        console.log("chains", chains)
        console.log("chains.size", chains.size())
        const sgp1 = cootModule.get_spacegroup_by_name('P1')
        console.log(sgp1)
        console.log("hm", cootModule.getSpaceGroupHMAsString(sgp1))
        console.log("hm(oo)", sgp1.hm())
        console.log("hall", cootModule.getSpaceGroupHallAsString(sgp1))
        console.log("hall(oo)", sgp1.hall())
        console.log("qualifier", cootModule.getSpaceGroupQualifierAsString(sgp1))
        console.log("qualifier(oo)", sgp1.qualifier())
        console.log("st.spacegroup_hm", st.spacegroup_hm)

        for (let i = 0; i < chains.size(); i++) {
            const ch = chains.get(i)
            console.log("chain mass", cootModule.calculate_mass_chain(ch))
            console.log("chain name", ch.name)
            const residues = ch.residues
            console.log(residues, residues.size())
            if (residues.size() > 0) {
                const res = residues.get(0)
                console.log(res)
                console.log(res.name)
                const atoms = res.atoms
                console.log(atoms, atoms.size())
                if (atoms.size() > 0) {
                    const at = atoms.get(0)
                    console.log("atom", at)
                    console.log("atom name", at.name)
                    console.log("atom element name", cootModule.getElementNameAsString(at.element))
                    console.log("atom serial no.", at.serial)
                    console.log("atom pos", at.pos.x, at.pos.y, at.pos.z)
                    console.log("atom occ", at.occ)
                    console.log("atom b_iso", at.b_iso)
                    console.log("atom padded name", at.padded_name())
                    const anisoRow0 = at.aniso.as_mat33().row_copy(0)
                    const anisoRow1 = at.aniso.as_mat33().row_copy(1)
                    const anisoRow2 = at.aniso.as_mat33().row_copy(2)
                    console.log("atom aniso row 1", anisoRow0.x, anisoRow0.y, anisoRow0.z)
                    console.log("atom aniso row 2", anisoRow1.x, anisoRow1.y, anisoRow1.z)
                    console.log("atom aniso row 3", anisoRow2.x, anisoRow2.y, anisoRow2.z)
                }
            }
            const waters = ch.get_waters_const()
            console.log(waters, waters.length())
            if (waters.length() > 0) {
                console.log("water", waters.at(0))
                console.log("water subchain_id", waters.subchain_id())
                const seq = waters.extract_sequence()
            }
            const ligands = ch.get_ligands_const()
            if (ligands.length() > 0) {
                console.log("ligand", ligands.at(0))
                console.log("ligand subchain_id", ligands.subchain_id())
            }
        }
    })

    test('Test add', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const ret = molecules_container.add(0)
        expect(ret).toBe(1)
    })

    test('Test delete methods', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const ret = molecules_container.delete_using_cid(coordMolNo, "A/4-104", "LITERAL");
        const ret_side = molecules_container.delete_side_chain(coordMolNo, "A", 154, "");
        console.log(ret);
        console.log(ret_side);
    })

    test('Test add_terminal_residue methods', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz',
            'FWT', 'PHWT', "", false, false)
        const setMapRes = molecules_container.set_imol_refinement_map(mapMolNo)
        const resSpec = new cootModule.residue_spec_t("A", 100, "");
        const res = molecules_container.get_residue(coordMolNo, resSpec)
        expect(res.nAtoms).toBe(14)
        console.log('nAtoms is', res.nAtoms)
        const ret = molecules_container.delete_using_cid(coordMolNo, "A/100-104", "LITERAL");
        const res1 = molecules_container.get_residue(coordMolNo, resSpec)
        expect(res1).toBe(null)
        const ret1 = molecules_container.add_terminal_residue_directly_using_cid(coordMolNo, "/*/A/99")
        const res2 = molecules_container.get_residue(coordMolNo, resSpec)
        expect(res2).not.toBe(null)
    })

    test('Test merge molecules', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const coordMolNo2 = molecules_container.read_pdb('./tm-A.pdb')
        const mergeMols = coordMolNo2.toString()
        const merge_info = molecules_container.merge_molecules(coordMolNo, mergeMols)
        expect(merge_info.second.size()).toBe(1)
        const mi0 = merge_info.second.get(0)
        expect(mi0.chain_id).toBe("C")
    })

    test('Get new rama info', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const rama_info = molecules_container.ramachandran_validation(coordMolNo)
        for (let i = 0; i < rama_info.size(); i++) {
            const ri = rama_info.get(i)
            const cart = ri.position
            const phi_psi = ri.phi_psi
            //console.log(cart.x(), cart.y(), cart.z())
            //console.log(phi_psi.phi(), phi_psi.psi())
        }
    })

    test('Test read_pdb from faux file system', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo).toBe(0)
    })

    test('Test read_mtz from faux file system', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz',
            'FWT', 'PHWT', "", false, false)
        expect(mapMolNo).toBe(0)
    })

    test('Create res spec', () => {
        const resSpec = new cootModule.residue_spec_t("A", 217, "");
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
    })

    test('Test Fill Rotamer tables', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.fill_rotamer_probability_tables()
    })

    test('Test get_single_letter_codes_for_chain', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.geometry_init_standard()
        const imol = molecules_container.read_pdb('./tm-A.pdb')
        const codes = molecules_container.get_single_letter_codes_for_chain(imol, "A")
        console.log(codes)
        for (let ic = 0; ic < codes.size(); ic++) {
            console.log(codes.get(ic).first.chain_id, codes.get(ic).second)
        }
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
        const dd = (CZatom.x - CZatom_x) * (CZatom.x - CZatom_x) + (CZatom.y - CZatom_y) * (CZatom.y - CZatom_y) + (CZatom.z - CZatom_z) * (CZatom.z - CZatom_z)
        const d = Math.sqrt(dd)
        expect(d).toBeCloseTo(7.28975, 5)
    })

    test('Test Rama mesh', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const simpleMesh = molecules_container.get_ramachandran_validation_markup_mesh(coordMolNo);
        expect(simpleMesh.vertices.size()).toBe(22052)
        expect(simpleMesh.triangles.size()).toBe(38144)
    })

    test('Test Dodo mesh', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const simpleMesh = molecules_container.get_rotamer_dodecs(coordMolNo);
        expect(simpleMesh.vertices.size()).toBe(39000)
        expect(simpleMesh.triangles.size()).toBe(23400)
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
            for (let j = 0; j < inst.vertices.size(); j++) {
                const vert = inst.vertices.get(j)
                //console.log(vert)
                //console.log(vert.pos)
                //console.log(vert.normal)
            }
            for (let j = 0; j < inst.instancing_data_A.size(); j++) {
                const inst_data = inst.instancing_data_A.get(j)
                //console.log("pos:",inst_data.position)
                //console.log("col",inst_data.colour)
                //console.log("size",inst_data.size)
            }
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
        const auto_res = molecules_container.auto_fit_rotamer(coordMolNo, "A", 89, "", "", mapMolNo)
    })

    test('Test flip_peptide by residue spec', () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo).toBe(0)

        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz',
            'FWT', 'PHWT', "", false, false)
        expect(mapMolNo).toBe(1)

        const atomSpec = new cootModule.atom_spec_t("A", 217, "", " N  ", "");
        const status = molecules_container.flipPeptide(coordMolNo, atomSpec, "")
        expect(status).toBe(1)
        const flippedFileName = "flip_out.pdb"
        const writeStatus = molecules_container.writePDBASCII(coordMolNo, flippedFileName)
        expect(writeStatus).toBe(0)
        const flippedFile = cootModule.FS.readFile(flippedFileName, { encoding: 'utf8' });
        //console.log(flippedFile)

        const atomSpecFalse = new cootModule.atom_spec_t("A", 999, "", " N  ", "");
        const failedStatus = molecules_container.flipPeptide(coordMolNo, atomSpecFalse, "")
        expect(failedStatus).toBe(0)
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
        expect(Math.abs(nVerticesDirect - 55000)).toBeLessThanOrEqual(3000)
        expect(Math.abs(nTriangles - 47024)).toBeLessThanOrEqual(3000)
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

})

const setupFunctions = {
    copyExampleDataToFauxFS: () => {
        const coordData_5fjj = fs.readFileSync(path.join(__dirname, '..', '..', 'example', '5fjj.pdb'), { encoding: 'utf8', flag: 'r' })
        cootModule.FS_createDataFile(".", '5fjj.pdb', coordData_5fjj, true, true);
        const coordData = fs.readFileSync(path.join(__dirname, '..', '..', 'example', '5a3h.pdb'), { encoding: 'utf8', flag: 'r' })
        cootModule.FS_createDataFile(".", '5a3h.pdb', coordData, true, true);
        const sigmaaData = fs.readFileSync(path.join(__dirname, '..', '..', 'example', '5a3h_sigmaa.mtz'), { encoding: null, flag: 'r' })
        cootModule.FS_createDataFile(".", '5a3h_sigmaa.mtz', sigmaaData, true, true);
        const rnaseSigmaaData = fs.readFileSync(path.join(__dirname, '..', '..', 'checkout', 'coot-1.0', 'data', 'rnasa-1.8-all_refmac1.mtz'), { encoding: null, flag: 'r' })
        cootModule.FS_createDataFile(".", 'rnasa-1.8-all_refmac1.mtz', rnaseSigmaaData, true, true);
        const tmCoordData = fs.readFileSync(path.join(__dirname, '..', '..', 'checkout', 'coot-1.0', 'api', 'tm-A.pdb'), { encoding: 'utf8', flag: 'r' })
        cootModule.FS_createDataFile(".", 'tm-A.pdb', tmCoordData, true, true);
        cootModule.FS.mkdir("COOT_BACKUP");
    }
}
