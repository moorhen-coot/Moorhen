import * as quat4 from 'gl-matrix/quat';
import { createXQuatFromDX, createYQuatFromDY, quatSlerp } from '../quatUtils';
import type { MGWebGL } from '../mgWebGL';

/**
 * Camera animation drivers — the requestAnimationFrame loops that tween the
 * view (orientation / origin / zoom) frame-by-frame, plus the `*Animated`
 * entry points that compute the deltas and kick off the first frame, and the
 * spin-test loop.
 *
 * These were methods on MGWebGL. Each `*Frame` driver recursed via
 * `requestAnimationFrame(this.frame.bind(this, …))`; as free functions the
 * recursion becomes `requestAnimationFrame(() => frame(self, …))`, so the loop
 * stays entirely inside this module. All view state (myQuat, zoom, origin,
 * nAnimationFrames, animating, doSpin, fog/clip) and the helpers the loops call
 * (drawScene, setZoom, handleOriginUpdated, calculateOriginDelta, set_fog_range,
 * set_clip_range) stay on the instance, reached through `self`.
 *
 * `self` is the live MGWebGL instance (type-only import avoids a runtime cycle).
 */

export function doSpinTestFrame(self: MGWebGL) {
    const xQ = createXQuatFromDX(0);
    const yQ = createYQuatFromDY(1);
    quat4.multiply(xQ, xQ, yQ);
    quat4.multiply(self.myQuat, self.myQuat, xQ);
    self.drawScene()
    if(self.doSpin)
        requestAnimationFrame(() => doSpinTestFrame(self));
}

export function startSpinTest(self: MGWebGL) {
    self.doSpin = true;
    requestAnimationFrame(() => doSpinTestFrame(self));
}

export function stopSpinTest(self: MGWebGL) {
    self.doSpin = false;
}

export function setOrientationFrame(self: MGWebGL, qOld, qNew, iframe) {
    const frac = iframe / self.nAnimationFrames;
    const newQuat = quatSlerp(qOld, qNew, frac)
    quat4.set(self.myQuat, newQuat[0], newQuat[1], newQuat[2], newQuat[3])
    self.drawScene()
    if(iframe < self.nAnimationFrames){
        requestAnimationFrame(() => setOrientationFrame(self, qOld, qNew, iframe + 1))
    }
}

export function setOrientationAndZoomFrame(self: MGWebGL, qOld, qNew, oldZoom, zoomDelta, iframe) {
    const frac = iframe / self.nAnimationFrames;
    const newQuat = quatSlerp(qOld, qNew, frac)
    quat4.set(self.myQuat, newQuat[0], newQuat[1], newQuat[2], newQuat[3])
    self.setZoom(oldZoom + iframe * zoomDelta)
    self.drawScene()
    if(iframe < self.nAnimationFrames){
        requestAnimationFrame(() => setOrientationAndZoomFrame(self, qOld, qNew, oldZoom, zoomDelta, iframe + 1))
    }
}

export function setOrientationAndZoomAnimated(self: MGWebGL, q, z) {
    self.nAnimationFrames = 15;
    const oldQuat = quat4.create();
    const oldZoom = self.zoom;
    const zoomDelta = (z - self.zoom) / self.nAnimationFrames
    quat4.set(oldQuat, self.myQuat[0], self.myQuat[1], self.myQuat[2], self.myQuat[3])
    requestAnimationFrame(() => setOrientationAndZoomFrame(self, oldQuat, q, oldZoom, zoomDelta, 1))
}

export function setOrientationAnimated(self: MGWebGL, q) {
    self.nAnimationFrames = 15;
    const oldQuat = quat4.create()
    quat4.set(oldQuat, self.myQuat[0], self.myQuat[1], self.myQuat[2], self.myQuat[3])
    requestAnimationFrame(() => setOrientationFrame(self, oldQuat, q, 1))
}

export function setOriginOrientationAndZoomFrame(self: MGWebGL, oo, d, qOld, qNew, oldZoom, zoomDelta, iframe) {
    const frac = iframe / self.nAnimationFrames;
    const newQuat = quatSlerp(qOld, qNew, frac)
    if(isNaN(newQuat[0])||isNaN(newQuat[1])||isNaN(newQuat[2])||isNaN(newQuat[3])){
        console.log("Something's gone wrong!!!!!!!!!!!!!")
        console.log(newQuat)
        console.log(qOld)
        console.log(qNew)
        console.log(frac)
    }
    quat4.set(self.myQuat, newQuat[0], newQuat[1], newQuat[2], newQuat[3])
    self.zoom = oldZoom + iframe * zoomDelta
    self.origin = [oo[0]+iframe*d[0], oo[1]+iframe*d[1], oo[2]+iframe*d[2]];
    self.drawScene()
    if(iframe < self.nAnimationFrames){
        requestAnimationFrame(() => setOriginOrientationAndZoomFrame(self, oo, d, qOld, qNew, oldZoom, zoomDelta, iframe + 1))
        return
    }
    self.animating = false
    self.handleOriginUpdated(true)
    const zoomChanged = new CustomEvent("zoomChanged", { detail: { oldZoom, newZoom: self.zoom } })
    document.dispatchEvent(zoomChanged)
}

