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
    const handleChange = (evt: ChangeEvent<HTMLSelectElement>) => {
        if (props.onChange) {
            props.onChange(evt)
        }
        if (selectRef !== null && typeof selectRef !== 'function') {
            selectRef.current.value = evt.target.value
        }
    }

    const getLigandOptions = (selectedCoordMolNo: number): JSX.Element[] => {
        let selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedCoordMolNo)
        if (selectedMolecule) {
            return selectedMolecule.ligands.map(ligand => {
                return <option value={ligand.cid} key={ligand.cid}>{ligand.cid}</option>
            })
        }
        
    }

    return <Form.Group style={{ width: props.width, margin: props.margin, height:props.height }}>
        <Form.Label>{props.label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={''} onChange={handleChange} disabled={props.disabled}>
            {props.selectedCoordMolNo !== null ? getLigandOptions(props.selectedCoordMolNo) :  null}
        </FormSelect>
    </Form.Group>

})

MoorhenLigandSelect.defaultProps = { disabled: false, height: '4rem', width: '20rem', margin: '0.5rem', selectedCoordMolNo: null, label: "Ligand" }
