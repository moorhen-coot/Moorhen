#!/usr/bin/env node
/**
 * Write Brotli (.br) and gzip (.gz) copies next to the large static files of a Moorhen build,
 * for a web server that serves pre-compressed copies (see the .htaccess rules for the York site).
 *
 *   node scripts/compress-assets.mjs <folder> [--ext wasm,js]
 *
 * Uses only Node's built-in zlib, so there is nothing to install.
 *
 * Each copy is given the same modification time as its source, and is regenerated whenever the
 * two times differ. So running this after every deploy refreshes exactly the copies whose source
 * changed, and a copy can never be left behind from an older build: that would make the server
 * send old WASM alongside new JavaScript.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import zlib from "node:zlib";

const brotliCompress = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

const args = process.argv.slice(2);
const extIndex = args.indexOf("--ext");
const extensions = (extIndex >= 0 ? args.splice(extIndex, 2)[1] : "wasm")
    .split(",")
    .map(ext => "." + ext.replace(/^\./, ""));
const root = args[0];
if (!root) {
    console.error("Usage: node scripts/compress-assets.mjs <folder> [--ext wasm,js]");
    process.exit(1);
}

async function* walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(full);
        else if (entry.isFile() && extensions.includes(path.extname(entry.name))) yield full;
    }
}

const encoders = {
    ".br": data =>
        brotliCompress(data, {
            params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
                [zlib.constants.BROTLI_PARAM_LGWIN]: zlib.constants.BROTLI_MAX_WINDOW_BITS,
                [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length,
            },
        }),
    ".gz": data => gzip(data, { level: zlib.constants.Z_BEST_COMPRESSION }),
};

async function compressFile(file) {
    const source = await fs.stat(file);
    let data = null;
    const sizes = [];
    for (const [suffix, encode] of Object.entries(encoders)) {
        const target = file + suffix;
        const existing = await fs.stat(target).catch(() => null);
        // Times are compared to the millisecond, since that is all utimes keeps.
        if (existing && Math.abs(existing.mtimeMs - source.mtimeMs) < 1) {
            sizes.push(`${suffix} ${(existing.size / 1e6).toFixed(2)} MB (unchanged)`);
            continue;
        }
        data ??= await fs.readFile(file);
        const compressed = await encode(data);
        await fs.writeFile(target, compressed);
        await fs.utimes(target, source.atime, source.mtime);
        sizes.push(`${suffix} ${(compressed.length / 1e6).toFixed(2)} MB`);
    }
    console.log(`${path.relative(root, file)}: ${(source.size / 1e6).toFixed(2)} MB -> ${sizes.join(", ")}`);
}

const files = [];
for await (const file of walk(root)) files.push(file);
if (files.length === 0) {
    console.warn(`No ${extensions.join(", ")} files found under ${root}`);
}
await Promise.all(files.map(compressFile));
