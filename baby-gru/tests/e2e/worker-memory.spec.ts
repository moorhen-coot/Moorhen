import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { startAndGetInstance } from "./helpers";
import {
    loadTutorial1,
    lookAround,
    parseResidueActions,
    prepareResidueWalk,
    runResidueAction,
    waitForIdle,
} from "./helpers/residueWalk";

/**
 * Looks for memory that is never given back, in the coot worker and on the main thread.
 *
 * Each cycle loads tutorial 1, walks and edits residues as in residue-slowdown.spec.ts, then
 * deletes the molecule and map. Everything the cycle allocated should be released by the
 * delete, so what is left afterwards, and especially what keeps piling up from one cycle to
 * the next, is a leak.
 *
 * Where the memory is measured:
 *   worker wasm heap   mallinfo() via get_heap_stats_json (wasm_src/moorhen-wrappers-helpers.h):
 *                      in use now, and the size wasm memory has grown to (it never shrinks).
 *   worker MEMFS       files coot writes to its in-memory filesystem - undo backups among
 *                      them. Their contents live in the worker's JS heap, not the wasm heap.
 *   main-thread wasm   the main thread's own coot module, when a feature has loaded one.
 *   main-thread JS     Chromium only, after a forced GC.
 * If the wasm module predates get_heap_stats_json, only MEMFS and the JS heap are reported.
 *
 * Tuning, all optional:
 *   MOORHEN_MEMORY_CYCLES      load / walk / delete cycles (default 3)
 *   MOORHEN_MEMORY_RESIDUES    residues visited per cycle (default 20)
 *   MOORHEN_MEMORY_ACTIONS     as MOORHEN_SLOWDOWN_ACTIONS (default: all, in turn)
 *   MOORHEN_MEMORY_MAX_CYCLE_GROWTH_MB   allowed growth of worker in-use heap after delete,
 *                                        from the first cycle to the last (default 8)
 */

const CYCLES = Number(process.env.MOORHEN_MEMORY_CYCLES ?? 3);
const RESIDUES = Number(process.env.MOORHEN_MEMORY_RESIDUES ?? 20);
const MAX_CYCLE_GROWTH_MB = Number(process.env.MOORHEN_MEMORY_MAX_CYCLE_GROWTH_MB ?? 8);
const selectedActions = parseResidueActions(process.env.MOORHEN_MEMORY_ACTIONS, "MOORHEN_MEMORY_ACTIONS");

type HeapStats = { wasm_memory_bytes: number; arena_bytes: number; in_use_bytes: number; free_bytes: number; mmap_bytes: number };

type MemorySnapshot = {
    label: string;
    worker: {
        heap: HeapStats | null;
        wasmBytes: number;
        memfsBytes: number;
        memfsFiles: number;
        memfsByDir: Record<string, number>;
        cootMoleculeSlots: number;
    };
    main: { heap: HeapStats | null; wasmBytes: number; jsHeapBytes?: number };
};

const MB = 1024 * 1024;
const mb = (bytes: number | undefined | null) => (typeof bytes === "number" && !Number.isNaN(bytes) ? (bytes / MB).toFixed(1) : "-");

