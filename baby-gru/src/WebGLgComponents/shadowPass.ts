/**
 * The depth state a pass needs before it may render into a depth texture.
 *
 * WHY THIS EXISTS AS A FUNCTION
 *
 * GL state is global and survives the end of a frame. The shadow pass is the first thing drawScene
 * does, so whatever the *previous* frame left behind is what it starts with - and for a long time
 * it set no depth state of its own, which made it correct only by the accident of what had run
 * before it.
 *
 * THE BUG THIS FIXED
 *
 * Depth peeling composites its layers onto a fullscreen quad, which wants the depth test off, and
 * it turned the test off without turning it back on. Peeling runs whenever anything in the scene
 * is transparent. So:
 *
 *     frame N:   shadow pass, ... , drawPeel -> disable(DEPTH_TEST), frame ends
 *     frame N+1: shadow pass runs with DEPTH_TEST disabled
 *
 * and with the depth test disabled GL does not write depth at all - not "writes it unconditionally",
 * which is the easy thing to assume. The shadow depth texture therefore kept its cleared value, and
 * the shadow map came out empty. On screen that looked like transparency switching shadows off for
 * the whole scene: a solid ribbon behind a transparent surface stopped casting, which is a strange
 * enough symptom that it was blamed on the transparent object three times before anyone looked at
 * the map itself.
 *
 * drawPeel now restores the test, so the leak is gone at its source. This function is the second
 * half of the fix and the one that keeps it fixed: a pass that renders depth states its own
 * requirements rather than inheriting them. The cost is three GL calls per frame.
 */

/** The subset of a WebGL context this needs - so it can be checked without one. */
export interface DepthStateContext {
    readonly DEPTH_TEST: number;
    readonly LESS: number;
    enable(cap: number): void;
    depthFunc(func: number): void;
    depthMask(flag: boolean): void;
}

/**
 * Put the context into the state a depth-only render requires: the test on, nearer fragments
 * winning, and writes enabled.
 */
export const beginDepthOnlyPass = (gl: DepthStateContext): void => {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
};
