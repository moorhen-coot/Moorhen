import { useDispatch, useSelector } from "react-redux";
import { useCallback, useRef } from "react";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";

export const MoveMoleculeHere = () => {
    const dispatch = useDispatch();

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);

    const originState = useSelector((state: moorhen.State) => state.glRef.origin);

    const menuItemText = "Move molecule here...";

    const onCompleted = useCallback(async () => {
        if (moleculeSelectRef.current.value === null) {
            return;
        }
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (selectedMolecule) {
            await selectedMolecule.moveMoleculeHere(...(originState.map(coord => -coord) as [number, number, number]));
            dispatch(triggerUpdate(selectedMolecule.molNo));
        }
    }, [molecules]);

    return (
        <>
            <MoorhenMoleculeSelect molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
