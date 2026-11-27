import type { MoorhenMap } from "./MoorhenMap";
import type { GradientColourTable } from "../components/inputs/MoorhenGradientPicker/gradientPresets";
import { type MapRepresentationChanges, type MapRepresentationData, currentRadius } from "./Representation/mapRepresentationData";

/**
 * Colouring a map representation by another map (.roadmaps/map-display.md): its contour coloured by the other map's
 * values, from `min` to `max` along a gradient, all in the representation's record. Shared by the "Colour map by other
 * map" modal and the colour-by-map button beside a map's colour swatch.
 */

export type ColourByMapRange = { min: number; max: number };

/** RELION's local resolution maps: the filtered density, and the local resolution it is coloured by */
export const LOCAL_RESOLUTION_DENSITY = /_locres_filtered(\.mrc)?$/i;
export const LOCAL_RESOLUTION_VALUES = /_locres(\.mrc)?$/i;

/** A guess at the range to colour with: the span of the other map's values on the contour (its vertices), 3 digits */
export const guessColourByMapRange = async (map: MoorhenMap, otherMap: MoorhenMap, record?: MapRepresentationData): Promise<ColourByMapRange | null> => {
    // Where that representation is drawn: around its locked centre ("Draw full map"), else around the view
    const at = record ? { contourLevel: record.contourLevel, radius: currentRadius(record), centre: record.originLock?.centre ?? null } : undefined;
    const histogram = await map.getVerticesHistogram(otherMap.molNo, 200, at);
    if (!histogram?.counts?.length || !Number.isFinite(histogram.base) || !Number.isFinite(histogram.bin_width)) {
        return null;
    }
    return {
        min: Number(histogram.base.toPrecision(3)),
        max: Number((histogram.base + histogram.bin_width * histogram.counts.length).toPrecision(3)),
    };
};

/** The record changes that colour a representation by `otherMap` (the gradient copied: the store freezes its state) */
export const colourByMapChanges = (otherMap: MoorhenMap, range: ColourByMapRange, gradient: GradientColourTable): MapRepresentationChanges => ({
    colourByMap: { mapUid: otherMap.uniqueId, min: range.min, max: range.max, gradient: JSON.parse(JSON.stringify(gradient)) },
});

/** The record changes that end it: back to its own colour */
export const plainColourChanges: MapRepresentationChanges = { colourByMap: null };
