/**
 * Puts Draco's decoder where Moorhen serves its runtime assets from.
 *
 * Moorhen loads it at runtime rather than through a bundler, deliberately: the file contains a
 * `require("fs")` inside a branch a browser never takes, and persuading both Vite and the webpack
 * webcomponent build to ignore that is two configurations to keep working. So it is copied beside
 * the Coot and gemmi modules, and fetched from there.
 *
 * Both destinations matter, and only one of them is obvious.
 *
 * public/MoorhenAssets/wasm is where the Vite dev server and the webpack copy of public/ both
 * take it from.
 *
 * dist/public/MoorhenAssets/wasm is where the *webcomponent* dev server looks, because
 * vite.WebC.config.mts sets publicDir to dist/public. That directory is normally filled by
 * webpack's copy of public/, which happens during a build - so between a bare copy-draco and the
 * next full build, the webcomponent would not see the decoder at all. Mirroring it here when the
 * directory already exists closes that gap without pretending to replace the webpack copy.
 */
import { copyFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const from = join(root, "node_modules", "draco3dgltf");

// The glue is named for Node in the package, which is misleading - it detects its environment and
// the Node branch is simply not taken in a browser. Copied under a name that does not imply
// otherwise to whoever reads the directory next.
const GLUE_SOURCE = "draco_decoder_gltf_nodejs.js";
const GLUE = "draco_decoder_gltf.js";
const WASM = "draco_decoder_gltf.wasm";

const exists = async path => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

const installInto = async directory => {
    await mkdir(directory, { recursive: true });
    await copyFile(join(from, GLUE_SOURCE), join(directory, GLUE));
    await copyFile(join(from, WASM), join(directory, WASM));
    console.log(`draco decoder -> ${directory}`);
};

if (!await exists(from)) {
    throw new Error("draco3dgltf is not installed; run npm install");
}

await installInto(join(root, "public", "MoorhenAssets", "wasm"));

if (await exists(join(root, "dist", "public"))) {
    await installInto(join(root, "dist", "public", "MoorhenAssets", "wasm"));
}
