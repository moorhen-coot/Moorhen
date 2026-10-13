import * as quat4 from 'gl-matrix/quat';
import { createXQuatFromDX, createYQuatFromDY, quatSlerp } from '../quatUtils';
import type { MGWebGL } from '../mgWebGL';
import type { CameraTarget, MoveResult, Transition } from '../cameraController';

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

/**
 * How long a centring move takes.
 *
 * The old loop counted 15 frames, which is a quarter of a second at 60 Hz and longer than that on
 * a scene that draws slowly. This is a quarter of a second of wall-clock time whatever the frame
 * rate, dropping frames instead of stretching. Same length when the scene is fast, consistent when
 * it is not.
 */
export const CENTRING_SECONDS = 0.25;

/**
 * Advance the camera to the moment this frame represents. Called by drawScene, before it draws.
 *
 * `moving` is two field tests, so an idle scene pays nothing and the wall clock is not even read.
 *
 * THE CLOCK IS AN ARGUMENT, AND THAT IS THE POINT
 *
 * It is the whole reason a live preview and a movie export can share this path. The live app passes
 * wall-clock time, so a slow frame means the camera has moved further by the time it is drawn - the
 * move keeps its duration and loses frames, which is what a person watching wants. An export sets
 * `cameraTime` to i/fps before asking for each frame, so nothing is dropped however long rendering
 * took, and the file runs at the speed it was authored at. Same camera, same arithmetic, different
 * clock. Discovering that distinction empirically cost a day; it is one line here.
 */
export function advanceCamera(self: MGWebGL) {
    if(self.cameraController.moving) {
        self.cameraController.tick(self.cameraTime ?? performance.now() / 1000)
    }
    // Unconditionally, and after the tick: the clip planes and fog the shaders read are derived
    // from the camera rather than stored alongside it, so this is where they are brought up to
    // date. Four assignments. Doing it every frame rather than only when something moved means a
    // frame cannot be drawn with a stale slab, which is cheaper than working out who forgot.
    self.applySlabToRenderer()
}

/**
 * Keep asking for frames while the camera is moving.
 *
 * The camera itself has no loop: drawScene advances it, so something has to keep calling drawScene
 * for as long as there is anything to advance. That is all this is. It is reentrancy-guarded by
 * `cameraPumpHandle` so that two overlapping requests do not pump the scene at twice the rate.
 *
 * A movie export does not use it — the export owns its clock and asks for each frame itself, which
 * is the answer to "who ticks during an export": the renderer always does, and the export decides
 * when a frame happens and what time it happens at.
 */
export function pumpCamera(self: MGWebGL) {
    if(self.cameraPumpHandle !== null) return
    self.cameraPumpHandle = requestAnimationFrame(() => {
        self.cameraPumpHandle = null
        self.drawScene()
        if(self.cameraController.moving) pumpCamera(self)
    })
}

/** Stop the pump. Called on unmount; harmless if nothing is pumping. */
export function stopPumpingCamera(self: MGWebGL) {
    if(self.cameraPumpHandle === null) return
    cancelAnimationFrame(self.cameraPumpHandle)
    self.cameraPumpHandle = null
}

/**
 * Put the camera somewhere, over whatever time the caller asks for.
 *
 * This is the operation that did not exist before: `{ kind: "instant" }` sets the camera without
 * animating to it, which is what a movie, a session restore and an API caller all actually want.
 * Animation is now an argument rather than a precondition.
 *
 * IT DEFERS RATHER THAN FIGHTS
 *
 * Its only caller today is MoorhenWebMG's reconciling effect, which cannot tell "the user asked to
 * centre here" from "the store and the renderer have drifted apart". So it declines while anything
 * else is driving: a movie or another move in progress means the *store* is out of date, not that
 * the camera is wrong. That is the same judgement the old `if (self.animating) return` made, and
 * the same one `settle` makes in the controller.
 *
 * `animating` is checked alongside the driver because the movie spike still sets it by hand. When
 * the spike acquires a driver of its own, the first half of that test goes.
 */
