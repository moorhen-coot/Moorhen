/**
 * The browser side of the GPU tests. A case module's default export is `defineCase(body)`; the
 * body gets the shared device (src/WebGPUComponents/gpu, the same one Moorhen uses) and the
 * arguments from the spec, and returns something JSON can carry - summaries and counts, not
 * whole meshes. Compare against the CPU reference in the browser and return the differences.
 */
import { getGpuContext, webGPUUnavailableReason } from "../../../src/WebGPUComponents/gpu";

export interface CaseOutcome<T> {
    /** Why there is no WebGPU here: the test should skip, not fail. */
    unavailable?: string;
    result?: T;
    /** WebGPU errors outside any error scope while the case ran. */
    gpuErrors: string[];
}

export function defineCase<A, T>(body: (device: GPUDevice, args: A) => Promise<T>): (args: A) => Promise<CaseOutcome<T>> {
    return async (args: A) => {
        const reason = webGPUUnavailableReason();
        if (reason) return { unavailable: reason, gpuErrors: [] };
        let device: GPUDevice;
        try {
            device = (await getGpuContext()).device;
        } catch (err) {
            return { unavailable: err instanceof Error ? err.message : String(err), gpuErrors: [] };
        }
        const gpuErrors: string[] = [];
        const listener = (event: GPUUncapturedErrorEvent) => gpuErrors.push(event.error.message);
        device.addEventListener("uncapturederror", listener);
        try {
            const result = await body(device, args);
            await device.queue.onSubmittedWorkDone();
            return { result, gpuErrors };
        } finally {
            device.removeEventListener("uncapturederror", listener);
        }
    };
}
