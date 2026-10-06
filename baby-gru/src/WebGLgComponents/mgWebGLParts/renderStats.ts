/**
 * Counting what a frame actually costs, so that optimisation is aimed at a number.
 *
 * This exists because three plausible explanations for a slow frame - fill rate, per-draw call
 * overhead, and vertex processing - look identical from outside the renderer, and a fourth
 * possibility is that the time is not in the renderer at all. Measuring separates them in a way
 * that resizing the window and toggling features does not.
 *
 * Off by default and installed on demand. When it is off nothing here runs at all: the GL methods
 * are untouched, so there is no per-call cost and no chance of the measurement changing what it
 * measures.
 *
 * Turning it off restores what was there before, rather than deleting the wrapper and trusting
 * the prototype to show through. That distinction matters twice: a context someone else has
 * already wrapped - a debugger such as Spector.js - would otherwise lose their wrapper instead of
 * getting mine removed, and a context whose methods are own-properties rather than inherited
 * would be left with nothing at all.
 *
 * The three numbers to read together:
 *
 *   drawScene ms against the frame interval. If drawScene is a small part of the frame then the
 *   renderer is not the problem and the time is in React, event handling or scheduling - a
 *   different investigation entirely.
 *
 *   state calls per draw. Moorhen sets around a hundred pieces of GL state per sub-buffer and uses
 *   no vertex array objects, so a high draw count means the CPU is mostly talking to the driver.
 *   That is what vertex array objects and uniform buffers would fix.
 *
 *   triangles per frame. If draws are few but triangles are many, the cost is vertex processing
 *   and the answer is level of detail rather than anything about call overhead.
 *
 * What this cannot tell you is GPU time: a WebGL call returns once the command is queued, not once
 * it is done. If the four numbers look small and do not add up to the frame interval, that is the
 * answer - the GPU is the bottleneck - and EXT_disjoint_timer_query_webgl2 is the next instrument.
 */

/** GL methods counted as "state", being the ones the draw loop repeats per sub-buffer. */
const STATE_METHODS = [
    "useProgram", "bindBuffer", "bindTexture", "activeTexture", "bindFramebuffer",
    "vertexAttribPointer", "enableVertexAttribArray", "disableVertexAttribArray",
    "vertexAttribDivisor", "vertexAttrib4f",
    "uniform1i", "uniform1ui", "uniform1f", "uniform2f", "uniform2fv", "uniform3f",
    "uniform3fv", "uniform4f", "uniform4fv", "uniformMatrix3fv", "uniformMatrix4fv",
];

const DRAW_METHODS = ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"];

export const renderStats = {
    enabled: false,
    /** Accumulated since the last report, then zeroed. */
    frames: 0,
    drawCalls: 0,
    triangles: 0,
    stateCalls: 0,
    drawSceneMs: 0,
    /** Nanoseconds the GPU spent, and how many frames that covers. */
    gpuNs: 0,
    gpuFrames: 0,
    /** Whether to block until the GPU finishes each frame, and what that cost. */
    syncGpu: false,
    gpuWaitMs: 0,
    gpuWaitFrames: 0,
    /**
     * Results the driver marked disjoint and which were therefore thrown away.
     *
     * Counted rather than silently dropped. Without this, "the extension is missing" and "the
     * extension works but every result is unusable" both show up as no GPU figure at all, which
     * is how an afternoon gets spent on the wrong question.
     */
    gpuDisjointFrames: 0,
};

/**
 * Real GPU time, which the CPU-side numbers above cannot give.
 *
 * drawScene returns once its commands are queued, so a cheap drawScene and an expensive frame are
 * exactly what a GPU bottleneck looks like - the CPU hands over the work in milliseconds and then
 * waits. Distinguishing that from the main thread being busy elsewhere is the whole question, and
 * a timer query is the only thing inside WebGL that answers it.
 *
 * The result of a query is not available in the frame that issued it - the GPU is still working
 * on it - so they are collected a frame or two later from a small pool. A query the driver marks
 * disjoint is discarded rather than reported: the clock was interrupted, and a wrong number here
 * would be worse than none, since the entire point is to decide where the time goes.
 */
