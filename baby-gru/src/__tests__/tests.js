
const fs = require('fs')
const path = require('path')
const createCootModule = require('../../public/moorhen.js')
const cootWorker = new Worker('../../public/CootWorker.js')


let cootModule;

const createCootModuleParams = {
    print(t) { console.log(["output", t]) },
    printErr(t) { console.log(["output", t]); }
};

describe('Testing molecules_container_js', () => {

    beforeAll(() => {
        return createCootModule(createCootModuleParams).then(moduleCreated => {
            cootModule = moduleCreated
            setupFunctions.copyExampleDataToFauxFS()
            return Promise.resolve()
        })
    })

    test('Test read_pdb from faux file system', () => {
        const molecules_container = new cootModule.molecules_container_js()
        const molNo = molecules_container.read_pdb('./5a3h.pdb')
        expect(molNo).toBe(0)
    })

    test('Test read_mtz from faux file system', () => {
        const molecules_container = new cootModule.molecules_container_js()
        const molNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz',
            'FWT', 'PHWT', "", false, false)
        expect(molNo).toBe(0)
    })

    test('Create res spec', () => {
        const resSpec = new cootModule.residue_spec_t("A", 217, "");
    })

    test('Test flip_peptide by residue spec', () => {
        const molecules_container = new cootModule.molecules_container_js()
        const molNo = molecules_container.read_pdb('./5a3h.pdb')
        expect(molNo).toBe(0)

        const molNo = molecules_container.read_mtz('./5a3h_sigmaa.mtz',
            'FWT', 'PHWT', "", false, false)
        expect(molNo).toBe(1)

        const resSpec = new cootModule.residue_spec_t("A", 217, "");
        const status = molecules_container.flipPeptide_rs(molNo, resSpec, "")
        expect(status).toBe(1)

        const resSpecFalse = new cootModule.residue_spec_t("A", 999, "");
        const failedStatus = molecules_container.flipPeptide_rs(molNo, resSpecFalse, "")
        expect(failedStatus).toBe(0)
    })

    test('Create test origin', () => {
        const molecules_container = new cootModule.molecules_container_js()
        const simpleMesh = molecules_container.test_origin_cube();
        const nVertices = molecules_container.count_simple_mesh_vertices(simpleMesh)
        expect(nVertices).toBe(24)
    })

})

const setupFunctions = {
    copyExampleDataToFauxFS: () => {
        const coordData = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'example', '5a3h.pdb'),
            { encoding: 'utf8', flag: 'r' })
        cootModule.FS_createDataFile(".", '5a3h.pdb', coordData, true, true);
        const sigmaaData = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'example', '5a3h_sigmaa.mtz'),
            { encoding: null, flag: 'r' })
        cootModule.FS_createDataFile(".", '5a3h_sigmaa.mtz', sigmaaData, true, true);
    }
}
