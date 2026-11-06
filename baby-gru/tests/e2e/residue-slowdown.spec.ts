import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { startAndGetInstance } from "./helpers";
import {
    loadTutorial1,
    lookAround,
    parseResidueActions,
    prepareResidueWalk,
    runResidueAction,
    waitForIdle,
    type CanvasBox,
    type ResidueAction,
} from "./helpers/residueWalk";

/**
 * Reproduces the slow-down reported after working through many residues.
 *
 * Loads tutorial 1, then walks along chain A the way a user does: Space to jump to the
 * next residue, a short camera rotation to look at it, and an edit (sphere/triple refine
 * and auto-fit rotamer from their shortcuts, an animated refine from the context menu,
 * drag atoms + accept). Every PROBE_EVERY residues it takes the same measurement of how
 * responsive the app is, and of the things that could be accumulating behind it.
 *
 * The page is instrumented before it loads (see installInstrumentation), so live WebGL
 * objects, draw calls, document/window listeners, live intervals and rAF requests are
 * counted from the very first frame.
 *
 * Tuning, all optional:
 *   MOORHEN_SLOWDOWN_RESIDUES   residues to visit (default 30)
 *   MOORHEN_SLOWDOWN_PROBE_EVERY residues between probes (default 5)
 *   MOORHEN_SLOWDOWN_ACTIONS    comma list of RESIDUE_ACTIONS (helpers/residueWalk.ts), or "none"
 *                               (default: all of them, in turn)
 *   MOORHEN_SLOWDOWN_MAX_RATIO  last-probe / first-probe ratio that counts as a slow-down (default 2)
 *
 * Run e.g.: npx playwright test residue-slowdown --project=firefox
 * Headless browsers render WebGL in software; add --headed to measure on the real GPU.
 */

const RESIDUES = Number(process.env.MOORHEN_SLOWDOWN_RESIDUES ?? 30);
const PROBE_EVERY = Number(process.env.MOORHEN_SLOWDOWN_PROBE_EVERY ?? 5);
const MAX_RATIO = Number(process.env.MOORHEN_SLOWDOWN_MAX_RATIO ?? 2);

const selectedActions = parseResidueActions(process.env.MOORHEN_SLOWDOWN_ACTIONS, "MOORHEN_SLOWDOWN_ACTIONS");

type Counters = {
    glLive: Record<string, number>;
    drawCalls: number;
    clears: number;
    rafRequests: number;
    timeoutsScheduled: number;
    liveIntervals: number;
    documentListeners: number;
    windowListeners: number;
    topListenerTypes: [string, number][];
    longTasks: number;
    longTaskMs: number;
};

type AppCounters = {
    displayBuffers: number;
    labelBuffers: number;
    texturedShapes: number;
    representations: number;
    representationBuffers: number;
    activeMessages: number;
    historyEntries: number;
    domNodes: number;
};

type Probe = {
    residuesVisited: number;
    rotateFrameMsP50: number;
    rotateFrameMsP95: number;
    rotateFrameMsMax: number;
    rotateDrawCallsPerClear: number;
    mouseMoveMsAvg: number;
    idleFramesPerSec: number;
    idleDrawCallsPerSec: number;
    idleRafPerSec: number;
    idleTimeoutsPerSec: number;
    counters: Counters;
    app: AppCounters;
    chromium?: { jsHeapMB: number; nodes: number; jsEventListeners: number; documents: number };
};

type Step = { index: number; residue: string; action: ResidueAction | "none"; jumpMs: number; actionMs: number; note?: string };

