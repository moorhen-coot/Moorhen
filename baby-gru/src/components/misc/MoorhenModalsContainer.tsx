import { MoorhenModelsModal } from '../modal/MoorhenModelsModal';
import { MoorhenCreateAcedrgLinkModal } from '../modal/MoorhenCreateAcedrgLinkModal';
import { MoorhenMapsModal } from '../modal/MoorhenMapsModal';
import { MoorhenQuerySequenceModal } from '../modal/MoorhenQuerySequenceModal';
import { MoorhenScriptModal } from '../modal/MoorhenScriptModal';
import { MoorhenControlsModal } from '../modal/MoorhenControlsModal';
import { MoorheFindLigandModal } from '../modal/MoorhenFindLigandModal';
import { MoorhenRamaPlotModal } from '../modal/MoorhenRamaPlotModal';
import { MoorhenDiffMapPeaksModal } from '../modal/MoorhenDiffMapPeaksModal';
import { MoorhenValidationPlotModal } from '../modal/MoorhenValidationPlotModal';
import { MoorhenMmrrccModal } from '../modal/MoorhenMmrrccModal';
import { MoorhenWaterValidationModal } from '../modal/MoorhenWaterValidationModal';
import { MoorhenLigandValidationModal } from '../modal/MoorhenLigandValidationModal';
import { MoorhenCarbohydrateValidationModal } from '../modal/MoorhenCarbohydrateValidationModal';
import { MoorhenPepFlipsModal } from '../modal/MoorhenPepFlipsModal';
import { MoorhenUnmodelledBlobsModal } from '../modal/MoorhenUnmodelledBlobsModal';
import { MoorhenFillPartialResiduesModal } from '../modal/MoorhenFillPartialResiduesModal';
import { MoorhenSceneSettingsModal } from '../modal/MoorhenSceneSettingsModal';
import { MoorhenSliceNDiceModal } from '../modal/MoorhenSliceNDiceModal';
import { MoorheSuperposeStructuresModal } from '../modal/MoorhenSuperposeStructuresModal';
import { useDispatch, useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { 
    setShowControlsModal, setShowCreateAcedrgLinkModal, setShowDiffMapPeaksModal, setShowFillPartialResValidationModal, setShowFitLigandModal, setShowLigandValidationModal, setShowMapsModal, 
    setShowMmrrccModal, setShowModelsModal, setShowPepFlipsValidationModal, setShowQuerySequenceModal, setShowRamaPlotModal, setShowSceneSettingsModal, setShowScriptingModal, 
    setShowUnmodelledBlobsModal, setShowValidationPlotModal, setShowWaterValidationModal, setShowCarbohydrateValidationModal, setShowSliceNDiceModal, setShowSuperposeModal
} from '../../store/activeModalsSlice';

export const MoorhenModalsContainer = (props: moorhen.CollectedProps) => {
    const dispatch = useDispatch()
    const showModelsModal = useSelector((state: moorhen.State) => state.activeModals.showModelsModal)
    const showMapsModal = useSelector((state: moorhen.State) => state.activeModals.showMapsModal)
    const showCreateAcedrgLinkModal = useSelector((state: moorhen.State) => state.activeModals.showCreateAcedrgLinkModal)
    const showQuerySequenceModal = useSelector((state: moorhen.State) => state.activeModals.showQuerySequenceModal)
    const showScriptingModal = useSelector((state: moorhen.State) => state.activeModals.showScriptingModal)
    const showControlsModal = useSelector((state: moorhen.State) => state.activeModals.showControlsModal)
    const showFitLigandModal = useSelector((state: moorhen.State) => state.activeModals.showFitLigandModal)
    const showRamaPlotModal = useSelector((state: moorhen.State) => state.activeModals.showRamaPlotModal)
    const showDiffMapPeaksModal = useSelector((state: moorhen.State) => state.activeModals.showDiffMapPeaksModal)
    const showValidationPlotModal = useSelector((state: moorhen.State) => state.activeModals.showValidationPlotModal)
    const showMmrrccModal = useSelector((state: moorhen.State) => state.activeModals.showMmrrccModal)
    const showWaterValidationModal = useSelector((state: moorhen.State) => state.activeModals.showWaterValidationModal)
    const showLigandValidationModal = useSelector((state: moorhen.State) => state.activeModals.showLigandValidationModal)
    const showFillPartialResValidationModal = useSelector((state: moorhen.State) => state.activeModals.showFillPartialResValidationModal)
    const showPepFlipsValidationModal = useSelector((state: moorhen.State) => state.activeModals.showPepFlipsValidationModal)
    const showUnmodelledBlobsModal = useSelector((state: moorhen.State) => state.activeModals.showUnmodelledBlobsModal)
    const showCarbohydrateValidationModal = useSelector((state: moorhen.State) => state.activeModals.showCarbohydrateModal)
    const showSliceNDiceModal = useSelector((state: moorhen.State) => state.activeModals.showSliceNDiceModal)
    const showSuperposeModal = useSelector((state: moorhen.State) => state.activeModals.showSuperposeModal)

    const showSceneSettingsModal = useSelector((state: moorhen.State) => state.activeModals.showSceneSettingsModal)

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

        {showFitLigandModal &&
            <MoorheFindLigandModal
            show={showFitLigandModal}
            setShow={(newVal: boolean) => dispatch(setShowFitLigandModal(newVal))}
            {...props} />
        }

        {showRamaPlotModal &&
            <MoorhenRamaPlotModal
            show={showRamaPlotModal}
            setShow={(newVal: boolean) => dispatch(setShowRamaPlotModal(newVal))}
            {...props} />
        }

        {showDiffMapPeaksModal &&
            <MoorhenDiffMapPeaksModal
            show={showDiffMapPeaksModal}
            setShow={(newVal: boolean) => dispatch(setShowDiffMapPeaksModal(newVal))}
            {...props} />
        }

        {showValidationPlotModal &&
            <MoorhenValidationPlotModal
            show={showValidationPlotModal}
            setShow={(newVal: boolean) => dispatch(setShowValidationPlotModal(newVal))}
            {...props} />
        }

        {showMmrrccModal &&
            <MoorhenMmrrccModal
            show={showMmrrccModal}
            setShow={(newVal: boolean) => dispatch(setShowMmrrccModal(newVal))}
            {...props} />
        }

        {showWaterValidationModal &&
            <MoorhenWaterValidationModal
            show={showWaterValidationModal}
            setShow={(newVal: boolean) => dispatch(setShowWaterValidationModal(newVal))}
            {...props} />
        }

        {showLigandValidationModal &&
            <MoorhenLigandValidationModal
            show={showLigandValidationModal}
            setShow={(newVal: boolean) => dispatch(setShowLigandValidationModal(newVal))}
            {...props} />
        }

        {showCarbohydrateValidationModal &&
                <MoorhenCarbohydrateValidationModal
                show={showCarbohydrateValidationModal}
                setShow={(newVal: boolean) => dispatch(setShowCarbohydrateValidationModal(newVal))}
                {...props} />
        }

        {showPepFlipsValidationModal &&
            <MoorhenPepFlipsModal
            show={showPepFlipsValidationModal}
            setShow={(newVal: boolean) => dispatch(setShowPepFlipsValidationModal(newVal))}
            {...props} />
        }

        {showUnmodelledBlobsModal &&
            <MoorhenUnmodelledBlobsModal
            show={showUnmodelledBlobsModal}
            setShow={(newVal: boolean) => dispatch(setShowUnmodelledBlobsModal(newVal))}
            {...props} />
        }

        {showFillPartialResValidationModal &&
            <MoorhenFillPartialResiduesModal
            show={showFillPartialResValidationModal}
            setShow={(newVal: boolean) => dispatch(setShowFillPartialResValidationModal(newVal))}
            {...props} />
        }

        {showSceneSettingsModal &&
            <MoorhenSceneSettingsModal
            show={showSceneSettingsModal}
            setShow={(newVal: boolean) => dispatch(setShowSceneSettingsModal(newVal))}
            {...props} />
        }

        {showSliceNDiceModal &&
            <MoorhenSliceNDiceModal
            show={showSliceNDiceModal}
            setShow={(newVal: boolean) => dispatch(setShowSliceNDiceModal(newVal))}
            {...props} />
        }

        {showSuperposeModal &&
            <MoorheSuperposeStructuresModal
            show={showSuperposeModal}
            setShow={(newVal: boolean) => dispatch(setShowSuperposeModal(newVal))}
            {...props} />
        }

        {props.extraDraggableModals && props.extraDraggableModals.map(modal => modal)}
    </>
}