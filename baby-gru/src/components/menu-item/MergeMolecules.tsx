import { useDispatch, useSelector } from "react-redux";
import { useCallback, useRef } from "react";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { enqueueSnackbar } from "@/store";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const MergeMolecules = () => {
    const toRef = useRef<null | HTMLSelectElement>(null);
    const fromRef = useRef<null | HTMLSelectElement>(null);

    // const menuItemText = props.menuItemText ?? "Merge molecules...";

    const dispatch = useDispatch();
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const onCompleted = useCallback(async () => {
        const toMolecule = molecules.find(molecule => molecule.molNo === parseInt(toRef.current.value));
        // const fromMolNo: number = props.fromMolNo ?? parseInt(fromRef.current.value);
        const fromMolNo = parseInt(fromRef.current.value);
        const otherMolecules = molecules.filter(molecule => molecule.molNo === fromMolNo && molecule.molNo !== toMolecule.molNo);
        if (otherMolecules.length <= 0) {
            dispatch(enqueueSnackbar({ message: "Select two different molecules to merge", variant: "warning" }));
            return;
        }
        try {
            await toMolecule.mergeMolecules(otherMolecules, true);
            dispatch(triggerUpdate(toMolecule.molNo));
            dispatch(enqueueSnackbar({ message: `Merged into ${toMolecule.name}`, variant: "success" }));
        } catch (err) {
            console.error(err);
            dispatch(enqueueSnackbar({ message: "Failed to merge molecules", variant: "error" }));
        }
        document.body.click();
    }, [toRef.current, fromRef.current, molecules]);

    return (
        <MoorhenStack inputGrid>
            <MoorhenMoleculeSelect molecules={molecules} label="From molecule" allowAny={false} ref={fromRef} />
            <MoorhenMoleculeSelect molecules={molecules} label="Into molecule" allowAny={false} ref={toRef} />
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </MoorhenStack>
    );
};
