import { MoorhenAcceptRejectMatchingLigand } from './MoorhenAcceptRejectMatchingLigand';
import { useDispatch, useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { setShowAcceptMatchingLigandPopUp } from '../../store/activePopUpsSlice';
import { MoorhenUpdatingMapsToast } from './MoorhenUpdatingMapsToast';
import { MoorhenModelTrajectoryManager } from './MoorhenModelTrajectoryManager';
import { MoorhenTomogramManager } from './MoorhenTomogramManager';

export const MoorhenPopUpContainer = (props: moorhen.CollectedProps) => {
    const dispatch = useDispatch()

    const showAcceptMatchingLigandPopUp = useSelector((state: moorhen.State) => state.activePopUps.matchingLigandPopUp.show)
    const showModelTrajectoryPopUp = useSelector((state: moorhen.State) => state.activePopUps.modelTrajectoryPopUp.show)
    const showTomogramPopUp = useSelector((state: moorhen.State) => state.activePopUps.tomogramPopUp.show)

    return <>
        {showAcceptMatchingLigandPopUp && 
            <MoorhenAcceptRejectMatchingLigand
                commandCentre={props.commandCentre}
                show={showAcceptMatchingLigandPopUp}
                setShow={(newVal: boolean) => dispatch(setShowAcceptMatchingLigandPopUp(newVal))}/>
        }

        {showModelTrajectoryPopUp &&
            <MoorhenModelTrajectoryManager
                commandCentre={props.commandCentre}
                glRef={props.glRef}/>
        }

        {showTomogramPopUp &&
            <MoorhenTomogramManager
                commandCentre={props.commandCentre}
                glRef={props.glRef}/>
        }

        <MoorhenUpdatingMapsToast glRef={props.glRef} commandCentre={props.commandCentre}/>
    </>
}