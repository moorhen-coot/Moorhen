import { enqueueSnackbar, useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { useCommandCentre, useMoorhenInstance } from "../../InstanceManager";
import useStateWithRef from "../../hooks/useStateWithRef";
import { usePersistentState } from "../../store/menusSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenNumberInput } from "../inputs";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";

export const AddWaters = () => {
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const mapSelectRef = useRef<null | HTMLSelectElement>(null);

    const dispatch = useDispatch();
    const menu = "addWatersMenu";
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const [sigmaMap, setSigmaMap] = usePersistentState<number>(menu, "sigmaMap", 1.75, true);
    const sigmaMapRef = useRef<number>(1.75);
    const moorhenInstance = useMoorhenInstance();
    const onCompleted = async () => {
        if (mapSelectRef.current.value === null || moleculeSelectRef.current.value === null) {
            return;
        }

        const moleculeMolNo = parseInt(moleculeSelectRef.current.value);
        const mapMolNo = parseInt(mapSelectRef.current.value);

        await moorhenInstance.cootCommand.set_add_waters_sigma_cutoff(sigmaMapRef.current);
        console.log("Set sigma to ", sigmaMapRef.current);
        const result = await moorhenInstance.cootCommand.add_water(moleculeMolNo, mapMolNo);
        const added = result.data.result.result;
        enqueueSnackbar(`Added ${added} water molecules`, { variant: "success" });
        document.body.click();

        const selectedMolecule = molecules.find(molecule => molecule.molNo === moleculeMolNo);
        selectedMolecule.setAtomsDirty(true);
        await selectedMolecule.redraw();
        dispatch(triggerUpdate(moleculeMolNo));
    };

    return (
        <>
            <MoorhenMoleculeSelect molecules={molecules} ref={moleculeSelectRef} allowAny={false} />
            <MoorhenMapSelect maps={maps} ref={mapSelectRef} />
            <MoorhenNumberInput label="RMSD cutoff" type="number" value={sigmaMap} setValue={val => setSigmaMap(+val)} />
            <MoorhenButton onClick={onCompleted}> OK</MoorhenButton>
        </>
    );
};
