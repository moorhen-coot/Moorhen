import { useEffect, useRef } from "react";
import { useStore } from "react-redux";
import { useMoorhenInstance } from "../../InstanceManager";
import type { RootState } from "../../store/MoorhenReduxStore";
import type { MGWebGL } from "../../WebGLgComponents/mgWebGL";
import { deferWebGLUploads } from "../../WebGLgComponents/buildBuffers";
import { type ExternalRenderer, webGLOnlyReason } from "../../WebGLgComponents/externalRenderer";
import { type PreviewFrameReport, WebGPUPreviewRenderer } from "../../WebGPUComponents/previewRenderer";
import { GpuMapLayer } from "../../WebGPUComponents/mapContour/gpuMapLayer";

/** 1234567 → "1.23M", 12345 → "12.3k". */
const count = (n: number): string => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`;

/** What the main view's WebGPU renderer says about itself, for the instance API and tests. */
export interface WebGPUMainViewRenderer extends ExternalRenderer {
    /** Why WebGL drew the last frame offered, or null if WebGPU drew it. */
    readonly webGLReason: string | null;
    /** Frames WebGPU has drawn. */
    readonly framesDrawn: number;
    /** What the last frame WebGPU drew had in it. */
    readonly lastFrame: { meshes: number; triangles: number; spheres: number; segments: number } | null;
}

/**
 * The main view drawn by WebGPU (sceneSettings.useWebGPU), on a canvas laid over the WebGL one.
 *
 * MGWebGL keeps everything but the drawing - camera, mouse and keys, picking, labels, the frame
 * loop - and offers it each frame (externalRenderer.ts). This canvas takes no input: events go
 * through to the WebGL canvas underneath, as before. It is hidden whenever WebGL draws a frame
 * itself (webGLOnlyReason: multiple views, stereo, depth blur, outlines, a recording), so the
 * WebGL picture shows; screenshots read back from WebGL do not disturb it.
 *
 * While it is in use, WebGL's buffer uploads wait until WebGL draws (deferWebGLUploads). If WebGPU
 * fails - an error, a lost device - it gets out of the way and WebGL draws from then on.
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
        let cancelled = false;
        let lastReport: PreviewFrameReport | null = null;
        let lastReason: string | null | undefined = undefined;
        let redrawRequest = 0;
        let unsubscribe: () => void = () => {};

        const show = (visible: boolean) => {
            const visibility = visible ? "visible" : "hidden";
            if (canvas.style.visibility !== visibility) canvas.style.visibility = visibility;
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
        };
        const fail = (message: string) => {
            if (cancelled) return;
            console.error(`WebGPU main view: ${message}. WebGL draws the main view from now on.`);
            release();
            maps?.destroy();
            maps = null;
            renderer?.destroy();
            renderer = null;
            view.drawScene();
        };

        const external: WebGPUMainViewRenderer = {
            name: "WebGPU",
            webGLReason: null,
            framesDrawn: 0,
            get lastFrame() {
                if (!lastReport) return null;
                const { plan } = lastReport;
                return { meshes: plan.draws.length, triangles: plan.triangles, spheres: plan.spheres, segments: plan.segments };
            },
            willDraw() {
                const recording = !!moorhenInstance.getVideoRecorderRef()?.current?.isRecording?.();
                const reason = renderer ? webGLOnlyReason(view, recording) : "WebGPU is not ready";
                if (reason !== lastReason) {
                    if (reason && lastReason !== undefined) console.info(`WebGPU main view: WebGL draws while there is ${reason}.`);
                    lastReason = reason;
                }
                (external as { webGLReason: string | null }).webGLReason = reason;
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

        show(false);
        WebGPUPreviewRenderer.create(canvas, fail)
            .then(created => {
                if (cancelled) {
                    created.destroy();
                    return;
                }
                renderer = created;
                view.externalRenderer = external;
                deferWebGLUploads(store, true);
                // Changes that ask for no frame of their own, redrawn for here, once a frame at most
                // (the preview followed the whole store for the same reason):
                //   - a new set of buffers in the store: a map contoured again by Coot;
                //   - the map contour settings and the maps: maps contoured on the GPU (dev menu)
                //     read their level, radius and style when a frame is drawn, and a level or radius
                //     change asks for none - opacity worked only because it does.
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
                view.drawScene();
                // Maps contoured on the GPU (dev menu), as the preview draws them.
                GpuMapLayer.create(created.gpuDevice, () => view.drawScene())
                    .then(layer => {
                        if (cancelled || !renderer) layer.destroy();
                        else { maps = layer; view.drawScene(); }
                    })
                    .catch(err => console.warn("WebGPU main view: no GPU map contours:", err));
            })
            .catch(err => fail(err instanceof Error ? err.message : String(err)));

        return () => {
            cancelled = true;
            release();
            maps?.destroy();
            maps = null;
            renderer?.destroy();
            renderer = null;
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
