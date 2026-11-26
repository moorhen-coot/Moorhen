import { useDispatch, useSelector, useStore } from "react-redux";
import { useMapDisplay } from "../../../hooks/useMapDisplay";
import { selectMapRepresentationsOfMap, setMapRepresentation } from "../../../store/mapRepresentationsSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenColourPicker } from "../../inputs";
import { colourTableToCssGradient } from "../../inputs/MoorhenGradientPicker/gradientPresets";
import { ColourByMapSection } from "./ColourByMapControls";

interface MoorhenMapColorSelector {
    map: moorhen.Map;
    mapIsVisible: boolean;
    /**
     * The representation it colours (a chip's edit panel). Without, every representation of the map (the card's title:
     * the only one in single-representation mode), showing the first one's colour.
     */
    recordId?: string;
}

export const MapColourSelector = (props: MoorhenMapColorSelector) => {
    const dispatch = useDispatch();

    // The map's display record has colours 0-1 (map default where none is set); the picker and the old lists 0-255
    const display = useMapDisplay(props.map, props.recordId);
    const store = useStore<moorhen.State>();
    const to255 = (colour: { r: number; g: number; b: number }) => ({ r: colour.r * 255, g: colour.g * 255, b: colour.b * 255 });
    const mapColour = to255(display.colour);
    const negativeMapColour = to255(display.negativeColour);
    const positiveMapColour = to255(display.positiveColour);

    // Coloured by another map: the swatch shows its gradient, and picking a colour goes back to a plain one
    const colourByMap = display.record?.colourByMap ?? null;
    const byMapName = useSelector((state: moorhen.State) =>
        colourByMap ? state.maps.find(item => item.uniqueId === colourByMap.mapUid)?.name : undefined
    );
    const swatch = colourByMap ? { style: { backgroundImage: colourTableToCssGradient(colourByMap.gradient) } } : {};
    const tooltip = colourByMap ? `Coloured by ${byMapName ?? "another map"}: pick a colour to use a plain one` : "Change Map Colour";

    if (mapColour === null) {
        return null;
    }

    // The picker gives colours 0-255, the map's display record keeps them 0-1. A record change redraws the map.
    const toUnit = (colour: { r: number; g: number; b: number }) => ({ r: colour.r / 255, g: colour.g / 255, b: colour.b / 255 });
    // On `recordId`'s representation, else on every representation of the map
    const changeDisplay = (changes: Parameters<typeof setMapRepresentation>[0]["changes"]) => {
        const ids = props.recordId
            ? [props.recordId]
            : selectMapRepresentationsOfMap(store.getState(), props.map.uniqueId).map(record => record.id);
        ids.forEach(id => dispatch(setMapRepresentation({ id, changes })));
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
                    tooltip={tooltip}
                    {...swatch}
                    extra={<ColourByMapSection map={props.map} recordId={props.recordId} />}
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
                    tooltip={tooltip}
                    {...swatch}
                    extra={<ColourByMapSection map={props.map} recordId={props.recordId} />}
                />
            );
        }
    };

    return <>{dropdown()}</>;
};
