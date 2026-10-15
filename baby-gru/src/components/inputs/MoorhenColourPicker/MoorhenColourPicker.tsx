import { RgbColorPicker, RgbaColorPicker } from "react-colorful";
import { useEffect, useRef, useState } from "react";
import { MoorhenPopover } from "../../interface-base/Popovers/Popover";
import { MoorhenTooltip } from "../../interface-base/Popovers/Tooltip";
import { MoorhenStack } from "../../interface-base/Stack/Stack";
import { MoorhenButton } from "../MoorhenButton/MoorhenButton";
import "./colour-picker.css";
import "./react-colorful.css";
import { MoorhenHexInput } from "./HexInput";
import { MoorhenColorSwatch } from "@/components/inputs/MoorhenColourPicker/MoorhenColorSwatch";
import { hexToRGB } from "@/utils/utils";

export type RGBAColour = [number, number, number] | [number, number, number, number];
type MoorhenColourPickerBase = {
    colour: RGBAColour;
    setColour?: (colour: RGBAColour) => void;
    useAlpha?: boolean;
    label?: string;
    position?: "top" | "bottom" | "left" | "right";
    onClose?: () => void;
    onOpen?: () => void;
    tooltip?: string;
    onApply?: (colour: RGBAColour) => void;
    style?: React.CSSProperties;
    ariaLabel?: string;
    asPopoverButton?: boolean;
    hexFormat?: boolean;
    showColourSwatches?: boolean;
};

type MoorhenColourPickerSingle = MoorhenColourPickerBase & {
    colour2?: null;
    setColour2?: null;
    label2?: null;
};

type MoorhenColourPickerDual = MoorhenColourPickerBase & {
    colour2: RGBAColour;
    setColour2: (colour: RGBAColour) => void;
    label2?: string;
};

type MoorhenColourPickerType = MoorhenColourPickerSingle | MoorhenColourPickerDual;

export const MoorhenColourPicker = (props: MoorhenColourPickerType) => {
    const {
        colour,
        setColour = () => {},
        label = null,
        colour2 = null,
        setColour2 = () => {},
        label2 = null,
        position = "top",
        tooltip,
        onApply = null,
        useAlpha = false,
        asPopoverButton = true,
        showColourSwatches = true,
    } = props;

    const [showColourPicker, setShowColourPicker] = useState<boolean>(false);
    const popoverRef = useRef<HTMLButtonElement>(null);

    const toRgba = (inputColour: RGBAColour): [number, number, number, number] => {
        const [r, g, b] = inputColour;
        if (inputColour.length === 4) {
            const alpha = inputColour[3] > 1 ? inputColour[3] / 255 : inputColour[3];
            return [r, g, b, alpha];
        }
        return [r, g, b, 1];
    };

    const internalColourRef = useRef<RGBAColour>(
        useAlpha && colour.length === 3 ? [colour[0], colour[1], colour[2], 1] : colour
    );

    useEffect(() => {
        internalColourRef.current = useAlpha ? toRgba(colour) : [colour[0], colour[1], colour[2]];
    }, [colour, useAlpha]);


    const popoverLink = asPopoverButton ? (
        <MoorhenTooltip tooltip={tooltip}>
            <button
                ref={popoverRef}
                onClick={() => {
                    setShowColourPicker(!showColourPicker);
                }}
                aria-label={props.ariaLabel ? props.ariaLabel : "Colour picker"}
                style={{
                    width: "25px",
                    height: "25px",
                    minWidth: "25px",
                    borderRadius: "8px",
                    flexShrink: "0",
                    border: "2px solid rgb(255, 255, 255)",
                    boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(0, 0, 0, 0.15)",
                    cursor: "pointer",
                    backgroundColor: colour2 ? "white" : `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`,
                    backgroundImage: colour2
                        ? `linear-gradient(135deg, rgb(${colour[0]}, ${colour[1]}, ${colour[2]}) 49%, white 49%, white 51%, rgb(${colour2[0]}, ${colour2[1]}, ${colour2[2]}) 51%)`
                        : "none",
                    ...props.style,
                }}
            />
        </MoorhenTooltip>
    ) : null;

    const content = (
       <> <MoorhenStack gap={3} direction="row">
                    {[{ c: colour, set: setColour, label }, colour2 && setColour2 ? { c: colour2, set: setColour2, label: label2 } : null]
                        .filter(Boolean)
                        .map(({ c, set, label }, i) => (
                            <MoorhenStack key={i} direction="column" style={{ width: "100%", textAlign: "center" }}>
                                {label ? <span>{label}</span> : null}

                                {useAlpha ? (
                                    <RgbaColorPicker
                                        color={{ r: c[0], g: c[1], b: c[2], a: toRgba(c)[3] }}
                                        onChange={({ r, g, b, a }) => {
                                            set([r, g, b, a]);
                                            internalColourRef.current = [r, g, b, a];
                                        }}
                                    />
                                ) : (
                                    <RgbColorPicker
                                        color={{ r: c[0], g: c[1], b: c[2] }}
                                        onChange={({ r, g, b }) => {
                                            set([r, g, b]);
                                            internalColourRef.current = [r, g, b];
                                        }}
                                    />
                                )}
                                {showColourSwatches && (<MoorhenColorSwatch
                                    size={13} columns={9}
                                    onClick={(newColour) => {
                                        const rgb = hexToRGB(newColour);
                                        if (rgb) {
                                            if (useAlpha) {
                                                const nextColour: RGBAColour = [rgb[0], rgb[1], rgb[2], toRgba(c)[3]];
                                                set(nextColour);
                                                internalColourRef.current = nextColour;
                                            } else {
                                                set(rgb);
                                                internalColourRef.current = rgb;
                                            }
                                        }
                                    }}
                                />)}
                                <div style={{ width: "200px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                                    <MoorhenHexInput
                                        colour={c}
                                        setColour={set}
                                        useAlpha={useAlpha}
                                    />
                                </div>
                            </MoorhenStack>
                        ))}
                </MoorhenStack>
                {onApply && <MoorhenButton onClick={() => onApply(internalColourRef.current)}>Apply</MoorhenButton>}
        </> 
    );

    return ( asPopoverButton ? 
        <>
            <MoorhenPopover
                linkRef={popoverRef}
                link={popoverLink}
                isShown={showColourPicker}
                setIsShown={setShowColourPicker}
                popoverPlacement={position}
            >
                {content}
            </MoorhenPopover>
        </> :
        <>{content}</>
    );
};

MoorhenColourPicker.displayName = "MoorhenColourPicker";


