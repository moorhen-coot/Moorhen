import type { Page } from "@playwright/test";
import { gotoWebComponentPage, waitForMoorhenReady } from "./setup";
import { getMoorhenInstance } from "./moorhenInstance";
import type { MoorhenStartedSession } from "./types";

/**
 * Start the web component and return a minimal test harness.
 *
 * The session exposes two things:
 *  - `getInstance()` — a remote proxy typed as the real `MoorhenInstance`, so
 *    tests drive the application API directly:
 *        const mi = await moorhen.getInstance();
 *        await mi.files.loadFiles([...]);
 *        await mi.getMoleculeList()[0].getNumberOfAtoms();
 *  - `buttonClick()` — clicks a button inside the web component's shadow DOM by
 *    aria-label (the one UI interaction that cannot be reached via the API).
 *
 * Everything else (screenshots, WebGL settle/stats, page setup) is available
 * as a standalone import from "./helpers".
 */
export async function startAndGetInstance(page: Page, elementId = "moorhen-test"): Promise<MoorhenStartedSession> {
    const host = await gotoWebComponentPage(page);
    await waitForMoorhenReady(page, elementId);

    return {
        page,
        host,
        elementId,
        getInstance: () => getMoorhenInstance(page, elementId),
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
    };
}

// Re-export all public types and functions
export * from "./types";
export * from "./screenshots";
export * from "./webglCanvas";
export * from "./setup";
export * from "./moorhenInstance";
