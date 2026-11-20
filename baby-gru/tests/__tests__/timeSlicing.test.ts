import { SLICE_MASK, type Sliced, runNow, runSliced } from "../../src/utils/timeSlicing";

/** A sum over `n` items, yielding every SLICE_ITEMS of them, as the sliced loops do. */
function* slicedSum(n: number): Sliced<number> {
    let sum = 0;
    for (let i = 0; i < n; i++) {
        if ((i & SLICE_MASK) === SLICE_MASK) yield;
        sum += i % 7;
    }
    return sum;
}

describe("timeSlicing", () => {
    test("run at once or in slices, the result is the same", async () => {
        const n = 300_000;
        expect(runNow(slicedSum(n))).toBe(await runSliced(slicedSum(n)));
    });

    test("in slices, the browser gets its turns while it runs", async () => {
        // A budget of 0: a turn after every slice, so a task queued before it starts runs before it ends.
        let ranBetween = false;
        setTimeout(() => { ranBetween = true; }, 0);
        let sawTurn = false;
        function* watching(): Sliced<void> {
            // However the turns are given (scheduler.yield, a message, a timer), the timer comes within a few.
            for (let k = 0; k < 1000 && !sawTurn; k++) {
                if (ranBetween) sawTurn = true;
                else yield;
            }
        }
        await runSliced(watching(), 0);
        expect(sawTurn).toBe(true);
    });

    test("a short computation runs straight through", async () => {
        let turns = 0;
        const timer = setTimeout(() => { turns++; }, 0);
        await runSliced(slicedSum(10), 1_000);
        clearTimeout(timer);
        expect(turns).toBe(0);
    });
});
