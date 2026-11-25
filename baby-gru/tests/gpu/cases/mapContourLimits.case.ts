/**
 * A map contour too big for the GPU is made at the largest radius that fits, and says so; nothing
 * reaches the device's uncaptured errors (which would end WebGPU for the main view); a request
 * that fits is made as asked. A grid too big for one buffer is refused when it is uploaded. The
 * device's limits are stood in for by a small one.
 */
import { readBuffer } from "../../../src/WebGPUComponents/gpu";
import { GpuIsosurface, GpuMapGrid, MapContourKernels, mapContourLimits } from "../../../src/WebGPUComponents/mapContour/gpuMapContour";
import { syntheticMap } from "../reference/mapContourReference";
import { defineCase } from "../helpers/browserCase";

export interface LimitsCase {
    /** The largest buffer the contour may ask for, in place of the device's. */
    bindingBytes: number;
    bigRadius: number;
    smallRadius: number;
}

export interface Contoured {
    limitedRadius: number | null;
    limitReason: string | null;
    tooBig: string | null;
    buffers: boolean;
    indexCount: number;
    boxPoints: number;
}

export interface LimitsReport {
    big: Contoured;
    small: Contoured;
    /** The big one again after the small one: limited again. */
    bigAgain: Contoured;
    /** Why GpuMapGrid.create refused the grid, if it did. */
    gridRefused: string | null;
    uncaptured: string[];
}

export default defineCase(async (device: GPUDevice, c: LimitsCase): Promise<LimitsReport> => {
    const uncaptured: string[] = [];
    const listener = (event: GPUUncapturedErrorEvent) => { uncaptured.push(event.error.message); };
    device.addEventListener("uncapturederror", listener);
    const kernels = await MapContourKernels.create(device);
    const grid = syntheticMap(false);
    // Uploaded before the limit is lowered: the grid itself is tested separately below.
    const mapGrid = new GpuMapGrid(kernels, grid);
    mapContourLimits.bindingBytes = c.bindingBytes;
    let remade = 0;
    const surface = new GpuIsosurface(kernels, mapGrid, () => { remade++; });
    const settle = async () => {
        await device.queue.onSubmittedWorkDone();
        await new Promise(resolve => setTimeout(resolve, 200));
    };
    const contour = async (radius: number): Promise<Contoured> => {
        const request = { centre: [12, 15, 18] as [number, number, number], radius, level: 0.2 };
        surface.update(request);
        await settle();
        // As the next frames would: made again if the room was too small.
        for (let i = 0; i < 4 && remade; i++) {
            remade = 0;
            surface.update(request);
            await settle();
        }
        const args = new Uint32Array(await readBuffer(device, surface["drawArgs"] as GPUBuffer, 64));
        const size = surface.lastBox?.size ?? [0, 0, 0];
        return {
            limitedRadius: surface.limitedRadius, limitReason: surface.limitReason, tooBig: surface.tooBig,
            buffers: surface.buffers !== null, indexCount: args[0], boxPoints: size[0] * size[1] * size[2],
        };
    };
    try {
        const big = await contour(c.bigRadius);
        const small = await contour(c.smallRadius);
        const bigAgain = await contour(c.bigRadius);
        let gridRefused: string | null = null;
        try {
            (await GpuMapGrid.create(kernels, grid)).destroy();
        } catch (err) {
            gridRefused = err instanceof Error ? err.message : String(err);
        }
        await settle();
        return { big, small, bigAgain, gridRefused, uncaptured };
    } finally {
        mapContourLimits.bindingBytes = null;
        surface.destroy();
        mapGrid.destroy();
        kernels.destroy();
        device.removeEventListener("uncapturederror", listener);
    }
});
