import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { startAndGetInstance, type MoorhenStartedSession } from "./helpers";

// Is the pthread worker pool big enough for the thread limit that coot is given?
//
// The two numbers are worked out together when the coot module starts, from the number of
// cores (wasm_src/coot_env_web.js). A browser is the only place to check the result: the pool
// cannot grow while a call is running, so a call that needs a worker when none is free never
// returns, whereas Node quietly adds workers.
//
// Each test pretends that the machine has some number of cores, starts Moorhen, and runs the
// coot calls that use the most threads. It then checks that
//
//   - the thread limit and the pool size are what that number of cores should give;
//   - that many workers were started, and no more were needed afterwards;
//   - emscripten never reported that the pool was exhausted;
//   - every call returned.
//
// navigator.hardwareConcurrency has to be changed inside the Coot worker, where the module
// lives, so the tests add a few lines to the top of CootWorker.js as it is served. The same
// lines count the workers that the Coot worker creates.
//
// A browser that supports 64-bit memory gets the 64-bit build of the module. The tests run
// with that build and also with the 32-bit one, by making the worker's test for 64-bit memory
// fail.

const coresToTest = [2, 4, 8, 16];
const builds = ["64", "32"] as const;
type Build = (typeof builds)[number];

const expectedLimit = (cores: number) => Math.min(cores, 8);
const expectedPool = (cores: number) => 2 * expectedLimit(cores) + 4;

const probeMarker = "[coot-thread-pool-probe]";

// Runs at the top of the Coot worker, before the coot module is loaded.
const probeScript = (cores: number | null, build: Build) => `
(() => {
    ${cores === null ? "" : `Object.defineProperty(self.navigator, "hardwareConcurrency", { get: () => ${cores} });`}
    ${
        build === "64"
            ? ""
            : `// CootWorker asks whether a 13-byte module that declares a 64-bit memory is valid.
    const realValidate = WebAssembly.validate.bind(WebAssembly);
    WebAssembly.validate = bytes => (bytes && bytes.length === 13 && bytes[8] === 5 && bytes[11] === 4 ? false : realValidate(bytes));`
    }
    const RealWorker = self.Worker;
    let created = 0;
    self.Worker = class extends RealWorker {
        constructor(...args) {
            super(...args);
            created++;
            console.log("${probeMarker} workers created: " + created);
        }
    };
    console.log("${probeMarker} hardwareConcurrency: " + self.navigator.hardwareConcurrency);
})();
`;

type Probe = {
    messages: string[];
    workersCreated: () => number;
    reportedCores: () => number | undefined;
    loadedBuild: () => string | undefined;
    limitAndPool: () => { limit: number; pool: number } | undefined;
    poolExhausted: () => string[];
};

async function installProbe(page: Page, cores: number | null, build: Build = "64"): Promise<Probe> {
    const messages: string[] = [];
    page.on("console", message => messages.push(message.text()));
    page.on("worker", worker => {
        // Console messages of a worker are reported on the worker in some versions of Playwright.
        (worker as unknown as { on: (event: string, listener: (message: { text: () => string }) => void) => void }).on("console", message =>
            messages.push(message.text())
        );
    });
    await page.route("**/wasm/CootWorker.js*", async route => {
        const response = await route.fetch();
        const body = await response.text();
        await route.fulfill({ response, body: probeScript(cores, build) + body });
    });

    const lastNumber = (pattern: RegExp): number | undefined => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const match = messages[i].match(pattern);
            if (match) return Number(match[1]);
        }
        return undefined;
    };
    return {
        messages,
        workersCreated: () => lastNumber(/coot-thread-pool-probe\] workers created: (\d+)/) ?? 0,
        reportedCores: () => lastNumber(/coot-thread-pool-probe\] hardwareConcurrency: (\d+)/),
        loadedBuild: () => {
            for (const text of messages) {
                const match = text.match(/Successfully loaded (\d+)-bit libcoot/);
                if (match) return match[1];
            }
            return undefined;
        },
        limitAndPool: () => {
            for (const text of messages) {
                const match = text.match(/Coot thread limit (\d+), pthread pool of (\d+) workers/);
                if (match) return { limit: Number(match[1]), pool: Number(match[2]) };
            }
            return undefined;
        },
        poolExhausted: () => messages.filter(text => text.includes("thread pool is exhausted")),
    };
}

