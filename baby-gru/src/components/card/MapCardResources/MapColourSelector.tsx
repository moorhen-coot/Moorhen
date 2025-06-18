import { moorhen } from "../../../types/moorhen";
import { useMemo } from "react";
import { useDispatch, useSelector} from "react-redux";
import {
    setMapColours,
    setNegativeMapColours,
    setPositiveMapColours,
} from "../../../store/mapContourSettingsSlice";
import MoorhenColourPicker from "../../inputs/MoorhenColourPicker";
import { setRequestDrawScene } from "../../../store/glRefSlice";

interface MoorhenMapColorSelector {
    map: moorhen.Map;
    mapIsVisible: boolean;
}

export const MapColourSelector = (props: MoorhenMapColorSelector) => {
    const dispatch = useDispatch();
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

       // Need to stringify to ensure the selector is stable... (dont want to return a new obj reference)
        const mapColourString = useSelector((state: moorhen.State) => {
            const map = state.mapContourSettings.mapColours.find((item) => item.molNo === props.map.molNo);
            return map ? JSON.stringify(map.rgb) : "";
        });
    
        const negativeMapColourString = useSelector((state: moorhen.State) => {
            const map = state.mapContourSettings.negativeMapColours.find((item) => item.molNo === props.map.molNo);
            return map ? JSON.stringify(map.rgb) : "";
        });
    
        const positiveMapColourString = useSelector((state: moorhen.State) => {
            const map = state.mapContourSettings.positiveMapColours.find((item) => item.molNo === props.map.molNo);
            return map ? JSON.stringify(map.rgb) : "";
        });
    
        const mapColour: { r: number; g: number; b: number } = useMemo(() => {
            if (mapColourString) {
                return JSON.parse(mapColourString);
            } else {
                return {
                    r: props.map.defaultMapColour.r * 255,
                    g: props.map.defaultMapColour.g * 255,
                    b: props.map.defaultMapColour.b * 255,
                };
            }
        }, [mapColourString]);
    
    
        const negativeMapColour: { r: number; g: number; b: number } = useMemo(() => {
            if (negativeMapColourString) {
                return JSON.parse(negativeMapColourString);
            } else {
                return {
                    r: props.map.defaultNegativeMapColour.r * 255,
                    g: props.map.defaultNegativeMapColour.g * 255,
                    b: props.map.defaultNegativeMapColour.b * 255,
                };
            }
        }, [negativeMapColourString]);
    
        const positiveMapColour: { r: number; g: number; b: number } = useMemo(() => {
            if (positiveMapColourString) {
                return JSON.parse(positiveMapColourString);
            } else {
                return {
                    r: props.map.defaultPositiveMapColour.r * 255,
                    g: props.map.defaultPositiveMapColour.g * 255,
                    b: props.map.defaultPositiveMapColour.b * 255,
                };
            }
        }, [positiveMapColourString]);

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
                setColour={(color => {
                    handleColorChange({ r: color[0], g: color[1], b: color[2] });
                })}
                position="bottom"
                tooltip="Change Map Colour"
            />
        );
    } else {
        return (
            <MoorhenColourPicker
                colour={[positiveMapColour.r, positiveMapColour.g, positiveMapColour.b]}
                setColour={(color => {
                    handlePositiveMapColorChange({ r: color[0], g: color[1], b: color[2] });
                })}
                position="bottom"
                colour2={[negativeMapColour.r, negativeMapColour.g, negativeMapColour.b]}
                setColour2={(color => {
                    handleNegativeMapColorChange({ r: color[0], g: color[1], b: color[2] });
                })}
                label="Positive"
                label2="Negative"
                tooltip="Change Map Colour"
            />
        );
    }}

    return (
        <>
        {dropdown()}
        </>
            );
};
