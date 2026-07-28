import { expect, test, type Locator, type Page } from "@playwright/test";

type ScreenshotComparisonPolicy = {
    label: string;
    threshold: number;
    maxDiffPixels?: number;
    maxDiffPixelRatio?: number;
};

function getScreenshotComparisonPolicy(): ScreenshotComparisonPolicy {
    // Headed runs can have tiny compositor/AA variance; keep CI/headless fully strict.
    if (process.env.MOORHEN_E2E_HEADED_SCREENSHOT_TOLERANCE === "1") {
        const ratioFromEnv = Number(process.env.MOORHEN_E2E_HEADED_MAX_DIFF_PIXEL_RATIO ?? "0.01");
        const thresholdFromEnv = Number(process.env.MOORHEN_E2E_HEADED_THRESHOLD ?? "0.2");
        return {
            label: "headed-relaxed",
            threshold: Number.isFinite(thresholdFromEnv) ? thresholdFromEnv : 0.2,
            maxDiffPixelRatio: Number.isFinite(ratioFromEnv) ? ratioFromEnv : 0.01,
        };
    }

    return {
        label: "strict",
        threshold: 0,
        maxDiffPixels: 0,
    };
}

export async function gotoWebComponentPage(page: Page): Promise<Locator> {
    await page.goto("/webcomponent.html");
    const host = page.locator("moorhen-web-component#moorhen-test");
    await expect(host).toBeVisible();
    return host;
}

export async function waitForMoorhenReady(page: Page, elementId = "moorhen-test"): Promise<void> {
    await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as (HTMLElement & { ready?: boolean }) | null;
        if (!host) {
            throw new Error(`Unable to find web component host with id '${targetId}'`);
        }

        if (host.ready === true) return;

        await new Promise<void>((resolve, reject) => {
            const timeoutId = window.setTimeout(() => {
                window.removeEventListener("moorhenReady", onReady as EventListener);
                reject(new Error("Timed out waiting for moorhenReady event"));
            }, 120000);

            const onReady = (event: CustomEvent<{ id?: string }>) => {
                if (!event.detail?.id || event.detail.id === targetId) {
                    window.clearTimeout(timeoutId);
                    window.removeEventListener("moorhenReady", onReady as EventListener);
                    resolve();
                }
            };

            window.addEventListener("moorhenReady", onReady as EventListener);
        });
    }, elementId);
}

export async function openMainMenu(host: Locator): Promise<void> {
    const toggle = host.locator("button.moorhen__main-menu-toggle");
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(host.locator("button.moorhen__main-menu-button").first()).toBeVisible();
}

export async function openSearchBar(host: Locator): Promise<void> {
    const searchToggle = host.locator(".moorhen__search-bar-closed button");
    await expect(searchToggle).toBeVisible();
    await searchToggle.click();
    await expect(host.locator("input.moorhen__search-bar-input")).toBeVisible();
}

export type CanvasScreenshotBaselineOptions = {
    snapshotName: string | string[];
    canvasSelector?: string;
};

export type PageScreenshotBaselineOptions = {
    snapshotName: string | string[];
    fullPage?: boolean;
};

/**
 * Reusable strict pixel regression check for canvas output.
 * Baseline files are managed by Playwright snapshots (`--update-snapshots`).
 */
