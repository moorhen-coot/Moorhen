import { MoorhenMolecule } from "@/utils";
import { MoorhenInfoCard, MoorhenStack } from "../interface-base";
import { MoorhenSequenceViewer, moorhenSequenceToSeqViewer } from "../sequence-viewer";
import { SelectionInfoCard } from "../sequence-viewer/infoCard";
import { MoorhenNumberInput } from "./MoorhenNumberInput/NumberInput";

export type ResidueRangeSelectorProps = {
    molecule: MoorhenMolecule;
    selectedChain: string;
    sequenceResidueRange: [number, number] | null;
    setSequenceResidueRange: React.Dispatch<React.SetStateAction<[number, number] | null>>;
    style?: React.CSSProperties;
};

export const ResidueRangeSelector = (props: ResidueRangeSelectorProps) => {
    const handleResiduesRangeSelection = selection => {
        props.setSequenceResidueRange(selection.range[0] < selection.range[1] ? selection.range : [selection.range[1], selection.range[0]]);
    };

    const selectedSequence = props.molecule.sequences.find(sequence => sequence.chain === props.selectedChain);

    if (!selectedSequence) {
        return null;
    }

    const handleResidueRangeChange = (value: number, start: boolean) => {
        let newValue = value
        if (value > selectedSequence.sequence[selectedSequence.sequence.length - 1].resNum) {
            newValue = selectedSequence.sequence[selectedSequence.sequence.length - 1].resNum
        }
        if (value < selectedSequence.sequence[0].resNum) {
            newValue = selectedSequence.sequence[0].resNum
        }
        if (start) {
            props.setSequenceResidueRange([newValue, props.sequenceResidueRange ? props.sequenceResidueRange[1] : selectedSequence.sequence[selectedSequence.sequence.length - 1].resNum]);
        } else {
            props.setSequenceResidueRange([props.sequenceResidueRange ? props.sequenceResidueRange[0] : selectedSequence.sequence[0].resNum, newValue]);
        }
    };
        // // if (clampedRange[0] > clampedRange[1]) {
        // //     clampedRange = [clampedRange[1], clampedRange[1]];
        // // }

        // // if (clampedRange[0] < selectedSequence.sequence[0].resNum) {
        // //     clampedRange[0] = selectedSequence.sequence[0].resNum;
        // // }
        // // if (clampedRange[1] > selectedSequence.sequence[selectedSequence.sequence.length - 1].resNum) {
        // //     clampedRange[1] = selectedSequence.sequence[selectedSequence.sequence.length - 1].resNum;
        // // }

        // props.setSequenceResidueRange(clampedRange);

    return (
        <MoorhenStack style={{ padding: "0.5rem", marginTop: "0.5rem", ...props.style }} card direction="column" gap="0.5rem">
            <MoorhenStack direction="row" align="center" gap="0.5rem">
                Select a residue range: <MoorhenInfoCard infoText={SelectionInfoCard} />
            </MoorhenStack>
            <MoorhenSequenceViewer
                style={{ border: "none", marginTop: "0rem" }}
                sequences={moorhenSequenceToSeqViewer(selectedSequence, props.molecule.name, props.molecule.molNo)}
                setSelectedResidues={selection => {
                    handleResiduesRangeSelection(selection);
                }}
                showTitleBar={false}
                selectedResidues={
                    props.sequenceResidueRange
                        ? { molNo: props.molecule.molNo, chain: props.selectedChain, range: props.sequenceResidueRange }
                        : null
                }
            />
            <MoorhenStack direction="row" align="center" justify="center" gap="2rem">
                <MoorhenNumberInput
                    integer
                    width="4rem"
                    type="number"
                    value={props.sequenceResidueRange ? props.sequenceResidueRange[0] : null}
                    setValue={value => handleResidueRangeChange(value, true)}
                    label="Start"
                />
                <MoorhenNumberInput
                    integer
                    width="4rem"
                    type="number"
                    value={props.sequenceResidueRange ? props.sequenceResidueRange[1] : null}
                    setValue={value => handleResidueRangeChange(value, false)}
                    label="End"
                />
            </MoorhenStack>
        </MoorhenStack>
    );
};
