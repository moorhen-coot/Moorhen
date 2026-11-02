import { expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";
import { getWebGLCanvasLocator, startAndGetInstance } from "./helpers";

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
 *   MOORHEN_SLOWDOWN_ACTIONS    comma list from ACTIONS below, or "none" for navigation only
 *                               (default: all of them, in turn)
 *   MOORHEN_SLOWDOWN_MAX_RATIO  last-probe / first-probe ratio that counts as a slow-down (default 2)
 *
 * Run e.g.: npx playwright test residue-slowdown --project=firefox
 * Headless browsers render WebGL in software; add --headed to measure on the real GPU.
 */

const RESIDUES = Number(process.env.MOORHEN_SLOWDOWN_RESIDUES ?? 30);
const PROBE_EVERY = Number(process.env.MOORHEN_SLOWDOWN_PROBE_EVERY ?? 5);
const MAX_RATIO = Number(process.env.MOORHEN_SLOWDOWN_MAX_RATIO ?? 2);

const ACTIONS = ["sphere-refine-key", "autofit-rotamer-key", "refine-context-menu", "drag-atoms", "triple-refine-key"] as const;
type Action = (typeof ACTIONS)[number];

const selectedActions: Action[] = (() => {
    const raw = process.env.MOORHEN_SLOWDOWN_ACTIONS;
    if (!raw) return [...ACTIONS];
    if (raw === "none") return [];
    const names = raw.split(",").map(name => name.trim());
    const unknown = names.filter(name => !ACTIONS.includes(name as Action));
    if (unknown.length > 0) throw new Error(`Unknown MOORHEN_SLOWDOWN_ACTIONS ${unknown.join(", ")}; expected ${ACTIONS.join(", ")} or none`);
    return names as Action[];
})();

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

type Step = { index: number; residue: string; action: Action | "none"; jumpMs: number; actionMs: number; note?: string };

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

async function readAppState(page: Page, elementId: string) {
    return page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const state = instance.store.getState();
        return {
            origin: state.sceneSettings.origin as number[],
            activeMessages: instance.commandCentre.activeMessages.length as number,
            isDraggingAtoms: state.generalStates.isDraggingAtoms as boolean,
            hoveredCid: state.hoveringStates.hoveredAtom?.cid as string | null,
        };
    }, elementId);
}

/** The app is idle once no coot command has been pending for `quietMs`. */
async function waitForIdle(page: Page, elementId: string, quietMs = 300, timeoutMs = 60_000) {
    const startedAt = Date.now();
    let quietSince: number | null = null;
    while (Date.now() - startedAt < timeoutMs) {
        const { activeMessages } = await readAppState(page, elementId);
        if (activeMessages === 0) {
            quietSince ??= Date.now();
            if (Date.now() - quietSince >= quietMs) return;
        } else {
            quietSince = null;
        }
        await page.waitForTimeout(50);
    }
    throw new Error(`App still busy after ${timeoutMs} ms`);
}

/** Waits for the view to move away from `from` and then stop. Returns false if it never moved. */
async function waitForOriginSettled(page: Page, elementId: string, from: number[], timeoutMs = 15_000): Promise<boolean> {
    const same = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-4);
    const startedAt = Date.now();
    let moved = false;
    let previous = from;
    let stableTicks = 0;
    while (Date.now() - startedAt < timeoutMs) {
        await page.waitForTimeout(50);
        const { origin } = await readAppState(page, elementId);
        if (!moved) {
            moved = !same(origin, from);
            previous = origin;
            continue;
        }
        stableTicks = same(origin, previous) ? stableTicks + 1 : 0;
        previous = origin;
        if (stableTicks >= 3) return true;
    }
    return moved;
}

/**
 * Finds a screen point over an atom near the centre of the canvas, where the residue just
 * jumped to sits. Starts from a corner so a stale hover from the last residue is cleared.
 */
async function findAtomNearCentre(page: Page, elementId: string, box: { x: number; y: number; width: number; height: number }) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.waitForTimeout(60);
    for (const radius of [0, 4, 8, 12, 18, 26, 36]) {
        const angles = radius === 0 ? [0] : [0, 45, 90, 135, 180, 225, 270, 315];
        for (const angle of angles) {
            const x = cx + radius * Math.cos((angle * Math.PI) / 180);
            const y = cy + radius * Math.sin((angle * Math.PI) / 180);
            await page.mouse.move(x, y);
            await page.waitForTimeout(40);
            const { hoveredCid } = await readAppState(page, elementId);
            if (hoveredCid) return { x, y, cid: hoveredCid };
        }
    }
    return null;
}

/** Turns the camera a little and back, like looking at the residue from another side. */
async function lookAround(page: Page, box: { x: number; y: number; width: number; height: number }) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height * 0.75;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 80, y, { steps: 10 });
    await page.mouse.move(x, y, { steps: 10 });
    await page.mouse.up();
}

async function pressShortcut(page: Page, box: { x: number; y: number; width: number; height: number }, key: string) {
    // The canvas only takes keys while the pointer is over it (document.onkeydown is set on mouseenter).
    await page.mouse.move(box.x + box.width / 2 + 1, box.y + box.height / 2 + 1);
    await page.keyboard.press(key);
}

async function contextMenuButton(page: Page, host: Locator, elementId: string, box: { x: number; y: number; width: number; height: number }, iconAlt: string) {
    const atom = await findAtomNearCentre(page, elementId, box);
    if (!atom) return null;
    await page.mouse.click(atom.x, atom.y, { button: "right" });
    const button = host.locator(`button.moorhen__context-menu-button:has(img[alt="${iconAlt}"])`);
    await expect(button).toBeVisible({ timeout: 5_000 });
    return { button, atom };
}

