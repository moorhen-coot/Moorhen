/**
 * Shared WebGPU infrastructure: the one device, the flag constants, and the helpers compute
 * modules are built from. See ../README.md.
 */
export { BufferUsage, MapMode, MAX_WORKGROUPS_PER_DIMENSION, ShaderStage, TextureUsage } from "./constants";
export { getGpuContext, webGPUAdapterUnavailableReason, webGPUUnavailableReason, withErrorScope } from "./context";
export type { GpuContext } from "./context";
export { ComputeKernel, createBuffer, dispatchSize, itemIndexWgsl, readBuffer } from "./compute";
export type { Bindings, KernelSource } from "./compute";
export { GpuScan } from "./gpuScan";
export { GpuSpanTimer } from "./gpuSpanTimer";
export type { MarkPass, PassTimestamps, SpanTiming } from "./gpuSpanTimer";
