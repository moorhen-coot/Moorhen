/**
 * Long main-thread loops in slices, so that the view keeps drawing and taking input while they run.
 *
 * A loop that may take long is written once, as a generator that yields every so often (every
 * SLICE_ITEMS items, a few milliseconds' work): `runNow` drains it at once, as a plain function
 * would run; `runSliced` drains it a slice at a time, giving the browser a turn whenever a slice
 * has run `budget` milliseconds. The arithmetic is the same either way, so is the result.
 *
 * What a smooth surface of a million vertices is coloured and made pickable with, after the GPU or
 * the C++ has made it: hundreds of milliseconds of work on a large structure, which in one go
 * froze the view.
 */

/** How many items a sliced loop does between yields (a power of two: `(i & SLICE_MASK) === 0`). */
export const SLICE_ITEMS = 1 << 16;
export const SLICE_MASK = SLICE_ITEMS - 1;

/** A computation in slices: yields between them, returns its result. */
export type Sliced<T> = Generator<void, T, void>;

/** Gives the browser a turn - a new task, so input and drawing can come first - then carries on. */
export function yieldToBrowser(): Promise<void> {
    const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (scheduler?.yield) return scheduler.yield();
    if (typeof MessageChannel === "undefined") return new Promise(resolve => setTimeout(resolve, 0));
    return new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
            channel.port1.close();
            resolve();
        };
        channel.port2.postMessage(null);
    });
}

/** Runs a sliced computation to the end, without yielding. */
export function runNow<T>(steps: Sliced<T>): T {
    for (;;) {
        const step = steps.next();
        if (step.done) return step.value;
    }
}

/**
 * Runs a sliced computation, giving the browser a turn whenever it has run `budget` milliseconds
 * since the last one (so a short computation runs straight through).
 */
export async function runSliced<T>(steps: Sliced<T>, budget = 10): Promise<T> {
    let start = performance.now();
    for (;;) {
        const step = steps.next();
        if (step.done) return step.value;
        if (performance.now() - start > budget) {
            await yieldToBrowser();
            start = performance.now();
        }
    }
}
