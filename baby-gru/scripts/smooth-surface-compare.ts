/**
 * Compare the C++ smooth surface (wasm_src/smooth-surface.cc) with the TS it was ported from
 * (src/utils/smoothSurface.ts), on the same atoms and options: the field, the mesh, each vertex's
 * atoms, and the time each takes.
 *
 *   g++ -O2 -std=c++17 ../wasm_src/smooth-surface.cc ../wasm_src/smooth-surface-test.cc -o /tmp/smooth-surface-test
 *   npx esbuild scripts/smooth-surface-compare.ts --bundle --platform=node --outfile=/tmp/smooth-surface-compare.js
 *   node /tmp/smooth-surface-compare.js tests/test_data/1df7.pdb /tmp/smooth-surface-test [work dir]
 *
 * Atoms as the app makes them (smoothSurfaceAtoms): the first model's standard amino acids, M2T's
 * united-atom radii, a residue per chain and number; rounded to float32, as the worker gets them.
 */
import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { m2tAtomRadius } from "../src/utils/m2tAtomRadii";
import { sesField, smoothSurfaceFromAtomsSync, smoothSurfaceSetting } from "../src/utils/smoothSurface";

const PROTEIN = new Set(["ALA", "CYS", "ASP", "GLU", "PHE", "GLY", "HIS", "ILE", "LYS", "LEU", "MET", "MSE", "ASN", "PRO", "GLN", "ARG",
    "SER", "THR", "VAL", "TRP", "TYR"]);

type Record = { name: string; res: string; x: number; y: number; z: number; model: string; chain: string; resNo: string };

