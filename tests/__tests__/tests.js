
const fs = require('fs')
const path = require('path')
const createCootModule = require('../../coot/mini-rsr-web.js')

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

    test('Test flip_peptide by residue spec', () => {
        const molecules_container = new cootModule.molecules_container_js()
        const coordMolNo = molecules_container.read_pdb('./5a3h.pdb')
        expect(coordMolNo).toBe(0)

        const mapMolNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz',
            'FWT', 'PHWT', "", false, false)
        expect(mapMolNo).toBe(1)

        const resSpec = new cootModule.residue_spec_t("A", 217, "");
        const status = molecules_container.flipPeptide_rs(coordMolNo, resSpec, "")
        expect(status).toBe(1)
        const flippedFileName = "flip_out.pdb"
        const writeStatus = molecules_container.writePDBASCII(coordMolNo,flippedFileName)
        console.log(writeStatus)
        const flippedFile = cootModule.FS.readFile(flippedFileName, { encoding: 'utf8' });
        //console.log(flippedFile)

        const resSpecFalse = new cootModule.residue_spec_t("A", 999, "");
        const failedStatus = molecules_container.flipPeptide_rs(coordMolNo, resSpecFalse, "")
        expect(failedStatus).toBe(0)
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
        expect(secondTri_idxs[1]).toBe(2)
        expect(secondTri_idxs[2]).toBe(3)
    })

})

const setupFunctions = {
    copyExampleDataToFauxFS: () => {
        const coordData = fs.readFileSync(path.join(__dirname, '..', '..', 'example', '5a3h.pdb'),
            { encoding: 'utf8', flag: 'r' })
            cootModule.FS_createDataFile(".", '5a3h.pdb', coordData, true, true);
        const sigmaaData = fs.readFileSync(path.join(__dirname, '..', '..', 'example', '5a3h_sigmaa.mtz'),
            { encoding: null, flag: 'r' })
            cootModule.FS_createDataFile(".", '5a3h_sigmaa.mtz', sigmaaData, true, true);
    }
}
