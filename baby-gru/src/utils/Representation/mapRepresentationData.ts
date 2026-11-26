/**
 * Map representation records: the plain, serialisable part of a map's display, kept in the store
 * (`mapRepresentations` slice), saved in scenes and sessions. Drawn by `MapRepresentation` (MapRepresentation.ts).
 * See .roadmaps/map-display.md.
 */
import type { MapStyle } from "../../store/mapContourSettingsSlice";
import { type GradientColourTable, gradientPresets } from "../../components/inputs/MoorhenGradientPicker/gradientPresets";
import type { MapSlicePlacement, SliceContourSpacing } from "../mapSlice/mapSlice";

/**
 * Where a map's 2D slice is and how it is contoured (the "slice" style, MoorhenMap.drawMapSlice). Kept when the map is
 * drawn another way, so that going back to the slice finds it where it was.
 */
export type MapSliceSettings = MapSlicePlacement & {
    /** Show the zero contour between a difference map's positive and negative ones */
    nodalLines: boolean;
    /** Equal steps ("linear") or each double the last ("geometric") */
    contourSpacing: SliceContourSpacing;
};

/** Some of a slice's settings, to change them (`setMapRepresentationSlice`) */
export type MapSliceChanges = Partial<MapSliceSettings>;
import type { MoorhenMap } from "../MoorhenMap";
import { guid } from "../utils";

/** "slice" draws a contoured 2D slice (MoorhenMap.drawMapSlice), the others a 3D contour */
export type { MapStyle };
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
    /**
     * Colour the contour by the values of another map, from `min` to `max` along `gradient` (as the gradient picker
     * gives it: stops 0-1, colours 0-255). `colour` is then unused.
     */
    colourByMap: { mapUid: string; min: number; max: number; gradient: GradientColourTable } | null;
    /** Draw around a fixed centre (world coordinates, as given to Coot) instead of the view origin */
    originLock: { centre: Vec3 } | null;
    /** The 2D slice, null until the map is first drawn as one (then through the centre of the view) */
    slice: MapSliceSettings | null;
    /**
     * Thicken the surface where it is seen edge-on, as looking along a shell would (viewDependentTransparency.ts).
     * Only shows while it is transparent; kept whatever the opacity, so lowering it again finds it as left.
     */
    viewDependentTransparency: boolean;
    /**
     * Shown when its map was hidden as a whole (`setMapVisible`): shown again when the map is. Absent otherwise.
     */
    hiddenWithMap?: boolean;
};

/** Fields that can be changed; `radius` and `alpha` can be given for some draw modes / styles only */
export type MapRepresentationChanges = Partial<Omit<MapRepresentationData, "id" | "mapUid" | "radius" | "alpha">> & {
    radius?: Partial<Record<MapDrawMode, number>>;
    alpha?: Partial<Record<MapStyle, number>>;
};

/**
 * A new map's display, set on the map before it is added (`MoorhenMap.initialDisplay`) and applied over the defaults
 * when its first record is made: by session loading, MTZ loading, the menu items that make a map from another.
 * `currentRadius` / `currentAlpha`: the radius of the draw mode / the opacity of the style the map ends up in.
 */
export type MapInitialDisplay = MapRepresentationChanges & { currentRadius?: number; currentAlpha?: number };

export const drawModeOf = (data: MapRepresentationData): MapDrawMode => (data.originLock ? "full" : "local");
export const currentRadius = (data: MapRepresentationData): number => data.radius[drawModeOf(data)];
export const currentAlpha = (data: MapRepresentationData): number => data.alpha[data.style] ?? 1;

/** The gradient a map coloured by another map gets unless told otherwise (a copy: the store freezes its state) */
export const defaultColourByMapGradient = (): GradientColourTable => JSON.parse(JSON.stringify(gradientPresets["Pool Party"]));

/** The radius an EM map is drawn at around the view ("Draw Local Map"), until changed */
export const EM_LOCAL_RADIUS = 30;

/**
 * The display a map gets when it is loaded.
 * `preferences` are the global map preferences (`mapContourSettings.defaultMapLitLines` / `defaultMapSurface`).
 */
export const createDefaultMapRepresentationData = (
    map: MoorhenMap,
    preferences: { defaultMapLitLines: boolean; defaultMapSurface: boolean }
): MapRepresentationData => {
    // The 1.2 is headroom so a map does not stop just past the edge of the view. A cube's suggested radius is a
    // hard limit instead (the cell repeats beyond it), so it is taken as given.
    const suggested = map.isCube ? map.suggestedRadius || 5 : map.suggestedRadius ? map.suggestedRadius * 1.2 : 15;
    // An EM map's suggested radius covers the whole map (its bounding sphere), drawn around its centre ("full");
    // around the view ("local") it is drawn small. Without a suggested radius, enough to cover the whole cell from
    // its centre (same as the map card's slider maximum)
    let localRadius = suggested;
    let fullRadius = suggested;
    if (map.isEM) {
        localRadius = EM_LOCAL_RADIUS;
        if (!map.suggestedRadius && map.headerInfo?.cell.a) {
            fullRadius = Math.ceil((map.headerInfo.cell.a * 1.732) / 2);
        }
    }
    let contourLevel: number;
    if (map.isCube) {
        // A cube says what level to contour at, in the field's own units (Psi4 writes the range covering 85% of the
        // density). Signed cube fields are flagged as difference maps, hence before the isDifference tests.
        contourLevel = map.suggestedContourLevel;
    } else if (map.isEM) {
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
        alpha: { lines: 1, "lit-lines": 1, solid: 1, slice: 1 },
        // The map's own default colours, kept in the record: a map's default depends on the maps loaded before it
        // (MoorhenMap.setDefaultColour), so it would change over a save and reload, or between scenes
        colour: map.defaultMapColour ? { ...map.defaultMapColour } : null,
        positiveColour: map.defaultPositiveMapColour ? { ...map.defaultPositiveMapColour } : null,
        negativeColour: map.defaultNegativeMapColour ? { ...map.defaultNegativeMapColour } : null,
        colourByMap: null,
        // mapCentre / cellCentre are scene origins (negated world coordinates)
        originLock: map.isEM && centre ? { centre: centre.map(coord => -coord) as Vec3 } : null,
        slice: null,
        viewDependentTransparency: false,
    };
};

/** A record with changes applied (a new object; `radius` and `alpha` merged per draw mode / style) */
export const withChanges = (data: MapRepresentationData, changes: MapInitialDisplay): MapRepresentationData => {
    const { radius, alpha, currentRadius: radiusNow, currentAlpha: alphaNow, ...rest } = changes;
    const next: MapRepresentationData = { ...data, ...rest, radius: { ...data.radius, ...radius }, alpha: { ...data.alpha, ...alpha } };
    if (radiusNow) {
        next.radius[drawModeOf(next)] = radiusNow;
    }
    if (alphaNow !== undefined) {
        next.alpha[next.style] = alphaNow;
    }
    return next;
};

/** What a map made from another (sharpened, masked, flipped...) takes of its display: level, radius, style, opacity */
export const displayToCopy = (data: MapRepresentationData | undefined): MapInitialDisplay =>
    data ? { contourLevel: data.contourLevel, radius: { ...data.radius }, style: data.style, alpha: { ...data.alpha } } : {};
