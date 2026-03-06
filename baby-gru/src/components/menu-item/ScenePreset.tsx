import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { setClipEnd, setClipStart, setFogEnd, setFogStart, setRequestDrawScene } from "../../store/glRefSlice";
import { setResetClippingFogging } from "../../store/sceneSettingsSlice";
import { moorhen } from "../../types/moorhen";

export const ScenePreset = () => {
    const dispatch = useDispatch();
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const zoom = useSelector((state: moorhen.State) => state.glRef.zoom);
    const fogClipOffset = useSelector((state: moorhen.State) => state.glRef.fogClipOffset);

    const [presetValue, setPresetValue] = useState<string | null>(null);

    const menuItemText = "Activate scene preset...";

    useEffect(() => {
        const fieldDepthFront: number = 8;
        const fieldDepthBack: number = 21;
        switch (presetValue) {
            case "model-building":
                dispatch(setResetClippingFogging(true));

                dispatch(setFogStart(fogClipOffset - zoom * fieldDepthFront));
                dispatch(setFogEnd(fogClipOffset + zoom * fieldDepthBack));
                dispatch(setClipStart(zoom * fieldDepthFront));
                dispatch(setClipEnd(zoom * fieldDepthBack));

                dispatch(setRequestDrawScene(true));
                break;

            case "figure-making":
                dispatch(setResetClippingFogging(false));
                dispatch(setClipStart(40));
                dispatch(setClipEnd(40));
                dispatch(setFogStart(fogClipOffset - 2));
                dispatch(setFogEnd(fogClipOffset + 120));
                dispatch(setRequestDrawScene(true));
                break;

            default:
                console.log(`Unrecognised preset... ${presetValue}`);
                break;
        }
    }, [presetValue]);

    const getToggleButton = (label: string, value: string) => {
        let borderColor: string;
        let color: string;
        if (presetValue === value) {
            if (isDark) {
                borderColor = "white";
                color = "white";
            } else {
                borderColor = "black";
                color = "black";
            }
        } else {
            borderColor = "grey";
            color = "grey";
        }

        return (
            <ToggleButton value={value} aria-label={value} style={{ borderColor: borderColor, color: color }}>
                {label}
            </ToggleButton>
        );
    };

    return (
        <>
            <p>Select a preset...</p>
            <ToggleButtonGroup
                color={isDark ? "primary" : "standard"}
                orientation="vertical"
                value={presetValue}
                onChange={(evt, newValue: string) => {
                    setPresetValue(newValue);
                }}
                exclusive
            >
                {getToggleButton("Model building", "model-building")}
                {getToggleButton("Figure making", "figure-making")}
            </ToggleButtonGroup>
        </>
    );
};
