/**
 * Fading an object in and out.
 *
 * The GL calls are not testable without a context, but the decisions around them are, and each of
 * them has a wrong answer that looks like a different bug: an object that writes depth as though
 * solid and hides what is behind it, a shadow that stays on the floor after the thing casting it
 * has gone, or a movie that fades four molecules away and keeps paying for them to the end.
 */
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
    INVISIBLE_BELOW, OPAQUE_ABOVE,
    clampFade, isFaded, isInvisible, shouldCastShadow, shouldDraw,
} from "../../src/WebGLgComponents/objectFade";
import { DisplayBuffer } from "../../src/WebGLgComponents/displayBuffer";

describe("when a fade counts as a fade", () => {
    it("leaves a solid object solid", () => {
        expect(isFaded(1)).toBe(false);
    });

    it("does not treat an interpolator's near-miss as transparency", () => {
        // A fade that arrives at 0.999999 would otherwise route the object through depth peeling
        // for the rest of the movie, paying for transparency to achieve nothing visible.
        expect(isFaded(0.999999)).toBe(false);
        expect(OPAQUE_ABOVE).toBeLessThan(1);
    });

    it("catches a fade that has visibly begun", () => {
        expect(isFaded(0.9)).toBe(true);
        expect(isFaded(0.5)).toBe(true);
    });
});

describe("when an object stops being drawn", () => {
    it("is not drawn once it has faded to nothing", () => {
        expect(shouldDraw(true, 0)).toBe(false);
        expect(shouldDraw(true, INVISIBLE_BELOW / 2)).toBe(false);
    });

    it("is still drawn while a trace of it remains", () => {
        expect(shouldDraw(true, 0.05)).toBe(true);
    });

    it("stays hidden if the user hid it, however solid the fade says it is", () => {
        // Two different questions: what the scene contains, and what the movie is showing of it.
        expect(shouldDraw(false, 1)).toBe(false);
    });
});

describe("shadows", () => {
    it("stop as soon as the object starts to fade", () => {
        // A half-vanished object casting a solid shadow is the most obvious way to make a fade
        // look wrong, and the shadow pass is expensive enough that skipping it is a gain.
        expect(shouldCastShadow(true, 1)).toBe(true);
        expect(shouldCastShadow(true, 0.9)).toBe(false);
        expect(shouldCastShadow(true, 0)).toBe(false);
    });

    it("do not happen for something hidden", () => {
        expect(shouldCastShadow(false, 1)).toBe(false);
    });

    it("do not happen for geometry that is transparent in its own right", () => {
        // An older bug than the fade. doPeel is decided once per frame before the shadow pass and
        // is true whenever anything visible is transparent, and the shadow pass skipped
        // transparent geometry only when peeling was off - so switching on a transparent
        // molecular surface put everything inside it into shadow, and the ribbons underneath
        // looked as though they had stopped casting.
        expect(shouldCastShadow(true, 1, true)).toBe(false);
    });

    it("still happen for solid geometry when something else in the scene is transparent", () => {
        // The other half of that bug: the ribbons must keep casting.
        expect(shouldCastShadow(true, 1, false)).toBe(true);
    });
});

describe("clamping what an interpolator produced", () => {
    it("keeps a sane value", () => {
        expect(clampFade(0.5)).toBe(0.5);
    });

    it("pulls an overshoot back into range", () => {
        expect(clampFade(1.2)).toBe(1);
        expect(clampFade(-0.3)).toBe(0);
    });

    it("treats nonsense as solid rather than invisible", () => {
        // Failing visible is recoverable; failing invisible looks like the object never loaded.
        expect(clampFade(NaN)).toBe(1);
        expect(clampFade(Infinity)).toBe(1);
    });
});

describe("a buffer being faded", () => {
    it("becomes transparent, so it stops writing depth as though solid", () => {
        // Without this the faded object hides whatever is behind it instead of showing it
        // through, which looks like the fade not working at all.
        const buffer = new DisplayBuffer();
        expect(buffer.transparent).toBe(false);

        buffer.setAlphaMultiplier(0.5);
        expect(buffer.transparent).toBe(true);
        expect(buffer.alphaMultiplier).toBe(0.5);
    });

    it("goes back to opaque when the fade finishes", () => {
        const buffer = new DisplayBuffer();
        buffer.setAlphaMultiplier(0.5);
        buffer.setAlphaMultiplier(1);
        expect(buffer.transparent).toBe(false);
    });

    it("does not make a genuinely transparent object opaque again", () => {
        // Its colours say what it is made of; the fade says how much of it is there. Restoring the
        // fade must not overrule the first.
        const buffer = new DisplayBuffer();
        buffer.setCustomColour([1, 0, 0, 0.4]);
        expect(buffer.transparent).toBe(true);

        buffer.setAlphaMultiplier(0.5);
        buffer.setAlphaMultiplier(1);
        expect(buffer.transparent).toBe(true);
    });

    it("starts solid", () => {
        expect(new DisplayBuffer().alphaMultiplier).toBe(1);
    });
});

