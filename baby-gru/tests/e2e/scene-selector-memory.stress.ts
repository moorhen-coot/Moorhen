import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { startAndGetInstance, type MoorhenStartedSession } from "./helpers";

/**
 * Stress test for the user scene selector (Default <-> Model Building).
 *
 * NOT RUN with the e2e suite: it takes up to half an hour, and `playwright test` only picks up
 * *.spec.ts files. Kept for reference and for checking leaks by hand: to run it, copy it to a
 * .spec.ts name (e.g. `cp scene-selector-memory.stress.ts scene-selector-memory.spec.ts`), run
 * `npx playwright test scene-selector-memory`, then delete the copy.
 *
 * Each switch deletes every custom representation and rebuilds a new set, so repeating it
 * with many representations is a good way to surface leaks in:
 *  - the redux store (displayBuffers / labelBuffers / customRepresentations),
 *  - the molecules' own representation lists,
 *  - WebGL buffers (Moorhen never calls gl.deleteBuffer, so they are only freed once GC'd),
 *  - the JS heap, DOM nodes and event listeners,
 *  - the time each switch takes.
 * The coot worker's WASM heap is not measured: the emscripten build does not export its memory.
 *
 * Tunable through env vars:
 *  - MOORHEN_E2E_SCENE_CYCLES: number of Default -> Model Building -> Default cycles (default 8)
 *  - MOORHEN_E2E_SCENE_MAX_CHAIN_REPS: extra per-chain representations per molecule (default 6)
 */

const CYCLES = Number(process.env.MOORHEN_E2E_SCENE_CYCLES ?? 8);
const MAX_CHAIN_REPS = Number(process.env.MOORHEN_E2E_SCENE_MAX_CHAIN_REPS ?? 6);

const MOLECULES = [
    { url: "/tests/test_data/5a3h.pdb", filename: "5a3h.pdb" },
    { url: "/tests/test_data/5fjj.pdb", filename: "5fjj.pdb" },
    { url: "/tests/test_data/3j2w.pdb", filename: "3j2w.pdb" },
];

type SceneName = "Default" | "Model Building";

type CustomRepSummary = { uniqueId: string; style: string; cid: string; molecule: string };

type SceneState = {
    customReps: CustomRepSummary[];
    moleculeRepCount: number;
    displayBufferCount: number;
    labelBufferCount: number;
    /** Display buffers in the store that no molecule representation owns */
    orphanDisplayBufferCount: number;
};

type GlTrackerStats = {
    buffersCreated: number;
    buffersDeleted: number;
    buffersFinalized: number;
    liveBuffers: number;
    liveBufferBytes: number;
    texturesCreated: number;
    liveTextures: number;
};

type MemorySample = {
    label: string;
    jsHeapUsedMB: number;
    domNodes: number;
    jsEventListeners: number;
    gl: GlTrackerStats;
    state: Omit<SceneState, "customReps"> & { customRepCount: number };
};

/**
 * Wrap WebGL buffer/texture creation so live GPU objects can be counted. A FinalizationRegistry
 * decrements the live counts when the browser garbage collects a WebGLBuffer that was never
 * explicitly deleted, so after a forced GC "live" means "still reachable from JS".
 */
