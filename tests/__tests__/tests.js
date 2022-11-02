
const fs = require('fs')
const path = require('path')
const createCootModule = require('../../coot/moorhen.js')

let cootModule;

beforeAll(() => {
    return createCootModule({
        print(t) { console.log(["output", t]) },
        printErr(t) { console.log(["output", t]); }
    }).then(moduleCreated => {
        cootModule = moduleCreated
        return Promise.resolve()
    })
})

describe('Testing molecules_container_js', () => {

    beforeAll(() => {
        setupFunctions.copyExampleDataToFauxFS()
    })

    test('Test read_pdb from faux file system', () => {
        const molecules_container = new cootModule.molecules_container_js()
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo).toBe(0)
    })

    test('Test read_mtz from faux file system', () => {
        const molecules_container = new cootModule.molecules_container_js()
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz',
            'FWT', 'PHWT', "", false, false)
        expect(mapMolNo).toBe(0)
    })

    test('Create res spec', () => {
        const resSpec = new cootModule.residue_spec_t("A", 217, "");
    })

    test('Test get_residue', () => {
        const resSpec = new cootModule.residue_spec_t("A", 217, "");
        const molecules_container = new cootModule.molecules_container_js()
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const res = molecules_container.get_residue(coordMolNo,resSpec)
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
        expect(atom.x).toBeCloseTo(70.783,3)
        expect(atom.y).toBeCloseTo(22.745,3)
        expect(atom.z).toBeCloseTo(32.692,3)
        expect(atom.GetSeqNum()).toBe(217)
        expect(atom.GetResidueNo()).toBe(213)
        expect(atom.tempFactor).toBeCloseTo(10.25,2)
        expect(atom.occupancy).toBeCloseTo(1.00,2)
        expect(atom.charge).toBeCloseTo(0.00,2)
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
    })

    test('Test Fill Rotamer tables', () => {
        const molecules_container = new cootModule.molecules_container_js()
        molecules_container.fill_rotamer_probability_tables()
    })

    test('Test get_single_letter_codes_for_chain', () => {
        const molecules_container = new cootModule.molecules_container_js()
        molecules_container.geometry_init_standard()
        const imol = molecules_container.read_pdb('./tm-A.pdb')
        const codes = molecules_container.get_single_letter_codes_for_chain(imol,"A")
        console.log(codes)
        for(let ic=0;ic<codes.size();ic++){
            console.log(codes.get(ic).first.chain_id,codes.get(ic).second)
        }
    })

    test('Test Auto-fit rotamer', () => {
        const molecules_container = new cootModule.molecules_container_js()
        molecules_container.geometry_init_standard()
        const imol = molecules_container.read_pdb('./tm-A.pdb')
        const imol_map = molecules_container.read_mtz("./rnasa-1.8-all_refmac1.mtz", "FWT", "PHWT", "W", false, false)
        const resSpec = new cootModule.residue_spec_t("A", 89, "");
        const res = molecules_container.get_residue(imol,resSpec)
        const CZatom = res.GetAtom(6);
        const CZatom_x = CZatom.x;
        const CZatom_y = CZatom.y;
        const CZatom_z = CZatom.z;
        const result = molecules_container.auto_fit_rotamer(imol, "A", 89, "", "", imol_map)
        const dd = (CZatom.x-CZatom_x) * (CZatom.x-CZatom_x) + (CZatom.y-CZatom_y) * (CZatom.y-CZatom_y) + (CZatom.z-CZatom_z) * (CZatom.z-CZatom_z)
        const d = Math.sqrt(dd)
        expect(d).toBeCloseTo(7.28975,5)
    })

    test('Test Rama mesh', () => {
        const molecules_container = new cootModule.molecules_container_js()
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const simpleMesh = molecules_container.ramachandran_validation_markup_mesh(coordMolNo);
        expect(simpleMesh.vertices.size()).toBe(35760)
        expect(simpleMesh.triangles.size()).toBe(38144)
    })

    test('Test Dodo mesh', () => {
        const molecules_container = new cootModule.molecules_container_js()
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const simpleMesh = molecules_container.get_rotamer_dodecs(coordMolNo);
        expect(simpleMesh.vertices.size()).toBe(39000)
        expect(simpleMesh.triangles.size()).toBe(23400)
    })

    test('Test backups', () => {
        const molecules_container = new cootModule.molecules_container_js()
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', "", false, false)
        const resSpec = new cootModule.residue_spec_t("A", 32, "");
        const res = molecules_container.get_residue(coordMolNo,resSpec)
        const atom = res.GetAtom(2);
        expect(atom.x).toBeCloseTo(67.271,3)
        expect(atom.y).toBeCloseTo(45.492,3)
        expect(atom.z).toBeCloseTo(24.559,3)
        molecules_container.flipPeptide_cid(coordMolNo,"A/33","")
        expect(atom.x).toBeCloseTo(67.623,3)
        expect(atom.y).toBeCloseTo(45.837,3)
        expect(atom.z).toBeCloseTo(25.588,3)
        molecules_container.undo(coordMolNo)
        // We seemingly need to re-get the residue after restore.
        const res2 = molecules_container.get_residue(coordMolNo,resSpec)
        const atom2 = res2.GetAtom(2);
        expect(atom2.x).toBeCloseTo(67.271,3)
        expect(atom2.y).toBeCloseTo(45.492,3)
        expect(atom2.z).toBeCloseTo(24.559,3)
        const auto_res = molecules_container.auto_fit_rotamer(coordMolNo, "A", 89, "", "", mapMolNo)
    })

    test('Test flip_peptide by residue spec', () => {
        const molecules_container = new cootModule.molecules_container_js()
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo).toBe(0)

        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz',
            'FWT', 'PHWT', "", false, false)
        expect(mapMolNo).toBe(1)

        const atomSpec = new cootModule.atom_spec_t("A", 217, "", " N  ","");
        const status = molecules_container.flipPeptide(coordMolNo, atomSpec, "")
        expect(status).toBe(1)
        const flippedFileName = "flip_out.pdb"
        const writeStatus = molecules_container.writePDBASCII(coordMolNo,flippedFileName)
        expect(writeStatus).toBe(0)
        const flippedFile = cootModule.FS.readFile(flippedFileName, { encoding: 'utf8' });
        //console.log(flippedFile)

        const atomSpecFalse = new cootModule.atom_spec_t("A", 999, "", " N  ","");
        const failedStatus = molecules_container.flipPeptide(coordMolNo, atomSpecFalse, "")
        expect(failedStatus).toBe(0)
    })

    test('Create Density Map Mesh', () => {
        const molecules_container = new cootModule.molecules_container_js()
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
        expect(Math.abs(nVerticesDirect-50000)).toBeLessThanOrEqual(2000)
        expect(Math.abs(nTriangles-47024)).toBeLessThanOrEqual(2000)
    })

    test('Create test origin', () => {
        const molecules_container = new cootModule.molecules_container_js()
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
        expect(t_x).toBeCloseTo(-5,5)
        expect(t_y).toBeCloseTo(5,5)
        expect(t_z).toBeCloseTo(-5,5)
        expect(n_x).toBeCloseTo(0,5)
        expect(n_y).toBeCloseTo(0,5)
        expect(n_z).toBeCloseTo(-1,5)
        expect(c_r).toBeCloseTo(0.5,5)
        expect(c_g).toBeCloseTo(0.2,5)
        expect(c_b).toBeCloseTo(0.5,5)
        expect(c_a).toBeCloseTo(1.0,5)
    })

})

const setupFunctions = {
    copyExampleDataToFauxFS: () => {
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
