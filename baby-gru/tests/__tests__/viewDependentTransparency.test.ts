/**
 * The alpha curve of a transparent surface seen at an angle.
 *
 * Three things are being protected.
 *
 * That it is off unless asked for, and that off means *exactly* as before. Every transparent
 * surface in every existing scene goes through this line, so "close enough" is not good enough.
 *
 * That the shader and the TypeScript agree. They are written twice because one of them has to run
 * on the GPU, and the only thing stopping them drifting apart is a test that reads the shader
 * source and checks the arithmetic in it is still the arithmetic here.
 *
 * And that the curve is still Coot's. Matching it is a decision, not an accident - the same figure
 * made in Moorhen or in Coot at the same opacity should come out the same - so where Coot's source
 * is to hand this reads it and compares, rather than trusting a number copied out by eye.
 */
import { describe, expect, it } from "@jest/globals";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
    BULK_FALLOFF, MINIMUM_FACING, viewDependentAlpha, viewDependentTransparencySetting,
} from "../../src/WebGLgComponents/viewDependentTransparency";

describe("leaving things alone", () => {
    it("is off until something turns it on", () => {
        expect(viewDependentTransparencySetting.enabled).toBe(false);
    });

    it("leaves both extremes of opacity where they are", () => {
        // An invisible surface has nothing to absorb with; an opaque one is already opaque, and
        // an opaque surface is the common case - this must do nothing at all to it.
        for (const facing of [1, 0.5, 0.01]) {
            expect(viewDependentAlpha(0, facing)).toBe(0);
            expect(viewDependentAlpha(1, facing)).toBe(1);
        }
    });
});

describe("the shell", () => {
    it("thickens as the surface turns away", () => {
        const alphas = [1, 0.8, 0.6, 0.4, 0.2, 0.1].map(facing => viewDependentAlpha(0.5, facing));
        alphas.slice(1).forEach((alpha, i) => expect(alpha).toBeGreaterThan(alphas[i]));
    });

    it("is the same whichever way the surface faces", () => {
        // |N.V|, not N.V: a back face is as much material to look through as a front one, and the
        // depth peel keeps both.
        expect(viewDependentAlpha(0.4, -0.25)).toBeCloseTo(viewDependentAlpha(0.4, 0.25), 12);
    });

    it("approaches opaque at the silhouette", () => {
        expect(viewDependentAlpha(0.5, MINIMUM_FACING)).toBeGreaterThan(0.99);
    });

    it("keeps the bulk glassy, which is what the fifth power is for", () => {
        // Without it, 0.5 opacity would be 0.5 face-on and 0.82 at |N.V|=0.4 - too dense to see
        // into, so the rim has nothing to stand against. That was the whole complaint.
        expect(viewDependentAlpha(0.5, 1)).toBeLessThan(0.05);
        expect(viewDependentAlpha(0.5, 0.4)).toBeLessThan(0.45);
        expect(viewDependentAlpha(0.5, 0.05)).toBeGreaterThan(0.99);
    });

    it("gives the opacity slider something to do, monotonically", () => {
        // There is no second control, so this had better still respond to the first one.
        const atFortyDegrees = [0.2, 0.3, 0.4, 0.5, 0.7, 0.9]
            .map(base => viewDependentAlpha(base, 0.4));
        atFortyDegrees.slice(1).forEach((alpha, i) =>
            expect(alpha).toBeGreaterThan(atFortyDegrees[i]));
    });

    it("cannot be taken past opaque by a bad normal", () => {
        // The clamp. Without it 1/|N.V| runs away exactly where the normals are least trustworthy.
        for (const facing of [0, 1e-9, -1e-9, MINIMUM_FACING / 2]) {
            const alpha = viewDependentAlpha(0.5, facing);
            expect(alpha).toBeLessThanOrEqual(1);
            expect(alpha).toBe(viewDependentAlpha(0.5, MINIMUM_FACING));
        }
    });

    it("survives a degenerate normal", () => {
        // NaN is the one a clamp does not catch: Math.min and Math.max carry it straight through,
        // and an alpha of NaN is a fragment drawn at whatever the hardware fancies.
        for (const facing of [Number.NaN, Number.POSITIVE_INFINITY]) {
            const alpha = viewDependentAlpha(0.5, facing);
            expect(Number.isFinite(alpha)).toBe(true);
            expect(alpha).toBeGreaterThanOrEqual(0);
            expect(alpha).toBeLessThanOrEqual(1);
        }
    });
});

describe("the shader and this module", () => {
    const shaderSource = readFileSync(
        join(__dirname, "../../src/WebGLgComponents/webgl-2/triangle-fragment-shader.js"), "utf8");

    it("declares the switch the plumbing writes", () => {
        expect(shaderSource).toContain("uniform bool viewDependentTransparency;");
    });

    it("returns the opacity untouched when it is off", () => {
        expect(shaderSource).toContain("if(!viewDependentTransparency) return base;");
    });

    it("applies it to the vertex alpha, ahead of the fade", () => {
        // Order matters: a movie fading a surface out must still reach nothing however edge-on it
        // is, so the fade has to be the last word.
        const applied = shaderSource.indexOf("fragColor.a = viewDependentAlpha(");
        const faded = shaderSource.indexOf("fragColor.a *= alphaMultiplier;");
        expect(applied).toBeGreaterThan(-1);
        expect(faded).toBeGreaterThan(applied);
    });

    it("clamps the facing term to the same limit", () => {
        expect(shaderSource).toContain(
            `max(abs(dot(normalize(n), normalize(viewDir))), ${MINIMUM_FACING})`);
    });

    it("raises the shell to the same power", () => {
        // Written out rather than pow(shell, 5.0), which some drivers compute less accurately for
        // a constant integer exponent. The count has to match BULK_FALLOFF either way.
        const multiplied = "shell" + " * shell".repeat(BULK_FALLOFF - 1);
        expect(shaderSource).toContain(`return ${multiplied};`);
    });
});

