/**
 * The entry point for making MetaBalls on the GPU, and the switch that decides whether to.
 *
 * Off by default: it is a test path, behind a dev-menu toggle, until it has been tried on real
 * structures in real browsers. When it is on and WebGPU is available, getMetaBallBuffers uses it;
 * otherwise, or if it fails, Moorhen's own C++ (DrawMoorhenMetaBalls, in the WASM) is used as before.
 */
import { GpuMetaBalls } from "./gpuMetaBalls";

export { GpuMetaBalls } from "./gpuMetaBalls";
export type { MetaBallsInput, MetaBallsMesh, MetaBallsOptions } from "./gpuMetaBalls";
export { METABALLS_SPHERE_ARGS, metaballsInputFromSpheres, metaballsMeshData } from "./metaballsMeshData";

/**
 * The parameters getMetaBallBuffers passes to DrawMoorhenMetaBalls (grid spacing, radius,
 * isosurface level), shared so that the two paths cannot drift apart.
 */
export const METABALLS_GRID_SIZE = 0.2;
export const METABALLS_RADIUS = 0.67;
export const METABALLS_ISO_LEVEL = 1.8;

/** The dev-menu switch. Read when a MetaBalls representation is (re)built. */
export const gpuMetaBallsSetting = { enabled: false, splitField: true };

let shared: Promise<GpuMetaBalls | null> | null = null;

/**
 * The GPU MetaBalls generator, on a device of its own, made once and reused. Null when WebGPU
 * is not there or offers no adapter; the result is remembered, and forgotten again if the device
 * is lost, so that a later call can try afresh.
 */
export function sharedGpuMetaBalls(): Promise<GpuMetaBalls | null> {
    if (shared) return shared;
    shared = (async () => {
        if (typeof navigator === "undefined" || !navigator.gpu) return null;
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (!adapter) return null;
        // As large as the adapter allows: the slab buffers are sized well inside the defaults,
        // but the mesh readback buffers grow with the molecule.
        // Timestamp queries when offered, so the console can say which kernel the time went on.
        const timing: GPUFeatureName[] = adapter.features.has("timestamp-query") ? ["timestamp-query"] : [];
        const device = await adapter.requestDevice({
            label: "metaballs",
            requiredFeatures: timing,
            requiredLimits: {
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
                maxBufferSize: adapter.limits.maxBufferSize,
            },
        });
        device.addEventListener("uncapturederror", (event: GPUUncapturedErrorEvent) => {
            console.error("GPU MetaBalls:", event.error.message);
        });
        device.lost.then(info => {
            console.warn("GPU MetaBalls device lost:", info.message);
            shared = null;
        });
        const generator = await GpuMetaBalls.create(device);
        console.log(`GPU MetaBalls: pipelines compiled in ${generator.compileMs.toFixed(0)} ms`);
        return generator;
    })().catch(err => {
        console.warn("GPU MetaBalls unavailable:", err);
        shared = null;
        return null;
    });
    return shared;
}
