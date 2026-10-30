/**
 * The renderer report (src/WebGPUComponents/rendererReport.ts): the one line a tester pastes back
 * to say how their machine draws Moorhen.
 */
import { describe, expect, it } from "@jest/globals";
import { browserName, formatRendererReport, median, platformName, slowFrames, type RendererReportFacts } from "../../src/WebGPUComponents/rendererReport";

const AGENTS = {
    firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0",
    firefoxMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:158.0) Gecko/20100101 Firefox/158.0",
    chromeWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    edgeWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
    safariMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15",
    chromeOS: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    firefoxAndroid: "Mozilla/5.0 (Android 14; Mobile; rv:147.0) Gecko/147.0 Firefox/147.0",
};

const facts = (over: Partial<RendererReportFacts> = {}): RendererReportFacts => ({
    moorhenVersion: "0.21.0",
    userAgent: AGENTS.firefoxMac,
    secureContext: true,
    webGPU: { reason: null, adapter: "apple metal-3", fallback: false },
    mainView: { requested: true, active: true, drawing: true, webGLReason: null, mapsOnGpu: true },
    canvas: { width: 2848, height: 1468 },
    layout: null,
    scene: { triangles: 1_500_000, peelLayers: 3 },
    frames: { count: 60, medianMs: 16.7, worstMs: 33.4, cpuMs: 0.42, gpuMs: 12.03 },
    ...over,
});

describe("browser and platform", () => {
    it("names the browser and its version, not the engines it claims to be", () => {
        expect(browserName(AGENTS.firefoxLinux)).toBe("Firefox 147");
        expect(browserName(AGENTS.firefoxMac)).toBe("Firefox 158");
        expect(browserName(AGENTS.chromeWindows)).toBe("Chrome 142");
        expect(browserName(AGENTS.edgeWindows)).toBe("Edge 142");
        expect(browserName(AGENTS.safariMac)).toBe("Safari 26.1");
    });

    it("names the platform", () => {
        expect(platformName(AGENTS.firefoxLinux)).toBe("Linux");
        expect(platformName(AGENTS.firefoxMac)).toBe("macOS");
        expect(platformName(AGENTS.chromeWindows)).toBe("Windows");
        expect(platformName(AGENTS.chromeOS)).toBe("ChromeOS");
        expect(platformName(AGENTS.firefoxAndroid)).toBe("Android");
    });
});

