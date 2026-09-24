/**
 * Where the view is centred, as opposed to how the renderer stores it.
 *
 * The scene's `origin` is the NEGATIVE of the point being looked at: drawing translates the
 * world by it, and translating by minus a point is what brings that point to the middle of the
 * screen. That is a perfectly ordinary view transform, and inside the renderer it is the right
 * thing to hold. The trouble is everywhere else. Libcoot, the scripting API, anything asking
 * "what am I looking at" wants the point itself, so the sign flip was written out by hand at
 * every one of those places - two dozen separate `-coord`s, each an opportunity to forget.
 *
 * This is that conversion, once. Nothing here changes what any of those call sites compute; it
 * gives the flip a name and one home, so that a reader can see which convention a value is in
 * from how it was obtained rather than by tracing where it came from.
 *
 * Deliberately free of any store or renderer import, so it can be used from either side and
 * cannot introduce a cycle.
 */

export type Vec3 = [number, number, number];

const negated = (v: readonly number[]): Vec3 => [-v[0], -v[1], -v[2]];

/**
 * The point the view is centred on, given the scene origin.
 *
 * Use this wherever a real world-space position is wanted - a coordinate to hand to libcoot, a
 * position to report, a centre to measure from.
 */
export const viewCentreOf = (origin: readonly number[]): Vec3 => negated(origin);

/**
 * ...and back: the origin that centres the view on a given point.
 *
 * The same arithmetic as above, named for the other direction, because at a call site the
 * direction is the thing that is easy to get wrong and impossible to see in a minus sign.
 */
export const originForViewCentre = (centre: readonly number[]): Vec3 => negated(centre);

/**
 * The view centre from the store.
 *
 * Returns a fresh array, so a component selecting it with useSelector will re-render on every
 * store change unless it is memoised - prefer selectViewCentre for that, and keep this for the
 * many non-React callers that read the store directly.
 */
export const viewCentreOfState = (state: { sceneSettings: { origin: number[] } }): Vec3 =>
    viewCentreOf(state.sceneSettings.origin);
