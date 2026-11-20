/**
 * The smooth surface on the GPU: stage 1, from the C++'s field on (src/.roadmaps/webgpu.md).
 */
import { getGpuContext } from "../gpu";
import { sharedGpuMetaBalls } from "../metaballs";
import { GpuSmoothSurface } from "./gpuSmoothSurface";

export { GpuSmoothSurface, binAtoms, ownershipBand } from "./gpuSmoothSurface";
export type { GpuAtomSurface, SmoothFieldGrid } from "./gpuSmoothSurface";

let shared: Promise<GpuSmoothSurface | null> | null = null;

/**
 * The GPU smooth surface, on the shared device, made once and reused. Null when WebGPU is not there
 * or offers no adapter (the caller then has the C++ make the whole surface); remembered, and forgotten
 * again if the device is lost, so that a later call can try afresh.
 */
export function sharedGpuSmoothSurface(): Promise<GpuSmoothSurface | null> {
    if (shared) return shared;
    const made = (async () => {
        const marchingCubes = await sharedGpuMetaBalls();
        if (!marchingCubes) return null;
        const context = await getGpuContext();
        const surface = await GpuSmoothSurface.create(context.device, marchingCubes);
        context.lost.then(() => {
            if (shared === made) shared = null;
        });
        return surface;
    })().catch(err => {
        console.warn("GPU smooth surface unavailable:", err);
        if (shared === made) shared = null;
        return null;
    });
    shared = made;
    return shared;
}
