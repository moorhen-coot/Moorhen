import { useDispatch, useSelector } from "react-redux";
import { useRef } from "react";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { removeGeneralRepresentation } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";

export const ClearSelfRestraints = () => {
    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null);

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const dispatch = useDispatch();

    const onCompleted = async () => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (selectedMolecule) {
            await selectedMolecule.clearExtraRestraints();
            const restraintsRepresenation = selectedMolecule.representations.find(representation => representation.style === "restraints");
            if (restraintsRepresenation) {
                dispatch(removeGeneralRepresentation(restraintsRepresenation));
            }
            dispatch(triggerUpdate(selectedMolecule.molNo));
        }
        const restraintsRepresenation = selectedMolecule.representations.find(item => item.style === "restraints");
        if (restraintsRepresenation) {
            selectedMolecule.removeRepresentation(restraintsRepresenation.uniqueId);
        }
        document.body.click();
    };
    return (
        <>
            <MoorhenMoleculeSelect ref={moleculeSelectRef} molecules={molecules} filterFunction={mol => mol.restraints.length > 0} />
            <MoorhenButton onClick={onCompleted}> OK</MoorhenButton>
        </>
    );
};
