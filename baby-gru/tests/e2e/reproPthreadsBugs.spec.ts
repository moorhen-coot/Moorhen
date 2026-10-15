/**
 * Reproduce the pthread-pool hang.
 *
 * Moorhen's wasm links with a fixed PTHREAD_POOL_SIZE (32, see wasm_src/CMakeLists.txt). When coot
 * asks for more concurrent threads than the pool holds, emscripten falls back to creating a worker
 * on demand, which requires returning to the JS event loop - and coot's spawn-then-join() loops
 * never do. The result is a hang with no stack and no error, which is why this needs a repro
 * rather than a bug report: from the application side there is nothing to see.
 *
 * "Fill all" is the trigger, but not in the way the name suggests. The button does no work itself:
 * it dispatches setShownControl({name: "fillAllAtoms"}), and a popup (ResidueSteps) then walks the
 * residue list one at a time, each step centring the view, calling fill_partial_residue and - with
 * enableRefineAfterMod defaulting to true - a TRIPLE refine. The refines are what use the threads,
 * and there are as many of them as there are partial residues. So the interesting window is the
 * whole run, not the first moment of it; an earlier version of this test probed two seconds in,
 * found the worker alive, and passed without having exercised anything.
 *
 * The probe has to be chosen with some care, and the obvious candidates are all wrong:
 *
 *   - Waiting for the render to settle proves nothing. A wedged application settles perfectly.
 *   - Waiting for the validation tool to rebuild its list is worse than useless: "Fill all" is
 *     rendered only when cards.length > 0, so a *successful* fill empties the list and removes the
 *     button. Waiting for it to come back therefore fails whether or not coot is alive, which is
 *     to say it confirms the bug unconditionally.
 *   - Waiting for the whole run to finish makes the timeout depend on how many partial residues
 *     the test data happens to have, which turns a hang into an indistinguishable slow pass.
 *
 * So the assertion is forward progress. moleculeMapUpdate.moleculeUpdate.switch toggles once per
 * completed residue, and shownControl tells us whether the run is still going; both live in the
 * redux store on the main thread, which stays responsive even when the worker does not. A wedge
 * shows up as the switch not toggling for STALL_MS while the run is still nominally in progress,
 * which is bounded however long the list is, and the failure message says how many residues it got
 * through first - the one number Clement will want.
 *
 * If the hang is fixed and this passes, keep it as a regression test. If it fails and blocks the
 * rest of the suite, mark it test.fixme rather than deleting it: the syntax error that used to be
 * in this file stopped Playwright loading *every* spec, which is far worse than one known failure.
 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { startAndGetInstance } from "./helpers";
import { sleep } from "@/utils/utils";

/** No toggle for this long, with the run still in progress, means the worker is not coming back. */
const STALL_MS = 45_000;

/** A backstop on the whole run, so a pathological dataset cannot hold the suite open. */
const RUN_BUDGET_MS = 240_000;

const POLL_MS = 500;

type FillState = {
    /** The popup currently on screen; "fillAllAtoms" while the run is going, null when it ends. */
    controlName: string | null;
    /** Toggled once per residue that has been filled and redrawn. */
    updateSwitch: boolean;
    moleculeCount: number;
};

/** Everything the probe needs, read from the store on the main thread in one round trip. */
const readFillState = (page: Page, elementId = "moorhen-test"): Promise<FillState> =>
    page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as {
            getMoorhenInstance: () => Promise<{ store: { getState: () => any } }>;
        } | null;

        if (!host?.getMoorhenInstance) {
            throw new Error(`Unable to find web component host with id '${targetId}'`);
        }

        const state = (await host.getMoorhenInstance()).store.getState();
        return {
            controlName: state?.globalUI?.shownControl?.name ?? null,
            updateSwitch: Boolean(state?.moleculeMapUpdate?.moleculeUpdate?.switch),
            moleculeCount: state?.molecules?.moleculeList?.length ?? 0,
        };
    }, elementId);

