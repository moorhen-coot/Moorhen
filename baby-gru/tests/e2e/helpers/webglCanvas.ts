import type { Locator, Page } from "@playwright/test";
import type { WebGLCanvasStats } from "./types";

export async function getWebGLCanvasLocator(page: Page, webComponentId: string): Promise<Locator> {
    const markerAttr = "data-e2e-webgl-canvas-target";

    await page.evaluate(({ targetId, marker }) => {
        const host = document.getElementById(targetId) as HTMLElement | null;
        if (!host?.shadowRoot) {
            throw new Error(`Shadow root not found for element '${targetId}'`);
        }

        const canvases = Array.from(host.shadowRoot.querySelectorAll("canvas"));
        if (canvases.length === 0) {
            throw new Error(`No canvas elements found in web component '${targetId}'`);
        }

        let webglCanvas = canvases.find(canvas => {
            try {
                return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
            } catch {
                return false;
            }
        });

        // Fallback: choose the largest canvas in case context lookup is not available.
        if (!webglCanvas) {
            webglCanvas = canvases
                .slice()
                .sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
        }

        canvases.forEach(canvas => canvas.removeAttribute(marker));
        webglCanvas.setAttribute(marker, "1");
    }, { targetId: webComponentId, marker: markerAttr });

    return page.locator(`#${webComponentId}`).locator(`canvas[${markerAttr}="1"]`).first();
}

/**
 * Hide or show the WebGL canvas via the web component's genuine hide/show API
 * (`hideWebGLCanvas` / `showWebGLCanvas`). Unlike Playwright masking, only the
 * canvas element itself is hidden — DOM elements layered on top of it (2D
 * overlays, UI controls) remain visible.
 */
export async function setWebGLCanvasVisible(page: Page, webComponentId: string, visible: boolean): Promise<void> {
    await page.evaluate(({ targetId, shouldShow }) => {
        const host = document.getElementById(targetId) as (HTMLElement & {
            hideWebGLCanvas?: () => void;
            showWebGLCanvas?: () => void;
        }) | null;
        if (!host) {
            return;
        }
        if (shouldShow) {
            host.showWebGLCanvas?.();
        } else {
            host.hideWebGLCanvas?.();
        }
    }, { targetId: webComponentId, shouldShow: visible });
}

export async function setCanvasCaptureIsolation(page: Page, webComponentId: string, enabled: boolean): Promise<void> {
    await page.evaluate(({ targetId, shouldEnable }) => {
        const host = document.getElementById(targetId) as HTMLElement | null;
        if (!host?.shadowRoot) {
            return;
        }

        const root = host.shadowRoot;
        const hiddenMarker = "data-e2e-hidden-for-canvas-capture";
        const prevVisibilityAttr = "data-e2e-prev-visibility";
        const targetCanvas = root.querySelector("canvas[data-e2e-webgl-canvas-target=\"1\"]") as HTMLCanvasElement | null;

        if (!shouldEnable) {
            root.querySelectorAll<HTMLElement>(`[${hiddenMarker}="1"]`).forEach(el => {
                const prevVisibility = el.getAttribute(prevVisibilityAttr);
                if (prevVisibility === null) {
                    el.style.removeProperty("visibility");
                } else {
                    el.style.visibility = prevVisibility;
                }
                el.removeAttribute(hiddenMarker);
                el.removeAttribute(prevVisibilityAttr);
            });
            return;
        }

        if (!targetCanvas) {
            return;
        }

        const keep = new Set<Node>();
        let node: Node | null = targetCanvas;
        while (node) {
            keep.add(node);
            node = node.parentNode;
        }

        root.querySelectorAll<HTMLElement>("*").forEach(el => {
            if (keep.has(el)) {
                return;
            }
            if (el.tagName === "STYLE" || el.tagName === "SCRIPT" || el.tagName === "LINK") {
                return;
            }
            if (el.getAttribute(hiddenMarker) === "1") {
                return;
            }

            el.setAttribute(prevVisibilityAttr, el.style.visibility ?? "");
            el.style.visibility = "hidden";
            el.setAttribute(hiddenMarker, "1");
        });
    }, { targetId: webComponentId, shouldEnable: enabled });
}

