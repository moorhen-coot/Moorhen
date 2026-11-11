/**
 * The side-on view's WebGPU camera (src/WebGPUComponents/sideOnCamera.ts) against the matrices
 * the widget's WebGL picture is drawn with (MoorhenSlidersSettings draw3D), so that the two
 * renderers put the scene in the same place under the handles.
 */
import { describe, expect, it } from "@jest/globals";
import * as mat4 from "gl-matrix/mat4";
import * as quat from "gl-matrix/quat";
import * as vec4 from "gl-matrix/vec4";
import { quatToMat4 } from "../../src/WebGLgComponents/quatToMat4.js";
import { ORTHO_HALF_HEIGHT } from "../../src/WebGLgComponents/mgWebGLParts/projection";
import { frameUniforms, type PreviewCameraSource } from "../../src/WebGPUComponents/previewScene";
import { sideOnCamera } from "../../src/WebGPUComponents/sideOnCamera";

const main = (myQuat: number[]): PreviewCameraSource => ({
    myQuat, origin: [-3, 4, -5], zoom: 1, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.5, 0.5, 0.5, 1],
    light_colours_specular: [0.5, 0.5, 0.5, 1], specularPower: 32, background_colour: [1, 1, 1, 1],
});

/** The widget's WebGL modelview, as draw3D makes it. */
function widgetModelView(source: PreviewCameraSource): mat4.mat4 {
    const m = mat4.fromValues(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, -100, 1);
    mat4.multiply(m, m, quatToMat4(source.myQuat) as mat4.mat4);
    return mat4.translate(m, m, Array.from(source.origin) as [number, number, number]);
}

describe("the side-on camera", () => {
    const turns = [[0, 0, 0, 1], quat.normalize(quat.create(), [0.2, -0.5, 0.3, 0.8]) as number[], quat.normalize(quat.create(), [-0.7, 0.1, 0.6, 0.2]) as number[]];

    it("turns the scene as the widget's WebGL picture does", () => {
        for (const myQuat of turns) {
            const source = main(myQuat);
            const side = sideOnCamera(source, 30, 400, 240);
            const view = frameUniforms(side, 400, 240).slice(16, 32);
            const webgl = widgetModelView(source);
            // The same turn and the same point at the centre; only the eye's distance differs.
            for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13]) expect(view[i]).toBeCloseTo(webgl[i], 5);
        }
    });

    it("frames the given half width across, as the widget's projection does", () => {
        const side = sideOnCamera(main([0, 0, 0, 1]), 30, 400, 240);
        expect(ORTHO_HALF_HEIGHT * side.zoom * 400 / 240).toBeCloseTo(30, 6);
        const projection = frameUniforms(side, 400, 240).slice(0, 16);
        // Orthographic x scale: 1 / half width.
        expect(projection[0]).toBeCloseTo(1 / 30, 6);
        expect(projection[5]).toBeCloseTo(1 / (30 * 240 / 400), 6);
    });

    it("zoomed in on a depth, puts the scene where the widget's WebGL picture does", () => {
        const [width, height, halfWidth, centre] = [400, 240, 6, 9];
        const points = [[0, 0, 0], [3, -4, 5], [-7, 2, 11], [12, 8, -6]];
        for (const myQuat of turns) {
            const source = main(myQuat);
            const side = frameUniforms(sideOnCamera(source, halfWidth, width, height, centre), width, height);
            const gpu = mat4.multiply(mat4.create(), side.slice(0, 16) as unknown as mat4.mat4, side.slice(16, 32) as unknown as mat4.mat4);
            // draw3D's projection: the depth across moved to the centre
            const projection = mat4.ortho(mat4.create(), centre - halfWidth, centre + halfWidth,
                -halfWidth * height / width, halfWidth * height / width, 0.1, 1000);
            const gl = mat4.multiply(mat4.create(), projection, widgetModelView(source));
            for (const p of points) {
                const a = vec4.transformMat4(vec4.create(), [p[0], p[1], p[2], 1], gpu);
                const b = vec4.transformMat4(vec4.create(), [p[0], p[1], p[2], 1], gl);
                expect(a[0] / a[3]).toBeCloseTo(b[0] / b[3], 5);
                expect(a[1] / a[3]).toBeCloseTo(b[1] / b[3], 5);
            }
        }
    });

    it("clips and fogs nothing of the scene, and has no effects", () => {
        const side = sideOnCamera(main([0, 0, 0, 1]), 30, 400, 240);
        expect(side.doSSAO ?? false).toBe(false);
        expect(side.doEdgeDetect ?? false).toBe(false);
        expect(side.doShadow ?? false).toBe(false);
        expect(side.useOffScreenBuffers ?? false).toBe(false);
        expect(side.doOrderIndependentTransparency).toBe(false);
        // From in front of the eye to beyond the scene, and fog only past the slab.
        expect(-side.gl_clipPlane0[3]).toBeLessThan(1);
        expect(side.gl_clipPlane1[3]).toBeGreaterThan(side.fogClipOffset + 4 * 30);
        expect(side.gl_fog_start).toBeGreaterThan(side.gl_clipPlane1[3]);
    });
});