const installWebGLTracker = () => {
    const stats = {
        buffersCreated: 0,
        buffersDeleted: 0,
        buffersFinalized: 0,
        liveBuffers: 0,
        liveBufferBytes: 0,
        texturesCreated: 0,
        liveTextures: 0,
    };
    type BufferRecord = { bytes: number; alive: boolean };
    const bufferRecords = new WeakMap<object, BufferRecord>();
    const boundBuffers = new WeakMap<object, Map<number, object>>();
    const bufferRegistry = new FinalizationRegistry<BufferRecord>(record => {
        if (!record.alive) return;
        record.alive = false;
        stats.buffersFinalized += 1;
        stats.liveBuffers -= 1;
        stats.liveBufferBytes -= record.bytes;
    });
    const textureRegistry = new FinalizationRegistry<{ alive: boolean }>(record => {
        if (!record.alive) return;
        record.alive = false;
        stats.liveTextures -= 1;
    });
    const textureRecords = new WeakMap<object, { alive: boolean }>();

    const patch = (proto: any) => {
        if (!proto || proto.__moorhenTracked) return;
        proto.__moorhenTracked = true;
        const { createBuffer, deleteBuffer, bindBuffer, bufferData, createTexture, deleteTexture } = proto;

        proto.createBuffer = function (...args: unknown[]) {
            const buffer = createBuffer.apply(this, args);
            if (buffer) {
                const record = { bytes: 0, alive: true };
                bufferRecords.set(buffer, record);
                bufferRegistry.register(buffer, record);
                stats.buffersCreated += 1;
                stats.liveBuffers += 1;
            }
            return buffer;
        };
        proto.deleteBuffer = function (buffer: object | null) {
            const record = buffer ? bufferRecords.get(buffer) : undefined;
            if (record?.alive) {
                record.alive = false;
                stats.buffersDeleted += 1;
                stats.liveBuffers -= 1;
                stats.liveBufferBytes -= record.bytes;
            }
            return deleteBuffer.call(this, buffer);
        };
        proto.bindBuffer = function (target: number, buffer: object | null) {
            let bound = boundBuffers.get(this);
            if (!bound) {
                bound = new Map();
                boundBuffers.set(this, bound);
            }
            if (buffer) bound.set(target, buffer);
            else bound.delete(target);
            return bindBuffer.call(this, target, buffer);
        };
        proto.bufferData = function (target: number, srcOrSize: number | ArrayBufferView | ArrayBuffer | null, ...rest: unknown[]) {
            const buffer = boundBuffers.get(this)?.get(target);
            const record = buffer ? bufferRecords.get(buffer) : undefined;
            if (record?.alive) {
                const bytes = typeof srcOrSize === "number" ? srcOrSize : (srcOrSize?.byteLength ?? 0);
                stats.liveBufferBytes += bytes - record.bytes;
                record.bytes = bytes;
            }
            return bufferData.call(this, target, srcOrSize, ...rest);
        };
        proto.createTexture = function (...args: unknown[]) {
            const texture = createTexture.apply(this, args);
            if (texture) {
                const record = { alive: true };
                textureRecords.set(texture, record);
                textureRegistry.register(texture, record);
                stats.texturesCreated += 1;
                stats.liveTextures += 1;
            }
            return texture;
        };
        proto.deleteTexture = function (texture: object | null) {
            const record = texture ? textureRecords.get(texture) : undefined;
            if (record?.alive) {
                record.alive = false;
                stats.liveTextures -= 1;
            }
            return deleteTexture.call(this, texture);
        };
    };
    patch(window.WebGLRenderingContext?.prototype);
    patch(window.WebGL2RenderingContext?.prototype);
    (window as any).__moorhenGlStats = stats;
};

async function getSceneState(page: Page, elementId: string): Promise<SceneState> {
    return page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const state = instance.store.getState();
        const molecules: any[] = instance.getMoleculeList();

        const ownedBuffers = new Set<unknown>();
        let moleculeRepCount = 0;
        for (const molecule of molecules) {
            const reps = [...molecule.representations];
            if (molecule.adaptativeBondsRepresentation) reps.push(molecule.adaptativeBondsRepresentation);
            moleculeRepCount += molecule.representations.length;
            for (const rep of reps) {
                for (const buffer of rep.buffers ?? []) ownedBuffers.add(buffer);
            }
        }
        const displayBuffers: unknown[] = state.glRef.displayBuffers ?? [];

        return {
            customReps: (state.molecules.customRepresentations as any[]).map(rep => ({
                uniqueId: rep.uniqueId,
                style: rep.style,
                cid: rep.cid,
                molecule: rep.parentMolecule?.uniqueId,
            })),
            moleculeRepCount,
            displayBufferCount: displayBuffers.length,
            labelBufferCount: state.glRef.labelBuffers?.length ?? 0,
            orphanDisplayBufferCount: displayBuffers.filter(buffer => !ownedBuffers.has(buffer)).length,
        };
    }, elementId);
}

