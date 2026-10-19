import * as quat4 from 'gl-matrix/quat';
import { createXQuatFromDX, createYQuatFromDY } from '../quatUtils';
import type { MGWebGL } from '../mgWebGL';
import type { CameraTarget, MoveResult, Transition } from '../cameraController';

/**
 * Where the renderer meets the camera: the clock, the pump, and the entry points that ask for a
 * move.
 *
 * This file used to be seven tweening loops. Each held its own interpolation state and recursed
 * through requestAnimationFrame, and they differed only in which of the four fields they touched -
 * which is the whole argument for a partial target: most of the sprawl was one optional field
 * written out seven times. What remains is `advanceCamera`, which tells the camera what time it
 * is; `pumpCamera`, which keeps asking for frames while there is something to advance; and
 * `moveCameraTo`, which takes the transition as an argument rather than assuming one.
 *
 * The spin test is still its own loop, because it is a different thing: an endless rotation with
 * no destination, which the camera has no concept of yet.
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
    self.turnCameraBy(xQ);
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

/**
 * THE ANIMATED ENTRY POINTS
 *
 * Seven functions, each with its own recursive requestAnimationFrame driver holding its own copy
 * of the interpolation, differing only in which fields they touched. They are now one move each,
 * held by the camera and advanced by drawScene - which is the whole argument for a partial target:
 * most of this sprawl was one optional field expressed as seven functions.
 *
 * They are kept rather than deleted because MGWebGL is exported and something downstream may call
 * them; nothing inside Moorhen does any more. The `*Frame` drivers they used are gone, since those
 * were implementation detail that happened to be reachable, and calling one by hand never meant
 * anything.
 *
 * THREE DIFFERENCES, ALL DELIBERATE
 *
 * The motion eases rather than running at constant speed, since it is sampled by the same code
 * that samples a movie. The duration is wall-clock rather than a frame count, so a heavy scene
 * gets a move of the same length with fewer frames rather than a longer move. And `zoomChanged` is
 * announced once on arrival instead of on every frame, which setOrientationAndZoomAnimated did
 * fifteen times through setZoom.
 *
 * `self.nAnimationFrames` is no longer read. It was never honourable: every one of these set it to
 * 15 immediately before use, so an outside value was overwritten before it could take effect.
 */

/** The zoomChanged announcement, which autoClipFogByZoom and map recontouring hang off. */
const announceZoom = (self: MGWebGL, oldZoom: number) => {
    document.dispatchEvent(new CustomEvent("zoomChanged", { detail: { oldZoom, newZoom: self.zoom } }))
}

export function setOrientationAndZoomAnimated(self: MGWebGL, q, z) {
    const oldZoom = self.zoom
    moveCameraTo(self, { quat: [q[0], q[1], q[2], q[3]], zoom: z },
        { kind: "ease", seconds: CENTRING_SECONDS }).then(result => {
        if(result.completed) announceZoom(self, oldZoom)
    })
}

export function setOrientationAnimated(self: MGWebGL, q) {
    moveCameraTo(self, { quat: [q[0], q[1], q[2], q[3]] }, { kind: "ease", seconds: CENTRING_SECONDS })
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
    const oldZoom = self.zoom
    moveCameraTo(self, { origin: [newOrigin[0], newOrigin[1], newOrigin[2]], zoom: newZoom },
        { kind: "ease", seconds: CENTRING_SECONDS }).then(result => {
        if(!result.completed) return
        announceZoom(self, oldZoom)
        self.handleOriginUpdated(true)
    })
}

/**
 * Move the view centre.
 *
 * The parameter is the destination, despite its name: the old implementation computed its delta as
 * `calculateOriginDelta(oldOrigin, self.origin, 1)`, which is destination minus current, and then
 * walked from the current origin along it. Named for what it is here, since nothing depends on the
 * old name and the old one was simply wrong.
 *
 * Its duration scaled with distance - between five and fifteen frames - and that is kept, now in
 * seconds. Short hops stay quick.
 */
export function setOriginAnimated(self: MGWebGL, target: number[]): void {
    const [ DX, DY, DZ ] = self.calculateOriginDelta(target as [number, number, number], self.origin, 1)
    const distance = Math.sqrt(DX**2 + DY**2 + DZ**2)
    const frames = Math.min(15, Math.max(5, Math.floor(distance / 1.5)))

    moveCameraTo(self, { origin: [target[0], target[1], target[2]] },
        { kind: "ease", seconds: frames / 60 }).then(result => {
        if(!result.completed) return
        self.handleOriginUpdated(true)
        // A copy; onOriginChanged reaches Redux, which freezes what it is given.
        self.props.onOriginChanged([self.origin[0], self.origin[1], self.origin[2]])
    })
}

export function setZoomAnimated(self: MGWebGL, newZoom: number) {
    const oldZoom = self.zoom
    // No per-frame set_fog_range/set_clip_range: the slab follows zoom inside the camera now, so
    // the four lines that used to re-derive it by hand on every frame have nothing left to do.
    moveCameraTo(self, { zoom: newZoom }, { kind: "ease", seconds: CENTRING_SECONDS }).then(result => {
        if(result.completed) announceZoom(self, oldZoom)
    })
}
