import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { useRef, useState } from "react";
import { setResidueSelection } from "../../store/generalStatesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";

export const CreateSelection = () => {
    const dispatch = useDispatch();

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const cidFormRef = useRef<null | HTMLInputElement>(null);

    const [cid, setCid] = useState<string>("");
    const [invalidCid, setInvalidCid] = useState<boolean>(false);

    const menuItemText = "Create a selection...";

    const { enqueueSnackbar } = useSnackbar();

    const createSelection = async () => {
        const selectedCid = cidFormRef.current.value;
        if (!selectedCid || !moleculeSelectRef.current.value) {
            return;
        }

        const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (!molecule) {
            return;
        }

        let newSelection: moorhen.ResidueSelection;
        try {
            newSelection = await molecule.parseCidIntoSelection(selectedCid);
        } catch (err) {
            console.log(err);
            setInvalidCid(true);
            enqueueSnackbar("Unable to parse CID", { variant: "warning" });
            return;
        }

        if (!newSelection) {
            setInvalidCid(true);
            enqueueSnackbar("Unable to parse CID", { variant: "warning" });
            return;
        }

        setInvalidCid(false);
        await molecule.drawResidueSelection(selectedCid);
        dispatch(setResidueSelection(newSelection));
        enqueueSnackbar("residue-selection", { variant: "residueSelection", persist: true });
        document.body.click();
    };

    return (
        <>
            <MoorhenMoleculeSelect ref={moleculeSelectRef} molecules={molecules} style={{ width: "20rem" }} />
            <MoorhenCidInputForm
                margin={"0.5rem"}
                width="95%"
                onChange={evt => setCid(evt.target.value)}
                ref={cidFormRef}
                invalidCid={invalidCid}
            />
            <MoorhenButton variant="primary" onClick={createSelection}>
                OK
            </MoorhenButton>
        </>
    );
};
