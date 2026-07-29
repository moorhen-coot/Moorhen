import type { Locator, Page } from "@playwright/test";

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
    compareWithSnapshot?: string;
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
    loadFiles: (files: MoorhenLoadFilesInput, origin?: string) => Promise<MoorhenLoadResult[]>;
    callInstanceMethod: <T = unknown>(methodPath: string, ...args: unknown[]) => Promise<T>;
    getObjectCounts: () => Promise<{ moleculeCount: number; mapCount: number }>;
    getSceneSettings: () => Promise<SceneSettingsSnapshot>;
    getWebGLStats: () => Promise<WebGLCanvasStats>;
    buttonClick: (ariaLabel: string) => Promise<void>;
    waitForWebGLRenderSettle: (options?: Omit<WebGLSettleOptions, "elementId">) => Promise<WebGLCanvasStats>;
    assertPageScreenshotBaseline: (options: PageScreenshotBaselineOptions) => Promise<void>;
};

export type MoorhenLoadResult = {
    type: "molecule" | "map";
    fileName: string;
};

export type MoorhenLoadFilesInput =
    | File[]
    | File
    | FileList
    | string
    | string[]
    | URL
    | URL[]
    | { url: string | URL; filename: string }[]
    | { url: string | URL; filename: string };

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
