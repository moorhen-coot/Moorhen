/*
 * Chooses which WebAssembly build of libcoot and gemmi the Jest tests load.
 *
 *   npm test        -> moorhen.js   / gemmi.js    (32-bit)
 *   npm run test64  -> moorhen64.js / gemmi64.js  (64-bit, memory64)
 *
 * test64 sets MOORHEN_TEST_MEMORY64=1; anything else gives the 32-bit build. Tests take the
 * module factories from here instead of requiring a build by name, so one test file covers both.
 *
 * The getters mean a test only loads the modules it destructures.
 *
 * In the 64-bit build, bound functions that return size_t give a BigInt, not a Number, so tests
 * that compare such a value wrap it in Number().
 */
const path = require('path');

const memory64 = process.env.MOORHEN_TEST_MEMORY64 === '1';
const suffix = memory64 ? '64' : '';
const wasmDir = path.resolve(__dirname, '../public/MoorhenAssets/wasm');

module.exports = {
    memory64,
    get createCootModule() {
        return require(path.join(wasmDir, `moorhen${suffix}.js`));
    },
    get createGemmiModule() {
        return require(path.join(wasmDir, `gemmi${suffix}.js`));
    },
};
