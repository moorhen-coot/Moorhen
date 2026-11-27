import { devices, type PlaywrightTestOptions, type PlaywrightWorkerOptions } from "@playwright/test";

/**
 * Browser settings for tests that need WebGPU: the GPU tests (playwright.gpu.config.ts) and the
 * WebGPU e2e tests (the *-webgpu projects in playwright.config.ts).
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

/**
 * How long to wait for a browser to start, in milliseconds.
 *
 * Given explicitly because without it the launch inherits the *test* timeout, which is minutes:
 * a browser that is never going to start then costs the whole of it before anything says so. A
 * browser that starts at all starts in a few seconds, so there is nothing to be gained by waiting
 * longer - and the browser most likely to hang here is the one whose tests mostly skip anyway.
 *
 * The cost of being wrong is a spurious failure on a very slow machine, so it is generous against
 * a few seconds rather than tight, and MOORHEN_GPU_LAUNCH_TIMEOUT overrides it.
 */
const launchTimeout = Number(process.env.MOORHEN_GPU_LAUNCH_TIMEOUT ?? 30_000);

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
        timeout: launchTimeout,
    },
};

export const webGPUFirefox: Use = {
    ...devices["Desktop Firefox"],
    launchOptions: {
        firefoxUserPrefs: { "dom.webgpu.enabled": true, "gfx.webgpu.ignore-blocklist": true },
        timeout: launchTimeout,
    },
};
