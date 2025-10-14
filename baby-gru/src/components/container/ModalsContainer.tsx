import { useSelector } from "react-redux";
import { memo, useMemo } from "react";
import { ModalKey } from "../../store/modalsSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { Moorhen2DCanvasObjectsModal } from "../modal/Moorhen2DCanvasObjectsModal";
import { MoorhenCarbohydrateValidationModal } from "../modal/MoorhenCarbohydrateValidationModal";
import { MoorhenColourMapByOtherMapModal } from "../modal/MoorhenColourMapByOtherMapModal";
import { MoorhenControlsModal } from "../modal/MoorhenControlsModal";
import { MoorhenCreateAcedrgLinkModal } from "../modal/MoorhenCreateAcedrgLinkModal";
import { MoorhenDiffMapPeaksModal } from "../modal/MoorhenDiffMapPeaksModal";
import { MoorhenFillPartialResiduesModal } from "../modal/MoorhenFillPartialResiduesModal";
import { MoorheFindLigandModal } from "../modal/MoorhenFindLigandModal";
import { MoorhenJsonValidationModal } from "../modal/MoorhenJsonValidationModal";
import { MoorhenLhasaModal } from "../modal/MoorhenLhasaModal";
import { MoorhenLigandValidationModal } from "../modal/MoorhenLigandValidationModal";
import { MoorhenMapsModal } from "../modal/MoorhenMapsModal";
import { MoorhenMmrrccModal } from "../modal/MoorhenMmrrccModal";
import { MoorhenModelsModal } from "../modal/MoorhenModelsModal";
import { MoorhenMrBumpModal } from "../modal/MoorhenMrBumpModal";
import { MoorhenMrParseModal } from "../modal/MoorhenMrParseModal";
import { MoorhenPAEModal } from "../modal/MoorhenPAEModal";
import { MoorhenPepFlipsModal } from "../modal/MoorhenPepFlipsModal";
import { MoorhenQScoreModal } from "../modal/MoorhenQScoreModal";
import { MoorhenQuerySequenceModal } from "../modal/MoorhenQuerySequenceModal";
import { MoorhenRamaPlotModal } from "../modal/MoorhenRamaPlotModal";
import { MoorhenSceneSettingsModal } from "../modal/MoorhenSceneSettingsModal";
import { MoorhenScriptModal } from "../modal/MoorhenScriptModal";
import { MoorhenSliceNDiceModal } from "../modal/MoorhenSliceNDiceModal";
import { MoorheSuperposeStructuresModal } from "../modal/MoorhenSuperposeStructuresModal";
import { MoorhenUnmodelledBlobsModal } from "../modal/MoorhenUnmodelledBlobsModal";
import { MoorhenValidationPlotModal } from "../modal/MoorhenValidationPlotModal";
import { MoorhenVectorsModal } from "../modal/MoorhenVectorsModal";
import { MoorhenWaterValidationModal } from "../modal/MoorhenWaterValidationModal";

const modalsMap = {
    [modalKeys.ACEDRG]: MoorhenCreateAcedrgLinkModal,
    [modalKeys.SEQ_QUERY]: MoorhenQuerySequenceModal,
    [modalKeys.SCRIPTING]: MoorhenScriptModal,
    [modalKeys.SHOW_CONTROLS]: MoorhenControlsModal,
    [modalKeys.FIT_LIGAND]: MoorheFindLigandModal,
    [modalKeys.RAMA_PLOT]: MoorhenRamaPlotModal,
    [modalKeys.DIFF_MAP_PEAKS]: MoorhenDiffMapPeaksModal,
    [modalKeys.VALIDATION_PLOT]: MoorhenValidationPlotModal,
    [modalKeys.MMRRCC]: MoorhenMmrrccModal,
    [modalKeys.PAEPLOT]: MoorhenPAEModal,
    [modalKeys.JSON_VALIDATION]: MoorhenJsonValidationModal,
    [modalKeys.WATER_VALIDATION]: MoorhenWaterValidationModal,
    [modalKeys.LIGAND_VALIDATION]: MoorhenLigandValidationModal,
    [modalKeys.MRBUMP]: MoorhenMrBumpModal,
    [modalKeys.MRPARSE]: MoorhenMrParseModal,
    [modalKeys.CARB_VALIDATION]: MoorhenCarbohydrateValidationModal,
    [modalKeys.PEPTIDE_FLIPS]: MoorhenPepFlipsModal,
    [modalKeys.UNMODELLED_BLOBS]: MoorhenUnmodelledBlobsModal,
    [modalKeys.FILL_PART_RES]: MoorhenFillPartialResiduesModal,
    [modalKeys.SCENE_SETTINGS]: MoorhenSceneSettingsModal,
    [modalKeys.SLICE_N_DICE]: MoorhenSliceNDiceModal,
    [modalKeys.SUPERPOSE_MODELS]: MoorheSuperposeStructuresModal,
    [modalKeys.LHASA]: MoorhenLhasaModal,
    [modalKeys.QSCORE]: MoorhenQScoreModal,
    [modalKeys.COLOR_MAP_BY_MAP]: MoorhenColourMapByOtherMapModal,
    [modalKeys.VECTORS]: MoorhenVectorsModal,
    [modalKeys.OVERLAYS2D]: Moorhen2DCanvasObjectsModal,
    [modalKeys.MAPS]: MoorhenMapsModal,
    [modalKeys.MODELS]: MoorhenModelsModal,
};
export type ExtraDraggableModals = React.JSX.Element[];

export const MoorhenModalsContainer = memo((props: { extraDraggableModals: ExtraDraggableModals }) => {
    const activeModals = useSelector((state: moorhen.State) => state.modals.activeModals);

    const displayModals = activeModals.map(modalKey => {
        const ModalComponent = modalsMap[modalKey];
        return ModalComponent ? <ModalComponent key={modalKey} /> : null;
    });

    return (
        <>
            <MoorhenModelsModal />
            {props.extraDraggableModals && props.extraDraggableModals.map(modal => modal)}
            {displayModals}
        </>
    );
});

MoorhenModalsContainer.displayName = "MoorhenModalsContainer";
