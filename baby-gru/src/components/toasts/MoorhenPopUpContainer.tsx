import { MoorhenAcceptRejectMatchingLigand } from './MoorhenAcceptRejectMatchingLigand';
import { MoorhenGoToResiduePopUp } from './MoorhenGoToResiduePopUp';
import { useDispatch, useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { setShowAcceptMatchingLigandPopUp, setShowGoToResiduePopUp } from '../../store/activePopUpsSlice';
import { MoorhenUpdatingMapsToast } from './MoorhenUpdatingMapsToast';
import { MoorhenModelTrajectoryManager } from './MoorhenModelTrajectoryManager';

export const MoorhenPopUpContainer = (props: moorhen.CollectedProps) => {
    const dispatch = useDispatch()
    const showAcceptMatchingLigandPopUp = useSelector((state: moorhen.State) => state.activePopUps.matchingLigandPopUp.show)
    const showGoToResiduePopUp = useSelector((state: moorhen.State) => state.activePopUps.goToResiduePopUp.show)
    const showModelTrajectoryPopUp = useSelector((state: moorhen.State) => state.activePopUps.modelTrajectoryPopUp.show)

    return <>
        {showAcceptMatchingLigandPopUp && 
            <MoorhenAcceptRejectMatchingLigand
                commandCentre={props.commandCentre}
                show={showAcceptMatchingLigandPopUp}
                setShow={(newVal: boolean) => dispatch(setShowAcceptMatchingLigandPopUp(newVal))}/>
        }
        
        {showGoToResiduePopUp &&
            <MoorhenGoToResiduePopUp
                glRef={props.glRef}
                commandCentre={props.commandCentre}
                show={showGoToResiduePopUp}
                setShow={(newVal: boolean) => dispatch(setShowGoToResiduePopUp(newVal))}/>
        }

        {showModelTrajectoryPopUp &&
            <MoorhenModelTrajectoryManager
                commandCentre={props.commandCentre}
                glRef={props.glRef}/>
        }

        <MoorhenUpdatingMapsToast glRef={props.glRef} commandCentre={props.commandCentre}/>
    </>
}