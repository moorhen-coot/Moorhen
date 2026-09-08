import { expect, type Page } from "@playwright/test";
import type { MoorhenLoadFilesInput, MoorhenLoadResult, SceneSettingsSnapshot, WebGLCanvasStats, WebGLSettleOptions } from "./types";
import { getWebGLCanvasStats } from "./webglCanvas";

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
