import moorhen_test_use_gemmi from '../MoorhenTestsSettings'

jest.setTimeout(40000)

const fs = require('fs')
const path = require('path')
const createCootModule = require('../../public/moorhen')

let cootModule;
let cleanUpVariables = []

const parseSliceNDiceResult = (vectorData) => {
    let result = []
    const vectorSize = vectorData.size()
    for (let i = 0; i < vectorSize; i++) {
        const pair = vectorData.get(i)
        const residue = pair.first
        const slice = pair.second
        const jspair = {residue: residue, slice: slice }
        result.push(jspair)
    }
    return result
}

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

describe('Testing slice-n-dice', () => {

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

    test("Test kmeans", () => {
        const coordMol = molecules_container.read_pdb('./AF-A5YKK6-F1-model_v4.pdb')
        expect(coordMol).toBe(0)
        
        const retVal = molecules_container.slicendice_slice(coordMol, 5, "kmeans", "")
        expect(retVal.size()).toBe(2376)
        
        const data = parseSliceNDiceResult(retVal)
        const slices = [...new Set(data.map(item => item.slice))].sort()
        expect(slices).toEqual([0, 1, 2, 3, 4])
        
        cleanUpVariables.push(retVal)
    })

    test("Test birch", () => {
        const coordMol = molecules_container.read_pdb('./AF-A5YKK6-F1-model_v4.pdb')
        expect(coordMol).toBe(0)
        
        const retVal = molecules_container.slicendice_slice(coordMol, 5, "birch", "")
        expect(retVal.size()).toBe(2376)
        
        const data = parseSliceNDiceResult(retVal)
        const slices = [...new Set(data.map(item => item.slice))].sort()
        expect(slices).toEqual([0, 1, 2, 3, 4])
        
        cleanUpVariables.push(retVal)
    })

    test("Test agglomerative", () => {
        const coordMol = molecules_container.read_pdb('./AF-A5YKK6-F1-model_v4.pdb')
        expect(coordMol).toBe(0)
        
        const retVal = molecules_container.slicendice_slice(coordMol, 5, "agglomerative", "")
        expect(retVal.size()).toBe(2376)
        
        const data = parseSliceNDiceResult(retVal)
        const slices = [...new Set(data.map(item => item.slice))].sort()
        expect(slices).toEqual([0, 1, 2, 3, 4])
        
        cleanUpVariables.push(retVal)
    })

    test("Test pae", () => {
        const coordMol = molecules_container.read_pdb('./AF-A5YKK6-F1-model_v4.pdb')
        expect(coordMol).toBe(0)

        const paeFileName = path.join(__dirname, '..', 'test_data', 'AF-A5YKK6-F1-predicted_aligned_error_v4.json')
        const paeFileContents = fs.readFileSync(paeFileName, { encoding: 'utf8', flag: 'r' })
        expect(paeFileContents.length).toBeGreaterThan(0)
        
        const retVal = molecules_container.slicendice_slice(coordMol, 5, "pae", paeFileContents)
        expect(retVal.size()).toBe(2376)
        
        const data = parseSliceNDiceResult(retVal)
        const slices = [...new Set(data.map(item => item.slice))].sort()
        expect(slices).toEqual([0, 1, 2, 3, 4])
        
        cleanUpVariables.push(retVal)
    })
})

const testDataFiles = ['AF-A5YKK6-F1-predicted_aligned_error_v4.json', 'AF-A5YKK6-F1-model_v4.pdb']

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
