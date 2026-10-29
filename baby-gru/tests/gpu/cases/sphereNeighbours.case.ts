/**
 * Perfect spheres' neighbour lists (src/WebGPUComponents/sphereNeighbours.ts), for the lines where
 * clip caps meet, against every pair checked on the CPU: each sphere lists exactly the spheres it
 * overlaps, or, with more than NEIGHBOUR_SLOTS, the most overlapped of them. Packed as tightly as
 * a space-filling model (some spheres overfull), and again with one sphere far out, which makes
 * the grid coarser.
 */
import { readBuffer } from "../../../src/WebGPUComponents/gpu";
import { NEIGHBOUR_SLOTS, NO_NEIGHBOUR, SphereNeighbourKernels } from "../../../src/WebGPUComponents/sphereNeighbours";
import { defineCase } from "../helpers/browserCase";

export interface NeighbourReport {
    label: string;
    spheres: number;
    /** Neighbours listed in all, spheres with more than the slots hold, and lists that are wrong. */
    listed: number;
    overfull: number;
    wrong: number;
    /** An example of a wrong list, for the failure message. */
    example: string | null;
}

export default defineCase(async (device: GPUDevice): Promise<NeighbourReport[]> => {
    const kernels = new SphereNeighbourKernels(device);
    let seed = 12345;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const reports: NeighbourReport[] = [];
    for (const [label, count, outlier] of [["packed", 3000, false], ["with an outlier", 3000, true]] as const) {
        // About 0.1 spheres an A^3, as atoms with their hydrogens; radii of hydrogens and carbons.
        const side = Math.cbrt(count / 0.1);
        const origins = new Float32Array(3 * count), sizes = new Float32Array(3 * count);
        for (let i = 0; i < count; i++) {
            for (let k = 0; k < 3; k++) origins[3 * i + k] = random() * side - side / 2;
            sizes.fill(random() < 0.5 ? 1.2 : 1.7, 3 * i, 3 * i + 3);
        }
        if (outlier) origins.set([5000, -3000, 800], 0);
        const created: GPUBuffer[] = [];
        const built = kernels.build(origins, sizes, count, created);
        if (!built) throw new Error("no neighbour lists");
        const lists = new Uint32Array(await readBuffer(device, built.neighbours, count * NEIGHBOUR_SLOTS * 4));
        created.forEach(b => b.destroy());

        let listed = 0, overfull = 0, wrong = 0;
        let example: string | null = null;
        for (let i = 0; i < count; i++) {
            const overlaps: { j: number; overlap: number }[] = [];
            for (let j = 0; j < count; j++) {
                if (j === i) continue;
                const d = Math.hypot(origins[3 * j] - origins[3 * i], origins[3 * j + 1] - origins[3 * i + 1], origins[3 * j + 2] - origins[3 * i + 2]);
                const reach = sizes[3 * i] + sizes[3 * j];
                if (d < reach) overlaps.push({ j, overlap: reach - d });
            }
            const got = Array.from(lists.subarray(i * NEIGHBOUR_SLOTS, (i + 1) * NEIGHBOUR_SLOTS)).filter(j => j !== NO_NEIGHBOUR);
            listed += got.length;
            if (overlaps.length > NEIGHBOUR_SLOTS) {
                overfull++;
                // The most overlapped; ties at the cut-off may go either way.
                overlaps.sort((a, b) => b.overlap - a.overlap);
                const cutoff = overlaps[NEIGHBOUR_SLOTS - 1].overlap;
                const allowed = new Set(overlaps.filter(o => o.overlap >= cutoff - 1e-5).map(o => o.j));
                const ok = got.length === NEIGHBOUR_SLOTS && new Set(got).size === got.length && got.every(j => allowed.has(j))
                    && overlaps.filter(o => o.overlap > cutoff + 1e-5).every(o => got.includes(o.j));
                if (!ok) { wrong++; example ??= `sphere ${i}: got ${got.join(",")}`; }
                continue;
            }
            const want = overlaps.map(o => o.j).sort((a, b) => a - b);
            const sorted = [...got].sort((a, b) => a - b);
            if (sorted.join() !== want.join()) {
                wrong++;
                example ??= `sphere ${i}: got ${sorted.join(",")}, want ${want.join(",")}`;
            }
        }
        reports.push({ label, spheres: count, listed, overfull, wrong, example });
    }
    return reports;
});
