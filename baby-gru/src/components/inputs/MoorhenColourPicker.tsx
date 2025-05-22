import { useState, useRef, useEffect,} from "react";
import { Popover } from "@mui/material";
import { HexColorInput, RgbColorPicker } from "react-colorful";
import { hexToRGB, rgbToHex } from "../../utils/utils";
import { Stack } from "@mui/material";

type MoorhenColourPickerBase = {
    colour: [number, number, number];
    setColour: (colour: [number, number, number]) => void;
    label?: string;
    label2?: string;
    position?: string;
    onClose?: () => void;
    onOpen?: () => void;
};

type MoorhenColourPickerSingle = MoorhenColourPickerBase & {
    colour2?: undefined;
    setColour2?: undefined;
};

type MoorhenColourPickerDual = MoorhenColourPickerBase & {
    colour2: [number, number, number];
    setColour2: (colour: [number, number, number]) => void;
};

type MoorhenColourPickerType = MoorhenColourPickerSingle | MoorhenColourPickerDual;

export default function MoorhenColourPicker(props:MoorhenColourPickerType) {
    const { colour, 
        setColour,
        label = null,
        colour2 = null,
        setColour2 = null,
        label2 = null,
        position = "top",
        onClose,
        onOpen
    } = props;
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false);
    const colourSwatchRef = useRef<HTMLDivElement | null>(null);

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
            <div
                ref={colourSwatchRef}
                onClick={() => setShowColourPicker(true)}
                style={{
                    marginLeft: "0.5rem",
                    width: "25px",
                    height: "25px",
                            borderRadius: "8px",
                            border: "2px solid rgb(255, 255, 255)",
                            boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(0, 0, 0, 0.15)",
                            cursor: "pointer",
                            backgroundColor: colour2 ? "white" : `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`,
                            backgroundImage: colour2 ? 
                            `linear-gradient( 135deg, rgb(${colour[0]}, ${colour[1]}, ${colour[2]}), rgb(${colour[0]}, ${colour[1]}, ${colour[2]}) 49%, white 49%, white 51%, rgb(${colour2[0]}, ${colour2[1]}, ${colour2[2]}) 51% )`
                            : "none"
                        }}
                    />
                    <Popover
                        anchorOrigin={{
                            vertical: position === "top" ? "top" : "bottom",
                            horizontal: "left",
                        }}
                        transformOrigin={{
                            vertical: position === "top" ? "bottom" : "top",
                            horizontal: "left",
                        }}
                        anchorEl={colourSwatchRef.current}
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
                        <Stack
                            direction="column"
                            style={{width: "100%", textAlign: "center"}} >

                        {label ? <span>{label}</span> : null}
                        <RgbColorPicker
                            color={{ r: colour[0], g: colour[1], b: colour[2] }}
                            onChange={({ r, g, b }) => setColour([r, g, b])}
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
                                color={rgbToHex(colour[0], colour[1], colour[2])}
                                onChange={(hex) => {
                                    const [r, g, b] = hexToRGB(hex);
                                    setColour([r, g, b]);
                                }}
                            />
                        </div>
                        </Stack>
                        {colour2 && setColour2 ? (
                            <Stack
                                direction="column"
                                style={{width: "100%", textAlign: "center"}} >
                            {label2 ? <span>{label2}</span> : null}
                            <RgbColorPicker
                                color={{ r: colour2[0], g: colour2[1], b: colour2[2] }}
                                onChange={({ r, g, b }) => setColour2([r, g, b])}
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
                                    color={rgbToHex(colour2[0], colour2[1], colour2[2])}
                                    onChange={(hex) => {
                                        const [r, g, b] = hexToRGB(hex);
                                        setColour2([r, g, b]);
                                    }}
                                />
                            </div>
                            </Stack>
                        ) : null}
                    </Stack>
                    </Popover>
                </>
            );
}