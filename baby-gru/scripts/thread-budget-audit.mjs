#!/usr/bin/env node
/*
 * Does coot stay within set_max_number_of_threads()?
 *
 * Loads the coot wasm in Node, runs a set of API calls at several thread limits
 * and, for each call, reports how many pthread-pool workers it used. Emscripten
 * serves every thread from a fixed pool of workers (PTHREAD_POOL_SIZE), and in a
 * browser a call that needs more workers than are free never returns - so the
 * number that matters is "workers in use", which only the glue can see.
 *
 * Per call (N is the limit given to set_max_number_of_threads):
 *
 *   spawned  threads the call created
 *   peak     most workers in use at any moment, including the N workers that
 *            the molecules container's own thread pool holds all the time
 *   burst    peak minus the workers in use before the call. This is what the
 *            call itself asked for. More than N is reported as a failure.
 *   held     workers still in use when the call returns, minus those in use
 *            before it. Non-zero means threads were joined from a thread other
 *            than the main one (or were detached): emscripten can only recycle
 *            those workers from the JS event loop, so a spawn/join loop inside
 *            a thread uses up a new set of workers on every pass. Reported as a
 *            failure.
 *
 * It also fails if the emscripten runtime shuts itself down (which terminates
 * every pthread): see moorhen-wrappers.cc for why that can happen.
 *
 * The glue is not modified: an instrumented copy is made in a temporary directory.
 * Needs a local wasm build (public/MoorhenAssets/wasm/moorhen.js).
 *
 *   cd baby-gru && node scripts/thread-budget-audit.mjs [options]
 *
 *   --glue <moorhen.js>   glue to test (default: public/MoorhenAssets/wasm/moorhen.js)
 *   --limits 8,4,2        thread limits to test (default 8,2)
 *   --filter <regex>      only run the calls whose name matches
 *   --many-chains         also run partition_map_by_chain on 20 and 35 chain models
 *   --verbose             show coot's own output
 *
 * The exit status is 1 if any call failed, else 0.
 */
