/**
 * The experimental `moorhenInstance.webGPU` API: draw the scene the main view is showing with the
 * WebGPU renderer, offscreen, and read the main (WebGL) view's pixels to compare it with.
 *
 * For tests and for trying the WebGPU renderer from the console. It follows the WebGPU preview:
 * the store's DisplayBuffers and the WebGL renderer's camera, with what it cannot draw yet
 * reported in `skipped` (and described by describeSkipped). Nothing here changes the main view.
 */
import type { DisplayBuffer } from "../WebGLgComponents/displayBuffer";
import { WebGPUPreviewRenderer, webGPUUnavailableReason } from "./previewRenderer";
import { getGpuContext } from "./gpu";
import type { PreviewCameraSource } from "./previewScene";
import { describeSkipped, effectSettings, planPreview } from "./previewScene";
import { setUseWebGPU } from "../store/sceneSettingsSlice";
import type { WebGPUMainViewRenderer } from "../components/webMG/MoorhenWebGPUMainView";
import { gpuMapContourSetting } from "./mapContour/setting";
import { webGPUAdapterSummary } from "./gpu";
import { formatRendererReport, median, type RendererReportFacts } from "./rendererReport";
import { version as moorhenVersion } from "../version";

/** An image: RGBA, 8 bits a channel, top row first (as ImageData has it). */
export interface RendererImage {
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

/** A WebGPU image of the scene, and what went into it. */
export interface WebGPUSceneSnapshot extends RendererImage {
    /** Tiles it was drawn in: more than one for an image bigger than the largest tile. */
    tiles: number;
    /** Meshes (sub-buffers) and triangles drawn, instances included, and perfect spheres. */
    meshes: number;
    triangles: number;
    spheres: number;
    /** Line segments (LINES, NORMALLINES) drawn. */
    segments: number;
    /** Text labels drawn. */
    labels: number;
    /**
     * The scene effects drawn, as the main view's settings ask for them - the same flags the WebGL
     * view draws with, so this says what both pictures should show.
     */
    effects: { ssao: boolean; edges: boolean; shadow: boolean; depthBlur: boolean };
    /** Transparent layers depth-peeled (depthPeel.ts); 0 if nothing called for peeling. */
    peelLayers: number;
    /** What is in the scene but not drawn by the WebGPU renderer yet, with sub-buffer counts. */
    skipped: Record<string, number>;
    /** The same, as a sentence; empty if nothing was left out. */
    skippedText: string;
}

/** One sub-buffer the WebGPU renderer leaves out (or draws only in part), described for a person. */
export interface SkippedSubBufferInfo {
    why: string;
    /** Whose it is: "molecule style", "map key", or the buffer's statsLabel, as far as can be told. */
    owner: string;
    bufferType: string;
    /** Array lengths, in numbers (not vertices). */
    vertices: number;
    normals: number;
    colours: number;
    indices: number;
    instanceOrigins: number;
    customColour: number[] | null;
    transparent: boolean;
    symmetryCopies: number;
    hasTransform: boolean;
    isHoverBuffer: boolean;
}

export interface WebGPUSnapshotOptions {
    /** Size in pixels. Defaults to the main view's drawing buffer, so the two can be compared. */
    width?: number;
    height?: number;
    /** Largest tile to draw in (default 2048); bigger images are drawn in tiles. */
    maxTile?: number;
}

/** The parts of the WebGL renderer (MGWebGL) this uses. */
interface WebGLView extends PreviewCameraSource {
    canvas: HTMLCanvasElement;
    drawScene(): void;
    save_pixel_data: boolean;
    pixel_data: Uint8Array;
    useOffScreenBuffers: boolean;
}

/**
 * The parts of MoorhenInstance this uses. The store is typed by the one thing read from it: typing
 * it as Store<RootState> would make MoorhenInstance's type depend on the store's, which depends on
 * MoorhenInstance's again, and TypeScript gives up on the circle.
 */
export interface WebGPUApiHost {
    store: {
        getState(): { glRef: { displayBuffers?: DisplayBuffer[] }; molecules?: { moleculeList?: unknown[] }; maps?: unknown[]; sceneSettings?: { useWebGPU?: boolean } };
        dispatch(action: ReturnType<typeof setUseWebGPU>): unknown;
    };
    getVideoRecorderRef(): { readonly current: { glRef: { readonly current: unknown } } | null };
}

function webGLView(host: WebGPUApiHost): WebGLView {
    const view = host.getVideoRecorderRef()?.current?.glRef?.current as WebGLView | null | undefined;
    if (!view?.canvas) throw new Error("The main view is not ready yet.");
    return view;
}

/** `moorhenInstance.webGPU`. Experimental; likely to change while the WebGPU renderer is built. */
export interface WebGPUApi {
    /** Why WebGPU cannot be used in this browser, or null if it can. Does not start a device. */
    unavailableReason(): string | null;
    /** Whether this browser offers WebGPU at all (a device may still fail to start). */
    available(): boolean;
    /**
     * Start the shared WebGPU device (or reuse it): null if WebGPU can draw here, otherwise why
     * not. Unlike unavailableReason() this finds browsers that offer WebGPU but no adapter, as
     * headless browsers and blocklisted GPUs do.
     */
    deviceUnavailableReason(): Promise<string | null>;
    /**
     * Draw what the main view shows with the WebGPU renderer, offscreen, with the main view's
     * camera. Rejects if WebGPU is unavailable or reports an error while drawing.
     */
    snapshot(options?: WebGPUSnapshotOptions): Promise<WebGPUSceneSnapshot>;
    /** What the main (WebGL) view shows, the size of its drawing buffer. */
    webGLSnapshot(): RendererImage;
    /** Each sub-buffer in the scene that WebGPU leaves out, or draws in part, and why. */
    describeSkipped(): SkippedSubBufferInfo[];
    /**
     * Who draws the main view: whether WebGPU is asked for (sceneSettings.useWebGPU), whether it
     * has taken the view (`active`), whether it drew the last frame (`drawing`) and, if WebGL did,
     * why (`webGLReason`), how many frames WebGPU has drawn, and whether maps are contoured on the
     * GPU (`mapsOnGpu`: while WebGPU draws, mapContour/setting.ts).
     */
    mainView(): {
        requested: boolean; active: boolean; drawing: boolean; webGLReason: string | null; framesDrawn: number;
        lastFrame: { meshes: number; triangles: number; spheres: number; segments: number; mapTriangles: number; peelLayers: number } | null;
        mapsOnGpu: boolean;
    };
    /**
     * How this machine draws Moorhen, on one line for a tester to paste back (rendererReport.ts):
     * browser and platform, secure context, the WebGPU adapter or why there is none, who draws the
     * main view and why, where maps are contoured, and the time of `frames` frames of the current
     * scene (60 by default; 0 for none), drawn one an animation frame.
     */
    report(options?: { frames?: number }): Promise<string>;
    /** What report() says, as it gathered it. */
    reportFacts(options?: { frames?: number }): Promise<RendererReportFacts>;
    /** Ask for the main view to be drawn with WebGPU, or not (the preference, so it is remembered). */
    setMainView(useWebGPU: boolean): void;
    /**
     * Lose the shared WebGPU device, as a GPU reset would (device.destroy()): for testing that the
     * main view makes a new one. Resolves false if there was no device to lose.
     */
    simulateDeviceLoss(): Promise<boolean>;
}

/** Who owns a DisplayBuffer: a molecule's representation or a map's display object, if either. */
function ownerOf(host: WebGPUApiHost, buffer: DisplayBuffer): string {
    type Named = { name?: string };
    const state = host.store.getState();
    for (const molecule of (state.molecules?.moleculeList ?? []) as (Named & { representations?: { style?: string; buffers?: unknown[] }[] })[]) {
        for (const representation of molecule.representations ?? []) {
            if (representation.buffers?.includes(buffer)) return `${molecule.name ?? "molecule"} ${representation.style ?? "?"}`;
        }
    }
    for (const map of (state.maps ?? []) as (Named & { displayObjects?: Record<string, unknown> })[]) {
        for (const [key, objects] of Object.entries(map.displayObjects ?? {})) {
            if (Array.isArray(objects) && objects.includes(buffer)) return `${map.name ?? "map"} ${key}`;
        }
    }
    return buffer.statsLabel ?? "unknown";
}

/** Build the `webGPU` API object for one instance. */
export function makeWebGPUApi(host: WebGPUApiHost): WebGPUApi {
    return {
        /** Why WebGPU cannot be used in this browser, or null if it can. Does not start a device. */
        unavailableReason(): string | null {
            return webGPUUnavailableReason();
        },

        /** Whether this browser offers WebGPU at all (a device may still fail to start). */
        available(): boolean {
            return webGPUUnavailableReason() === null;
        },

        async deviceUnavailableReason(): Promise<string | null> {
            try {
                await getGpuContext();
                return null;
            } catch (err) {
                return err instanceof Error ? err.message : String(err);
            }
        },

        /**
         * Draw what the main view shows with the WebGPU renderer, offscreen, with the main view's
         * camera. Rejects if WebGPU is unavailable or reports an error while drawing.
         */
        async snapshot(options: WebGPUSnapshotOptions = {}): Promise<WebGPUSceneSnapshot> {
            const unavailable = webGPUUnavailableReason();
            if (unavailable) throw new Error(unavailable);
            const view = webGLView(host);
            const width = Math.round(options.width ?? view.canvas.width);
            const height = Math.round(options.height ?? view.canvas.height);

            // A canvas of its own, never shown: the renderer needs one to configure, and the
            // snapshot is drawn into textures of its own size, not the canvas's.
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            const errors: string[] = [];
            const renderer = await WebGPUPreviewRenderer.create(canvas, message => errors.push(message));
            try {
                const displayBuffers = host.store.getState().glRef.displayBuffers ?? [];
                const shot = await renderer.snapshot(displayBuffers, view, [], width, height, { maxTile: options.maxTile });
                if (errors.length) throw new Error(errors.join("\n"));
                const { plan } = shot.report;
                const effects = effectSettings(view);
                return {
                    width: shot.width, height: shot.height, data: shot.data, tiles: shot.tiles,
                    meshes: plan.draws.length, triangles: plan.triangles, spheres: plan.spheres, segments: plan.segments, labels: shot.report.labels,
                    effects: { ssao: !!effects.ssao, edges: !!effects.edges, shadow: !!effects.shadow, depthBlur: !!effects.depthBlur },
                    peelLayers: shot.report.peelLayers,
                    skipped: plan.skipped, skippedText: describeSkipped(plan.skipped),
                };
            } finally {
                renderer.destroy();
            }
        },

        /**
         * What the main (WebGL) view shows, as an image the size of its drawing buffer: the
         * scene is drawn again and read back before anything else can draw over it.
         *
         * Read straight from the canvas, so with depth blur (offscreen buffers) on it would miss
         * the blur; that case is refused rather than returning the wrong picture.
         */
        mainView() {
            const requested = !!host.store.getState().sceneSettings?.useWebGPU;
            const external = (host.getVideoRecorderRef()?.current?.glRef?.current as { externalRenderer?: WebGPUMainViewRenderer | null } | null)?.externalRenderer;
            const active = external?.name === "WebGPU";
            return {
                requested, active,
                drawing: active && external.webGLReason === null,
                webGLReason: active ? external.webGLReason : null,
                framesDrawn: active ? external.framesDrawn : 0,
                lastFrame: active ? external.lastFrame : null,
                mapsOnGpu: gpuMapContourSetting.enabled,
            };
        },

        setMainView(useWebGPU: boolean): void {
            host.store.dispatch(setUseWebGPU(useWebGPU));
        },

        async report(options: { frames?: number } = {}): Promise<string> {
            return formatRendererReport(await this.reportFacts(options));
        },

        async reportFacts(options: { frames?: number } = {}): Promise<RendererReportFacts> {
            const webGPU = await webGPUAdapterSummary();
            const view = webGLView(host) as WebGLView & { drawScene(): void; externalRenderer?: WebGPUMainViewRenderer | null };
            const external = view.externalRenderer?.name === "WebGPU" ? view.externalRenderer : null;
            const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));

            // Frames of the scene as it is, one an animation frame, as a moving view draws them.
            const wanted = Math.max(0, Math.round(options.frames ?? 60));
            let frames: RendererReportFacts["frames"] = null;
            if (wanted > 0) {
                external?.takeGpuTime();
                const intervals: number[] = [];
                const cpu: number[] = [];
                let last = await nextFrame();
                for (let i = 0; i < wanted; i++) {
                    const started = performance.now();
                    view.drawScene();
                    cpu.push(performance.now() - started);
                    const now = await nextFrame();
                    intervals.push(now - last);
                    last = now;
                }
                // The GPU timings are read back a frame or two behind.
                await nextFrame();
                await nextFrame();
                const gpu = external?.takeGpuTime() ?? null;
                frames = {
                    count: wanted,
                    medianMs: median(intervals),
                    worstMs: Math.max(...intervals),
                    cpuMs: median(cpu),
                    gpuMs: gpu && gpu.count > 0 ? gpu.meanMs : null,
                };
            }
            const main = this.mainView();
            const canvas = view.canvas as { width: number; height: number };
            const box = view.canvas.getBoundingClientRect?.();
            const visual = window.visualViewport;
            return {
                moorhenVersion: String(moorhenVersion),
                userAgent: navigator.userAgent,
                secureContext: typeof window !== "undefined" && window.isSecureContext,
                webGPU,
                mainView: { requested: main.requested, active: main.active, drawing: main.drawing, webGLReason: main.webGLReason, mapsOnGpu: main.mapsOnGpu },
                canvas: { width: canvas.width, height: canvas.height },
                layout: box ? {
                    canvasCss: [box.width, box.height],
                    pixelRatio: window.devicePixelRatio || 1,
                    window: [window.innerWidth, window.innerHeight],
                    visual: visual ? [visual.width, visual.height, visual.scale] : null,
                    screen: [window.screen.width, window.screen.height],
                } : null,
                scene: {
                    triangles: planPreview(host.store.getState().glRef.displayBuffers ?? []).triangles,
                    peelLayers: main.drawing ? main.lastFrame?.peelLayers ?? null : null,
                },
                frames,
            };
        },

