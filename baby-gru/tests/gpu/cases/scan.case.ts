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

/**
 * `sizes`, each scanned and checked in turn; or with `oneEncoder`, all recorded on one encoder (smallest
 * first, so the scratch buffers grow between scans already recorded) and submitted together.
 */
export default defineCase(async (device: GPUDevice, args: number[] | { sizes: number[]; oneEncoder: true }): Promise<ScanReport[]> => {
    const scan = await GpuScan.create(device);
    if (!Array.isArray(args)) return oneEncoder(device, scan, args.sizes);
    const sizes = args;
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

async function oneEncoder(device: GPUDevice, scan: GpuScan, sizes: number[]): Promise<ScanReport[]> {
    const encoder = device.createCommandEncoder();
    const runs = sizes.map(n => {
        const input = new Uint32Array(n);
        for (let i = 0; i < n; i++) input[i] = (i * 2654435761) % 5;
        const inputBuffer = createBuffer(device, "scan input", n * 4, BufferUsage.STORAGE, input);
        const outputBuffer = createBuffer(device, "scan output", n * 4, BufferUsage.STORAGE | BufferUsage.COPY_SRC);
        scan.encode(encoder, inputBuffer, outputBuffer, n);
        return { n, input, inputBuffer, outputBuffer };
    });
    device.queue.submit([encoder.finish()]);
    scan.releaseTransient();
    const reports: ScanReport[] = [];
    for (const { n, input, inputBuffer, outputBuffer } of runs) {
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
}
