import { RgbColorPicker } from "react-colorful";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { setBackgroundColor } from "../../store/sceneSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { hexToRGB } from "../../utils/utils";
import { MoorhenColorSwatch } from "../misc/MoorhenColorSwatch";

export const BackgroundColor = () => {
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const dispatch = useDispatch();

    const [innerBackgroundColor, setInnerBackgroundColor] = useState<{ r: number; g: number; b: number }>({
        r: 255 * backgroundColor[0],
        g: 255 * backgroundColor[1],
        b: 255 * backgroundColor[2],
    });

    useEffect(() => {
        try {
            if (
                JSON.stringify(backgroundColor) !==
                JSON.stringify([
                    innerBackgroundColor.r / 255,
                    innerBackgroundColor.g / 255,
                    innerBackgroundColor.b / 255,
                    backgroundColor[3],
                ])
            ) {
                dispatch(
                    setBackgroundColor([
                        innerBackgroundColor.r / 255,
                        innerBackgroundColor.g / 255,
                        innerBackgroundColor.b / 255,
                        backgroundColor[3],
                    ])
                );
            }
        } catch (err) {
            console.log(err);
        }
    }, [innerBackgroundColor]);

    const handleCircleClick = (col: string) => {
        try {
            const color = hexToRGB(col);
            setInnerBackgroundColor({ r: color[0], g: color[1], b: color[2] });
        } catch (err) {
            console.log("err", err);
        }
    };

    const handleColorChange = (color: { r: number; g: number; b: number }) => {
        try {
            setInnerBackgroundColor(color);
        } catch (err) {
            console.log("err", err);
        }
    };

    const swatchCols = ["#000000", "#5c5c5c", "#8a8a8a", "#cccccc", "#ffffff"];
    return (
        <>
            <RgbColorPicker color={innerBackgroundColor} onChange={handleColorChange} />
            <div
                style={{
                    padding: "0.5rem",
                    margin: "0.15rem",
                    justifyContent: "center",
                    display: "flex",
                    backgroundColor: "#e3e1e1",
                    borderRadius: "8px",
                }}
            >
                <MoorhenColorSwatch cols={swatchCols} size={20} columns={5} onClick={handleCircleClick} />
            </div>
        </>
    );
};
