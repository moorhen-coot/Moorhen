import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import { get_grid } from '../../utils/utils';
import type { MGWebGL } from '../mgWebGL';

/**
 * View-transform setup — stereo, multi-way and three-way viewport/quaternion
 * layouts. These are self-contained computational routines: they read the
 * current viewport size and a few config flags off the MGWebGL instance and
 * populate its result arrays (stereoViewports/Quats, multiWayViewports/Quats,
 * threeWayViewports/Quats). The state itself stays on the instance because the
 * draw pipeline reads it; only the logic moves here.
 *
 * `self` is the live MGWebGL instance (type-only import avoids a runtime cycle).
 */

export function setupStereoTransformations(self: MGWebGL): void {

    self.stereoViewports = []
    self.stereoQuats = []
    self.stereoViewports.push([0, 0, self.gl.viewportWidth / 2, self.gl.viewportHeight])
    self.stereoViewports.push([self.gl.viewportWidth / 2, 0, self.gl.viewportWidth / 2, self.gl.viewportHeight])
    const yaxis = vec3.create();
    vec3.set(yaxis, 0.0, -1.0, 0.0)

    const angle = 3 / 180 * Math.PI;

    const dval3_p = Math.cos(angle / 2.0);
    const dval0_y_p = yaxis[0] * Math.sin(angle / 2.0);
    const dval1_y_p = yaxis[1] * Math.sin(angle / 2.0);
    const dval2_y_p = yaxis[2] * Math.sin(angle / 2.0);

    const dval3_m = Math.cos(-angle / 2.0);
    const dval0_y_m = yaxis[0] * Math.sin(-angle / 2.0);
    const dval1_y_m = yaxis[1] * Math.sin(-angle / 2.0);
    const dval2_y_m = yaxis[2] * Math.sin(-angle / 2.0);

    const rotY_p = quat4.create();
    const rotY_m = quat4.create();

    quat4.set(rotY_p, dval0_y_p, dval1_y_p, dval2_y_p, dval3_p);
    quat4.set(rotY_m, dval0_y_m, dval1_y_m, dval2_y_m, dval3_m);

    self.stereoQuats.push(rotY_p)
    self.stereoQuats.push(rotY_m)

}

export function setupMultiWayTransformations(self: MGWebGL, nmols: number): { rows: number, cols: number } {

    let wh: number[] = get_grid(nmols)
    if (self.specifyMultiViewRowsColumns) {
        wh = self.multiViewRowsColumns
    }

    self.currentViewport = [0, 0, self.gl.viewportWidth, self.gl.viewportHeight]
    self.multiWayViewports = []
    self.multiWayQuats = []

    const rotZ = quat4.create();
    quat4.set(rotZ, 0, 0, 0, -1);

    for (let i = 0; i < wh[1]; i++) {
        for (let j = 0; j < wh[0]; j++) {
            const frac_i = i / wh[1]
            const frac_j = j / wh[0]
            self.multiWayViewports.push([frac_i * self.gl.viewportWidth, frac_j * self.gl.viewportHeight, self.gl.viewportWidth / wh[1], self.gl.viewportHeight / wh[0]])
            self.multiWayQuats.push(rotZ)
        }
    }
    self.multiWayRatio = wh[0] / wh[1]
    self.currentMultiViewGroup = 0

    return { rows: wh[1], cols: wh[0] }

}

