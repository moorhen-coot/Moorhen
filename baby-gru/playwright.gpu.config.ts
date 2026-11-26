import { defineConfig } from "@playwright/test";
import { webGPUChromium, webGPUFirefox } from "./tests/webgpuBrowsers";

/**
 * GPU tests: WebGPU kernels and the WebGPU renderer, run in a browser page against CPU references.
 * No app server: each test bundles a small "case" module (tests/gpu/cases) and serves it to a
 * blank page. See tests/gpu/README.md.
 *
 *   npm run test:gpu                         # all projects
 *   npm run test:gpu -- --project=gpu-chromium
 *
 * The browsers are set up in tests/webgpuBrowsers.ts: Chromium uses the machine's GPU, except on
 * Linux, where it uses SwiftShader. Where a browser offers no WebGPU (Playwright's Firefox,
 * usually), the tests are skipped and say why rather than fail.
 */
export default defineConfig({
    testDir: "./tests/gpu",
    testMatch: "**/*.gpu.spec.ts",
    // One page at a time: a software GPU is already using every core.
    fullyParallel: false,
    workers: 1,
    /**
     * Per test. Measured, these run in a second or two on a real GPU and the slowest - contouring
     * a big box - in under three; the old three minutes was headroom for SwiftShader on CI, where
     * everything is tens of times slower, and it was being paid in full by anything that hung.
     *
     * Thirty seconds locally is still ten times the slowest real measurement. CI keeps the long
     * one, where the machine is slow and nobody is waiting at a terminal, and
     * MOORHEN_GPU_TIMEOUT overrides either.
     *
     * The browser launch has its own, shorter timeout (tests/webgpuBrowsers.ts). That is the one
     * that matters for a browser which will not start: without it the launch inherits this.
     */
    timeout: Number(process.env.MOORHEN_GPU_TIMEOUT ?? (process.env.CI ? 180_000 : 30_000)),
    /** A backstop, so a suite that stops making progress ends rather than needing a Ctrl-C. */
    globalTimeout: Number(process.env.MOORHEN_GPU_GLOBAL_TIMEOUT ?? (process.env.CI ? 1_800_000 : 600_000)),
    reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
    projects: [
        {
            name: "gpu-chromium",
            use: webGPUChromium,
        },
        /**
         * Asked once whether Firefox starts, because a browser that will not launch is retried
         * per *test*, not per worker: thirty-odd Firefox tests at a thirty second launch timeout
         * is a quarter of an hour of the same message. Playwright skips a project whose
         * dependency failed, so one failure here stands in for all of them.
         */
        {
            name: "gpu-firefox-probe",
            use: webGPUFirefox,
            testMatch: /firefoxProbe\.setup\.ts/,
        },
        {
            name: "gpu-firefox",
            use: webGPUFirefox,
            dependencies: ["gpu-firefox-probe"],
        },
    ],
});
