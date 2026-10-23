import * as vec3 from 'gl-matrix/vec3';
import * as mat4 from 'gl-matrix/mat4';

/**
 * The geometry of the line overlays drawn over the scene - the FPS meter's graph and the on-screen
 * measuring lines - without any GL: segments as vertex pairs with a colour per vertex, ready for
 * linesToThickLines, and the matrices they are drawn with. Shared by the WebGL renderer
 * (overlays.ts) and the WebGPU one, so that the two draw the same thing.
 */

/** How far the FPS meter sits above the bottom edge, in its 48-unit-high frame. */
export const FPS_METER_LIFT = 5.0;

/** Segments as vertex pairs (x, y, z each) and an RGBA colour per vertex. */
export interface OverlaySegments {
    vertices: number[];
    colours: number[];
}

/**
 * The FPS meter: a box, and a bar per recent frame, coloured by how long it took. In the meter's
 * own frame: see fpsMeterMatrix.
 */
export function fpsMeterSegments(mspfArray: readonly number[]): OverlaySegments {
    const colours = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
    const top = -11.4 + FPS_METER_LIFT;
    const bottom = -21.6 + FPS_METER_LIFT;
    const vertices = [
        -22.9, top, 0.0,
        -12.7, top, 0.0,
        -22.9, bottom, 0.0,
        -12.7, bottom, 0.0,
        -22.9, top, 0.0,
        -22.9, bottom, 0.0,
        -12.7, top, 0.0,
        -12.7, bottom, 0.0,
    ];

    for (let i = 0; i < mspfArray.length; i++) {
        let mspf = mspfArray[i];
        if (mspf > 200.0) mspf = 200.0;

        const l = mspf / 200.0 * 10.0;
        const x = -22.8 + i / 20.;
        const y1 = -21.5 + FPS_METER_LIFT;
        const y2 = -21.5 + FPS_METER_LIFT + l;
        const z = 0.0;
        vertices.push(x, y1, z, x, y2, z);
        if (mspf < 17) {
            colours.push(0.2, 0.8, 0.2, 1.0, 0.2, 0.8, 0.2, 1.0);
        } else if (mspf < 24) {
            colours.push(0.7, 0.7, 0.3, 1.0, 0.7, 0.7, 0.3, 1.0);
        } else if (mspf < 50) {
            colours.push(0.8, 0.4, 0.3, 1.0, 0.8, 0.4, 0.3, 1.0);
        } else {
            colours.push(0.8, 0.2, 0.2, 1.0, 0.8, 0.2, 0.2, 1.0);
        }
    }
    return { vertices, colours };
}

/** The FPS meter's frame: a square 48 units across, whatever the canvas shape (OpenGL clip depth). */
export function fpsMeterMatrix(): mat4.mat4 {
    const view = mat4.fromValues(
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, -50.0, 1.0,
    );
    const projection = mat4.ortho(mat4.create(), -24, 24, -24, 24, 0.1, 1000.0);
    return mat4.multiply(mat4.create(), projection, view);
}

/** The FPS meter's line size and pixel zoom: thick lines pixelZoom x size^2 each side. */
export const FPS_METER_HALF_WIDTH = 0.04 * 1.0 * 1.0;

/**
 * The on-screen measuring tool: a small box at each point and lines joining them, as world-space
 * segments in the plane through the view centre. Points are in the 48-unit screen frame, y down.
 */
export function lineMeasureSegments(points: readonly { x: number; y: number }[], origin: ArrayLike<number>, zoom: number,
                                     ratio: number, invMat: mat4.mat4, background: ArrayLike<number>): OverlaySegments {
    const vertices: number[] = [];
    const colours: number[] = [];
    const xyzOff = [0, 1, 2].map(i => -origin[i]);
    const bright = background[0] * 0.299 + background[1] * 0.587 + background[2] * 0.114;
    const hairColour = bright < 0.5 ? [1., 1., 1., 1.] : [0., 0., 0., 1.];

    const lineStart = vec3.create();
    const lineEnd = vec3.create();
    const addLine = (x1: number, y1: number, x2: number, y2: number) => {
        vec3.set(lineStart, x1 * zoom * ratio, y1 * zoom, 0.0);
        vec3.transformMat4(lineStart, lineStart, invMat);
        vec3.set(lineEnd, x2 * zoom * ratio, y2 * zoom, 0.0);
        vec3.transformMat4(lineEnd, lineEnd, invMat);
        vertices.push(...xyzOff.map((coord, i) => coord + lineStart[i]), ...xyzOff.map((coord, i) => coord + lineEnd[i]));
        colours.push(...hairColour, ...hairColour);
    };

    let lastPoint: { x: number; y: number } | null = null;
    points.forEach(point => {
        const x2 = point.x;
        const y2 = -point.y;
        addLine(x2 - .3 / ratio, y2 - .3, x2 + .3 / ratio, y2 - .3);
        addLine(x2 - .3 / ratio, y2 + .3, x2 + .3 / ratio, y2 + .3);
        addLine(x2 - .25 / ratio, y2 - .3, x2 - .25 / ratio, y2 + .3);
        addLine(x2 + .25 / ratio, y2 - .3, x2 + .25 / ratio, y2 + .3);
        if (lastPoint) {
            addLine(lastPoint.x, -lastPoint.y, x2, y2);
        }
        lastPoint = point;
    });
    return { vertices, colours };
}

/**
 * The measuring lines' matrix on screen (not render-to-texture): orthographic over the canvas's
 * shape, whatever the projection, so they stay flat (OpenGL clip depth).
 */
export function lineMeasureMatrix(ratio: number, zoom: number, mvMatrix: mat4.mat4): mat4.mat4 {
    const projection = mat4.ortho(mat4.create(), -24 * ratio, 24 * ratio, -24, 24, 0.1, 1000.0);
    mat4.scale(projection, projection, [1. / zoom, 1. / zoom, 1.0]);
    return mat4.multiply(mat4.create(), projection, mvMatrix);
}

/** Their thickness: pixelZoom (0.04 x zoom) times the line size (1.5) squared, each side. */
export const lineMeasureHalfWidth = (zoom: number): number => 0.04 * zoom * 1.5 * 1.5;
