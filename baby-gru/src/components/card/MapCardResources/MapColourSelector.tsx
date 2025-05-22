import { HexColorInput, RgbColorPicker } from "react-colorful";
import { MoorhenColourRule } from "../../../utils/MoorhenColourRule";
import { moorhen } from "../../../types/moorhen";
import { useState, useMemo, useRef} from "react";
import { useDispatch, useSelector} from "react-redux";
import { rgbToHex } from "../../../utils/utils";
import { Popover} from "@mui/material";
import { Stack } from "react-bootstrap";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import {
    setMapColours,
    setNegativeMapColours,
    setPositiveMapColours,
} from "../../../store/mapContourSettingsSlice";
import MoorhenColourPicker from "../../inputs/MoorhenColourPicker";


interface MoorhenMapColorSelector {
    map: moorhen.Map;
    mapIsVisible: boolean;
}

export const MapColourSelector = (props: MoorhenMapColorSelector) => {
    const dispatch = useDispatch();
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false);
    const colourSwatchRef = useRef<HTMLDivElement | null>(null);

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
    
        const mapColourHex: string = useMemo(() => {
            if (mapColourString) {
                const rgb = JSON.parse(mapColourString);
                return rgbToHex(rgb.r, rgb.g, rgb.b);
            } else {
                return rgbToHex(props.map.defaultMapColour.r, props.map.defaultMapColour.g, props.map.defaultMapColour.b);
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
    
        const negativeMapColourHex: string = useMemo(() => {
            if (negativeMapColourString) {
                const rgb = JSON.parse(negativeMapColourString);
                return rgbToHex(rgb.r, rgb.g, rgb.b);
            } else {
                return rgbToHex(props.map.defaultNegativeMapColour.r, props.map.defaultNegativeMapColour.g, props.map.defaultNegativeMapColour.b);
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
    
        const positiveMapColourHex: string = useMemo(() => {
            if (positiveMapColourString) {
                const rgb = JSON.parse(positiveMapColourString);
                return rgbToHex(rgb.r, rgb.g, rgb.b);
            } else {
                return rgbToHex(props.map.defaultPositiveMapColour.r, props.map.defaultPositiveMapColour.g, props.map.defaultPositiveMapColour.b);
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
        } catch (err) {
            console.log("err", err);
        }
    };

    const handleColorChange = (color: { r: number; g: number; b: number }) => {
        try {
            dispatch(setMapColours({ molNo: props.map.molNo, rgb: color }));
            props.map.fetchColourAndRedraw();
        } catch (err) {
            console.log("err", err);
        }
    };

    let dropdown: JSX.Element;
    if (!props.map.isDifference) {
        dropdown = (
            <MoorhenColourPicker
                colour={[mapColour.r, mapColour.g, mapColour.b]}
                setColour={(color => {
                    handleColorChange({ r: color[0], g: color[1], b: color[2] });
                })}
                position="bottom"
            />          
        );
    } else {
        dropdown = (
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
            />
        );
    }

    return (
        <OverlayTrigger
            placement="top"
            overlay={
                <Tooltip
                    id="map-colour-label-tooltip"
                    title=""
                    style={{
                        zIndex: 9999,
                        backgroundColor: "rgba(0, 0, 0, 0.85)",
                        padding: "2px 10px",
                        color: "white",
                        borderRadius: 3,
                    }}
                >
                    <div>Change map colour</div>
                </Tooltip>
            }
        >
            {dropdown}
        </OverlayTrigger>
    );
};