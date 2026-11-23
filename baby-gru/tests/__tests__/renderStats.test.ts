/**
 * The counters the frame-cost investigation runs on.
 *
 * Worth testing rather than eyeballing, because a measuring instrument that is quietly wrong is
 * worse than none: it would send the optimisation at the wrong thing with apparent evidence. The
 * two that matter are that the wrappers forward faithfully - a renderer that draws differently
 * while being measured tells you nothing - and that turning it off leaves the context as it was.
 */
import {
    beginGpuTimer,
    waitForGpu,
    endGpuTimer,
    instrumentGl,
    recordFrame,
    renderStats,
    renderStatsText,
    uninstrumentGl,
} from "../../src/WebGLgComponents/mgWebGLParts/renderStats";

/** Just enough of a context, with the constants the triangle arithmetic needs. */
const fakeGl = () => {
    const calls: { name: string; args: unknown[] }[] = [];
    const record = (name: string) => function (...args: unknown[]) {
        calls.push({ name, args });
        return `${name}-result`;
    };
    return {
        calls,
        gl: {
            TRIANGLES: 4,
            TRIANGLE_STRIP: 5,
            TRIANGLE_FAN: 6,
            LINES: 1,
            drawElements: record("drawElements"),
            drawArrays: record("drawArrays"),
            drawElementsInstanced: record("drawElementsInstanced"),
            drawArraysInstanced: record("drawArraysInstanced"),
            useProgram: record("useProgram"),
            uniform1i: record("uniform1i"),
            bindBuffer: record("bindBuffer"),
        } as unknown as WebGLRenderingContext,
    };
};

afterEach(() => {
    renderStats.enabled = false;
});

describe("instrumenting a context", () => {
    it("counts draw calls and leaves the call itself untouched", () => {
        const { gl, calls } = fakeGl();
        instrumentGl(gl);
        const returned = gl.drawElements(4, 300, 0, 0);

        expect(renderStats.drawCalls).toBe(1);
        // Forwarded with its arguments and its result - a wrapper that swallowed either would
        // change what is being measured.
        expect(calls).toEqual([{ name: "drawElements", args: [4, 300, 0, 0] }]);
        expect(returned).toBe("drawElements-result");
    });

    it("counts state calls separately from draws", () => {
        const { gl } = fakeGl();
        instrumentGl(gl);
        gl.useProgram(null);
        gl.uniform1i(null, 1);
        gl.bindBuffer(0, null);
        gl.drawElements(4, 3, 0, 0);

        expect(renderStats.stateCalls).toBe(3);
        expect(renderStats.drawCalls).toBe(1);
    });

    it("turns an element count into triangles by mode", () => {
        const { gl } = fakeGl();
        instrumentGl(gl);
        gl.drawElements(4, 300, 0, 0);          // TRIANGLES: 100
        gl.drawElements(5, 12, 0, 0);           // TRIANGLE_STRIP: 10
        gl.drawElements(1, 100, 0, 0);          // LINES: none
        expect(renderStats.triangles).toBe(110);
    });

    it("multiplies by the instance count for an instanced draw", () => {
        // The instanced paths are where a small mesh becomes a large triangle count, so getting
        // this wrong would understate exactly the case worth knowing about.
        const { gl } = fakeGl();
        instrumentGl(gl);
        gl.drawElementsInstanced(4, 300, 0, 0, 50);
        expect(renderStats.triangles).toBe(100 * 50);
    });

    it("reads the count from the right argument for drawArrays", () => {
        // drawArrays(mode, first, count) puts the count third, where drawElements puts it second.
        const { gl } = fakeGl();
        instrumentGl(gl);
        gl.drawArrays(4, 0, 300);
        expect(renderStats.triangles).toBe(100);
    });

    it("does not double-count when instrumented twice", () => {
        const { gl } = fakeGl();
        instrumentGl(gl);
        instrumentGl(gl);
        gl.drawElements(4, 3, 0, 0);
        expect(renderStats.drawCalls).toBe(1);
    });

    it("restores an inherited method by removing the wrapper, not by copying it", () => {
        // A real WebGL context keeps its methods on WebGL2RenderingContext.prototype. Assigning
        // the original back would leave an own-property shadowing the prototype for ever, which
        // is not the same context it started as.
        class FakeContext {
            TRIANGLES = 4;
            drawElements(..._args: unknown[]) { return "proto"; }
            useProgram(..._args: unknown[]) { return "proto"; }
        }
        const gl = new FakeContext() as unknown as WebGLRenderingContext;

        instrumentGl(gl);
        expect(Object.prototype.hasOwnProperty.call(gl, "drawElements")).toBe(true);

        uninstrumentGl(gl);
        expect(Object.prototype.hasOwnProperty.call(gl, "drawElements")).toBe(false);
        expect(gl.drawElements(4, 3, 0, 0)).toBe("proto");
    });

    it("puts the context back exactly as it was", () => {
        // The wrappers are own-properties shadowing the prototype's methods, so removing them has
        // to restore the originals rather than leave an undefined behind.
        const { gl, calls } = fakeGl();
        const before = gl.drawElements;
        instrumentGl(gl);
        expect(gl.drawElements).not.toBe(before);

        uninstrumentGl(gl);
        gl.drawElements(4, 3, 0, 0);
        expect(renderStats.drawCalls).toBe(0);
        expect(calls).toHaveLength(1);
    });
});

