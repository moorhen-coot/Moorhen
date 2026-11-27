/**
 * Copies the hand-written .d.ts files under src/ into dist/types/src/, at the same relative paths.
 *
 * tsc only emits declarations for .ts/.tsx files, so it leaves out hand-written ones such as
 * src/types/moorhen.d.ts, src/types/gemmi.d.ts or sequence-viewer/MoorhenSeqViewTypes.d.ts. The
 * emitted declarations still import them (`../types/moorhen`), so without this copy the whole
 * `moorhen`, `gemmi` and `libcoot` namespaces resolve to nothing, and consumers get `any`.
 *
 * Run it after `tsc --emitDeclarationOnly` and before `tsc-alias`: tsc-alias only rewrites an
 * `@/…` import whose target exists in the output, so `@/types/moorhen` stays unresolved otherwise.
 *
 * webpack also copies src/types/ to dist/types/ (no `src/`); that copy is what the `moorhen/types/*`
 * export points to, so it is kept.
 */
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const out = join(root, "dist", "types", "src");

async function* declarationFiles(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) yield* declarationFiles(path);
        else if (entry.name.endsWith(".d.ts")) yield path;
    }
}

let count = 0;
for await (const file of declarationFiles(src)) {
    const target = join(out, relative(src, file));
    await mkdir(dirname(target), { recursive: true });
    await copyFile(file, target);
    count++;
}
console.log(`copy-declarations: ${count} hand-written .d.ts files copied to ${relative(root, out)}`);
