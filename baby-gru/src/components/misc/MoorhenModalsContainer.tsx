import { MoorhenModelsModal } from '../modal/MoorhenModelsModal';
import { MoorhenCreateAcedrgLinkModal } from '../modal/MoorhenCreateAcedrgLinkModal';
import { MoorhenMapsModal } from '../modal/MoorhenMapsModal';
import { MoorhenValidationToolsModal } from '../modal/MoorhenValidationToolsModal';
import { MoorhenQuerySequenceModal } from '../modal/MoorhenQuerySequenceModal';
import { MoorhenScriptModal } from '../modal/MoorhenScriptModal';
import { MoorhenControlsModal } from '../modal/MoorhenControlsModal';
import { useDispatch, useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { setShowControlsModal, setShowCreateAcedrgLinkModal, setShowMapsModal, setShowModelsModal, setShowQuerySequenceModal, setShowScriptingModal, setShowValidationModal } from '../../store/activeModalsSlice';

export const MoorhenModalsContainer = (props: moorhen.CollectedProps) => {
    const dispatch = useDispatch()
    const showModelsModal = useSelector((state: moorhen.State) => state.activeModals.showModelsModal)
    const showMapsModal = useSelector((state: moorhen.State) => state.activeModals.showMapsModal)
    const showValidationModal = useSelector((state: moorhen.State) => state.activeModals.showValidationModal)
    const showCreateAcedrgLinkModal = useSelector((state: moorhen.State) => state.activeModals.showCreateAcedrgLinkModal)
    const showQuerySequenceModal = useSelector((state: moorhen.State) => state.activeModals.showQuerySequenceModal)
    const showScriptingModal = useSelector((state: moorhen.State) => state.activeModals.showScriptingModal)
    const showControlsModal = useSelector((state: moorhen.State) => state.activeModals.showControlsModal)

    return <>
        <MoorhenModelsModal
            show={showModelsModal}
            setShow={(newVal: boolean) => dispatch(setShowModelsModal(newVal))}
            {...props}
        />

        <MoorhenMapsModal
            show={showMapsModal}
            setShow={(newVal: boolean) => dispatch(setShowMapsModal(newVal))}
            {...props}
        />
            
        {showCreateAcedrgLinkModal && 
            <MoorhenCreateAcedrgLinkModal
                width={45}
                show={showCreateAcedrgLinkModal}
                setShow={(newVal: boolean) => dispatch(setShowCreateAcedrgLinkModal(newVal))}
                {...props} />
        }

        {showValidationModal && 
            <MoorhenValidationToolsModal 
                show={showValidationModal}
                setShow={(newVal: boolean) => dispatch(setShowValidationModal(newVal))}
                {...props} />
        }

        {showQuerySequenceModal &&
            <MoorhenQuerySequenceModal
                show={showQuerySequenceModal}
                setShow={(newVal: boolean) => dispatch(setShowQuerySequenceModal(newVal))}
                {...props} />
        }

        {showScriptingModal &&
            <MoorhenScriptModal
                show={showScriptingModal}
                setShow={(newVal: boolean) => dispatch(setShowScriptingModal(newVal))}
                {...props} />
        }

        {showControlsModal &&
            <MoorhenControlsModal
                show={showControlsModal}
                setShow={(newVal: boolean) => dispatch(setShowControlsModal(newVal))}
                {...props} />
        }
    </>
}