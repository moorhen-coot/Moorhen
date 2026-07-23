import moorhen_test_use_gemmi from '../MoorhenTestsSettings'

jest.setTimeout(40000)

const fs = require('fs')
const path = require('path')
const {gzip, ungzip} = require('node-gzip');
const createCootModule = require('../../public/MoorhenAssets/wasm/moorhen')

let cootModule;
let cleanUpVariables = []

beforeAll(() => {
    return createCootModule({
        print(t) { () => console.log(["output", t]) },
        printErr(t) { () => console.log(["output", t]); }
    }).then(moduleCreated => {
        cootModule = moduleCreated
        return setupFunctions.copyTestDataToFauxFS()
    })
})

afterAll(() => {
    setupFunctions.removeTestDataFromFauxFS()
})

let molecules_container = null

describe('Testing Privateer methods', () => {

    beforeEach(() => {
        if (molecules_container !== null) {
            molecules_container.delete?.()
        }
        molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.set_use_gemmi(moorhen_test_use_gemmi)
    })

    afterEach(() => {
        cleanUpVariables.forEach(item => {
            if (typeof item.delete === 'function' && !item.isDeleted()) {
                item.delete()
            }
        })
        cleanUpVariables = []
    })

    test("privateer_validate", () => {
        const fileContents = cootModule.FS.readFile('./5fjj.pdb')
        const results = cootModule.validate(fileContents,"thing.cif")
        const first = results.get(0)
        expect(first.wurcs).toBe("WURCS=2.0/2,3,2/[a2122h-1b_1-5_2*NCC/3=O][a1122h-1b_1-5]/1-1-2/a4-b1_b4-c1")
        expect(results.size()).toBe(38)
        cleanUpVariables.push(results)
    });

})

const testDataFiles = ['5fjj.pdb']

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
        const cootDataZipped = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'MoorhenAssets', 'data.tar.gz' ), { encoding: null, flag: 'r' })
        return ungzip(cootDataZipped).then((cootData) => {
            cootModule.FS.mkdir("data_tmp")
            cootModule.FS_createDataFile("data_tmp", "data.tar", cootData, true, true);
            cootModule.unpackCootDataFile("data_tmp/data.tar",false,"","")
            cootModule.FS_unlink("data_tmp/data.tar")
        })
    }
}
