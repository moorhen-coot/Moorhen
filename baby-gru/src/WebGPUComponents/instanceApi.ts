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
import { describeSkipped, planPreview } from "./previewScene";

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
    store: { getState(): { glRef: { displayBuffers?: DisplayBuffer[] }; molecules?: { moleculeList?: unknown[] }; maps?: unknown[] } };
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
                return {
                    width: shot.width, height: shot.height, data: shot.data, tiles: shot.tiles,
                    meshes: plan.draws.length, triangles: plan.triangles, spheres: plan.spheres, segments: plan.segments,
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
            if (view.useOffScreenBuffers) throw new Error("webGLSnapshot does not support depth blur (offscreen buffers); turn it off first.");
            view.save_pixel_data = true;
            try {
                view.drawScene();
            } finally {
                view.save_pixel_data = false;
            }
            const { width, height } = view.canvas;
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