async function forceGC(page: Page, cdp: CDPSession) {
    // Two passes with a macrotask in between so FinalizationRegistry callbacks get to run
    for (let i = 0; i < 2; i++) {
        await cdp.send("HeapProfiler.collectGarbage");
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
    }
}

async function sampleMemory(page: Page, cdp: CDPSession, elementId: string, label: string): Promise<MemorySample> {
    await forceGC(page, cdp);
    const { metrics } = await cdp.send("Performance.getMetrics");
    const metric = (name: string) => metrics.find(m => m.name === name)?.value ?? 0;
    const { customReps, ...state } = await getSceneState(page, elementId);
    return {
        label,
        jsHeapUsedMB: +(metric("JSHeapUsedSize") / 2 ** 20).toFixed(1),
        domNodes: metric("Nodes"),
        jsEventListeners: metric("JSEventListeners"),
        gl: await page.evaluate(() => ({ ...(window as any).__moorhenGlStats })),
        state: { ...state, customRepCount: customReps.length },
    };
}

async function clickScene(page: Page, elementId: string, scene: SceneName) {
    const host = page.locator(`#${elementId}`);
    await host.locator("button.moorhen__scene-selector").click();
    // Menu items are disabled while a previous switch is still running, which can take a while
    await host.locator(".moorhen__scene-selector-menu").getByText(scene, { exact: true }).click({ timeout: 180_000 });
}

const repKey = (rep: CustomRepSummary) => `${rep.molecule}|${rep.uniqueId}|${rep.style}|${rep.cid}`;

function isSceneReached(state: SceneState, scene: SceneName, defaultReps: CustomRepSummary[], moleculeCount: number) {
    if (scene === "Default") {
        const expected = defaultReps.map(repKey).sort();
        const actual = state.customReps.map(repKey).sort();
        return expected.length === actual.length && expected.every((key, i) => key === actual[i]);
    }
    // Model Building = one whole-molecule "CBs" (bonds wizard) representation per molecule
    const molecules = new Set(state.customReps.map(rep => rep.molecule));
    return state.customReps.length === moleculeCount && molecules.size === moleculeCount && state.customReps.every(rep => rep.style === "CBs");
}

/** Click a scene and wait until the store reflects it. Returns the time taken in ms. */
async function switchSceneAndWait(
    moorhen: MoorhenStartedSession,
    scene: SceneName,
    defaultReps: CustomRepSummary[],
    moleculeCount: number
): Promise<number> {
    const { page, elementId } = moorhen;
    const startedAt = Date.now();
    await clickScene(page, elementId, scene);
    await expect
        .poll(async () => isSceneReached(await getSceneState(page, elementId), scene, defaultReps, moleculeCount), {
            message: `waiting for scene "${scene}"`,
            timeout: 120_000,
            intervals: [50, 100, 200],
        })
        .toBe(true);
    const elapsed = Date.now() - startedAt;
    await moorhen.waitForWebGLRenderSettle({ minSettleMs: 50, timeoutMs: 30_000 });
    return elapsed;
}

