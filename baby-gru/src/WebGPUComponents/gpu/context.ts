/**
 * The one WebGPU device the page uses: the preview renderer and every compute module share it,
 * so a buffer made by one can be used by another (GPU buffers cannot cross devices).
 *
 * Made on first use and kept. It asks for what Moorhen needs beyond the defaults, as far as the
 * adapter offers it: the largest buffers and storage bindings (big meshes, a map's whole unit
 * cell) and timestamp queries (GPU timings on status lines). If the device is lost, the context
 * is forgotten, and the next getGpuContext() makes a new one; anything holding GPU resources from
 * the old one should listen to `lost` and drop them.
 *
 * Errors: use error scopes around work whose failure you want to handle (see withErrorScope).
 * Errors outside any scope reach the device's "uncapturederror" event, which is logged here, and
 * which a consumer may listen to as well (the preview shows them).
 */

export interface GpuContext {
    readonly device: GPUDevice;
    /** Vendor, architecture and description, as far as the browser says. */
    readonly adapterDescription: string;
    /** A software adapter (SwiftShader, WARP and the like): it works, but slowly. */
    readonly fallbackAdapter: boolean;
    /** Whether "timestamp-query" was granted (GpuSpanTimer needs it). */
    readonly timestampQuery: boolean;
    /** Settles when this context's device is lost. */
    readonly lost: Promise<GPUDeviceLostInfo>;
}

/** Why WebGPU cannot be used here, or null if it can. Cheap; does not create a device. */
export function webGPUUnavailableReason(): string | null {
    if (typeof navigator === "undefined" || !("gpu" in navigator) || !navigator.gpu) {
        return "This browser does not offer WebGPU (navigator.gpu is missing). Chrome and Edge have it " +
            "on Windows, macOS and ChromeOS, Safari from version 26, and Firefox from 141 on Windows; " +
            "on Linux it usually needs enabling by hand.";
    }
    return null;
}

const NO_ADAPTER = "WebGPU is present but no adapter was offered (blocklisted GPU or driver?).";

/**
 * Why WebGPU cannot be used here, or null if it can: as webGPUUnavailableReason, and where the
 * browser has WebGPU, whether it offers an adapter (some do not: no GPU, a blocklisted driver).
 * Makes no device; once the shared context exists, null at once.
 */
export async function webGPUAdapterUnavailableReason(): Promise<string | null> {
    const unavailable = webGPUUnavailableReason();
    if (unavailable) return unavailable;
    if (currentContext) return null;
    try {
        return (await navigator.gpu.requestAdapter({ powerPreference: "high-performance" })) ? null : NO_ADAPTER;
    } catch (err) {
        return err instanceof Error ? err.message : String(err);
    }
}

let current: Promise<GpuContext> | null = null;
/** The context `current` resolved to, once it has. */
let currentContext: GpuContext | null = null;

/**
 * The shared context, made on first call. Rejects with a readable message when WebGPU is not
 * there or no adapter or device is offered; a later call tries again.
 */
export function getGpuContext(): Promise<GpuContext> {
    if (!current) {
        current = createContext().catch(err => {
            current = null;
            throw err;
        });
    }
    return current;
}

async function createContext(): Promise<GpuContext> {
    const unavailable = webGPUUnavailableReason();
    if (unavailable) throw new Error(unavailable);
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) throw new Error(NO_ADAPTER);
    const timestampQuery = adapter.features.has("timestamp-query");
    // The defaults are 256 MB per buffer and 128 MB per storage binding: a big surface's indices
    // (1ibm's MetaBalls: 341 MB) or a map's unit cell can pass them. Ask for what the adapter has.
    const device = await adapter.requestDevice({
        label: "moorhen",
        requiredFeatures: timestampQuery ? ["timestamp-query"] : [],
        requiredLimits: {
            maxBufferSize: adapter.limits.maxBufferSize,
            maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
        },
    });
    device.addEventListener("uncapturederror", (event: GPUUncapturedErrorEvent) => {
        console.error("WebGPU:", event.error.message);
    });
    const context: GpuContext = {
        device,
        adapterDescription: describeAdapter(adapter),
        fallbackAdapter: isFallback(adapter),
        timestampQuery,
        lost: device.lost,
    };
    device.lost.then(info => {
        // A destroy() we asked for is not news; anything else is.
        if (info.reason !== "destroyed") console.warn("WebGPU device lost:", info.message);
        if (currentContext?.device === device) {
            current = null;
            currentContext = null;
        }
    });
    currentContext = context;
    return context;
}

/**
 * Whether WebGPU can be used here and on what, for reports (instanceApi's report): the reason it
 * cannot, or the adapter. The shared context's adapter if there is one; otherwise one is asked for,
 * and no device made.
 */
export async function webGPUAdapterSummary(): Promise<{ reason: string | null; adapter: string | null; fallback: boolean }> {
    const unavailable = webGPUUnavailableReason();
    if (unavailable) return { reason: unavailable, adapter: null, fallback: false };
    if (currentContext) return { reason: null, adapter: currentContext.adapterDescription, fallback: currentContext.fallbackAdapter };
    try {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (!adapter) return { reason: NO_ADAPTER, adapter: null, fallback: false };
        return { reason: null, adapter: describeAdapter(adapter), fallback: isFallback(adapter) };
    } catch (err) {
        return { reason: err instanceof Error ? err.message : String(err), adapter: null, fallback: false };
    }
}

/** The adapter's own say (GPUAdapterInfo), or the older GPUAdapter property where that is all there is. */
function isFallback(adapter: GPUAdapter): boolean {
    return !!(adapter.info?.isFallbackAdapter ?? (adapter as unknown as { isFallbackAdapter?: boolean }).isFallbackAdapter);
}

function describeAdapter(adapter: GPUAdapter): string {
    const info = adapter.info;
    const text = info ? [info.vendor, info.architecture, info.description].filter(Boolean).join(" ") : "";
    return text || "unknown adapter";
}

/**
 * Run `work` inside validation and out-of-memory error scopes, and resolve with the first error
 * either caught (null if none). The work's own commands must be submitted inside `work`; the
 * scopes catch errors from the calls made while they are open, not from later GPU execution.
 */
export async function withErrorScope(device: GPUDevice, work: () => void): Promise<GPUError | null> {
    device.pushErrorScope("out-of-memory");
    device.pushErrorScope("validation");
    let thrown: unknown = null;
    try {
        work();
    } catch (err) {
        thrown = err;
    }
    // Popped in reverse order whatever happened, so the scopes never leak.
    const validation = device.popErrorScope();
    const memory = device.popErrorScope();
    const [v, m] = await Promise.all([validation, memory]);
    if (thrown) throw thrown;
    return v ?? m ?? null;
}
