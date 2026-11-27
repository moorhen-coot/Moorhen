import { useSelector } from "react-redux";
import type { RootState } from "../../../store/MoorhenReduxStore";
import { contrastingTextColour, GENERIC_FONT_FAMILIES, type MoorhenTextStyle } from "../../../utils/textStyle";
import { componentToHex, getHexForCanvasColourName, hexToRGB, rgbToHex } from "../../../utils/utils";
import { MoorhenColourPicker } from "../MoorhenColourPicker/MoorhenColourPicker";
import { MoorhenNumberInput } from "../MoorhenNumberInput/NumberInput";
import { MoorhenSelect } from "../Selector/Select";
import { MoorhenTextInput } from "../TextInput";
import { MoorhenToggle } from "../MoorhenToggle/Toggle";

const GENERIC_FONT_LABELS: Record<string, string> = {
    serif: "Serif",
    "sans-serif": "Sans serif",
    monospace: "Monospace",
    cursive: "Cursive",
    fantasy: "Fantasy",
};

/**
 * A colour string as the picker wants it: 0-255 RGB and a 0-1 alpha.
 *
 * Accepts `#rrggbbaa`, `#rrggbb` and anything a canvas understands ("red").
 */
const colourToPickerRGBA = (colour: string): [number, number, number, number] => {
    if (colour.startsWith("#") && colour.length === 9) {
        const [r, g, b] = hexToRGB(colour.substring(0, 7));
        return [r, g, b, parseInt(colour.substring(7), 16) / 255];
    }
    if (colour.startsWith("#") && colour.length === 7) {
        const [r, g, b] = hexToRGB(colour);
        return [r, g, b, 1];
    }
    const [r, g, b] = hexToRGB(getHexForCanvasColourName(colour));
    return [r, g, b, 1];
};

/** The picker's colour as `#rrggbbaa`. */
const pickerRGBAToColour = (colour: number[]): string => {
    const alpha = colour.length > 3 && !Number.isNaN(colour[3]) ? colour[3] : 1;
    return rgbToHex(colour[0], colour[1], colour[2]) + componentToHex(Math.floor(alpha * 255));
};

type MoorhenTextStyleEditorProps = {
    value: MoorhenTextStyle;
    /** Called with just the fields that changed. */
    onChange: (changes: Partial<MoorhenTextStyle>) => void;
    /** Label for the text box; "Text" if not given. */
    textLabel?: string;
};

/**
 * The text and its look, as set for a 2D text overlay or a 3D annotation.
 *
 * Laid out as label/input pairs, for a MoorhenStack with inputGrid.
 *
 * One switch picks plain text or LaTeX. The font family and filled/outline choice only apply to
 * plain text, so they are hidden for LaTeX; the colour applies to both.
 */
export const MoorhenTextStyleEditor = (props: MoorhenTextStyleEditorProps) => {
    const { value, onChange } = props;
    const availableFonts = useSelector((state: RootState) => state.labelSettings.availableFonts);
    const backgroundColor = useSelector((state: RootState) => state.sceneSettings.backgroundColor);

    const fonts = [...availableFonts.filter(font => !GENERIC_FONT_FAMILIES.includes(font)), ...GENERIC_FONT_FAMILIES];
    const fontFamily = fonts.includes(value.fontFamily) ? value.fontFamily : "sans-serif";
    const colour = colourToPickerRGBA(value.colour || contrastingTextColour(backgroundColor));
    const drawStyle = value.drawStyle === "stroke" ? "stroke" : "fill";

    return (
        <>
            <MoorhenTextInput
                label={props.textLabel ?? "Text"}
                text={value.text}
                placeholder={value.latex ? "e.g. \\alpha_1 + \\beta^2" : ""}
                onChange={evt => onChange({ text: evt.target.value })}
            />
            {/* Label and switch as two cells, so the switch lines up with the inputs in an inputGrid. */}
            <span>LaTeX</span>
            <MoorhenToggle label="" checked={!!value.latex} onChange={evt => onChange({ latex: evt.target.checked })} />
            <MoorhenNumberInput
                type="number"
                label="Size (pixels)"
                value={value.fontPixelSize}
                minMax={[1, 500]}
                decimalDigits={0}
                setValue={val => {
                    const size = Number(val);
                    if (size > 0) onChange({ fontPixelSize: size });
                }}
            />
            {!value.latex && (
                <MoorhenSelect label="Font" value={fontFamily} onChange={evt => onChange({ fontFamily: evt.target.value })}>
                    {fonts.map(font => (
                        <option key={font} value={font}>
                            {GENERIC_FONT_LABELS[font] ?? font}
                        </option>
                    ))}
                </MoorhenSelect>
            )}
            {!value.latex && (
                <MoorhenSelect
                    label="Style"
                    value={drawStyle}
                    onChange={evt => onChange({ drawStyle: evt.target.value as "fill" | "stroke" })}
                >
                    <option value="fill">Filled</option>
                    <option value="stroke">Outline</option>
                </MoorhenSelect>
            )}
            {!value.latex && drawStyle === "stroke" && (
                <MoorhenNumberInput
                    type="number"
                    label="Line width"
                    value={value.lineWidth ?? 1}
                    minMax={[0.1, 50]}
                    setValue={val => {
                        const width = Number(val);
                        if (width > 0) onChange({ lineWidth: width });
                    }}
                />
            )}
            <span>Colour</span>
            <MoorhenColourPicker
                colour={colour}
                setColour={picked => onChange({ colour: pickerRGBAToColour(picked) })}
                useAlpha={true}
                position="bottom"
                tooltip="Change colour"
            />
        </>
    );
};
