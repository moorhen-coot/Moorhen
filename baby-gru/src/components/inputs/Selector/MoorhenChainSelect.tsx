import { forwardRef } from "react";
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
};

export const MoorhenChainSelect = forwardRef<HTMLSelectElement, MoorhenChainSelectPropsType>((props, selectRef) => {
    // props.allowedTypes refers to gemmi::PolymerType member values -> https://project-gemmi.github.io/python-api/gemmi.html#PolymerType
    // 1: PeptideL, 2: PeptideD, 3: DNA, 4: RNA, 5: DNARNA hybrid
    const {
        allowedTypes = [1, 2, 3, 4, 5],
        height = "4rem",
        width = "20rem",
        label = "Chain",
        margin = "0.5rem",
        defaultValue = -99999,
    } = props;

    const handleChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        props.onChange?.(evt);
        if (selectRef !== null && typeof selectRef !== "function") selectRef.current.value = evt.target.value;
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
        <MoorhenSelect ref={selectRef} defaultValue={defaultValue} onChange={handleChange} label={label}>
            {props.selectedCoordMolNo !== null ? getChainOptions(props.selectedCoordMolNo) : null}
        </MoorhenSelect>
    );
});
