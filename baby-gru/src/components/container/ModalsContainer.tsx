import { useSelector } from "react-redux";
import React, { memo, useMemo } from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { ModalKey } from "../../store/modalsSlice";
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

const modalsMap: Record<ModalKey, () => React.JSX.Element> = {
    acedrg: MoorhenCreateAcedrgLinkModal,
    "query-seq": MoorhenQuerySequenceModal,
    scripting: MoorhenScriptModal,
    "show-controls": MoorhenControlsModal,
    "fit-ligand": MoorheFindLigandModal,
    "rama-plot": MoorhenRamaPlotModal,
    "diff-map-peaks": MoorhenDiffMapPeaksModal,
    "validation-plot": MoorhenValidationPlotModal,
    mmrrcc: MoorhenMmrrccModal,
    "pae-plot": MoorhenPAEModal,
    "json-validation": MoorhenJsonValidationModal,
    "water-validation": MoorhenWaterValidationModal,
    "lig-validation": MoorhenLigandValidationModal,
    mrbump: MoorhenMrBumpModal,
    mrparse: MoorhenMrParseModal,
    "carb-validation": MoorhenCarbohydrateValidationModal,
    pepflips: MoorhenPepFlipsModal,
    "unmodelled-blobs": MoorhenUnmodelledBlobsModal,
    "fill-partial-residues": MoorhenFillPartialResiduesModal,
    "scene-settings": MoorhenSceneSettingsModal,
    "slice-n-dice": MoorhenSliceNDiceModal,
    superpose: MoorheSuperposeStructuresModal,
    lhasa: MoorhenLhasaModal,
    qscore: MoorhenQScoreModal,
    "colour-map-by-map": MoorhenColourMapByOtherMapModal,
    vectors: MoorhenVectorsModal,
    "overlays-2d": Moorhen2DCanvasObjectsModal,
    maps: MoorhenMapsModal,
    models: MoorhenModelsModal,
};
// ...existing code...
export type ExtraDraggableModals = React.JSX.Element[];

export const MoorhenModalsContainer = memo((props: { extraDraggableModals: ExtraDraggableModals }) => {
    const activeModals = useSelector((state: RootState) => state.modals.activeModals);
    const showModelsModal = useSelector((state: RootState) => state.modals.activeModals.includes("models"));

    const displayModals = activeModals.map(modalKey => {
        const ModalComponent = modalsMap[modalKey];
        return ModalComponent ? <ModalComponent key={modalKey} /> : null;
    });

    return (
        <>
            {props.extraDraggableModals && props.extraDraggableModals.map(modal => modal)}
            {displayModals}
        </>
    );
});

MoorhenModalsContainer.displayName = "MoorhenModalsContainer";
