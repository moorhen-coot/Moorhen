import { MoorhenStack } from "@/components/interface-base/Stack/Stack";
import { MoorhenSequenceViewer, moorhenSequenceToSeqViewer } from "@/components/sequence-viewer";
import { moorhen } from "../../../../../types/moorhen";
import { MoorhenNumberInput, MoorhenSelect } from "../../../../inputs";
import { MoorhenCidInputForm } from "../../../../inputs/Cid/MoorhenCidInputForm";
import { MoorhenChainSelect } from "../../../../inputs/Selector/MoorhenChainSelect";
import { MoorhenLigandSelect } from "../../../../inputs/Selector/MoorhenLigandSelect";
import { MoorhenInfoCard } from "@/components/interface-base";
import { SelectionInfoCard } from "@/components/sequence-viewer/infoCard";

interface ResidueSelectionSectionProps {
    ruleType: "ligands" | "cid" | "molecule" | "chain" | "residue-range" | "neighbourhood";
    setRuleType: (val: ResidueSelectionSectionProps["ruleType"]) => void;
    representationStyle: string;
    molecules: moorhen.Molecule[];
    molecule: moorhen.Molecule;
    selectedChain: string;
    setSelectedChain: (val: string) => void;
    sequenceResidueRange: [number, number];
    setSequenceResidueRange: React.Dispatch<React.SetStateAction<[number, number] | null>>;
    cid: string;
    setCid: (val: string) => void;
    setLigandCid: (cid: string) => void;
    setRestrictToNeighbours: (val: boolean) => void;
    isThereLigand: boolean;
}



export const ResidueSelectionSection = (props: ResidueSelectionSectionProps) => {
    const {
        ruleType,
        setRuleType,
        representationStyle,
        molecules,
        molecule,
        selectedChain,
        setSelectedChain,
        sequenceResidueRange,
        setSequenceResidueRange,
        cid,
        setCid,
        setLigandCid,
        setRestrictToNeighbours,
        isThereLigand,
    } = props;

    const handleResiduesRangeSelection = selection => {
        setSequenceResidueRange(selection.range[0] < selection.range[1] ? selection.range : [selection.range[1], selection.range[0]]);
    };

    const selectedSequence = props.molecule.sequences.find(sequence => sequence.chain === selectedChain);
    const handleResidueRangeChange = (range: [number,number]) => {
        let clampedRange: [number, number] = range;
        if (clampedRange[0] > clampedRange[1]) {
            clampedRange = [clampedRange[1], clampedRange[1]];
        }

        if (clampedRange[0] < selectedSequence.sequence[0].resNum) {
            clampedRange[0] = selectedSequence.sequence[0].resNum;
        }
        if (clampedRange[1] > selectedSequence.sequence[selectedSequence.sequence.length - 1].resNum) {
            clampedRange[1] = selectedSequence.sequence[selectedSequence.sequence.length - 1].resNum;
        }

        setSequenceResidueRange(clampedRange);
    }
    console.log(
        `Rule type: ${ruleType}, selected chain: ${selectedChain}, sequenceResidueRange: ${sequenceResidueRange}, selectedSequence: ${selectedSequence}`
    );
    return (
        <>
            <MoorhenSelect
                label={"Residue selection"}
                defaultValue={ruleType}
                setValue={e => {
                    setRuleType(e as ResidueSelectionSectionProps["ruleType"]);
                    if (e === "neighbourhood") {
                        setRestrictToNeighbours(true);
                    } else {
                        setRestrictToNeighbours(false);
                    }
                }}
            >
                {representationStyle === "residue_environment" ? (
                    <>
                        <option value={"cid"} key={"cid"}>
                            Atom selection
                        </option>
                    </>
                ) : (
                    <>
                        <option value={"molecule"} key={"molecule"}>
                            All molecule
                        </option>
                        <option value={"chain"} key={"chain"}>
                            Chain
                        </option>
                        <option value={"residue-range"} key={"residue-range"}>
                            Residue range
                        </option>
                        {isThereLigand && (
                            <option value={"ligands"} key={"ligands"}>
                                Ligands
                            </option>
                        )}
                        <option value={"neighbourhood"} key={"neighbourhood"}>
                            Neighborhood of
                        </option>
                        <option value={"cid"} key={"cid"}>
                            Atom selection
                        </option>
                    </>
                )}
            </MoorhenSelect>

            {ruleType === "cid" && representationStyle !== "adaptativeBonds" && (
                <MoorhenCidInputForm setValue={setCid} label="Atom selection" defaultValue={cid} allowUseCurrentSelection={true} />
            )}
            {(ruleType === "chain" || ruleType === "residue-range") && (
                <MoorhenChainSelect
                    molecules={molecules}
                    value={selectedChain}
                    setValue={value => {
                        setSelectedChain(value);
                        setSequenceResidueRange(null);
                    }}
                    selectedCoordMolNo={molecule.molNo}
                    allowedTypes={[1, 2, 3, 4, 5]}
                />
            )}
            {ruleType === "ligands" && (
                <MoorhenLigandSelect selectedCoordMolNo={molecule.molNo} molecules={[molecule]} allowAll setValue={setLigandCid} />
            )}
            {ruleType === "residue-range" && selectedSequence && (
                // escape the inputGrid
                <MoorhenStack style={{ gridColumn: "1 / -1", padding: "0.5rem", marginTop: "0.5rem" }} card direction="column" gap="0.5rem">
                    <MoorhenStack direction="row" align="center" gap="0.5rem"  >
                        Select a residue range: <MoorhenInfoCard infoText={SelectionInfoCard }/>
                    </MoorhenStack>
                    <MoorhenSequenceViewer
                        style={{ border: "none", marginTop: "0rem" }}
                        sequences={moorhenSequenceToSeqViewer(selectedSequence, props.molecule.name, props.molecule.molNo)}
                        onResiduesSelect={selection => {
                            handleResiduesRangeSelection(selection);
                        }}
                        showTitleBar={false}
                        selectedResidues={
                            sequenceResidueRange ? { molNo: props.molecule.molNo, chain: selectedChain, range: sequenceResidueRange } : null
                        }
                    />
                    <MoorhenStack direction="row" align="center" justify="center" gap="2rem">
                        <MoorhenNumberInput
                            integer
                            width="4rem"
                            type="number"
                            value={sequenceResidueRange ? sequenceResidueRange[0] : null}
                            setValue={value => handleResidueRangeChange([value, sequenceResidueRange[1]])}
                            label="Start"
                        />
                        <MoorhenNumberInput
                            integer
                            width="4rem"
                            type="number"
                            value={sequenceResidueRange ? sequenceResidueRange[1] : null}
                            setValue={value => handleResidueRangeChange([sequenceResidueRange[0], value])}
                            label="End"
                        />
                    </MoorhenStack>
                </MoorhenStack>
            )}
        </>
    );
};
