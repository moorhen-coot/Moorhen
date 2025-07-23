import { SnackbarKey, useSnackbar } from 'notistack';
import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { atomInfoToResSpec, cidToSpec, getTooltipShortcutLabel, sleep } from '../../utils/utils';
import { clearResidueSelection, setResidueSelection } from '../../store/generalStatesSlice';

export const MoorhenSnackBarManager = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {

    const { enqueueSnackbar, closeSnackbar } = useSnackbar()

    const dispatch = useDispatch()

    const newCommandStart = useSelector((state: moorhen.State) => state.generalStates.newCootCommandStart)
    const newCommandExit = useSelector((state: moorhen.State) => state.generalStates.newCootCommandExit)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized)
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const userPreferencesMounted = useSelector((state: moorhen.State) => state.generalStates.userPreferencesMounted)
    const isChangingRotamers = useSelector((state: moorhen.State) => state.generalStates.isChangingRotamers)
    const isRotatingAtoms = useSelector((state: moorhen.State) => state.generalStates.isRotatingAtoms)
    const isDraggingAtoms = useSelector((state: moorhen.State) => state.generalStates.isDraggingAtoms)
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)
    const isAnimatingTrajectory = useSelector((state: moorhen.State) => state.generalStates.isAnimatingTrajectory)
    const isShowingTomograms = useSelector((state: moorhen.State) => state.generalStates.isShowingTomograms)
    
    const longJobSnackRef = useRef<SnackbarKey | null>(null)

    const checkJobInQueueTooLong = useCallback((messages: string[]) => {
        if (
            messages.length > 0
            && props.commandCentre.current.activeMessages.length > 0 
            && props.commandCentre.current.activeMessages.some(item => messages.includes(item?.messageId))
            && longJobSnackRef.current === null
            && !isAnimatingTrajectory
            && !isShowingTomograms
        ) {
            longJobSnackRef.current = enqueueSnackbar("long-job-notification", {
                variant: "longJobNotification",
                persist: true,
                anchorOrigin: { vertical: 'bottom', horizontal: 'center' }
            })
        }
    }, [])

    const checkWorkerBusy = useCallback(async () => {
        for (let i = 0; i < 30; i++) {
            await sleep(100)
            if (props.commandCentre.current?.activeMessages.length === 0) {
                break
            }
            if (i === 29 && longJobSnackRef.current === null && !isAnimatingTrajectory && !isShowingTomograms) {
                longJobSnackRef.current = enqueueSnackbar("long-job-notification", { 
                    variant: "longJobNotification",
                    persist: true,
                    anchorOrigin: { vertical: 'bottom', horizontal: 'center' }
                })
            }
        }
    }, [isAnimatingTrajectory, isShowingTomograms])

    const debouncedClearBusy = useCallback(() => {
        if (props.commandCentre.current?.activeMessages.length === 0 && longJobSnackRef.current !== null) {
            closeSnackbar(longJobSnackRef.current)
            longJobSnackRef.current = null
        }
    }, []);

    useEffect(() => {
        const messages = props.commandCentre.current?.activeMessages.map(item => item?.messageId)
        if (props.commandCentre.current?.activeMessages.length > 0) {
            // Check if any of the jobs in the list spends more than 3 seconds in the queue
            const timeoutId = setTimeout(() => {
                checkJobInQueueTooLong(messages)
            }, 3000)
            // Check if the worker has at least one job running for the last 3 seconds
            checkWorkerBusy()
            // Clear timeout
            return () => {
                clearTimeout(timeoutId)
            }
        } 
    }, [newCommandStart, checkWorkerBusy, checkJobInQueueTooLong])

    useEffect(() => {
        if (props.commandCentre.current?.activeMessages.length === 0) {
            // If in 500 ms the queue is still empty then the worker is not busy anymore
            const timeoutId = setTimeout(debouncedClearBusy, 500)
            return () => {
                clearTimeout(timeoutId)
            }
        }
    }, [newCommandExit])

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

    return null

}