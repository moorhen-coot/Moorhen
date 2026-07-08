import * as quat4 from 'gl-matrix/quat';

/**
 * Camera — collaborator object owning the core view state that used to live
 * directly on the MGWebGL instance: the rotation quaternion, zoom factor,
 * origin (rotation/translation centre) and the fog/clip offset.
 *
 * MGWebGL exposes these through get/set accessors (`myQuat`, `zoom`, `origin`,
 * `fogClipOffset`) that delegate here, so the external interface
 * (`glRef.current.zoom` etc.) is unchanged — the state has simply moved.
 *
 * IMPORTANT invariant: the getters on MGWebGL must return the *live* objects
 * held here (not copies). A great deal of MGWebGL code mutates these in place,
 * e.g. `quat4.multiply(this.myQuat, this.myQuat, xQ)` or `this.origin[0] = …`.
 * Returning the live reference keeps every such mutation working and visible
 * here automatically. Whole-value reassignment (`this.myQuat = q`) flows
 * through the setters below.
 */
export class Camera {
    /** Rotation quaternion. Null until initialised in componentDidMount, matching prior behaviour. */
    quat: quat4 | null;
    /** Zoom factor. Null until initialised, matching prior behaviour. */
    zoom: number | null;
    /** Rotation / translation centre in world coordinates. */
    origin: [number, number, number];
    /** Offset applied to fog and clip planes. */
    fogClipOffset: number;

    constructor() {
        // Mirror the exact initial values MGWebGL used before extraction.
        this.quat = null;
        this.zoom = null;
        this.origin = [0.0, 0.0, 0.0];
        this.fogClipOffset = 250.0;
    }
}
