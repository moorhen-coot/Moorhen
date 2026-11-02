import { useSelector } from "react-redux";
import React, { memo, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useMoorhenInstance } from "@/InstanceManager/useMoorhenInstance";
import type { ModalExtension, SlotModalExtension } from "@/InstanceManager/UiExtensions";
import { MoorhenDraggableModalBase } from "./DraggableModalBase";
import { ModalErrorBoundary } from "./ModalErrorBoundary";
import { MoorhenShortcutConfigModal } from "@/components/modal/MoorhenShortcutConfigModal";
import { RootState } from "../../../store/MoorhenReduxStore";
import { Moorhen2DCanvasObjectsModal } from "../../modal/Moorhen2DCanvasObjectsModal";
import { MoorhenCarbohydrateValidationModal } from "../../modal/MoorhenCarbohydrateValidationModal";
import { MoorhenColourMapByOtherMapModal } from "../../modal/MoorhenColourMapByOtherMapModal";
import { MoorhenFourierShellCorrelationModal } from "../../modal/MoorhenFourierShellCorrelationModal";
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
import { MoorhenNOERestraints } from "../../modal/MoorhenNOERestraints";
import { MoorhenCheckListTestModal } from "../../modal/MoorhenCheckListTestModal";

export type BuiltInModalKey =
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
    | "NOE"
    | "config-shortcuts"
    | "fourier-shell-correlation"
    | "check-list-test";

/** A built-in modal, or the id of one added through `instance.uiExtensions`. */
export type ModalKey = BuiltInModalKey | (string & {});

export type ModalComponentProps = {
    openDocked?: "left" | "right" | null | undefined;
    modalProps?: { [key: string]: string | number | boolean };
};

const modalsMap: Record<BuiltInModalKey, React.FC<ModalComponentProps>> = {
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
    NOE: MoorhenNOERestraints,
    "fourier-shell-correlation": MoorhenFourierShellCorrelationModal,
    "check-list-test": MoorhenCheckListTestModal,
};

export type ExtraDraggableModals = React.JSX.Element[];

const SlotModal = (props: { modal: SlotModalExtension } & ModalComponentProps) => {
    const { modal } = props;
    return (
        <MoorhenDraggableModalBase
            modalId={modal.id}
            headerTitle={modal.title}
            body={<slot name={modal.slotName} />}
            openDocked={props.openDocked}
            allowDocking={modal.allowDocking}
            initialWidth={modal.initialWidth}
            initialHeight={modal.initialHeight}
            minWidth={modal.minWidth}
            minHeight={modal.minHeight}
            maxWidth={modal.maxWidth}
            maxHeight={modal.maxHeight}
        />
    );
};

const renderExtensionModal = (modal: ModalExtension, props: ModalComponentProps): React.JSX.Element => {
    if ("slotName" in modal) return <SlotModal modal={modal} {...props} />;
    if ("component" in modal) return <modal.component {...props} />;
    return modal.element;
};

export const MoorhenModalsContainer = memo(() => {
    const uiExtensions = useMoorhenInstance().uiExtensions;
    const extensionModals = useSyncExternalStore(uiExtensions.subscribe, uiExtensions.getModals);
    const extensionsById = useMemo(() => new Map(extensionModals.map(modal => [modal.id, modal])), [extensionModals]);
    const activeModals = useSelector((state: RootState) => state.modals.activeModals);

    // Tell extensions when they open or close. An extension registered while its key is already
    // open counts as opening then, and one removed while open as closing.
    const previouslyOpen = useRef<Map<string, ModalExtension>>(new Map());
    useEffect(() => {
        const open = new Map<string, ModalExtension>();
        activeModals.forEach(modalCall => {
            const extension = extensionsById.get(modalCall.key);
            if (extension) open.set(modalCall.key, extension);
        });
        previouslyOpen.current.forEach((extension, key) => {
            if (open.get(key) !== extension) extension.onClose?.();
        });
        open.forEach((extension, key) => {
            if (previouslyOpen.current.get(key) !== extension) extension.onOpen?.();
        });
        previouslyOpen.current = open;
    }, [activeModals, extensionsById]);

    // extraDraggableModals elements are always rendered, they decide themselves when to show
    const alwaysMounted = extensionModals
        .filter(modal => "element" in modal)
        .map(modal => (
            <ModalErrorBoundary key={modal.id} modalId={modal.id}>
                {renderExtensionModal(modal, {})}
            </ModalErrorBoundary>
        ));

    const displayModals = activeModals.map(modalCall => {
        const extension = extensionsById.get(modalCall.key);
        if (extension && "element" in extension) return null;
        const callProps: ModalComponentProps = { openDocked: modalCall.openDocked, modalProps: modalCall.modalProps };
        let content: React.JSX.Element | null = null;
        if (extension) {
            content = renderExtensionModal(extension, callProps);
        } else {
            const ModalComponent = modalsMap[modalCall.key as BuiltInModalKey];
            content = ModalComponent ? <ModalComponent {...callProps} /> : null;
        }
        return content ? (
            <ModalErrorBoundary key={modalCall.key} modalId={modalCall.key}>
                {content}
            </ModalErrorBoundary>
        ) : null;
    });

    return (
        <>
            {alwaysMounted}
            {displayModals}
        </>
    );
});

MoorhenModalsContainer.displayName = "MoorhenModalsContainer";
