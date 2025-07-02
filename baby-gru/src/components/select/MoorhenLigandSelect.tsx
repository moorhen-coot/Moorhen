import { ChangeEvent, forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";

type MoorhenLigandSelectPropsType = {
    height?: string;
    width?: string;
    margin?: string;
    label?: string;
    disabled?: boolean;
    selectedCoordMolNo: number;
    molecules: moorhen.Molecule[];
    onChange?: (arg0: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const MoorhenLigandSelect = forwardRef<HTMLSelectElement, MoorhenLigandSelectPropsType>((props, selectRef) => {
    const defaultProps = { disabled: false, height: '4rem', width: '20rem', margin: '0.5rem', selectedCoordMolNo: null, label: "Ligand" }
    const {
        disabled, height, width, margin, selectedCoordMolNo, label
    } = { ...defaultProps, ...props }

    const handleChange = (evt: ChangeEvent<HTMLSelectElement>) => {
        props.onChange?.(evt)
        if (selectRef !== null && typeof selectRef !== 'function') {
            selectRef.current.value = evt.target.value
        }
    }

    const getLigandOptions = (selectedCoordMolNo: number): React.JSX.Element[] => {
        let selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedCoordMolNo)
        if (selectedMolecule) {
            return selectedMolecule.ligands.map(ligand => {
                return <option value={ligand.cid} key={ligand.cid}>{ligand.cid}</option>
            })
        }
    }

    return <Form.Group style={{ width: width, margin: margin, height:height }}>
        <Form.Label>{label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={''} onChange={handleChange} disabled={disabled}>
            {selectedCoordMolNo !== null ? getLigandOptions(selectedCoordMolNo) :  null}
        </FormSelect>
    </Form.Group>

})

