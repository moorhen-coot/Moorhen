import { useDispatch, useSelector } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { clearResidueSelection } from "../../store/generalStatesSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { removeMolecule } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { MoorhenStack } from "../interface-base";

export const DeleteUsingCid = () => {
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const cidFormRef = useRef<null | HTMLInputElement>(null);

    const [cid, setCid] = useState<string>("");
    const [invalidCid, setInvalidCid] = useState<boolean>(false);

    const menuItemText = "Delete atom selection...";

    const dispatch = useDispatch();
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const deleteSelection = useCallback(async () => {
        const selectedCid = cidFormRef.current?.value;
        if (!selectedCid || !moleculeSelectRef.current?.value) {
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
            const result = await molecule.deleteCid(selectedCid);
            if (result.second < 1) {
                console.log("Empty molecule detected, deleting it now...");
                molecule.delete();
                dispatch(removeMolecule(molecule));
            } else {
                dispatch(triggerUpdate(molecule.molNo));
            }
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
        <MoorhenStack inputGrid>
            <MoorhenMoleculeSelect molecules={molecules} label="From molecule" allowAny={false} ref={moleculeSelectRef} />
            <MoorhenCidInputForm
                margin={"0.5rem"}
                width="95%"
                label="Selection to delete"
                onChange={evt => setCid(evt.target.value)}
                ref={cidFormRef}
                invalidCid={invalidCid}
                allowUseCurrentSelection={true}
            />
            <MoorhenButton variant="primary" onClick={deleteSelection}>
                OK
            </MoorhenButton>
        </MoorhenStack>
    );
};