function readAtoms(path: string): Record[] {
    const text = readFileSync(path, "utf8");
    const out: Record[] = [];
    if (/\.pdb$/i.test(path)) {
        let model = "1";
        for (const l of text.split("\n")) {
            if (l.startsWith("MODEL")) model = l.slice(10).trim();
            if (/^(ATOM|HETATM)/.test(l)) out.push({ name: l.slice(12, 16), res: l.slice(17, 20).trim(), x: +l.slice(30, 38),
                y: +l.slice(38, 46), z: +l.slice(46, 54), model, chain: l[21], resNo: l.slice(22, 27).trim() });
        }
        return out;
    }
    const lines = text.split("\n");
    let i = lines.findIndex(l => l.startsWith("_atom_site."));
    const keys: string[] = [];
    while (lines[i].startsWith("_atom_site.")) keys.push(lines[i++].trim().slice(11));
    const k = (n: string) => keys.indexOf(n);
    for (; i < lines.length && !lines[i].startsWith("#") && !lines[i].startsWith("loop_"); i++) {
        const t = lines[i].match(/"[^"]*"|'[^']*'|\S+/g);
        if (!t || t.length < keys.length) continue;
        const name = t[k("auth_atom_id")].replace(/^["']|["']$/g, "");
        out.push({ name: name.length < 4 ? ` ${name}`.padEnd(4) : name, res: t[k("auth_comp_id")], x: +t[k("Cartn_x")], y: +t[k("Cartn_y")],
            z: +t[k("Cartn_z")], model: t[k("pdbx_PDB_model_num")], chain: t[k("auth_asym_id")], resNo: t[k("auth_seq_id")] });
    }
    return out;
}

const [structure, binary, workArg] = process.argv.slice(2);
const work = workArg ?? mkdtempSync(join(tmpdir(), "smooth-surface-"));
const all = readAtoms(structure);
const first = all.filter(a => a.model === all[0].model);
const protein = first.filter(a => PROTEIN.has(a.res));
const chosen = protein.length ? protein : first;
const f32 = (v: number) => Math.fround(v);
const atoms = chosen.map(a => ({ x: f32(a.x), y: f32(a.y), z: f32(a.z), r: f32(m2tAtomRadius(a.name, a.res)) }));
const residues = new Map<string, number>();
const residueOf = Int32Array.from(chosen, a => {
    const key = `${a.chain}/${a.resNo}`;
    if (!residues.has(key)) residues.set(key, residues.size);
    return residues.get(key)!;
});
const probe = 1.4;
const { spacing, sigma, maxShift, openRadius, refine } = smoothSurfaceSetting;

// The C++ input.
const header = new Int32Array([atoms.length]);
const packed = new Float32Array(atoms.flatMap(a => [a.x, a.y, a.z, a.r]));
const params = new Float32Array([probe, spacing, sigma, Number.isFinite(maxShift) ? maxShift : 0, openRadius]);
const flags = new Int32Array([refine ? 1 : 0]);
const atomsFile = join(work, "atoms.bin"), outFile = join(work, "out.bin");
writeFileSync(atomsFile, Buffer.concat([header, packed, residueOf, params, flags].map(a => Buffer.from(a.buffer))));

// The TS.
let started = performance.now();
const grid = sesField(atoms, probe, spacing, sigma, maxShift, openRadius)!;
const tsFieldMs = performance.now() - started;
started = performance.now();
const debug = console.debug;
console.debug = () => {};
const ts = smoothSurfaceFromAtomsSync(atoms, residueOf, probe, { spacing, sigma, maxShift, openRadius, refine })!;
console.debug = debug;
const tsSurfaceMs = performance.now() - started;

// The C++.
started = performance.now();
const log = execFileSync(binary, [atomsFile, outFile], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const cppWallMs = performance.now() - started;
const bytes = readFileSync(outFile);
let at = 0;
const take = <T>(make: (b: ArrayBuffer, o: number, n: number) => T, size: number, n: number): T => {
    const copy = bytes.buffer.slice(bytes.byteOffset + at, bytes.byteOffset + at + size * n);
    at += size * n;
    return make(copy, 0, n);
};
const i32 = (n: number) => take((b, o, c) => new Int32Array(b, o, c), 4, n);
const u32 = (n: number) => take((b, o, c) => new Uint32Array(b, o, c), 4, n);
const fl32 = (n: number) => take((b, o, c) => new Float32Array(b, o, c), 4, n);
const fl64 = (n: number) => take((b, o, c) => new Float64Array(b, o, c), 8, n);
const [nx, ny, nz] = i32(3);
const [cppSpacing, cppIso] = fl64(2);
const cppField = fl32(nx * ny * nz);
const [vertices, corners] = i32(2);
const cpp = {
    positions: fl32(3 * vertices), normals: fl32(3 * vertices), indices: u32(corners), atom: i32(vertices), other: i32(vertices),
    weight: fl32(vertices), near: i32(4 * vertices), nearGap: fl32(4 * vertices),
};
const timings = fl64(7);

const worst = (a: ArrayLike<number>, b: ArrayLike<number>) => {
    let w = 0, differ = 0;
    for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i] - b[i]);
        if (d > w) w = d;
        if (d > 1e-5) differ++;
    }
    return { worst: w, differ };
};
const same = (a: ArrayLike<number>, b: ArrayLike<number>) => {
    let differ = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differ++;
    return differ;
};
const report: string[] = [];
report.push(`${structure.split("/").pop()}: ${atoms.length} atoms`);
report.push(`grid TS ${grid.nx}x${grid.ny}x${grid.nz} at ${grid.spacing}, C++ ${nx}x${ny}x${nz} at ${cppSpacing}; iso TS ${grid.iso} C++ ${cppIso}`);
if (grid.nx === nx && grid.ny === ny && grid.nz === nz) {
    const f = worst(grid.field, cppField);
    report.push(`field: worst difference ${f.worst.toExponential(2)}, ${f.differ} of ${cppField.length} points over 1e-5`);
}
report.push(`surface TS ${ts.atom.length} vertices / ${ts.indices.length / 3} triangles, C++ ${vertices} / ${corners / 3}`);
if (ts.atom.length === vertices && ts.indices.length === corners) {
    const p = worst(ts.positions, cpp.positions), n = worst(ts.normals, cpp.normals), g = worst(ts.nearGap, cpp.nearGap), w = worst(ts.weight, cpp.weight);
    report.push(`positions worst ${p.worst.toExponential(2)} (${p.differ} over 1e-5); normals worst ${n.worst.toExponential(2)} (${n.differ})`);
    report.push(`indices differing ${same(ts.indices, cpp.indices)}; atom ${same(ts.atom, cpp.atom)}; other ${same(ts.other, cpp.other)}; ` +
        `near ${same(ts.near, cpp.near)}; weight worst ${w.worst.toExponential(2)}; nearGap worst ${g.worst.toExponential(2)}`);
}
const [sas, seeds, transform, distance, blur, contour, atomsMs] = Array.from(timings);
report.push(`time TS: field ${tsFieldMs.toFixed(0)} ms, surface ${tsSurfaceMs.toFixed(0)} ms; C++: surface ${(sas + seeds + transform + distance + blur + contour + atomsMs).toFixed(0)} ms ` +
    `(sas ${sas.toFixed(0)}, seeds ${seeds.toFixed(0)}, transform ${transform.toFixed(0)}, distance ${distance.toFixed(0)}, blur ${blur.toFixed(0)}, ` +
    `contour+split ${contour.toFixed(0)}, atoms ${atomsMs.toFixed(0)}); process ${cppWallMs.toFixed(0)} ms`);
console.log(report.join("\n") + (log ? `\n${log.trim()}` : ""));
