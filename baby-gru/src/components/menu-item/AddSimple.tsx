import { Form, FormSelect } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useRef } from "react";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

("Add simple...");

export const AddSimple = () => {
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const molTypes = [
        "HOH",
        "SO4",
        "PO4",
        "GOL",
        "CIT",
        "EDO",
        "NA",
        "K",
        "MG",
        "CA",
        "MN",
        "FE",
        "CO",
        "NI",
        "CU",
        "ZN",
        "XE",
        "CL",
        "BR",
        "IOD",
    ];

    const molTypeSelectRef = useRef<HTMLSelectElement | null>(null);
    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null);

    const dispatch = useDispatch();

    const onCompleted = useCallback(async () => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (selectedMolecule) {
            await selectedMolecule.addLigandOfType(molTypeSelectRef.current.value);
            dispatch(triggerUpdate(selectedMolecule.molNo));
            document.body.click();
        }
    }, [molecules]);

    return (
        <>
            <Form.Group className="moorhen-form-group" controlId="MoorhenAddSimpleMenuItem">
                <Form.Label>Add...</Form.Label>
                <FormSelect size="sm" ref={molTypeSelectRef} defaultValue={"HOH"}>
                    {molTypes.map(type => {
                        return (
                            <option value={type} key={type}>
                                {type}
                            </option>
                        );
                    })}
                </FormSelect>
            </Form.Group>
            <MoorhenMoleculeSelect molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
