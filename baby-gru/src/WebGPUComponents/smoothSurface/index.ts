/**
 * The smooth surface on the GPU, from the atoms (stages 5 to 1; src/.roadmaps/webgpu.md).
 */
import { type GpuContext, getGpuContext } from "../gpu";
import { sharedGpuMetaBalls } from "../metaballs";
import { GpuSmoothSurface } from "./gpuSmoothSurface";

export { GpuSmoothSurface, binAtoms, ownershipBand, smoothGrid } from "./gpuSmoothSurface";
export type { GpuAtomSurface, SmoothBlurOptions, SmoothExposure, SmoothFieldGrid, SmoothFieldOptions, SmoothUnblurredField } from "./gpuSmoothSurface";
export { gaussianKernel } from "./gpuSmoothSurface";
export {
    ATOM_COLOUR_WGSL, FIELD_GRADIENT_WGSL, type SurfaceField, attachSurfaceColouring, releaseSurfaceField, setSurfaceColours, surfaceFieldUniform,
} from "./surfaceField";
/** The longest grid line the GPU's feature transform takes: past it, the C++ makes the field to the opening. */
export { MAX_LINE as GPU_SMOOTH_MAX_LINE } from "./smoothSurfaceShaders";

let shared: Promise<GpuSmoothSurface | null> | null = null;

/** A software adapter: SwiftShader, llvmpipe, WARP - WebGPU works, but on the CPU, slowly. */
export function isSoftwareAdapter(context: GpuContext): boolean {
    return context.fallbackAdapter || /swiftshader|llvmpipe|lavapipe|warp|software/i.test(context.adapterDescription);
}

/**
 * The GPU smooth surface if it is worth using here: null with no WebGPU, or on a software adapter
 * unless `onSoftware` (where the C++ is faster).
 */
export async function gpuSmoothSurfaceIfFast(onSoftware = false): Promise<GpuSmoothSurface | null> {
    const surface = await sharedGpuSmoothSurface();
    if (!surface) return null;
    if (!onSoftware && isSoftwareAdapter(await getGpuContext())) return null;
    return surface;
}

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