async function runAction(page: Page, host: Locator, elementId: string, box: { x: number; y: number; width: number; height: number }, action: Action): Promise<string | undefined> {
    switch (action) {
        case "sphere-refine-key":
            await pressShortcut(page, box, "Shift+R");
            return;
        case "triple-refine-key":
            await pressShortcut(page, box, "Shift+H");
            return;
        case "autofit-rotamer-key":
            await pressShortcut(page, box, "Shift+J");
            return;
        case "refine-context-menu": {
            const found = await contextMenuButton(page, host, elementId, box, "Refine Residues");
            if (!found) return "no atom under the centre, skipped";
            await found.button.click();
            return;
        }
        case "drag-atoms": {
            const found = await contextMenuButton(page, host, elementId, box, "drag atoms");
            if (!found) return "no atom under the centre, skipped";
            await found.button.click();
            await expect.poll(async () => (await readAppState(page, elementId)).isDraggingAtoms, { timeout: 5_000 }).toBe(true);
            await page.mouse.move(found.atom.x, found.atom.y);
            await page.mouse.down();
            await page.mouse.move(found.atom.x + 25, found.atom.y + 15, { steps: 15 });
            await page.mouse.up();
            await waitForIdle(page, elementId);
            await host.getByRole("button", { name: "Accept dragged atoms" }).click();
            await expect.poll(async () => (await readAppState(page, elementId)).isDraggingAtoms, { timeout: 30_000 }).toBe(false);
            return;
        }
    }
}

const percentile = (values: number[], p: number) => {
    if (values.length === 0) return NaN;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};
const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

async function probe(page: Page, elementId: string, box: { x: number; y: number; width: number; height: number }, residuesVisited: number, cdp: CDPSession | null): Promise<Probe> {
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

        // Same as File > Load tutorial data... > Tutorial 1.
        const firstResidue = await page.evaluate(async targetId => {
            const hostElement = document.getElementById(targetId) as any;
            const instance = await hostElement.getMoorhenInstance();
            const oldStyle = instance.representation.defaultStyle;
            instance.representation.defaultStyle = "CBs";
            const loaded = await instance.files.loadFiles([
                "MoorhenAssets/tutorials/moorhen-tutorial-structure-number-1.ent",
                "MoorhenAssets/tutorials/moorhen-tutorial-map-number-1.mtz",
            ]);
            instance.representation.defaultStyle = oldStyle;
            const moleculeEntry = loaded.find((file: any) => file.type === "molecule");
            const molecule = instance.getMolecule(moleculeEntry.uniqueID);
            const chain = molecule.sequences.find((sequence: any) => sequence.chain === "A");
            return chain.sequence[0].resNum as number;
        }, elementId);

        await expect
            .poll(async () => page.evaluate(async targetId => {
                const hostElement = document.getElementById(targetId) as any;
                const instance = await hostElement.getMoorhenInstance();
                return Boolean(instance.store.getState().generalStates.activeMap);
            }, elementId), { timeout: 60_000, message: "tutorial 1 map becomes the active map" })
            .toBe(true);
        await moorhen.waitForWebGLRenderSettle({ minSettleMs: 1_500, timeoutMs: 60_000 });

        // Space does not advance until the Models panel has been opened once (known bug, fix pending).
        await moorhen.buttonClick("Open Models Panel");
        await page.waitForTimeout(1_000);

        const renderer = await page.evaluate(() => {
            const gl = document.createElement("canvas").getContext("webgl2") ?? document.createElement("canvas").getContext("webgl");
            const info = gl?.getExtension("WEBGL_debug_renderer_info");
            const name = String((info && gl?.getParameter(info.UNMASKED_RENDERER_WEBGL)) ?? gl?.getParameter(gl.RENDERER) ?? "unknown");
            return { name, isSoftware: /swiftshader|llvmpipe|software|basic render/i.test(name) };
        });
        console.log(`[${browserName}] WebGL renderer: ${renderer.name}`);

        const canvas = await getWebGLCanvasLocator(page, elementId);
        const box = (await canvas.boundingBox())!;
        expect(box, "WebGL canvas has a layout box").toBeTruthy();

        const centreOnFirstResidue = async () => {
            const { origin } = await readAppState(page, elementId);
            await page.evaluate(async ({ targetId, resNum }) => {
                const hostElement = document.getElementById(targetId) as any;
                const instance = await hostElement.getMoorhenInstance();
                await instance.getMoleculeList()[0].centreAndAlignViewOn(`/*/A/${resNum}-${resNum}/`, true);
            }, { targetId: elementId, resNum: firstResidue });
            await waitForOriginSettled(page, elementId, origin);
        };
        await centreOnFirstResidue();

        const cdp = browserName === "chromium" ? await page.context().newCDPSession(page) : null;
        await cdp?.send("Performance.enable");

        const probes: Probe[] = [await probe(page, elementId, box, 0, cdp)];
        const steps: Step[] = [];
        console.log(`[${browserName}] baseline: ${JSON.stringify(probes[0])}`);

        for (let index = 1; index <= RESIDUES; index++) {
            const before = await readAppState(page, elementId);
            const jumpStartedAt = Date.now();
            await pressShortcut(page, box, " ");
            let moved = await waitForOriginSettled(page, elementId, before.origin);
            if (!moved) {
                // End of the chain: start again from the first residue.
                await centreOnFirstResidue();
                moved = true;
            }
            const jumpMs = Date.now() - jumpStartedAt;

            await lookAround(page, box);

            const action: Action | "none" = selectedActions.length > 0 ? selectedActions[(index - 1) % selectedActions.length] : "none";
            const actionStartedAt = Date.now();
            const note = action === "none" ? undefined : await runAction(page, host, elementId, box, action);
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
