import { RepresentationStyles } from "@/utils";
import { MoorhenToggle } from "../../../../inputs";
import { ResidueSelectionRuleType } from "./ResidueSelectionSection";

interface FilterTogglesProps {
    notHOH: boolean;
    setNotHOH: (val: boolean) => void;
    notH: boolean;
    setNotH: (val: boolean) => void;
    sideChainOnly: boolean;
    setSideChainOnly: (val: boolean) => void;
    representationStyle: RepresentationStyles;
    ruleType: ResidueSelectionRuleType;
}

/**
 * Toggle switches for filtering waters, hydrogens, and side chains.
 * Only shown for MetaBalls, VdwSpheres, and CBs styles
 * when the rule type is chain, molecule, or neighbourhood.
 */
export const FilterToggles = (props: FilterTogglesProps) => {
    const { notHOH, setNotHOH, notH, setNotH, sideChainOnly, setSideChainOnly, representationStyle, ruleType } = props;

    const isApplicableStyle =
        representationStyle === "MetaBalls" || representationStyle === "VdwSpheres" || representationStyle === "CBs";
    const isApplicableRuleType = ruleType === "chain" || ruleType === "molecule" || ruleType === "neighbourhood" || ruleType === "residue-range";

    if (!isApplicableStyle || !isApplicableRuleType) {
        return null;
    }

    return (
        <>
            <MoorhenToggle label="Hide Waters" checked={notHOH} onChange={() => setNotHOH(!notHOH)} />
            <MoorhenToggle label="Hide Hydrogens" checked={notH} onChange={() => setNotH(!notH)} />
            <MoorhenToggle
                label="Side Chain Only"
                checked={sideChainOnly}
                onChange={() => setSideChainOnly(!sideChainOnly)}
            />
            <div></div>
        </>
    );
};
