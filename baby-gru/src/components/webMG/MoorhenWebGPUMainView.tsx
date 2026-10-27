import { useEffect, useRef } from "react";
import { useStore } from "react-redux";
import { useMoorhenInstance } from "../../InstanceManager";
import type { RootState } from "../../store/MoorhenReduxStore";
import type { MGWebGL } from "../../WebGLgComponents/mgWebGL";
import type { MoorhenMap } from "../../utils/MoorhenMap";
import { deferWebGLUploads } from "../../WebGLgComponents/buildBuffers";
import { type ExternalRenderer, webGLOnlyReason } from "../../WebGLgComponents/externalRenderer";
import { type PreviewFrameReport, WebGPUPreviewRenderer } from "../../WebGPUComponents/previewRenderer";
import { GpuMapLayer } from "../../WebGPUComponents/mapContour/gpuMapLayer";
import { applyGpuMapContours, gpuMapContourSetting } from "../../WebGPUComponents/mapContour/setting";

/** 1234567 → "1.23M", 12345 → "12.3k". */
const count = (n: number): string => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`;

/** Devices lost within a minute before WebGL takes the view for good. */
const MAX_LOSSES = 3;

/** What the main view's WebGPU renderer says about itself, for the instance API and tests. */
export interface WebGPUMainViewRenderer extends ExternalRenderer {
    /** Why WebGL drew the last frame offered, or null if WebGPU drew it. */
    readonly webGLReason: string | null;
    /** Frames WebGPU has drawn. */
    readonly framesDrawn: number;
    /** What the last frame WebGPU drew had in it; mapTriangles, the maps contoured on the GPU. */
    readonly lastFrame: { meshes: number; triangles: number; spheres: number; segments: number; mapTriangles: number; peelLayers: number } | null;
    /** The GPU time of the frames drawn since the last call (and of the FPS meter's), or null if not timed. */
    takeGpuTime(): { meanMs: number; maxMs: number; count: number } | null;
}

/**
 * The main view drawn by WebGPU (sceneSettings.useWebGPU, on by default where the browser offers
 * WebGPU), on a canvas laid over the WebGL one.
 *
 * MGWebGL keeps everything but the drawing - camera, mouse and keys, picking, labels, the frame
 * loop - and offers it each frame (externalRenderer.ts). This canvas takes no input: events go
 * through to the WebGL canvas underneath, as before. It is hidden whenever WebGL draws a frame
 * itself (webGLOnlyReason: the shadow map debug view, a recording of the WebGL canvas), so the
 * WebGL picture shows.
 *
 * While WebGPU draws, maps are contoured on the GPU and drawn from there (GpuMapLayer); whenever
 * WebGL draws, Coot contours them as before (mapContour/setting.ts).
 *
 * While it shows the view, MGWebGL.getCanvasRef gives this canvas, so movie export, recordings
 * and keyframe thumbnails take their pictures from it; screenshots are drawn offscreen by the same
 * renderer (snapshot), at the size WebGL's would be.
 *
 * While it is in use, WebGL's uploads - buffers and label atlases - wait until WebGL draws
 * (deferWebGLUploads).
 *
 * A lost device (a GPU or driver reset, the browser's GPU process restarting, a switch of GPU) is
 * replaced: a new device and renderer are made, and everything is uploaded again from the scene
 * (DisplayBuffers) and the maps; WebGL draws in the meantime. Only if no new device can be made,
 * or devices keep being lost (more than MAX_LOSSES in a minute), does WebGL take the view for
 * good - as it does on any other WebGPU error. Where WebGPU will not start at all (no adapter),
 * WebGL draws, and the console says so quietly.
 */
export const MoorhenWebGPUMainView = (props: { glRef: React.RefObject<MGWebGL> }) => {
    const store = useStore<RootState>();
    const moorhenInstance = useMoorhenInstance();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const view = props.glRef.current;
        if (!canvas || !view) return;

        let renderer: WebGPUPreviewRenderer | null = null;
        let maps: GpuMapLayer | null = null;
        // Some map could not be contoured on the GPU: Coot contours them while this layer lasts.
        let mapsFailed = false;
        let cancelled = false;
        // WebGL has the view for good.
        let gaveUp = false;
        // When devices were lost, within the last minute.
        const losses: number[] = [];
        let lastReport: PreviewFrameReport | null = null;
        let lastReason: string | null | undefined = undefined;
        let redrawRequest = 0;
        let unsubscribe: () => void = () => {};

        const show = (visible: boolean) => {
            const visibility = visible ? "visible" : "hidden";
            if (canvas.style.visibility !== visibility) canvas.style.visibility = visibility;
        };
        // Maps on the GPU exactly while WebGPU draws with a working map layer; Coot's otherwise.
        const setGpuMaps = (active: boolean) => {
            if (gpuMapContourSetting.active === active) return;
            gpuMapContourSetting.active = active;
            const state = store.getState();
            applyGpuMapContours(state.maps as unknown as MoorhenMap[], state.mapContourSettings.visibleMaps);
        };
        const dropRenderer = () => {
            maps?.destroy();
            maps = null;
            mapsFailed = false;
            renderer?.destroy();
            renderer = null;
            setGpuMaps(false);
        };
        // From now on WebGL draws everything, as without this.
        const release = () => {
            unsubscribe();
            unsubscribe = () => {};
            if (redrawRequest) cancelAnimationFrame(redrawRequest);
            redrawRequest = 0;
            if (view.externalRenderer === external) view.externalRenderer = null;
            deferWebGLUploads(store, false);
            show(false);
            setGpuMaps(false);
        };
        const fail = (message: string, starting = false) => {
            if (cancelled || gaveUp) return;
            gaveUp = true;
            if (starting) console.info(`WebGPU main view: WebGPU could not start (${message}). WebGL draws the main view.`);
            else console.error(`WebGPU main view: ${message}. WebGL draws the main view from now on.`);
            release();
            dropRenderer();
            view.drawScene();
        };
        const lost = (message: string) => {
            if (cancelled || gaveUp) return;
            const now = performance.now();
            losses.push(now);
            while (losses.length > 0 && now - losses[0] > 60_000) losses.shift();
            dropRenderer();
            if (losses.length > MAX_LOSSES) {
                fail(`${message} (${losses.length} devices lost in a minute)`);
                return;
            }
            console.warn(`WebGPU main view: ${message}. Making a new device; WebGL draws meanwhile.`);
            // WebGL draws until the new renderer is ready (willDraw: "WebGPU is not ready").
            view.drawScene();
            start(true);
        };

        const external: WebGPUMainViewRenderer = {
            name: "WebGPU",
            canvas,
            webGLReason: null,
            framesDrawn: 0,
            isShowing() {
                return !!renderer && external.webGLReason === null && external.framesDrawn > 0;
            },
            async snapshot(width: number, height: number, options: { transparentBackground?: boolean } = {}) {
                if (!renderer) throw new Error("WebGPU is not drawing the main view");
                const state = store.getState();
                const shot = await renderer.snapshot(state.glRef.displayBuffers ?? [], view, maps?.frame(state) ?? [], width, height, {
                    softShadows: true, transparentBackground: !!options.transparentBackground,
                });
                return shot.data;
            },
            get lastFrame() {
                if (!lastReport) return null;
                const { plan } = lastReport;
                return {
                    meshes: plan.draws.length, triangles: plan.triangles, spheres: plan.spheres, segments: plan.segments,
                    mapTriangles: maps?.triangles ?? 0, peelLayers: lastReport.peelLayers,
                };
            },
            takeGpuTime() {
                return renderer?.takeFrameGpuTime() ?? null;
            },
            willDraw() {
                // A recording started while WebGL drew records WebGL's canvas, so WebGL keeps
                // drawing until it ends; one started while WebGPU drew records this one.
                const recorder = moorhenInstance.getVideoRecorderRef()?.current;
                const recordingWebGLCanvas = !!recorder?.isRecording?.() && recorder.recordingCanvas !== canvas;
                const reason = renderer ? webGLOnlyReason(view, recordingWebGLCanvas) : "WebGPU is not ready";
                if (reason !== lastReason) {
                    if (reason && lastReason !== undefined) console.info(`WebGPU main view: WebGL draws while there is ${reason}.`);
                    lastReason = reason;
                }
                (external as { webGLReason: string | null }).webGLReason = reason;
                if (maps?.failed) mapsFailed = true;
                setGpuMaps(!reason && !!maps && !mapsFailed);
                show(!reason);
                return !reason;
            },
            draw() {
                if (!renderer) return;
                // The WebGL canvas's drawing buffer and box, which MGWebGL keeps the size of the view.
                const glCanvas = view.canvas as HTMLCanvasElement;
                if (canvas.width !== glCanvas.width) canvas.width = glCanvas.width;
                if (canvas.height !== glCanvas.height) canvas.height = glCanvas.height;
                if (canvas.style.width !== glCanvas.style.width) canvas.style.width = glCanvas.style.width;
                if (canvas.style.height !== glCanvas.style.height) canvas.style.height = glCanvas.style.height;
                try {
                    const state = store.getState();
                    const gpuDraws = maps?.frame(state) ?? [];
                    lastReport = renderer.render(state.glRef.displayBuffers ?? [], view, gpuDraws);
                    (external as { framesDrawn: number }).framesDrawn++;
                } catch (err) {
                    fail(err instanceof Error ? err.message : String(err));
                }
            },
            statsText() {
                if (!renderer || !lastReport) return "WebGPU";
                const gpu = renderer.takeFrameGpuTime();
                const parts = [
                    "WebGPU",
                    `${count(lastReport.plan.triangles)} tris`,
                    ...(lastReport.peelLayers ? [`${lastReport.peelLayers} layers peeled`] : []),
                    ...(gpu && gpu.count > 0 ? [`gpu ${gpu.meanMs.toFixed(2)} ms`] : []),
                ];
                return parts.join(" | ");
            },
        };

        // Take the view (the first time) or take it back (after a lost device) with a new renderer.
        const start = (again: boolean) => {
            WebGPUPreviewRenderer.create(canvas, message => fail(message), { onDeviceLost: lost })
                .then(created => {
                    if (cancelled || gaveUp) {
                        created.destroy();
                        return;
                    }
                    renderer = created;
                    if (!again) {
                        view.externalRenderer = external;
                        deferWebGLUploads(store, true);
                        // Changes that ask for no frame of their own, redrawn for here, once a frame
                        // at most (the preview followed the whole store for the same reason):
                        //   - a new set of buffers in the store: a map contoured again by Coot;
                        //   - the map contour settings and the maps: maps contoured on the GPU read
                        //     their level, radius and style when a frame is drawn, and a level or
                        //     radius change asks for none - opacity worked only because it does.
                        const watched = (state: RootState) => [state.glRef.displayBuffers, state.mapContourSettings, state.maps];
                        let last = watched(store.getState());
                        unsubscribe = store.subscribe(() => {
                            const now = watched(store.getState());
                            if (now.every((value, i) => value === last[i])) return;
                            last = now;
                            if (!redrawRequest) {
                                redrawRequest = requestAnimationFrame(() => {
                                    redrawRequest = 0;
                                    if (view.externalRenderer === external) view.drawScene();
                                });
                            }
                        });
                    } else {
                        console.info("WebGPU main view: a new device is drawing.");
                    }
                    view.drawScene();
                    // Maps contoured on the GPU, on this renderer's device.
                    GpuMapLayer.create(created.gpuDevice, () => view.drawScene())
                        .then(layer => {
                            if (cancelled || renderer !== created) layer.destroy();
                            else { maps = layer; view.drawScene(); }
                        })
                        .catch(err => console.warn("WebGPU main view: no GPU map contours (Coot contours the maps):", err));
                })
                .catch(err => {
                    const message = err instanceof Error ? err.message : String(err);
                    if (again) fail(`no new device could be made after one was lost: ${message}`);
                    else fail(message, true);
                });
        };

        show(false);
        start(false);

        return () => {
            cancelled = true;
            release();
            dropRenderer();
            // WebGL draws the view again, building what waited.
            view.drawScene();
        };
    }, [props.glRef, store, moorhenInstance]);

    // Over the WebGL canvas and under the 2D overlay's canvases (which come after it, at the same
    // z-index), passing the mouse through to the WebGL canvas.
    return <canvas
        ref={canvasRef}
        data-testid="webgpu-main-view"
        style={{ position: "absolute", top: 0, left: 0, zIndex: 0, pointerEvents: "none", visibility: "hidden" }}
    />;
};
