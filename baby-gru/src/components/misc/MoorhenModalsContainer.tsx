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
import { MoorhenMrBumpModal } from '../modal/MoorhenMrBumpModal';
import { MoorhenCarbohydrateValidationModal } from '../modal/MoorhenCarbohydrateValidationModal';
import { MoorhenPepFlipsModal } from '../modal/MoorhenPepFlipsModal';
import { MoorhenUnmodelledBlobsModal } from '../modal/MoorhenUnmodelledBlobsModal';
import { MoorhenFillPartialResiduesModal } from '../modal/MoorhenFillPartialResiduesModal';
import { MoorhenSceneSettingsModal } from '../modal/MoorhenSceneSettingsModal';
import { MoorhenSliceNDiceModal } from '../modal/MoorhenSliceNDiceModal';
import { MoorheSuperposeStructuresModal } from '../modal/MoorhenSuperposeStructuresModal';
import { MoorhenLhasaModal } from '../modal/MoorhenLhasaModal';
import { MoorhenQScoreModal } from '../modal/MoorhenQScoreModal';
import { useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { modalKeys } from "../../utils/enums";

export const MoorhenModalsContainer = (props: moorhen.CollectedProps) => {
    const showCreateAcedrgLinkModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.ACEDRG))
    const showQuerySequenceModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SEQ_QUERY))
    const showScriptingModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SCRIPTING))
    const showControlsModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SHOW_CONTROLS))
    const showFitLigandModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.FIT_LIGAND))
    const showRamaPlotModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.RAMA_PLOT))
    const showDiffMapPeaksModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.DIFF_MAP_PEAKS))
    const showValidationPlotModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.VALIDATION_PLOT))
    const showMmrrccModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.MMRRCC))
    const showWaterValidationModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.WATER_VALIDATION))
    const showLigandValidationModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.LIGAND_VALIDATION))
    const showFillPartialResValidationModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.FILL_PART_RES))
    const showMoorhenMrBumpModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.MRBUMP))
    const showPepFlipsValidationModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.PEPTIDE_FLIPS))
    const showUnmodelledBlobsModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.UNMODELLED_BLOBS))
    const showCarbohydrateValidationModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.CARB_VALIDATION))
    const showSliceNDiceModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SLICE_N_DICE))
    const showSuperposeModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SUPERPOSE_MODELS))
    const showSceneSettingsModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SCENE_SETTINGS))
    const showLhasaModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.LHASA))
    const showQScoreModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.QSCORE))

    return <>
        <MoorhenModelsModal {...props}/>

        <MoorhenMapsModal {...props}/>

        {showCreateAcedrgLinkModal &&
            <MoorhenCreateAcedrgLinkModal width={45} {...props} />
        }

        {showQuerySequenceModal &&
            <MoorhenQuerySequenceModal {...props} />
        }

        {showScriptingModal &&
            <MoorhenScriptModal {...props} />
        }

        {showControlsModal &&
            <MoorhenControlsModal {...props} />
        }

        {showFitLigandModal &&
            <MoorheFindLigandModal {...props}/>
        }

        {showRamaPlotModal &&
            <MoorhenRamaPlotModal {...props} />
        }

        {showDiffMapPeaksModal &&
            <MoorhenDiffMapPeaksModal {...props} />
        }

        {showValidationPlotModal &&
            <MoorhenValidationPlotModal {...props} />
        }

        {showMmrrccModal &&
            <MoorhenMmrrccModal {...props} />
        }

        {showWaterValidationModal &&
            <MoorhenWaterValidationModal {...props} />
        }

        {showLigandValidationModal &&
            <MoorhenLigandValidationModal {...props} />
        }

        {showMoorhenMrBumpModal &&
            <MoorhenMrBumpModal {...props} />
        }

        {showCarbohydrateValidationModal &&
            <MoorhenCarbohydrateValidationModal {...props} />
        }

        {showPepFlipsValidationModal &&
            <MoorhenPepFlipsModal {...props} />
        }

        {showUnmodelledBlobsModal &&
            <MoorhenUnmodelledBlobsModal {...props} />
        }

        {showFillPartialResValidationModal &&
            <MoorhenFillPartialResiduesModal {...props} />
        }

        {showSceneSettingsModal &&
            <MoorhenSceneSettingsModal {...props} />
        }

        {showSliceNDiceModal &&
            <MoorhenSliceNDiceModal {...props} />
        }

        {showSuperposeModal &&
            <MoorheSuperposeStructuresModal {...props} />
        }

        {showLhasaModal &&
            <MoorhenLhasaModal {...props} />
        }

        {showQScoreModal &&
            <MoorhenQScoreModal {...props}/>
        }

        {props.extraDraggableModals && props.extraDraggableModals.map(modal => modal)}
    </>
}