describe("the report", () => {
    it("says everything on one line", () => {
        expect(formatRendererReport(facts())).toBe(
            "Moorhen 0.21.0 | Firefox 158 on macOS | secure | WebGPU: apple metal-3 | main view: WebGPU | maps: GPU"
            + " | 2848x1468, 1.50M triangles, 3 layers peeled | 60 frames: 16.7 ms median, 33.4 ms worst, CPU 0.4 ms, GPU 12.0 ms");
    });

    it("says why WebGPU is not drawing", () => {
        const none = formatRendererReport(facts({
            userAgent: AGENTS.firefoxLinux,
            webGPU: { reason: "no adapter", adapter: null, fallback: false },
            mainView: { requested: true, active: false, drawing: false, webGLReason: null, mapsOnGpu: false },
            scene: { triangles: 1200, peelLayers: null },
            frames: { count: 60, medianMs: 16.7, worstMs: 17, cpuMs: 3, gpuMs: null },
        }));
        expect(none).toContain("Firefox 147 on Linux");
        expect(none).toContain("WebGPU: none (no adapter)");
        expect(none).toContain("main view: WebGL (no WebGPU)");
        expect(none).toContain("maps: Coot");
        expect(none).toContain("1.2k triangles |");
        expect(none).toContain("GPU not timed");

        const forNow = formatRendererReport(facts({
            mainView: { requested: true, active: true, drawing: false, webGLReason: "the shadow map debug view", mapsOnGpu: false },
        }));
        expect(forNow).toContain("main view: WebGL for now (the shadow map debug view)");
        expect(formatRendererReport(facts({ mainView: { requested: false, active: false, drawing: false, webGLReason: null, mapsOnGpu: false } })))
            .toContain("main view: WebGL (WebGPU switched off)");
        expect(formatRendererReport(facts({ mainView: { requested: true, active: false, drawing: false, webGLReason: null, mapsOnGpu: false } })))
            .toContain("gave up");
    });

    it("flags a page WebGPU cannot be offered on, and a software adapter", () => {
        expect(formatRendererReport(facts({ secureContext: false }))).toContain("NOT a secure context");
        expect(formatRendererReport(facts({ webGPU: { reason: null, adapter: "google swiftshader", fallback: true } })))
            .toContain("WebGPU: google swiftshader (software)");
    });

    it("says how the page is laid out, to tell why the canvas is the size it is", () => {
        const line = formatRendererReport(facts({
            canvas: { width: 2385, height: 4767 },
            layout: { canvasCss: [908.6, 1816], pixelRatio: 2.625, window: [908.6, 1816], visual: [411.4, 822.9, 2.21], screen: [411, 914] },
        }));
        expect(line).toContain("| 2385x4767, 1.50M triangles, 3 layers peeled | CSS: canvas 909x1816 at 2.63x, window 909x1816, visual 411x823 zoomed 2.21, screen 411x914 |");
        expect(formatRendererReport(facts({ layout: { canvasCss: [400, 800], pixelRatio: 1, window: [400, 800], visual: [400, 800, 1], screen: [400, 800] } })))
            .toContain("CSS: canvas 400x800 at 1x, window 400x800, visual 400x800, screen 400x800 |");
    });

    it("says which build, how many frames stalled, and how soon moves were contoured", () => {
        const line = formatRendererReport(facts({
            build: "production",
            frames: { count: 60, medianMs: 16.7, worstMs: 183.8, cpuMs: 0.9, gpuMs: null, slow: 2 },
            mapWalk: { steps: 20, by: "GPU", medianMs: 21.4, worstMs: 35.2, timedOut: 0 },
        }));
        expect(line.startsWith("Moorhen 0.21.0 (production) | ")).toBe(true);
        expect(line).toContain("60 frames: 16.7 ms median, 183.8 ms worst (2 slow), CPU 0.9 ms, GPU not timed");
        expect(line.endsWith("| map walk: 20 moves contoured by GPU, 21.4 ms median, 35.2 ms worst")).toBe(true);

        expect(formatRendererReport(facts({ frames: { count: 60, medianMs: 16.7, worstMs: 17, cpuMs: 1, gpuMs: null, slow: 0 } })))
            .toContain("17.0 ms worst (no stalls)");
        expect(formatRendererReport(facts({ mapWalk: { steps: 20, by: "Coot", medianMs: 250, worstMs: 400, timedOut: 3 } })))
            .toContain("map walk: 20 moves contoured by Coot, 250.0 ms median, 400.0 ms worst, 3 timed out");
        expect(formatRendererReport(facts({ mapWalk: { steps: 4, by: "Coot", medianMs: 0, worstMs: 0, timedOut: 4 } })))
            .toContain("map walk: 4 moves contoured by Coot, 4 timed out");
        expect(formatRendererReport(facts({ mapWalk: null }))).not.toContain("map walk");
    });

    it("says how much the maps shown draw", () => {
        expect(formatRendererReport(facts({ mapCounts: { triangles: 412_100, lines: 618_400 } })))
            .toContain("| maps: GPU, 412.1k triangles drawn as 618.4k lines |");
        expect(formatRendererReport(facts({ mapCounts: { triangles: 412_100, lines: null } })))
            .toContain("| maps: GPU, 412.1k triangles |");
        expect(formatRendererReport(facts({ mapCounts: null }))).toContain("| maps: GPU (none shown) |");
        // Not known (an older report): as before.
        expect(formatRendererReport(facts())).toContain("| maps: GPU |");
    });

    it("leaves the frames out when none were drawn", () => {
        expect(formatRendererReport(facts({ frames: null }))).not.toContain("frames:");
    });
});

describe("slow frames", () => {
    it("are those half as long again as the median", () => {
        expect(slowFrames([16.7, 16.6, 16.8, 16.7, 183.8, 33.4])).toBe(2);
        expect(slowFrames([16.7, 16.7, 16.7])).toBe(0);
        expect(slowFrames([])).toBe(0);
    });
});

describe("median", () => {
    it("is the middle value, or the mean of the middle two", () => {
        expect(median([])).toBe(0);
        expect(median([5, 1, 3])).toBe(3);
        expect(median([4, 1, 3, 2])).toBe(2.5);
    });
});
