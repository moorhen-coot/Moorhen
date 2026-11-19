/**
 * Wiring a movie to the parts of the scene that follow the view centre.
 *
 * originFollowing.ts says *what* has to be brought up to date and takes an origin to do it at.
 * This is the small amount of looking-things-up that stands between it and a renderer: which maps
 * are visible, which molecules exist, and how far the camera may travel before any of it matters.
 */

import type { OriginFollowingScene } from "./originFollowing";
import type { MoorhenMap } from "./MoorhenMap";
import type { MoorhenMolecule } from "./MoorhenMolecule";
import type { webGL } from "../types/mgWebGL";

/**
 * How far the centre travels before the scene is brought up to date, as a fraction of the
 * tightest contoured sphere.
 *
 * An eighth, which on a default 15 angstrom map is a shade under 2 angstrom. The useful range is
 * wider than it looks: the sphere still covers the view until the centre has moved a good part of
 * its radius, so this errs well inside what would be visible, and the cost of erring is only some
 * contouring that nobody asked for.
 */
const TRAVEL_FRACTION = 1 / 8;

/** With no maps in the scene there is no radius to take a fraction of. */
const NO_MAPS_DISTANCE = 1.0;

/** Never less than this, however small a map's radius: below it the contouring never stops. */
const SMALLEST_DISTANCE = 0.25;

/**
 * How far the camera may travel before the scene is told, for this scene as it stands now.
 *
 * Measured from the smallest visible contoured sphere, because that is the first one to stop
 * covering the view. A map with a locked origin is left out: it does not follow the centre, so it
 * has no opinion about how far the centre may go.
 */
export const echoDistanceFor = (gl: webGL.MGWebGL): number => {
    const state = gl.store.getState();
    const visible = state.mapContourSettings.visibleMaps;
    const radii = (state.maps as unknown as MoorhenMap[])
        .filter(map => visible.includes(map.molNo) && !map.isOriginLocked)
        .map(map =>
            state.mapContourSettings.mapRadii.find(item => item.molNo === map.molNo)?.radius
            ?? map.suggestedRadius
            ?? 15);
    if (radii.length === 0) return NO_MAPS_DISTANCE;
    return Math.max(SMALLEST_DISTANCE, Math.min(...radii) * TRAVEL_FRACTION);
};

/**
 * The scene an export drives directly, read from the store each time it is asked for.
 *
 * Read afresh rather than captured once because a movie is long enough for the scene to change
 * underneath it - a map hidden, a molecule deleted - and a stale list would contour a map that is
 * no longer drawn, or miss one that now is.
 */
export const sceneFollowingOrigin = (gl: webGL.MGWebGL): (() => OriginFollowingScene | null) => () => {
    const state = gl.store.getState();
    const molecules = state.molecules.moleculeList as unknown as MoorhenMolecule[];
    const maps = state.maps as unknown as MoorhenMap[];
    // Both share one command centre; whichever is to hand will do, and with neither there is
    // nothing in the scene that could follow anything.
    const commandCentre = molecules[0]?.commandCentre ?? maps[0]?.commandCentre;
    if (!commandCentre) return null;
    return {
        molecules,
        maps,
        visibleMapNumbers: state.mapContourSettings.visibleMaps,
        commandCentre,
        store: gl.store,
    };
};
