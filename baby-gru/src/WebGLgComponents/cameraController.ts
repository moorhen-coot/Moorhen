/**
 * The camera: one owner, transitions as data, drivers that say who is moving it.
 *
 * Pure. No GL, no store, no React - it is told the time and says where the camera is, and the
 * renderer draws that. The design and the reasoning behind each decision are in
 * cameraController.sketch.ts; this file implements it.
 *
 * WHY IT EXISTS
 *
 * The camera had three homes - origin and zoom in sceneSettings, quat in the glRef slice, the live
 * values in MGWebGL - and no owner. There was no "set the camera" operation at all: only "the store
 * and the renderer disagree, so close the gap", and the gap-closer animated. Specifying a camera
 * therefore required animating to it, a movie driving the camera directly provoked an animation
 * that fought it, and the fight sustained itself because each animation announced its arrival into
 * the store and re-triggered the reconciliation.
 *
 * Here the live value has exactly one writer, so there is nothing to reconcile. Stored state asks
 * to be agreed with by going through a driver - moveCameraTo, which declines outright while
 * somebody else holds the camera. A move in progress means the store is out of date, not that the
 * camera is wrong, and `driver` is what says so.
 *
 * THE CLOCK IS AN ARGUMENT
 *
 * `tick(seconds)` takes the time rather than reading it. The live app passes wall-clock and drops
 * frames when rendering is slow; a movie export passes i/fps and keeps every frame. Same
 * controller, same interpolation, different clock. That distinction cost a day to find empirically
 * and is the single most useful thing in this interface.
 */

import * as quat4 from "gl-matrix/quat";
import { Movie, sampleMovie } from "../utils/cameraPath";

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

/**
 * Everything that decides what the camera sees.
 *
 * THE BOUNDARIES ARE OFFSETS FROM THE VIEW CENTRE, ALL OF THEM
 *
 * This is the one real change from what the store holds today, and it removes a long-standing
 * inconsistency: clip was already relative to the centre while fog was absolute from the eye.
 *
 *     clipStart = zoom * 8                 fogStart = fogClipOffset - zoom * 8
 *     clipEnd   = zoom * 21                fogEnd   = fogClipOffset + zoom * 21
 *
 * Same two distances, two conventions. That is why both slider modals keep computing
 * `fogClipOffset - gl_fog_start` to show the user a number, and why set_clip_range has a negation
 * at its call site that cost an afternoon to understand.
 *
 * With everything relative, three things stop being needed. The sliders already want offsets, so
 * they stop converting. Moving the eye no longer drags the slab out of place, so
 * clipPlanesAfterEyeMove - added precisely to compensate - has nothing to compensate for. And a
 * movie interpolating the slab interpolates the numbers a user actually set.
 */
export interface CameraState {
    quat: Quat;
    /** Negated view centre, matching the existing setOrigin convention. */
    origin: Vec3;
    zoom: number;
    /**
     * Distance from the eye to the view centre, previously `fogClipOffset`.
     *
     * It is camera, not scene: it sets how strongly a perspective view converges, and the
     * perspective eye-distance control changes it. The Camera collaborator in camera.ts already
     * held it next to quat, zoom and origin, which was the right instinct.
     */
    eyeDistance: number;
    /** How far in front of the view centre the front clip plane sits. */
    clipFront: number;
    /** How far behind it the back clip plane sits. */
    clipBack: number;
    /** Where fog begins, in front of the centre. */
    fogFront: number;
    /** Where it reaches full density, behind the centre. */
    fogBack: number;
}

/** A target names only the fields it cares about; the rest are left strictly alone. */
export type CameraTarget = Partial<CameraState>;

export type Transition =
    | { kind: "instant" }
    | { kind: "ease"; seconds: number }
    | { kind: "path"; movie: Movie };

export type DriverName = "user" | "centring" | "movie" | "session" | "api";

/**
 * How the clip and fog slab follows the camera.
 *
 * `auto` is applied inside the tick, as part of producing each state, rather than by a listener
 * reacting after the fact. That is what keeps one writer: the slab is coupled to zoom, and two
 * writers for coupled values is how the original loop happened.
 */
