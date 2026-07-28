import { expect, test } from "@playwright/test";
import {
    getWebGLCanvasStats,
    gotoWebComponentPage,
    openSearchBar,
    waitForMoorhenReady,
} from "./helpers/webcomponent";

test.describe("Moorhen Web Component smoke", () => {
    test("loads and exposes ready state", async ({ page }) => {
        const host = await gotoWebComponentPage(page);

        await expect(page.getByRole("heading", { name: "Moorhen Web Component Test" })).toBeVisible();
        await waitForMoorhenReady(page);

        const readyState = await page.evaluate(() => {
            const element = document.getElementById("moorhen-test") as (HTMLElement & { ready?: boolean }) | null;
            return element?.ready === true;
        });

        expect(readyState).toBe(true);

        // Loading overlay text should be gone when the instance is ready.
        await expect(host.getByText("Moorhen is loading...")).toHaveCount(0);
    });

    test("opens search UI in the web component", async ({ page }) => {
        const host = await gotoWebComponentPage(page);
        await waitForMoorhenReady(page);
        await openSearchBar(host);

        const searchInput = host.locator("input.moorhen__search-bar-input");
        await searchInput.fill("session");

        await expect(host.locator(".moorhen__search-menu-container")).toBeVisible();
        await expect(host.getByText("Session")).toBeVisible();
    });

    test("has an active WebGL rendering pipeline", async ({ page }) => {
        await gotoWebComponentPage(page);
        await waitForMoorhenReady(page);

        const stats = await getWebGLCanvasStats(page);

        expect(stats.hasWebGL).toBe(true);
        expect(stats.isInstanceReady).toBe(true);
        expect(stats.hasGLCtxInStore).toBe(true);
        expect(stats.width).toBeGreaterThan(0);
        expect(stats.height).toBeGreaterThan(0);
        expect(stats.cssWidth).toBeGreaterThan(0);
        expect(stats.cssHeight).toBeGreaterThan(0);
        expect(stats.drawingBufferWidth).toBeGreaterThan(0);
        expect(stats.drawingBufferHeight).toBeGreaterThan(0);
        expect(stats.readPixelsSucceeded).toBe(true);
        expect(stats.canvasSizeInStore[0]).toBeGreaterThan(0);
        expect(stats.canvasSizeInStore[1]).toBeGreaterThan(0);
    });

});