let timerExt: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null = null;
let timerChecked = false;
/** How many queries have been issued but not yet come back. */
let queriesIssued = 0;
const freeQueries: WebGLQuery[] = [];
const pendingQueries: WebGLQuery[] = [];
let activeQuery: WebGLQuery | null = null;

type Gl2 = WebGL2RenderingContext;

/** Harvest whatever the GPU has finished since last time. */
const collectGpuTimes = (gl: Gl2) => {
    if (!timerExt) return;
    const disjoint = gl.getParameter(timerExt.GPU_DISJOINT_EXT);
    for (let i = pendingQueries.length - 1; i >= 0; i--) {
        const query = pendingQueries[i];
        if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) continue;
        pendingQueries.splice(i, 1);
        if (disjoint) {
            renderStats.gpuDisjointFrames++;
        } else {
            renderStats.gpuNs += gl.getQueryParameter(query, gl.QUERY_RESULT);
            renderStats.gpuFrames++;
        }
        freeQueries.push(query);
    }
};

export const beginGpuTimer = (gl: Gl2) => {
    if (!renderStats.enabled || activeQuery) return;
    if (!timerChecked) {
        timerChecked = true;
        timerExt = gl.getExtension?.("EXT_disjoint_timer_query_webgl2") ?? null;
        if (!timerExt) console.warn("EXT_disjoint_timer_query_webgl2 is unavailable; no GPU timings");
    }
    if (!timerExt) return;

    collectGpuTimes(gl);
    const query = freeQueries.pop() ?? gl.createQuery();
    if (!query) return;
    gl.beginQuery(timerExt.TIME_ELAPSED_EXT, query);
    activeQuery = query;
    queriesIssued++;
};

export const endGpuTimer = (gl: Gl2) => {
    if (!timerExt || !activeQuery) return;
    gl.endQuery(timerExt.TIME_ELAPSED_EXT);
    pendingQueries.push(activeQuery);
    activeQuery = null;
};

/**
 * Wait for the GPU to finish, and report how long that took.
 *
 * For Firefox, which does not expose EXT_disjoint_timer_query_webgl2 - it was withdrawn over
 * timing-attack concerns - leaving no way to ask the GPU how long it took. This asks a different
 * question that gets at the same thing: having submitted the frame, how long before it is done?
 *
 * Read it against drawScene and the frame interval. A long wait means the GPU is the bottleneck
 * and the main thread was idle waiting for it. A short wait means the GPU finished promptly and
 * the rest of the frame went somewhere else entirely.
 *
 * Deliberately a separate switch, because it is not free: it serialises the CPU against the GPU
 * and destroys any overlap between them, so the frame rate while it is on is worse than the real
 * one. It is a diagnostic for one question, not a mode to leave running.
 *
 * finish() rather than a fence, which was the first attempt and was worse than useless. A fence
 * on the main thread can only be waited on with a zero timeout, so the only way to wait is to ask
 * again and again - and hammering clientWaitSync costs real time per call and can keep the driver
 * from making progress. The first reading that way was 125 ms of "GPU wait" on a frame that takes
 * 28 ms without the sync, which is impossible: it was measuring the polling loop. finish() blocks
 * in the driver instead, which is one call and no spinning.
 */
export const waitForGpu = (gl: Gl2): void => {
    if (!renderStats.enabled || !renderStats.syncGpu) return;

    const start = performance.now();
    gl.finish();
    renderStats.gpuWaitMs += performance.now() - start;
    renderStats.gpuWaitFrames++;
};

/**
 * What was on the context before it was wrapped, so it can be put back.
 *
 * `undefined` records that the method was inherited rather than an own property, which is the
 * normal case for a real WebGL context - restoring it means removing the wrapper, not assigning
 * a copy that would shadow the prototype for ever.
 */
const originals = new Map<string, { value: unknown; own: boolean }>();

/** Triangles a draw call produces, from its mode and count. */
const trianglesFor = (gl: WebGLRenderingContext, mode: number, count: number, instances = 1) => {
    if (mode === gl.TRIANGLES) return (count / 3) * instances;
    if (mode === gl.TRIANGLE_STRIP || mode === gl.TRIANGLE_FAN) return Math.max(0, count - 2) * instances;
    return 0;
};

