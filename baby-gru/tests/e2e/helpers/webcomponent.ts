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

export async function openMainMenu(page: Page): Promise<void> {
    const toggle = page.locator("button.moorhen__main-menu-toggle").first();
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator("button.moorhen__main-menu-button").first()).toBeVisible();
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
    canvasOnly?: boolean;
    canvasSelector?: string;
    webComponentId?: string;
    isolateCanvas?: boolean;
};

async function getWebGLCanvasLocator(page: Page, webComponentId: string): Promise<Locator> {
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

async function setCanvasCaptureIsolation(page: Page, webComponentId: string, enabled: boolean): Promise<void> {
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

function withBrowserSpecificSuffix(snapshotName: string | string[], suffix: string): string | string[] {
    const applySuffix = (value: string): string => {
        const extMatch = value.match(/\.[^./]+$/);
        if (!extMatch) {
            return `${value}-${suffix}`;
        }

        const ext = extMatch[0];
        const stem = value.slice(0, -ext.length);
        return `${stem}-${suffix}${ext}`;
    };

    if (Array.isArray(snapshotName)) {
        if (snapshotName.length === 0) {
            return snapshotName;
        }
        const segments = [...snapshotName];
        segments[segments.length - 1] = applySuffix(segments[segments.length - 1]);
        return segments;
    }

    return applySuffix(snapshotName);
}

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
    const resolvedSnapshotName = withBrowserSpecificSuffix(snapshotName, testInfo.project.name);
    const normalizedSnapshotName = Array.isArray(resolvedSnapshotName) ? resolvedSnapshotName.join("/") : resolvedSnapshotName;
    const mismatchBaseName = normalizedSnapshotName.replaceAll("/", "-").replace(/\.(png|jpg|jpeg|webp)$/i, "");
    const baselinePath = testInfo.snapshotPath(normalizedSnapshotName);
    const outputPath = testInfo.outputPath(`screenshot-mismatch-${mismatchBaseName}.png`);

    try {
        await expect(canvas, `Screenshot baseline mismatch: ${normalizedSnapshotName} (${comparisonPolicy.label})`).toHaveScreenshot(resolvedSnapshotName, {
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
    if (process.env.MOORHEN_E2E_DISABLE_STRICT_CANVAS_BASELINE === "1") {
        return;
    }

    const {
        snapshotName,
        fullPage = false,
        canvasOnly = false,
        canvasSelector = "canvas",
        webComponentId = "moorhen-test",
        isolateCanvas = true,
    } = options;
    const testInfo = test.info();
    const comparisonPolicy = getScreenshotComparisonPolicy();
    const maxDiffOption = comparisonPolicy.maxDiffPixelRatio !== undefined
        ? { maxDiffPixelRatio: comparisonPolicy.maxDiffPixelRatio }
        : { maxDiffPixels: comparisonPolicy.maxDiffPixels ?? 0 };
    const resolvedSnapshotName = withBrowserSpecificSuffix(snapshotName, testInfo.project.name);
    const normalizedSnapshotName = Array.isArray(resolvedSnapshotName) ? resolvedSnapshotName.join("/") : resolvedSnapshotName;
    const mismatchBaseName = normalizedSnapshotName.replaceAll("/", "-").replace(/\.(png|jpg|jpeg|webp)$/i, "");
    const baselinePath = testInfo.snapshotPath(normalizedSnapshotName);
    const outputPath = testInfo.outputPath(`screenshot-mismatch-${mismatchBaseName}.png`);

    const screenshotOptions = {
        animations: "disabled" as const,
        caret: "hide" as const,
        scale: "css" as const,
        threshold: comparisonPolicy.threshold,
        ...maxDiffOption,
    };

    const targetCanvas = canvasOnly
        ? (canvasSelector === "canvas" ? await getWebGLCanvasLocator(page, webComponentId) : page.locator(canvasSelector).first())
        : null;

    const shouldIsolateCanvas = Boolean(targetCanvas && isolateCanvas && canvasSelector === "canvas");

    try {
        if (shouldIsolateCanvas) {
            await setCanvasCaptureIsolation(page, webComponentId, true);
        }

        if (targetCanvas) {
            await expect(targetCanvas).toBeVisible();
            await expect(
                targetCanvas,
                `Screenshot baseline mismatch: ${normalizedSnapshotName} (${comparisonPolicy.label})`
            ).toHaveScreenshot(resolvedSnapshotName, screenshotOptions);
        } else {
            await expect(page, `Screenshot baseline mismatch: ${normalizedSnapshotName} (${comparisonPolicy.label})`).toHaveScreenshot(resolvedSnapshotName, {
                ...screenshotOptions,
                fullPage,
            });
        }
    } catch (error) {
        if (targetCanvas) {
            await targetCanvas.screenshot({ path: outputPath });
        } else {
            await page.screenshot({ path: outputPath, fullPage });
        }

        const originalMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
            [
                `Screenshot baseline mismatch for '${normalizedSnapshotName}'.`,
                `Project: ${testInfo.project.name}`,
                `Page URL: ${page.url()}`,
                `Capture target: ${targetCanvas ? `canvas (${canvasSelector === "canvas" ? `webgl:${webComponentId}` : canvasSelector})` : `page (fullPage=${fullPage})`}`,
                `Comparison mode: ${comparisonPolicy.label} (threshold=${comparisonPolicy.threshold}, ${comparisonPolicy.maxDiffPixelRatio !== undefined ? `maxDiffPixelRatio=${comparisonPolicy.maxDiffPixelRatio}` : `maxDiffPixels=${comparisonPolicy.maxDiffPixels ?? 0}`})`,
                `Expected baseline: ${baselinePath}`,
                `Captured current screenshot: ${outputPath}`,
                "To refresh baselines:",
                "  npm run test:e2e:update-snapshots",
                "  npm run test:e2e:update-snapshots:chromium",
                "  npm run test:e2e:update-snapshots:firefox",
                "",
                "Original Playwright diff summary:",
                originalMessage,
            ].join("\n")
        );
    } finally {
        if (shouldIsolateCanvas) {
            await setCanvasCaptureIsolation(page, webComponentId, false);
        }
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

export async function getSceneSettingsSnapshot(page: Page, elementId = "moorhen-test"): Promise<SceneSettingsSnapshot> {
    return page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as {
            getMoorhenInstance: () => Promise<{ store: { getState: () => any } }>;
        } | null;

        if (!host?.getMoorhenInstance) {
            throw new Error(`Unable to find web component host with id '${targetId}'`);
        }

        const instance = await host.getMoorhenInstance();
        const sceneSettings = instance.store.getState()?.sceneSettings;
        return {
            backgroundColor: (sceneSettings?.backgroundColor as [number, number, number, number]) ?? [1, 1, 1, 1],
            drawAxes: Boolean(sceneSettings?.drawAxes),
            doPerspectiveProjection: Boolean(sceneSettings?.doPerspectiveProjection),
            doOutline: Boolean(sceneSettings?.doOutline),
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
    files: MoorhenLoadFilesInput,
    origin = "playwright-e2e",
    elementId = "moorhen-test"
): Promise<MoorhenLoadResult[]> {
    return page.evaluate(
        async ({ targetId, inputFiles, inputOrigin }) => {
            const host = document.getElementById(targetId) as unknown as {
                getMoorhenInstance: () => Promise<{
                    files: {
                        loadFiles: (
                            files: File[] | File | FileList | string | string[] | URL | URL[] | { url: string | URL; filename: string }[] | { url: string | URL; filename: string },
                            origin?: string
                        ) => Promise<{ type: "molecule" | "map"; fileName: string }[]>;
                    };
                }>;
            } | null;

            if (!host?.getMoorhenInstance) {
                throw new Error(`Unable to find web component host with id '${targetId}'`);
            }

            const instance = await host.getMoorhenInstance();
            // `page.evaluate` serializes payloads across Node/browser contexts; cast here to match browser-side API typing.
            return await instance.files.loadFiles(inputFiles as Parameters<typeof instance.files.loadFiles>[0], inputOrigin);
        },
        { targetId: elementId, inputFiles: files, inputOrigin: origin }
    );
}

/**
 * High-level entrypoint to start the web component and get a simple test harness.
 * This keeps test bodies concise while preserving robust browser-context boundaries.
 */
export async function startAndGetInstance(page: Page, elementId = "moorhen-test"): Promise<MoorhenStartedSession> {
    const host = await gotoWebComponentPage(page);
    await waitForMoorhenReady(page, elementId);

    return {
        page,
        host,
        elementId,
        loadFiles: (files, origin) => loadFilesViaMoorhenInstance(page, files, origin, elementId),
        callInstanceMethod: async <T = unknown>(methodPath: string, ...args: unknown[]): Promise<T> => {
            const result = await page.evaluate(
                async ({ targetId, path, methodArgs }) => {
                    const hostElement = document.getElementById(targetId) as unknown as {
                        getMoorhenInstance: () => Promise<Record<string, unknown>>;
                    } | null;

                    if (!hostElement?.getMoorhenInstance) {
                        throw new Error(`Unable to find web component host with id '${targetId}'`);
                    }

                    const instance = await hostElement.getMoorhenInstance();
                    const segments = path.split(".").filter(Boolean);
                    if (segments.length === 0) {
                        throw new Error("methodPath must not be empty");
                    }

                    let target: unknown = instance;
                    for (let i = 0; i < segments.length - 1; i++) {
                        const key = segments[i];
                        target = (target as Record<string, unknown>)?.[key];
                        if (target === undefined || target === null) {
                            throw new Error(`Path '${path}' is invalid at '${key}'`);
                        }
                    }

                    const methodName = segments[segments.length - 1];
                    const method = (target as Record<string, unknown>)?.[methodName];
                    if (typeof method !== "function") {
                        throw new Error(`Path '${path}' does not resolve to a function`);
                    }

                    return await (method as (...innerArgs: unknown[]) => unknown).apply(target, methodArgs);
                },
                { targetId: elementId, path: methodPath, methodArgs: args }
            );

            return result as T;
        },
        getObjectCounts: () => getMoorhenObjectCounts(page, elementId),
        getSceneSettings: () => getSceneSettingsSnapshot(page, elementId),
        getWebGLStats: () => getWebGLCanvasStats(page, elementId),
        buttonClick: async (ariaLabel: string): Promise<void> => {
            await page.evaluate(
                ({ targetId, label }) => {
                    const host = document.getElementById(targetId) as HTMLElement | null;
                    const root = host?.shadowRoot;
                    if (!root) {
                        throw new Error(`Shadow root not found for element '${targetId}'`);
                    }

                    const tryFindButton = (): HTMLButtonElement | null => {
                        const buttons = Array.from(root.querySelectorAll("button")) as HTMLButtonElement[];
                        return buttons.find(button => button.getAttribute("aria-label") === label) ?? null;
                    };

                    let targetButton = tryFindButton();

                    // Main menu entries are rendered only when expanded.
                    if (!targetButton) {
                        const menuToggle = root.querySelector("button.moorhen__main-menu-toggle") as HTMLButtonElement | null;
                        menuToggle?.click();
                        targetButton = tryFindButton();
                    }

                    if (!targetButton) {
                        const availableLabels = Array.from(root.querySelectorAll("button"))
                            .map(button => button.getAttribute("aria-label"))
                            .filter((item): item is string => Boolean(item));
                        throw new Error(
                            `Button with aria-label '${label}' not found. Available labels: ${availableLabels.join(", ") || "none"}`
                        );
                    }

                    targetButton.click();
                },
                { targetId: elementId, label: ariaLabel }
            );
        },
        waitForWebGLRenderSettle: options => waitForWebGLRenderSettle(page, { ...options, elementId }),
        assertPageScreenshotBaseline: options => assertPageScreenshotBaseline(page, options),
    };
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