async function readMemory(page: Page, label: string, cdp: CDPSession | null): Promise<MemorySnapshot> {
    const worker = page.workers().find(w => w.url().includes("CootWorker"));
    if (!worker) throw new Error(`No coot worker among ${page.workers().map(w => w.url()).join(", ")}`);

    const workerMemory = await worker.evaluate(() => {
        // Top-level `let`s of a classic worker script: reachable through indirect eval only.
        const globalEval = eval;
        const cootModule = globalEval("cootModule");
        const container = globalEval("molecules_container");
        const heap = typeof cootModule.get_heap_stats_json === "function" ? JSON.parse(cootModule.get_heap_stats_json()) : null;

        let memfsBytes = 0;
        let memfsFiles = 0;
        const memfsByDir: Record<string, number> = {};
        const walk = (dir: string) => {
            for (const name of cootModule.FS.readdir(dir) as string[]) {
                if (name === "." || name === "..") continue;
                const path = dir === "/" ? `/${name}` : `${dir}/${name}`;
                if (["/dev", "/proc", "/sys"].includes(path)) continue;
                const stat = cootModule.FS.stat(path);
                if (cootModule.FS.isDir(stat.mode)) {
                    walk(path);
                } else if (cootModule.FS.isFile(stat.mode)) {
                    memfsBytes += stat.size;
                    memfsFiles++;
                    // Group by the top two directory levels, so the report says where it is.
                    const key = path.split("/").slice(0, 3).join("/") || "/";
                    memfsByDir[key] = (memfsByDir[key] ?? 0) + stat.size;
                }
            }
        };
        walk("/");

        return {
            heap,
            // HEAP8 is not exported, and with ASSERTIONS reading it aborts; the heap stats carry the size.
            wasmBytes: (heap?.wasm_memory_bytes ?? NaN) as number,
            memfsBytes,
            memfsFiles,
            memfsByDir,
            cootMoleculeSlots: container.get_number_of_molecules() as number,
        };
    });

    const mainMemory = await page.evaluate(() => {
        // Only loaded where a feature needs coot on the main thread; the web component does not.
        const module = (window as any).CCP4Module;
        const heap = typeof module?.get_heap_stats_json === "function" ? JSON.parse(module.get_heap_stats_json()) : null;
        return { heap, wasmBytes: (heap?.wasm_memory_bytes ?? NaN) as number };
    });
    let jsHeapBytes: number | undefined;
    if (cdp) {
        await cdp.send("HeapProfiler.collectGarbage");
        const { metrics } = await cdp.send("Performance.getMetrics");
        jsHeapBytes = metrics.find(m => m.name === "JSHeapUsedSize")?.value;
    }

    return { label, worker: workerMemory, main: { ...mainMemory, jsHeapBytes } };
}

/** Deletes every molecule and map the way the Delete menu item does. */
async function deleteEverything(page: Page, elementId: string) {
    await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        for (const map of [...instance.getMapList()]) {
            await map.delete();
            instance.store.dispatch({ type: "generalStates/setActiveMap", payload: null });
            instance.store.dispatch({ type: "maps/removeMap", payload: map });
        }
        for (const molecule of [...instance.getMoleculeList()]) {
            await molecule.delete();
            instance.store.dispatch({ type: "molecules/removeMolecule", payload: molecule });
        }
    }, elementId);
    await waitForIdle(page, elementId, 1_000);
}

function formatSnapshots(snapshots: MemorySnapshot[]): string {
    const rows = snapshots.map(s => ({
        phase: s.label,
        "wkr in-use MB": mb(s.worker.heap?.in_use_bytes),
        "wkr wasm MB": mb(s.worker.wasmBytes),
        "wkr free MB": mb(s.worker.heap?.free_bytes),
        "memfs MB": mb(s.worker.memfsBytes),
        "memfs files": String(s.worker.memfsFiles),
        "coot slots": String(s.worker.cootMoleculeSlots),
        "main in-use MB": mb(s.main.heap?.in_use_bytes),
        "main wasm MB": mb(s.main.wasmBytes),
        "main JS MB": mb(s.main.jsHeapBytes),
    }));
    const headers = Object.keys(rows[0]);
    const widths = headers.map(h => Math.max(h.length, ...rows.map(r => (r as any)[h].length)));
    const line = (cells: string[]) => cells.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join(" | ");
    return [line(headers), ...rows.map(r => line(headers.map(h => (r as any)[h])))].join("\n");
}

