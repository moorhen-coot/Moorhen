/**
 * The alpha curve of a transparent surface seen at an angle.
 *
 * Two things are being protected. The first is the curve itself, and in particular the property
 * that makes it safe to add to a renderer full of existing scenes: at strength 0 it is the
 * identity, exactly, and face-on it returns the opacity that was asked for whatever the strength.
 * Anything fitted rather than derived would be close but not equal, and "close" means every
 * transparent surface in Moorhen changes slightly the day this lands.
 *
 * The second is that the shader and the TypeScript agree. They are written twice because one of
 * them has to run on the GPU, and the only thing stopping them drifting apart is a test that reads
 * the shader source and checks the arithmetic in it is still the arithmetic here.
 */
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
    MINIMUM_FACING, REFERENCE_FACING, grazingAlpha, grazingDensitySetting,
} from "../../src/WebGLgComponents/grazingDensity";

/** Anchored face-on, which is how this started and what the anchor is measured against. */
const faceOnAnchored = (base: number, facing: number, strength: number) =>
    grazingAlpha(base, facing, strength, 1);

describe("leaving things alone", () => {
    it("is the identity at strength zero, for every opacity and angle", () => {
        // Not "close to". Every transparent surface in every existing scene goes through this.
        for (const base of [0, 0.05, 0.2, 0.5, 0.8, 0.95, 1]) {
            for (const facing of [0, 0.01, 0.3, 0.7, 1]) {
                expect(grazingAlpha(base, facing, 0)).toBe(base);
            }
        }
    });

    it("defaults to off, so nothing happens until something asks", () => {
        expect(grazingDensitySetting.strength).toBe(0);
    });

    it("returns the opacity that was asked for at the anchoring angle", () => {
        // The reason this is Beer-Lambert and not a fitted rim term: the number on the slider
        // still means something exact, and the anchor says at what angle it means it.
        for (const strength of [0.25, 0.5, 1]) {
            expect(grazingAlpha(0.3, REFERENCE_FACING, strength)).toBeCloseTo(0.3, 12);
            expect(grazingAlpha(0.75, REFERENCE_FACING, strength)).toBeCloseTo(0.75, 12);
            expect(faceOnAnchored(0.3, 1, strength)).toBeCloseTo(0.3, 12);
        }
    });
});

describe("where the opacity is anchored", () => {
    it("thins the surface head-on, which is what makes it usable at ordinary opacities", () => {
        // The measured complaint: anchored face-on, 0.30 opacity leaves the middle of the surface
        // too dense for the rim to read against - 0.59 at |N.V|=0.4, and through both walls of a
        // closed shell 0.83. Anchored part-way round, the same setting behaves as a very low one.
        expect(faceOnAnchored(0.3, 0.4, 1)).toBeGreaterThan(0.55);
        expect(grazingAlpha(0.3, 0.4, 1)).toBeLessThan(0.4);
        expect(grazingAlpha(0.3, 1, 1)).toBeLessThan(0.2);
    });

    it("gives an ordinary opacity the range a very low one used to need", () => {
        // 0.30 anchored at 0.5 should span about what 0.10 spans anchored face-on, which is the
        // setting that was found by hand to work.
        const span = (a: number, b: number) => b - a;
        const wanted = span(faceOnAnchored(0.1, 1, 1), faceOnAnchored(0.1, MINIMUM_FACING, 1));
        const got = span(grazingAlpha(0.3, 1, 1), grazingAlpha(0.3, MINIMUM_FACING, 1));
        expect(got).toBeGreaterThan(wanted * 0.9);
    });

    it("is still exactly the identity at strength zero, whatever the anchor", () => {
        // The anchor is interpolated along with the path, so switching the effect off is still
        // switching it off and not "almost".
        for (const anchor of [0.05, 0.3, 0.5, 1]) {
            for (const base of [0.1, 0.5, 0.9]) {
                expect(grazingAlpha(base, 0.2, 0, anchor)).toBe(base);
            }
        }
    });

    it("is the old behaviour when anchored face-on", () => {
        // So the change can be undone from the slider rather than from the source.
        expect(grazingAlpha(0.3, 0.4, 1, 1)).toBeCloseTo(faceOnAnchored(0.3, 0.4, 1), 12);
    });

    it("cannot be driven to nonsense by the anchor, or by a degenerate normal", () => {
        // NaN is the one a clamp does not catch: Math.min and Math.max carry it straight through,
        // and an alpha of NaN is a fragment drawn at whatever the hardware fancies.
        for (const anchor of [0, -1, 5, Number.NaN]) {
            const alpha = grazingAlpha(0.3, 0.4, 1, anchor);
            expect(Number.isFinite(alpha)).toBe(true);
            expect(alpha).toBeGreaterThanOrEqual(0);
            expect(alpha).toBeLessThanOrEqual(1);
        }
        for (const facing of [Number.NaN, Number.POSITIVE_INFINITY]) {
            const alpha = grazingAlpha(0.3, facing, 1);
            expect(Number.isFinite(alpha)).toBe(true);
            expect(alpha).toBeGreaterThanOrEqual(0);
            expect(alpha).toBeLessThanOrEqual(1);
        }
    });
});

