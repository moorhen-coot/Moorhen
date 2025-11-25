import { AddCircleOutline, RemoveCircleOutline } from "@mui/icons-material";
import { IconButton, Slider } from "@mui/material";
import { Stack } from "react-bootstrap";
import { useSelector } from "react-redux";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenStack } from "../interface-base";

export const MoorhenSequenceRangeSlider = forwardRef<
    [number, number],
    {
        selectedMolNo: number;
        selectedChainId: string;
    }
>((props, ref) => {
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const intervalRef = useRef(null);

    const [minMaxValue, setMinMaxValue] = useState<[number, number]>([1, 100]);
    const [sequenceLength, setSequenceLength] = useState<number | null>(null);

    useEffect(() => {
        const molecule = molecules.find(molecule => molecule.molNo === props.selectedMolNo);
        if (molecule) {
            let sequence = molecule.sequences.find(sequence => sequence.chain === props.selectedChainId);
            if (!sequence) {
                sequence = molecule.sequences[0];
            }
            if (!sequence) {
                setSequenceLength(1);
                setMinMaxValue([1, 1]);
                if (ref !== null && typeof ref !== "function") ref.current = [1, 1];
            } else {
                setSequenceLength(sequence.sequence.length);
                setMinMaxValue([1, sequence.sequence.length]);
                if (ref !== null && typeof ref !== "function") ref.current = [1, sequence.sequence.length];
            }
        }
    }, [props.selectedMolNo, props.selectedChainId]);

    const convertValue = useCallback(
        (value: number) => {
            if (!props.selectedChainId || props.selectedMolNo === null) {
                return "";
            }

            const molecule = molecules.find(molecule => molecule.molNo === props.selectedMolNo);
            if (!molecule) {
                return "";
            }

            const sequence = molecule.sequences.find(sequence => sequence.chain === props.selectedChainId);
            if (!sequence) {
                return "";
            }

            const resNum = Math.floor(value);
            return sequence.sequence[resNum - 1]?.cid;
        },
        [molecules, props.selectedMolNo, props.selectedChainId]
    );

    const handleMinMaxChange = (_event: any, newValue: [number, number]) => {
        setMinMaxValue(newValue);
        if (ref !== null && typeof ref !== "function") ref.current = newValue;
    };

    return (
        <>
            <span style={{ margin: "0.5rem" }}>Residue range</span>
            <MoorhenStack direction="horizontal" gap={1} style={{}}>
                <MoorhenStack direction="vertical" gap={0} style={{ justifyContent: "center" }}>
                    <IconButton
                        onMouseDown={() => {
                            intervalRef.current = setInterval(() => {
                                if (ref !== null && typeof ref !== "function") {
                                    const newValue = [ref.current[0] + 1, ref.current[1]] as [number, number];
                                    handleMinMaxChange(null, newValue);
                                }
                            }, 100);
                        }}
                        onMouseUp={() => {
                            clearInterval(intervalRef.current);
                        }}
                        onClick={() => {
                            if (ref !== null && typeof ref !== "function") {
                                const newValue = [ref.current[0] + 1, ref.current[1]] as [number, number];
                                handleMinMaxChange(null, newValue);
                            }
                        }}
                        style={{ padding: 0, color: isDark ? "white" : "grey" }}
                    >
                        <AddCircleOutline />
                    </IconButton>
                    <IconButton
                        onMouseDown={() => {
                            intervalRef.current = setInterval(() => {
                                if (ref !== null && typeof ref !== "function") {
                                    const newValue = [ref.current[0] - 1, ref.current[1]] as [number, number];
                                    handleMinMaxChange(null, newValue);
                                }
                            }, 100);
                        }}
                        onMouseUp={() => {
                            clearInterval(intervalRef.current);
                        }}
                        onClick={() => {
                            if (ref !== null && typeof ref !== "function") {
                                const newValue = [ref.current[0] - 1, ref.current[1]] as [number, number];
                                handleMinMaxChange(null, newValue);
                            }
                        }}
                        style={{ padding: 0, color: isDark ? "white" : "grey" }}
                    >
                        <RemoveCircleOutline />
                    </IconButton>
                </MoorhenStack>
                <div style={{ width: "80%", paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.1rem", paddingBottom: "0.1rem" }}>
                    <Slider
                        getAriaLabel={() => "Residue range"}
                        value={minMaxValue}
                        onChange={handleMinMaxChange}
                        getAriaValueText={convertValue}
                        valueLabelFormat={convertValue}
                        valueLabelDisplay="on"
                        min={1}
                        max={sequenceLength ? sequenceLength : 100}
                        step={1}
                        marks={true}
                        sx={{
                            marginTop: "1.7rem",
                            marginBottom: "0.8rem",
                            '& .MuiSlider-thumb[data-index="1"]': {
                                "& .MuiSlider-valueLabel": {
                                    top: "-0.7rem",
                                    fontSize: 14,
                                    fontWeight: "bold",
                                    color: "grey",
                                    backgroundColor: "unset",
                                },
                            },
                            '& .MuiSlider-thumb[data-index="0"]': {
                                "& .MuiSlider-valueLabel": {
                                    top: "3.5rem",
                                    fontSize: 14,
                                    fontWeight: "bold",
                                    color: "grey",
                                    backgroundColor: "unset",
                                },
                            },
                        }}
                    />
                </div>
                <MoorhenStack direction="vertical" gap={0} style={{ display: "flex", verticalAlign: "center", justifyContent: "center" }}>
                    <IconButton
                        onMouseDown={() => {
                            intervalRef.current = setInterval(() => {
                                if (ref !== null && typeof ref !== "function") {
                                    const newValue = [ref.current[0], ref.current[1] + 1] as [number, number];
                                    handleMinMaxChange(null, newValue);
                                }
                            }, 100);
                        }}
                        onMouseUp={() => {
                            clearInterval(intervalRef.current);
                        }}
                        onClick={() => {
                            if (ref !== null && typeof ref !== "function") {
                                const newValue = [ref.current[0], ref.current[1] + 1] as [number, number];
                                handleMinMaxChange(null, newValue);
                            }
                        }}
                        style={{ padding: 0, color: isDark ? "white" : "grey" }}
                    >
                        <AddCircleOutline />
                    </IconButton>
                    <IconButton
                        onMouseDown={() => {
                            intervalRef.current = setInterval(() => {
                                if (ref !== null && typeof ref !== "function") {
                                    const newValue = [ref.current[0], ref.current[1] - 1] as [number, number];
                                    handleMinMaxChange(null, newValue);
                                }
                            }, 100);
                        }}
                        onMouseUp={() => {
                            clearInterval(intervalRef.current);
                        }}
                        onClick={() => {
                            if (ref !== null && typeof ref !== "function") {
                                const newValue = [ref.current[0], ref.current[1] - 1] as [number, number];
                                handleMinMaxChange(null, newValue);
                            }
                        }}
                        style={{ padding: 0, color: isDark ? "white" : "grey" }}
                    >
                        <RemoveCircleOutline />
                    </IconButton>
                </MoorhenStack>
            </MoorhenStack>
        </>
    );
});
