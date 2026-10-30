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

/**
 * THE SECOND LEAK, SAME SHAPE
 *
 * Texture unit bindings are global and sticky too, and the shadow map is bound to its own unit
 * during the lit pass so the shaders can read it. Nothing unbinds it, so the next frame's shadow
 * pass begins with the shadow depth texture still bound - while rendering *into* that very
 * texture. Sampling the framebuffer you are drawing to is a feedback loop, and the driver drops
 * the draw:
 *
 *     GL_INVALID_OPERATION: glDrawElements: Feedback loop formed between Framebuffer and
 *     active Texture.
 *
 * It only bites a program that actually declares the shadow sampler while being drawn in the
 * shadow pass. The triangle and instanced programs swap to their shadow variants there, which
 * declare no such uniform - but the thick-lines-normal program has no shadow variant, so it is
 * drawn as-is, with `ShadowMap` live and pointing at the unit holding the texture being written.
 * Lit lines therefore vanished, and every frame filled the console.
 *
 * Detaching it here rather than at the end of the lit pass is the same argument as the depth
 * state: the pass that renders into the texture is the one with a stake in nothing else being
 * able to read it, and it is one place rather than every place that might have bound it.
 */

/** The subset of a WebGL context this needs - so it can be checked without one. */
export interface DepthStateContext {
    readonly DEPTH_TEST: number;
    readonly LESS: number;
    readonly TEXTURE0: number;
    readonly TEXTURE_2D: number;
    enable(cap: number): void;
    depthFunc(func: number): void;
    depthMask(flag: boolean): void;
    activeTexture(unit: number): void;
    bindTexture(target: number, texture: WebGLTexture | null): void;
}

/**
 * Put the context into the state a depth-only render requires: the test on, nearer fragments
 * winning, writes enabled, and the depth texture about to be written detached from the unit the
 * shaders read it through.
 *
 * @param shadowTextureUnit the unit the shadow map is sampled from during the lit pass. Required
 *     rather than defaulted: a wrong or forgotten unit here is a feedback loop, and a feedback
 *     loop does not look like a texture problem from the outside.
 */
export const beginDepthOnlyPass = (gl: DepthStateContext, shadowTextureUnit: number): void => {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.activeTexture(gl.TEXTURE0 + shadowTextureUnit);
    gl.bindTexture(gl.TEXTURE_2D, null);
};
