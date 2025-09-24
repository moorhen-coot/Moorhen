import { useSelector } from 'react-redux';
import { memo } from 'react';
import { moorhen } from '../../types/moorhen';
import { modalKeys } from '../../utils/enums';
import { Moorhen2DCanvasObjectsModal } from '../modal/Moorhen2DCanvasObjectsModal';
import { MoorhenCarbohydrateValidationModal } from '../modal/MoorhenCarbohydrateValidationModal';
import { MoorhenColourMapByOtherMapModal } from '../modal/MoorhenColourMapByOtherMapModal';
import { MoorhenControlsModal } from '../modal/MoorhenControlsModal';
import { MoorhenCreateAcedrgLinkModal } from '../modal/MoorhenCreateAcedrgLinkModal';
import { MoorhenDiffMapPeaksModal } from '../modal/MoorhenDiffMapPeaksModal';
import { MoorhenFillPartialResiduesModal } from '../modal/MoorhenFillPartialResiduesModal';
import { MoorheFindLigandModal } from '../modal/MoorhenFindLigandModal';
import { MoorhenJsonValidationModal } from '../modal/MoorhenJsonValidationModal';
import { MoorhenLhasaModal } from '../modal/MoorhenLhasaModal';
import { MoorhenLigandValidationModal } from '../modal/MoorhenLigandValidationModal';
import { MoorhenMapsModal } from '../modal/MoorhenMapsModal';
import { MoorhenMmrrccModal } from '../modal/MoorhenMmrrccModal';
import { MoorhenModelsModal } from '../modal/MoorhenModelsModal';
import { MoorhenMrBumpModal } from '../modal/MoorhenMrBumpModal';
import { MoorhenMrParseModal } from '../modal/MoorhenMrParseModal';
import { MoorhenPepFlipsModal } from '../modal/MoorhenPepFlipsModal';
import { MoorhenQScoreModal } from '../modal/MoorhenQScoreModal';
import { MoorhenQuerySequenceModal } from '../modal/MoorhenQuerySequenceModal';
import { MoorhenRamaPlotModal } from '../modal/MoorhenRamaPlotModal';
import { MoorhenSceneSettingsModal } from '../modal/MoorhenSceneSettingsModal';
import { MoorhenScriptModal } from '../modal/MoorhenScriptModal';
import { MoorhenSliceNDiceModal } from '../modal/MoorhenSliceNDiceModal';
import { MoorheSuperposeStructuresModal } from '../modal/MoorhenSuperposeStructuresModal';
import { MoorhenUnmodelledBlobsModal } from '../modal/MoorhenUnmodelledBlobsModal';
import { MoorhenValidationPlotModal } from '../modal/MoorhenValidationPlotModal';
import { MoorhenVectorsModal } from '../modal/MoorhenVectorsModal';
import { MoorhenWaterValidationModal } from '../modal/MoorhenWaterValidationModal';

export type ExtraDraggableModals = React.JSX.Element[];

export const MoorhenModalsContainer = memo((props: { extraDraggableModals: ExtraDraggableModals }) => {
    const showCreateAcedrgLinkModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.ACEDRG));
    const showQuerySequenceModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SEQ_QUERY));
    const showScriptingModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SCRIPTING));
    const showControlsModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SHOW_CONTROLS));
    const showFitLigandModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.FIT_LIGAND));
    const showRamaPlotModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.RAMA_PLOT));
    const showDiffMapPeaksModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.DIFF_MAP_PEAKS));
    const showValidationPlotModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.VALIDATION_PLOT));
    const showMmrrccModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.MMRRCC));
    const showWaterValidationModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.WATER_VALIDATION));
    const showLigandValidationModal = useSelector((state: moorhen.State) =>
        state.modals.activeModals.includes(modalKeys.LIGAND_VALIDATION)
    );
    const showFillPartialResValidationModal = useSelector((state: moorhen.State) =>
        state.modals.activeModals.includes(modalKeys.FILL_PART_RES)
    );
    const showMoorhenMrBumpModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.MRBUMP));
    const showMoorhenMrParseModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.MRPARSE));
    const showPepFlipsValidationModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.PEPTIDE_FLIPS));
    const showUnmodelledBlobsModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.UNMODELLED_BLOBS));
    const showCarbohydrateValidationModal = useSelector((state: moorhen.State) =>
        state.modals.activeModals.includes(modalKeys.CARB_VALIDATION)
    );
    const showSliceNDiceModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SLICE_N_DICE));
    const showSuperposeModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SUPERPOSE_MODELS));
    const showSceneSettingsModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.SCENE_SETTINGS));
    const showLhasaModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.LHASA));
    const showQScoreModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.QSCORE));
    const showJsonValidationModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.JSON_VALIDATION));
    const showColorMapByMapModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.COLOR_MAP_BY_MAP));

    const showVectorsModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.VECTORS));
    const showOverlays2DModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.OVERLAYS2D));

    return (
        <>
            <MoorhenModelsModal />

            <MoorhenMapsModal />

            {showCreateAcedrgLinkModal && <MoorhenCreateAcedrgLinkModal width={45} />}

            {showQuerySequenceModal && <MoorhenQuerySequenceModal />}

            {showScriptingModal && <MoorhenScriptModal />}

            {showControlsModal && <MoorhenControlsModal />}

            {showFitLigandModal && <MoorheFindLigandModal />}

            {showRamaPlotModal && <MoorhenRamaPlotModal />}

            {showDiffMapPeaksModal && <MoorhenDiffMapPeaksModal />}

            {showValidationPlotModal && <MoorhenValidationPlotModal />}

            {showMmrrccModal && <MoorhenMmrrccModal />}

            {showJsonValidationModal && <MoorhenJsonValidationModal />}

            {showWaterValidationModal && <MoorhenWaterValidationModal />}

            {showLigandValidationModal && <MoorhenLigandValidationModal />}

            {showMoorhenMrBumpModal && <MoorhenMrBumpModal />}

            {showMoorhenMrParseModal && <MoorhenMrParseModal />}

            {showCarbohydrateValidationModal && <MoorhenCarbohydrateValidationModal />}

            {showPepFlipsValidationModal && <MoorhenPepFlipsModal />}

            {showUnmodelledBlobsModal && <MoorhenUnmodelledBlobsModal />}

            {showFillPartialResValidationModal && <MoorhenFillPartialResiduesModal />}

            {showSceneSettingsModal && <MoorhenSceneSettingsModal />}

            {showSliceNDiceModal && <MoorhenSliceNDiceModal />}

            {showSuperposeModal && <MoorheSuperposeStructuresModal />}

            {showLhasaModal && <MoorhenLhasaModal />}

            {showQScoreModal && <MoorhenQScoreModal />}
            {showColorMapByMapModal && <MoorhenColourMapByOtherMapModal />}
            {showVectorsModal && <MoorhenVectorsModal />}
            {showOverlays2DModal && <Moorhen2DCanvasObjectsModal />}
            {props.extraDraggableModals && props.extraDraggableModals.map(modal => modal)}
        </>
    );
});
