import { MoorhenAcceptRejectMatchingLigand } from './MoorhenAcceptRejectMatchingLigand';
import { MoorhenGoToResiduePopUp } from './MoorhenGoToResiduePopUp';
import { useDispatch, useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { setShowAcceptMatchingLigandPopUp, setShowGoToResiduePopUp } from '../../store/activePopUpsSlice';

export const MoorhenPopUpContainer = (props: moorhen.CollectedProps) => {
    const dispatch = useDispatch()
    const showAcceptMatchingLigandPopUp = useSelector((state: moorhen.State) => state.activePopUps.matchingLigandPopUp.show)
    const showGoToResiduePopUp = useSelector((state: moorhen.State) => state.activePopUps.goToResiduePopUp.show)

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

    </>
}