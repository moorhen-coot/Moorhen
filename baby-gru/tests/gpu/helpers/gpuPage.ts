/**
 * The Node side of the GPU tests: bundle a case module (tests/gpu/cases) with esbuild, serve it to
 * a blank page, run it, and hand back what it returned.
 *
 * Nothing listens on the page's origin: Playwright answers every request itself (page.route). The
 * origin is localhost because WebGPU needs a secure context. Files in tests/gpu/data are served
 * under /data/, for cases that fetch reference data.
 */
import { build } from "esbuild";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { test } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { CaseOutcome } from "./browserCase";

const ORIGIN = "http://localhost:4319";
const CASES = resolve(__dirname, "../cases");
const DATA = resolve(__dirname, "../data");

const bundles = new Map<string, Promise<string>>();

/** The case bundled for the browser, once per test run. */
function bundle(caseName: string): Promise<string> {
    let made = bundles.get(caseName);
    if (!made) {
        made = build({
            entryPoints: [join(CASES, caseName)],
            bundle: true,
            format: "iife",
            globalName: "__gpuCase",
            target: "es2022",
            sourcemap: "inline",
            write: false,
            logLevel: "silent",
        }).then(result => result.outputFiles[0].text);
        bundles.set(caseName, made);
    }
    return made;
}

/**
 * Run `caseName` (a file in tests/gpu/cases whose default export is made with defineCase) in
 * `page` with `args`, and return its outcome: `unavailable` says why there is no WebGPU here (the
 * test should skip), otherwise `result` and any uncaptured WebGPU errors.
 *
 * Console errors from the page are collected into `consoleErrors`.
 */
export async function runGpuCase<T>(page: Page, caseName: string, args: unknown = null): Promise<CaseOutcome<T> & { consoleErrors: string[] }> {
    const script = await bundle(caseName);
    const consoleErrors: string[] = [];
    page.on("console", message => {
        if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", error => consoleErrors.push(String(error)));
    await page.route(`${ORIGIN}/**`, async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/") {
            return route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body><script src=\"/case.js\"></script></body></html>" });
        }
        if (path === "/case.js") return route.fulfill({ contentType: "text/javascript", body: script });
        if (path.startsWith("/data/")) {
            const file = resolve(DATA, path.slice("/data/".length));
            if (file.startsWith(DATA)) return route.fulfill({ contentType: "application/octet-stream", body: readFileSync(file) });
        }
        return route.fulfill({ status: 404, body: "" });
    });
    await page.goto(`${ORIGIN}/`);
    const outcome = await page.evaluate(
        async caseArgs => (window as unknown as { __gpuCase: { default: (a: unknown) => Promise<unknown> } }).__gpuCase.default(caseArgs),
        args,
    ) as CaseOutcome<T>;
    return { ...outcome, consoleErrors };
}

/**
 * For specs: skip the test (with the reason) where there is no WebGPU, otherwise check that WebGPU
 * reported no errors and return the case's result.
 */
export function resultOrSkip<T>(outcome: CaseOutcome<T>): T {
    test.skip(!!outcome.unavailable, `No WebGPU here: ${outcome.unavailable}`);
    if (outcome.gpuErrors.length) throw new Error(`WebGPU errors:\n${outcome.gpuErrors.join("\n")}`);
    return outcome.result;
}
