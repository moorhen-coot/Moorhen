import { useSnackbar } from 'notistack';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { getTooltipShortcutLabel } from '../../utils/MoorhenUtils';

export const MoorhenSnackBar = (props) => {
    const { enqueueSnackbar } = useSnackbar();

    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized)
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const userPreferencesMounted = useSelector((state: moorhen.State) => state.generalStates.userPreferencesMounted)

    useEffect(() => {
        if (cootInitialized && userPreferencesMounted) {
            const shortCut = JSON.parse(shortCuts as string).show_shortcuts
            enqueueSnackbar(`Press ${getTooltipShortcutLabel(shortCut)} to show help`, {variant: 'info'})    
        }
    }, [cootInitialized, userPreferencesMounted])

    return <></>

}