/** Runs in the page before any app code, so everything is counted from the start. */
function installInstrumentation() {
    const w = window as any;
    const perf = {
        glLive: {} as Record<string, number>,
        drawCalls: 0,
        clears: 0,
        rafRequests: 0,
        timeoutsScheduled: 0,
        liveIntervals: new Set<number>(),
        listeners: new Map<EventTarget, Map<string, Set<unknown>>>(),
        longTasks: 0,
        longTaskMs: 0,
        frames: [] as number[],
        recording: false,
    };
    w.__moorhenPerf = perf;

    const glKinds: [string, string][] = [
        ["createBuffer", "deleteBuffer"],
        ["createTexture", "deleteTexture"],
        ["createFramebuffer", "deleteFramebuffer"],
        ["createRenderbuffer", "deleteRenderbuffer"],
        ["createProgram", "deleteProgram"],
        ["createShader", "deleteShader"],
        ["createVertexArray", "deleteVertexArray"],
    ];
    const drawMethods = ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "drawRangeElements"];
    const protos = [w.WebGLRenderingContext?.prototype, w.WebGL2RenderingContext?.prototype].filter(Boolean);
    for (const proto of protos) {
        for (const [create, del] of glKinds) {
            const kind = create.replace("create", "");
            const origCreate = proto[create];
            const origDelete = proto[del];
            if (typeof origCreate !== "function" || typeof origDelete !== "function") continue;
            perf.glLive[kind] ??= 0;
            proto[create] = function (...args: unknown[]) {
                const obj = origCreate.apply(this, args);
                if (obj) perf.glLive[kind]++;
                return obj;
            };
            proto[del] = function (obj: unknown, ...rest: unknown[]) {
                if (obj) perf.glLive[kind]--;
                return origDelete.call(this, obj, ...rest);
            };
        }
        for (const method of drawMethods) {
            const orig = proto[method];
            if (typeof orig !== "function") continue;
            proto[method] = function (...args: unknown[]) {
                perf.drawCalls++;
                return orig.apply(this, args);
            };
        }
        // Every render pass starts with a clear, so draw calls per clear measures how much each
        // scene draws regardless of how many scenes land in one animation frame.
        const origClear = proto.clear;
        proto.clear = function (...args: unknown[]) {
            perf.clears++;
            return origClear.apply(this, args);
        };
    }

    const origRaf = w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame = (cb: FrameRequestCallback) => {
        perf.rafRequests++;
        return origRaf(cb);
    };
    const origSetTimeout = w.setTimeout.bind(w);
    w.setTimeout = (...args: Parameters<typeof setTimeout>) => {
        perf.timeoutsScheduled++;
        return origSetTimeout(...args);
    };
    const origSetInterval = w.setInterval.bind(w);
    const origClearInterval = w.clearInterval.bind(w);
    w.setInterval = (...args: Parameters<typeof setInterval>) => {
        const id = origSetInterval(...args);
        perf.liveIntervals.add(id);
        return id;
    };
    w.clearInterval = (id: number) => {
        perf.liveIntervals.delete(id);
        return origClearInterval(id);
    };

    // Only document and window: those outlive every component, so listeners left on them leak.
    const origAdd = EventTarget.prototype.addEventListener;
    const origRemove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type: string, listener: any, options?: any) {
        if (listener && (this === document || this === window)) {
            let byType = perf.listeners.get(this);
            if (!byType) perf.listeners.set(this, (byType = new Map()));
            if (!byType.has(type)) byType.set(type, new Set());
            byType.get(type)!.add(listener);
        }
        return origAdd.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type: string, listener: any, options?: any) {
        if (listener && (this === document || this === window)) {
            perf.listeners.get(this)?.get(type)?.delete(listener);
        }
        return origRemove.call(this, type, listener, options);
    };

    try {
        new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                perf.longTasks++;
                perf.longTaskMs += entry.duration;
            }
        }).observe({ type: "longtask", buffered: true });
    } catch {
        // Firefox has no longtask entries.
    }

    w.__moorhenPerfStartFrames = () => {
        perf.frames = [];
        perf.recording = true;
        const tick = (t: number) => {
            if (!perf.recording) return;
            perf.frames.push(t);
            origRaf(tick);
        };
        origRaf(tick);
    };
    w.__moorhenPerfStopFrames = () => {
        perf.recording = false;
        return perf.frames.slice(1).map((t, i) => t - perf.frames[i]);
    };
}

async function readCounters(page: Page): Promise<Counters> {
    return page.evaluate(() => {
        const perf = (window as any).__moorhenPerf;
        const count = (target: EventTarget) => {
            let total = 0;
            for (const set of perf.listeners.get(target)?.values() ?? []) total += set.size;
            return total;
        };
        const byType: [string, number][] = [];
        for (const target of [document, window]) {
            for (const [type, set] of perf.listeners.get(target) ?? []) {
                if (set.size > 0) byType.push([`${target === document ? "doc" : "win"}:${type}`, set.size]);
            }
        }
        byType.sort((a, b) => b[1] - a[1]);
        return {
            glLive: { ...perf.glLive },
            drawCalls: perf.drawCalls,
            clears: perf.clears,
            rafRequests: perf.rafRequests,
            timeoutsScheduled: perf.timeoutsScheduled,
            liveIntervals: perf.liveIntervals.size,
            documentListeners: count(document),
            windowListeners: count(window),
            topListenerTypes: byType.slice(0, 8),
            longTasks: perf.longTasks,
            longTaskMs: Math.round(perf.longTaskMs),
        };
    });
}

