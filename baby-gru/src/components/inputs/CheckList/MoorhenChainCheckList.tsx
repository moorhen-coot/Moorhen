import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { useChainOptions } from "../Selector/useSelectorOptions";
import { MoorhenCheckList, type MoorhenCheckListProps } from "./MoorhenCheckList";

export type MoorhenChainCheckListProps = Omit<MoorhenCheckListProps, "options" | "resetKey"> & {
    /** The molecule whose chains are listed, by unique id. */
    moleculeUniqueId: string | null | undefined;
    /** gemmi polymer types to list: 1 PeptideL, 2 PeptideD, 3 DNA, 4 RNA, 5 DNA/RNA hybrid. All by default. */
    allowedTypes?: number[];
    /** Molecules to look the molecule up in. Defaults to the molecules loaded in Moorhen. */
    molecules?: MoorhenMolecule[];
};

/**
 * Checkboxes for the chains of one molecule, by chain id: any number of chains can be selected.
 * All chains are ticked at first and again whenever the molecule changes.
 */
export const MoorhenChainCheckList = (props: MoorhenChainCheckListProps) => {
    const { moleculeUniqueId, allowedTypes, molecules, label = "Chains", emptyText = "No chain", ...listProps } = props;
    const options = useChainOptions(moleculeUniqueId, allowedTypes, molecules);
    return <MoorhenCheckList {...listProps} label={label} emptyText={emptyText} options={options} resetKey={moleculeUniqueId ?? null} />;
};