describe("the WebGPU shader", () => {
    const wgsl = readFileSync(
        join(__dirname, "../../src/WebGPUComponents/previewShaders.ts"), "utf8");

    it("computes the same shell and the same power", () => {
        // Written a third time because it has to run on a third thing. The two renderers drawing
        // the same scene differently is the failure this guards, and nobody would see it unless
        // they had both open side by side.
        expect(wgsl).toContain(
            `let facing = max(abs(dot(normalize(normal), normalize(frame.eyeDir.xyz))), ${MINIMUM_FACING});`);
        expect(wgsl).toContain("let shell = 1.0 - pow(transmitted, 1.0 / facing);");
        expect(wgsl).toContain("return " + "shell" + " * shell".repeat(BULK_FALLOFF - 1) + ";");
    });

    it("guards both ends of the opacity range as the others do", () => {
        expect(wgsl).toContain("if (transmitted <= 0.0) { return 1.0; }");
        expect(wgsl).toContain("if (transmitted >= 1.0) { return 0.0; }");
    });

    it("reads its switch from the draw uniform the renderer writes", () => {
        // The two halves of one integration point: the shader reads output.y, and drawBlock puts
        // the flag in the second slot of the output vector. A mismatch here is a switch that
        // silently does nothing, or - worse - one that reads the opaque flag instead.
        expect(wgsl).toContain("if (draw.output.y < 0.5) { return base; }");
        const renderer = readFileSync(
            join(__dirname, "../../src/WebGPUComponents/previewRenderer.ts"), "utf8");
        expect(renderer).toContain(
            "out.set([opaque ? 1 : 0, viewDependentTransparency ? 1 : 0, 0, 0], offset + 32);");
    });

    it("applies it to the surfaces WebGL applies it to, and not the others", () => {
        // In WebGL the reach of the effect is decided by which programs share the triangle
        // fragment shader: meshes, textured meshes and lit lines do; plain lines and the perfect
        // spheres have their own. WebGPU has to draw that same line by hand.
        const applications = wgsl.match(/viewDependentAlpha\(in\.colour\.a, /g) ?? [];
        expect(applications).toHaveLength(3);
        // The textured path takes the mapped normal, as the WebGL one does: it applies this to
        // `norm` after mappedNormal has had it, so a bumped surface thickens along its bumps.
        expect(wgsl).toContain("viewDependentAlpha(in.colour.a, n)");
        // fs_line and fs_line_peel pass the alpha straight through, as WebGL's lines shader does.
        expect(wgsl).toContain("fn fs_line(in: VOut) -> @location(0) vec4f {\n    return fogged(in.colour, in.colour.a, in.eyeDistance);");
    });
});

/**
 * Coot's own shader, where the checkout is to hand.
 *
 * Skipped rather than failed when it is not: it lives outside this repo and most people building
 * Moorhen will not have it. Where it is there, it is the authority on what "matches Coot" means.
 */
const cootShader = [
    // baby-gru inside the Moorhen tree, which is how a developer checkout is laid out.
    "../../../checkout/coot-1.0/src/meshes.shader",
    // baby-gru beside it, which is how some build and test environments mount it.
    "../../../Moorhen-11082026/checkout/coot-1.0/src/meshes.shader",
    "../../../../checkout/coot-1.0/src/meshes.shader",
].map(path => join(__dirname, path)).find(existsSync);
const withCoot = cootShader ? describe : describe.skip;

withCoot("still the same curve as Coot", () => {
    // Inside the block, so that a checkout without Coot skips rather than failing to load.
    const source = cootShader ? readFileSync(cootShader, "utf8") : "";

    it("uses the same Beer-Lambert expression", () => {
        // Coot's, verbatim from meshes.shader. If this fails, Coot has changed its mind and
        // Moorhen has to decide whether to follow.
        expect(source).toContain(
            "float a = 1.0 - pow(max(1.0 - opacity, 0.0), 1.0 / max(abs(dp_this), 0.01));");
    });

    it("uses the same fifth power", () => {
        expect(source).toContain("output_colour.a = a * a * a * a * a;");
    });

    it("clamps the facing term where we do", () => {
        expect(MINIMUM_FACING).toBe(0.01);
        expect(source).toContain("max(abs(dp_this), 0.01)");
    });

    it("produces the same numbers as this module", () => {
        // The arithmetic, not the text: Coot's two lines evaluated directly and compared against
        // ours across the range. This is what "matching Coot" is actually worth.
        const coot = (opacity: number, facing: number) => {
            const a = 1 - Math.pow(Math.max(1 - opacity, 0), 1 / Math.max(Math.abs(facing), 0.01));
            return a * a * a * a * a;
        };
        for (const opacity of [0.1, 0.3, 0.5, 0.7, 0.9]) {
            for (const facing of [1, 0.7, 0.4, 0.2, 0.05, 0.01]) {
                expect(viewDependentAlpha(opacity, facing)).toBeCloseTo(coot(opacity, facing), 12);
            }
        }
    });
});