/**
 * Wrap the counted methods on one context.
 *
 * Idempotent: a second call does nothing, so this cannot end up counting each call twice through
 * a stack of wrappers.
 */
export const instrumentGl = (gl: WebGLRenderingContext) => {
    if (renderStats.enabled) return;

    const remember = (name: string) => {
        originals.set(name, {
            value: (gl as unknown as Record<string, unknown>)[name],
            own: Object.prototype.hasOwnProperty.call(gl, name),
        });
    };

    for (const name of STATE_METHODS) {
        const original = (gl as unknown as Record<string, unknown>)[name];
        if (typeof original !== "function") continue;
        remember(name);
        (gl as unknown as Record<string, unknown>)[name] = function (...args: unknown[]) {
            renderStats.stateCalls++;
            return (original as (...a: unknown[]) => unknown).apply(gl, args);
        };
    }

    for (const name of DRAW_METHODS) {
        const original = (gl as unknown as Record<string, unknown>)[name];
        if (typeof original !== "function") continue;
        remember(name);
        (gl as unknown as Record<string, unknown>)[name] = function (...args: unknown[]) {
            renderStats.drawCalls++;
            const mode = args[0] as number;
            // drawElements(mode, count, ...) and drawArrays(mode, first, count) differ in which
            // argument is the count, and the instanced forms carry the instance count last.
            const count = name.startsWith("drawArrays") ? (args[2] as number) : (args[1] as number);
            const instances = name.endsWith("Instanced") ? (args[name === "drawArraysInstanced" ? 3 : 4] as number) : 1;
            renderStats.triangles += trianglesFor(gl, mode, count ?? 0, instances ?? 1);
            return (original as (...a: unknown[]) => unknown).apply(gl, args);
        };
    }

    // Start from an empty pool. A WebGLQuery belongs to the context that created it, so queries
    // left over from a previous context - the scene-sliders preview creates its own - would be
    // invalid here, and any still outstanding would be harvested as though they were this
    // context's frames. Found by a test that counted three disjoint results after one frame.
    freeQueries.length = 0;
    pendingQueries.length = 0;
    activeQuery = null;
    timerChecked = false;
    timerExt = null;
    queriesIssued = 0;

    renderStats.enabled = true;
    resetRenderStats();
};

/** Put the context back exactly as it was. */
export const uninstrumentGl = (gl: WebGLRenderingContext) => {
    if (!renderStats.enabled) return;

    // The queries are GPU objects and are not collected with their JavaScript handles.
    const gl2 = gl as WebGL2RenderingContext;
    if (gl2.deleteQuery) {
        for (const query of [...freeQueries, ...pendingQueries]) gl2.deleteQuery(query);
    }
    freeQueries.length = 0;
    pendingQueries.length = 0;
    activeQuery = null;
    timerChecked = false;
    timerExt = null;

    originals.forEach(({ value, own }, name) => {
        if (own) (gl as unknown as Record<string, unknown>)[name] = value;
        else delete (gl as unknown as Record<string, unknown>)[name];
    });
    originals.clear();
    renderStats.enabled = false;
    resetRenderStats();
};

export const resetRenderStats = () => {
    renderStats.frames = 0;
    renderStats.drawCalls = 0;
    renderStats.triangles = 0;
    renderStats.stateCalls = 0;
    renderStats.drawSceneMs = 0;
    renderStats.gpuNs = 0;
    renderStats.gpuFrames = 0;
    renderStats.gpuWaitMs = 0;
    renderStats.gpuWaitFrames = 0;
    renderStats.gpuDisjointFrames = 0;
};

/**
 * Which representation the triangles belong to.
 *
 * "1.1M triangles" is a true number with nowhere to go: the draw loop sees a flat list of
 * buffers and cannot say which of them is the ribbons and which the surface. This attributes
 * the geometry back to whatever made it, so that "too many triangles" becomes a specific
 * representation with a specific setting behind it.
 *
 * Counted from the buffers rather than hooked into the draw loop. That keeps the hot path
 * untouched and costs nothing when nobody asks, and it answers the question actually being
 * asked - how much geometry is there, and whose - rather than how many times it was drawn.
 *
 * The price is that this is a model of the draw loop, not an observation of it, and a model
 * can be wrong. Two known gaps, both reported rather than hidden:
 *
 *   Spheres (POINTS_SPHERES, SPHEROIDS) draw a shared sphere mesh once per sphere, so their
 *   triangle count lives on a buffer this function never sees. They are counted as unknown.
 *
 *   A buffer drawn more than once per frame - a shadow pass, an outline - is counted once.
 *
 * Which is why the caller is given the instrumented per-frame figure alongside it. If the two
 * agree, the model holds and the attribution can be trusted; if they do not, the difference is
 * itself the finding, and it is visible rather than silently folded into one of the rows.
 */
