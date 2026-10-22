import { useEffect, useRef, useState } from "react";
import { useStore } from "react-redux";
import { useMoorhenInstance } from "../../InstanceManager";
import type { RootState } from "../../store/MoorhenReduxStore";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { PreviewFrameReport, WebGPUPreviewRenderer, webGPUUnavailableReason } from "../../WebGPUComponents/previewRenderer";
import { describeSkipped } from "../../WebGPUComponents/previewScene";

/** How often the status line may change, ms. It would otherwise re-render on every frame. */
const STATUS_INTERVAL = 250;

const describeFrame = (report: PreviewFrameReport): { drawn: string; skipped: string } => {
    const { plan, cpuMs } = report;
    const triangles = plan.triangles >= 1e6
        ? `${(plan.triangles / 1e6).toFixed(2)}M`
        : plan.triangles >= 1e3 ? `${(plan.triangles / 1e3).toFixed(1)}k` : `${plan.triangles}`;
    return {
        drawn: `${plan.draws.length} meshes, ${triangles} triangles, ${cpuMs.toFixed(1)} ms CPU`,
        skipped: describeSkipped(plan.skipped),
    };
};

/**
 * The scene drawn again by the WebGPU renderer, in its own canvas, following the main view.
 *
 * View only: it takes no mouse input, and redraws whenever the main view draws a frame. It reads
 * the scene's DisplayBuffers from the store and the camera from the WebGL renderer; nothing is
 * shared between the two contexts.
 */
const WebGPUPreview = () => {
    const moorhenInstance = useMoorhenInstance();
    const store = useStore<RootState>();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [adapter, setAdapter] = useState<string>("");
    const [drawn, setDrawn] = useState<string>("Starting WebGPU…");
    const [skipped, setSkipped] = useState<string>("");
    const [error, setError] = useState<string | null>(webGPUUnavailableReason());

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas || webGPUUnavailableReason()) return;
        // The modal renders its body once off-screen, hidden, to measure it, and then again for
        // real. Starting a GPU device for the measuring pass would only be torn down again.
        if (getComputedStyle(container).visibility === "hidden") return;

        // The same route MoviePanel takes to the WebGL renderer.
        const glRef = moorhenInstance.getVideoRecorderRef().current?.glRef;
        if (!glRef?.current) {
            setError("The main view is not ready yet. Close this and open it again once a structure is showing.");
            return;
        }

        let renderer: WebGPUPreviewRenderer | null = null;
        let cancelled = false;
        let failed = false;
        let frameRequest = 0;
        let lastStatus = 0;
        let unsubscribe: () => void = () => {};

        // After a WebGPU error, show it and stop drawing: every later frame would only repeat it
        // (or, once the device is gone, throw).
        const fail = (message: string) => {
            failed = true;
            setError(message);
        };

        const draw = () => {
            frameRequest = 0;
            const gl = glRef.current;
            if (!renderer || !gl || failed) return;
            let report: PreviewFrameReport;
            try {
                report = renderer.render(store.getState().glRef.displayBuffers ?? [], gl);
            } catch (err) {
                fail(err instanceof Error ? err.message : String(err));
                return;
            }
            const now = performance.now();
            if (now - lastStatus > STATUS_INTERVAL) {
                lastStatus = now;
                const text = describeFrame(report);
                setDrawn(text.drawn);
                setSkipped(text.skipped);
            }
        };
        // Several drawScenes can happen in one frame (a hover and a camera step, say); one
        // preview frame covers them all.
        const requestDraw = () => {
            if (!frameRequest && !failed) frameRequest = requestAnimationFrame(draw);
        };

        const resize = () => {
            const ratio = window.devicePixelRatio || 1;
            const width = Math.max(1, Math.round(container.clientWidth * ratio));
            const height = Math.max(1, Math.round(container.clientHeight * ratio));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            requestDraw();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(container);
        resize();

        WebGPUPreviewRenderer.create(canvas, fail)
            .then(created => {
                if (cancelled) {
                    created.destroy();
                    return;
                }
                renderer = created;
                setAdapter(created.adapterDescription);
                unsubscribe = glRef.current?.onFrameDrawn(requestDraw) ?? unsubscribe;
                requestDraw();
            })
            .catch(err => {
                if (!cancelled) setError(err instanceof Error ? err.message : String(err));
            });

        return () => {
            cancelled = true;
            observer.disconnect();
            unsubscribe();
            if (frameRequest) cancelAnimationFrame(frameRequest);
            renderer?.destroy();
            renderer = null;
        };
    }, [moorhenInstance, store]);

    return (
        <div style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, gap: "0.25rem" }}>
            <div
                ref={containerRef}
                style={{ position: "relative", flex: "1 1 auto", minHeight: 150, overflow: "hidden" }}
            >
                <canvas
                    ref={canvasRef}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: error ? "none" : "block" }}
                />
                {error && <div style={{ padding: "0.5rem" }}>{error}</div>}
            </div>
            {!error && (
                <div style={{ fontSize: "0.8rem", lineHeight: 1.3, opacity: 0.8 }}>
                    <div>{adapter ? `${adapter} · ${drawn}` : drawn}</div>
                    {skipped && <div>Not drawn yet: {skipped}</div>}
                </div>
            )}
        </div>
    );
};

export const MoorhenWebGPUPreviewModal = (props: ModalComponentProps) => {
    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.WEBGPU_PREVIEW}
            headerTitle="WebGPU preview (test)"
            initialWidth={520}
            initialHeight={420}
            minWidth={240}
            minHeight={200}
            overflowY="hidden"
            overflowX="hidden"
            footer={null}
            openDocked={props.openDocked}
            body={<WebGPUPreview />}
        />
    );
};
