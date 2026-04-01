import { useSelector } from "react-redux";
import React, { memo, useMemo } from "react";
import { MoorhenShortcutConfigModal } from "@/components/modal/MoorhenShortcutConfigModal";
import { RootState } from "../../../store/MoorhenReduxStore";
import { Moorhen2DCanvasObjectsModal } from "../../modal/Moorhen2DCanvasObjectsModal";
import { MoorhenCarbohydrateValidationModal } from "../../modal/MoorhenCarbohydrateValidationModal";
import { MoorhenColourMapByOtherMapModal } from "../../modal/MoorhenColourMapByOtherMapModal";
import { MoorhenConKitModal } from "../../modal/MoorhenConKitModal";
import { MoorhenControlsModal } from "../../modal/MoorhenControlsModal";
import { MoorhenCreateAcedrgLinkModal } from "../../modal/MoorhenCreateAcedrgLinkModal";
import { MoorhenDiffMapPeaksModal } from "../../modal/MoorhenDiffMapPeaksModal";
import { MoorhenFillPartialResiduesModal } from "../../modal/MoorhenFillPartialResiduesModal";
import { MoorhenFindLigandModal } from "../../modal/MoorhenFindLigandModal";
import { MoorhenJsonValidationModal } from "../../modal/MoorhenJsonValidationModal";
import { MoorhenLhasaModal } from "../../modal/MoorhenLhasaModal";
import { MoorhenLigandValidationModal } from "../../modal/MoorhenLigandValidationModal";
import { MoorhenMmrrccModal } from "../../modal/MoorhenMmrrccModal";
import { MoorhenMrBumpModal } from "../../modal/MoorhenMrBumpModal";
import { MoorhenMrParseModal } from "../../modal/MoorhenMrParseModal";
import { MoorhenPAEModal } from "../../modal/MoorhenPAEModal";
import { MoorhenPepFlipsModal } from "../../modal/MoorhenPepFlipsModal";
import { MoorhenQScoreModal } from "../../modal/MoorhenQScoreModal";
import { MoorhenQuerySequenceModal } from "../../modal/MoorhenQuerySequenceModal";
import { MoorhenRamaPlotModal } from "../../modal/MoorhenRamaPlotModal";
import { MoorhenSceneSettingsModal } from "../../modal/MoorhenSceneSettingsModal";
import { MoorhenScriptModal } from "../../modal/MoorhenScriptModal";
import { MoorhenSliceNDiceModal } from "../../modal/MoorhenSliceNDiceModal";
import { MoorhenSuperposeStructuresModal } from "../../modal/MoorhenSuperposeStructuresModal";
import { MoorhenUnmodelledBlobsModal } from "../../modal/MoorhenUnmodelledBlobsModal";
import { MoorhenValidationPlotModal } from "../../modal/MoorhenValidationPlotModal";
import { MoorhenVectorsModal } from "../../modal/MoorhenVectorsModal";
import { MoorhenWaterValidationModal } from "../../modal/MoorhenWaterValidationModal";

export type ModalKey =
    | "acedrg"
    | "query-seq"
    | "scripting"
    | "show-controls"
    | "fit-ligand"
    | "rama-plot"
    | "diff-map-peaks"
    | "validation-plot"
    | "mmrrcc"
    | "water-validation"
    | "lig-validation"
    | "fill-partial-residues"
    | "pepflips"
    | "unmodelled-blobs"
    | "carb-validation"
    | "slice-n-dice"
    | "superpose"
    | "scene-settings"
    | "lhasa"
    | "qscore"
    | "json-validation"
    | "mrbump"
    | "mrparse"
    | "colour-map-by-map"
    | "vectors"
    | "overlays-2d"
    | "conkit"
    | "pae-plot"
    | "config-shortcuts";

export type ModalComponentProps = {
    openDocked?: "left" | "right" | null | undefined;
    modalProps?: { [key: string]: string | number | boolean };
};

const modalsMap: Record<ModalKey, React.FC<ModalComponentProps>> = {
    acedrg: MoorhenCreateAcedrgLinkModal,
    "query-seq": MoorhenQuerySequenceModal,
    scripting: MoorhenScriptModal,
    "show-controls": MoorhenControlsModal,
    "fit-ligand": MoorhenFindLigandModal,
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
    superpose: MoorhenSuperposeStructuresModal,
    lhasa: MoorhenLhasaModal,
    qscore: MoorhenQScoreModal,
    "colour-map-by-map": MoorhenColourMapByOtherMapModal,
    vectors: MoorhenVectorsModal,
    "overlays-2d": Moorhen2DCanvasObjectsModal,
    conkit: MoorhenConKitModal,
    "config-shortcuts": MoorhenShortcutConfigModal,
};

export type ExtraDraggableModals = React.JSX.Element[];

export const MoorhenModalsContainer = memo((props: { extraDraggableModals: ExtraDraggableModals }) => {
    const activeModals = useSelector((state: RootState) => state.modals.activeModals);
    const displayModals = activeModals.map(modalCall => {
        const ModalComponent = modalsMap[modalCall.key];
        return ModalComponent ? (
            <ModalComponent key={modalCall.key} openDocked={modalCall.openDocked} modalProps={modalCall.modalProps} />
        ) : null;
    });

    return (
        <>
            {props.extraDraggableModals && props.extraDraggableModals.map(modal => modal)}
            {displayModals}
        </>
    );
});

MoorhenModalsContainer.displayName = "MoorhenModalsContainer";
