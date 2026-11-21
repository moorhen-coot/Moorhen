/**
 * Each atom's colour reach (src/WebGPUComponents/smoothSurface/surfaceField.ts, colourReach), which
 * lets per-pixel colour skip its blend where only one colour is near: against every pair visited.
 */
import { describe, expect, it } from "@jest/globals";
import { binAtoms } from "../../src/WebGPUComponents/smoothSurface/gpuSmoothSurface";
import { REACH_NEVER, colourReach } from "../../src/WebGPUComponents/smoothSurface/surfaceField";

function bruteReach(atoms: Float32Array, colours: Float32Array, cap: number): number[] {
    const n = atoms.length / 4;
    return Array.from({ length: n }, (_, i) => {
        let best = cap;
        for (let a = 0; a < n; a++) {
            if ([0, 1, 2].every(k => colours[4 * a + k] === colours[4 * i + k])) continue;
            const d = Math.hypot(atoms[4 * a] - atoms[4 * i], atoms[4 * a + 1] - atoms[4 * i + 1], atoms[4 * a + 2] - atoms[4 * i + 2]);
            best = Math.min(best, d - atoms[4 * a + 3] - atoms[4 * i + 3]);
        }
        return best;
    });
}

describe("colourReach", () => {
    it("is the least gap to an atom of another colour, capped, never below 0, whatever the bin size", () => {
        let seed = 5;
        const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const n = 800;
        const atoms = new Float32Array(4 * n), colours = new Float32Array(4 * n);
        const palette = [[1, 0, 0], [0, 0.5, 1], [0.2, 0.9, 0.3]];
        for (let i = 0; i < n; i++) {
            const x = random() * 40;
            // Mostly in slabs of one colour along x, with odd ones out; some radii large, so that the
            // search must reach past the cap by both radii.
            atoms.set([x, random() * 20, random() * 20, random() < 0.1 ? 2.5 : 1 + random()], 4 * i);
            colours.set([...palette[random() < 0.08 ? Math.floor(random() * 3) : Math.floor(x / 14)], 1], 4 * i);
        }
        const cap = 4.8;
        const expected = bruteReach(atoms, colours, cap);
        expect(expected.some(r => r === cap)).toBe(true);
        expect(expected.some(r => r < 0)).toBe(true);
        for (const binSize of [1.5, 3, 7]) {
            const reach = colourReach(atoms, colours, binAtoms(atoms, binSize), binSize, cap);
            // Overlapping one of another colour: never (any value under the true reach is correct).
            const worst = Math.max(...expected.map((r, i) => (r < 0 ? (reach[i] === REACH_NEVER ? 0 : Infinity) : Math.abs(reach[i] - r))));
            expect(worst).toBeLessThan(1e-5);
        }
    });
});
