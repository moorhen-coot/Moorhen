/**
 * TRANSITION ONLY (.roadmaps/map-display.md, Phase 1 → 4): maps are drawn from map representation records, but the
 * UI and the public API still change map display through the old `mapContourSettings` lists (keyed by `molNo`) and
 * fields of `MoorhenMap` (`isOriginLocked`, `drawOrigin`, `otherMapForColouring`). This file translates them into
 * each map's first representation. Delete it once the components write the records (Phase 4).
 */
import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { setContourLevel, setMapFastRadius, setMapRadius, setMapStyle, showMap } from "../store/mapContourSettingsSlice";
import type { RootState } from "../store/MoorhenReduxStore";
import type { MoorhenMap } from "../utils/MoorhenMap";
import {
    type MapColour,
    type MapRepresentationData,
    type Vec3,
    createDefaultMapRepresentationData,
    drawModeOf,
} from "../utils/Representation/mapRepresentationData";

type ContourSettings = RootState["mapContourSettings"];
type RGB255 = { r: number; g: number; b: number };

const byMolNo = <T extends { molNo: number }>(list: T[], molNo: number): T | undefined => list.find(item => item.molNo === molNo);

const preferencesOf = (settings: ContourSettings) => ({
    defaultMapLitLines: settings.defaultMapLitLines,
    defaultMapSurface: settings.defaultMapSurface,
});

/**
 * Write the default display of a map that just reached the store into the old lists (what MoorhenMapManager did when
 * it mounted). Values already there are kept: a session load or a menu item may have set them before adding the map.
 */
export const initialiseLegacyMapSettings = (map: MoorhenMap, settings: ContourSettings, dispatch: Dispatch<UnknownAction>): void => {
    const defaults = createDefaultMapRepresentationData(map, preferencesOf(settings));
    const molNo = map.molNo;
    if (map.showOnLoad && !settings.visibleMaps.includes(molNo)) {
        dispatch(showMap(map));
    }
    if (!byMolNo(settings.contourLevels, molNo)) {
        dispatch(setContourLevel({ molNo, contourLevel: defaults.contourLevel }));
    }
    if (!byMolNo(settings.mapRadii, molNo)) {
        dispatch(setMapRadius({ molNo, radius: defaults.radius.local }));
    }
    if (!byMolNo(settings.mapStyles, molNo)) {
        dispatch(setMapStyle({ molNo, style: defaults.style }));
    }
    if (!byMolNo(settings.mapFastRadii, molNo)) {
        dispatch(setMapFastRadius({ molNo, radius: -1 }));
    }
};

/**
 * A locked map draws around `drawOrigin` (a scene origin, negated world coordinates), set to the view at the time
 * of the first draw, as `MoorhenMap.doCootContour` did.
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
 * cell to the one the view is in (was MapOriginListener).
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

const toUnitColour = (rgb: RGB255 | undefined): MapColour | null => (rgb ? { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 } : null);

/**
 * The first representation of a map, as the old lists and map fields describe it. `current` (the record in the
 * store, if any) keeps what the old lists cannot say: the opacity of the other styles, the radius of the other draw
 * mode.
 */
export const legacyRepresentationData = (
    map: MoorhenMap,
    state: RootState,
    id: string,
    current: MapRepresentationData | undefined
): MapRepresentationData => {
    const settings = state.mapContourSettings;
    const molNo = map.molNo;
    const base = current ?? { ...createDefaultMapRepresentationData(map, preferencesOf(settings)), id };

    const style = byMolNo(settings.mapStyles, molNo)?.style ?? base.style;
    const originLock = map.isOriginLocked && map.drawOrigin ? { centre: map.drawOrigin.map(coord => -coord) as Vec3 } : null;
    const radius = { ...base.radius };
    const legacyRadius = byMolNo(settings.mapRadii, molNo)?.radius;
    if (legacyRadius) {
        radius[drawModeOf({ ...base, originLock })] = legacyRadius;
    }
    const alpha = { ...base.alpha };
    // A session without alpha reads back 0 (proto3 has no unset float): 0 means the default, as in getMapContourParams
    alpha[style] = byMolNo(settings.mapAlpha, molNo)?.alpha || 1;

    let colourByMap: MapRepresentationData["colourByMap"] = null;
    if (map.otherMapForColouring) {
        const otherMap = state.maps.find(item => item.molNo === map.otherMapForColouring.molNo);
        if (otherMap) {
            colourByMap = { mapUid: otherMap.uniqueId, min: map.otherMapForColouring.min, max: map.otherMapForColouring.max };
        }
    }

    return {
        ...base,
        visible: settings.visibleMaps.includes(molNo),
        contourLevel: byMolNo(settings.contourLevels, molNo)?.contourLevel ?? base.contourLevel,
        radius,
        style,
        alpha,
        colour: toUnitColour(byMolNo(settings.mapColours, molNo)?.rgb),
        positiveColour: toUnitColour(byMolNo(settings.positiveMapColours, molNo)?.rgb),
        negativeColour: toUnitColour(byMolNo(settings.negativeMapColours, molNo)?.rgb),
        colourByMap,
        originLock,
    };
};

/** The fast-contour radius of a map (old `mapFastRadii`, -1 or null when off), null when off */
export const legacyFastRadius = (map: MoorhenMap, settings: ContourSettings): number | null => {
    const radius = byMolNo(settings.mapFastRadii, map.molNo)?.radius;
    return radius && radius > 0 ? radius : null;
};
