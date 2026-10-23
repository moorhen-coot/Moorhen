import { devices, type PlaywrightTestOptions, type PlaywrightWorkerOptions } from "@playwright/test";

/**
 * Browser settings for tests that need WebGPU: the GPU tests (playwright.gpu.config.ts) and the
 * WebGL-against-WebGPU e2e tests (the *-webgpu projects in playwright.config.ts).
 *
 * Chromium: the full Chromium in its new headless mode, because Playwright's default headless
 * shell has no GPU, with WebGPU switched on. It uses the machine's GPU, except on Linux, where it
 * uses SwiftShader (a software GPU every Linux box and CI runner has). MOORHEN_GPU_SWIFTSHADER=1
 * or =0 overrides that, and MOORHEN_GPU_CHROMIUM points at a particular Chromium binary.
 *
 * Firefox: WebGPU enabled and its blocklist ignored. Playwright's Firefox often still offers no
 * adapter; tests skip, saying why, rather than fail.
 */
type Use = Partial<PlaywrightTestOptions & PlaywrightWorkerOptions>;

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

export const webGPUChromium: Use = {
    ...devices["Desktop Chrome"],
    channel: process.env.MOORHEN_GPU_CHROMIUM ? undefined : "chromium",
    launchOptions: {
        args: chromiumArgs,
        executablePath: process.env.MOORHEN_GPU_CHROMIUM || undefined,
    },
};

export const webGPUFirefox: Use = {
    ...devices["Desktop Firefox"],
    launchOptions: {
        firefoxUserPrefs: { "dom.webgpu.enabled": true, "gfx.webgpu.ignore-blocklist": true },
    },
};
