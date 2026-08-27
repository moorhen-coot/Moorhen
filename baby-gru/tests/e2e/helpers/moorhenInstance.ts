import { expect, type JSHandle, type Page } from "@playwright/test";
import type { MoorhenInstance } from "@/InstanceManager";
import type { WebGLCanvasStats, WebGLSettleOptions } from "./types";
import { getWebGLCanvasStats } from "./webglCanvas";

// ============================================================================
// Remote proxy over the live MoorhenInstance.
//
// `getInstance()` returns a thenable + callable + async-iterable Proxy that
// forwards property access and method calls across the Playwright browser
// boundary back to the real MoorhenInstance, so tests can drive the
// application API directly:
//
//   const mi = await moorhen.getInstance();
//   await mi.getMoleculeList()[0].getNumberOfAtoms();      // method chain
//   await mol.molNo;                                       // property read
//   for await (const mol of mi.getMoleculeList()) { ... }  // iteration
//   const loaded = await mi.files.loadFiles([...]);        // JSON result
//
// Rules of thumb:
//   - Method calls and property reads are evaluated lazily in the browser;
//     `await` a proxy to obtain its value.
//   - `await <proxy>` JSON-serializes the value at that point. Prefer leaf
//     reads (`await mol.molNo`) over serializing rich objects (molecules hold
//     circular references and are not JSON-serializable).
//   - Iteration is async only: `for await (...)`.
//   - Optional chaining is honoured: `list[0]?.method()` evaluates to `undefined`
//     when `list[0]` is missing instead of throwing.
// ============================================================================

type RemoteStep =
    | { kind: "get"; key: string }
    | { kind: "call"; args: unknown[] };

// A lazy reference into the live instance: a handle plus a chain of steps that
// are evaluated in the browser only when the proxy is awaited/called/iterated.
type RemoteRef = {
    handle: JSHandle<unknown>;
    steps: RemoteStep[];
};

// A remote value is callable (methods) and supports chained property access.
type RemoteProxy = {
    [key: string]: unknown;
} & ((...args: unknown[]) => RemoteProxy);

// Evaluate a chain of get/call steps against a handle inside the browser,
// preserving `this` for method calls, and return a handle to the result.
async function evaluateSteps(handle: JSHandle<unknown>, steps: RemoteStep[]): Promise<JSHandle<unknown>> {
    // Functions cannot cross the Playwright serialization boundary, so encode
    // any function found in a call step's args as a marker; the page side
    // revives it via `new Function(...)` before invoking the method.
    const serializeForRemote = (value: unknown): unknown => {
        if (typeof value === "function") {
            return { __remoteFn: value.toString() };
        }
        if (Array.isArray(value)) {
            return value.map(serializeForRemote);
        }
        if (value !== null && typeof value === "object") {
            return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, serializeForRemote(val)]));
        }
        return value;
    };
    const serializedSteps: RemoteStep[] = steps.map(step =>
        step.kind === "call" ? { kind: "call", args: step.args.map(serializeForRemote) } : step
    );

    return (await handle.evaluateHandle(
        (initialValue, stepsList) => {
            const reviveArg = (value: unknown): unknown => {
                if (value !== null && typeof value === "object") {
                    const marker = value as { __remoteFn?: unknown };
                    if (typeof marker.__remoteFn === "string") {
                        // eslint-disable-next-line no-new-func
                        return new Function(`return (${marker.__remoteFn})`)();
                    }
                    if (Array.isArray(value)) {
                        return value.map(reviveArg);
                    }
                    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, reviveArg(val)]));
                }
                return value;
            };

            let owner: unknown = initialValue;
            let target: unknown = initialValue;
            for (const step of stepsList) {
                if (step.kind === "get") {
                    owner = target;
                    target = (target as Record<string, unknown>)?.[step.key];
                } else {
                    if (typeof target !== "function") {
                        // Optional-chaining friendly: a call through a missing
                        // intermediate (e.g. `list[0]?.getNumberOfAtoms()` while
                        // the list is still loading) evaluates to `undefined`
                        // instead of throwing, so `expect.poll` keeps retrying.
                        return undefined;
                    }
                    const args = step.args.map(reviveArg);
                    target = (target as (...args: unknown[]) => unknown).apply(owner, args);
                }
            }
            return target;
        },
        serializedSteps
    )) as JSHandle<unknown>;
}

function describeSteps(steps: RemoteStep[]): string {
    if (steps.length === 0) {
        return "<instance>";
    }
    return steps.map(step => (step.kind === "get" ? `.${step.key}` : "()")).join("");
}