export function setViewAnimated(self: MGWebGL, o, q, z) {
    setOriginOrientationAndZoomAnimated(self, o, q, z)
}

export function setOriginOrientationAndZoomAnimated(self: MGWebGL, o: number[], q: quat4, z: number): void {
    if(self.animating) return
    self.nAnimationFrames = 15;
    const old_x = self.origin[0]
    const old_y = self.origin[1]
    const old_z = self.origin[2]
    const new_x = o[0]
    const new_y = o[1]
    const new_z = o[2]
    const DX = new_x - old_x
    const DY = new_y - old_y
    const DZ = new_z - old_z
    const dx = DX/self.nAnimationFrames
    const dy = DY/self.nAnimationFrames
    const dz = DZ/self.nAnimationFrames
    const oldQuat = quat4.create();
    const oldZoom = self.zoom;
    const zoomDelta = (z - self.zoom) / self.nAnimationFrames
    quat4.set(oldQuat, self.myQuat[0], self.myQuat[1], self.myQuat[2], self.myQuat[3])
    self.animating = true
    requestAnimationFrame(() => setOriginOrientationAndZoomFrame(self, [old_x, old_y, old_z], [dx, dy, dz], oldQuat, q, oldZoom, zoomDelta, 1))
}

export function drawOriginAndZoomFrame(self: MGWebGL, oldOrigin: [number, number, number], oldZoom: number, deltaOrigin: [number, number, number], deltaZoom: number, iframe: number) {
    const [ DX, DY, DZ ] = deltaOrigin
    const [ X, Y, Z ] = oldOrigin
    self.origin = [ X + iframe * DX , Y + iframe * DY, Z + iframe * DZ ]
    self.zoom = oldZoom + deltaZoom * iframe
    self.drawScene()
    if (iframe < self.nAnimationFrames) {
        requestAnimationFrame(() => drawOriginAndZoomFrame(self, oldOrigin, oldZoom, deltaOrigin, deltaZoom, iframe + 1))
    } else {
        const zoomChanged = new CustomEvent("zoomChanged", { detail: { oldZoom, newZoom: self.zoom } })
        document.dispatchEvent(zoomChanged)
        self.handleOriginUpdated(true)
    }
}

export function setOriginAnimated(self: MGWebGL, oldOrigin: number[]): void {
    const [ DX, DY, DZ ] = self.calculateOriginDelta(oldOrigin as [number, number, number], self.origin, 1)
    const distance = Math.sqrt(DX**2 + DY**2 + DZ**2)
    const nFrames = Math.floor(distance / 1.5)
    self.nAnimationFrames = nFrames > 15 ? 15 : nFrames < 5 ? 5 : nFrames
    const dx = DX/self.nAnimationFrames
    const dy = DY/self.nAnimationFrames
    const dz = DZ/self.nAnimationFrames
    requestAnimationFrame(() => drawOriginFrame(self, [...self.origin], [dx, dy, dz], 1))
}

export function drawOriginFrame(self: MGWebGL, oo, d, iframe){
    self.origin = [oo[0]+iframe*d[0], oo[1]+iframe*d[1], oo[2]+iframe*d[2]];
    self.drawScene()
    if(iframe < self.nAnimationFrames){
        requestAnimationFrame(() => drawOriginFrame(self, oo, d, iframe + 1))
    } else {
        self.handleOriginUpdated(true)
        self.props.onOriginChanged(self.origin)
    }
}

export function drawZoomFrame(self: MGWebGL, oldZoom: number, newZoom: number, iframe: number) {
    const deltaZoom = (newZoom - oldZoom) / self.nAnimationFrames
    const currentZoom = oldZoom + deltaZoom * iframe
    self.zoom = currentZoom
    self.drawScene()
    if (iframe < self.nAnimationFrames) {
        const fieldDepthFront = 8
        const fieldDepthBack = 21
        self.set_fog_range(self.fogClipOffset - (self.zoom * fieldDepthFront), self.fogClipOffset + (self.zoom * fieldDepthBack))
        self.set_clip_range(0 - (self.zoom * fieldDepthFront), 0 + (self.zoom * fieldDepthBack))
        requestAnimationFrame(() => drawZoomFrame(self, oldZoom, newZoom, iframe + 1))
    } else {
        const zoomChanged = new CustomEvent("zoomChanged", {
            "detail": {
                oldZoom,
                newZoom
            }
        });
        document.dispatchEvent(zoomChanged);
    }
}

export function setZoomAnimated(self: MGWebGL, newZoom: number) {
    const oldZoom = self.zoom
    self.nAnimationFrames = 15
    requestAnimationFrame(() => drawZoomFrame(self, oldZoom, newZoom, 1))
}