describe("reporting", () => {
    it("averages over the frames since the last report, then zeroes", () => {
        const { gl } = fakeGl();
        instrumentGl(gl);

        for (let frame = 0; frame < 2; frame++) {
            gl.useProgram(null);
            gl.useProgram(null);
            gl.drawElements(4, 300, 0, 0);
            recordFrame(10);
        }

        const text = renderStatsText();
        expect(text).toContain("10.00 ms");    // per frame, not the total of 20
        expect(text).toContain("1 draws");
        expect(text).toContain("2 state");
        expect(text).toContain("(2/draw)");

        // Zeroed by the read, so the next report is the next interval and not the whole session.
        expect(renderStats.drawCalls).toBe(0);
        expect(renderStats.frames).toBe(0);
    });

    it("says nothing at all when not instrumented", () => {
        expect(renderStatsText()).toBe("");
    });
});

/**
 * GPU timing, which is the only thing that separates "the GPU is busy" from "the main thread is
 * busy elsewhere" - a cheap drawScene and an expensive frame look identical otherwise, because a
 * WebGL call returns when the command is queued rather than when it is done.
 */
describe("GPU timer queries", () => {
    /**
     * A context whose queries can be completed on demand.
     *
     * The real thing makes a result available a frame or two after the query was issued, which is
     * the whole reason the collection is deferred - so the fake has to be able to represent
     * "issued but not finished" as a distinct state.
     */
    const timerGl = (options: { extension?: boolean; disjoint?: boolean } = {}) => {
        const issued: object[] = [];
        const finished = new Map<object, number>();
        const deleted: object[] = [];
        const gl = {
            QUERY_RESULT_AVAILABLE: 1,
            QUERY_RESULT: 2,
            getExtension: (name: string) =>
                options.extension === false || name !== "EXT_disjoint_timer_query_webgl2"
                    ? null
                    : { TIME_ELAPSED_EXT: 100, GPU_DISJOINT_EXT: 101 },
            getParameter: () => !!options.disjoint,
            createQuery: () => { const q = {}; issued.push(q); return q; },
            deleteQuery: (q: object) => deleted.push(q),
            beginQuery: () => undefined,
            endQuery: () => undefined,
            getQueryParameter: (q: object, which: number) =>
                which === 1 ? finished.has(q) : (finished.get(q) ?? 0),
        };
        return {
            gl: gl as unknown as WebGL2RenderingContext,
            deleted,
            /** Let every query issued so far come back with `ns` nanoseconds. */
            completeAll: (ns: number) => issued.forEach(q => finished.set(q, ns)),
        };
    };

    it("reports nothing for a query that has not finished yet", () => {
        // The GPU is still working on it. Reporting zero here would read as "the GPU is free",
        // which is the opposite of what an unfinished query means.
        const { gl } = timerGl();
        instrumentGl(gl);
        beginGpuTimer(gl);
        endGpuTimer(gl);
        expect(renderStats.gpuFrames).toBe(0);
    });

    it("reports the average once queries complete", () => {
        const { gl, completeAll } = timerGl();
        instrumentGl(gl);

        beginGpuTimer(gl);
        endGpuTimer(gl);
        completeAll(4_000_000);          // 4 ms, available from the next frame on

        // Starting the next frame is what harvests it.
        beginGpuTimer(gl);
        endGpuTimer(gl);

        expect(renderStats.gpuFrames).toBe(1);
        recordFrame(1);
        expect(renderStatsText()).toContain("gpu 4.00 ms");
    });

    it("discards a disjoint result rather than reporting a wrong one", () => {
        // The driver says its clock was interrupted. A number from that would be worse than
        // none, since the whole purpose is deciding where the time goes.
        const { gl } = timerGl({ disjoint: true });
        instrumentGl(gl);
        beginGpuTimer(gl);
        endGpuTimer(gl);
        const anyGl = gl as unknown as { getQueryParameter: (q: object, w: number) => unknown };
        anyGl.getQueryParameter = (_q: object, which: number) => (which === 1 ? true : 9_000_000);
        beginGpuTimer(gl);
        endGpuTimer(gl);

        expect(renderStats.gpuFrames).toBe(0);
        expect(renderStats.gpuDisjointFrames).toBe(1);
        recordFrame(1);
        // Named, not silent. A discarded result and a missing extension both leave no timing, and
        // telling them apart is the difference between "try another browser" and "the clock is
        // unusable here" - the first version of this said nothing and cost an experiment.
        expect(renderStatsText()).toContain("disjoint");
    });

    it("says the extension is missing rather than going quiet", () => {
        const { gl } = timerGl({ extension: false });
        instrumentGl(gl);
        beginGpuTimer(gl);
        endGpuTimer(gl);
        recordFrame(1);
        expect(renderStatsText()).toContain("no extension");
    });

    it("says so when queries were issued but none have come back", () => {
        // Distinct from a missing extension and from a disjoint clock. All three used to be the
        // same silence, which meant an experiment each time to work out which was meant.
        const { gl } = timerGl();
        instrumentGl(gl);
        beginGpuTimer(gl);
        endGpuTimer(gl);
        recordFrame(1);
        expect(renderStatsText()).toContain("1 issued, none back");
    });

    it("says so when the timer was never started", () => {
        const { gl } = timerGl();
        instrumentGl(gl);
        recordFrame(1);
        expect(renderStatsText()).toContain("not started");
    });

    it("hands the queries back when uninstrumented", () => {
        // A WebGLQuery is a GPU object; dropping the handle does not free it.
        const { gl, deleted } = timerGl();
        instrumentGl(gl);
        beginGpuTimer(gl);
        endGpuTimer(gl);
        uninstrumentGl(gl);
        expect(deleted.length).toBeGreaterThan(0);
    });
});

