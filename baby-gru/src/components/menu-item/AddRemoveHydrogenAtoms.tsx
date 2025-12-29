import { useSelector } from "react-redux";
import { useCallback, useRef } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenStack } from "../interface-base";

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
        <>
            <MoorhenMoleculeSelect ref={moleculeSelectRef} />
            <MoorhenStack direction="line" justify="flex-start">
                <MoorhenButton className="mx-2" variant="primary" onClick={() => handleClick("add_hydrogen_atoms")}>
                    Add
                </MoorhenButton>
                <MoorhenButton className="mx-2" variant="danger" onClick={() => handleClick("delete_hydrogen_atoms")}>
                    Remove
                </MoorhenButton>
            </MoorhenStack>
        </>
    );
};