export type SlabPolicy =
    | { kind: "manual" }
    | { kind: "auto"; fieldDepthFront: number; fieldDepthBack: number };

export interface MoveResult {
    /** False when another driver took over before this move finished. */
    completed: boolean;
}

export interface CameraDriver {
    readonly name: DriverName;
    readonly active: boolean;
    set(target: CameraTarget): void;
    moveTo(target: CameraTarget, transition: Transition): Promise<MoveResult>;
    /** A relative turn. During a move it accumulates and is applied on arrival. */
    turnBy(delta: Quat): void;
    /** Supply a camera per tick, for a caller computing its own path. */
    drive(sample: (seconds: number) => CameraTarget): void;
    release(): void;
}

const clone = (state: CameraState): CameraState => ({
    quat: [...state.quat] as Quat,
    origin: [...state.origin] as Vec3,
    zoom: state.zoom,
    eyeDistance: state.eyeDistance,
    clipFront: state.clipFront,
    clipBack: state.clipBack,
    fogFront: state.fogFront,
    fogBack: state.fogBack,
});

/**
 * Merge a target into a state, allocating. Use when the result is a *hypothetical* - the
 * destination of a move that has not started yet - because writing in place would arrive instantly.
 */
const merge = (state: CameraState, target: CameraTarget): CameraState => ({
    quat: target.quat ? [...target.quat] as Quat : state.quat,
    origin: target.origin ? [...target.origin] as Vec3 : state.origin,
    zoom: target.zoom ?? state.zoom,
    eyeDistance: target.eyeDistance ?? state.eyeDistance,
    clipFront: target.clipFront ?? state.clipFront,
    clipBack: target.clipBack ?? state.clipBack,
    fogFront: target.fogFront ?? state.fogFront,
    fogBack: target.fogBack ?? state.fogBack,
});

/**
 * Write into the array that is already there, rather than replacing it.
 *
 * Used only on the per-frame path. The renderer hands its quaternion and origin straight out as
 * `myQuat` and `origin`, to code that mutates them in place and to React, so a fresh array every
 * frame would both detach those mutations and re-render the tree sixty times a second for the
 * length of every move. Identity stability is a real requirement of the consumer, not tidiness.
 *
 * It also keeps the renderer's Float32Array a Float32Array once MGWebGL has installed one, instead
 * of quietly replacing it with a plain array of doubles partway through the first move.
 */
const writeQuat = (into: Quat, from: ArrayLike<number>): Quat => {
    into[0] = from[0]; into[1] = from[1]; into[2] = from[2]; into[3] = from[3];
    return into;
};

const writeVec3 = (into: Vec3, from: ArrayLike<number>): Vec3 => {
    into[0] = from[0]; into[1] = from[1]; into[2] = from[2];
    return into;
};

/**
 * Merge a target into a state that is being *committed* as the new current one, keeping the arrays
 * already there. It copies values out of the target rather than aliasing it, so a caller can still
 * mutate whatever it passed in without reaching back into the camera.
 */
const mergeLive = (state: CameraState, target: CameraTarget): CameraState => ({
    quat: target.quat ? writeQuat(state.quat, target.quat) : state.quat,
    origin: target.origin ? writeVec3(state.origin, target.origin) : state.origin,
    zoom: target.zoom ?? state.zoom,
    eyeDistance: target.eyeDistance ?? state.eyeDistance,
    clipFront: target.clipFront ?? state.clipFront,
    clipBack: target.clipBack ?? state.clipBack,
    fogFront: target.fogFront ?? state.fogFront,
    fogBack: target.fogBack ?? state.fogBack,
});

/** A two-keyframe movie, which is what an eased move is. */
const asKeyframe = (state: CameraState) => ({
    quat: quat4.fromValues(...state.quat),
    origin: [...state.origin] as Vec3,
    zoom: state.zoom,
    // Both sides now call these what they are: offsets from the view centre. cameraPath used to
    // borrow the renderer's names for absolute distances, which meant this comment had to exist.
    clipFront: state.clipFront,
    clipBack: state.clipBack,
    fogFront: state.fogFront,
    fogBack: state.fogBack,
});