export async function assertCanvasScreenshotBaseline(host: Locator, options: CanvasScreenshotBaselineOptions): Promise<void> {
    const {
        snapshotName,
        canvasSelector = "canvas",
    } = options;

    const canvas = host.locator(canvasSelector).first();
    await expect(canvas).toBeVisible();
    const testInfo = test.info();
    const comparisonPolicy = getScreenshotComparisonPolicy();
    const maxDiffOption = comparisonPolicy.maxDiffPixelRatio !== undefined
        ? { maxDiffPixelRatio: comparisonPolicy.maxDiffPixelRatio }
        : { maxDiffPixels: comparisonPolicy.maxDiffPixels ?? 0 };
    const normalizedSnapshotName = Array.isArray(snapshotName) ? snapshotName.join("/") : snapshotName;
    const mismatchBaseName = normalizedSnapshotName.replaceAll("/", "-").replace(/\.(png|jpg|jpeg|webp)$/i, "");
    const baselinePath = testInfo.snapshotPath(normalizedSnapshotName);
    const outputPath = testInfo.outputPath(`screenshot-mismatch-${mismatchBaseName}.png`);

    try {
        await expect(canvas, `Screenshot baseline mismatch: ${normalizedSnapshotName} (${comparisonPolicy.label})`).toHaveScreenshot(snapshotName, {
            animations: "disabled",
            caret: "hide",
            scale: "css",
            threshold: comparisonPolicy.threshold,
            ...maxDiffOption,
        });
    } catch (error) {
        await canvas.screenshot({ path: outputPath });

        const originalMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
            [
                `Screenshot baseline mismatch for '${normalizedSnapshotName}'.`,
                `Project: ${testInfo.project.name}`,
                `Comparison mode: ${comparisonPolicy.label} (threshold=${comparisonPolicy.threshold}, ${comparisonPolicy.maxDiffPixelRatio !== undefined ? `maxDiffPixelRatio=${comparisonPolicy.maxDiffPixelRatio}` : `maxDiffPixels=${comparisonPolicy.maxDiffPixels ?? 0}`})`,
                `Expected baseline: ${baselinePath}`,
                `Captured current canvas: ${outputPath}`,
                "To refresh baselines:",
                "  npm run test:e2e:update-snapshots",
                "  npm run test:e2e:update-snapshots:chromium",
                "  npm run test:e2e:update-snapshots:firefox",
                "",
                "Original Playwright diff summary:",
                originalMessage,
            ].join("\n")
        );
    }
}

/**
 * Reusable strict pixel regression check for full-page/viewport UI output.
 * Baseline files are managed by Playwright snapshots (`--update-snapshots`).
 */
export async function assertPageScreenshotBaseline(page: Page, options: PageScreenshotBaselineOptions): Promise<void> {
    const { snapshotName, fullPage = false } = options;
    const testInfo = test.info();
    const comparisonPolicy = getScreenshotComparisonPolicy();
    const maxDiffOption = comparisonPolicy.maxDiffPixelRatio !== undefined
        ? { maxDiffPixelRatio: comparisonPolicy.maxDiffPixelRatio }
        : { maxDiffPixels: comparisonPolicy.maxDiffPixels ?? 0 };
    const normalizedSnapshotName = Array.isArray(snapshotName) ? snapshotName.join("/") : snapshotName;
    const mismatchBaseName = normalizedSnapshotName.replaceAll("/", "-").replace(/\.(png|jpg|jpeg|webp)$/i, "");
    const baselinePath = testInfo.snapshotPath(normalizedSnapshotName);
    const outputPath = testInfo.outputPath(`screenshot-mismatch-${mismatchBaseName}.png`);

    try {
        await expect(page, `Screenshot baseline mismatch: ${normalizedSnapshotName} (${comparisonPolicy.label})`).toHaveScreenshot(snapshotName, {
            animations: "disabled",
            caret: "hide",
            scale: "css",
            fullPage,
            threshold: comparisonPolicy.threshold,
            ...maxDiffOption,
        });
    } catch (error) {
        await page.screenshot({ path: outputPath, fullPage });

        const originalMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
            [
                `Screenshot baseline mismatch for '${normalizedSnapshotName}'.`,
                `Project: ${testInfo.project.name}`,
                `Page URL: ${page.url()}`,
                `Comparison mode: ${comparisonPolicy.label} (threshold=${comparisonPolicy.threshold}, ${comparisonPolicy.maxDiffPixelRatio !== undefined ? `maxDiffPixelRatio=${comparisonPolicy.maxDiffPixelRatio}` : `maxDiffPixels=${comparisonPolicy.maxDiffPixels ?? 0}`})`,
                `Expected baseline: ${baselinePath}`,
                `Captured current page: ${outputPath}`,
                "To refresh baselines:",
                "  npm run test:e2e:update-snapshots",
                "  npm run test:e2e:update-snapshots:chromium",
                "  npm run test:e2e:update-snapshots:firefox",
                "",
                "Original Playwright diff summary:",
                originalMessage,
            ].join("\n")
        );
    }
}

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

export type BrowserFixtureFile = {
    name: string;
    mimeType: string;
    bytes: number[];
};

export type MoorhenLoadSummary = {
    loadedTypes: ("molecule" | "map")[];
    loadedFileNames: string[];
    moleculeCount: number;
    mapCount: number;
};

