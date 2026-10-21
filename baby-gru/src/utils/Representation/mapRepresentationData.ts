/**
 * Map representation records: the plain, serialisable part of a map's display, kept in the store
 * (`mapRepresentations` slice), saved in scenes and sessions. Drawn by `MapRepresentation` (MapRepresentation.ts).
 * See .roadmaps/map-display.md.
 */
import type { MoorhenMap } from "../MoorhenMap";
import { guid } from "../utils";

export type MapStyle = "lines" | "lit-lines" | "solid";
/** "full": draw the whole map around a fixed centre (origin lock, offered for EM maps); "local": follow the view */
export type MapDrawMode = "local" | "full";
/** 0-1 */
export type MapColour = { r: number; g: number; b: number };
export type Vec3 = [number, number, number];

export type MapRepresentationData = {
    id: string;
    mapUid: string;
    visible: boolean;
    /** Difference maps are drawn at ±level */
    contourLevel: number;
    /** One radius per draw mode, the one used is `radius[drawModeOf(data)]` */
    radius: Record<MapDrawMode, number>;
    style: MapStyle;
    /** One opacity per style, the one used is `alpha[data.style]` */
    alpha: Record<MapStyle, number>;
    /** null: the map's default colour. `colour` for maps, `positiveColour` / `negativeColour` for difference maps */
    colour: MapColour | null;
    positiveColour: MapColour | null;
    negativeColour: MapColour | null;
    /** Colour the contour by the values of another map (Coot colours, `colour` unused) */
    colourByMap: { mapUid: string; min: number; max: number } | null;
    /** Draw around a fixed centre (world coordinates, as given to Coot) instead of the view origin */
    originLock: { centre: Vec3 } | null;
};

export const drawModeOf = (data: MapRepresentationData): MapDrawMode => (data.originLock ? "full" : "local");
export const currentRadius = (data: MapRepresentationData): number => data.radius[drawModeOf(data)];
export const currentAlpha = (data: MapRepresentationData): number => data.alpha[data.style];

/**
 * The display a map gets when it is loaded (today in the MoorhenMapManager mount effect).
 * `preferences` are the global map preferences (`mapContourSettings.defaultMapLitLines` / `defaultMapSurface`).
 */
export const createDefaultMapRepresentationData = (
    map: MoorhenMap,
    preferences: { defaultMapLitLines: boolean; defaultMapSurface: boolean }
): MapRepresentationData => {
    const localRadius = map.suggestedRadius ? map.suggestedRadius * 1.2 : 15;
    // Enough to cover the whole cell from its centre (same as the map card's slider maximum)
    const fullRadius = map.isEM && map.headerInfo?.cell.a ? Math.ceil((map.headerInfo.cell.a * 1.732) / 2) : localRadius;
    let contourLevel: number;
    if (map.isEM) {
        contourLevel = map.isDifference ? 5 * map.mapRmsd : map.suggestedContourLevel;
    } else {
        contourLevel = map.isDifference ? 3 * map.mapRmsd : map.mapRmsd;
    }
    const preferredStyle: MapStyle = preferences.defaultMapLitLines ? "lit-lines" : preferences.defaultMapSurface ? "solid" : "lines";
    const centre = map.mapCentre ?? map.cellCentre;
    return {
        id: guid(),
        mapUid: map.uniqueId,
        visible: map.showOnLoad,
        contourLevel,
        radius: { local: localRadius, full: fullRadius },
        style: map.isEM ? "solid" : preferredStyle,
        alpha: { lines: 1, "lit-lines": 1, solid: 1 },
        colour: null,
        positiveColour: null,
        negativeColour: null,
        colourByMap: null,
        // mapCentre / cellCentre are scene origins (negated world coordinates)
        originLock: map.isEM && centre ? { centre: centre.map(coord => -coord) as Vec3 } : null,
    };
};
