import { defineConfig, devices } from "@playwright/test";

/**
 * GPU tests: WebGPU kernels and the WebGPU renderer, run in a browser page against CPU references.
 * No app server: each test bundles a small "case" module (tests/gpu/cases) and serves it to a
 * blank page. See tests/gpu/README.md.
 *
 *   npm run test:gpu                         # all projects
 *   npm run test:gpu -- --project=gpu-chromium
 *
 * Chromium uses the machine's GPU, except on Linux, where it uses SwiftShader (a software GPU
 * that every Linux box and CI runner has). MOORHEN_GPU_SWIFTSHADER=1 or =0 overrides that, and
 * MOORHEN_GPU_CHROMIUM points at a particular Chromium binary. Where a browser offers no WebGPU
 * (Playwright's Firefox, usually), the tests are skipped and say why rather than fail.
 */
const swiftShader = process.env.MOORHEN_GPU_SWIFTSHADER !== undefined
    ? process.env.MOORHEN_GPU_SWIFTSHADER !== "0"
    : process.platform === "linux";

const chromiumArgs = [
    "--enable-unsafe-webgpu",
    ...(swiftShader
        ? ["--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-webgpu-adapter=swiftshader",
            // Without this the GPU process falls back badly and the WebGPU device is lost.
            "--use-angle=swiftshader"]
        : []),
];

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
            use: {
                ...devices["Desktop Chrome"],
                // The full Chromium in its new headless mode: the old headless shell has no GPU.
                channel: process.env.MOORHEN_GPU_CHROMIUM ? undefined : "chromium",
                launchOptions: {
                    args: chromiumArgs,
                    executablePath: process.env.MOORHEN_GPU_CHROMIUM || undefined,
                },
            },
        },
        {
            name: "gpu-firefox",
            use: {
                ...devices["Desktop Firefox"],
                launchOptions: {
                    firefoxUserPrefs: { "dom.webgpu.enabled": true, "gfx.webgpu.ignore-blocklist": true },
                },
            },
        },
    ],
});
