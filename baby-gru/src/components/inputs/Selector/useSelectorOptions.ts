import { useSelector } from "react-redux";
import { useMemo } from "react";
import type { RootState } from "@/store";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";

/** One entry of a selector: `value` is what gets selected (a unique id, a chain id…), `label` what is shown. */
export type SelectorOption = { value: string; label: string };

/** gemmi PolymerType values: 1 PeptideL, 2 PeptideD, 3 DNA, 4 RNA, 5 DNA/RNA hybrid. */
export const ALL_POLYMER_TYPES = [1, 2, 3, 4, 5];

/**
 * The molecules loaded in Moorhen as selector options, by unique id, kept up to date with the store.
 * @param filter - Lists only the molecules it returns true for.
 * @param molecules - Molecules to list instead of the store's.
 */
export const useMoleculeOptions = (filter?: (molecule: MoorhenMolecule) => boolean, molecules?: MoorhenMolecule[]): SelectorOption[] => {
    const storeMolecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const list = molecules ?? storeMolecules;
    return useMemo(
        () =>
            list
                .filter(molecule => !filter || filter(molecule))
                .map(molecule => ({ value: molecule.uniqueId, label: `${molecule.molNo}: ${molecule.name}` })),
        [list, filter]
    );
};

/**
 * The chains of one loaded molecule as selector options, by chain id, kept up to date with the store.
 * @param moleculeUniqueId - The molecule whose chains are listed; none when null or not loaded.
 * @param allowedTypes - gemmi polymer types to list (see {@link ALL_POLYMER_TYPES}); all by default.
 * @param molecules - Molecules to look the molecule up in instead of the store's.
 */
export const useChainOptions = (
    moleculeUniqueId: string | null | undefined,
    allowedTypes: number[] = ALL_POLYMER_TYPES,
    molecules?: MoorhenMolecule[]
): SelectorOption[] => {
    const storeMolecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const molecule = (molecules ?? storeMolecules).find(molecule => molecule.uniqueId === moleculeUniqueId);
    const typesKey = allowedTypes.join(",");
    return useMemo(
        () =>
            (molecule?.sequences ?? [])
                .filter(sequence => allowedTypes.includes(sequence.type))
                .map(sequence => ({
                    value: sequence.chain,
                    label: sequence.sequence?.length ? `${sequence.chain} (${sequence.sequence.length} residues)` : sequence.chain,
                })),
        // allowedTypes by content: callers often pass a new array each render
        [molecule, molecule?.sequences, typesKey]
    );
};
