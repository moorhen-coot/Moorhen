import { moorhen } from "../../../types/moorhen";
import { MoorhenSelect } from "./Select";

type MoorhenChainSelectPropsType = {
    allowedTypes?: number[];
    height?: string;
    width?: string;
    margin?: string;
    label?: string;
    molecules: moorhen.Molecule[];
    selectedCoordMolNo: number;
    onChange?: (arg0: React.ChangeEvent<HTMLSelectElement>) => void;
    defaultValue?: string;
    disabled?: boolean;
    ref?: React.Ref<HTMLSelectElement>;
};

export const MoorhenChainSelect = (props: MoorhenChainSelectPropsType) => {
    // props.allowedTypes refers to gemmi::PolymerType member values -> https://project-gemmi.github.io/python-api/gemmi.html#PolymerType
    // 1: PeptideL, 2: PeptideD, 3: DNA, 4: RNA, 5: DNARNA hybrid
    const { allowedTypes = [1, 2, 3, 4, 5], label = "Chain", defaultValue = -99999, ref = null } = props;

    const handleChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        props.onChange?.(evt);
        if (ref !== null && typeof ref !== "function") ref.current.value = evt.target.value;
    };

    const getChainOptions = (selectedCoordMolNo: number): React.JSX.Element[] => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedCoordMolNo);
        if (selectedMolecule) {
            return selectedMolecule.sequences.map(sequence =>
                allowedTypes.includes(sequence.type) ? (
                    <option value={sequence.chain} key={`${selectedMolecule.molNo}_${sequence.chain}`}>
                        {sequence.chain}
                    </option>
                ) : null
            );
        }
    };

    return (
        <MoorhenSelect ref={ref} disabled={props.disabled} defaultValue={defaultValue} onChange={handleChange} label={label}>
            {props.selectedCoordMolNo !== null ? getChainOptions(props.selectedCoordMolNo) : null}
        </MoorhenSelect>
    );
};
