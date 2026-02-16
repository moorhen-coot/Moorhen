import FlipCameraAndroidIcon from "@mui/icons-material/FlipCameraAndroid";
import { memo, useState } from "react";
import { MoorhenButton, MoorhenColourPicker, MoorhenSelect } from "..";
import { MoorhenNumberInput } from "../";
import { usePersistentState } from "../../../store/menusSlice";
import { MoorhenStack } from "../../interface-base";
import { gradientPresets } from "./gradientPresets";

type MoorhenGradientPickerType = {
    colourTable: [number, [number, number, number]][];
    setColourTable: (colourTable: [number, [number, number, number]][]) => void;
    menu: string;
    showValues?: boolean;
    modifyValues?: boolean;
    minValue?: number;
    setMinValue?: (val: number) => void;
    maxValue?: number;
    setMaxValue?: (val: number) => void;
};

export const MoorhenGradientPicker = memo((props: MoorhenGradientPickerType) => {
    const {
        colourTable,
        setColourTable,
        menu,
        showValues = true,
        modifyValues = false,
        minValue = 0,
        maxValue = 1,
        setMinValue = () => {},
        setMaxValue = () => {},
    } = props;

    const [internalColourTable, setInternalColourTable] = useState<[number, [number, number, number]][]>(colourTable);
    const [selectedPreset, setSelectedPreset] = usePersistentState(menu, "gradientPresets", "red-white-blue", true);
    const nOfPoints = colourTable.length;

    const updateExternalColourTable = () => {
        if (internalColourTable !== colourTable) {
            setColourTable(internalColourTable);
            setSelectedPreset("Custom");
        }
    };

    const handlePointsChange = (newVal: number) => {
        const newColourTable: [number, [number, number, number]][] = [];
        for (let i = 0; i < newVal; i++) {
            const colour = internalColourTable[i] ? internalColourTable[i][1] : internalColourTable[internalColourTable.length - 1][1];
            const newColour: [number, [number, number, number]] = [i / (newVal - 1), [colour[0], colour[1], colour[2]]];
            newColourTable.push(newColour);
        }
        setInternalColourTable(newColourTable);
    };

    const handlePreset = (newVal: string | null) => {
        setSelectedPreset(newVal);
        if (newVal === "Custom") {
            return;
        }
        const newColourTable = gradientPresets[newVal] || [];
        setColourTable(newColourTable);
        setInternalColourTable(newColourTable);
    };

    const handleRevert = () => {
        const newColourTable: [number, [number, number, number]][] = [];
        for (let i = 0; i < nOfPoints; i++) {
            const colour = internalColourTable[nOfPoints - i - 1][1];
            const newColour: [number, [number, number, number]] = [i / (nOfPoints - 1), [colour[0], colour[1], colour[2]]];
            newColourTable.push(newColour);
        }
        setColourTable(newColourTable);
        setInternalColourTable(newColourTable);
    };

    const colorStop = index => {
        const handleColorChange = (selectedColour: { r: number; g: number; b: number }) => {
            const newColourTable: [number, [number, number, number]][] = [];
            for (let i = 0; i < internalColourTable.length; i++) {
                let colour;
                if (i === index) {
                    colour = [selectedColour.r, selectedColour.g, selectedColour.b];
                } else {
                    colour = internalColourTable[i][1];
                }
                const colourEntry: [number, [number, number, number]] = [
                    i / (internalColourTable.length - 1),
                    [colour[0], colour[1], colour[2]],
                ];
                newColourTable.push(colourEntry);
            }
            setInternalColourTable(newColourTable);
        };

        return (
            <MoorhenColourPicker
                colour={[internalColourTable[index][1][0], internalColourTable[index][1][1], internalColourTable[index][1][2]]}
                setColour={colour => {
                    handleColorChange({ r: colour[0], g: colour[1], b: colour[2] });
                }}
                onClose={updateExternalColourTable}
                key={index}
            />
        );
    };

    const colorStops = Array.from({ length: internalColourTable.length }).map((_, i) => colorStop(i));

    const getColourGradientImage = () => {
        const gradient = `linear-gradient(to right, ${internalColourTable
            .map(colour => `rgb(${colour[1][0]},${colour[1][1]},${colour[1][2]}) ${Math.round(colour[0] * 100)}%`)
            .join(", ")})`;
        return gradient;
    };
    const colourGradientImage = getColourGradientImage();

    return (
        <MoorhenStack direction="column" style={{ margin: "0.5rem" }}>
            <MoorhenStack direction="row" align="center" justify="center">
                <MoorhenNumberInput
                    value={nOfPoints}
                    minMax={[2, 7]}
                    decimalDigits={0}
                    type="number"
                    setValue={newVal => {
                        handlePointsChange(+newVal);
                    }}
                    label="Points: "
                />
                Presets:
                <MoorhenSelect
                    defaultValue={selectedPreset}
                    onChange={evt => {
                        handlePreset(evt.target.value);
                    }}
                >
                    <option value={"Custom"}>Custom</option>
                    {Object.keys(gradientPresets).map(key => (
                        <option key={key} value={key}>
                            {key}
                        </option>
                    ))}
                </MoorhenSelect>
                <MoorhenButton key="reverse-gradient" size="sm" variant="outlined" onClick={handleRevert}>
                    <FlipCameraAndroidIcon />
                </MoorhenButton>
            </MoorhenStack>

            <MoorhenStack direction="column" card gap="0.2rem">
                <MoorhenStack direction="row" align="center" justify="space-between">
                    {colorStops}
                </MoorhenStack>
                <div
                    style={{
                        marginLeft: 0,
                        width: "100%",
                        height: "25px",
                        borderRadius: "8px",
                        border: "2px solid #fff",
                        boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(0, 0, 0, 0.15)",
                        backgroundImage: colourGradientImage,
                    }}
                />
                {showValues && (
                    <MoorhenStack direction="row" align="center" justify="space-between">
                        {modifyValues ? (
                            <>
                                <MoorhenNumberInput type="number" value={minValue} setValue={setMinValue} />
                                {Array.from({ length: nOfPoints - 2 }).map((_, i) => {
                                    const value = minValue + ((i + 1) / (nOfPoints - 1)) * (maxValue - minValue);
                                    return <div key={i}>{value.toFixed(1)}</div>;
                                })}
                                <MoorhenNumberInput type="number" value={maxValue} setValue={setMaxValue} />
                            </>
                        ) : (
                            Array.from({ length: nOfPoints }).map((_, i) => {
                                const value = minValue + (i / (nOfPoints - 1)) * (maxValue - minValue);
                                return <div key={i}>{value.toFixed(1)}</div>;
                            })
                        )}
                    </MoorhenStack>
                )}
            </MoorhenStack>
        </MoorhenStack>
    );
});

MoorhenGradientPicker.displayName = "MoorhenGradientPicker";