const easeMovie = (from: CameraState, to: CameraState, seconds: number): Movie => ({
    keyframes: [asKeyframe(from), asKeyframe(to)],
    segments: [{ seconds: Math.max(0, seconds), motion: { kind: "move" } }],
});

/** Everything a camera path can interpolate. The eye distance is not among them - see below. */
/** Whether a write names the slab itself, in which case the auto policy stands aside. */
const touchesSlab = (target: CameraTarget): boolean =>
    target.clipFront !== undefined || target.clipBack !== undefined
    || target.fogFront !== undefined || target.fogBack !== undefined;

const PATH_FIELDS = ["quat", "origin", "zoom", "clipFront", "clipBack", "fogFront", "fogBack"] as const;
type PathField = typeof PATH_FIELDS[number];

interface ActiveMove {
    movie: Movie;
    /** Set on the first tick after the move begins, so the caller's clock sets the origin of time. */
    startedAt: number | null;
    duration: number;
    /**
     * Which fields this move may write.
     *
     * A move only touches what it was asked to change. Without this, every eased move wrote the
     * whole camera, because a two-keyframe movie is built from the full state and so carries clip
     * and fog whether or not anyone asked it to - so dragging a fog slider during a centring move
     * had the next frame quietly put it back. The move is not wrong to end where it was told; it
     * was wrong to have an opinion about fields nobody mentioned.
     *
     * A movie is different: its keyframes are authored, so everything in them is intended.
     */
    writes: ReadonlySet<PathField>;
    settle: (result: MoveResult) => void;
}

export class CameraController {

    private current: CameraState;
    private activeDriver: Driver | null = null;
    private move: ActiveMove | null = null;
    private sampler: ((seconds: number) => CameraTarget) | null = null;
    /** Turns that arrived while a move was in flight, applied when it lands. */
    private pendingTurn: Quat | null = null;
    private listeners = new Set<(state: Readonly<CameraState>) => void>();

    slabPolicy: SlabPolicy;

    constructor(initial: CameraState, slabPolicy: SlabPolicy = { kind: "manual" }) {
        this.current = clone(initial);
        this.slabPolicy = slabPolicy;
    }

    /** Where the camera is now. Authoritative; read this rather than the store. */
    get state(): Readonly<CameraState> {
        return this.current;
    }

    /**
     * The live state, writable, with none of the rules applied and nobody told.
     *
     * This began as migration scaffolding - the renderer wrote the camera in dozens of places and
     * they could not all become drivers in one commit - and a survey of what is left found that
     * most of those are gone, but that the remainder are not a backlog. They are the per-frame
     * scratch writes in drawCore: multi-view and the stereo modes save the quaternion and origin,
     * set a value for one view, draw it, and put the originals back, all within a single frame.
     *
     * Those must stay silent, and that is a design decision rather than an unpaid debt. A per-eye
     * camera is not where the view is; echoing one to the store would be wrong as well as costing
     * a dispatch per view per frame on the hot path.
     *
     * So: writes that nothing should hear about come through here. Writes that move the view go
     * through `writeLive` or a driver. The distinction is the point, and the test is
     * simple - would it be a lie to tell the rest of the application that the camera is here?
     *
     * Nothing outside the Camera facade in mgWebGLParts/camera.ts should touch it.
     */
    get liveState(): CameraState {
        return this.current;
    }

