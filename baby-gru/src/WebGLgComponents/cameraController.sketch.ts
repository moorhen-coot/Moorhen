/**
 * SKETCH - the camera's contract, written to be argued with before any code moved.
 *
 * IT IS NOW BUILT, AND THIS FILE IS NO LONGER THE AUTHORITY
 *
 * cameraController.ts is. This is kept for the reasoning, which is the part that does not survive
 * in the code: why the camera had no owner, why animating meant two things at once, and why each
 * decision went the way it did. Where the two disagree about what exists, the implementation is
 * right and this is out of date.
 *
 * Three things did not survive contact, and are corrected where they appear below: decision 6 was
 * wrong about the code, decision 2's mechanism moved off the driver, and the open question at the
 * bottom is answered. CameraState also gained `eyeDistance`, which the sketch's version lacks, and
 * its four boundaries are offsets from the view centre rather than the mixture of conventions the
 * renderer used.
 *
 * WHAT IT IS FOR
 *
 * Today the camera has three homes - `origin` and `zoom` in sceneSettings, `quat` in the glRef
 * slice, and the live values in MGWebGL's `_camera` - and no owner. There is no "set the camera"
 * operation at all: there is only "the store and the renderer disagree, so close the gap", and the
 * gap-closer animates. So three concerns are fused into one mechanism:
 *
 *   - what the camera is
 *   - how it got there
 *   - how the two copies are kept in step
 *
 * Hence the symptoms. Specifying a camera requires animating to it. A movie driving the camera
 * directly provokes an animation that fights it, and the fight sustains itself because each
 * animation ends by announcing its arrival into the store, which re-triggers the reconciliation.
 * And `animating` carries two meanings at once - "a transition is in flight" and "someone owns the
 * camera" - which is why asserting it fixed the movie but felt like a trick.
 *
 * The proposal separates the three. One owner for the live value, transitions as data rather than
 * as entry points, and explicit drivers so that "who is moving the camera" is a thing the code can
 * state instead of infer.
 */

import type { Movie } from "../utils/cameraPath";

/**
 * How the clip and fog slab is decided.
 *
 * Camera, clip and fog are three separate concepts - different meanings, their own UI, and a movie
 * might want to animate the slab without moving the camera. But they cannot be separately
 * *written*: the slab is expressed as distances from the eye, and autoClipFogByZoom makes it a
 * function of zoom. Two writers for coupled values is exactly how the reconciliation loop happened.
 *
 * So the coupling is declared rather than implied. `auto` is a policy - a pure function from camera
 * to slab - applied inside the single writer as part of producing each frame's state, instead of a
 * listener reacting to a zoomChanged event after the fact. `resetClippingFogging` becomes this
 * switch, which is what it already effectively is.
 *
 * A movie whose keyframes carry explicit clip and fog implies `manual` for its duration.
 */
export type SlabPolicy =
    | { kind: "manual" }
    | { kind: "auto"; fieldDepthFront: number; fieldDepthBack: number };

/** Everything that decides what the camera sees. */
export interface CameraState {
    /** View orientation, as MGWebGL's myQuat. */
    quat: [number, number, number, number];
    /** Negated view centre, matching the existing setOrigin convention. */
    origin: [number, number, number];
    zoom: number;
    clipStart: number;
    clipEnd: number;
    fogStart: number;
    fogEnd: number;
}

/**
 * A target may name only the fields it cares about.
 *
 * "Zoom in but stay where you are" should not require restating the orientation - and more
 * importantly, a partial target means unnamed fields are left strictly alone rather than
 * interpolated from a value the requester had to go and read first. Most of the present
 * entry-point sprawl in cameraAnimations.ts - setOrientationAndZoomAnimated,
 * setOriginAndZoomAnimated, setOriginAnimated, setZoomAnimated - is this idea expressed as seven
 * functions instead of one optional field.
 */
export type CameraTarget = Partial<CameraState>;

/**
 * How to get there.
 *
 * `instant` is the operation that does not currently exist and is the reason a movie has to fight
 * the renderer. `ease` is the present centring behaviour, named rather than implied. `path` is a
 * movie: several keyframes, its own timing, velocity carried through interior keyframes.
 *
 * All three are sampled by the same code. An eased move is a two-keyframe Movie, so unifying them
 * means one interpolator, one easing curve, and one place for the end-condition and corner-turning
 * bugs that cameraPath's tests already pin down.
 */
export type Transition =
    | { kind: "instant" }
    | { kind: "ease"; seconds: number }
    | { kind: "path"; movie: Movie };

/**
 * Who is moving the camera.
 *
 * Naming the driver is what makes the policy statable. At the moment "the user is dragging",
 * "a centring animation is running" and "a movie is playing" are indistinguishable from inside
 * the camera, so the only available rule is the `if (self.animating) return` guard, which cannot
 * express "the user may interrupt a centring animation, but a movie may not be interrupted by
 * reconciliation".
 */