async function readAppCounters(page: Page, elementId: string): Promise<AppCounters> {
    return page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const state = instance.store.getState();
        const molecules = instance.getMoleculeList();
        let representations = 0;
        let representationBuffers = 0;
        for (const molecule of molecules) {
            representations += molecule.representations.length;
            for (const representation of molecule.representations) representationBuffers += representation.buffers?.length ?? 0;
        }
        return {
            displayBuffers: state.glRef.displayBuffers.length,
            labelBuffers: state.glRef.labelBuffers.length,
            texturedShapes: state.glRef.texturedShapes.length,
            representations,
            representationBuffers,
            activeMessages: instance.commandCentre.activeMessages.length,
            historyEntries: instance.commandCentre.history?.entries?.length ?? -1,
            domNodes: document.querySelectorAll("*").length + (host.shadowRoot?.querySelectorAll("*").length ?? 0),
        };
    }, elementId);
}

const percentile = (values: number[], p: number) => {
    if (values.length === 0) return NaN;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};
const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

async function probe(page: Page, elementId: string, box: CanvasBox, residuesVisited: number, cdp: CDPSession | null): Promise<Probe> {
    await waitForIdle(page, elementId, 500);

    // Idle: nothing is happening, so anything still drawing or scheduling is background churn.
    const idleBefore = await readCounters(page);
    await page.evaluate(() => (window as any).__moorhenPerfStartFrames());
    await page.waitForTimeout(1_000);
    const idleFrames = await page.evaluate(() => (window as any).__moorhenPerfStopFrames() as number[]);
    const idleAfter = await readCounters(page);
    // The frame recorder's own rAF requests go through the unpatched rAF, so they are not counted.

    // Rotation: the interaction that feels slow. Time each input round-trip and every frame.
    const x = box.x + box.width / 2;
    const y = box.y + box.height * 0.75;
    await page.mouse.move(x, y);
    const rotateBefore = await readCounters(page);
    await page.evaluate(() => (window as any).__moorhenPerfStartFrames());
    await page.mouse.down();
    const moveTimes: number[] = [];
    for (let i = 0; i < 60; i++) {
        const startedAt = performance.now();
        await page.mouse.move(x + (i < 30 ? i : 60 - i) * 4, y);
        moveTimes.push(performance.now() - startedAt);
    }
    await page.mouse.up();
    const frames = await page.evaluate(() => (window as any).__moorhenPerfStopFrames() as number[]);
    const rotateAfter = await readCounters(page);

    let chromium: Probe["chromium"];
    if (cdp) {
        await cdp.send("HeapProfiler.collectGarbage");
        const { metrics } = await cdp.send("Performance.getMetrics");
        const metric = (name: string) => metrics.find(m => m.name === name)?.value ?? NaN;
        chromium = {
            jsHeapMB: round(metric("JSHeapUsedSize") / 1024 / 1024),
            nodes: metric("Nodes"),
            jsEventListeners: metric("JSEventListeners"),
            documents: metric("Documents"),
        };
    }

    return {
        residuesVisited,
        rotateFrameMsP50: round(percentile(frames, 50)),
        rotateFrameMsP95: round(percentile(frames, 95)),
        rotateFrameMsMax: round(Math.max(...frames)),
        rotateDrawCallsPerClear: round((rotateAfter.drawCalls - rotateBefore.drawCalls) / Math.max(1, rotateAfter.clears - rotateBefore.clears)),
        mouseMoveMsAvg: round(moveTimes.reduce((a, b) => a + b, 0) / moveTimes.length, 2),
        idleFramesPerSec: idleFrames.length,
        idleDrawCallsPerSec: idleAfter.drawCalls - idleBefore.drawCalls,
        idleRafPerSec: idleAfter.rafRequests - idleBefore.rafRequests,
        idleTimeoutsPerSec: idleAfter.timeoutsScheduled - idleBefore.timeoutsScheduled,
        counters: rotateAfter,
        app: await readAppCounters(page, elementId),
        chromium,
    };
}