export interface TriangleRow {
    label: string;
    triangles: number;
    buffers: number;
    /** Sub-buffers whose triangle count cannot be determined from the buffer alone. */
    unknown: number;
}

/** Shape this needs from a display buffer. Deliberately minimal, so it is testable without one. */
export interface CountableBuffer {
    visible?: boolean;
    statsLabel?: string;
    bufferTypes?: string[];
    triangleVertexIndexBuffer?: { numItems?: number }[];
    triangleInstanceOriginBuffer?: { numItems?: number }[];
}

/** Triangles one sub-buffer contributes, or null when the buffer alone cannot say. */
const subBufferTriangles = (type: string, indices: number, instances: number): number | null => {
    switch (type) {
        case "TRIANGLES":
            return (indices / 3) * instances;
        case "TRIANGLE_STRIP":
        case "PERFECT_SPHERES":
            // PERFECT_SPHERES is an impostor: a quad per sphere, shaded into a sphere. Its
            // geometry really is this small, which is the whole point of it.
            return Math.max(0, indices - 2) * instances;
        case "POINTS_SPHERES":
        case "SPHEROIDS":
            // Real geometry, from a shared sphere buffer held on the renderer rather than here.
            return null;
        default:
            // LINES, LINE_STRIP, POINTS and anything else contribute no triangles.
            return 0;
    }
};

export const triangleBreakdown = (buffers: CountableBuffer[]): TriangleRow[] => {
    const rows = new Map<string, TriangleRow>();

    for (const buffer of buffers) {
        if (buffer.visible === false) continue;
        const label = buffer.statsLabel ?? "unlabelled";
        const row = rows.get(label) ?? { label, triangles: 0, buffers: 0, unknown: 0 };
        row.buffers++;

        const types = buffer.bufferTypes ?? [];
        const indexBuffers = buffer.triangleVertexIndexBuffer ?? [];
        const instanceBuffers = buffer.triangleInstanceOriginBuffer ?? [];

        for (let j = 0; j < indexBuffers.length; j++) {
            const instances = instanceBuffers[j]?.numItems;
            // An instanced sub-buffer draws index buffer 0 - the shared primitive - once per
            // instance, rather than its own jth index buffer. Mirrors drawCore.
            const indices = (instances ? indexBuffers[0]?.numItems : indexBuffers[j]?.numItems) ?? 0;
            const triangles = subBufferTriangles(types[j] ?? "", indices, instances ?? 1);
            if (triangles === null) row.unknown++;
            else row.triangles += triangles;
        }

        rows.set(label, row);
    }

    return [...rows.values()].sort((a, b) => b.triangles - a.triangles);
};

/**
 * The breakdown as lines of text, with the measured per-frame total to check it against.
 *
 * measuredPerFrame is the instrumented figure - renderStats.triangles over renderStats.frames -
 * or undefined when the instrument is off, in which case there is nothing to check against and
 * the report says so rather than implying agreement.
 */
