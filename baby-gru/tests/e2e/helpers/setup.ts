import { expect, type Locator, type Page } from "@playwright/test";

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