export async function getWebGLCanvasStats(page: Page, elementId = "moorhen-test"): Promise<WebGLCanvasStats> {
    return page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as HTMLElement | null;
        if (!host?.shadowRoot) {
            throw new Error(`Shadow root not found for element '${targetId}'`);
        }

        const canvases = Array.from(host.shadowRoot.querySelectorAll("canvas"));
        const webglCanvas = canvases.find(canvas => {
            const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
            return gl !== null;
        });

        if (!webglCanvas) {
            return {
                width: 0,
                height: 0,
                cssWidth: 0,
                cssHeight: 0,
                hasWebGL: false,
                isInstanceReady: false,
                isWebGL2: false,
                hasGLCtxInStore: false,
                drawingBufferWidth: 0,
                drawingBufferHeight: 0,
                readPixelsSucceeded: false,
                canvasSizeInStore: [0, 0],
                rttFramebufferSizeInStore: [0, 0],
                displayBufferCount: 0,
                sampledPixels: 0,
                nonTransparentPixels: 0,
                nonZeroRgbPixels: 0,
                uniqueColors: 0,
                pixelSignature: 0,
            };
        }

        const webComponent = host as unknown as {
            getMoorhenInstance: () => Promise<{
                isReady: () => boolean;
                store: { getState: () => any };
            }>;
        };

        const instance = await webComponent.getMoorhenInstance();
        const state = instance.store.getState();
        const canvasSizeFromStore = (state?.glRef?.canvasSize as [number, number]) ?? [0, 0];
        const rttSizeFromStore = (state?.glRef?.rttFramebufferSize as [number, number]) ?? [0, 0];
        const displayBufferCount = (state?.glRef?.displayBuffers?.length as number) ?? 0;

        const gl = (webglCanvas.getContext("webgl2") || webglCanvas.getContext("webgl")) as
            | WebGL2RenderingContext
            | WebGLRenderingContext
            | null;
        const rect = webglCanvas.getBoundingClientRect();

        if (!gl) {
            return {
                width: webglCanvas.width,
                height: webglCanvas.height,
                cssWidth: rect.width,
                cssHeight: rect.height,
                hasWebGL: false,
                isInstanceReady: instance.isReady(),
                isWebGL2: Boolean(state?.glRef?.isWebGL2),
                hasGLCtxInStore: Boolean(state?.glRef?.glCtx),
                drawingBufferWidth: 0,
                drawingBufferHeight: 0,
                readPixelsSucceeded: false,
                canvasSizeInStore: canvasSizeFromStore,
                rttFramebufferSizeInStore: rttSizeFromStore,
                displayBufferCount,
                sampledPixels: 0,
                nonTransparentPixels: 0,
                nonZeroRgbPixels: 0,
                uniqueColors: 0,
                pixelSignature: 0,
            };
        }

        const sampleWidth = Math.max(1, Math.min(128, webglCanvas.width));
        const sampleHeight = Math.max(1, Math.min(128, webglCanvas.height));

        const data = new Uint8Array(sampleWidth * sampleHeight * 4);
        const startX = Math.max(0, Math.floor((webglCanvas.width - sampleWidth) / 2));
        const startY = Math.max(0, Math.floor((webglCanvas.height - sampleHeight) / 2));
        let readPixelsSucceeded = false;
        try {
            gl.readPixels(startX, startY, sampleWidth, sampleHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
            readPixelsSucceeded = true;
        } catch {
            readPixelsSucceeded = false;
        }

        let nonTransparentPixels = 0;
        let nonZeroRgbPixels = 0;
        let pixelSignature = 0;
        const uniqueColors = new Set<string>();
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a > 0) {
                nonTransparentPixels += 1;
            }
            if (r !== 0 || g !== 0 || b !== 0) {
                nonZeroRgbPixels += 1;
            }
            uniqueColors.add(`${r},${g},${b},${a}`);
            pixelSignature = (pixelSignature + r * 3 + g * 5 + b * 7 + a * 11) % 2147483647;
        }

        return {
            width: webglCanvas.width,
            height: webglCanvas.height,
            cssWidth: rect.width,
            cssHeight: rect.height,
            hasWebGL: true,
            isInstanceReady: instance.isReady(),
            isWebGL2: Boolean(state?.glRef?.isWebGL2),
            hasGLCtxInStore: Boolean(state?.glRef?.glCtx),
            drawingBufferWidth: gl.drawingBufferWidth,
            drawingBufferHeight: gl.drawingBufferHeight,
            readPixelsSucceeded,
            canvasSizeInStore: canvasSizeFromStore,
            rttFramebufferSizeInStore: rttSizeFromStore,
            displayBufferCount,
            sampledPixels: sampleWidth * sampleHeight,
            nonTransparentPixels,
            nonZeroRgbPixels,
            uniqueColors: uniqueColors.size,
            pixelSignature,
        };
    }, elementId);
}
