// Run before `npm test` (32) and `npm run test64` (64): checks that the WebAssembly build the
// tests need has been compiled, and that this Node can run it, so the run fails at once with a
// clear message instead of part-way through the suite.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const bits = process.argv[2];
if (bits !== '32' && bits !== '64') {
    console.error('Usage: node scripts/check-test-wasm.mjs 32|64');
    process.exit(2);
}

const wasmDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/MoorhenAssets/wasm');
const suffix = bits === '64' ? '64' : '';
const buildCommand = bits === '64' ? './moorhen_build.sh --64bit' : './moorhen_build.sh';
const problems = [];

for (const name of [`moorhen${suffix}`, `gemmi${suffix}`]) {
    for (const ext of ['.js', '.wasm']) {
        const file = path.join(wasmDir, name + ext);
        if (!fs.existsSync(file)) {
            problems.push(`missing ${path.relative(process.cwd(), file)}`);
        }
    }
}
if (problems.length > 0) {
    problems.push(`Build it from the top of the Moorhen checkout with: ${buildCommand}`);
}

// The Emscripten glue states the oldest Node it runs on, and refuses to start on anything older.
const glue = path.join(wasmDir, `moorhen${suffix}.js`);
if (fs.existsSync(glue)) {
    const match = fs.readFileSync(glue, 'utf8').match(/currentNodeVersion<([0-9.e]+)/);
    if (match) {
        // Emscripten packs the version as major*10000 + minor*100 + patch.
        const required = Number(match[1]);
        const [major, minor, patch] = process.versions.node.split('.').map(Number);
        if (major * 10000 + minor * 100 + patch < required) {
            const want = `${Math.floor(required / 10000)}.${Math.floor(required / 100) % 100}.${required % 100}`;
            problems.push(`the ${bits}-bit build needs Node ${want} or later; this is Node ${process.versions.node}`);
        }
    }
}

if (problems.length > 0) {
    console.error(`Cannot run the ${bits}-bit tests:\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
}
console.log(`Testing the ${bits}-bit WebAssembly build (Node ${process.versions.node}).`);
