/*
 * Headless sweep of coot's thread count against calc_atom_map timing.
 *
 * Loads the coot wasm directly in Node -- no browser, no WebGL, no HTTP cache
 * -- reads a model and map from tests/test_data, then sweeps
 * set_max_number_of_threads() and parses coot's own timing line:
 *
 *   TIMINGS:: calc_atom_map_edcalc: accum N ms ... n_threads N
 *
 * Two things this answers that a browser cannot answer reliably:
 *
 *  1. Whether set_max_number_of_threads() is actually binding. The reported
 *     n_threads should track the value you set, 1:1. If it instead pins to the
 *     host core count, something on the C++ side is reading
 *     std::thread::hardware_concurrency() directly rather than going through
 *     coot::get_max_number_of_threads().
 *
 *  2. What a given thread count costs. Note the first repetition of each group
 *     is consistently slower (cold); that is why this reports a median of
 *     several reps rather than a single timing. Comparing two uncontrolled
 *     browser runs will mislead you here -- it is easy to "measure" a large
 *     speedup that is really just warm-vs-cold.
 *
 * Requires a local wasm build (public/MoorhenAssets/wasm/moorhen.js), which is
 * gitignored, so this only runs after ../moorhen_build.sh moorhen.
 *
 *   cd baby-gru && node scripts/thread-timing-sweep.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const babyGru = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wasmDir = path.join(babyGru, "public", "MoorhenAssets", "wasm");
const testData = path.join(babyGru, "tests", "test_data");
const { ungzip } = require("node-gzip");
const createCootModule = require(path.join(wasmDir, "moorhen"));

// Capture everything coot prints (std::cout / std::cerr -> print/printErr).
const BUF = [];
const capture = (t) => { BUF.push(String(t)); };

const THREAD_COUNTS = [1, 2, 3, 4, 6, 8, 10];
const REPS = 4;

const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Parse the most recent calc_atom_map_edcalc TIMINGS out of the capture buffer.
const parseEdcalc = () => {
    for (let i = BUF.length - 1; i >= 0; i--) {
        const m = BUF[i].match(/calc_atom_map_edcalc:\s*accum\s+(\d+)\s*ms.*?n_threads\s+(\d+)/);
        if (m) return { accum: Number(m[1]), nThreads: Number(m[2]) };
    }
    return null;
};

(async () => {
    console.log("[sweep] instantiating coot wasm (node, pthreads)...");
    const cootModule = await createCootModule({ print: capture, printErr: capture });

    // Unpack coot's data bundle into the wasm FS.
    const dataGz = readFileSync(path.join(babyGru, "public", "MoorhenAssets", "data.tar.gz"));
    const data = await ungzip(dataGz);
    cootModule.FS.mkdir("data_tmp");
    cootModule.FS_createDataFile("data_tmp", "data.tar", data, true, true);
    cootModule.unpackCootDataFile("data_tmp/data.tar", false, "", "");
    cootModule.FS_unlink("data_tmp/data.tar");
    cootModule.FS.mkdir("COOT_BACKUP");

    // Model + map into the FS.
    cootModule.FS_createDataFile(".", "1cxq.cif", readFileSync(path.join(testData, "1cxq.cif"), "utf8"), true, true);
    cootModule.FS_createDataFile(".", "1cxq_phases.mtz", readFileSync(path.join(testData, "1cxq_phases.mtz")), true, true);

    const mc = new cootModule.molecules_container_js(false);
    mc.set_use_gemmi(true);

    const imol = mc.read_pdb("1cxq.cif");
    const maps = mc.auto_read_mtz("1cxq_phases.mtz");
    // auto_read_mtz returns a vector of auto_read_mtz_info_t; .idx is the map molNo.
    // Prefer a non-difference (2Fo-Fc) map for a meaningful correlation.
    let imap = -1;
    for (let i = 0; i < maps.size(); i++) {
        const info = maps.get(i);
        if (imap < 0) imap = info.idx;
        if (info.F && info.F.toUpperCase().includes("FWT")) imap = info.idx;
    }
    console.log(`[sweep] model imol=${imol}  map imol=${imap}  (maps read: ${maps.size()})`);
    if (imol < 0 || imap < 0) { console.error("model/map load failed"); process.exit(1); }

    console.log(`[sweep] structure: 1cxq  reps=${REPS} per thread count\n`);
    const rows = [];
    for (const N of THREAD_COUNTS) {
        mc.set_max_number_of_threads(N);
        const accums = [];
        let observedN = null;
        for (let r = 0; r < REPS; r++) {
            BUF.length = 0;
            mc.density_correlation_analysis(imol, imap);
            const t = parseEdcalc();
            if (t) { accums.push(t.accum); observedN = t.nThreads; }
        }
        const med = accums.length ? median(accums) : NaN;
        rows.push({ set: N, observed: observedN, accums, med });
        console.log(`  set=${String(N).padStart(2)}  observed_n_threads=${observedN}  accum(ms)=[${accums.join(", ")}]  median=${med}`);
    }

    console.log("\n[sweep] SUMMARY  (calc_atom_map_edcalc accum, median ms)");
    console.log("  set_threads | observed | median accum(ms)");
    for (const r of rows) console.log(`  ${String(r.set).padStart(11)} | ${String(r.observed).padStart(8)} | ${r.med}`);

    const base = rows.find(r => r.set === 3)?.med;
    if (base) {
        console.log("\n[sweep] relative to set=3:");
        for (const r of rows) console.log(`  set=${String(r.set).padStart(2)}: ${(r.med / base).toFixed(2)}x`);
    }
    process.exit(0);
})().catch(e => { console.error("[sweep] FAILED:", e); process.exit(1); });
