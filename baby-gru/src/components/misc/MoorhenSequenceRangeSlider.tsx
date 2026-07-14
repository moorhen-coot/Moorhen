import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { RootState } from "@/store/MoorhenReduxStore";
import { MoorhenSlider } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const MoorhenSequenceRangeSlider = (props: {
    selectedMolNo: number;
    selectedChainId: string;
    range?: [number, number];
    setRange: (range: [number, number]) => void;
    useSeqNumbers?: boolean;
    style?: React.CSSProperties;
}) => {
    const { useSeqNumbers = false } = props;
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);

    const [sequenceLength, setSequenceLength] = useState<number | null>(null);
    const [lowValue, setLowValue] = useState<number>(props.range ? props.range[0] : 1);
    const [highValue, setHighValue] = useState<number>(props.range ? props.range[1] : 100);
    const [minMaxValues, setMinMaxValues] = useState<[number, number]>([1, 1]);
    const molecule = molecules.find(molecule => molecule.molNo === props.selectedMolNo);
    let sequence = molecule?.sequences?.find(sequence => sequence.chain === props.selectedChainId);
    if (!sequence) {
        sequence = molecule?.sequences?.[0];
    }

    const updateExternalRange = (range: [number, number]) => {
        if (!props.selectedChainId || props.selectedMolNo === null) {
            return;
        }
        if (!sequence?.sequence?.length || typeof sequence.sequence[0]?.resNum === "undefined") {
            return;
        }
        const startSequenceNum = +sequence.sequence[0].resNum;
        if (!useSeqNumbers) {
            props.setRange([range[0] - startSequenceNum + 1, range[1] - startSequenceNum + 1]);
        } else {
            props.setRange(range);
        }
    };

    useEffect(() => {
        const sequenceStart = sequence?.sequence?.[0]?.resNum;
        const hasSequence = typeof sequenceStart !== "undefined" && Array.isArray(sequence?.sequence) && sequence.sequence.length > 0;

        if (!molecule || !hasSequence) {
            setSequenceLength(1);
            setLowValue(1);
            setHighValue(1);
            setMinMaxValues([1, 1]);
            return;
        }

        const start = +sequenceStart;
        const end = start + sequence.sequence.length - 1;
        setSequenceLength(sequence.sequence.length);
        setLowValue(start);
        setHighValue(end);
        setMinMaxValues([start, end]);
        updateExternalRange([start, end]);
    }, [molecule, sequence, props.selectedMolNo, props.selectedChainId]);

    return (
        <div style={{ ...props.style }}>
            <MoorhenStack direction="horizontal" gap={1} style={{}}>
                <MoorhenSlider
                    // getAriaLabel={() => "Residue range"}
                    type="range"
                    setValue={val => {
                        setLowValue(val);
                        updateExternalRange([val, highValue]);
                    }}
                    setValue2={val => {
                        setHighValue(val);
                        updateExternalRange([lowValue, val]);
                    }}
                    value={lowValue}
                    value2={highValue}
                    step={1}
                    sliderTitle="Residue range"
                    majorTickSpacing={10}
                    tickSpacing={10}
                    tickInside={true}
                    showTicks
                    usePreciseInput
                    piWidth={80}
                    minVal={minMaxValues[0]}
                    maxVal={minMaxValues[1]}
                />
            </MoorhenStack>
        </div>
    );
};
