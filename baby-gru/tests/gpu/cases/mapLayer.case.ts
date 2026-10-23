/**
 * GpuMapLayer's handling of a map whose data changes in Coot (MoorhenMap.markDataChanged): the
 * grid is fetched again, the old one drawn until the new one is in, changes during a fetch cause
 * exactly one more fetch, a failed refetch keeps the old grid, and a destroyed layer stops
 * listening. The map and the Coot worker are stand-ins with just what the layer reads.
 */
import { readBuffer } from "../../../src/WebGPUComponents/gpu";
import { GpuMapLayer } from "../../../src/WebGPUComponents/mapContour/gpuMapLayer";
import { gpuMapContourSetting, notifyMapDataChanged } from "../../../src/WebGPUComponents/mapContour/setting";
import type { MapUnitCellGrid } from "../../../src/WebGPUComponents/mapContour/mapContourBox";
import { defineCase } from "../helpers/browserCase";

/** Three Gaussian blobs in a 24 A cubic cell on an n^3 grid, scaled. */
function blobs(n: number, scale: number): MapUnitCellGrid {
    const data = new Float32Array(n * n * n);
    const centres = [[0.3, 0.3, 0.5], [0.6, 0.5, 0.5], [0.45, 0.7, 0.4]];
    for (let w = 0; w < n; w++) for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) {
        let sum = 0;
        for (const c of centres) {
            const d = [u / n - c[0], v / n - c[1], w / n - c[2]].map(x => (x - Math.round(x)) * 24);
            sum += Math.exp(-(d[0] ** 2 + d[1] ** 2 + d[2] ** 2) / 6);
        }
        data[(w * n + v) * n + u] = scale * sum;
    }
    return { nu: n, nv: n, nw: n, orth: [24, 0, 0, 0, 24, 0, 0, 0, 24], isEM: false, data };
}

export interface LayerStep {
    label: string;
    draws?: number;
    triangles?: number | null;
    /** Grid fetches asked of the "worker" so far. */
    fetches?: number;
    /** Draws the layer requested since the last step. */
    requested?: number;
    status?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default defineCase(async (device: GPUDevice): Promise<LayerStep[]> => {
    const steps: LayerStep[] = [];
    let requested = 0;
    const layer = await GpuMapLayer.create(device, () => { requested++; });
    const wasEnabled = gpuMapContourSetting.enabled;
    gpuMapContourSetting.enabled = true;
    let reply: { status: string; result?: MapUnitCellGrid } = { status: "Completed", result: blobs(48, 1) };
    let fetches = 0;
    const map = {
        molNo: 1, dataRevision: 0, isDifference: false, isOriginLocked: false, drawOrigin: null,
        suggestedRadius: 10, suggestedContourLevel: 0.5,
        getMapContourParams: () => ({ mapAlpha: 1, mapColour: { r: 0.3, g: 0.5, b: 1 }, positiveMapColour: null, negativeMapColour: null }),
        commandCentre: {
            cootCommand: async () => {
                fetches++;
                const answer = reply;
                await sleep(100);
                return { data: { result: answer } };
            },
        },
    };
    const changeMap = () => { map.dataRevision++; notifyMapDataChanged(); };
    const state = {
        maps: [map],
        mapContourSettings: {
            visibleMaps: [1], mapRadii: [], contourLevels: [], mapStyles: [],
            defaultMapLitLines: false, defaultMapSurface: false, mapLineWidth: 1,
        },
        sceneSettings: { origin: [-12, -12, -12] },
    } as never;
    const frame = async (label: string) => {
        const draws = layer.frame(state);
        // Read in the same task as the frame, as the preview renders in it.
        const triangles = draws.length ? new Uint32Array(await readBuffer(device, draws[0].drawArgs, 4))[0] / 3 : null;
        steps.push({ label, draws: draws.length, triangles, fetches, status: layer.status });
    };
    try {
        await frame("first frame");
        await sleep(300); await frame("grid in");
        await frame("nothing changed");
        reply = { status: "Completed", result: blobs(48, 2) };
        requested = 0;
        changeMap();
        steps.push({ label: "a change requests a draw", requested });
        await frame("changed: old grid still drawn");
        await sleep(300); await frame("new grid in");
        reply = { status: "Completed", result: blobs(40, 1) };
        changeMap(); await frame("change 1: fetch starts");
        changeMap(); changeMap(); await frame("changes 2 and 3 while it runs");
        await sleep(300); await frame("first fetch in, one more starts");
        await sleep(300); await frame("second fetch in (smaller grid)");
        reply = { status: "Failed" };
        changeMap(); await frame("change; this fetch will fail");
        await sleep(300); await frame("failed: old grid kept");
    } finally {
        layer.destroy();
        gpuMapContourSetting.enabled = wasEnabled;
    }
    requested = 0;
    changeMap();
    steps.push({ label: "destroyed layer no longer listens", requested });
    return steps;
});