export type DriverName = "user" | "centring" | "movie" | "session" | "api";

export interface MoveResult {
    /** False when another driver took over before this move finished. */
    completed: boolean;
}

/**
 * A claim on the camera, held for as long as the driver is moving it.
 *
 * Acquiring supersedes whatever was running: the previous driver's in-flight move settles with
 * `completed: false` and stops being ticked. That is deliberately not a queue - two things wanting
 * the camera at once is a conflict to resolve, not work to get through in order - and it is not a
 * refusal either, because refusing is how the current `animating` guard silently drops requests.
 */
export interface CameraDriver {
    readonly name: DriverName;
    /** True until released or superseded. */
    readonly active: boolean;

    /** Put the camera somewhere, now. No transition, no announcement, no argument. */
    set(target: CameraTarget): void;

    /**
     * Move to a target over time.
     *
     * Resolves when it arrives, or when another driver supersedes it. Callers that care - a movie
     * waiting to start its next segment - can await it; callers that do not can ignore it.
     */
    moveTo(target: CameraTarget, transition: Transition): Promise<MoveResult>;

    /**
     * A relative turn, for the mouse.
     *
     * Separate from `set` because its meaning during a move is different: a move in progress
     * finishes, and deltas arriving meanwhile accumulate and are applied once it lands. Today a
     * drag during a centring animation is silently discarded - both write myQuat and the animation
     * writes last - so accumulating is strictly better than the present behaviour as well as
     * matching the intent that accidental mouse motion must not stop the camera arriving.
     *
     * The risk is a visible jump at the end, bounded by the move being a quarter of a second. If it
     * reads badly the alternative is a deliberate-drag threshold: a jitter is ignored, a real drag
     * supersedes.
     */
    turnBy(delta: [number, number, number, number]): void;

    /**
     * Drive every frame directly, for a caller that computes its own camera.
     *
     * This is what a movie export wants: it is not moving *to* anywhere, it is supplying a
     * position per tick. Supplied as a function rather than a stream of `set` calls so the
     * controller can tick it with whatever clock it is being driven by - see `tick`.
     */
    drive(sample: (seconds: number) => CameraTarget): void;

    release(): void;
}

/**
 * The camera.
 *
 * It owns the live value. The store holds an echo for the UI - sliders, the side-on widget,
 * session save - written from here and explicitly marked as such so that nothing reacts to it.
 * That is what removes the feedback loop by construction rather than by flag: there is only one
 * writer, so there is nothing to reconcile.
 */
export interface CameraController {
    /** Where the camera is now. Authoritative; read it rather than the store. */
    readonly state: Readonly<CameraState>;

    /** The driver currently moving it, if any. */
    readonly driver: DriverName | null;

    /**
     * Claim the camera.
     *
     * Reconciliation - anything that merely wants the renderer to agree with stored state - should
     * not acquire at all. It should call `settle` instead, which defers to any active driver.
     */
    acquire(name: DriverName): CameraDriver;

    /**
     * Agree with a stored value, unless somebody is actively driving.
     *
     * This is what MoorhenWebMG's effect becomes. The deference is the whole point: a movie or a
     * drag in progress means the store is out of date, not that the camera is wrong.
     */

    /**
     * Advance to a moment in time.
     *
     * Called by the renderer immediately before it draws, rather than from a loop of its own -
     * one clock, and the frame always shows what the camera says *now* rather than what it said
     * when some other loop last ran.
     *
     * The argument is why a movie export and a live preview can share everything: the live app
     * passes wall-clock time and drops frames when rendering is slow; an export passes i/fps and
     * keeps every frame. Same controller, same path arithmetic, different clock. That distinction
     * cost a day to discover empirically and belongs in the design.
     */
    tick(seconds: number): void;

    /**
     * Notified when the camera comes to rest, for the store echo and anything waiting for arrival.
     *
     * Not per frame. A driver finishing or releasing settles; `set` settles immediately, having no
     * duration; a move settles on arrival; a movie or a drag settles once at the end. So there is
     * no per-frame React cost at all, and nothing is stale the moment anything stops moving.
     *
     * The trade is that a long drag leaves a slider stale while it lasts. That is acceptable
     * because the widget being dragged is the source in that case rather than a consumer - and it
     * is the right direction to start from. Beginning with the cheap, safe rule and loosening it
     * later if measurement says a live echo is affordable is sounder than beginning with a
     * fixed-rate timer, which solves an unmeasured cost by introducing a known class of bug.
     *
     * This also replaces the originUpdate and zoomChanged CustomEvents, and must keep serving
     * whatever waited on them: a "the camera has arrived" signal is load-bearing.
     */
    subscribe(listener: (state: Readonly<CameraState>) => void): () => void;

    /** How the slab follows the camera, if at all. */
    slabPolicy: SlabPolicy;
}

