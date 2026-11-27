/**
 * A map's display records outside the store slice (.roadmaps/map-display.md): the first record a map gets when it
 * reaches the store, and the locked draw origin of EM maps.
 */
import type { RootState } from "../store/MoorhenReduxStore";
import type { MoorhenMap } from "../utils/MoorhenMap";
import {
    type MapRepresentationData,
    type Vec3,
    createDefaultMapRepresentationData,
    defaultColourByMapGradient,
    withChanges,
} from "../utils/Representation/mapRepresentationData";

/**
 * The first record of a map that just reached the store: the defaults (from the map and the map preferences), the
 * map's own origin lock and colouring map (set before it had a record, e.g. EM maps are locked as they load), then
 * the display it was given (`map.initialDisplay`: a session, an MTZ load asking for colours, a map made from another).
 */
export const initialMapRepresentationData = (map: MoorhenMap, state: RootState, id: string): MapRepresentationData => {
    const settings = state.mapContourSettings;
    const base: MapRepresentationData = {
        ...createDefaultMapRepresentationData(map, { defaultMapLitLines: settings.defaultMapLitLines, defaultMapSurface: settings.defaultMapSurface }),
        id,
    };
    base.originLock = map.isOriginLocked && map.drawOrigin ? { centre: map.drawOrigin.map(coord => -coord) as Vec3 } : null;
    if (map.otherMapForColouring) {
        const otherMap = state.maps.find(item => item.molNo === map.otherMapForColouring.molNo);
        if (otherMap) {
            const { min, max, gradient } = map.otherMapForColouring;
            base.colourByMap = { mapUid: otherMap.uniqueId, min, max, gradient: gradient ?? defaultColourByMapGradient() };
        }
    }
    return map.initialDisplay ? withChanges(base, map.initialDisplay) : base;
};

/**
 * A locked map draws around `drawOrigin` (a scene origin, negated world coordinates), set to the view at the time
 * of the first draw.
 * @returns true if `drawOrigin` was set
 */
export const ensureLockedDrawOrigin = (map: MoorhenMap, sceneOrigin: number[]): boolean => {
    if (map.isOriginLocked && !map.drawOrigin) {
        map.drawOrigin = [sceneOrigin[0], sceneOrigin[1], sceneOrigin[2]];
        return true;
    }
    return false;
};

/**
 * An EM map read from an MTZ, drawn whole (origin locked): when the view leaves the unit cell drawn, move the drawn
 * cell to the one the view is in. Moving `drawOrigin` writes the map's record (MoorhenMap accessor).
 * @returns true if `drawOrigin` moved
 */
export const followViewWithLockedCell = (map: MoorhenMap, sceneOrigin: number[]): boolean => {
    if (!(map.isEM && map.dataOrigin === "mtz" && map.isOriginLocked && map.drawOrigin)) {
        return false;
    }
    let cell: MoorhenMap["headerInfo"]["cell"] | undefined;
    try {
        cell = (map.headerInfo ?? map.getSimpleHeaderInfo())?.cell;
    } catch {
        cell = undefined;
    }
    if (!cell) {
        return false;
    }
    const drawOrigin = map.drawOrigin;
    const sides = [cell.a, cell.b, cell.c];
    const inCell = sides.every((side, i) => sceneOrigin[i] >= drawOrigin[i] - side / 2 && sceneOrigin[i] <= drawOrigin[i] + side / 2);
    if (inCell) {
        return false;
    }
    map.drawOrigin = sides.map((side, i) => Math.trunc(sceneOrigin[i] / side) * side + map.originShift[i]) as Vec3;
    return true;
};
