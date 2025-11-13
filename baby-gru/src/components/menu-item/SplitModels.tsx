import { useDispatch, useSelector } from "react-redux";
import { useCallback, useRef } from "react";
import { addMoleculeList } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

export const SplitModels = (props: {
    popoverPlacement?: "left" | "right";
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const dispatch = useDispatch();

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);

    const menuItemText = "Split multi-model molecule...";

    const onCompleted = useCallback(async () => {
        if (moleculeSelectRef.current.value === null) {
            return;
        }
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (selectedMolecule) {
            const newMolecules = await selectedMolecule.splitMultiModels(true);
            dispatch(addMoleculeList(newMolecules));
        }
    }, [molecules]);

    return (
        <>
            <MoorhenMoleculeSelect molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
