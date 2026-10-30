/**
 * GpuScan (the exclusive prefix sum every mesh producer uses for its output offsets) against a
 * plain loop, at sizes either side of its 2048-element blocks and its levels of recursion.
 */
import { BufferUsage, GpuScan, createBuffer, readBuffer } from "../../../src/WebGPUComponents/gpu";
import { defineCase } from "../helpers/browserCase";

export interface ScanReport {
    n: number;
    /** First index where the GPU differs from the CPU, or -1. */
    firstDifference: number;
    gpuTotal: number;
    cpuTotal: number;
}

export default defineCase(async (device: GPUDevice, sizes: number[]): Promise<ScanReport[]> => {
    const scan = await GpuScan.create(device);
    const reports: ScanReport[] = [];
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647);
    for (const n of sizes) {
        // Small counts, as the kernels give (0-5 triangles a cell), with runs of zeros.
        const input = new Uint32Array(n);
        for (let i = 0; i < n; i++) input[i] = random() % 3 === 0 ? 0 : random() % 6;
        const inputBuffer = createBuffer(device, "scan input", n * 4, BufferUsage.STORAGE, input);
        const outputBuffer = createBuffer(device, "scan output", n * 4, BufferUsage.STORAGE | BufferUsage.COPY_SRC);
        const encoder = device.createCommandEncoder();
        scan.encode(encoder, inputBuffer, outputBuffer, n);
        device.queue.submit([encoder.finish()]);
        scan.releaseTransient();
        const gpu = new Uint32Array(await readBuffer(device, outputBuffer, n * 4));
        let sum = 0;
        let firstDifference = -1;
        for (let i = 0; i < n; i++) {
            if (firstDifference < 0 && gpu[i] !== sum) firstDifference = i;
            sum += input[i];
        }
        reports.push({ n, firstDifference, gpuTotal: gpu[n - 1] + input[n - 1], cpuTotal: sum });
        inputBuffer.destroy();
        outputBuffer.destroy();
    }
    scan.destroy();
    return reports;
});
