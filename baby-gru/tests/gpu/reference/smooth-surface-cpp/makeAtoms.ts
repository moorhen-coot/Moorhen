/**
 * atoms.bin for smoothSurfaceReference.cc: the first `count` non-water atoms of a PDB file, sized as
 * the app sizes them (surfaceAtomRadius), a residue index per chain and number, probe 1.4.
 *
 *   npx esbuild tests/gpu/reference/smooth-surface-cpp/makeAtoms.ts --bundle --platform=node --outfile=/tmp/makeAtoms.js
 *   node /tmp/makeAtoms.js tests/test_data/1df7.pdb 40 /tmp/atoms.bin
 */
import { readFileSync, writeFileSync } from "fs";
import { surfaceAtomRadius } from "../../../../src/utils/m2tAtomRadii";

const [path, count, outPath] = process.argv.slice(2);
const lines = readFileSync(path, "utf8").split("\n")
    .filter(line => /^(ATOM|HETATM)/.test(line) && line.slice(17, 20) !== "HOH" && [" ", "A"].includes(line[16]))
    .slice(0, Number(count));
const residues = new Map<string, number>();
const packed = new Float32Array(4 * lines.length);
const residueOf = new Int32Array(lines.length);
lines.forEach((line, i) => {
    const element = line.length >= 78 ? line.slice(76, 78).trim() : line.slice(12, 14).trim();
    packed.set([+line.slice(30, 38), +line.slice(38, 46), +line.slice(46, 54), surfaceAtomRadius(line.slice(12, 16), line.slice(17, 20), element)], 4 * i);
    const key = `${line[21]}/${line.slice(22, 27).trim()}`;
    if (!residues.has(key)) residues.set(key, residues.size);
    residueOf[i] = residues.get(key);
});
writeFileSync(outPath, Buffer.concat([new Uint32Array([lines.length]), packed, residueOf, new Float32Array([1.4])].map(a => Buffer.from(a.buffer))));
