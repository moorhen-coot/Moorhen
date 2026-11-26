import { expect, test } from "@playwright/test";

/**
 * Does Firefox start at all? The gpu-firefox project depends on this, so a browser that cannot
 * launch fails once here rather than once per test (see playwright.gpu.config.ts and the README).
 *
 * Asking for `browser` is the whole test: the fixture launches it, under the launch timeout from
 * tests/webgpuBrowsers.ts, and a launch that fails or hangs fails this.
 */
test("firefox launches", async ({ browser }) => {
    expect(browser.isConnected()).toBe(true);
});
