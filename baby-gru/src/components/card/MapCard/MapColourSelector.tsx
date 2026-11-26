import { useDispatch } from "react-redux";
import { useMapDisplay } from "../../../hooks/useMapDisplay";
import { setMapRepresentation } from "../../../store/mapRepresentationsSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenColourPicker } from "../../inputs";

interface MoorhenMapColorSelector {
    map: moorhen.Map;
    mapIsVisible: boolean;
}

export const MapColourSelector = (props: MoorhenMapColorSelector) => {
    const dispatch = useDispatch();

    // The map's display record has colours 0-1 (map default where none is set); the picker and the old lists 0-255
    const display = useMapDisplay(props.map);
    const to255 = (colour: { r: number; g: number; b: number }) => ({ r: colour.r * 255, g: colour.g * 255, b: colour.b * 255 });
    const mapColour = to255(display.colour);
    const negativeMapColour = to255(display.negativeColour);
    const positiveMapColour = to255(display.positiveColour);

    if (mapColour === null) {
        return null;
    }

    // The picker gives colours 0-255, the map's display record keeps them 0-1. A record change redraws the map.
    const toUnit = (colour: { r: number; g: number; b: number }) => ({ r: colour.r / 255, g: colour.g / 255, b: colour.b / 255 });
    // On the representation the card acts on (the selected one, else the map's first)
    const changeDisplay = (changes: Parameters<typeof setMapRepresentation>[0]["changes"]) => {
        if (display.record) dispatch(setMapRepresentation({ id: display.record.id, changes }));
    };

    const handlePositiveMapColorChange = (color: { r: number; g: number; b: number }) => changeDisplay({ positiveColour: toUnit(color) });

    const handleNegativeMapColorChange = (color: { r: number; g: number; b: number }) => changeDisplay({ negativeColour: toUnit(color) });

    // A colour of its own: no longer coloured by another map
    const handleColorChange = (color: { r: number; g: number; b: number }) => changeDisplay({ colour: toUnit(color), colourByMap: null });

    const dropdown = () => {
        if (!props.map.isDifference) {
            return (
                <MoorhenColourPicker
                    colour={[mapColour.r, mapColour.g, mapColour.b]}
                    setColour={color => {
                        handleColorChange({ r: color[0], g: color[1], b: color[2] });
                    }}
                    position="bottom"
                    tooltip="Change Map Colour"
                />
            );
        } else {
            return (
                <MoorhenColourPicker
                    colour={[positiveMapColour.r, positiveMapColour.g, positiveMapColour.b]}
                    setColour={color => {
                        handlePositiveMapColorChange({ r: color[0], g: color[1], b: color[2] });
                    }}
                    position="bottom"
                    colour2={[negativeMapColour.r, negativeMapColour.g, negativeMapColour.b]}
                    setColour2={color => {
                        handleNegativeMapColorChange({ r: color[0], g: color[1], b: color[2] });
                    }}
                    label="Positive"
                    label2="Negative"
                    tooltip="Change Map Colour"
                />
            );
        }
    };

    return <>{dropdown()}</>;
};
