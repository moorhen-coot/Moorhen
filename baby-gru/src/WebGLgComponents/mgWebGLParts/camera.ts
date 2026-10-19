import * as quat4 from 'gl-matrix/quat';
import { CameraController, CameraState } from '../cameraController';

/**
 * Camera — the seam between MGWebGL and the camera controller.
 *
 * It used to be a plain record of four fields lifted off the MGWebGL instance: the rotation
 * quaternion, zoom factor, origin and the fog/clip offset. It now holds a {@link CameraController}
 * and those four properties read and write through it, so there is exactly one object that knows
 * where the camera is. MGWebGL's `myQuat` / `zoom` / `origin` / `fogClipOffset` accessors delegate
 * here as they always did, so no call site changes and nothing behaves differently.
 *
 * WHAT THIS SLICE DOES AND DOES NOT DO
 *
 * It moves the *home* of the live camera, not the *authority* over it. Writes still arrive from
 * wherever they always did, through {@link CameraController.liveState}, which applies none of the
 * controller's rules. Drivers, transitions, the tick and the slab policy all exist and are tested,
 * but nothing uses them yet. That is deliberate: this commit should be impossible to see from the
 * outside, so that when something does change later, the change is the only suspect.
 *
 * THE LIVE-REFERENCE INVARIANT STILL HOLDS
 *
 * A great deal of MGWebGL mutates these in place — `quat4.multiply(this.myQuat, this.myQuat, xQ)`,
 * `quat4.set(self.myQuat, 0, 0, 0, -1)`. The getters therefore return the live objects the
 * controller holds, not copies, so every such mutation keeps working and stays visible here. This
 * is why the facade uses `liveState` rather than `settle`: `settle` copies the arrays it is given,
 * which would silently detach the quaternion from the forty places that mutate it.
 *
 * THE NULL PHASE IS GONE, AND IT COST NOTHING
 *
 * `myQuat` and `zoom` used to be null between phase 1 of MGWebGL's mount and phase 2, where the
 * real values are set. A controller cannot hold null, so the first attempt here masked it with two
 * booleans — which immediately mistranslated a write arriving *through* the controller as "still
 * unset", and would have done so again every time a driver moved the camera.
 *
 * The null phase is not worth that. Nothing in the codebase ever tested either field for null, and
 * nothing reads them between the two halves of mount. More to the point, the values this class
 * starts from are the identical values phase 2 goes on to assign — the quaternion (0, 0, 0, -1)
 * and zoom 1.0 — so anything that did read early would see the number it was going to see anyway.
 * The two `= null` lines in initInstanceState are therefore removed rather than reproduced.
 */

/**
 * What MGWebGL starts from, read off initInstanceState and initGLState.
 *
 * The slab numbers are the wide-open ones the renderer actually begins with, before any molecule
 * has been loaded, derived from the clip planes and fog it sets at mount:
 *
 *     gl_clipPlane0[3] = -eyeDistance - clipStart = -0.0   →   clipFront = 250
 *     gl_clipPlane1[3] =  eyeDistance + clipEnd   = 1000   →   clipBack  = 750
 *     gl_fog_start     =  eyeDistance             =  250   →   fogFront  = 0
 *     gl_fog_end       =  eyeDistance + 1000      = 1250   →   fogBack   = 1000
 *
 * They are recorded faithfully rather than plausibly: the renderer still owns the real clip and fog
 * (`gl_clipPlane0[3]`, `gl_fog_start`) and nothing reads these four yet, so the only thing that
 * could make them wrong later is having invented them now.
 */
const INITIAL_CAMERA: CameraState = {
    quat: [0.0, 0.0, 0.0, -1.0],
    origin: [0.0, 0.0, 0.0],
    zoom: 1.0,
    eyeDistance: 250.0,
    clipFront: 250.0,
    clipBack: 750.0,
    fogFront: 0.0,
    fogBack: 1000.0,
};

/**
 * Take a copy of an assigned array, of the same kind, so the camera owns its own storage.
 *
 * THE CAMERA'S ARRAYS ARE THE CAMERA'S
 *
 * The per-frame paths write the quaternion and origin in place, so whatever array the camera holds
 * had better be writable and had better not be shared with anyone who assumes otherwise. Adopting
 * a caller's array breaks both halves of that.
 *
 * It broke concretely: Redux Toolkit freezes state in development, so once a camera array had been
 * dispatched into the store it could never be written again, and the next frame of the next move
 * threw "Cannot assign to read only property '0'". The leak was in both directions - a store-owned
 * array arriving through `setOrigin`, and the camera's own array leaving through `onOriginChanged`
 * and being frozen where it lay. Copying here closes the way in; the dispatch sites copy on the way
 * out.
 *
 * A typed array copies as a typed array, so a Float32Array assigned by MGWebGL stays one.
 */
const ownCopy = <T extends ArrayLike<number>>(values: T): T =>
    (ArrayBuffer.isView(values) ? (values as any).slice() : Array.from(values as ArrayLike<number>)) as T;

export class Camera {

    /**
     * The camera controller. The handle later slices reach for: `glRef.current.cameraController`.
     */
    readonly controller: CameraController;

    constructor() {
        this.controller = new CameraController(INITIAL_CAMERA);
    }

    /** Rotation quaternion. The live object: MGWebGL mutates it in place. */
    get quat(): quat4 {
        return this.controller.liveState.quat as unknown as quat4;
    }
    set quat(q: quat4) {
        this.controller.liveState.quat = ownCopy(q) as unknown as CameraState["quat"];
    }

    /**
     * Zoom factor.
     *
     * Written through the controller rather than straight into the state, because the slab follows
     * zoom under the auto policy and the two must not be allowed to disagree even briefly. Every
     * `self.zoom = x` in the renderer therefore re-derives clip and fog, which is what makes the
     * old zoomChanged -> autoClipFogByZoom -> store -> set_clip_range round trip unnecessary.
     */
    get zoom(): number {
        return this.controller.liveState.zoom;
    }
    set zoom(z: number) {
        this.controller.writeLive({ zoom: z });
    }

    /** Rotation / translation centre in world coordinates. Negated, per setOrigin's convention. */
    get origin(): [number, number, number] {
        return this.controller.liveState.origin;
    }
    set origin(o: [number, number, number]) {
        this.controller.liveState.origin = ownCopy(o) as [number, number, number];
    }

    /**
     * Distance from the eye to the view centre; fog and the clip planes are offset by it.
     *
     * The controller calls this `eyeDistance`, which is what it is. The old name stays on this
     * side of the seam until the call sites move.
     */
    get fogClipOffset(): number {
        return this.controller.liveState.eyeDistance;
    }
    set fogClipOffset(v: number) {
        this.controller.liveState.eyeDistance = v;
    }
}
