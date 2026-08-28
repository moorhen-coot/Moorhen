import type { Locator, Page } from "@playwright/test";
import type { MoorhenInstance } from "@/InstanceManager";

export type CanvasScreenshotBaselineOptions = {
    snapshotName: string | string[];
    canvasSelector?: string;
};

export type PageScreenshotBaselineOptions = {
    snapshotName: string | string[];
    fullPage?: boolean;
    canvasOnly?: boolean;
    canvasSelector?: string;
    webComponentId?: string;
    isolateCanvas?: boolean;
    snapshotSubfolder?: string;
    centerCrop?: {
        width: number;
        height: number;
    };
    /**
     * When true, the WebGL canvas is genuinely hidden (only the canvas element
     * itself, not overlays layered on top of it) before the page screenshot is
     * compared. Use this to ignore the WebGL canvas when its rendering is
     * unstable or not relevant to the assertion. Only applies to page/section
     * captures (not `canvasOnly`).
     */
    hideWebGLCanvas?: boolean;
};

export type WebGLCanvasStats = {
    width: number;
    height: number;
    cssWidth: number;
    cssHeight: number;
    hasWebGL: boolean;
    isInstanceReady: boolean;
    isWebGL2: boolean;
    hasGLCtxInStore: boolean;
    drawingBufferWidth: number;
    drawingBufferHeight: number;
    readPixelsSucceeded: boolean;
    canvasSizeInStore: [number, number];
    rttFramebufferSizeInStore: [number, number];
    displayBufferCount: number;
    sampledPixels: number;
    nonTransparentPixels: number;
    nonZeroRgbPixels: number;
    uniqueColors: number;
    pixelSignature: number;
};

export type MoorhenStartedSession = {
    page: Page;
    host: Locator;
    elementId: string;
    getInstance: () => Promise<MoorhenInstance>;
    buttonClick: (ariaLabel: string) => Promise<void>;
};

export type WebGLSettleOptions = {
    elementId?: string;
    timeoutMs?: number;
    minSettleMs?: number;
    minDisplayBufferCount?: number;
};

export type SceneSettingsSnapshot = {
    backgroundColor: [number, number, number, number];
    drawAxes: boolean;
    doPerspectiveProjection: boolean;
    doOutline: boolean;
};