/* -------------------------------------------------------------------------------------------
 * DECIDED
 *
 * 1. CLIP AND FOG - three concepts, one writer, coupling declared as SlabPolicy.
 *    Separately meaningful, never separately written. autoClipFogByZoom becomes a policy applied
 *    inside the tick rather than a listener on a zoomChanged event, which removes a participant in
 *    the loop instead of relocating it.
 *
 * 2. A MOVE FINISHES. User rotation during one accumulates and is applied on arrival, via turnBy.
 *    Accidental mouse motion must not stop the camera reaching where it was sent.
 *
 *    AS BUILT: turnBy is on the controller, not on a driver. The sketch had the mouse acquire a
 *    "user" driver and turn through that, which is self-defeating - acquiring supersedes whatever
 *    is running, so the first twitch of the mouse would cancel the very move this decision says
 *    must finish. A turn needs no claim on the camera precisely because it defers to one.
 *
 * 3. THE ECHO happens when the camera comes to rest - on settle, not per frame. Cheapest and
 *    safest, no React cost during motion, nothing stale once anything stops. A live echo can be
 *    added later if measurement says it is affordable; starting there and retreating would be the
 *    wrong way round.
 *
 * 4. THE EVENTS go, and the surface is far smaller than feared: `originUpdate` has no live
 *    listener at all - the only one is commented out in MoorhenSharedSessionManager - and
 *    `zoomChanged` has exactly one, handleZoomChanged, which dispatches autoClipFogByZoom and is
 *    the loop participant that SlabPolicy replaces. Map recontouring and the NEF vectors react to
 *    the store's `origin`, not to these events, so they are unaffected as long as the echo
 *    continues. A `settled` notification must survive for anything that waits for arrival, and
 *    external listeners need a release note.
 *
 * 5. `drive` STAYS, and `path` is expressed in terms of it internally. One mechanism, two ways in.
 *
 * 6. STEREO DERIVES, IT DOES NOT DICTATE - ASPIRED TO, NOT TRUE. The two eye views should be a
 *    pure function of CameraState, computed where the projection is built, with nothing writing
 *    back per eye. The sketch said this had to be checked against the existing side-by-side and
 *    cross-eyed paths rather than assumed. It was not checked before the work was called done, and
 *    when it finally was, the paths turned out to dictate.
 *
 *    WHAT THE CODE DOES: the multi-view, three-way and stereo branches of drawCore save origQuat
 *    and origOrigin, assign self.myQuat and self.origin per view, draw, and write the originals
 *    back - six sites, plus another save/restore pair around the anaglyph render.
 *
 *    It is not a bug today. Those writes happen inside drawScene after advanceCamera, and the
 *    restore puts back exactly what the tick set, so a move and a stereo render coexist. Two
 *    things follow anyway. A camera displaced mid-frame is only correct while every path restores
 *    it on every exit, which is an invariant nobody is checking. And since the Camera facade now
 *    copies an assigned array rather than adopting it, each of those assignments allocates, on a
 *    per-view per-frame path - small, and unmeasured, which is not the same as free.
 *
 *    Making this true means building the per-eye view matrix from CameraState where the projection
 *    is assembled, and leaving the camera alone. That is a change to drawCore, not to this
 *    contract, and it was out of scope for the migration.
 *
 * 7. SESSION RESTORE. With auto-clip on, the slab is derived from the restored zoom and the saved
 *    clip and fog are ignored; with it off, the saved values are honoured. One rule, no special
 *    cases.
 *
 *    Note this is a small, deliberate behaviour change rather than a no-op. Such sessions can
 *    exist today, because autoClipFogByZoom only recomputes on a zoom change - so with auto-clip
 *    on, dragging the clip sliders and saving preserves values that no longer follow from the
 *    zoom. Restoring one of those will now re-derive and discard the tweak. That is the right
 *    trade, since the saved state was internally inconsistent, but it should be released as a
 *    known change and not discovered by whoever saved it.
 *
 * ANSWERED
 *
 * A. WHO TICKS DURING AN EXPORT? Neither of the two options the sketch offered. The renderer
 *    always ticks, and the *time* is what the export controls: MGWebGL carries a `cameraTime`
 *    which is null for wall-clock and set to i/fps by an export before it asks for each frame.
 *    One ticker, one line in advanceCamera, and no mode where the renderer's tick means nothing.
 *
 *    The question was better than the answers in it. Both options assumed the conflict was over
 *    who calls tick, when it was only ever over whose clock it reads.
 *
 * WHAT IS STILL SCAFFOLDING
 *
 * `liveState` and `writeLive` are the migration's unfinished edge - the live state with none of
 * the rules applied, so the renderer's direct writes still land while call sites move across.
 * Everything inside the renderer now goes through the camera; the last caller reaching past it is
 * the movie player, which wrote gl.myQuat in five places and set gl.animating by hand, and is
 * why moveCameraTo still consults `animating`. When that goes, so do these, and the promise at the
 * top of cameraController.ts about a single writer stops being an intention.
 *
 * `drive` is implemented and tested and has no caller. It is what a movie export would use.
 * ------------------------------------------------------------------------------------------- */