    /**
     * Set part of the live state, with the slab policy applied and listeners told.
     *
     * The renderer's own direct writes: a zoom, a slab, an orientation handed in through setQuat.
     * Distinct from `liveState` above in that somebody hears about it - which is how the store's
     * copy of the view stays current, and therefore how MoorhenWebMG's reconciling effect is kept
     * from easing the camera back to a value it only believes because nobody told it otherwise.
     *
     * The difference from assigning through `liveState` is the policy. Zoom and the slab are
     * coupled, so a zoom that did not re-derive the slab would leave the two disagreeing until
     * something else happened to put them right - which is what the zoomChanged -> autoClipFogByZoom
     * round trip was for, and what made the slab a second writer. Writing through here is what lets
     * that round trip go.
     *
     * To apply the policy after switching it on, call `reapplySlab`: an empty write now changes
     * nothing, because the policy only acts when the zoom moves.
     *
     * It does not defer to an active driver: its callers have always landed unconditionally.
     * Whether they should - whether a slab drag during a movie ought to win or wait - is a real
     * question, and not one this answers.
     */
    writeLive(part: CameraTarget): void {
        this.current = this.applySlab(mergeLive(this.current, part), touchesSlab(part));
        this.notify();
    }

    /**
     * Apply the auto policy now, whatever the zoom is doing.
     *
     * The one thing `writeLive({})` used to be for. Now that the policy only acts when the zoom
     * moves - so that a hand-set clip survives, as it always did - an empty write means what it
     * says and changes nothing, and turning the switch on needs to ask explicitly.
     */
    reapplySlab(): void {
        if (this.slabPolicy.kind === "manual") return;
        const { fieldDepthFront, fieldDepthBack } = this.slabPolicy;
        const front = this.current.zoom * fieldDepthFront;
        const back = this.current.zoom * fieldDepthBack;
        this.current = {
            ...this.current, clipFront: front, clipBack: back, fogFront: front, fogBack: back,
        };
        this.notify();
    }

    get driver(): DriverName | null {
        return this.activeDriver?.active ? this.activeDriver.name : null;
    }

    /** True while a move or a driven sequence is running. */
    get moving(): boolean {
        return this.move !== null || this.sampler !== null;
    }

    /**
     * Claim the camera, superseding whoever had it.
     *
     * Not a queue: two things wanting the camera at once is a conflict to resolve, not work to get
     * through in order. Not a refusal either - refusing is how the old `animating` guard silently
     * dropped requests.
     */
    acquire(name: DriverName): CameraDriver {
        this.supersede();
        this.activeDriver = new Driver(name, this);
        return this.activeDriver;
    }

    /**
     * Turn the camera by a relative rotation. What the mouse does.
     *
     * Not a driver operation, deliberately. Acquiring would supersede whatever was running, and
     * the rule is the opposite: a move that has been asked for should finish, and a nudge of the
     * mouse on the way must not stop the camera arriving where it was sent. So a turn that lands
     * during a move accumulates and is applied when the move does.
     *
     * That is strictly better than what happened before, which was that a drag during a centring
     * animation wrote the quaternion and the animation's next frame wrote over it - the input was
     * not deferred, it was lost. The cost is a possible visible step on arrival, bounded by how
     * far the mouse moved in a quarter of a second.
     */
    turnBy(delta: Quat): void {
        this.driverTurnBy(delta);
    }

    /** Advance to a moment in time. Called by the renderer before it draws. */
    tick(seconds: number): void {
        // A tick that happens inside a tick advances the camera by the length of its own side
        // effects, which is never what anyone meant.
        //
        // The sampler of a driven movie runs here, from inside drawScene. If anything it does
        // causes another draw - and asking the renderer to redraw after changing the scene is an
        // ordinary thing to do - that draw ticks again, samples again at a slightly later time,
        // and does it all once more. Nothing in a fade converges, because every nested sample
        // differs from the one before, so an entire segment could be consumed inside a single
        // animation frame. That cost an afternoon, and the comment it taught us is not a defence:
        // the next person to write to the scene from a sampler should not have to know.
        //
        // Returning is right rather than queueing. The outer tick is still in progress and will
        // finish with the time it was given; a nested one has nothing to add.
        if (this.ticking) return;
        this.ticking = true;
        try {
            this.tickOnce(seconds);
        } finally {
            this.ticking = false;
        }
    }

    private ticking = false;

