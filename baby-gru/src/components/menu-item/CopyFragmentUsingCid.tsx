import { useDispatch, useSelector } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { clearResidueSelection } from "../../store/generalStatesSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";

const menuItemText = "Copy fragment...";

export const CopyFragmentUsingCid = () => {
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const cidFormRef = useRef<null | HTMLInputElement>(null);

    const [cid, setCid] = useState<string>("");
    const [invalidCid, setInvalidCid] = useState<boolean>(false);

    const dispatch = useDispatch();
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const createSelection = useCallback(async () => {
        const selectedCid = cidFormRef.current.value;
        if (!selectedCid || !moleculeSelectRef.current.value) {
            return;
        }

        const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (!molecule) {
            return;
        }

        const isValidSelection = await molecule.isValidSelection(selectedCid);
        if (!isValidSelection) {
            setInvalidCid(true);
            return;
        }

        try {
            setInvalidCid(false);
            const newMolecule = await molecule.copyFragmentUsingCid(selectedCid, true);
            dispatch(addMolecule(newMolecule));
            document.body.click();
            if (selectedCid === residueSelection.cid) {
                dispatch(clearResidueSelection());
            }
        } catch (err) {
            setInvalidCid(true);
            console.warn(err);
        }
    }, [residueSelection, molecules]);

    return (
        <>
            <MoorhenMoleculeSelect molecules={molecules} label="From molecule" allowAny={false} ref={moleculeSelectRef} />
            <MoorhenCidInputForm
                margin={"0.5rem"}
                width="95%"
                label="Selection to copy"
                onChange={evt => setCid(evt.target.value)}
                ref={cidFormRef}
                invalidCid={invalidCid}
                allowUseCurrentSelection={true}
            />
            <MoorhenButton variant="primary" onClick={createSelection}>
                OK
            </MoorhenButton>
        </>
    );
};
