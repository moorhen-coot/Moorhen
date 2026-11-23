/*
 * The coot module must keep its emscripten runtime alive.
 *
 * If it does not, the first callback the glue runs on the main thread makes emscripten exit the
 * runtime, which terminates every pthread worker, including the threads of coot's own pool. In a
 * browser the next call that needs a thread then never returns. See the comment at the top of
 * wasm_src/moorhen-wrappers.cc and the INCOMING_MODULE_JS_API lists in wasm_src/CMakeLists.txt.
 *
 * Shrinking coot's thread pool is a cheap way to get such a callback: the threads that leave the
 * pool exit, and emscripten cleans each of them up from the main thread's event loop.
 *
 * Emscripten only ever calls Worker.terminate() when it shuts the runtime down or a thread is
 * cancelled, so no call to it is expected here.
 */
const { Worker } = require('node:worker_threads')
const createCootModule = require('../../public/MoorhenAssets/wasm/moorhen')

jest.setTimeout(60000)

afterEach(() => {
    jest.restoreAllMocks()
})

describe("Testing the lifetime of the emscripten runtime", () => {

    test("Test the runtime is kept alive after a callback on the main thread", async () => {
        const terminate = jest.spyOn(Worker.prototype, 'terminate')

        const cootModule = await createCootModule({
            print: () => { },
            printErr: () => { },
        })
        const molecules_container = new cootModule.molecules_container_js(false)

        molecules_container.set_max_number_of_threads(8)
        molecules_container.set_max_number_of_threads(4)
        // The clean-up of the four threads that left the pool happens on the event loop.
        await new Promise(resolve => setTimeout(resolve, 1000))

        expect(terminate).not.toHaveBeenCalled()

        // Only reached with a live runtime: deleting the container joins the pool's threads, and
        // that never returns once they have been terminated.
        molecules_container.delete()
    })
})
