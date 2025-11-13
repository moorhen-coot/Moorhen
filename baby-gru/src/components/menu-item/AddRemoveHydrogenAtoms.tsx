import { Button, Form } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useCallback, useRef } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { moorhen } from "../../types/moorhen";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

("Add/Remove hydrogen atoms...");

export const AddRemoveHydrogenAtoms = () => {
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const commandCentre = useCommandCentre();

    const handleClick = useCallback(
        async (cootCommand: string) => {
            if (moleculeSelectRef.current !== null && moleculeSelectRef.current.value) {
                const selectedMolNo = parseInt(moleculeSelectRef.current.value);
                await commandCentre?.current.cootCommand(
                    {
                        message: "coot_command",
                        command: cootCommand,
                        returnType: "status",
                        commandArgs: [selectedMolNo],
                        changesMolecules: [selectedMolNo],
                    },
                    true
                );
                const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMolNo);
                selectedMolecule?.setAtomsDirty(true);
                selectedMolecule?.redraw();
                document.body.click();
            }
            document.body.click();
        },
        [moleculeSelectRef, molecules, commandCentre]
    );

    return (
        <Form.Group>
            <MoorhenMoleculeSelect molecules={molecules} label="Molecule" allowAny={false} ref={moleculeSelectRef} />
            <Button className="mx-2" variant="primary" onClick={() => handleClick("add_hydrogen_atoms")}>
                Add
            </Button>
            <Button className="mx-2" variant="danger" onClick={() => handleClick("delete_hydrogen_atoms")}>
                Remove
            </Button>
        </Form.Group>
    );
};