        async simulateDeviceLoss(): Promise<boolean> {
            try {
                const { device } = await getGpuContext();
                device.destroy();
                return true;
            } catch {
                return false;
            }
        },

        describeSkipped(): SkippedSubBufferInfo[] {
            const displayBuffers = host.store.getState().glRef.displayBuffers ?? [];
            const length = (data: ArrayLike<number> | undefined | null) => data?.length ?? 0;
            return planPreview(displayBuffers).skippedSubBuffers.map(({ buffer: b, index: j, why }) => ({
                why,
                owner: ownerOf(host, b),
                bufferType: b.bufferTypes?.[j] ?? "unknown",
                vertices: length(b.triangleVertices?.[j]),
                normals: length(b.triangleNormals?.[j]),
                colours: length(b.triangleColours?.[j]),
                indices: length(b.triangleIndexs?.[j]),
                instanceOrigins: length(b.triangleInstanceOrigins?.[j]),
                customColour: b.customColour ? Array.from(b.customColour) : null,
                transparent: !!b.transparent,
                symmetryCopies: b.symmetryMatrices?.length ?? 0,
                hasTransform: !!(b.transformMatrix || b.transformMatrixInteractive),
                isHoverBuffer: !!b.isHoverBuffer,
            }));
        },

        webGLSnapshot(): RendererImage {
            const view = webGLView(host);
            const { width, height } = view.canvas;
            if (view.useOffScreenBuffers) {
                // WebGL reads save_pixel_data back before its depth blur, so the picture is taken
                // from the canvas instead, as it shows it: in the same task as the draw, while the
                // drawing buffer still holds the frame. save_pixel_data still makes WebGL draw it.
                const copy = document.createElement("canvas");
                copy.width = width;
                copy.height = height;
                const context = copy.getContext("2d");
                if (!context) throw new Error("No 2D canvas to copy the main view into.");
                view.save_pixel_data = true;
                try {
                    view.drawScene();
                    context.drawImage(view.canvas, 0, 0);
                } finally {
                    view.save_pixel_data = false;
                }
                return { width, height, data: context.getImageData(0, 0, width, height).data };
            }
            view.save_pixel_data = true;
            try {
                view.drawScene();
            } finally {
                view.save_pixel_data = false;
            }
            const pixels = view.pixel_data;
            if (!pixels || pixels.length !== width * height * 4) throw new Error("The main view did not return its pixels.");
            // WebGL reads bottom row first.
            const data = new Uint8ClampedArray(width * height * 4);
            const row = width * 4;
            for (let y = 0; y < height; y++) data.set(pixels.subarray((height - 1 - y) * row, (height - y) * row), y * row);
            return { width, height, data };
        },
    };
}