/**
 * Firefox does not expose EXT_disjoint_timer_query_webgl2 - it was withdrawn over timing-attack
 * concerns - so on the browser where the problem is worst there is no way to ask the GPU how long
 * it took. Waiting for it and timing the wait asks a different question that answers the same
 * thing, at the cost of serialising the CPU against the GPU while it is on.
 */
describe("waiting for the GPU", () => {
    const syncGl = (options: { fences?: boolean } = {}) => {
        const calls: string[] = [];
        let polls = 0;
        const gl = {
            SYNC_GPU_COMMANDS_COMPLETE: 1,
            SYNC_FLUSH_COMMANDS_BIT: 2,
            TIMEOUT_EXPIRED: 3,
            ALREADY_SIGNALED: 4,
            fenceSync: options.fences === false ? undefined : () => { calls.push("fenceSync"); return {}; },
            // Expires twice, then reports done - the shape of a real wait.
            clientWaitSync: () => { polls++; return polls > 2 ? 4 : 3; },
            deleteSync: () => calls.push("deleteSync"),
            finish: () => calls.push("finish"),
        };
        return { gl: gl as unknown as WebGL2RenderingContext, calls };
    };

    afterEach(() => { renderStats.syncGpu = false; });

    it("does nothing unless asked, however much else is switched on", () => {
        // It is costly, so it must never happen as a side effect of merely counting.
        const { gl, calls } = syncGl();
        instrumentGl(gl as unknown as WebGLRenderingContext);
        waitForGpu(gl);
        expect(calls).toEqual([]);
        expect(renderStats.gpuWaitFrames).toBe(0);
    });

    it("blocks in the driver rather than polling", () => {
        // The first version waited on a fence, which on the main thread can only be polled with a
        // zero timeout. Hammering clientWaitSync costs real time per call and can hold the driver
        // up, so it reported 125 ms of GPU wait on a frame that takes 28 ms without it - it was
        // measuring its own loop. One blocking call measures the GPU.
        const { gl, calls } = syncGl();
        instrumentGl(gl as unknown as WebGLRenderingContext);
        renderStats.syncGpu = true;
        waitForGpu(gl);

        expect(calls).toEqual(["finish"]);
        expect(calls).not.toContain("fenceSync");
        expect(renderStats.gpuWaitFrames).toBe(1);
    });

    it("reports the wait as its own figure", () => {
        const { gl } = syncGl();
        instrumentGl(gl as unknown as WebGLRenderingContext);
        renderStats.syncGpu = true;
        waitForGpu(gl);
        recordFrame(1);
        expect(renderStatsText()).toContain("gpu wait");
    });
});

describe("reporting an interval with no frames", () => {
    it("says so rather than printing zeroes that look like a measurement", () => {
        // Seen for real: a stats line reading "0 draws | 0k tris | 0 state" while the scene was
        // plainly being drawn. Nothing had been recorded in that second, and dividing by one
        // turned an absence into a row of convincing zeroes.
        const { gl } = fakeGl();
        instrumentGl(gl as unknown as WebGLRenderingContext);
        try {
            expect(renderStatsText()).toBe("no frames drawn in the last interval");
            expect(renderStatsText()).not.toMatch(/0 draws/);
        } finally {
            uninstrumentGl(gl as unknown as WebGLRenderingContext);
        }
    });

    it("reports normally again once a frame arrives", () => {
        const { gl } = fakeGl();
        instrumentGl(gl as unknown as WebGLRenderingContext);
        try {
            renderStatsText();
            recordFrame(5.0);
            gl.drawElements(gl.TRIANGLES, 300, 0, 0);
            const text = renderStatsText();
            expect(text).toMatch(/1 draws/);
            expect(text).toMatch(/draw 5\.00 ms/);
        } finally {
            uninstrumentGl(gl as unknown as WebGLRenderingContext);
        }
    });
});
