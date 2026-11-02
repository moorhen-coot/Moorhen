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
    timeout: 180_000,
    reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
    projects: [
        {
            name: "gpu-chromium",
            use: webGPUChromium,
        },
        {
            name: "gpu-firefox",
            use: webGPUFirefox,
        },
    ],
});
