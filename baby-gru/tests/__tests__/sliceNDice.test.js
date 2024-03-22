
jest.setTimeout(40000)

const fs = require('fs')
const path = require('path')
const createCootModule = require('../../public/baby-gru/wasm/moorhen')

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

describe('Testing slice-n-dice', () => {
    afterEach(() => {
        cleanUpVariables.forEach(item => {
            if (typeof item.delete === 'function' && !item.isDeleted()) {
                item.delete()
            }
        })
        cleanUpVariables = []
    })

    test("Test kmeans", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.set_use_gemmi(false)
        
        const coordMol = molecules_container.read_pdb('./7rb4.pdb')
        expect(coordMol).toBe(0)
        
        const retVal = molecules_container.slicendice_slice(coordMol, 5, "kmeans", "")
        expect(retVal.size()).toBe(603)
        
        const data = parseSliceNDiceResult(retVal)
        const slices = [...new Set(data.map(item => item.slice))].sort()
        expect(slices).toEqual([0, 1, 2, 3, 4])
        
        cleanUpVariables.push(retVal)
    })

    test("Test birch", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.set_use_gemmi(false)
        
        const coordMol = molecules_container.read_pdb('./7rb4.pdb')
        expect(coordMol).toBe(0)
        
        const retVal = molecules_container.slicendice_slice(coordMol, 5, "birch", "")
        expect(retVal.size()).toBe(603)
        
        const data = parseSliceNDiceResult(retVal)
        const slices = [...new Set(data.map(item => item.slice))].sort()
        expect(slices).toEqual([0, 1, 2, 3, 4])
        
        cleanUpVariables.push(retVal)
    })

    test("Test agglomerative", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.set_use_gemmi(false)
        
        const coordMol = molecules_container.read_pdb('./7rb4.pdb')
        expect(coordMol).toBe(0)
        
        const retVal = molecules_container.slicendice_slice(coordMol, 5, "agglomerative", "")
        expect(retVal.size()).toBe(603)
        
        const data = parseSliceNDiceResult(retVal)
        const slices = [...new Set(data.map(item => item.slice))].sort()
        expect(slices).toEqual([0, 1, 2, 3, 4])
        
        cleanUpVariables.push(retVal)
    })

    test("Test pae", () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.set_use_gemmi(false)
        
        const coordMol = molecules_container.read_pdb('./7rb4.pdb')
        expect(coordMol).toBe(0)

        const paeFileName = path.join(__dirname, '..', 'test_data', 'PAE_test_file.json')
        const paeFileContents = fs.readFileSync(paeFileName, { encoding: 'utf8', flag: 'r' })
        expect(paeFileContents.length).toBeGreaterThan(0)
        
        const retVal = molecules_container.slicendice_slice(coordMol, 5, "pae", paeFileContents)
        expect(retVal.size()).toBe(603)
        
        const data = parseSliceNDiceResult(retVal)
        const slices = [...new Set(data.map(item => item.slice))].sort()
        expect(slices).toEqual([0, 1, 2, 3, 4])
        
        cleanUpVariables.push(retVal)
    })
})

const testDataFiles = ['7rb4.pdb','PAE_test_file.json']

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
