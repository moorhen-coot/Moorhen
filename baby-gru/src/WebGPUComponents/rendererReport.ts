/**
 * A one-line report of how this machine draws Moorhen, for testers to paste back: the browser and
 * platform, whether the page is a secure context (WebGPU needs one), the WebGPU adapter or why
 * there is none, who draws the main view and why, where maps are contoured, and how long frames
 * of the current scene take. Gathered by `moorhenInstance.webGPU.report()` (instanceApi.ts) and the
 * Dev menu's "Renderer report"; formatted here, without the browser, so that it can be tested.
 */

/** What the report says, gathered by instanceApi's report(). */
export interface RendererReportFacts {
    moorhenVersion: string;
    userAgent: string;
    /** window.isSecureContext: WebGPU is offered only on https and localhost. */
    secureContext: boolean;
    webGPU: { reason: string | null; adapter: string | null; fallback: boolean };
    mainView: { requested: boolean; active: boolean; drawing: boolean; webGLReason: string | null; mapsOnGpu: boolean };
    /** The canvas, in device pixels. */
    canvas: { width: number; height: number };
    /**
     * How the page is laid out, in CSS pixels, to tell why the canvas is the size it is: the
     * canvas's box, the device pixel ratio, the window (layout viewport), the visual viewport and
     * its pinch zoom, and the screen. Null where unknown.
     */
    layout: {
        canvasCss: [number, number];
        pixelRatio: number;
        window: [number, number];
        visual: [number, number, number] | null;
        screen: [number, number];
    } | null;
    /** The scene: triangles in it (instances included), and transparent layers peeled if WebGPU drew. */
    scene: { triangles: number; peelLayers: number | null };
    /** Frames drawn for the report, one an animation frame. */
    frames: {
        count: number;
        /** Between animation frames while drawing: the frame rate the user sees. */
        medianMs: number;
        worstMs: number;
        /** The draw call itself, on the CPU. */
        cpuMs: number;
        /** The GPU's time per frame, where it can be timed (WebGPU with timestamp queries). */
        gpuMs: number | null;
    } | null;
}

/** "Firefox 158", "Chrome 142", "Edge 142", "Safari 26.1", or the agent's first word. */
export function browserName(userAgent: string): string {
    const match = (pattern: RegExp) => userAgent.match(pattern)?.[1];
    const edge = match(/Edg(?:e|A|iOS)?\/(\d+)/);
    if (edge) return `Edge ${edge}`;
    const firefox = match(/(?:Firefox|FxiOS)\/(\d+(?:\.\d+)?)/);
    if (firefox) return `Firefox ${firefox.replace(/\.0$/, "")}`;
    const opera = match(/OPR\/(\d+)/);
    if (opera) return `Opera ${opera}`;
    const chrome = match(/(?:Chrome|CriOS)\/(\d+)/);
    if (chrome) return `Chrome ${chrome}`;
    const safari = /Safari\//.test(userAgent) ? match(/Version\/(\d+(?:\.\d+)?)/) : undefined;
    if (safari) return `Safari ${safari}`;
    return userAgent.split(" ")[0] || "unknown browser";
}

/** "Windows", "macOS", "Linux", "ChromeOS", "Android", "iOS", or "unknown OS". */
export function platformName(userAgent: string): string {
    if (/Android/.test(userAgent)) return "Android";
    if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
    if (/CrOS/.test(userAgent)) return "ChromeOS";
    if (/Windows/.test(userAgent)) return "Windows";
    if (/Mac OS X|Macintosh/.test(userAgent)) return "macOS";
    if (/Linux|X11/.test(userAgent)) return "Linux";
    return "unknown OS";
}

/** 1234567 → "1.23M", 12345 → "12.3k". */
const count = (n: number): string => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`;
const ms = (t: number): string => `${t.toFixed(1)} ms`;

/** The report as one line, fields separated by " | ". */
export function formatRendererReport(f: RendererReportFacts): string {
    const parts = [
        `Moorhen ${f.moorhenVersion}`,
        `${browserName(f.userAgent)} on ${platformName(f.userAgent)}`,
        f.secureContext ? "secure" : "NOT a secure context (WebGPU needs https or localhost)",
        f.webGPU.reason
            ? `WebGPU: none (${f.webGPU.reason})`
            : `WebGPU: ${f.webGPU.adapter ?? "unknown adapter"}${f.webGPU.fallback ? " (software)" : ""}`,
    ];
    const view = f.mainView;
    if (view.drawing) parts.push("main view: WebGPU");
    else if (view.active) parts.push(`main view: WebGL for now (${view.webGLReason ?? "?"})`);
    else if (view.requested && !f.webGPU.reason) parts.push("main view: WebGL (WebGPU asked for, but gave up: see the console)");
    else if (view.requested) parts.push("main view: WebGL (no WebGPU)");
    else parts.push("main view: WebGL (WebGPU switched off)");
    parts.push(`maps: ${view.mapsOnGpu ? "GPU" : "Coot"}`);
    const scene = `${f.canvas.width}x${f.canvas.height}, ${count(f.scene.triangles)} triangles`
        + (f.scene.peelLayers ? `, ${f.scene.peelLayers} layers peeled` : "");
    parts.push(scene);
    if (f.layout) {
        const size = ([w, h]: readonly number[]) => `${Math.round(w)}x${Math.round(h)}`;
        const l = f.layout;
        parts.push(`CSS: canvas ${size(l.canvasCss)} at ${+l.pixelRatio.toFixed(2)}x, window ${size(l.window)}`
            + (l.visual ? `, visual ${size(l.visual)}${l.visual[2] !== 1 ? ` zoomed ${+l.visual[2].toFixed(2)}` : ""}` : "")
            + `, screen ${size(l.screen)}`);
    }
    if (f.frames) {
        parts.push(`${f.frames.count} frames: ${ms(f.frames.medianMs)} median, ${ms(f.frames.worstMs)} worst, `
            + `CPU ${ms(f.frames.cpuMs)}, GPU ${f.frames.gpuMs === null ? "not timed" : ms(f.frames.gpuMs)}`);
    }
    return parts.join(" | ");
}

/** The middle of `values` (the mean of the two middle ones for an even count); 0 for none. */
export function median(values: readonly number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
