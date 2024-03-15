import { MoorhenAcceptRejectMatchingLigand } from '../misc/MoorhenAcceptRejectMatchingLigand';
import { useDispatch, useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { setShowAcceptMatchingLigandPopUp } from '../../store/activePopUpsSlice';

export const MoorhenPopUpContainer = (props: moorhen.CollectedProps) => {
    const dispatch = useDispatch()
    const showAcceptMatchingLigandPopUp = useSelector((state: moorhen.State) => state.activePopUps.matchingLigandPopUp.show)

    return <>
        {showAcceptMatchingLigandPopUp && 
            <MoorhenAcceptRejectMatchingLigand
                commandCentre={props.commandCentre}
                show={showAcceptMatchingLigandPopUp}
                setShow={(newVal: boolean) => dispatch(setShowAcceptMatchingLigandPopUp(newVal))}/>
        }        
    </>
}