    private tickOnce(seconds: number): void {
        if (this.sampler) {
            // A driven sequence owns the clock; it is told the time and says where to be.
            this.current = this.applySlab(mergeLive(this.current, this.sampler(seconds)));
            return;
        }

        if (!this.move) return;

        if (this.move.startedAt === null) this.move.startedAt = seconds;
        const elapsed = seconds - this.move.startedAt;

        const sample = sampleMovie(this.move.movie, Math.min(elapsed, this.move.duration));
        const writes = this.move.writes;
        const next: CameraState = { ...this.current };
        if (writes.has("quat")) next.quat = writeQuat(this.current.quat, sample.quat);
        if (writes.has("origin")) next.origin = writeVec3(this.current.origin, sample.origin);
        if (writes.has("zoom")) next.zoom = sample.zoom;
        if (writes.has("clipFront")) next.clipFront = sample.clipFront;
        if (writes.has("clipBack")) next.clipBack = sample.clipBack;
        if (writes.has("fogFront")) next.fogFront = sample.fogFront;
        if (writes.has("fogBack")) next.fogBack = sample.fogBack;
        this.current = this.applySlab(next, writes.has("clipFront"));

        if (elapsed >= this.move.duration) {
            const settle = this.move.settle;
            this.move = null;
            this.applyPendingTurn();
            settle({ completed: true });
            this.notify();
        }
    }

