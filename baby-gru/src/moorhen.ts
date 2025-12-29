/* Main entry point */
// @ts-strict
import "./app.css";

// customElements.define("moorhen-helper", MoorhenHelper);

export { ErrorBoundary } from "./ErrorBoundary";
export { MoorhenApp } from "./components/MoorhenApp";
export { MoorhenContainer } from "./components/container/MainContainer";
export { MoorhenDraggableModalBase } from "./components/interface-base/ModalBase/DraggableModalBase";
export { MoorhenQuerySequenceModal } from "./components/modal/MoorhenQuerySequenceModal";
export { ColourRule } from "./utils/MoorhenColourRule";
export { MoleculeRepresentation } from "./utils/MoorhenMoleculeRepresentation";
export { MoorhenMolecule } from "./utils/MoorhenMolecule";
export { MoorhenMap } from "./utils/MoorhenMap";
export { getMultiColourRuleArgs } from "./utils/utils";
export { CommandCentre } from "./InstanceManager/CommandCentre";
export { MoorhenTimeCapsule } from "./utils/MoorhenTimeCapsule";
export { Preferences } from "./components/managers/preferences/MoorhenPreferences";
export { MoorhenMoleculeSelect } from "./components/inputs";
export { MoorhenMapSelect } from "./components/inputs/Selector/MoorhenMapSelect";
export { MoorhenSlider } from "./components/inputs";
export { FetchOnlineSources } from "./components/menu-item";
export { MoorhenRamachandran } from "./components/validation-tools/MoorhenRamachandran";
export { MoorhenLigandValidation } from "./components/validation-tools/MoorhenLigandValidation";
export { MoorhenCarbohydrateValidation } from "./components/validation-tools/MoorhenCarbohydrateValidation";
export { MoorhenDifferenceMapPeaks } from "./components/validation-tools/MoorhenDifferenceMapPeaks";
export { MoorhenFillMissingAtoms } from "./components/validation-tools/MoorhenFillMissingAtoms";
export { MoorhenJsonValidation } from "./components/validation-tools/MoorhenJsonValidation";
export { MoorhenMMRRCCPlot } from "./components/validation-tools/MoorhenMMRRCCPlot";
export { MoorhenPepflipsDifferenceMap } from "./components/validation-tools/MoorhenPepflipsDifferenceMap";
export { MoorhenQScore } from "./components/validation-tools/MoorhenQScore";
export { MoorhenUnmodelledBlobs } from "./components/validation-tools/MoorhenUnmodelledBlobs";
export { MoorhenValidation } from "./components/validation-tools/MoorhenValidation";
export { MoorhenWaterValidation } from "./components/validation-tools/MoorhenWaterValidation";
export { autoOpenFiles } from "./utils/MoorhenFileLoading";
export {
    default as sceneSettingsReducer,
    setDefaultBackgroundColor,
    setDrawCrosshairs,
    setDrawFPS,
    setDrawMissingLoops,
    setDefaultBondSmoothness,
    setDoSSAO,
    setSsaoRadius,
    setSsaoBias,
    setResetClippingFogging,
    setClipCap,
    setEdgeDetectNormalScale,
    resetSceneSettings,
    setUseOffScreenBuffers,
    setDoShadowDepthDebug,
    setDoShadow,
    setDoSpin,
    setDoOutline,
    setDepthBlurRadius,
    setDrawScaleBar,
    setDepthBlurDepth,
    setDrawAxes,
    setDoPerspectiveProjection,
    setHeight,
    setWidth,
    setIsDark,
    setBackgroundColor,
    setDoEdgeDetect,
    setEdgeDetectDepthThreshold,
    setEdgeDetectNormalThreshold,
    setEdgeDetectDepthScale,
    setDoAnaglyphStereo,
    setDoCrossEyedStereo,
    setDoSideBySideStereo,
    setDoThreeWayView,
    setDoMultiView,
    setMultiViewColumns,
    setMultiViewRows,
    setSpecifyMultiViewRowsColumns,
    setThreeWayViewOrder,
} from "./store/sceneSettingsSlice";
export {
    default as backupSettingsReducer,
    setEnableTimeCapsule,
    setMakeBackups,
    setMaxBackupCount,
    setModificationCountBackupThreshold,
    resetBackupSettings,
} from "./store/backupSettingsSlice";
export {
    default as generalStatesReducer,
    setActiveMap,
    setCootInitialized,
    setAppTittle,
    setDefaultExpandDisplayCards,
    setTransparentModalsOnMouseOut,
    setUserPreferencesMounted,
    setDevMode,
    setTheme,
    setViewOnly,
    resetGeneralStates,
    setUseGemmi,
    setShowHoverInfo,
} from "./store/generalStatesSlice";
export { default as mapsReducer, addMap, addMapList, removeMap, emptyMaps } from "./store/mapsSlice";
export {
    default as hoveringStatesReducer,
    setCursorStyle,
    setEnableAtomHovering,
    setHoveredAtom,
    resetHoveringStates,
} from "./store/hoveringStatesSlice";
export {
    default as labelSettingsReducer,
    addAvailableFontList,
    setAtomLabelDepthMode,
    setGLLabelsFontFamily,
    setGLLabelsFontSize,
    resetLabelSettings,
} from "./store/labelSettingsSlice";
export {
    default as mapContourSettingsReducer,
    showMap,
    hideMap,
    setPositiveMapColours,
    setNegativeMapColours,
    setMapAlpha,
    setMapColours,
    setMapRadius,
    setMapStyle,
    setDefaultMapSamplingRate,
    setDefaultMapLitLines,
    setMapLineWidth,
    setDefaultMapSurface,
    setContourLevel,
    resetMapContourSettings,
} from "./store/mapContourSettingsSlice";
export {
    default as sliceNDiceReducer,
    setBFactorThreshold,
    setClusteringType,
    setMoleculeBfactors,
    setMoleculeMaxBfactor,
    resetSliceNDiceSlice,
    setMoleculeMinBfactor,
    setNClusters,
    setPaeFileIsUploaded,
    setSlicingResults,
    setThresholdType,
    setPAEFileContents,
} from "./store/sliceNDiceSlice";
export {
    default as refinementSettingsReducer,
    setEnableRefineAfterMod,
    setUseRamaRefinementRestraints,
    setuseTorsionRefinementRestraints,
    setAnimateRefine,
    resetRefinementSettings,
} from "./store/refinementSettingsSlice";
export {
    default as moleculesReducer,
    addMolecule,
    removeMolecule,
    emptyMolecules,
    addMoleculeList,
    showMolecule,
    hideMolecule,
    addCustomRepresentation,
    removeCustomRepresentation,
    addGeneralRepresentation,
    removeGeneralRepresentation,
} from "./store/moleculesSlice";
export {
    default as mouseSettingsReducer,
    setContourWheelSensitivityFactor,
    setZoomWheelSensitivityFactor,
    setMouseSensitivity,
    resetDefaultMouseSettings,
} from "./store/mouseSettings";
export {
    default as shortcutSettingsReducer,
    setShowShortcutToast,
    setShortcutOnHoveredAtom,
    setShortCuts,
    resetShortcutSettings,
} from "./store/shortCutsSlice";
export {
    default as moleculeMapUpdateReducer,
    setShowScoresToast,
    addMapUpdatingScore,
    removeMapUpdatingScore,
    overwriteMapUpdatingScores,
    resetMoleculeMapUpdates,
} from "./store/moleculeMapUpdateSlice";
export {
    default as lhasaReducer,
    resetLhasaSettings,
    addRdkitMoleculePickle,
    removeRdkitMoleculePickle,
    emptyRdkitMoleculePickleList,
} from "./store/lhasaSlice";
export { default as modalsReducer, resetActiveModals, focusOnModal, unFocusModal } from "./store/modalsSlice";
export { default as sharedSessionReducer, resetSharedSession } from "./store/sharedSessionSlice";
export {
    default as glRefSliceReducer,
    setOrigin,
    setRequestDrawScene,
    setIsWebGL2,
    setActiveMolecule,
    setLightPosition,
    setAmbient,
    setSpecular,
    setDiffuse,
    setSpecularPower,
    setZoom,
    setQuat,
    setFogClipOffset,
    setFogStart,
    setFogEnd,
    setClipStart,
    setClipEnd,
    setCursorPosition,
    setShortCutHelp,
    setDraggableMolecule,
    triggerRedrawEnv,
    triggerClearLabels,
    setGLCtx,
    setDisplayBuffers,
    setHoverSize,
    setLabelBuffers,
    setTexturedShapes,
    setRttFramebufferSize,
    setCanvasSize,
    setElementsIndicesRestrict,
} from "./store/glRefSlice";
export { reducers as MoorhenStoreReducers } from "./store/MoorhenReduxStore";
export { default as overlaysReducer } from "./store/overlaysSlice";
export { default as menusReducer } from "./store/menusSlice";
export { default as atomInfoCardsReducer } from "./store/atomInfoCardsSlice";
export { setBusy } from "./store/globalUISlice";
export { default as jsonValidationReducer } from "./store/jsonValidation";
export { default as mrParseSliceReducer } from "./store/mrParseSlice";
export { MoorhenInstance, MoorhenInstanceProvider } from "./InstanceManager";
export { MoorhenWebComponent } from "./Wrappers/MoorhenWebComponent";
export { MoorhenHelper } from "./Wrappers/MoorhenHelper";
