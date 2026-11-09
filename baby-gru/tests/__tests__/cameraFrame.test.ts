/**
 * The camera matrices, built from plain values rather than read off the WebGL renderer.
 *
 * baseProjection and zoomScaleFor were lifted out of GLrender unchanged, so the first half of this
 * file holds a frozen copy of the code they replaced and checks the two agree across every branch.
 * The second half checks viewProjection means what a second renderer would assume it means: the
 * view centre in the middle of the screen, zoom setting the visible height, the slab as the near
 * and far planes, and WebGPU's [0, 1] depth leaving the framing alone.
 */
import { describe, expect, it } from "@jest/globals";
import * as mat4 from "gl-matrix/mat4";
import * as vec4 from "gl-matrix/vec4";
import {
    CameraFrame, ORTHO_HALF_HEIGHT, PERSPECTIVE_FOV, baseProjection, perspectiveScale,
    pickHalfExtents, slabNearFar, viewProjection, viewportAspect, zoomScaleFor,
} from "../../src/WebGLgComponents/mgWebGLParts/projection";

/**
 * GLrender's projection code as it stood before the move, kept as a reference. `self` holds just
 * the fields it read.
 */
const oldProjection = (self, ratio: number) => {
    const pMatrix = mat4.create();
    let fb_scale = 1.0;
    if (self.renderToTexture) {
        if (self.doPerspectiveProjection) {
            const slab = slabNearFar(self.gl_clipPlane0[3], self.gl_clipPlane1[3], self.gl_fog_end, true);
            mat4.perspective(pMatrix, PERSPECTIVE_FOV, 1.0, slab.near, slab.far);
        } else {
            const { near: f_, far: b } = slabNearFar(self.gl_clipPlane0[3], self.gl_clipPlane1[3], self.gl_fog_end, false);
            const f = -f_;
            if (self.currentViewport[2] > self.currentViewport[3]) {
                if (self.doMultiView || self.doThreeWayView || self.doSideBySideStereo || self.doCrossEyedStereo) {
                    mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24, 24, -f, b);
                } else {
                    mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, -f, b);
                }
            } else {
                if (self.doMultiView || self.doThreeWayView || self.doSideBySideStereo || self.doCrossEyedStereo)
                    fb_scale = self.currentViewport[2] / self.currentViewport[3];
                mat4.ortho(pMatrix, -24 * fb_scale, 24 * fb_scale, -24, 24, -f, b);
            }
        }
    } else {
        if (self.doPerspectiveProjection) {
            const slab = slabNearFar(self.gl_clipPlane0[3], self.gl_clipPlane1[3], self.gl_fog_end, true);
            mat4.perspective(pMatrix, PERSPECTIVE_FOV, viewportAspect(self.currentViewport), slab.near, slab.far);
        } else {
            const slab = slabNearFar(self.gl_clipPlane0[3], self.gl_clipPlane1[3], self.gl_fog_end, false);
            mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24, 24, slab.near, slab.far);
        }
    }
    if (self.doPerspectiveProjection) {
        let perspMult = 1.0;
        if (self.renderToTexture) {
            if (self.gl.viewportWidth > self.gl.viewportHeight) {
                perspMult = 1.0 / ratio;
            }
        }
        const pScale = perspectiveScale(self.fogClipOffset);
        mat4.scale(pMatrix, pMatrix, [perspMult * pScale / self.zoom, perspMult * pScale / self.zoom, 1.0]);
    } else {
        mat4.scale(pMatrix, pMatrix, [1. / self.zoom, 1. / self.zoom, 1.0]);
    }
    return pMatrix;
};