function createRemoteProxy(page: Page, ref: RemoteRef, options?: { nonThenable?: boolean }): RemoteProxy {
    const proxy = new Proxy(function () {} as RemoteProxy, {
        get: (_target, prop) => {
            // Thenable: `await <proxy>` resolves to the JSON-serialized value at
            // the current path (leaf reads and method results). Non-thenable
            // proxies (returned when awaiting a rich object) pass straight
            // through `await` so `const mi = await getInstance()` works.
            if (prop === "then") {
                if (options?.nonThenable) {
                    return undefined;
                }
                return (resolve: (value: unknown) => void, reject: (error: unknown) => void) => {
                    (async () => {
                        const valueHandle = await evaluateSteps(ref.handle, ref.steps);
                        try {
                            resolve(await valueHandle.jsonValue());
                        } catch {
                            // Rich object (e.g. the MoorhenInstance itself or a
                            // molecule) that cannot be JSON-serialized: resolve
                            // with a non-thenable proxy so chained calls keep
                            // working (e.g. `const mi = await getInstance()`).
                            resolve(createRemoteProxy(page, ref, { nonThenable: true }));
                        }
                    })().catch(reject);
                };
            }

            // Async iteration: `for await (const mol of mi.getMoleculeList())`.
            if (prop === Symbol.asyncIterator) {
                return () =>
                    (async function* () {
                        const arrHandle = (await evaluateSteps(ref.handle, ref.steps)) as JSHandle<unknown[]>;
                        const isArray = await arrHandle.evaluate(value => Array.isArray(value));
                        if (!isArray) {
                            throw new Error(`Value at '${describeSteps(ref.steps)}' is not an array and cannot be iterated`);
                        }
                        const length = await arrHandle.evaluate(value => value.length);
                        for (let i = 0; i < length; i++) {
                            yield createRemoteProxy(page, { handle: arrHandle, steps: [{ kind: "get", key: String(i) }] });
                        }
                    })();
            }

            if (prop === Symbol.iterator) {
                return () => {
                    throw new Error("Remote values are async-iterable only. Use 'for await (...)' instead of 'for (...)'.");
                };
            }

            if (typeof prop === "symbol") {
                return undefined;
            }

            return createRemoteProxy(page, {
                handle: ref.handle,
                steps: [...ref.steps, { kind: "get", key: String(prop) }],
            });
        },
        apply: (_target, _thisArg, args: unknown[]) => {
            // Method call: append a call step and return a proxy synchronously.
            // The underlying call only runs when the result is awaited/chained/iterated.
            return createRemoteProxy(page, {
                handle: ref.handle,
                steps: [...ref.steps, { kind: "call", args }],
            });
        },
    });
    return proxy;
}

export async function getMoorhenInstance(page: Page, elementId = "moorhen-test"): Promise<MoorhenInstance> {
    const handle = await page.evaluateHandle(async targetId => {
        const host = document.getElementById(targetId) as unknown as {
            getMoorhenInstance: () => Promise<MoorhenInstance>;
        } | null;

        if (!host?.getMoorhenInstance) {
            throw new Error(`Unable to find web component host with id '${targetId}'`);
        }

        return await host.getMoorhenInstance();
    }, elementId);

    return createRemoteProxy(page, { handle, steps: [] }) as unknown as MoorhenInstance;
}

/**
 * Wait until WebGL rendering appears to settle after async loading/animation work.
 * This avoids taking strict baselines while the scene is still changing.
 */
export async function waitForWebGLRenderSettle(page: Page, options: WebGLSettleOptions = {}): Promise<WebGLCanvasStats> {
    const {
        elementId = "moorhen-test",
        timeoutMs = 30_000,
        minSettleMs = 1_500,
        minDisplayBufferCount = 1,
    } = options;

    const startedAt = Date.now();
    let stableTicks = 0;
    let lastSignature: number | null = null;
    let lastDisplayBufferCount: number | null = null;
    let lastStats: WebGLCanvasStats | null = null;

    await expect
        .poll(
            async () => {
                const stats = await getWebGLCanvasStats(page, elementId);
                lastStats = stats;

                const elapsed = Date.now() - startedAt;
                const isDrawable =
                    stats.readPixelsSucceeded &&
                    stats.drawingBufferWidth > 0 &&
                    stats.drawingBufferHeight > 0 &&
                    stats.displayBufferCount >= minDisplayBufferCount;

                if (!isDrawable || elapsed < minSettleMs) {
                    stableTicks = 0;
                    lastSignature = stats.pixelSignature;
                    lastDisplayBufferCount = stats.displayBufferCount;
                    return false;
                }

                const sameAsPrevious =
                    lastSignature !== null &&
                    lastDisplayBufferCount !== null &&
                    stats.pixelSignature === lastSignature &&
                    stats.displayBufferCount === lastDisplayBufferCount;

                stableTicks = sameAsPrevious ? stableTicks + 1 : 0;
                lastSignature = stats.pixelSignature;
                lastDisplayBufferCount = stats.displayBufferCount;

                return stableTicks >= 2;
            },
            {
                timeout: timeoutMs,
                intervals: [300, 400, 500],
            }
        )
        .toBe(true);

    return lastStats as WebGLCanvasStats;
}
