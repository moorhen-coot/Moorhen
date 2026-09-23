import type { Page } from "@playwright/test";
import { gotoWebComponentPage, waitForMoorhenReady } from "./setup";
import { loadFilesViaMoorhenInstance, getMoorhenObjectCounts, getSceneSettingsSnapshot, waitForWebGLRenderSettle } from "./moorhenInstance";
import { getWebGLCanvasStats } from "./webglCanvas";
import { assertPageScreenshotBaseline } from "./screenshots";
import type { MoorhenStartedSession, MoorhenLoadFilesInput, PageScreenshotBaselineOptions } from "./types";

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

// Re-export all public types and functions
export * from "./types";
export * from "./screenshots";
export * from "./webglCanvas";
export * from "./setup";
export * from "./moorhenInstance";
