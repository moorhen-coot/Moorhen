import { useSelector } from "react-redux";
import type { RootState } from "../store/MoorhenReduxStore";
import { selectIsMapVisible, selectSelectedMapRepresentation } from "../store/mapRepresentationsSlice";
import { type MapColour, type MapRepresentationData, type MapStyle, currentAlpha, currentRadius } from "../utils/Representation/mapRepresentationData";

/**
 * What a map shows, as the map card and its controls read it: from the representation they act on (the selected one,
 * else the map's first)
 */
export type MapDisplay = {
    /** Undefined until the map display driver has given the map its records (once the map is in the store) */
    record: MapRepresentationData | undefined;
    /** This representation is shown */
    visible: boolean;
    /** The map is shown: any of its representations is (the card's eye) */
    mapVisible: boolean;
    contourLevel: number;
    /** The radius of the draw mode in use (full map / around the view) */
    radius: number;
    style: MapStyle;
    /** The opacity of the style in use */
    alpha: number;
    /** 0-1, the map's default where the record has none */
    colour: MapColour;
    positiveColour: MapColour;
    negativeColour: MapColour;
};

type DisplayedMap = {
    uniqueId: string;
    suggestedContourLevel?: number | null;
    suggestedRadius?: number | null;
    defaultMapColour: MapColour;
    defaultPositiveMapColour: MapColour;
    defaultNegativeMapColour: MapColour;
};

/** A map's display from its record, with the map's own defaults where there is no record yet */
export const mapDisplayOf = (map: DisplayedMap, record: MapRepresentationData | undefined, mapVisible = record?.visible ?? false): MapDisplay => ({
    record,
    visible: record?.visible ?? false,
    mapVisible,
    contourLevel: record?.contourLevel ?? map.suggestedContourLevel ?? 1,
    radius: record ? currentRadius(record) : map.suggestedRadius ?? 15,
    style: record?.style ?? "lines",
    alpha: record ? currentAlpha(record) : 1,
    colour: record?.colour ?? map.defaultMapColour,
    positiveColour: record?.positiveColour ?? map.defaultPositiveMapColour,
    negativeColour: record?.negativeColour ?? map.defaultNegativeMapColour,
});

/**
 * A map's display, read from the representation its controls act on (`selectSelectedMapRepresentation`, see
 * .roadmaps/map-display.md). Re-renders only when that record, or whether the map is shown, changes.
 */
export const useMapDisplay = (map: DisplayedMap | null | undefined): MapDisplay | null => {
    const record = useSelector((state: RootState) => (map ? selectSelectedMapRepresentation(state, map.uniqueId) : undefined));
    const mapVisible = useSelector((state: RootState) => (map ? selectIsMapVisible(state, map.uniqueId) : false));
    return map ? mapDisplayOf(map, record, mapVisible) : null;
};
