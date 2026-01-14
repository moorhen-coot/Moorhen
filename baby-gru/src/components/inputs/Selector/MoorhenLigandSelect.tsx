import { ChangeEvent, forwardRef, useState } from "react";
import { moorhen } from "../../../types/moorhen";
import { MoorhenSelect } from "./Select";

type MoorhenLigandSelectProps = {
    height?: string;
    width?: string;
    margin?: string;
    label?: string;
    disabled?: boolean;
    selectedCoordMolNo: number;
    molecules: moorhen.Molecule[];
    onChange?: (arg0: React.ChangeEvent<HTMLSelectElement>) => void;
    ref?: React.Ref<HTMLSelectElement>;
    allowAll?: boolean;
    setValue?: (cid: string) => void;
};

export const MoorhenLigandSelect = (props: MoorhenLigandSelectProps) => {
    const defaultProps = { disabled: false, selectedCoordMolNo: null, label: "Ligand" };
    const { disabled, selectedCoordMolNo, label, ref, allowAll } = { ...defaultProps, ...props };

    const selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedCoordMolNo);
    const allLigands = selectedMolecule.ligands.map(ligand => ligand.cid).join("||");
    const noLigand: boolean = allLigands.length === 0;

    const handleChange = (evt: ChangeEvent<HTMLSelectElement>) => {
        props.onChange?.(evt);
        props.setValue?.(evt.target.value);

        if (ref !== null && typeof ref !== "function") {
            ref.current.value = evt.target.value;
        }
    };

    const getLigandOptions = (selectedCoordMolNo: number): React.JSX.Element[] => {
        let options: React.JSX.Element[] = [];

        if (noLigand) {
            return [
                <option value={null} key="no-ligand">
                    No Ligands
                </option>,
            ];
        }

        if (selectedMolecule) {
            options = selectedMolecule.ligands.map(ligand => {
                return (
                    <option value={ligand.cid} key={ligand.cid}>
                        {ligand.cid}
                    </option>
                );
            });
            if (allowAll) {
                options.unshift(
                    <option value={allLigands} key="all">
                        All Ligands
                    </option>
                );
            }
        }
        return options;
    };

    return (
        <MoorhenSelect label={label} ref={ref} defaultValue={""} onChange={handleChange} disabled={noLigand ? true : disabled}>
            {selectedCoordMolNo !== null ? getLigandOptions(selectedCoordMolNo) : null}
        </MoorhenSelect>
    );
};