/** Load the test molecules and add a pile of extra custom representations on top of the default ones. */
async function setupLargeScene(moorhen: MoorhenStartedSession) {
    await moorhen.loadFiles(MOLECULES);
    await expect.poll(async () => (await moorhen.getObjectCounts()).moleculeCount, { timeout: 120_000 }).toBe(MOLECULES.length);

    await moorhen.page.evaluate(
        async ({ targetId, maxChainReps }) => {
            const host = document.getElementById(targetId) as any;
            const instance = await host.getMoorhenInstance();
            const colours = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#bcf60c"];
            for (const molecule of instance.getMoleculeList()) {
                await instance.representation.create(molecule.uniqueId, { representationStyle: "CAs", colourMode: "b-factor", useDefaultColours: false });
                await instance.representation.create(molecule.uniqueId, {
                    representationStyle: "VdwSpheres",
                    cid: "/*/*/(!HOH)/*:*",
                    colourMode: "secondary-structure",
                    useDefaultColours: false,
                    visible: false,
                });
                const chains = [...new Set<string>(molecule.sequences.map((sequence: any) => sequence.chain))].slice(0, maxChainReps);
                for (const [i, chain] of chains.entries()) {
                    await instance.representation.create(molecule.uniqueId, {
                        representationStyle: i % 2 ? "CBs" : "CRs",
                        ruleType: "chain",
                        chainName: chain,
                        colour: colours[i % colours.length],
                    });
                }
            }
            // One surface on the smallest molecule: big buffers, cheap to compute
            const [smallest] = instance.getMoleculeList();
            await instance.representation.create(smallest.uniqueId, { representationStyle: "MolecularSurface", colourMode: "jones-rainbow", useDefaultColours: false });
        },
        { targetId: moorhen.elementId, maxChainReps: MAX_CHAIN_REPS }
    );
    await moorhen.waitForWebGLRenderSettle({ minSettleMs: 500, timeoutMs: 60_000 });
}

/** Least-squares slope of `values` against their index, as a fraction of their mean (i.e. relative growth per cycle). */
const relativeSlope = (values: number[]) => {
    const n = values.length;
    const meanX = (n - 1) / 2;
    const meanY = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    values.forEach((y, x) => {
        num += (x - meanX) * (y - meanY);
        den += (x - meanX) ** 2;
    });
    return num / den / meanY;
};

