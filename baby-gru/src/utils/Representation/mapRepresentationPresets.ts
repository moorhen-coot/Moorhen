/**
 * Ready-made sets of representations for a map (.roadmaps/map-display.md), offered under the "+" of its card. A
 * preset replaces the map's representations. Levels are multiples of the map's rms; the new records keep the base
 * record's radius, draw mode (origin lock) and colours, but on a difference map its own colours (the cascade's apply
 * to ordinary maps).
 */
import { guid } from "../utils";
import type { MapColour, MapRepresentationData, MapStyle } from "./mapRepresentationData";

export type MapRepresentationPreset = {
    id: string;
    name: string;
    description: string;
    /** Each representation: style, level in multiples of the rms, opacity of that style, and a colour of its own */
    layers: { style: MapStyle; sigma: number; alpha?: number; colour?: MapColour }[];
};

export const MAP_REPRESENTATION_PRESETS: MapRepresentationPreset[] = [
    {
        id: "mesh-and-surface",
        name: "Mesh + surface",
        description: "A mesh at 1σ, and a half-transparent surface at 2.5σ",
        layers: [
            { style: "lines", sigma: 1 },
            { style: "solid", sigma: 2.5, alpha: 0.5 },
        ],
    },
    {
        id: "cascade",
        name: "Cascade",
        description: "Three half-transparent surfaces: 1σ blue, 2σ yellow, 3σ red",
        layers: [
            { style: "solid", sigma: 1, alpha: 0.5, colour: { r: 0.2, g: 0.4, b: 1 } },
            { style: "solid", sigma: 2, alpha: 0.5, colour: { r: 1, g: 0.85, b: 0.1 } },
            { style: "solid", sigma: 3, alpha: 0.5, colour: { r: 0.9, g: 0.15, b: 0.1 } },
        ],
    },
    {
        id: "envelope",
        name: "Envelope",
        description: "A faint surface at 0.5σ where the density is, and lit lines at 1.5σ for detail (low resolution, EM)",
        layers: [
            { style: "solid", sigma: 0.5, alpha: 0.25 },
            { style: "lit-lines", sigma: 1.5 },
        ],
    },
];

/**
 * The records a preset makes for a map, from one of its records.
 * @param sigma - The map's rms; without one, the base record's level counts as 1σ.
 */
export const presetRecords = (
    preset: MapRepresentationPreset,
    base: MapRepresentationData,
    map: { mapRmsd?: number | null; isDifference: boolean }
): MapRepresentationData[] => {
    const unit = map.mapRmsd || base.contourLevel;
    const { hiddenWithMap: _hiddenWithMap, ...rest } = base;
    return preset.layers.map(layer => ({
        ...rest,
        id: guid(),
        visible: true,
        style: layer.style,
        contourLevel: layer.sigma * unit,
        alpha: { ...base.alpha, [layer.style]: layer.alpha ?? 1 },
        colour: layer.colour && !map.isDifference ? { ...layer.colour } : base.colour,
        // Coloured as the preset says, not by another map
        colourByMap: layer.colour && !map.isDifference ? null : base.colourByMap,
        slice: null,
    }));
};