export function setupThreeWayTransformations(self: MGWebGL): void {

    self.currentViewport = [0, 0, self.gl.viewportWidth, self.gl.viewportHeight]
    self.threeWayViewports = []
    self.threeWayQuats = []

    const BL = [0, 0, self.gl.viewportWidth / 2, self.gl.viewportHeight / 2]
    const BR = [self.gl.viewportWidth / 2, 0, self.gl.viewportWidth / 2, self.gl.viewportHeight / 2]
    const TR = [self.gl.viewportWidth / 2, self.gl.viewportHeight / 2, self.gl.viewportWidth / 2, self.gl.viewportHeight / 2]
    const TL = [0, self.gl.viewportHeight / 2, self.gl.viewportWidth / 2, self.gl.viewportHeight / 2]

    if (self.threeWayViewOrder && self.threeWayViewOrder.length === 4) {
        if (self.threeWayViewOrder.indexOf(" ") === 0) {
            self.threeWayViewports.push(BL)
            self.threeWayViewports.push(BR)
            self.threeWayViewports.push(TR)
        } else if (self.threeWayViewOrder.indexOf(" ") === 1) {
            self.threeWayViewports.push(BL)
            self.threeWayViewports.push(BR)
            self.threeWayViewports.push(TL)
        } else if (self.threeWayViewOrder.indexOf(" ") === 2) {
            self.threeWayViewports.push(BR)
            self.threeWayViewports.push(TL)
            self.threeWayViewports.push(TR)
        } else if (self.threeWayViewOrder.indexOf(" ") === 3) {
            self.threeWayViewports.push(BL)
            self.threeWayViewports.push(TL)
            self.threeWayViewports.push(TR)
        }
    } else {
        self.threeWayViewports.push(BL)
        self.threeWayViewports.push(TL)
        self.threeWayViewports.push(TR)
    }

    const xaxis = vec3.create();
    vec3.set(xaxis, 1.0, 0.0, 0.0)
    const yaxis = vec3.create();
    vec3.set(yaxis, 0.0, -1.0, 0.0)

    const zaxis = vec3.create();
    vec3.set(zaxis, 0.0, 0.0, 1.0)

    const angle = -Math.PI / 2.;

    const dval3 = Math.cos(angle / 2.0);

    const dval0_x = xaxis[0] * Math.sin(angle / 2.0);
    const dval1_x = xaxis[1] * Math.sin(angle / 2.0);
    const dval2_x = xaxis[2] * Math.sin(angle / 2.0);

    const dval0_y = yaxis[0] * Math.sin(angle / 2.0);
    const dval1_y = yaxis[1] * Math.sin(angle / 2.0);
    const dval2_y = yaxis[2] * Math.sin(angle / 2.0);

    const dval0_z_p = zaxis[0] * Math.sin(angle / 2.0);
    const dval1_z_p = zaxis[1] * Math.sin(angle / 2.0);
    const dval2_z_p = zaxis[2] * Math.sin(angle / 2.0);
    const dval3_z_p = Math.cos(angle / 2.0);

    const dval0_z_m = zaxis[0] * Math.sin(-angle / 2.0);
    const dval1_z_m = zaxis[1] * Math.sin(-angle / 2.0);
    const dval2_z_m = zaxis[2] * Math.sin(-angle / 2.0);
    const dval3_z_m = Math.cos(-angle / 2.0);

    const yForward = quat4.create();
    const xForward = quat4.create();
    const zForward = quat4.create();
    const zPlus = quat4.create();
    const zMinus = quat4.create();

    quat4.set(zForward, 0, 0, 0, -1);
    quat4.set(yForward, dval0_x, dval1_x, dval2_x, dval3);
    quat4.set(xForward, dval0_y, dval1_y, dval2_y, dval3);

    quat4.set(zPlus, dval0_z_p, dval1_z_p, dval2_z_p, dval3_z_p);
    quat4.set(zMinus, dval0_z_m, dval1_z_m, dval2_z_m, dval3_z_p);

    quat4.multiply(xForward, xForward, zMinus);
    quat4.multiply(yForward, yForward, zPlus);

    if (self.threeWayViewOrder && self.threeWayViewOrder.length === 4) {

        const top = self.threeWayViewOrder.substring(0, 2)
        const bottom = self.threeWayViewOrder.substring(2, 4)

        for (const c of bottom.trim()) {
            if (c === "X")
                self.threeWayQuats.push(xForward)
            if (c === "Y")
                self.threeWayQuats.push(yForward)
            if (c === "Z")
                self.threeWayQuats.push(zForward)
        }
        for (const c of top.trim()) {
            if (c === "X")
                self.threeWayQuats.push(xForward)
            if (c === "Y")
                self.threeWayQuats.push(yForward)
            if (c === "Z")
                self.threeWayQuats.push(zForward)
        }
    } else {
        self.threeWayQuats.push(yForward)
        self.threeWayQuats.push(zForward)
        self.threeWayQuats.push(xForward)
    }

}
