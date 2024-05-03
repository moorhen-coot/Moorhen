import { useSnackbar } from 'notistack';
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { atomInfoToResSpec, cidToSpec, getTooltipShortcutLabel } from '../../utils/MoorhenUtils';
import { webGL } from '../../types/mgWebGL';
import { clearResidueSelection, setResidueSelection } from '../../store/generalStatesSlice';

export const MoorhenSnackBarManager = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const { enqueueSnackbar } = useSnackbar()

    const dispatch = useDispatch()

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized)
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const userPreferencesMounted = useSelector((state: moorhen.State) => state.generalStates.userPreferencesMounted)
    const isChangingRotamers = useSelector((state: moorhen.State) => state.generalStates.isChangingRotamers)
    const isRotatingAtoms = useSelector((state: moorhen.State) => state.generalStates.isRotatingAtoms)
    const isDraggingAtoms = useSelector((state: moorhen.State) => state.generalStates.isDraggingAtoms)
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)

    const handleAtomClicked = useCallback(async (evt: moorhen.AtomClickedEvent) => {
        if (!evt.detail.isResidueSelection || evt.detail.buffer.id == null || isDraggingAtoms || isRotatingAtoms || isChangingRotamers) {
            return
        } 

        const selectedMolecule = molecules.find(molecule => molecule.buffersInclude(evt.detail.buffer))
        if (!selectedMolecule) {
            dispatch( clearResidueSelection() )
            return
        }
        
        if (residueSelection.first === null || residueSelection.molecule === null || residueSelection.molecule.molNo !== selectedMolecule.molNo) {
            const resSpec = atomInfoToResSpec(evt.detail.atom)
            await selectedMolecule.drawResidueSelection(`/*/${resSpec.chain_id}/${resSpec.res_no}-${resSpec.res_no}/*`)
            dispatch(
                setResidueSelection({
                    molecule: selectedMolecule,
                    first: resSpec.cid,
                    second: null,
                    cid: null,
                    isMultiCid: false,
                    label: `/${resSpec.mol_no}/${resSpec.chain_id}/${resSpec.res_no}`
                })
            )
            enqueueSnackbar("residue-selection", {variant: "residueSelection", persist: true})
            return
        }

        const startResSpec = cidToSpec(residueSelection.first)
        const stopResSpec = atomInfoToResSpec(evt.detail.atom)
        if (startResSpec.chain_id !== stopResSpec.chain_id) {
            dispatch( clearResidueSelection() )
        } else {
            const sortedResNums = [startResSpec.res_no, stopResSpec.res_no].sort(function(a, b){return a - b})
            const cid = `/*/${startResSpec.chain_id}/${sortedResNums[0]}-${sortedResNums[1]}/*`
            await selectedMolecule.drawResidueSelection(cid)
            dispatch(
                setResidueSelection({
                    molecule: selectedMolecule,
                    first: residueSelection.first,
                    second: stopResSpec.cid,
                    cid: cid,
                    isMultiCid: false,
                    label: `/${startResSpec.mol_no}/${startResSpec.chain_id}/${sortedResNums[0]}-${sortedResNums[1]}`
                })
            )
            enqueueSnackbar("residue-selection", {variant: "residueSelection", persist: true})
        }
    }, [residueSelection, isRotatingAtoms, isChangingRotamers, isDraggingAtoms])

    useEffect(() => {
        if (cootInitialized && userPreferencesMounted) {
            const shortCut = JSON.parse(shortCuts as string).show_shortcuts
            enqueueSnackbar(`Press ${getTooltipShortcutLabel(shortCut)} to show help`, {variant: 'info'})
        }
    }, [cootInitialized, userPreferencesMounted])

    useEffect(() => {
        document.addEventListener('atomClicked', handleAtomClicked)
        return () => {
            document.removeEventListener('atomClicked', handleAtomClicked)
        }
    }, [handleAtomClicked])

    return <></>

}