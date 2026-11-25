import { useDispatch } from "react-redux";
import { useMapDisplay } from "../../../hooks/useMapDisplay";
import { setRequestDrawScene } from "../../../store/glRefSlice";
import { setMapColours, setNegativeMapColours, setPositiveMapColours } from "../../../store/mapContourSettingsSlice";
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

    const handlePositiveMapColorChange = (color: { r: number; g: number; b: number }) => {
        try {
            dispatch(
                setPositiveMapColours({
                    molNo: props.map.molNo,
                    rgb: color,
                })
            );
            props.map.fetchDiffMapColourAndRedraw("positiveDiffColour");
            dispatch(setRequestDrawScene());
        } catch (err) {
            console.log("err", err);
        }
    };

    const handleNegativeMapColorChange = (color: { r: number; g: number; b: number }) => {
        try {
            dispatch(
                setNegativeMapColours({
                    molNo: props.map.molNo,
                    rgb: color,
                })
            );
            props.map.fetchDiffMapColourAndRedraw("negativeDiffColour");
            dispatch(setRequestDrawScene());
        } catch (err) {
            console.log("err", err);
        }
    };

    const handleColorChange = (color: { r: number; g: number; b: number }) => {
        try {
            dispatch(setMapColours({ molNo: props.map.molNo, rgb: color }));
            props.map.fetchColourAndRedraw();
            dispatch(setRequestDrawScene());
        } catch (err) {
            console.log("err", err);
        }
    };

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
