import { useState, useEffect } from "react";
import { Form, Button } from "react-bootstrap";
import { useMenuStateMemory } from "../../store/menusSlice";
import Stack from '@mui/material/Stack';
import { MoorhenPreciseInput } from "./MoorhenPreciseInput";
import MoorhenColourPicker from "./MoorhenColourPicker";
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import { gradientPresets } from "./gradientPresets";

type MoorhenGradientPickerType = {
    colourTable: [number, [number, number, number]][];
    setColourTable: (colourTable: [number, [number, number, number]][]) => void;
    menu: string;
};

export default function MoorhenGradientPicker(props: MoorhenGradientPickerType) {
    const { colourTable, setColourTable, menu } = props;

    const [nOfPoints, setnOfPoints] = useState<number>(colourTable.length);
        const [internalColourTable, setInternalColourTable] = useState<[number, [number, number, number]][]>(colourTable);
        const [selectedPreset, setSelectedPreset] = useMenuStateMemory(menu, "gradientPresets", "red-white-blue", true);
        
        const updateExternalColourTable = () => {
            if (internalColourTable !== colourTable) {
                setColourTable(internalColourTable);
                setSelectedPreset("Custom");
            }
        };

        useEffect(() => {
            updateExternalColourTable();
        }, [nOfPoints]);

        const handlePointsChange = (newVal: number) => {
            setnOfPoints(newVal);
            const newColourTable: [number, [number, number, number]][] = [];
            for (let i = 0; i < newVal; i++) {
                const colour = internalColourTable[i] ? internalColourTable[i][1] : internalColourTable[internalColourTable.length - 1][1];
                const newColour: [number, [number, number, number]] = [i / (newVal - 1), [colour[0], colour[1], colour[2]]];
                newColourTable.push(newColour);
            }
            setInternalColourTable(newColourTable);
        };
        
        const handlePreset = (newVal: string | null) => {
            setSelectedPreset(newVal)
            if (newVal === "Custom") {
                return;
            }
            const newColourTable = gradientPresets[newVal] || [];
            setnOfPoints(newColourTable.length);
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
        }

        const colorStop = (index) => {
            const handleColorChange = (selectedColour: { r: number; g: number; b: number }) => {
                const newColourTable: [number, [number, number, number]][] = [];
                for (let i = 0; i < internalColourTable.length; i++) {
                    let colour;
                    if (i === index) {
                        colour = [selectedColour.r, selectedColour.g, selectedColour.b];
                    } else {
                        colour = internalColourTable[i][1];
                    }
                    const colourEntry: [number, [number, number, number]] = [i / (internalColourTable.length - 1), [colour[0], colour[1], colour[2]]];
                    newColourTable.push(colourEntry);
                }
                setInternalColourTable(newColourTable);
            };

            return (
                <MoorhenColourPicker
                    colour={[internalColourTable[index][1][0], internalColourTable[index][1][1], internalColourTable[index][1][2]]}
                    setColour={(colour) => {
                        handleColorChange({ r: colour[0], g: colour[1], b: colour[2] });                        
                    }}
                    onClose={updateExternalColourTable}
                    key={index}
                />
            );
        };

        const colorStops = Array.from({ length: internalColourTable.length }).map((_, i) => colorStop(i))

        const getColourGradientImage = () => {
            const gradient = `linear-gradient(to right, ${internalColourTable
                .map((colour) => `rgb(${colour[1][0]},${colour[1][1]},${colour[1][2]}) ${Math.round(colour[0] * 100)}%`)
                .join(", ")})`;
            return gradient;
        };
        const colourGradientImage = getColourGradientImage();

        return (
            <Stack direction="column" style={{ margin: "0.5rem" }} gap={2}>
                <Stack direction="row" gap={1} alignItems="center" justifyContent="Center">
                <MoorhenPreciseInput
                    value={nOfPoints}
                    minMax={[2, 7]}
                    decimalDigits={0}
                    type="number"
                    setValue={(newVal) => {
                        handlePointsChange(+newVal);
                    }}
                    label="Points: "
                />
                    Presets:
                    <Form.Select
                        value={selectedPreset}
                        onChange={(evt) => {
                            handlePreset(evt.target.value);
                        }}
                        style={{
                            width: "10rem",
                            marginLeft: "0.5rem",
                            backgroundColor: "white",
                            borderRadius: "8px",
                            border: "2px solid #fff",
                        }}
                    >
                        <option value={"Custom"}>Custom</option>
                        {Object.keys(gradientPresets).map((key) => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </Form.Select>
                    <Button key="centre-on-map" size="sm" variant="outlined" onClick={handleRevert}>                
                        <FlipCameraAndroidIcon/>
                    </Button>
                </Stack>


                <Stack direction="column" style={{ margin: "0.5rem" }} gap={0.5}>
                <Stack direction="row"  gap={1} alignItems="center" justifyContent="space-between">
                    {colorStops}
                </Stack>
                <div
                    style={{
                        marginLeft: "0.2rem",
                        width: "100%",
                        height: "25px",
                        borderRadius: "8px",
                        border: "2px solid #fff",
                        boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(0, 0, 0, 0.15)",
                        backgroundImage: colourGradientImage,
                    }}
                />
                </Stack>
            </Stack>
        );
    };