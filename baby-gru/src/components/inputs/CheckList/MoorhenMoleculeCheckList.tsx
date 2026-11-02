import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { useMoleculeOptions } from "../Selector/useSelectorOptions";
import { MoorhenCheckList, type MoorhenCheckListProps } from "./MoorhenCheckList";

export type MoorhenMoleculeCheckListProps = Omit<MoorhenCheckListProps, "options"> & {
    /** Lists only the molecules it returns true for. Keep it stable (module level or useCallback). */
    filter?: (molecule: MoorhenMolecule) => boolean;
    /** Molecules to list. Defaults to the molecules loaded in Moorhen. */
    molecules?: MoorhenMolecule[];
};

/**
 * Checkboxes for the loaded molecules, by unique id: any number of molecules can be selected.
 * All are ticked at first; molecules loaded later are ticked too while everything is ticked.
 */
export const MoorhenMoleculeCheckList = (props: MoorhenMoleculeCheckListProps) => {
    const { filter, molecules, label = "Molecules", emptyText = "No molecule loaded", ...listProps } = props;
    const options = useMoleculeOptions(filter, molecules);
    return <MoorhenCheckList {...listProps} label={label} emptyText={emptyText} options={options} />;
};
