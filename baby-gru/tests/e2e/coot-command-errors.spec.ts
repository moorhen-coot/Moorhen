import { expect, test, type Page } from "@playwright/test";
import { startAndGetInstance } from "./helpers";

// Exercises the coot command error paths end to end, using the debug_* test hooks on
// molecules_container_js (wasm_src/moorhen-wrappers-helpers.h), which always fail.

type CommandOutcome = {
    status: string | undefined;
    consoleMessage: string | undefined;
    result: unknown;
    pendingAfter: number;
};

async function runCootCommand(page: Page, command: string, commandArgs: unknown[] = [], elementId = "moorhen-test"): Promise<CommandOutcome> {
    return page.evaluate(
        async ({ targetId, command, commandArgs }) => {
            const host = document.getElementById(targetId) as unknown as {
                getMoorhenInstance: () => Promise<{ commandCentre: any }>;
            } | null;
            if (!host?.getMoorhenInstance) {
                throw new Error(`Unable to find web component host with id '${targetId}'`);
            }
            const commandCentre = (await host.getMoorhenInstance()).commandCentre;
            // Fail the test rather than hang if the worker never replies.
            const reply = await Promise.race([
                commandCentre.cootCommand({ command, commandArgs, returnType: "status" }, false),
                new Promise((_, reject) => setTimeout(() => reject(new Error(`No reply to ${command} within 10s`)), 10_000)),
            ]);
            return {
                status: reply.data.result?.status,
                consoleMessage: reply.data.consoleMessage,
                result: reply.data.result?.result,
                pendingAfter: commandCentre.activeMessages.length,
            };
        },
        { targetId: elementId, command, commandArgs }
    );
}

test.describe("Coot command error handling", () => {
    test("a C++ exception becomes an Exception reply and the worker keeps working", async ({ page }) => {
        test.setTimeout(120_000);
        const moorhen = await startAndGetInstance(page);

        const failed = await runCootCommand(moorhen.page, "debug_throw_exception", ["deliberate test failure"]);
        expect(failed.status).toBe("Exception");
        expect(failed.consoleMessage).toContain("debug_throw_exception");
        expect(failed.consoleMessage).toContain("deliberate test failure");
        expect(failed.pendingAfter).toBe(0);

        // The module is still alive: the next command succeeds normally.
        const next = await runCootCommand(moorhen.page, "get_number_of_molecules");
        expect(next.status).toBe("Completed");
        expect(next.pendingAfter).toBe(0);
    });

    test("a wasm trap (abort) becomes an Exception reply and later commands still get replies", async ({ page }) => {
        test.setTimeout(120_000);
        const moorhen = await startAndGetInstance(page);

        // In this build abort() compiles to a wasm `unreachable` trap, which reaches JS
        // as a RuntimeError rather than a C++ exception.
        const aborted = await runCootCommand(moorhen.page, "debug_abort");
        expect(aborted.status).toBe("Exception");
        expect(aborted.consoleMessage).toContain("debug_abort");
        expect(aborted.consoleMessage).toContain("unreachable");
        expect(aborted.pendingAfter).toBe(0);

        // A trap does not take the module down: the next command is answered normally.
        const next = await runCootCommand(moorhen.page, "get_number_of_molecules");
        expect(next.status).toBe("Completed");
        expect(next.pendingAfter).toBe(0);
    });

    // Messages handled in the worker outside doCootCommand. Before the worker-wide guard,
    // each of these threw with no reply, so its promise hung and its message stayed pending.
    const failingMessages = [
        { name: "get_mtz_data", kwargs: { message: "get_mtz_data", fileName: "/does/not/exist.mtz", molNo: -1 } },
        { name: "get_map", kwargs: { message: "get_map", molNo: 999 } },
        { name: "delete_file_name", kwargs: { message: "delete_file_name", fileName: "/does/not/exist.txt" } },
    ];

    for (const { name, kwargs } of failingMessages) {
        test(`a failing ${name} message still gets a reply`, async ({ page }) => {
            test.setTimeout(120_000);
            const moorhen = await startAndGetInstance(page);

            const outcome = await moorhen.page.evaluate(
                async ({ targetId, kwargs }) => {
                    const host = document.getElementById(targetId) as unknown as { getMoorhenInstance: () => Promise<{ commandCentre: any }> };
                    const commandCentre = (await host.getMoorhenInstance()).commandCentre;
                    const reply = await Promise.race([
                        commandCentre.postMessage(kwargs),
                        new Promise((_, reject) => setTimeout(() => reject(new Error(`No reply to ${kwargs.message} within 10s`)), 10_000)),
                    ]);
                    return { status: reply.data.result?.status, consoleMessage: reply.data.consoleMessage, pendingAfter: commandCentre.activeMessages.length };
                },
                { targetId: "moorhen-test", kwargs }
            );

            expect(outcome.status).toBe("Exception");
            expect(outcome.consoleMessage).toContain(name);
            expect(outcome.pendingAfter).toBe(0);
        });
    }
});
