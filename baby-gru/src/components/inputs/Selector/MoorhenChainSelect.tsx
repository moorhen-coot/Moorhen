import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { MoorhenSelect } from "./Select";

type MoorhenChainSelectPropsType = {
    allowedTypes?: number[];
    height?: string;
    width?: string;
    margin?: string;
    label?: string;
    /** Molecules to look the selected one up in. Defaults to the molecules loaded in Moorhen. */
    molecules?: MoorhenMolecule[];
    /** The molecule whose chains are listed, by unique id. */
    moleculeUniqueId?: string | null;
    /** @deprecated Use `moleculeUniqueId`: molNo is being phased out of the API. */
    selectedCoordMolNo?: number | null;
    onChange?: (arg0: React.ChangeEvent<HTMLSelectElement>) => void;
    defaultValue?: string;
    disabled?: boolean;
    ref?: React.Ref<HTMLSelectElement>;
    allowAll?: boolean;
    value?: string;
    setValue?: React.Dispatch<React.SetStateAction<string>> | ((newValue: string) => void);
};

export const MoorhenChainSelect = (props: MoorhenChainSelectPropsType) => {
    // props.allowedTypes refers to gemmi::PolymerType member values -> https://project-gemmi.github.io/python-api/gemmi.html#PolymerType
    // 1: PeptideL, 2: PeptideD, 3: DNA, 4: RNA, 5: DNARNA hybrid
    const { allowedTypes = [1, 2, 3, 4, 5], label = "Chain", defaultValue = -99999, ref = null } = props;
    const storeMolecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const molecules = props.molecules ?? storeMolecules;
    const selectedMolecule =
        props.moleculeUniqueId != null
            ? molecules.find(molecule => molecule.uniqueId === props.moleculeUniqueId)
            : props.selectedCoordMolNo != null
              ? molecules.find(molecule => molecule.molNo === props.selectedCoordMolNo)
              : undefined;

    const handleChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        props.onChange?.(evt);
        if (ref !== null && typeof ref !== "function") ref.current.value = evt.target.value;
    };

    const getChainOptions = (): React.JSX.Element[] => {
        if (selectedMolecule) {
            const option = selectedMolecule.sequences.map(sequence =>
                allowedTypes.includes(sequence.type) ? (
                    <option value={sequence.chain} key={`${selectedMolecule.uniqueId}_${sequence.chain}`}>
                        {sequence.chain}
                    </option>
                ) : null
            );
            if (props.allowAll) {
                option.unshift(
                    <option value="*" key={`${selectedMolecule.uniqueId}_all`}>
                        All
                    </option>
                );
            }
            return option;
        }
        return [];
    };

    return (
        <MoorhenSelect ref={ref} disabled={props.disabled} defaultValue={props.value === undefined ? defaultValue : undefined} value={props.value} setValue={props.setValue} onChange={handleChange} label={label}>
            {getChainOptions()}
        </MoorhenSelect>
    );
};
