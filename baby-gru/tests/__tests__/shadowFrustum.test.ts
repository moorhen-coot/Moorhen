/**
 * Fitting the shadow camera to the view.
 *
 * What matters is texel density: how much ground one shadow map texel covers in the part of the
 * scene somebody is actually looking at. So most of these check that the frustum tracks the
 * *view* and not the structure, which is what the old code had backwards.
 */
import { describe, expect, it } from "@jest/globals";
import {
    MIN_HALF_EXTENT, SHADOW_NEAR, fitShadowFrustum, lightAxes, radiusAbout,
} from "../../src/WebGLgComponents/shadowFrustum";

/** Light straight down the view axis: light space is eye space, so the fit is unrotated. */
const headOn = lightAxes([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
]);

/** A view 50 A across and 40 A deep, a normal working zoom on a protein. */
const aView = { halfWidth: 25, halfHeight: 25, halfDepth: 20 };

describe("fitting the shadow frustum to the view", () => {
    it("covers the visible region and no more", () => {
        const frustum = fitShadowFrustum(aView, 1000, headOn);
        expect(frustum.halfWidth).toBeCloseTo(25, 6);
        expect(frustum.halfHeight).toBeCloseTo(25, 6);
    });

    it("does not grow when the structure does, which is the whole point", () => {
        // The old extent was the structure's span leaned over by the light angle, so a ribosome
        // spent most of the map outside the view. Same view, two very different structures, same
        // frustum - both structures being bigger than the view.
        const small = fitShadowFrustum(aView, 200, headOn);
        const huge = fitShadowFrustum(aView, 2000, headOn);
        expect(huge.halfWidth).toBeCloseTo(small.halfWidth, 6);
        expect(huge.halfHeight).toBeCloseTo(small.halfHeight, 6);
    });

    it("reaches back far enough to catch casters outside the view", () => {
        // A caster only matters if it is between the light and something visible, so the near
        // plane - not the width - has to account for it.
        const frustum = fitShadowFrustum(aView, 500, headOn);
        expect(frustum.eyeDistance - frustum.near).toBeGreaterThanOrEqual(500);
    });

    it("keeps the near plane positive and clear of zero", () => {
        expect(fitShadowFrustum(aView, 0, headOn).near).toBe(SHADOW_NEAR);
        expect(fitShadowFrustum(aView, 1e4, headOn).near).toBe(SHADOW_NEAR);
    });

    it("spends its depth range on the scene rather than on a fixed 1000", () => {
        // The old projection was ortho(..., 0.1, 1000) whatever the scene, so a 50 A protein got
        // a twentieth of the depth buffer.
        const frustum = fitShadowFrustum(aView, 40, headOn);
        expect(frustum.far - frustum.near).toBeLessThan(120);
    });

    it("stops covering more than the structure when zoomed out past it", () => {
        const wayOut = { halfWidth: 400, halfHeight: 400, halfDepth: 200 };
        const frustum = fitShadowFrustum(wayOut, 35, headOn);
        expect(frustum.halfWidth).toBeCloseTo(35, 6);
        expect(frustum.halfHeight).toBeCloseTo(35, 6);
    });

    it("does not sharpen to nothing when zoomed right in", () => {
        const nose = { halfWidth: 0.2, halfHeight: 0.2, halfDepth: 0.05 };
        expect(fitShadowFrustum(nose, 40, headOn).halfWidth).toBe(MIN_HALF_EXTENT);
    });

    it("keeps width and height apart rather than padding to a square", () => {
        // Padding the tighter axis up to the wider one would only make its texels coarser.
        const wide = fitShadowFrustum(
            { halfWidth: 40, halfHeight: 10, halfDepth: 0 }, 1000, headOn);
        expect(wide.halfWidth).toBeCloseTo(40, 6);
        expect(wide.halfHeight).toBeCloseTo(10, 6);
    });

    it("takes in the slab depth once the light is off the view axis", () => {
        // Tilted 90 degrees about y, the light looks along eye x, so what was the slab's depth is
        // now across the map and the view's width is along the light instead.
        const sideOn = lightAxes([
            0, 0, -1, 0,
            0, 1, 0, 0,
            1, 0, 0, 0,
            0, 0, 0, 1,
        ]);
        const frustum = fitShadowFrustum(
            { halfWidth: 30, halfHeight: 10, halfDepth: 5 }, 1000, sideOn);
        expect(frustum.halfWidth).toBeCloseTo(5, 6);   // the slab depth
        expect(frustum.halfHeight).toBeCloseTo(10, 6); // unchanged, y is the rotation axis
        expect(frustum.far - frustum.eyeDistance).toBeCloseTo(30, 6); // the width, along the light
    });

    it("survives a degenerate view without producing nonsense", () => {
        // Before the first layout, or a collapsed slab.
        const frustum = fitShadowFrustum(
            { halfWidth: 0, halfHeight: 0, halfDepth: 0 }, 0, headOn);
        expect(frustum.halfWidth).toBe(MIN_HALF_EXTENT);
        expect(frustum.far).toBeGreaterThan(frustum.near);
        expect(Number.isFinite(frustum.far)).toBe(true);
    });

    it("measures the win on the case from the bug report", () => {
        // 1ibm at a working zoom. Old: (min(48*z, span) + span*0.7071)/2, times zoom for the
        // projection scale applied afterwards. New: the visible box along the light's axes.
        const zoom = 0.5, span = 250;
        const before = ((Math.min(48 * zoom, span) + span * 0.7071) / 2) * zoom;
        const after = fitShadowFrustum(
            { halfWidth: 18, halfHeight: 12, halfDepth: 20 }, span / 2, headOn).halfWidth;

        // Texel size goes as the extent, so this is the factor the shadows sharpen by.
        expect(before / after).toBeGreaterThan(2.5);
    });
});

describe("reading the light's axes out of its rotation", () => {
    it("takes the rows, not the columns", () => {
        // Transposing would fit the frustum to the wrong axes - a mistake that renders as
        // shadows drifting off their casters rather than as anything obviously broken.
        const quarterTurnAboutZ = [
            0, 1, 0, 0,
            -1, 0, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ];
        const [x, y, z] = lightAxes(quarterTurnAboutZ);
        expect(x).toEqual([0, -1, 0]);
        expect(y).toEqual([1, 0, 0]);
        expect(z).toEqual([0, 0, 1]);
    });
});

describe("measuring the casters", () => {
    it("reaches the furthest corner from the view centre, not half a diagonal", () => {
        const radius = radiusAbout([0, 0, 0], [-10, -10, -10], [90, 0, 0]);
        expect(radius).toBeCloseTo(Math.sqrt(90 * 90 + 10 * 10 + 10 * 10), 6);
    });

    it("is zero for a point box at the centre", () => {
        expect(radiusAbout([5, 5, 5], [5, 5, 5], [5, 5, 5])).toBe(0);
    });

    it("counts a box that does not contain the centre at all", () => {
        const radius = radiusAbout([0, 0, 0], [100, 100, 100], [110, 110, 110]);
        expect(radius).toBeCloseTo(Math.sqrt(3 * 110 * 110), 6);
    });
});