test.describe("coot worker memory", () => {
    test("gives memory back after editing tutorial 1 and deleting it, cycle after cycle", async ({ page, browserName }, testInfo) => {
        test.setTimeout(45 * 60_000);

        // Embind warns when it has to free a C++ object whose JS handle was dropped without delete().
        const embindLeaks: string[] = [];
        page.on("console", message => {
            if (/leaked C\+\+ instance|Embind found a leaked/i.test(message.text())) embindLeaks.push(message.text());
        });

        const moorhen = await startAndGetInstance(page);
        const { elementId, host } = moorhen;
        const cdp = browserName === "chromium" ? await page.context().newCDPSession(page) : null;
        await cdp?.send("Performance.enable");

        const snapshots: MemorySnapshot[] = [];
        const snap = async (label: string) => {
            const snapshot = await readMemory(page, label, cdp);
            snapshots.push(snapshot);
            console.log(`[${browserName}] ${label}: worker in-use ${mb(snapshot.worker.heap?.in_use_bytes)} MB, wasm ${mb(snapshot.worker.wasmBytes)} MB, memfs ${mb(snapshot.worker.memfsBytes)} MB in ${snapshot.worker.memfsFiles} files`);
            return snapshot;
        };

        await waitForIdle(page, elementId, 1_000);
        await snap("empty");

        const afterDelete: MemorySnapshot[] = [];
        for (let cycle = 1; cycle <= CYCLES; cycle++) {
            const { firstResidue } = await loadTutorial1(moorhen);
            const { box, nextResidue } = await prepareResidueWalk(moorhen, firstResidue);
            await waitForIdle(page, elementId, 500);
            await snap(`c${cycle} loaded`);

            for (let index = 1; index <= RESIDUES; index++) {
                await nextResidue();
                await lookAround(page, box);
                if (selectedActions.length > 0) {
                    await runResidueAction(page, host, elementId, box, selectedActions[(index - 1) % selectedActions.length]);
                }
                await waitForIdle(page, elementId);
                if (index % 10 === 0 || index === RESIDUES) await snap(`c${cycle} res ${index}`);
            }

            await deleteEverything(page, elementId);
            afterDelete.push(await snap(`c${cycle} deleted`));
        }

        const report = formatSnapshots(snapshots);
        const last = snapshots.at(-1)!;
        const memfsDirs = Object.entries(last.worker.memfsByDir).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([dir, bytes]) => `${dir} ${mb(bytes)} MB`);
        console.log(`\n[${browserName}] memory:\n${report}\n`);
        console.log(`[${browserName}] MEMFS at the end, largest: ${memfsDirs.join(", ")}`);
        console.log(`[${browserName}] embind leak warnings: ${embindLeaks.length}${embindLeaks.length ? ` (first: ${embindLeaks[0]})` : ""}`);
        await testInfo.attach("worker-memory.json", { body: JSON.stringify({ browserName, cycles: CYCLES, residues: RESIDUES, actions: selectedActions, snapshots, embindLeaks }, null, 2), contentType: "application/json" });
        await testInfo.attach("worker-memory.txt", { body: report, contentType: "text/plain" });

        const first = afterDelete[0];
        const final = afterDelete.at(-1)!;
        if (first.worker.heap && final.worker.heap) {
            expect.soft((final.worker.heap.in_use_bytes - first.worker.heap.in_use_bytes) / MB, `worker heap in use after delete, cycle 1 (${mb(first.worker.heap.in_use_bytes)} MB) to cycle ${CYCLES} (${mb(final.worker.heap.in_use_bytes)} MB)`).toBeLessThanOrEqual(MAX_CYCLE_GROWTH_MB);
        } else {
            testInfo.annotations.push({ type: "no heap stats", description: "wasm module has no get_heap_stats_json; rebuild wasm_src to measure heap in use" });
        }
        expect.soft((final.worker.memfsBytes - first.worker.memfsBytes) / MB, `worker MEMFS after delete, cycle 1 (${mb(first.worker.memfsBytes)} MB) to cycle ${CYCLES} (${mb(final.worker.memfsBytes)} MB)`).toBeLessThanOrEqual(MAX_CYCLE_GROWTH_MB);
        expect.soft(embindLeaks, "no embind handles dropped without delete()").toEqual([]);
    });
});
