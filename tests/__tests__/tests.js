
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
        molecules_container.flipPeptide_rs(coordMolNo, resSpec, "")
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