function formatProbes(probes: Probe[]): string {
    const rows = probes.map(p => ({
        res: p.residuesVisited,
        "frame p50": p.rotateFrameMsP50,
        "frame p95": p.rotateFrameMsP95,
        "frame max": p.rotateFrameMsMax,
        "draws/clear": p.rotateDrawCallsPerClear,
        "move ms": p.mouseMoveMsAvg,
        "idle draws/s": p.idleDrawCallsPerSec,
        "idle raf/s": p.idleRafPerSec,
        "idle timers/s": p.idleTimeoutsPerSec,
        "gl buf": p.counters.glLive.Buffer,
        "gl tex": p.counters.glLive.Texture,
        "gl vao": p.counters.glLive.VertexArray,
        "doc lst": p.counters.documentListeners,
        "win lst": p.counters.windowListeners,
        intervals: p.counters.liveIntervals,
        "long tasks": p.counters.longTasks,
        dispBufs: p.app.displayBuffers,
        reps: p.app.representations,
        repBufs: p.app.representationBuffers,
        history: p.app.historyEntries,
        dom: p.app.domNodes,
        ...(p.chromium ? { "heap MB": p.chromium.jsHeapMB, "cdp lst": p.chromium.jsEventListeners } : {}),
    }));
    const headers = Object.keys(rows[0]);
    const widths = headers.map(h => Math.max(h.length, ...rows.map(r => String((r as any)[h]).length)));
    const line = (cells: string[]) => cells.map((c, i) => c.padStart(widths[i])).join(" | ");
    return [line(headers), ...rows.map(r => line(headers.map(h => String((r as any)[h]))))].join("\n");
}

