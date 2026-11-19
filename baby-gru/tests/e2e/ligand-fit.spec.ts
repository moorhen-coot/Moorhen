import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";

/*
 * Fit a ligand anywhere, keep a pose, then refine it - the Find ligand modal followed by the
 * right-click "Refine Residues" button, through the same instance methods they call.
 *
 * Runs in a browser on purpose: the bug it guards against cannot happen under Node. The Coot
 * module has no main(), so with pthreads emscripten kept its runtime alive only while
 * runtimeKeepaliveCounter > 0, and nothing raised it. The first main-thread callback after start
 * (a pthread proxying its output) then exited the runtime and terminated every pthread in the
 * pool. The next call to start threads (refinement's non-bonded contacts) found none left, and
 * in a browser worker that cannot create one without returning to the event loop: it hung, with
 * "Tried to spawn a new thread, but the thread pool is exhausted" in the console. Node creates
 * threads on demand, so the jest tests never saw it.
 */
test.describe("Fit ligand", () => {
    test("LZA fitted anywhere into tutorial 1, a pose kept and refined, without exhausting the thread pool", async ({ page }) => {
        test.setTimeout(240_000);

        const poolMessages: string[] = [];
        page.on("console", message => {
            const text = message.text();
            if (/thread pool is exhausted|called exit|terminateAllThreads/i.test(text)) poolMessages.push(text);
        });

        const moorhen = await startAndGetInstance(page);
        await moorhen.loadFiles([
            { url: "/MoorhenAssets/tutorials/moorhen-tutorial-structure-number-1.ent", filename: "moorhen-tutorial-structure-number-1.ent" },
            { url: "/MoorhenAssets/tutorials/moorhen-tutorial-map-number-1.mtz", filename: "moorhen-tutorial-map-number-1.mtz" },
        ]);
        const lzaCif = await (await page.request.get("/tests/test_data/LZA.cif")).text();
        expect(lzaCif).toContain("LZA");

        const result = await page.evaluate(
            async ({ targetId, cif }) => {
                const host = document.getElementById(targetId) as unknown as { getMoorhenInstance: () => Promise<any> };
                const instance = await host.getMoorhenInstance();
                const commandCentre = instance.commandCentre;
                const molecules = instance.getMoleculeList();
                const protein = molecules.find((molecule: any) => molecule.name.startsWith("moorhen-tutorial-structure-number-1"));
                const activeMap = instance.store.getState().generalStates.activeMap;
                if (!protein || !activeMap) return { error: `protein ${!!protein}, active map ${!!activeMap}` };

                // The modal: a template from the dictionary, fit anywhere, close the template
                await commandCentre.cootCommand({ returnType: "status", command: "read_dictionary_string", commandArgs: [cif, -999999] }, false);
                const template = await commandCentre.cootCommand({ returnType: "status", command: "get_monomer", commandArgs: ["LZA"] }, false);
                const templateMolNo = template.data.result.result;
                const poses = await protein.fitLigand(activeMap.molNo, templateMolNo, false, false, false, 0);
                await commandCentre.cootCommand({ returnType: "status", command: "close_molecule", commandArgs: [templateMolNo] }, false);
                if (poses.length === 0) return { error: "no poses" };
                const correlations = poses.map((pose: any) => Number(pose.metadata["Fit correlation"]));

                // Keep the best pose, drop the others
                const [ligand, ...others] = poses;
                for (const other of others) await other.delete();

                // The right-click "Refine Residues" (animated, TRIPLE): twice, so a refinement after
                // one that has already used the pool is covered too
                const [atom] = await ligand.gemmiAtomsForCid("/*/*/*/*");
                const cid = `//${atom.chain_id}/${atom.res_no}`;
                const within = (promise: Promise<unknown>, ms: number) =>
                    Promise.race([promise.then(() => "finished"), new Promise(resolve => setTimeout(() => resolve(`did not finish in ${ms} ms`), ms))]);
                const first = await within(ligand.refineResiduesUsingAtomCidAnimated(cid, activeMap, 2), 60_000);
                const second = await within(ligand.refineResiduesUsingAtomCidAnimated(cid, activeMap, 2), 60_000);
                return { poses: poses.length, correlations, first, second };
            },
            { targetId: moorhen.elementId, cif: lzaCif }
        );

        expect(result).not.toHaveProperty("error");
        expect(result.poses).toBeGreaterThan(0);
        // Best fit first (fitLigand sorts by correlation with the map)
        expect(result.correlations).toEqual([...result.correlations].sort((a: number, b: number) => b - a));
        expect(result.first).toBe("finished");
        expect(result.second).toBe("finished");
        expect(poolMessages).toEqual([]);
    });
});