describe("the shell", () => {
    it("thickens as the surface turns away", () => {
        const base = 0.3;
        const alphas = [1, 0.8, 0.6, 0.4, 0.2, 0.1].map(facing => grazingAlpha(base, facing, 1));
        alphas.slice(1).forEach((alpha, i) => expect(alpha).toBeGreaterThan(alphas[i]));
        // The opacity that was asked for sits at the anchor, with the surface thinner than that
        // head-on and denser beyond it.
        expect(grazingAlpha(base, REFERENCE_FACING, 1)).toBeCloseTo(base, 12);
        expect(alphas[0]).toBeLessThan(base);
    });

    it("is the same whichever way the surface faces", () => {
        // |N.V|, not N.V: a back face is as much material to look through as a front one, and the
        // peel keeps both.
        expect(grazingAlpha(0.4, -0.25, 1)).toBeCloseTo(grazingAlpha(0.4, 0.25, 1), 12);
    });

    it("approaches opaque at the silhouette", () => {
        expect(grazingAlpha(0.3, MINIMUM_FACING, 1)).toBeGreaterThan(0.99);
    });

    it("cannot be taken past opaque by a bad normal", () => {
        // The clamp. Without it 1/|N.V| runs away where the normals are least trustworthy.
        for (const facing of [0, 1e-9, -1e-9, MINIMUM_FACING / 2]) {
            const alpha = grazingAlpha(0.3, facing, 1);
            expect(alpha).toBeLessThanOrEqual(1);
            expect(alpha).toBe(grazingAlpha(0.3, MINIMUM_FACING, 1));
        }
    });

    it("leaves both extremes of opacity where they are", () => {
        // An invisible surface has nothing to absorb with; an opaque one is already opaque.
        for (const facing of [1, 0.5, 0.01]) {
            expect(grazingAlpha(0, facing, 1)).toBe(0);
            expect(grazingAlpha(1, facing, 1)).toBe(1);
        }
    });

    it("is a thinner shell at half strength, not a different effect", () => {
        // Between the two honest ends, and monotonic in strength.
        const at = (strength: number) => grazingAlpha(0.3, 0.3, strength);
        expect(at(0.5)).toBeGreaterThan(at(0));
        expect(at(0.5)).toBeLessThan(at(1));
    });

    it("follows Beer-Lambert, so two half-thicknesses make the whole", () => {
        // The property that says this is a path length and not a curve: absorbing through a shell
        // is multiplicative in transmittance, so a path of 2 transmits what a path of 1 does,
        // squared. The path doubles at half the anchoring angle, wherever that is put.
        const base = 0.4;
        for (const anchor of [1, REFERENCE_FACING]) {
            const atAnchor = grazingAlpha(base, anchor, 1, anchor);
            const atHalf = grazingAlpha(base, anchor / 2, 1, anchor);
            expect(atAnchor).toBeCloseTo(base, 12);
            expect(1 - atHalf).toBeCloseTo((1 - base) ** 2, 12);
        }
    });
});

describe("the shader and this module", () => {
    const shaderSource = readFileSync(
        join(__dirname, "../../src/WebGLgComponents/webgl-2/triangle-fragment-shader.js"), "utf8");

    it("declares the uniform the plumbing writes", () => {
        expect(shaderSource).toContain("uniform float grazingDensity;");
    });

    it("applies it to the vertex alpha, ahead of the fade", () => {
        // Order matters: a movie fading a surface out must still reach nothing however edge-on it
        // is, so the fade has to be the last word.
        const applied = shaderSource.indexOf("fragColor.a = grazingAlpha(");
        const faded = shaderSource.indexOf("fragColor.a *= alphaMultiplier;");
        expect(applied).toBeGreaterThan(-1);
        expect(faded).toBeGreaterThan(applied);
    });

    it("clamps the facing term to the same limit", () => {
        // Written out as a literal in GLSL; if one moves and the other does not, the silhouette
        // behaves differently on screen from everything asserted above.
        expect(shaderSource).toContain(`max(abs(dot(normalize(n), normalize(viewDir))), ${MINIMUM_FACING})`);
    });

    it("blends the path length rather than the alpha", () => {
        // This is what makes strength 0 the identity rather than merely close to it. Interpolating
        // the alpha instead would read almost the same and would not have that property.
        expect(shaderSource).toContain("float path = 1.0 + grazingDensity * (reference / facing - 1.0);");
        expect(shaderSource).toContain("return 1.0 - pow(transmitted, path);");
    });

    it("declares the anchor and clamps it to the same range", () => {
        expect(shaderSource).toContain("uniform float grazingAnchor;");
        expect(shaderSource).toContain(`clamp(grazingAnchor, ${MINIMUM_FACING}, 1.0)`);
    });

    it("starts the anchor at face-on, where an unwritten zero would divide to nothing", () => {
        // Its neighbour defaults to 0 because 0 is this effect's identity; the anchor cannot,
        // because it is a divisor. Checked here because the two sit side by side and the
        // reasoning is opposite.
        const shaders = readFileSync(
            join(__dirname, "../../src/WebGLgComponents/mgWebGLShaders.ts"), "utf8");
        expect(shaders).toMatch(/uniform1f\([^,]*grazingDensity,\s*0\.0\)/);
        expect(shaders).toMatch(/uniform1f\([^,]*grazingAnchor,\s*1\.0\)/);
    });
});
