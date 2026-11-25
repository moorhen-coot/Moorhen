/*
 * The thread limit for coot and the size of the pthread worker pool are worked out together
 * when the module starts (wasm_src/coot_env_web.js): the pool has to hold the threads of coot's
 * thread pool, the threads that one call may start, and a margin. CootWorker gives
 * moorhenThreadLimit to set_max_number_of_threads().
 *
 * Under jest the pool itself is made smaller (tests/__mocks__/moorhenTransformer.cjs); these
 * tests are about the numbers that the module reports.
 */
const createCootModule = require('../../public/MoorhenAssets/wasm/moorhen')

jest.setTimeout(60000)

const quiet = { print: () => { }, printErr: () => { } }

describe("Testing the thread limit of the coot module", () => {

    test("Test the default limit is the number of cores, at least 4 and at most 8", async () => {
        const cootModule = await createCootModule({ ...quiet })
        const cores = globalThis.navigator?.hardwareConcurrency || 4
        expect(cootModule.moorhenThreadLimit).toBe(Math.min(Math.max(cores, 4), 8))
        expect(cootModule.moorhenPthreadPoolSize).toBe(2 * cootModule.moorhenThreadLimit + 4)
    })

    test("Test a limit passed in the module options is used", async () => {
        const cootModule = await createCootModule({ ...quiet, moorhenThreadLimit: 3 })
        expect(cootModule.moorhenThreadLimit).toBe(3)
        expect(cootModule.moorhenPthreadPoolSize).toBe(10)
    })

    test("Test a limit that makes no sense is replaced by the default", async () => {
        const cootModule = await createCootModule({ ...quiet, moorhenThreadLimit: 0 })
        expect(cootModule.moorhenThreadLimit).toBeGreaterThanOrEqual(4)
        expect(cootModule.moorhenThreadLimit).toBeLessThanOrEqual(8)
        expect(cootModule.moorhenPthreadPoolSize).toBe(2 * cootModule.moorhenThreadLimit + 4)
    })

    test("Test coot works with the limit that the module reports", async () => {
        const cootModule = await createCootModule({ ...quiet, moorhenThreadLimit: 2 })
        const molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.set_max_number_of_threads(cootModule.moorhenThreadLimit)
        molecules_container.delete()
    })
})