import { readFileSync, writeFileSync, mkdtempSync, symlinkSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { gunzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const babyGru = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testData = path.join(babyGru, "tests", "test_data");
const dataTgz = path.join(babyGru, "public", "MoorhenAssets", "data.tar.gz");

const argv = process.argv.slice(2);
const option = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const glue = path.resolve(option("--glue", path.join(babyGru, "public", "MoorhenAssets", "wasm", "moorhen.js")));
const nList = option("--limits", "8,2");
const filter = option("--filter", "");
const manyChains = argv.includes("--many-chains");
const verbose = argv.includes("--verbose");

// ---- make an instrumented copy of the glue ---------------------------------
//
// getNewWorker() takes a worker out of the pool and returnWorkerToPool() puts
// it back; both only ever run on the main thread. The patterns cover minified
// and unminified glue. The pool is also made smaller: in Node it grows on demand
// (which is why Node cannot reproduce the browser deadlock, only count), and 32
// idle workers is a lot of memory.
function instrument(src) {
    if (src.includes("globalThis.__thr")) throw new Error(`${glue} is already instrumented - give the original glue`);
    const hook = (re, code, what) => {
        const out = src.replace(re, (m) => m + code);
        if (out === src) throw new Error(`could not find ${what} in ${glue} - has the shape of emscripten's glue changed?`);
        src = out;
    };
    hook(/getNewWorker\(\)\s*\{/, "globalThis.__thr&&globalThis.__thr.acq();", "getNewWorker()");
    hook(/returnWorkerToPool\s*(:\s*\(?worker\)?\s*=>\s*\{|\(worker\)\s*\{)/, "globalThis.__thr&&globalThis.__thr.rel();", "returnWorkerToPool()");
    hook(/terminateAllThreads\s*(:\s*\(\)\s*=>\s*\{|\(\)\s*\{)/, "globalThis.__thr&&globalThis.__thr.runtimeExit();", "terminateAllThreads()");
    return src.replace(/pthreadPoolSize\s*=\s*[^;]+/, "pthreadPoolSize=8");
}
const work = mkdtempSync(path.join(os.tmpdir(), "moorhen-thread-audit-"));
process.on("exit", () => rmSync(work, { recursive: true, force: true }));
const gluePath = path.join(work, path.basename(glue));
writeFileSync(gluePath, instrument(readFileSync(glue, "utf8")));
symlinkSync(glue.replace(/\.js$/, ".wasm"), gluePath.replace(/\.js$/, ".wasm"));

const thr = {
    live: 0, peak: 0, spawned: 0,
    acq() { this.live++; this.spawned++; if (this.live > this.peak) this.peak = this.live; },
    rel() { this.live--; },
    runtimeExit() {
        console.log("\nFAIL: the emscripten runtime exited and terminated every pthread. Calls that need threads\n" +
            "would now hang, so stopping here. The module has to keep its runtime alive (see moorhen-wrappers.cc).\n" +
            new Error().stack.split("\n").slice(2, 8).join("\n"));
        process.exit(1);
    },
};
globalThis.__thr = thr;

const capture = (t) => { if (verbose) console.log("   | " + t); };
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

const M = await require(gluePath)({ print: capture, printErr: capture });

M.FS.mkdir("data_tmp");
M.FS_createDataFile("data_tmp", "data.tar", gunzipSync(readFileSync(dataTgz)), true, true);
M.unpackCootDataFile("data_tmp/data.tar", false, "", "");
M.FS_unlink("data_tmp/data.tar");
M.FS.mkdir("COOT_BACKUP");
const put = (name, dir = testData) => {
    const bin = /\.(mtz|map)$/.test(name);
    M.FS_createDataFile(".", name, readFileSync(path.join(dir, name), bin ? null : "utf8"), true, true);
};
["5a3h.pdb", "5a3h_no_ligand.pdb", "5a3h_sigmaa.mtz", "LZA.cif", "5fjj.pdb", "3j2w.pdb", "low-res-emd-32143.map"].forEach((f) => put(f));

const results = [];
const wanted = (name) => !filter || new RegExp(filter).test(name);

// Calls whose thread use is fixed by something other than the limit, by design.
const exempt = (name) => name === "new molecules_container_js" || name === "set_max_number_of_threads";

async function measure(N, name, fn) {
    if (!wanted(name)) return undefined;
    await tick();
    const before = thr.live;
    thr.peak = thr.live;
    const spawned0 = thr.spawned;
    let ret, error = null;
    const t0 = performance.now();
    try { ret = fn(); } catch (e) { error = String(e && e.message ? e.message : e).split("\n")[0]; }
    const ms = performance.now() - t0;
    const row = {
        N, name, before, spawned: thr.spawned - spawned0, peak: thr.peak,
        burst: thr.peak - before, held: thr.live - before, ms: Math.round(ms), error,
    };
    await tick();
    row.fail = !exempt(name) && (row.error !== null || row.burst > N || row.held > 0);
    results.push(row);
    const why = row.error ? "ERROR " + row.error
        : exempt(name) ? "" : [row.burst > N ? `burst > ${N}` : "", row.held > 0 ? "workers held at return" : ""].filter(Boolean).join(", ");
    const pad = (v, n) => String(v).padStart(n);
    console.log(`N=${N} ${name.padEnd(46)} spawned=${pad(row.spawned, 4)} peak=${pad(row.peak, 3)} burst=${pad(row.burst, 3)} ` +
        `held=${pad(row.held, 3)} ${pad(row.ms, 6)}ms  ${row.fail ? "FAIL: " + why : ""}`);
    return ret;
}

async function runForN(N) {
    console.log(`\n================ set_max_number_of_threads(${N}) ================`);
    let mc;
    await measure(N, "new molecules_container_js", () => { mc = new M.molecules_container_js(false); });
    if (!mc) mc = new M.molecules_container_js(false);
    mc.set_use_gemmi(false);
    mc.set_show_timings(false);
    mc.set_refinement_is_verbose(false);
    mc.set_map_sampling_rate(1.7);
    await measure(N, "set_max_number_of_threads", () => mc.set_max_number_of_threads(N));
    if (!wanted("set_max_number_of_threads")) { mc.set_max_number_of_threads(N); await tick(); }
    console.log(`   workers held by the container's thread pool: ${thr.live}`);

    let imol, imap, idiff;
    await measure(N, "read_pdb", () => { imol = mc.read_pdb("5a3h.pdb"); });
    await measure(N, "read_mtz", () => { imap = mc.read_mtz("5a3h_sigmaa.mtz", "FWT", "PHWT", "", false, false); });
    if (imol === undefined) imol = mc.read_pdb("5a3h.pdb");
    if (imap === undefined) imap = mc.read_mtz("5a3h_sigmaa.mtz", "FWT", "PHWT", "", false, false);
    idiff = mc.read_mtz("5a3h_sigmaa.mtz", "DELFWT", "PHDELWT", "", false, true);
    mc.set_imol_refinement_map(imap);
    const del = (o) => { try { o && o.delete && o.delete(); } catch (e) { /* not an embind object */ } };

    mc.set_map_is_contoured_with_thread_pool(true);
    await measure(N, "get_map_contours_mesh (thread pool)", () => del(mc.get_map_contours_mesh(imap, 0, 0, 0, 20, 0.3)));
    await measure(N, "get_map_contours_mesh diff map (thread pool)", () => del(mc.get_map_contours_mesh(idiff, 0, 0, 0, 20, 0.2)));
    mc.set_map_is_contoured_with_thread_pool(false);
    await measure(N, "get_map_contours_mesh (std::thread)", () => del(mc.get_map_contours_mesh(imap, 0, 0, 0, 20, 0.3)));
    await measure(N, "get_map_contours_mesh diff map (std::thread)", () => del(mc.get_map_contours_mesh(idiff, 0, 0, 0, 20, 0.2)));
    mc.set_map_is_contoured_with_thread_pool(true);

    await measure(N, "get_bonds_mesh_instanced", () => del(mc.get_bonds_mesh_instanced(imol, "COLOUR-BY-CHAIN-AND-DICTIONARY", false, 0.1, 1.0, false, false, false, true, 1)));
    await measure(N, "fill_rotamer_probability_tables", () => mc.fill_rotamer_probability_tables());
    await measure(N, "get_rotamer_dodecs_instanced", () => del(mc.get_rotamer_dodecs_instanced(imol)));
    await measure(N, "rotamer_analysis", () => del(mc.rotamer_analysis(imol)));
    await measure(N, "ramachandran_validation", () => del(mc.ramachandran_validation(imol)));

    await measure(N, "density_fit_analysis", () => del(mc.density_fit_analysis(imol, imap)));
    await measure(N, "density_correlation_analysis", () => del(mc.density_correlation_analysis(imol, imap)));
    await measure(N, "mmrrcc", () => del(mc.mmrrcc(imol, "A", imap)));
    await measure(N, "get_q_score", () => del(mc.get_q_score(imol, imap)));
    await measure(N, "difference_map_peaks", () => del(mc.difference_map_peaks(idiff, imol, 4.5)));
    await measure(N, "pepflips_using_difference_map", () => del(mc.pepflips_using_difference_map(imol, idiff, 3.5)));

    await measure(N, "all_molecule_contact_dots", () => del(mc.all_molecule_contact_dots(imol, 1)));
    await measure(N, "contact_dots_for_ligand", () => del(mc.contact_dots_for_ligand(imol, "//A/1301", 1)));
    await measure(N, "get_overlap_dots", () => del(mc.get_overlap_dots(imol)));

    await measure(N, "molecular surface mesh", () => del(mc.get_molecular_representation_mesh(imol, "//A/10-60", "Chain", "MolecularSurface", 2)));
    await measure(N, "ribbons mesh", () => del(mc.get_molecular_representation_mesh(imol, "//", "Chain", "Ribbon", 2)));
    await measure(N, "get_gaussian_surface", () => del(mc.get_gaussian_surface(imol, 4.4, 4.0, 0.7, 0.3, 100.0)));

    await measure(N, "refine_residues_using_atom_cid TRIPLE", () => mc.refine_residues_using_atom_cid(imol, "//A/100", "TRIPLE", 200));
    await measure(N, "refine_residues_using_atom_cid SPHERE", () => mc.refine_residues_using_atom_cid(imol, "//A/150", "SPHERE", 200));
    await measure(N, "refine_residue_range", () => mc.refine_residue_range(imol, "A", 30, 40, 200));
    await measure(N, "refine_residues x20 (loop of calls)", () => { for (let i = 0; i < 20; i++) mc.refine_residues_using_atom_cid(imol, `//A/${60 + i}`, "TRIPLE", 50); });
    await measure(N, "fragment refinement init+refine", () => {
        const frag = mc.copy_fragment_for_refinement_using_cid(imol, "//A/200-210");
        mc.init_refinement_of_molecule_as_fragment_based_on_reference(frag, imol, imap);
        for (let i = 0; i < 5; i++) del(mc.refine(frag, 50));
        mc.clear_refinement(imol);
        mc.close_molecule(frag);
    });
    await measure(N, "generate_self_restraints", () => mc.generate_self_restraints(imol, 5.0));
    await measure(N, "auto_fit_rotamer", () => mc.auto_fit_rotamer(imol, "A", 100, "", "", imap));
    await measure(N, "flipPeptide_cid", () => mc.flipPeptide_cid(imol, "//A/120/C", ""));
    await measure(N, "fill_partial_residues", () => mc.fill_partial_residues(imol));
    await measure(N, "add_terminal_residue_directly_using_cid", () => mc.add_terminal_residue_directly_using_cid(imol, "//A/303"));
    await measure(N, "rigid_body_fit", () => mc.rigid_body_fit(imol, "//A/40-60", imap));
    await measure(N, "fit_to_map_by_random_jiggle_using_cid", () => mc.fit_to_map_by_random_jiggle_using_cid(imol, "//A/1301", 100, 2.0));
    await measure(N, "add_waters", () => mc.add_waters(imol, imap));
    await measure(N, "flood", () => { const w = mc.flood(imol, 20, 3.0); return w; });

    // ligands
    mc.import_cif_dictionary("LZA.cif", -999999);
    const iprot = mc.read_pdb("5a3h_no_ligand.pdb");
    const ilig = mc.get_monomer_and_position_at("LZA", -999999, 0, 0, 0);
    const fitHere = (useConf, nConf) => () => {
        let r;
        try { r = mc.fit_ligand_right_here(iprot, imap, ilig, 61.15, 45.47, 36.40, 1.0, useConf, nConf, 2); }
        catch (e) { r = mc.fit_ligand_right_here(iprot, imap, ilig, 61.15, 45.47, 36.40, 1.0, useConf, nConf); }
        del(r);
    };
    await measure(N, "fit_ligand_right_here (no conformers)", fitHere(false, 10));
    await measure(N, "fit_ligand_right_here (9 conformers)", fitHere(true, 9));
    await measure(N, "fit_ligand_right_here (40 conformers)", fitHere(true, 40));
    await measure(N, "fit_ligand (40 conformers)", () => {
        let r;
        try { r = mc.fit_ligand(iprot, imap, ilig, 1.0, true, 40, 2); }
        catch (e) { r = mc.fit_ligand(iprot, imap, ilig, 1.0, true, 40); }
        del(r);
    });
    await measure(N, "get_dictionary_conformers", () => del(mc.get_dictionary_conformers("LZA", -999999, true)));
    await measure(N, "get_ligand_validation_vs_dictionary", () => del(mc.get_ligand_validation_vs_dictionary(ilig, "//", true)));
    await measure(N, "get_mesh_for_ligand_validation_vs_dictionary", () => del(mc.get_mesh_for_ligand_validation_vs_dictionary(ilig, "//")));
    await measure(N, "get_ligand_distortion", () => del(mc.get_ligand_distortion(ilig, "//", true)));
    await measure(N, "minimize_energy", () => del(mc.minimize_energy(ilig, "//", 100, false, 20, false, 0, false)));

    // maps
    await measure(N, "sharpen_blur_map", () => mc.sharpen_blur_map(imap, 20, false));
    await measure(N, "sharpen_blur_map_with_resample", () => mc.sharpen_blur_map_with_resample(imap, 20, 1.5, false));
    await measure(N, "make_power_scaled_map", () => mc.make_power_scaled_map(imap, imap));
    await measure(N, "mask_map_by_atom_selection", () => mc.mask_map_by_atom_selection(imol, imap, "//A", 4.0, false));
    await measure(N, "make_masked_maps_split_by_chain", () => del(mc.make_masked_maps_split_by_chain(imol, imap)));
    await measure(N, "partition_map_by_chain (2 chains)", () => del(mc.partition_map_by_chain(imap, imol)));
    let iem;
    await measure(N, "read_ccp4_map", () => { iem = mc.read_ccp4_map("low-res-emd-32143.map", false); });
    if (iem !== undefined && iem >= 0) {
        await measure(N, "get_map_contours_mesh EM (thread pool)", () => del(mc.get_map_contours_mesh(iem, 100, 100, 100, 40, 0.01)));
        await measure(N, "sharpen_blur_map EM", () => mc.sharpen_blur_map(iem, 50, false));
    }
    if (manyChains) {
        const i20 = mc.read_pdb("3j2w.pdb");
        await measure(N, "partition_map_by_chain (20 chains)", () => del(mc.partition_map_by_chain(imap, i20)));
    }
    if (manyChains) {
        const i35 = mc.read_pdb("5fjj.pdb");
        await measure(N, "partition_map_by_chain (35 chains)", () => del(mc.partition_map_by_chain(imap, i35)));
    }

    mc.delete();
    await tick(200);
    console.log(`   workers still in use after deleting the container: ${thr.live}`);
}


for (const N of nList.split(",").map(Number)) await runForN(N);

const failed = results.filter((r) => r.fail);
const worst = results.reduce((a, r) => (r.peak > a.peak ? r : a), { peak: 0 });
console.log(`\n${results.length} calls measured, ${failed.length} failed. ` +
    `Most workers in use at once: ${worst.peak} (N=${worst.N}, ${worst.name}).`);
for (const r of failed) console.log(`  FAIL N=${r.N} ${r.name}: ${r.error ?? `burst ${r.burst}, held ${r.held}`}`);
process.exit(failed.length ? 1 : 0);
