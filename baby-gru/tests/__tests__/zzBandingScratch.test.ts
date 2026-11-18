// SCRATCH (temporary, banding investigation): shading error of smooth-surface meshes against a fine-grid reference.
import { readFileSync } from "fs";
import { join } from "path";
import { m2tAtomRadius } from "../../src/utils/m2tAtomRadii";
import { contourField, contourInput, fieldSampler, sesField } from "../../src/utils/smoothSurface";

test("banding measure", () => {
    const all = readFileSync(join(__dirname, "../test_data/1df7.pdb"), "utf8").split("\n")
        .filter(line => /^(ATOM|HETATM)/.test(line) && line.slice(17, 20) !== "HOH" && [" ", "A"].includes(line[16]))
        .map(line => ({ x: parseFloat(line.slice(30, 38)), y: parseFloat(line.slice(38, 46)), z: parseFloat(line.slice(46, 54)), r: m2tAtomRadius(line.slice(12, 16), line.slice(17, 20)) }));
    const c = all[200];
    const atoms = all.filter(a => Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z) < 10);
    const field = (h: number) => sesField(atoms, 1.4, h, 0.5, 0.3, 0.5, false)!;
    const ref = field(0.125);
    const refSampler = fieldSampler(contourInput(ref), ref);
    const g = new Float64Array(3);
    const measure = (label: string, mesh: ReturnType<typeof contourField>, quadratic = false) => {
        const { positions: p, normals: n, indices } = mesh;
        const errs: number[] = [];
        const bary = [[1/3,1/3,1/3],[0.5,0.5,0],[0.5,0,0.5],[0,0.5,0.5],[0.6,0.2,0.2],[0.2,0.6,0.2],[0.2,0.2,0.6]];
        for (let t = 0; t < indices.length; t += 3) {
            // only well inside the atom set, away from the cut edge of the selection
            const v0 = indices[t];
            if (Math.hypot(p[3*v0]-c.x, p[3*v0+1]-c.y, p[3*v0+2]-c.z) > 6) continue;
            for (const b of bary) {
                const x = [0,0,0], nn = [0,0,0];
                for (let k = 0; k < 3; k++) for (let d = 0; d < 3; d++) { x[d] += b[k]*p[3*indices[t+k]+d]; nn[d] += b[k]*n[3*indices[t+k]+d]; }
                if (quadratic) {
                    // PN triangles' quadratic normal: the corners' normals, plus a mid-edge normal per
                    // edge, the ends' sum reflected in the plane perpendicular to the edge.
                    const P = [0, 1, 2].map(k => [0, 1, 2].map(d => p[3*indices[t+k]+d]));
                    const N = [0, 1, 2].map(k => [0, 1, 2].map(d => n[3*indices[t+k]+d]));
                    const mid = (i: number, j: number) => {
                        const e = [0, 1, 2].map(d => P[j][d] - P[i][d]);
                        const s = [0, 1, 2].map(d => N[i][d] + N[j][d]);
                        const vij = 2 * (e[0]*s[0]+e[1]*s[1]+e[2]*s[2]) / (e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);
                        const h = [0, 1, 2].map(d => s[d] - vij * e[d]);
                        const l = Math.hypot(h[0], h[1], h[2]);
                        return h.map(x => x / l);
                    };
                    const m01 = mid(0, 1), m12 = mid(1, 2), m20 = mid(2, 0);
                    for (let d = 0; d < 3; d++) nn[d] = N[0][d]*b[0]*b[0] + N[1][d]*b[1]*b[1] + N[2][d]*b[2]*b[2]
                        + m01[d]*b[0]*b[1] + m12[d]*b[1]*b[2] + m20[d]*b[2]*b[0];
                }
                refSampler.sample(x[0], x[1], x[2], g);
                const cos = (g[0]*nn[0]+g[1]*nn[1]+g[2]*nn[2]) / (Math.hypot(g[0],g[1],g[2]) * Math.hypot(nn[0],nn[1],nn[2]));
                errs.push(Math.acos(Math.min(1, cos)) * 180 / Math.PI);
            }
        }
        errs.sort((a, b) => a - b);
        const q = (f: number) => errs[Math.floor(f * (errs.length - 1))].toFixed(3);
        const mean = errs.reduce((s, e) => s + e, 0) / errs.length;
        return `${label}: ${indices.length / 3} tris, mean ${mean.toFixed(3)}, p50 ${q(0.5)}, p95 ${q(0.95)}, p99 ${q(0.99)}, max ${q(1)} deg`;
    };
    const g5 = field(0.5);
    const coarse = contourField(g5);
    // (a) vertex normals alone against the reference gradient at the vertices
    const vertexErr: number[] = []; let posErr = 0, posN = 0; const posErrs: number[] = [];
    const withRef = { ...coarse, normals: new Float32Array(coarse.normals.length) };
    for (let v = 0; v < coarse.positions.length / 3; v++) {
        const x = [coarse.positions[3*v], coarse.positions[3*v+1], coarse.positions[3*v+2]];
        const f = refSampler.sample(x[0], x[1], x[2], g);
        const gl = Math.hypot(g[0], g[1], g[2]);
        for (let d = 0; d < 3; d++) withRef.normals[3*v+d] = g[d] / gl;
        if (Math.hypot(x[0]-c.x, x[1]-c.y, x[2]-c.z) > 6) continue;
        const nn = [coarse.normals[3*v], coarse.normals[3*v+1], coarse.normals[3*v+2]];
        vertexErr.push(Math.acos(Math.min(1, (g[0]*nn[0]+g[1]*nn[1]+g[2]*nn[2]) / gl)) * 180 / Math.PI);
        posErrs.push(Math.abs(f / gl));
    }
    const stats = (label: string, e: number[]) => { e.sort((a, b) => a - b); const q = (f: number) => e[Math.floor(f*(e.length-1))].toFixed(3);
        return `${label}: mean ${(e.reduce((s, x) => s + x, 0) / e.length).toFixed(3)}, p95 ${q(0.95)}, max ${q(1)}`; };
    console.log([
        stats("0.5 A vertex normal error (deg)", vertexErr),
        stats("0.5 A vertex distance from reference surface (A)", posErrs),
        measure("0.5 A mesh, its own normals", coarse),
        measure("0.5 A mesh, reference normals at its vertices", withRef),
        measure("0.5 A mesh, its own normals, quadratic", coarse, true),
        measure("0.5 A mesh, reference normals, quadratic", withRef, true),
    ].join("\n"));
});