/** The same mapping drawCore's cameraFrame makes, for the reference renderer state above. */
const frameOf = (self, ratio: number): CameraFrame => ({
    quat: self.myQuat,
    origin: self.origin,
    zoom: self.zoom,
    eyeDistance: self.fogClipOffset,
    clipPlane0W: self.gl_clipPlane0[3],
    clipPlane1W: self.gl_clipPlane1[3],
    fogEnd: self.gl_fog_end,
    perspective: !!self.doPerspectiveProjection,
    viewport: self.currentViewport,
    aspect: ratio,
    offscreen: self.renderToTexture
        ? {
            canvasLandscape: self.gl.viewportWidth > self.gl.viewportHeight,
            dividedView: !!(self.doMultiView || self.doThreeWayView || self.doSideBySideStereo || self.doCrossEyedStereo),
        }
        : undefined,
});

const renderer = (over: Record<string, unknown> = {}) => ({
    myQuat: [0, 0, 0, -1],
    origin: [-10, -20, -30],
    zoom: 0.8,
    fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230],
    gl_clipPlane1: [0, 0, 1, 270],
    gl_fog_end: 290,
    doPerspectiveProjection: false,
    currentViewport: [0, 0, 1200, 800],
    renderToTexture: false,
    doMultiView: false, doThreeWayView: false, doSideBySideStereo: false, doCrossEyedStereo: false,
    gl: { viewportWidth: 1200, viewportHeight: 800 },
    ...over,
});

const expectMatricesClose = (a: ArrayLike<number>, b: ArrayLike<number>) => {
    expect(a.length).toBe(16);
    for (let i = 0; i < 16; i++) expect(a[i]).toBeCloseTo(b[i], 10);
};

describe("baseProjection and zoomScaleFor match the code they replaced", () => {
    const cases: [string, Record<string, unknown>][] = [];
    for (const doPerspectiveProjection of [false, true]) {
        for (const renderToTexture of [false, true]) {
            for (const doSideBySideStereo of [false, true]) {
                for (const currentViewport of [[0, 0, 1200, 800], [0, 0, 600, 800]]) {
                    for (const gl of [{ viewportWidth: 1200, viewportHeight: 800 }, { viewportWidth: 600, viewportHeight: 900 }]) {
                        cases.push([
                            `${doPerspectiveProjection ? "perspective" : "ortho"}, ${renderToTexture ? "offscreen" : "screen"}, ` +
                            `${doSideBySideStereo ? "divided" : "single"}, viewport ${currentViewport[2]}x${currentViewport[3]}, ` +
                            `canvas ${gl.viewportWidth}x${gl.viewportHeight}`,
                            { doPerspectiveProjection, renderToTexture, doSideBySideStereo, currentViewport, gl },
                        ]);
                    }
                }
            }
        }
    }

    it.each(cases)("%s", (_name, over) => {
        const self = renderer(over);
        for (const ratioMult of [1.0, 0.5]) {
            const ratio = self.gl.viewportWidth / self.gl.viewportHeight * ratioMult;
            const frame = frameOf(self, ratio);
            const now = baseProjection(mat4.create(), frame);
            const s = zoomScaleFor(frame);
            mat4.scale(now, now, [s, s, 1.0]);
            expectMatricesClose(now, oldProjection(self, ratio));
        }
    });

    it("keeps a slab pulled behind the eye working under perspective", () => {
        const self = renderer({ doPerspectiveProjection: true, gl_clipPlane0: [0, 0, -1, 10] });
        const frame = frameOf(self, 1.5);
        const now = baseProjection(mat4.create(), frame);
        mat4.scale(now, now, [zoomScaleFor(frame), zoomScaleFor(frame), 1.0]);
        expectMatricesClose(now, oldProjection(self, 1.5));
        expect(Array.from(now).every(Number.isFinite)).toBe(true);
    });
});

/** Where a world point lands in normalised device coordinates. */
const ndc = (projection: mat4.mat4, view: mat4.mat4, p: number[]) => {
    const out = vec4.transformMat4(vec4.create(), [p[0], p[1], p[2], 1], view);
    vec4.transformMat4(out, out, projection);
    return [out[0] / out[3], out[1] / out[3], out[2] / out[3], out[3]];
};

