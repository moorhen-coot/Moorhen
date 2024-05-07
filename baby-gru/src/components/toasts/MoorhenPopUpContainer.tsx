import { useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { MoorhenUpdatingMapsToast } from './MoorhenUpdatingMapsToast';
import { MoorhenModelTrajectoryManager } from './MoorhenModelTrajectoryManager';
import { MoorhenTomogramManager } from './MoorhenTomogramManager';

export const MoorhenPopUpContainer = (props: moorhen.CollectedProps) => {

    const showModelTrajectoryPopUp = useSelector((state: moorhen.State) => state.activePopUps.modelTrajectoryPopUp.show)
    const showTomogramPopUp = useSelector((state: moorhen.State) => state.activePopUps.tomogramPopUp.show)

    return <>

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