/**
 * Where the fade meets the programs that read it.
 *
 * A source scan, because the thing that went wrong is a property of the wiring rather than of any
 * one frame, and no GL context will tell you about it: **a float uniform nobody has written is
 * 0.0**. The thick-lines-normal programs are built from the triangle fragment shader, so they
 * inherited `alphaMultiplier` the moment it was added there, while the draw code set it only on
 * the triangle and sphere programs. Every lit line was multiplied by zero and lit-lines maps
 * simply did not appear - mesh and surface untouched, nothing logged, nothing in the picture
 * suggesting a uniform.
 */
describe("the fade uniform's wiring", () => {
    const read = (path: string) =>
        readFileSync(join(__dirname, "../../src", path), "utf8");

    const shaders = read("WebGLgComponents/mgWebGLShaders.ts");
    const drawCore = read("WebGLgComponents/mgWebGLParts/drawCore.ts");

    it("is located only through the helper that also gives it a value", () => {
        // A bare lookup leaves the program declaring the uniform and nobody writing it, which is
        // the zero that makes geometry vanish.
        expect(shaders).not.toMatch(/\.alphaMultiplier\s*=\s*gl\.getUniformLocation\(\s*shaderProgram/);
        expect(shaders.match(/locateAlphaMultiplier\(/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    });

    it("starts at 1.0, so a program nobody writes to is solid rather than absent", () => {
        const helper = shaders.slice(shaders.indexOf("const locateAlphaMultiplier"));
        expect(helper.slice(0, 400)).toMatch(/uniform1f\([^,]*alphaMultiplier,\s*1\.0\)/);
    });

    it("is written through one helper, for every program that declares it", () => {
        // Three draw paths, one helper. Writing them out separately is how the lines program came
        // to be missed twice over: once for the fade, and once for `ShadowMap`, which the same
        // programs inherit from the same fragment shader and which is just as fatal unset.
        expect(drawCore).toMatch(
            /function setTriangleFragmentUniforms[\s\S]{0,400}uniform1i\([^)]*\.ShadowMap[\s\S]{0,200}uniform1f\([^)]*\.alphaMultiplier/);
        for (const program of ["theShader", "program", "shaderProgramThickLinesNormal"]) {
            expect(drawCore).toMatch(
                new RegExp(`setTriangleFragmentUniforms\\(self, ${program}, bufferFade\\)`));
        }
    });

    it("leaves no draw path setting these uniforms by hand", () => {
        // A hand-written write is a write that only covers the uniforms somebody remembered on
        // the day, which is the whole failure mode.
        const byHand = [...drawCore.matchAll(/uniform1[fi]\(\s*\w+\.(alphaMultiplier|ShadowMap)/g)]
            .filter(match => {
                const context = drawCore.slice(Math.max(0, match.index - 600), match.index);
                return !context.includes("function setTriangleFragmentUniforms");
            });

        expect(byHand.map(match => match[0])).toEqual([]);
    });

    it("notices if a program built from the triangle fragment shader stops being covered", () => {
        // The trap is inheritance: pair a vertex shader with `fragmentShader` and the program
        // declares the fade whether or not its draw path knows. If this list grows, the new
        // program needs a write of its own in drawCore.
        const mgWebGL = read("WebGLgComponents/mgWebGL.tsx");
        const sharers = [...mgWebGL.matchAll(
            /this\.(shaderProgram\w*)\s*=\s*init\w+\(\s*\w+,\s*fragmentShader(?:Fast)?,\s*this\.gl\s*\)/g)]
            .map(match => match[1]);

        expect(new Set(sharers)).toEqual(new Set([
            "shaderProgramClip", "shaderProgramFast",
            "shaderProgramInstancedClip", "shaderProgramInstancedFast",
            "shaderProgramThickLinesNormalClip", "shaderProgramThickLinesNormalFast",
        ]));
    });
});