const plainFrame = (over: Partial<CameraFrame> = {}): CameraFrame => ({
    quat: [0, 0, 0, -1],
    origin: [-10, -20, -30],
    zoom: 0.8,
    eyeDistance: 250,
    clipPlane0W: -230,
    clipPlane1W: 270,
    fogEnd: 290,
    perspective: false,
    viewport: [0, 0, 1200, 800],
    aspect: 1.5,
    ...over,
});

describe("viewProjection", () => {
    const centre = [10, 20, 30];

    for (const perspective of [false, true]) {
        describe(perspective ? "perspective" : "orthographic", () => {
            it("puts the view centre in the middle of the screen", () => {
                const { projection, view } = viewProjection(plainFrame({ perspective }));
                const [x, y] = ndc(projection, view, centre);
                expect(x).toBeCloseTo(0, 10);
                expect(y).toBeCloseTo(0, 10);
            });

            it("shows the half-height picking assumes, at the view centre", () => {
                const frame = plainFrame({ perspective });
                const { projection, view } = viewProjection(frame);
                const { halfHeight } = pickHalfExtents(frame.eyeDistance, frame.zoom, 1.5, perspective, frame.eyeDistance);
                const [, y] = ndc(projection, view, [centre[0], centre[1] + halfHeight, centre[2]]);
                expect(y).toBeCloseTo(1, 6);
            });

            it("makes the slab the near and far planes", () => {
                const frame = plainFrame({ perspective });
                const slab = slabNearFar(frame.clipPlane0W, frame.clipPlane1W, frame.fogEnd, perspective);
                const { projection, view } = viewProjection(frame);
                // Eye space z is -distance, and the view centre sits at eyeDistance from the eye.
                const atDistance = (d: number) => [centre[0], centre[1], centre[2] + frame.eyeDistance - d];
                expect(ndc(projection, view, atDistance(slab.near))[2]).toBeCloseTo(-1, 6);
                expect(ndc(projection, view, atDistance(slab.far))[2]).toBeCloseTo(1, 6);

                const gpu = viewProjection(frame, "zeroToOne");
                expect(ndc(gpu.projection, gpu.view, atDistance(slab.near))[2]).toBeCloseTo(0, 6);
                expect(ndc(gpu.projection, gpu.view, atDistance(slab.far))[2]).toBeCloseTo(1, 6);
            });

            it("changes only depth for WebGPU", () => {
                const frame = plainFrame({ perspective });
                const gl = viewProjection(frame);
                const gpu = viewProjection(frame, "zeroToOne");
                const p = [centre[0] + 3, centre[1] - 4, centre[2] + 5];
                const a = ndc(gl.projection, gl.view, p);
                const b = ndc(gpu.projection, gpu.view, p);
                expect(b[0]).toBeCloseTo(a[0], 10);
                expect(b[1]).toBeCloseTo(a[1], 10);
                expect(b[3]).toBeCloseTo(a[3], 10);
                expect(b[2]).toBeCloseTo(0.5 * a[2] + 0.5, 10);
            });
        });
    }

    it("zooms by scaling what is visible, not by moving the eye", () => {
        const wide = viewProjection(plainFrame({ zoom: 2 }));
        const p = [centre[0], centre[1] + ORTHO_HALF_HEIGHT, centre[2]];
        expect(ndc(wide.projection, wide.view, p)[1]).toBeCloseTo(0.5, 10);
        expectMatricesClose(wide.view, viewProjection(plainFrame({ zoom: 0.5 })).view);
    });

    it("rotates about the view centre", () => {
        // A quarter turn about z (in quatToMat4's convention, the transpose of mat4.fromQuat).
        const s = Math.SQRT1_2;
        const { projection, view } = viewProjection(plainFrame({ quat: [0, 0, s, s] }));
        const [x, y] = ndc(projection, view, centre);
        expect(x).toBeCloseTo(0, 10);
        expect(y).toBeCloseTo(0, 10);
        const [rx, ry] = ndc(projection, view, [centre[0] + 1, centre[1], centre[2]]);
        expect(Math.hypot(rx, ry)).toBeGreaterThan(0);
        expect(rx).toBeCloseTo(0, 10);
    });
});