export const triangleBreakdownText = (
    buffers: CountableBuffer[],
    measuredPerFrame?: number,
): string => {
    const rows = triangleBreakdown(buffers);
    const total = rows.reduce((sum, row) => sum + row.triangles, 0);
    const unknown = rows.reduce((sum, row) => sum + row.unknown, 0);
    const width = Math.max(10, ...rows.map(row => row.label.length));

    const lines = rows.map(row => {
        const share = total > 0 ? ((row.triangles / total) * 100).toFixed(1) : "0.0";
        return `  ${row.label.padEnd(width)}  ${Math.round(row.triangles).toLocaleString().padStart(11)}` +
            `  ${share.padStart(5)}%  ${String(row.buffers).padStart(4)} buffers` +
            (row.unknown > 0 ? `  (${row.unknown} sub-buffers not counted: spheres)` : "");
    });

    lines.push(`  ${"TOTAL".padEnd(width)}  ${Math.round(total).toLocaleString().padStart(11)}`);

    if (measuredPerFrame === undefined) {
        lines.push("", "  No measured figure to check against - render stats are off.");
    } else {
        const diff = measuredPerFrame - total;
        const pct = total > 0 ? Math.abs(diff / total) * 100 : 0;
        lines.push(`  ${"measured".padEnd(width)}  ${Math.round(measuredPerFrame).toLocaleString().padStart(11)}  per frame`);
        if (pct < 5) {
            lines.push("", "  Agrees with the measurement: the attribution above can be trusted.");
        } else if (diff > 0) {
            lines.push("", `  ${Math.round(diff).toLocaleString()} more drawn than exist. Either buffers are`,
                "  drawn more than once per frame, or the uncounted spheres above are the difference.");
        } else {
            lines.push("", `  ${Math.round(-diff).toLocaleString()} fewer drawn than exist, so some of this`,
                "  geometry is not reaching the screen - culled, or on an invisible buffer.");
        }
    }

    if (unknown > 0 && measuredPerFrame === undefined) {
        lines.push("  Turn render stats on to get a figure to check against.");
    }

    return lines.join("\n");
};

/**
 * Triangles per frame as measured, without zeroing the counters.
 *
 * Separate from renderStatsText, which reads and resets together. This is read out of band by
 * the breakdown, and stealing the overlay's accumulated frames to do so would make the next
 * overlay line an average over a fraction of its interval.
 */
export const measuredTrianglesPerFrame = (): number | undefined => {
    if (!renderStats.enabled || renderStats.frames === 0) return undefined;
    return renderStats.triangles / renderStats.frames;
};

/** One frame's worth, added by drawScene. */
export const recordFrame = (drawSceneMs: number) => {
    renderStats.frames++;
    renderStats.drawSceneMs += drawSceneMs;
};

/**
 * A line for the overlay, or "" when not instrumented.
 *
 * Per frame rather than per second, because the question is what one frame costs. Reading and
 * zeroing together, so the numbers are an average over the reporting interval rather than over
 * the whole session.
 */
export const renderStatsText = (): string => {
    if (!renderStats.enabled) return "";
    const frames = Math.max(1, renderStats.frames);
    const draws = renderStats.drawCalls / frames;
    // Reported only when there are completed queries, so an absent extension or a driver that
    // keeps marking the clock disjoint says nothing rather than claiming zero.
    // Every state is named rather than left as an absence. There are four reasons there might be
    // no GPU figure - the extension is missing, it exists but no query has come back, results are
    // being discarded as disjoint, or the timer was never started - and they call for completely
    // different next steps. An instrument that goes quiet in all four is one that costs an
    // experiment each time to work out which it meant.
    let gpu: string;
    if (renderStats.gpuFrames > 0) {
        gpu = ` | gpu ${(renderStats.gpuNs / renderStats.gpuFrames / 1e6).toFixed(2)} ms`;
    } else if (renderStats.gpuDisjointFrames > 0) {
        gpu = ` | gpu (${renderStats.gpuDisjointFrames} disjoint)`;
    } else if (!timerChecked) {
        gpu = " | gpu (not started)";
    } else if (!timerExt) {
        gpu = " | gpu (no extension)";
    } else {
        gpu = ` | gpu (${queriesIssued} issued, none back)`;
    }
    const wait = renderStats.gpuWaitFrames > 0
        ? ` | gpu wait ${(renderStats.gpuWaitMs / renderStats.gpuWaitFrames).toFixed(2)} ms`
        : "";
    const text =
        `draw ${(renderStats.drawSceneMs / frames).toFixed(2)} ms` + gpu + wait +
        ` | ${draws.toFixed(0)} draws` +
        ` | ${(renderStats.triangles / frames / 1000).toFixed(0)}k tris` +
        ` | ${(renderStats.stateCalls / frames).toFixed(0)} state` +
        ` (${draws > 0 ? (renderStats.stateCalls / renderStats.drawCalls).toFixed(0) : "0"}/draw)`;
    resetRenderStats();
    return text;
};
