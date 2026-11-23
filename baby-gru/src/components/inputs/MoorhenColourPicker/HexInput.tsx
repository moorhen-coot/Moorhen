import { useState } from "react";
import { hexToRGB, rgbToHex } from "@/utils/utils";
import { RGBAColour } from "./MoorhenColourPicker";
import { MoorhenNumberInput } from "../MoorhenNumberInput/NumberInput";

type HexInputProps = {
    colour: RGBAColour;
    setColour: (colour: RGBAColour) => void;
    useAlpha?: boolean;
    label?: string;
    onApply?: (colour: RGBAColour) => void;
    style?: React.CSSProperties;
    ariaLabel?: string;
};

export const MoorhenHexInput = (props: HexInputProps) => {
    const { colour, setColour, useAlpha = false, onApply = null, ariaLabel = "Hex input" } = props;

    const parseHexDisplay = (value: string): string => {
        return value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    };

    const getHexForColour = (inputColour: RGBAColour): string => {
        let compactHex: string;
        if (inputColour.length === 3) {
            compactHex = rgbToHex(inputColour[0], inputColour[1], inputColour[2], true);
        } else {
            compactHex = rgbToHex(inputColour[0], inputColour[1], inputColour[2], true);
        }
        return compactHex;
    };

    const [hexInput, setHexInput] = useState<string>(getHexForColour(colour));
    const [prevSyncKey, setPrevSyncKey] = useState<string>(`${colour.join(",")}:${useAlpha ? "a" : "rgb"}`);

    const nextSyncKey = `${colour.join(",")}:${useAlpha ? "a" : "rgb"}`;
    if (prevSyncKey !== nextSyncKey) {
        setPrevSyncKey(nextSyncKey);
        setHexInput(getHexForColour(colour));
    }

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const hex = evt.target.value;
        const compactHex = parseHexDisplay(hex);
        setHexInput(compactHex);

        if (compactHex.length === 6) {
            const nextColour: RGBAColour = useAlpha
                ? (() => {
                    const [r, g, b] = hexToRGB(compactHex);
                    const alpha = colour.length === 4 ? (colour[3] > 1 ? colour[3] / 255 : colour[3]) : 1;
                    return [r, g, b, alpha];
                })()
                : hexToRGB(compactHex);

            if (nextColour) {
                setColour(nextColour);
                if (onApply) {
                    onApply(nextColour);
                }
            }
        }
    };

    const alphaPercent = colour.length === 4
        ? Math.round((colour[3] > 1 ? colour[3] / 255 : colour[3]) * 100)
        : 100;

    const handleAlphaPercentChange = (newAlphaPercent: number) => {
        const clampedAlphaPercent = Math.max(0, Math.min(100, newAlphaPercent));
        const nextAlpha = clampedAlphaPercent / 100;
        const nextColour: RGBAColour = [colour[0], colour[1], colour[2], nextAlpha];
        setColour(nextColour);
        onApply?.(nextColour);
    };

    return (<>
        <div style={{ display: "flex", alignItems: "center" }}>
            <div className="moorhen-hex-input-decorator">#</div>
            <input
                className="moorhen__hex-input"
                type="text"
                value={hexInput}
                maxLength={6}
                onChange={handleChange}
                aria-label={ariaLabel}
            /></div>

            {useAlpha && (<>
                &nbsp;<MoorhenNumberInput
                    value={alphaPercent}
                    setValue={handleAlphaPercentChange}
                    minMax={[0, 100]}
                    integer={true}
                    width="3.1rem"
                    label="%"
                    labelPosition="left"
                    tooltip="Opacity"
                /></>
            )}</>);
        
};
