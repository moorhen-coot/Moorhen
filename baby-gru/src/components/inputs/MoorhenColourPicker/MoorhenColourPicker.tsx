import { useState, useEffect } from "react";
import { Popover } from "@mui/material";
import { HexColorInput, RgbColorPicker, RgbaColorPicker } from "react-colorful";
import { hexToRGB, rgbToHex } from "../../../utils/utils";
import { Stack } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";

type MoorhenColourPickerBase = {
    colour: [number, number, number];
    setColour?: (colour: [number, number, number]) => void;
    useAlpha?: boolean;
    alpha?: number;
    label?: string;
    setColourWithAlpha?: (colour: [number, number, number, number]) => void;
    position?: string;
    onClose?: () => void;
    onOpen?: () => void;
    tooltip?: string;
};

type MoorhenColourPickerSingle = MoorhenColourPickerBase & {
    colour2?: null;
    setColour2?: null;
    label2?: null;
};

type MoorhenColourPickerDual = MoorhenColourPickerBase & {
    colour2: [number, number, number];
    setColour2: (colour: [number, number, number]) => void;
    label2?: string;
};

type MoorhenColourPickerType = MoorhenColourPickerSingle | MoorhenColourPickerDual;

/**
 * MoorhenColourPicker component props
 *
 * @typedef {object} MoorhenColourPickerBase
 * @prop {number[]} colour
 *   The primary RGB color value as an array of three numbers [number, number, number].
 * @prop {function} setColour
 *   Callback to update the primary color. (colour: [number, number, number]) => void.
 * @prop {string} [label]
 *   Optional label for the primary color picker.
 * @prop {string} [position="top"]
 *   Popover position ("top" or "bottom").
 * @prop {function} [onClose]
 *   Callback fired when the color picker popover closes. () => void.
 * @prop {function} [onOpen]
 *   Callback fired when the color picker popover opens.() => void.
 * @prop {string} [tooltip]
 *   Tooltip text for the color swatch.
 *
 * @typedef {object} MoorhenColourPickerDual
 *   Extends MoorhenColourPickerBase for a dual color picker.
 * @prop {number[]} colour2
 *   The secondary RGB color value [number, number, number].
 * @prop {function} setColour2
 *   Callback to update the secondary color. (colour: [number, number, number]) => void.
 * @prop {string} [label2]
 *   Optional label for the secondary color picker.
 *
 * @typedef {MoorhenColourPickerSingle | MoorhenColourPickerDual} MoorhenColourPickerType
 *
 * @function
 */

export default function MoorhenColourPicker(props: MoorhenColourPickerType) {
    const {
        colour,
        setColour = null,
        label = null,
        colour2 = null,
        setColour2 = null,
        label2 = null,
        position = "top",
        onClose,
        setColourWithAlpha = null,
        useAlpha = false,
        alpha = null,
        onOpen,
    } = props;
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (onClose && !showColourPicker) {
            onClose();
        }
        if (onOpen && showColourPicker) {
            onOpen();
        }
    }, [showColourPicker, onClose, onOpen]);

    return (
        <>
            <Tooltip
                title={props.tooltip || ""}
                placement="top"
                disableHoverListener={!props.tooltip}
                disableFocusListener={!props.tooltip}
                disableTouchListener={!props.tooltip}
            >
                <div
                    onClick={({ currentTarget }) => {
                        setAnchorEl(currentTarget);
                        setShowColourPicker(true);
                    }}
                    style={{
                        marginLeft: "0.5rem",
                        width: "25px",
                        height: "25px",
                        borderRadius: "8px",
                        border: "2px solid rgb(255, 255, 255)",
                        boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(0, 0, 0, 0.15)",
                        cursor: "pointer",
                        backgroundColor: colour2 ? "white" : `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`,
                        backgroundImage: colour2
                            ? `linear-gradient(135deg, rgb(${colour[0]}, ${colour[1]}, ${colour[2]}) 49%, white 49%, white 51%, rgb(${colour2[0]}, ${colour2[1]}, ${colour2[2]}) 51%)`
                            : "none",
                    }}
                />
            </Tooltip>
            <Popover
                anchorOrigin={{
                    vertical: position === "top" ? "top" : "bottom",
                    horizontal: "left",
                }}
                transformOrigin={{
                    vertical: position === "top" ? "bottom" : "top",
                    horizontal: "left",
                }}
                anchorEl={anchorEl}
                open={showColourPicker}
                onClose={() => setShowColourPicker(false)}
                sx={{
                    "& .MuiPaper-root": {
                        overflowY: "hidden",
                        borderRadius: "8px",
                    },
                }}
            >
                <Stack gap={3} direction="row">
                    {useAlpha &&
                        [{ c: colour, set: setColourWithAlpha, label }].filter(Boolean).map(({ c, set, label }, i) => (
                            <Stack key={i} direction="column" style={{ width: "100%", textAlign: "center" }}>
                                {label ? <span>{label}</span> : null}
                                <RgbaColorPicker
                                    color={{ r: c[0], g: c[1], b: c[2], a: alpha }}
                                    onChange={({ r, g, b, a }) => set([r, g, b, a])}
                                />
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
                                        onChange={(hex) => {
                                            const [r, g, b] = hexToRGB(hex);
                                            set([r, g, b, alpha]);
                                        }}
                                    />
                                </div>
                            </Stack>
                        ))}
                    {!useAlpha &&
                        [
                            { c: colour, set: setColour, label },
                            colour2 && setColour2 ? { c: colour2, set: setColour2, label: label2 } : null,
                        ]
                            .filter(Boolean)
                            .map(({ c, set, label }, i) => (
                                <Stack key={i} direction="column" style={{ width: "100%", textAlign: "center" }}>
                                    {label ? <span>{label}</span> : null}
                                    <RgbColorPicker
                                        color={{ r: c[0], g: c[1], b: c[2] }}
                                        onChange={({ r, g, b }) => set([r, g, b])}
                                    />
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
                                            onChange={(hex) => {
                                                const [r, g, b] = hexToRGB(hex);
                                                set([r, g, b]);
                                            }}
                                        />
                                    </div>
                                </Stack>
                            ))}
                </Stack>
            </Popover>
        </>
    );
}

MoorhenColourPicker.displayName = "MoorhenColourPicker";