export type WebGLSettleOptions = {
    elementId?: string;
    timeoutMs?: number;
    minSettleMs?: number;
    minDisplayBufferCount?: number;
};

export async function getMoorhenObjectCounts(page: Page, elementId = "moorhen-test"): Promise<{ moleculeCount: number; mapCount: number }> {
    return page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as {
            getMoorhenInstance: () => Promise<{ store: { getState: () => any } }>;
        } | null;

        if (!host?.getMoorhenInstance) {
            throw new Error(`Unable to find web component host with id '${targetId}'`);
        }

        const instance = await host.getMoorhenInstance();
        const state = instance.store.getState();
        return {
            moleculeCount: state?.molecules?.moleculeList?.length ?? 0,
            mapCount: state?.maps?.length ?? 0,
        };
    }, elementId);
}

/**
 * Wait until WebGL rendering appears to settle after async loading/animation work.
 * This avoids taking strict baselines while the scene is still changing.
 */
export async function waitForWebGLRenderSettle(page: Page, options: WebGLSettleOptions = {}): Promise<WebGLCanvasStats> {
    const {
        elementId = "moorhen-test",
        timeoutMs = 30_000,
        minSettleMs = 1_500,
        minDisplayBufferCount = 1,
    } = options;

    const startedAt = Date.now();
    let stableTicks = 0;
    let lastSignature: number | null = null;
    let lastDisplayBufferCount: number | null = null;
    let lastStats: WebGLCanvasStats | null = null;

    await expect
        .poll(
            async () => {
                const stats = await getWebGLCanvasStats(page, elementId);
                lastStats = stats;

                const elapsed = Date.now() - startedAt;
                const isDrawable =
                    stats.readPixelsSucceeded &&
                    stats.drawingBufferWidth > 0 &&
                    stats.drawingBufferHeight > 0 &&
                    stats.displayBufferCount >= minDisplayBufferCount;

                if (!isDrawable || elapsed < minSettleMs) {
                    stableTicks = 0;
                    lastSignature = stats.pixelSignature;
                    lastDisplayBufferCount = stats.displayBufferCount;
                    return false;
                }

                const sameAsPrevious =
                    lastSignature !== null &&
                    lastDisplayBufferCount !== null &&
                    stats.pixelSignature === lastSignature &&
                    stats.displayBufferCount === lastDisplayBufferCount;

                stableTicks = sameAsPrevious ? stableTicks + 1 : 0;
                lastSignature = stats.pixelSignature;
                lastDisplayBufferCount = stats.displayBufferCount;

                return stableTicks >= 2;
            },
            {
                timeout: timeoutMs,
                intervals: [300, 400, 500],
            }
        )
        .toBe(true);

    return lastStats as WebGLCanvasStats;
}

export async function loadFilesViaMoorhenInstance(
    page: Page,
    files: BrowserFixtureFile[],
    elementId = "moorhen-test"
): Promise<MoorhenLoadSummary> {
    return page.evaluate(
        async ({ targetId, inputFiles }) => {
            const host = document.getElementById(targetId) as unknown as {
                getMoorhenInstance: () => Promise<{
                    files: {
                        loadFiles: (
                            files: File[] | File | FileList | string | string[] | URL | URL[] | { url: string | URL; filename: string }[] | { url: string | URL; filename: string },
                            origin?: string
                        ) => Promise<{ type: "molecule" | "map"; fileName: string }[]>;
                    };
                    store: { getState: () => any };
                }>;
            } | null;

            if (!host?.getMoorhenInstance) {
                throw new Error(`Unable to find web component host with id '${targetId}'`);
            }

            const instance = await host.getMoorhenInstance();
            const browserFiles = inputFiles.map(file => {
                const payload = new Uint8Array(file.bytes);
                return new File([payload], file.name, { type: file.mimeType });
            });

            // Explicitly use the public Moorhen instance file-loading API.
            const loaded = await instance.files.loadFiles(browserFiles, "playwright-e2e");
            const state = instance.store.getState();

            return {
                loadedTypes: loaded.map(item => item.type),
                loadedFileNames: loaded.map(item => item.fileName),
                moleculeCount: state?.molecules?.moleculeList?.length ?? 0,
                mapCount: state?.maps?.length ?? 0,
            };
        },
        { targetId: elementId, inputFiles: files }
    );
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