test.describe("User scene selector memory/performance", () => {
    test.beforeEach(async ({ page, browserName }) => {
        test.skip(browserName !== "chromium", "Needs CDP (forced GC + heap metrics), Chromium only");
        await page.addInitScript(installWebGLTracker);
    });

    test("repeated Default <-> Model Building switches do not leak", async ({ page }, testInfo) => {
        test.setTimeout(20 * 60_000);

        const moorhen = await startAndGetInstance(page);
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Performance.enable");

        await setupLargeScene(moorhen);
        const initialState = await getSceneState(page, moorhen.elementId);
        const defaultReps = initialState.customReps;
        const moleculeCount = MOLECULES.length;
        console.log(`Scene setup: ${moleculeCount} molecules, ${defaultReps.length} custom representations, ${initialState.displayBufferCount} display buffers`);

        const samples: MemorySample[] = [await sampleMemory(page, cdp, moorhen.elementId, "initial")];
        const timings: { cycle: number; toModelBuildingMs: number; toDefaultMs: number }[] = [];

        for (let cycle = 1; cycle <= CYCLES; cycle++) {
            const toModelBuildingMs = await switchSceneAndWait(moorhen, "Model Building", defaultReps, moleculeCount);
            if (cycle === 1) samples.push(await sampleMemory(page, cdp, moorhen.elementId, "model-building-1"));
            const toDefaultMs = await switchSceneAndWait(moorhen, "Default", defaultReps, moleculeCount);
            timings.push({ cycle, toModelBuildingMs, toDefaultMs });
            samples.push(await sampleMemory(page, cdp, moorhen.elementId, `default-${cycle}`));
            const last = samples[samples.length - 1];
            console.log(
                `cycle ${cycle}: MB ${toModelBuildingMs}ms, Default ${toDefaultMs}ms | heap ${last.jsHeapUsedMB}MB | ` +
                    `GL live ${last.gl.liveBuffers} buffers / ${(last.gl.liveBufferBytes / 2 ** 20).toFixed(1)}MB ` +
                    `(created ${last.gl.buffersCreated}, deleted ${last.gl.buffersDeleted}) | ` +
                    `displayBuffers ${last.state.displayBufferCount} (orphans ${last.state.orphanDisplayBufferCount})`
            );
        }

        await testInfo.attach("scene-selector-memory.json", {
            body: JSON.stringify({ cycles: CYCLES, molecules: MOLECULES, customRepCount: defaultReps.length, timings, samples }, null, 2),
            contentType: "application/json",
        });

        // The first cycle warms up caches/JIT/WASM growth, so compare against the state after it
        const defaultSamples = samples.filter(sample => sample.label.startsWith("default-"));
        const baseline = defaultSamples[0];
        const final = defaultSamples[defaultSamples.length - 1];

        // Exact bookkeeping: back on Default we must have exactly what we started with
        for (const sample of defaultSamples) {
            expect.soft(sample.state.customRepCount, `${sample.label}: custom representations`).toBe(defaultReps.length);
            expect.soft(sample.state.moleculeRepCount, `${sample.label}: molecule representations`).toBe(samples[0].state.moleculeRepCount);
            expect.soft(sample.state.displayBufferCount, `${sample.label}: store display buffers`).toBe(samples[0].state.displayBufferCount);
            expect.soft(sample.state.labelBufferCount, `${sample.label}: store label buffers`).toBe(samples[0].state.labelBufferCount);
            expect.soft(sample.state.orphanDisplayBufferCount, `${sample.label}: orphan display buffers`).toBe(samples[0].state.orphanDisplayBufferCount);
        }

        // GPU buffers still reachable after GC must not accumulate with the number of switches
        expect.soft(final.gl.liveBuffers, "live WebGL buffers after GC").toBeLessThanOrEqual(Math.ceil(baseline.gl.liveBuffers * 1.05) + 20);
        expect.soft(final.gl.liveBufferBytes, "live WebGL buffer bytes after GC").toBeLessThanOrEqual(baseline.gl.liveBufferBytes * 1.05 + 2 ** 20);
        expect.soft(final.gl.liveTextures, "live WebGL textures after GC").toBeLessThanOrEqual(baseline.gl.liveTextures + 5);

        // Heaps are noisier: allow some slack, but a per-cycle leak of a full scene would blow past this
        expect.soft(final.jsHeapUsedMB, "JS heap after GC (MB)").toBeLessThanOrEqual(baseline.jsHeapUsedMB * 1.15 + 10);
        expect.soft(final.domNodes, "DOM nodes").toBeLessThanOrEqual(baseline.domNodes * 1.1 + 200);
        expect.soft(final.jsEventListeners, "JS event listeners").toBeLessThanOrEqual(baseline.jsEventListeners * 1.1 + 50);

        // Switching should not get slower with the number of switches (cycle 1 is warm-up)
        if (timings.length >= 5) {
            const steady = timings.slice(1);
            expect.soft(relativeSlope(steady.map(t => t.toModelBuildingMs)), "Model Building switch time growth per cycle").toBeLessThan(0.015);
            expect.soft(relativeSlope(steady.map(t => t.toDefaultMs)), "Default switch time growth per cycle").toBeLessThan(0.015);
        }
    });

    test("rapid switching without waiting ends in a consistent Default scene", async ({ page }) => {
        test.setTimeout(10 * 60_000);

        const moorhen = await startAndGetInstance(page);
        await setupLargeScene(moorhen);
        const initial = await getSceneState(page, moorhen.elementId);

        // Fire switches back to back: each click lands as soon as the previous switch has finished
        const sequence: SceneName[] = ["Model Building", "Default", "Model Building", "Default", "Model Building", "Default"];
        for (const scene of sequence) {
            await clickScene(page, moorhen.elementId, scene);
        }

        // The menu items stay disabled until the last switch has finished
        const host = page.locator(`#${moorhen.elementId}`);
        await host.locator("button.moorhen__scene-selector").click();
        await expect(host.locator(".moorhen__scene-selector-menu").getByText("Default", { exact: true })).toBeEnabled({ timeout: 180_000 });

        const final = await getSceneState(page, moorhen.elementId);
        expect.soft(final.customReps.map(repKey).sort(), "custom representations restored").toEqual(initial.customReps.map(repKey).sort());
        expect.soft(final.moleculeRepCount, "molecule representations").toBe(initial.moleculeRepCount);
        expect.soft(final.displayBufferCount, "store display buffers").toBe(initial.displayBufferCount);
        expect.soft(final.orphanDisplayBufferCount, "orphan display buffers").toBe(initial.orphanDisplayBufferCount);
    });
});
