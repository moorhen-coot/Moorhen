import { enqueueSnackbar, useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useRef, useState } from 'react';
import { useCommandCentre, useMoorhenInstance } from '../../InstanceManager';
import useStateWithRef from '../../hooks/useStateWithRef';
import { usePersistentState } from '../../store/menusSlice';
import { triggerUpdate } from '../../store/moleculeMapUpdateSlice';
import { moorhen } from '../../types/moorhen';
import { MoorhenPreciseInput } from '../inputs';
import { MoorhenMapSelect } from '../select/MoorhenMapSelect';
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect';
import { MoorhenBaseMenuItem } from './MoorhenBaseMenuItem';

export const MoorhenAddWatersMenuItem = (props: { setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const mapSelectRef = useRef<null | HTMLSelectElement>(null);

    const dispatch = useDispatch();
    const menu = 'addWatersMenu';
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const [sigmaMap, setSigmaMap] = usePersistentState<number>(menu, 'sigmaMap', 1.75, true);
    const sigmaMapRef = useRef<number>(1.75);
    const moorhenInstance = useMoorhenInstance();

    const panelContent = (
        <>
            <MoorhenMoleculeSelect molecules={molecules} ref={moleculeSelectRef} allowAny={false} />
            <MoorhenMapSelect maps={maps} ref={mapSelectRef} />
            <MoorhenPreciseInput label="RMSD cutoff" type="number" value={sigmaMap} setValue={val => setSigmaMap(+val)} />
        </>
    );

    const onCompleted = async () => {
        if (mapSelectRef.current.value === null || moleculeSelectRef.current.value === null) {
            return;
        }

        const moleculeMolNo = parseInt(moleculeSelectRef.current.value);
        const mapMolNo = parseInt(mapSelectRef.current.value);

        await moorhenInstance.cootCommand.set_add_waters_sigma_cutoff(sigmaMapRef.current);
        console.log('Set sigma to ', sigmaMapRef.current);
        const result = await moorhenInstance.cootCommand.add_water(moleculeMolNo, mapMolNo);
        const added = result.data.result.result;
        enqueueSnackbar(`Added ${added} water molecules`, { variant: 'success' });

        const selectedMolecule = molecules.find(molecule => molecule.molNo === moleculeMolNo);
        selectedMolecule.setAtomsDirty(true);
        await selectedMolecule.redraw();

        dispatch(triggerUpdate(moleculeMolNo));
    };

    return (
        <MoorhenBaseMenuItem
            id="add-waters-menu-item"
            popoverContent={panelContent}
            menuItemText="Add waters..."
            onCompleted={onCompleted}
            setPopoverIsShown={props.setPopoverIsShown}
        />
    );
};