test.describe("residue walk slow-down", () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(installInstrumentation);
    });

    test("stays responsive while visiting and editing many residues of tutorial 1", async ({ page, browserName }, testInfo) => {
        test.setTimeout(30 * 60_000);

        // Buffers are now deleted when retired, so anything still drawing one after that shows up here.
        const webglWarnings: string[] = [];
        page.on("console", message => {
            const text = message.text();
            // Firefox reports "WebGL warning: ...", Chromium "[.WebGL-0x...]GL_INVALID_...". Chromium's
            // "Performance" driver messages come from this test's own readPixels, so they are left out.
            const isBrowserWebGLError = /^WebGL (warning|error)/.test(text) || (/^\[\.WebGL-/.test(text) && !/Performance/.test(text));
            if (isBrowserWebGLError) webglWarnings.push(text);
        });

        const moorhen = await startAndGetInstance(page);
        const { elementId, host } = moorhen;

        const { firstResidue } = await loadTutorial1(moorhen);
        const { box, nextResidue } = await prepareResidueWalk(moorhen, firstResidue);

        const renderer = await page.evaluate(() => {
            const gl = document.createElement("canvas").getContext("webgl2") ?? document.createElement("canvas").getContext("webgl");
            const info = gl?.getExtension("WEBGL_debug_renderer_info");
            const name = String((info && gl?.getParameter(info.UNMASKED_RENDERER_WEBGL)) ?? gl?.getParameter(gl.RENDERER) ?? "unknown");
            return { name, isSoftware: /swiftshader|llvmpipe|software|basic render/i.test(name) };
        });
        console.log(`[${browserName}] WebGL renderer: ${renderer.name}`);

        const cdp = browserName === "chromium" ? await page.context().newCDPSession(page) : null;
        await cdp?.send("Performance.enable");

        const probes: Probe[] = [await probe(page, elementId, box, 0, cdp)];
        const steps: Step[] = [];
        console.log(`[${browserName}] baseline: ${JSON.stringify(probes[0])}`);

        for (let index = 1; index <= RESIDUES; index++) {
            const jumpStartedAt = Date.now();
            await nextResidue();
            const jumpMs = Date.now() - jumpStartedAt;

            await lookAround(page, box);

            const action: ResidueAction | "none" = selectedActions.length > 0 ? selectedActions[(index - 1) % selectedActions.length] : "none";
            const actionStartedAt = Date.now();
            const note = action === "none" ? undefined : await runResidueAction(page, host, elementId, box, action);
            await waitForIdle(page, elementId);
            const actionMs = Date.now() - actionStartedAt;

            const residue = await page.evaluate(async targetId => {
                const hostElement = document.getElementById(targetId) as any;
                const instance = await hostElement.getMoorhenInstance();
                const origin = instance.store.getState().sceneSettings.origin;
                return origin.map((v: number) => (-v).toFixed(1)).join(",");
            }, elementId);
            steps.push({ index, residue, action, jumpMs, actionMs, note });
            console.log(`[${browserName}] residue ${index} @ (${residue}): jump ${jumpMs} ms, ${action} ${actionMs} ms${note ? ` (${note})` : ""}`);

            if (index % PROBE_EVERY === 0 || index === RESIDUES) {
                probes.push(await probe(page, elementId, box, index, cdp));
            }
        }

        const report = formatProbes(probes);
        console.log(`\n[${browserName}] probes:\n${report}\n`);
        console.log(`[${browserName}] listeners on document/window at the end: ${JSON.stringify(probes.at(-1)!.counters.topListenerTypes)}`);

        await testInfo.attach("residue-slowdown.json", {
            body: JSON.stringify({ browserName, residues: RESIDUES, actions: selectedActions, probes, steps }, null, 2),
            contentType: "application/json",
        });
        await testInfo.attach("residue-slowdown.txt", { body: report, contentType: "text/plain" });

        console.log(`[${browserName}] ${webglWarnings.length} WebGL warnings${webglWarnings.length ? `, first: ${webglWarnings.slice(0, 5).join(" | ")}` : ""}`);
        expect.soft(webglWarnings, "no WebGL warnings (e.g. drawing a deleted buffer)").toEqual([]);

        // A slow-down shows as the same probe getting slower; leaks show as counts that keep growing.
        const first = probes[0];
        const last = probes.at(-1)!;
        const firstJumps = steps.slice(0, PROBE_EVERY);
        const lastJumps = steps.slice(-PROBE_EVERY);
        const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);

        // With software WebGL (headless Chromium) a frame takes hundreds of ms and swings several-fold
        // between probes on its own, so timings only mean something on a real GPU. The counts below
        // are exact either way, and they are what caught the buffer leak.
        if (renderer.isSoftware) {
            testInfo.annotations.push({ type: "skipped timing checks", description: `software WebGL renderer: ${renderer.name}` });
        } else {
            expect.soft(last.rotateFrameMsP50, `rotation frame time p50 (first ${first.rotateFrameMsP50} ms)`).toBeLessThanOrEqual(Math.max(first.rotateFrameMsP50 * MAX_RATIO, 20));
            expect.soft(last.mouseMoveMsAvg, `mouse input round-trip (first ${first.mouseMoveMsAvg} ms)`).toBeLessThanOrEqual(Math.max(first.mouseMoveMsAvg * MAX_RATIO, 5));
            expect.soft(avg(lastJumps.map(s => s.jumpMs)), `residue jump time (first ${round(avg(firstJumps.map(s => s.jumpMs)))} ms)`).toBeLessThanOrEqual(avg(firstJumps.map(s => s.jumpMs)) * MAX_RATIO);
        }
        expect.soft(last.rotateDrawCallsPerClear, `draw calls per render pass (first ${first.rotateDrawCallsPerClear})`).toBeLessThanOrEqual(first.rotateDrawCallsPerClear * 1.5);
        expect.soft(last.app.displayBuffers, `display buffers (first ${first.app.displayBuffers})`).toBeLessThanOrEqual(first.app.displayBuffers * 1.5);
        expect.soft(last.counters.glLive.Buffer, `live WebGL buffers (first ${first.counters.glLive.Buffer})`).toBeLessThanOrEqual(first.counters.glLive.Buffer * 1.5);
        expect.soft(last.counters.documentListeners + last.counters.windowListeners, `document/window listeners (first ${first.counters.documentListeners + first.counters.windowListeners})`).toBeLessThanOrEqual((first.counters.documentListeners + first.counters.windowListeners) * 1.5);
        expect.soft(last.counters.liveIntervals, `live intervals (first ${first.counters.liveIntervals})`).toBeLessThanOrEqual(first.counters.liveIntervals + 5);
        expect.soft(last.idleDrawCallsPerSec, `draw calls/s while idle (first ${first.idleDrawCallsPerSec})`).toBeLessThanOrEqual(Math.max(first.idleDrawCallsPerSec * MAX_RATIO, 50));
    });
});
