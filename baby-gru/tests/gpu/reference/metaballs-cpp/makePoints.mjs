// Points for metaballsReference.cc from the first N non-water atoms of a PDB file, as the GPU
// test makes them (tests/gpu/cases/metaballs.case.ts): radius 0.67 * size / 1.7 in float32.
//   node tests/gpu/reference/metaballs-cpp/makePoints.mjs tests/test_data/1df7.pdb 16 points.bin
import { readFileSync, writeFileSync } from "fs";

const [, , pdb, count, out] = process.argv;
const SIZE = { C: 1.7, N: 1.55, O: 1.52, S: 1.8, P: 1.8, H: 1.1 };
const COLOUR = { C: [0.6, 0.6, 0.6, 1], N: [0.2, 0.3, 1, 1], O: [1, 0.2, 0.2, 1], S: [1, 0.9, 0.2, 1] };
const f = Math.fround;
const lines = readFileSync(pdb, "utf8").split("\n")
    .filter(line => /^(ATOM|HETATM)/.test(line) && line.slice(17, 20) !== "HOH")
    .slice(0, Number(count));
const points = [], colours = [];
for (const line of lines) {
    const element = (line.slice(76, 78).trim() || line.slice(12, 14).trim()[0]).toUpperCase();
    points.push(+line.slice(30, 38), +line.slice(38, 46), +line.slice(46, 54), f(f(f(0.67) * f(SIZE[element] ?? 1.7)) / f(1.7)));
    colours.push(...(COLOUR[element] ?? [0, 1, 0, 1]));
}
const n = lines.length;
const buffer = Buffer.alloc(4 + n * 32);
buffer.writeUInt32LE(n, 0);
Buffer.from(new Float32Array(points).buffer).copy(buffer, 4);
Buffer.from(new Float32Array(colours).buffer).copy(buffer, 4 + n * 16);
writeFileSync(out, buffer);
console.log(`${n} points from ${pdb}`);