    /**
     * Notified when the camera comes to rest - not per frame.
     *
     * A move settles on arrival, a `set` settles at once, a driven sequence settles when released.
     * So there is no React cost during motion and nothing is stale once anything stops. A live
     * echo can be added later if measurement says it is affordable; starting there and retreating
     * would be the wrong way round.
     */
    subscribe(listener: (state: Readonly<CameraState>) => void): () => void {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    // ---- used by Driver ------------------------------------------------------------------

    /** @internal */
    driverSet(target: CameraTarget): void {
        this.move = null;
        this.current = this.applySlab(mergeLive(this.current, target), touchesSlab(target));
        this.applyPendingTurn();
        this.notify();
    }

    /** @internal */
    driverMoveTo(target: CameraTarget, transition: Transition): Promise<MoveResult> {
        if (transition.kind === "instant") {
            this.driverSet(target);
            return Promise.resolve({ completed: true });
        }

        this.abandonMove();

        if (transition.kind === "path") {
            // An authored movie means every field in its keyframes, which is the whole point of
            // having authored them.
            const duration = transition.movie.segments.reduce((t, s) => t + Math.max(0, s.seconds), 0);
            return new Promise(resolve => {
                this.move = {
                    movie: transition.movie, startedAt: null, duration,
                    writes: new Set(PATH_FIELDS), settle: resolve,
                };
            });
        }

        // The eye distance is not something a camera path can interpolate - cameraPath's keyframes
        // have no slot for it - so a move that names it applies it at once rather than dropping it
        // silently. Animating the eye would mean widening the keyframe, and nothing wants that yet.
        if (target.eyeDistance !== undefined) {
            this.current = this.applySlab(mergeLive(this.current, { eyeDistance: target.eyeDistance }));
        }

        const destination = merge(this.current, target);
        const writes = new Set(PATH_FIELDS.filter(field => target[field] !== undefined));
        return new Promise(resolve => {
            this.move = {
                movie: easeMovie(this.current, destination, transition.seconds),
                startedAt: null,
                duration: Math.max(0, transition.seconds),
                writes,
                settle: resolve,
            };
        });
    }

    /**
     * @internal
     *
     * A turn arriving during a move is remembered rather than applied or discarded. Today a drag
     * during a centring animation is lost - both write the quaternion and the animation writes
     * last - so accumulating is better than the present behaviour as well as honouring the rule
     * that accidental mouse motion must not stop the camera arriving.
     */
    driverTurnBy(delta: Quat): void {
        if (this.move) {
            const accumulated = quat4.create();
            quat4.multiply(accumulated,
                this.pendingTurn ? quat4.fromValues(...this.pendingTurn) : quat4.create(),
                quat4.fromValues(...delta));
            this.pendingTurn = [...accumulated] as Quat;
            return;
        }

        // In place, like the per-frame paths: a drag turns the camera on every mouse-move event,
        // and `quat` is the array the renderer hands out. See writeQuat.
        const turned = quat4.create();
        quat4.multiply(turned, quat4.fromValues(...this.current.quat), quat4.fromValues(...delta));
        this.current = this.applySlab({ ...this.current, quat: writeQuat(this.current.quat, turned) });
        this.notify();
    }

    /** @internal */
    driverDrive(sample: (seconds: number) => CameraTarget): void {
        this.abandonMove();
        this.sampler = sample;
    }

    /** @internal */
    driverRelease(driver: Driver): void {
        if (this.activeDriver !== driver) return;
        this.activeDriver = null;
        this.sampler = null;
        const settle = this.move?.settle;
        this.move = null;
        this.applyPendingTurn();
        settle?.({ completed: false });
        this.notify();
    }

    // ---- internals -----------------------------------------------------------------------

    private supersede(): void {
        if (this.activeDriver) this.activeDriver.invalidate();
        this.activeDriver = null;
        this.sampler = null;
        this.abandonMove();
    }

    private abandonMove(): void {
        if (!this.move) return;
        const settle = this.move.settle;
        this.move = null;
        settle({ completed: false });
    }

    private applyPendingTurn(): void {
        if (!this.pendingTurn) return;
        const turned = quat4.create();
        quat4.multiply(turned, quat4.fromValues(...this.current.quat), quat4.fromValues(...this.pendingTurn));
        this.pendingTurn = null;
        this.current = { ...this.current, quat: writeQuat(this.current.quat, turned) };
    }

    /** The slab, derived from zoom when the policy says so. One writer, no event round trip. */
    /**
     * The auto policy, applied only where it was ever meant to apply.
     *
     * The setting is called "reset clip and fog on zoom", and that is exactly what it used to do:
     * the old autoClipFogByZoom ran when the zoom changed and at no other time, so a clip set by
     * hand - from the keyboard shortcuts, the scene-slider handles, or the scripting API - stood
     * until the next zoom.
     *
     * Applying it on every write instead made all three of those useless, and silently: the value
     * was accepted, overwritten in the same breath, and the keyboard shortcut still announced
     * itself with a toast. A rotation re-derived the slab too, since turnBy writes like anything
     * else.
     *
     * @param wroteSlab  the write named clip or fog itself. Then it wins outright, even if the
     *                   zoom moved in the same write - someone setting the slab explicitly is not
     *                   asking for it to be derived.
     */
    private applySlab(state: CameraState, wroteSlab = false): CameraState {
        if (this.slabPolicy.kind === "manual") return state;
        if (wroteSlab) return state;
        // `this.current` is still the pre-write state here: every caller assigns the result.
        if (state.zoom === this.current.zoom) return state;
        const { fieldDepthFront, fieldDepthBack } = this.slabPolicy;
        // Expressed as offsets from the centre, fog and clip are the same two distances. The old
        // derivation looked like four numbers because two of them were measured from the eye.
        const front = state.zoom * fieldDepthFront;
        const back = state.zoom * fieldDepthBack;
        return { ...state, clipFront: front, clipBack: back, fogFront: front, fogBack: back };
    }

    private notify(): void {
        this.listeners.forEach(listener => listener(this.current));
    }
}

/** A claim on the camera, valid until released or superseded. */
class Driver implements CameraDriver {
    private valid = true;

    constructor(readonly name: DriverName, private readonly controller: CameraController) {}

    get active(): boolean { return this.valid; }

    /** @internal */
    invalidate(): void { this.valid = false; }

    set(target: CameraTarget): void {
        if (this.valid) this.controller.driverSet(target);
    }

    moveTo(target: CameraTarget, transition: Transition): Promise<MoveResult> {
        if (!this.valid) return Promise.resolve({ completed: false });
        return this.controller.driverMoveTo(target, transition);
    }

    turnBy(delta: Quat): void {
        if (this.valid) this.controller.driverTurnBy(delta);
    }

    drive(sample: (seconds: number) => CameraTarget): void {
        if (this.valid) this.controller.driverDrive(sample);
    }

    release(): void {
        if (!this.valid) return;
        this.valid = false;
        this.controller.driverRelease(this);
    }
}