export function moveCameraTo(self: MGWebGL, target: CameraTarget, transition: Transition): Promise<MoveResult> {
    if(self.animating || self.cameraController.driver !== null) {
        return Promise.resolve({ completed: false })
    }

    const driver = self.cameraController.acquire("centring")

    if(transition.kind === "instant") {
        driver.set(target)
        driver.release()
        self.drawScene()
        return Promise.resolve({ completed: true })
    }

    self.animating = true
    const arrived = driver.moveTo(target, transition)
    pumpCamera(self)
    return arrived.then(result => {
        self.animating = false
        driver.release()
        return result
    })
}

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

export function setViewAnimated(self: MGWebGL, o, q, z) {
    setOriginOrientationAndZoomAnimated(self, o, q, z)
}

/**
 * Centre, orient and zoom, smoothly. The move the user sees whenever anything re-centres the view.
 *
 * Its observable contract is unchanged: it declines while something else is driving, it ends at the
 * target, and on arrival it calls handleOriginUpdated and dispatches `zoomChanged`, which is what
 * autoClipFogByZoom and the map recontouring hang off. What changed is underneath — fifteen
 * recursive requestAnimationFrame calls holding their own interpolation state have become one move
 * held by the camera, advanced by drawScene.
 *
 * TWO DIFFERENCES WORTH NAMING, BOTH DELIBERATE
 *
 * The motion now eases in and out instead of running at constant speed, because it is sampled by
 * the same code that samples a movie, and that code eases. On a quarter-second move it reads as a
 * slightly softer landing.
 *
 * And the duration is now wall-clock rather than a frame count, so a heavy scene gets a move of the
 * same length with fewer frames in it, rather than a longer move.
 */
export function setOriginOrientationAndZoomAnimated(self: MGWebGL, o: number[], q: quat4, z: number): void {
    const oldZoom = self.zoom
    moveCameraTo(self, {
        origin: [o[0], o[1], o[2]],
        quat: [q[0], q[1], q[2], q[3]],
        zoom: z,
    }, { kind: "ease", seconds: CENTRING_SECONDS }).then(result => {
        if(!result.completed) return
        self.handleOriginUpdated(true)
        const zoomChanged = new CustomEvent("zoomChanged", { detail: { oldZoom, newZoom: self.zoom } })
        document.dispatchEvent(zoomChanged)
    })
}

export function setOriginAndZoomAnimated(self: MGWebGL, newOrigin: [number, number, number], newZoom: number) {
    self.nAnimationFrames = 15
    const deltaOrigin = self.calculateOriginDelta(newOrigin, self.origin, self.nAnimationFrames)
    const deltaZoom = (newZoom - self.zoom) / self.nAnimationFrames
    // Snapshot origin/zoom now (bind-time), matching the original .bind(this, this.origin, this.zoom, …).
    const startOrigin = self.origin
    const startZoom = self.zoom
    requestAnimationFrame(() => drawOriginAndZoomFrame(self, startOrigin, startZoom, deltaOrigin, deltaZoom, 1))
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
    // Snapshot origin now (bind-time), matching the original .bind(this, [...this.origin], …).
    const startOrigin = [...self.origin]
    requestAnimationFrame(() => drawOriginFrame(self, startOrigin, [dx, dy, dz], 1))
}

export function drawOriginFrame(self: MGWebGL, oo, d, iframe){
    self.origin = [oo[0]+iframe*d[0], oo[1]+iframe*d[1], oo[2]+iframe*d[2]];
    self.drawScene()
    if(iframe < self.nAnimationFrames){
        requestAnimationFrame(() => drawOriginFrame(self, oo, d, iframe + 1))
    } else {
        self.handleOriginUpdated(true)
        // A copy; onOriginChanged reaches Redux, which freezes what it is given.
        self.props.onOriginChanged([self.origin[0], self.origin[1], self.origin[2]])
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