type Reply = { status: string | undefined; result: unknown; consoleMessage: string | undefined };

async function coot(page: Page, command: string, commandArgs: unknown[], returnType = "void", elementId = "moorhen-test"): Promise<Reply> {
    return page.evaluate(
        async ({ targetId, command, commandArgs, returnType }) => {
            const host = document.getElementById(targetId) as unknown as {
                getMoorhenInstance: () => Promise<{ commandCentre: any }>;
            } | null;
            if (!host?.getMoorhenInstance) {
                throw new Error(`Unable to find web component host with id '${targetId}'`);
            }
            const commandCentre = (await host.getMoorhenInstance()).commandCentre;
            // A call that waits for a worker that never comes does not return: report that
            // instead of waiting for the test to time out.
            const reply = await Promise.race([
                commandCentre.cootCommand({ command, commandArgs, returnType }, false),
                new Promise(resolve => setTimeout(() => resolve({ data: { result: { status: "No reply within 120 s" } } }), 120_000)),
            ]);
            return {
                status: reply.data.result?.status,
                result: reply.data.result?.result,
                consoleMessage: reply.data.consoleMessage,
            };
        },
        { targetId: elementId, command, commandArgs, returnType }
    );
}

// Load a model and its maps, and return the molecule numbers that coot gave them.
async function loadModelAndMap(moorhen: MoorhenStartedSession): Promise<{ imol: number; imap: number }> {
    await moorhen.loadFiles([
        { url: "/tests/test_data/5a3h_no_ligand.pdb", filename: "5a3h_no_ligand.pdb" },
        { url: "/tests/test_data/5a3h_sigmaa.mtz", filename: "5a3h_sigmaa.mtz" },
    ]);
    await expect
        .poll(async () => {
            const counts = await moorhen.getObjectCounts();
            return counts.moleculeCount >= 1 && counts.mapCount >= 1;
        }, { timeout: 120_000 })
        .toBe(true);

    const nMolecules = Number((await coot(moorhen.page, "get_number_of_molecules", [], "status")).result);
    let imol = -1;
    let imap = -1;
    for (let i = 0; i < nMolecules; i++) {
        if (imol < 0 && (await coot(moorhen.page, "is_valid_model_molecule", [i], "status")).result === true) imol = i;
        if (imap < 0 && (await coot(moorhen.page, "is_valid_map_molecule", [i], "status")).result === true) imap = i;
    }
    expect(imol).toBeGreaterThanOrEqual(0);
    expect(imap).toBeGreaterThanOrEqual(0);
    return { imol, imap };
}

// The calls that start the most threads. Returns the calls that did not complete.
async function runThreadedCalls(page: Page, imol: number, imap: number): Promise<string[]> {
    const failures: string[] = [];
    const run = async (command: string, commandArgs: unknown[], returnType = "void"): Promise<Reply> => {
        const reply = await coot(page, command, commandArgs, returnType);
        if (reply.status !== "Completed") failures.push(`${command}: ${reply.status} ${reply.consoleMessage ?? ""}`);
        return reply;
    };

    await run("set_imol_refinement_map", [imap]);
    await run("fill_rotamer_probability_tables", []);

    await run("get_map_contours_mesh", [imap, 61.15, 45.47, 36.4, 20, 0.4]);
    await run("density_correlation_analysis", [imol, imap]);
    await run("mmrrcc", [imol, "A", imap]);
    await run("get_rotamer_dodecs_instanced", [imol]);
    await run("all_molecule_contact_dots", [imol, 1]);
    await run("get_molecular_representation_mesh", [imol, "//A/10-40", "Chain", "MolecularSurface", 2]);

    const refined = await run("refine_residues_using_atom_cid", [imol, "//A/100", "TRIPLE", 100], "status");
    if (refined.result !== 1) failures.push(`refine_residues_using_atom_cid returned ${JSON.stringify(refined.result)}`);
    await run("refine_residue_range", [imol, "A", 30, 40, 100], "status");
    await run("minimize_energy", [imol, "//A/50-54", 50, false, 20.0, false, 0.0, true]);

    // Fit a ligand, with conformers: the call that started the most threads.
    const dictionary = readFileSync(path.join(__dirname, "..", "test_data", "LZA.cif"), "utf8");
    await run("read_dictionary_string", [dictionary, -999999], "status");
    const ligand = await run("get_monomer_and_position_at", ["LZA", -999999, 0, 0, 0], "status");
    const fits = await run("fit_ligand_right_here", [imol, imap, Number(ligand.result), 61.15, 45.47, 36.4, 1.0, true, 40, 2], "int_array");
    // Check that the calls did their work, and did not just return.
    if (!Array.isArray(fits.result) || fits.result.length !== 1) failures.push(`fit_ligand_right_here fitted ${JSON.stringify(fits.result)}`);

    // A map for each chain, of a model with many chains: a thread for each chain.
    const copy = await run("copy_fragment_using_cid", [imol, "//A"], "status");
    const imolChains = Number(copy.result);
    const newChainIds = "CDEFGHIJKLMNOPQRSTUV";
    for (let i = 0; i < newChainIds.length; i++) {
        await run("change_chain_id", [imolChains, "A", newChainIds[i], true, 4 + 15 * i, 4 + 15 * i + 14]);
    }
    const maps = await run("partition_map_by_chain", [imap, imolChains], "int_array");
    if (!Array.isArray(maps.result) || maps.result.length < newChainIds.length) failures.push(`partition_map_by_chain made ${JSON.stringify(maps.result)}`);

    return failures;
}

