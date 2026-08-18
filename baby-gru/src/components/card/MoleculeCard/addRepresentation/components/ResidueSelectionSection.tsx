import { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import {  MoorhenSelect } from "../../../../inputs";
import { MoorhenCidInputForm } from "../../../../inputs/Cid/MoorhenCidInputForm";
import { MoorhenChainSelect } from "../../../../inputs/Selector/MoorhenChainSelect";
import { MoorhenLigandSelect } from "../../../../inputs/Selector/MoorhenLigandSelect";
import { ResidueRangeSelector } from "@/components/inputs/ResidueRange";

interface ResidueSelectionSectionProps {
    ruleType: "ligands" | "cid" | "molecule" | "chain" | "residue-range" | "neighbourhood";
    setRuleType: (val: ResidueSelectionSectionProps["ruleType"]) => void;
    representationStyle: string;
    molecules: MoorhenMolecule[];
    molecule: MoorhenMolecule;
    selectedChain: string;
    setSelectedChain: (val: string) => void;
    sequenceResidueRange: [number, number];
    setSequenceResidueRange: React.Dispatch<React.SetStateAction<[number, number] | null>>;
    cid: string;
    setCid: (val: string) => void;
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
        setRestrictToNeighbours,
        isThereLigand,
    } = props;

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
                <MoorhenLigandSelect selectedCoordMolNo={molecule.molNo} molecules={[molecule]} allowAll setValue={setCid} />
            )}
            {ruleType === "residue-range"  &&(
                <ResidueRangeSelector
                    molecule={molecule}
                    selectedChain={selectedChain}
                    sequenceResidueRange={sequenceResidueRange}
                    setSequenceResidueRange={setSequenceResidueRange}
                    style={{gridColumn: "1 / -1",}}
                />
 
            )}
        </>
    );
};
