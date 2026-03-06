import { HexColorInput, RgbColorPicker, RgbaColorPicker } from "react-colorful";
import { useRef, useState } from "react";
import { hexToRGB, rgbToHex } from "../../../utils/utils";
import { MoorhenPopover, MoorhenStack } from "../../interface-base";
import { MoorhenTooltip } from "../../interface-base/Popovers/Tooltip";
import { MoorhenButton } from "../MoorhenButton/MoorhenButton";

type RGBAColour = [number, number, number] | [number, number, number, number];
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
    } = props;
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [internalColour, setInternalColour] = useState<RGBAColour>(
        useAlpha && colour.length === 3 ? [colour[0], colour[1], colour[2], 1] : colour
    );

    const popoverLink = (
        <MoorhenTooltip tooltip={tooltip}>
            <div
                ref={popoverRef}
                onClick={() => {
                    showColourPicker;
                    setShowColourPicker(true);
                }}
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
    );

    return (
        <>
            <MoorhenPopover
                linkRef={popoverRef}
                link={popoverLink}
                isShown={showColourPicker}
                setIsShown={setShowColourPicker}
                popoverPlacement={position}
            >
                <MoorhenStack gap={3} direction="row">
                    {[{ c: colour, set: setColour, label }, colour2 && setColour2 ? { c: colour2, set: setColour2, label: label2 } : null]
                        .filter(Boolean)
                        .map(({ c, set, label }, i) => (
                            <MoorhenStack key={i} direction="column" style={{ width: "100%", textAlign: "center" }}>
                                {label ? <span>{label}</span> : null}

                                {useAlpha ? (
                                    <RgbaColorPicker
                                        color={{ r: c[0], g: c[1], b: c[2], a: c[3] }}
                                        onChange={({ r, g, b, a }) => set([r, g, b, a])}
                                    />
                                ) : (
                                    <RgbColorPicker
                                        color={{ r: c[0], g: c[1], b: c[2] }}
                                        onChange={({ r, g, b }) => {
                                            set([r, g, b]);
                                            setInternalColour([r, g, b]);
                                        }}
                                    />
                                )}
                                <div
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        justifyContent: "center",
                                        marginBottom: "0.1rem",
                                    }}
                                >
                                    <div className="moorhen-hex-input-decorator">#</div>
                                    <HexColorInput
                                        className="moorhen-hex-input"
                                        color={rgbToHex(c[0], c[1], c[2])}
                                        onChange={hex => {
                                            const [r, g, b] = hexToRGB(hex);
                                            set([r, g, b]);
                                            setInternalColour([r, g, b]);
                                        }}
                                    />
                                </div>
                            </MoorhenStack>
                        ))}
                </MoorhenStack>
                {onApply && <MoorhenButton onClick={() => onApply(internalColour)}>Apply</MoorhenButton>}
            </MoorhenPopover>
        </>
    );
};

MoorhenColourPicker.displayName = "MoorhenColourPicker";