/** Whether a button with this aria-label is present, without clicking it. */
const hasButton = (page: Page, label: string, elementId = "moorhen-test"): Promise<boolean> =>
    page.evaluate(
        ({ targetId, label }) => {
            const root = (document.getElementById(targetId) as HTMLElement | null)?.shadowRoot;
            if (!root) return false;
            return Array.from(root.querySelectorAll("button"))
                .some(button => button.getAttribute("aria-label") === label);
        },
        { targetId: elementId, label }
    );

type RunOutcome = { filled: number; finished: boolean; stalledAfterMs: number };

/**
 * Watch the run until it finishes or stops moving.
 *
 * Returns rather than asserting, so the caller can report the residue count either way: a stall at
 * residue 30 and a stall at residue 0 are different bugs.
 */
async function watchFillRun(page: Page): Promise<RunOutcome> {
    const started = Date.now();
    let previous = await readFillState(page);
    let filled = 0;
    let lastProgressAt = started;

    while (Date.now() - started < RUN_BUDGET_MS) {
        await sleep(POLL_MS);
        const current = await readFillState(page);

        if (current.updateSwitch !== previous.updateSwitch) {
            filled++;
            lastProgressAt = Date.now();
        }
        previous = current;

        if (current.controlName !== "fillAllAtoms") {
            return { filled, finished: true, stalledAfterMs: 0 };
        }
        const sinceProgress = Date.now() - lastProgressAt;
        if (sinceProgress > STALL_MS) {
            return { filled, finished: false, stalledAfterMs: sinceProgress };
        }
    }

    return { filled, finished: false, stalledAfterMs: Date.now() - lastProgressAt };
}

test.describe("Moorhen pthread pool", () => {
    test("filling all partial residues does not wedge the coot worker", async ({ page }) => {
        test.setTimeout(RUN_BUDGET_MS + 120_000);

        const moorhen = await startAndGetInstance(page);

        await moorhen.buttonClick("File Menu");
        await moorhen.buttonClick("Load tutorial data...");
        await moorhen.buttonClick("Load Tutorial OK");
        await moorhen.waitForWebGLRenderSettle({ minSettleMs: 50, timeoutMs: 20_000 });

        await moorhen.buttonClick("Validation Menu");
        await moorhen.buttonClick("Fill partial residues...");

        // The list is built from a coot command, so it arrives asynchronously. This is also the
        // first liveness check: the worker answered at least once before the fill.
        await expect
            .poll(() => hasButton(page, "Fill all"), { timeout: 60_000 })
            .toBe(true);

        const beforeCounts = await moorhen.getObjectCounts();

        await moorhen.buttonClick("Fill all");

        // The click only opens the popup that does the work. If this never happens the test is
        // broken rather than the application, so it is worth separating from the run itself.
        await expect
            .poll(async () => (await readFillState(page)).controlName, { timeout: 30_000 })
            .toBe("fillAllAtoms");

        const outcome = await watchFillRun(page);

        expect(
            outcome.finished,
            `Fill all stopped making progress after ${outcome.filled} residue(s); ` +
            `nothing happened for ${Math.round(outcome.stalledAfterMs / 1000)}s while the run was ` +
            `still in progress. This is the pthread-pool hang: coot is inside a join that will not ` +
            `return, so no further coot command can be answered.`
        ).toBe(true);

        // A run of one residue would satisfy the above without having stressed anything.
        expect(outcome.filled, "the run ended without filling any residue").toBeGreaterThan(0);

        // Say how much work a passing run actually did. A pass is only reassuring in proportion to
        // the number of refines it got through, and the thread demand depends on how many cores
        // the browser admits to, so both belong in the output rather than in someone's assumptions.
        const cores = await page.evaluate(() => navigator.hardwareConcurrency);
        console.log(`[pthreads] filled ${outcome.filled} residue(s); navigator.hardwareConcurrency = ${cores}`);

        // Finally, confirm the worker can still take new work. The pool can be exhausted without
        // the current operation noticing; the next one is where that surfaces.
        await moorhen.loadFiles([{ url: "/tests/test_data/5a3h.pdb", filename: "5a3h.pdb" }]);

        await expect
            .poll(async () => (await readFillState(page)).moleculeCount, { timeout: 60_000 })
            .toBeGreaterThan(beforeCounts.moleculeCount);
    });
});
