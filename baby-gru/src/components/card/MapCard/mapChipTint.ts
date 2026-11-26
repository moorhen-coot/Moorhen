import type { MoorhenMap } from "../../../utils/MoorhenMap";
import type { MapRepresentationData } from "../../../utils/Representation/mapRepresentationData";
import { colourTableToCssGradient } from "../../inputs/MoorhenGradientPicker/gradientPresets";

/**
 * A chip's tint: its representation's colour, or the gradient it is coloured with by another map (the border then its
 * middle colour); fainter when hidden
 */
export const mapChipTint = (map: MoorhenMap, record: MapRepresentationData): React.CSSProperties => {
    const alpha = record.visible ? 0.5 : 0.1;
    const gradient = record.colourByMap?.gradient;
    if (gradient?.length) {
        const [r, g, b] = gradient[Math.floor(gradient.length / 2)][1];
        return { backgroundImage: colourTableToCssGradient(gradient, alpha), borderColor: `rgb(${r}, ${g}, ${b})` };
    }
    const colour = (map.isDifference ? record.positiveColour : record.colour) ?? map.defaultMapColour;
    return {
        backgroundColor: `rgba(${colour.r * 255}, ${colour.g * 255}, ${colour.b * 255}, ${alpha})`,
        borderColor: `rgb(${colour.r * 255}, ${colour.g * 255}, ${colour.b * 255})`,
    };
};
