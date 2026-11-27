/** The preset surfaces: three quarters opaque, denser at their edges (which makes them look more transparent) */
const SURFACE = { style: "solid" as const, alpha: 0.75, viewDependentTransparency: true };

/**
 * Ready-made sets of representations for a map (.roadmaps/map-display.md), the map wizard beside the "+" of its card.
 * A preset replaces the map's representations. Levels are multiples of the map's load level (defaultContourLevel: 1
 * rms for an X-ray map, the histogram's suggestion for an EM map, where multiples of the rms suit poorly), the same
 * whatever the levels were moved to since, so a preset gives the same set every time; the card's level then moves the
 * whole set together. The new records keep the base record's radius, draw mode (origin lock) and colours, but on a
 * difference map its own colours (the cascade's apply to ordinary maps).
 */
import { guid } from "../utils";
import type { MapColour, MapRepresentationData, MapStyle } from "./mapRepresentationData";

export type MapRepresentationPreset = {
    id: string;
    name: string;
    description: string;
    /**
     * Each representation: style, level as a multiple of the map's load level (`times`), opacity of that style, a colour of its own, and
     * whether it thickens where seen edge-on ("Denser at edges", for transparent surfaces)
     */
    layers: { style: MapStyle; times: number; alpha?: number; colour?: MapColour; viewDependentTransparency?: boolean }[];
};

export const MAP_REPRESENTATION_PRESETS: MapRepresentationPreset[] = [
    {
        id: "mesh-and-surface",
        name: "Mesh + surface",
        description: "A mesh at the default level, and a transparent surface at 3 times it",
        layers: [
            { style: "lines", times: 1 },
            { ...SURFACE, times: 3 },
        ],
    },
    {
        id: "cascade",
        name: "Cascade",
        description: "Three transparent surfaces: the default level in blue, twice it in yellow, four times it in red",
        layers: [
            { ...SURFACE, times: 1, colour: { r: 0.2, g: 0.4, b: 1 } },
            { ...SURFACE, times: 2, colour: { r: 1, g: 0.85, b: 0.1 } },
            { ...SURFACE, times: 4, colour: { r: 0.9, g: 0.15, b: 0.1 } },
        ],
    },
    {
        id: "envelope",
        name: "Envelope",
        description: "A transparent surface at half the default level, where the density is, and lit lines at 1.5 times it for detail (low resolution, EM)",
        layers: [
            { ...SURFACE, times: 0.5 },
            { style: "lit-lines", times: 1.5 },
        ],
    },
];

/** The records a preset makes for a map, from one of its records, at multiples of `unit` (the map's load level) */
export const presetRecords = (
    preset: MapRepresentationPreset,
    base: MapRepresentationData,
    map: { isDifference: boolean },
    unit: number
): MapRepresentationData[] => {
    const { hiddenWithMap: _hiddenWithMap, ...rest } = base;
    return preset.layers.map(layer => ({
        ...rest,
        id: guid(),
        visible: true,
        style: layer.style,
        contourLevel: layer.times * unit,
        alpha: { ...base.alpha, [layer.style]: layer.alpha ?? 1 },
        viewDependentTransparency: layer.viewDependentTransparency ?? false,
        colour: layer.colour && !map.isDifference ? { ...layer.colour } : base.colour,
        // Coloured as the preset says, not by another map
        colourByMap: layer.colour && !map.isDifference ? null : base.colourByMap,
        slice: null,
    }));
};