// Let the console messages of the workers arrive.
const settle = (page: Page) => page.waitForTimeout(1_000);

test.describe("Coot thread limit and pthread worker pool", () => {
    const cases = builds.flatMap(build => coresToTest.map(cores => ({ build, cores })));
    for (const { build, cores } of cases) {
        test(`${build}-bit build, ${cores} cores: ${expectedLimit(cores)} threads for coot, and a pool of ${expectedPool(cores)} workers is enough`, async ({ page }) => {
            test.setTimeout(600_000);
            const probe = await installProbe(page, cores, build);
            const moorhen = await startAndGetInstance(page);
            await settle(page);

            expect(probe.loadedBuild()).toBe(build);
            expect(probe.reportedCores()).toBe(cores);
            expect(probe.limitAndPool()).toEqual({ limit: expectedLimit(cores), pool: expectedPool(cores) });
            const workersAtStart = probe.workersCreated();
            expect(workersAtStart).toBe(expectedPool(cores));

            const { imol, imap } = await loadModelAndMap(moorhen);
            const failures = await runThreadedCalls(page, imol, imap);
            await settle(page);

            expect(failures).toEqual([]);
            expect(probe.poolExhausted()).toEqual([]);
            expect(probe.workersCreated()).toBe(workersAtStart);
        });
    }

    test("with the real number of cores, the limit and the pool agree", async ({ page }) => {
        test.setTimeout(600_000);
        const probe = await installProbe(page, null);
        const moorhen = await startAndGetInstance(page);
        await settle(page);

        const cores = probe.reportedCores();
        expect(cores).toBeGreaterThanOrEqual(1);
        expect(probe.limitAndPool()).toEqual({ limit: expectedLimit(cores!), pool: expectedPool(cores!) });
        const workersAtStart = probe.workersCreated();
        expect(workersAtStart).toBe(expectedPool(cores!));

        const { imol, imap } = await loadModelAndMap(moorhen);
        const failures = await runThreadedCalls(page, imol, imap);
        await settle(page);

        expect(failures).toEqual([]);
        expect(probe.poolExhausted()).toEqual([]);
        expect(probe.workersCreated()).toBe(workersAtStart);
    });

    // The checks above only mean something if they notice a pool that is too small. Give coot
    // a bigger limit than the pool was sized for, and see that they do.
    test("a thread limit that the pool was not sized for is noticed", async ({ page }) => {
        test.setTimeout(600_000);
        const probe = await installProbe(page, 2);
        await startAndGetInstance(page);
        await settle(page);

        const workersAtStart = probe.workersCreated();
        expect(workersAtStart).toBe(expectedPool(2));

        // 16 threads for coot's thread pool alone, when there are 8 workers.
        await coot(page, "set_max_number_of_threads", [16]);
        await settle(page);

        expect(probe.poolExhausted().length).toBeGreaterThan(0);
        expect(probe.workersCreated()).toBeGreaterThan(workersAtStart);
    });
});
