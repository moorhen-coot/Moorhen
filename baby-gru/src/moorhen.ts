/* Main entry point */
// @ts-strict

export { ErrorBoundary } from "./ErrorBoundary";
export { MoorhenApp } from "./components/MoorhenApp";
export type { MoorhenReduxStoreType } from "@/store";
export { MoorhenProvider } from "./components/MoorhenProvider";
export { MoorhenContainer } from "./components/container/MainContainer";
export type { ContainerProps } from "./components/container/MainContainer";
export type { MoorhenPanel } from "./components/panels";
export { MoorhenDraggableModalBase } from "./components/interface-base/ModalBase/DraggableModalBase";
export { MoorhenQuerySequenceModal } from "./components/modal/MoorhenQuerySequenceModal";
export { ColourRule } from "./utils/MoorhenColourRule";
export { MoleculeRepresentation } from "./utils/Representation/MoorhenMoleculeRepresentation";
export { MoorhenMolecule } from "./utils/MoorhenMolecule";
export { MoorhenMap } from "./utils/MoorhenMap";
export { getMultiColourRuleArgs } from "./utils/utils";
export { CommandCentre } from "./InstanceManager/CommandCentre";
export { CootCommandWrapper } from "./InstanceManager/CommandCentre/CootCommandWrapper";
export { MoorhenTimeCapsule } from "./utils/MoorhenTimeCapsule";
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
export { autoOpenFiles } from "./utils/FileLoading";
export { MoorhenInstance, MoorhenInstanceProvider } from "./InstanceManager";
export { MoorhenMenuSystem } from "./components/menu-system/MenuSystem";
export { reducers as MoorhenStoreReducers } from "./store/MoorhenReduxStore";
export type { RootState } from "./store/MoorhenReduxStore" ;
export { useCommandCentre, useCommandAndCapsule, useMoorhenInstance } from '@/InstanceManager';
export { Preferences as MoorhenPreferences } from '@/InstanceManager/Preferences/MoorhenPreferences';
export { createMoorhenStore } from "@/store/MoorhenReduxStore";

// Types referenced by the exported API. These are re-exported so
// that the API reference (TypeDoc) documents them and can link to them.
export type { ValidationData, ResidueValidationData, CootValidationData } from "./InstanceManager/CommandCentre/CootCommandWrapper";
export type { WorkerResponse, WorkerMessage, cootCommandKwargs } from "./InstanceManager/CommandCentre/MoorhenCommandCentre";
export type { moleculeChangeAction } from "./InstanceManager/MoorhenInstance";
export type { CreateRepresentationParams, PublicRepresentationStyles } from "./utils/Representation/RepresentationBuilder";
export type { PictureWizardType } from "./utils/Representation/PictureWizard";
export type { backupSession, backupKey } from "./utils/MoorhenTimeCapsule";
export type { LigandInfo, NEFRestraint, Sequence } from "./utils/MoorhenMolecule";
export type { PreferencesValues } from "./InstanceManager/Preferences/PreferencesList";
export type { MoorhenSVG } from "./components/icons/moorhen_icons";
export type { ScreenRecorder } from "./utils/MoorhenScreenRecorder";

// Menu system configuration
export type { BaseMenuItem, MenuItemPopover, MenuItemShowModal, MenuItemShowSidePanel, MenuItemDispatch, MenuItemCustomJSX, MenuItemHTMLSlot, MenuItemSubMenu, PreferenceSwitch, Separator } from "./components/menu-system/subMenuConfig";
export type { Icon, MainMenuMap } from "./components/menu-system/mainMenuConfig";
// Component props
export type { MoorhenSliderProps } from "./components/inputs/MoorhenSlider/MoorhenSlider";
export type { MoorhenRamachandranProps } from "./components/validation-tools/MoorhenRamachandran";
export type { MoorhenDraggableModalBaseProps } from "./components/interface-base/ModalBase/DraggableModalBase";
export type { MoorhenInstanceProviderProps } from "./InstanceManager/MoorhenInstanceContext";
export type { MoorhenMapSelectPropsType, MoorhenMapSelectPropsUIDType } from "./components/inputs/Selector/MoorhenMapSelect";
export type { MoorhenMoleculeSelectMolNoType, MoorhenMoleculeSelectUIDType } from "./components/inputs/Selector/MoleculeSelector";
export type { ErrorBoundaryPropsType } from "./ErrorBoundary";
// Panel / UI ids and options
export type { BottomPanelIDs } from "./components/panels/BottomPanels/BottomPanelsList";
export type { SidePanelIDs } from "./components/panels/SidePanels/SidePanelList";
export type { SequenceViewerOption } from "./components/panels/BottomPanels/SequenceViewerPanel/SequenceViewerPanel";
export type { ValidationOption } from "./components/panels/BottomPanels/SequenceViewerPanel/ValidationPanel";
export type { ShownControl } from "./components/snack-bars/PopupControls/PopupControlList";
// Modals
export type { ModalKey, ModalComponentProps } from "./components/interface-base/ModalBase/ModalsContainer";
export type { ModalCall } from "./store/modalsSlice";
// Representation
export type { RepresentationStyles, m2tParameters, residueEnvironmentOptions, gaussianSurfSettings } from "./utils/Representation/MoorhenMoleculeRepresentation";
export type { BuildRepresentationParams } from "./utils/Representation/RepresentationBuilder";
// Colour, map, molecule, preferences, history
export type { ColourRuleType, ColourRulePropertyType } from "./utils/MoorhenColourRule";
export type { MRCHeaderJson, MTZHeaderJson } from "./utils/mapHeaders";
export type { BasicMapHeaderInfo, mapHeaderInfo } from "./utils/MoorhenMap";
export type { ChemShift, ResidueInfo } from "./utils/MoorhenMolecule";
export type { PreferenceDefaultValue, PreferenceLabel } from "./InstanceManager/Preferences/PreferencesList";
export type { HistoryEntry } from "./utils/MoorhenHistory";
export type { WorkerResult } from "./InstanceManager/CommandCentre/MoorhenCommandCentre";
export type { ImageFrac2D } from "./utils/MoorhenScreenRecorder";

// Export Redux store actions are auto-generated by scripts/CreateStoreExport.py

// do not edit below this line it will be overwritten by scripts/CreateStoreExport.py
export { setMenuSetting, resetMenuSetting, resetMenu, setEnableTimeCapsule, setMakeBackups, setMaxBackupCount, setModificationCountBackupThreshold, resetBackupSettings, setCursorStyle, setEnableAtomHovering, setHoveredAtom, resetHoveringStates, setValidationJson, emptyAvailableFonts, addAvailableFontList, setAtomLabelDepthMode, setGLLabelsFontFamily, setGLLabelsFontSize, resetLabelSettings, resetLhasaSettings, addRdkitMoleculePickle, removeRdkitMoleculePickle, emptyRdkitMoleculePickleList, showMap, hideMap, setContourLevel, setMapRadius, setMapFastRadius, setMapAlpha, setMapStyle, changeMapRadius, setDefaultMapSamplingRate, setDefaultMapLitLines, setMapLineWidth, setDefaultMapSurface, setMapColours, setNegativeMapColours, setPositiveMapColours, changeContourLevel, setReContourMapOnlyOnMouseUp, resetMapContourSettings, setConnectedMolecule, enableUpdatingMaps, disableUpdatingMaps, setReflectionMap, setFoFcMap, setTwoFoFcMap, setReflectionMapMolNo, overwriteMapUpdatingScores, setCurrentScores, setConnectedMoleculeMolNo, setFoFcMapMolNo, setTwoFoFcMapMolNo, removeMapUpdatingScore, setShowScoresToast, addMapUpdatingScore, triggerUpdate, resetMoleculeMapUpdates, addMolecule, removeMolecule, emptyMolecules, addMoleculeList, addGeneralRepresentation, showMolecule, hideMolecule, addCustomRepresentation, removeCustomRepresentation, removeGeneralRepresentation, setContourWheelSensitivityFactor, setZoomWheelSensitivityFactor, setMouseSensitivity, resetDefaultMouseSettings, setMrParseModels, setTargetSequence, setAfJson, setEsmJson, setHomologsJson, setAfSortField, setHomologsSortField, setAfSortReversed, setHomologsSortReversed, setAFDisplaySettings, setHomologsDisplaySettings, addImageOverlay, addTextOverlay, addSvgPathOverlay, addFracPathOverlay, emptyOverlays, addCallback, addLatexOverlay, removeImageOverlay, removeLatexOverlay, removeTextOverlay, removeSvgPathOverlay, removeFracPathOverlay, setAnimateRefine, setEnableRefineAfterMod, setUseRamaRefinementRestraints, setuseTorsionRefinementRestraints, setRefinementSelection, resetRefinementSettings, setIsInSharedSession, setSharedSessionToken, setShowSharedSessionManager, resetSharedSession, setShowShortcutToast, setShortcutOnHoveredAtom, setShortCuts, resetShortcutSettings, resetSliceNDiceSlice, setPaeFileIsUploaded, setThresholdType, setMoleculeBfactors, setSlicingResults, setMoleculeMaxBfactor, setMoleculeMinBfactor, setBFactorThreshold, setNClusters, setClusteringType, setPAEFileContents, addMap, removeMap, emptyMaps, addMapList, setActiveMap, setViewOnly, setTheme, setIsDraggingAtoms, setAppTittle, setUserPreferencesMounted, setDevMode, setCootInitialized, setStopResidueSelection, setStartResidueSelection, clearResidueSelection, setMoleculeResidueSelection, setResidueSelection, setCidResidueSelection, setIsRotatingAtoms, setIsChangingRotamers, setShowResidueSelection, toggleCootCommandExit, toggleCootCommandStart, setIsAnimatingTrajectory, resetGeneralStates, setIsShowingTomograms, setDefaultExpandDisplayCards, setTransparentModalsOnMouseOut, setUseGemmi, setShowHoverInfo, setAllowScripting, setAllowAddNewFittedLigand, setAllowMergeFittedLigand, setDisableFileUpload, setRequestDrawScene, setIsWebGL2, setActiveMolecule, setQuat, setCursorPosition, setShortCutHelp, setDraggableMolecule, triggerRedrawEnv, triggerClearLabels, setGLCtx, setDisplayBuffers, setHoverSize, setLabelBuffers, setTexturedShapes, setRttFramebufferSize, setCanvasSize, setElementsIndicesRestrict, showModal, hideModal, focusOnModal, unFocusModal, resetActiveModals, setOrigin, setDefaultBackgroundColor, setDrawCrosshairs, setDrawScaleBar, setDrawFPS, setDrawMissingLoops, setDefaultBondSmoothness, setDoSSAO, setSsaoRadius, setSsaoBias, setResetClippingFogging, setClipCap, resetSceneSettings, setEdgeDetectNormalScale, setUseOffScreenBuffers, setDoShadowDepthDebug, setDoShadow, setDoSpin, setDoOutline, setDepthBlurRadius, setBackgroundColor, setDepthBlurDepth, setDrawAxes, setDoPerspectiveProjection, setHeight, setWidth, setGlViewportHeight, setGlViewportWidth, setIsDark, setEdgeDetectDepthScale, setDoEdgeDetect, setEdgeDetectDepthThreshold, setEdgeDetectNormalThreshold, setDrawEnvBOcc, setDoAnaglyphStereo, setDoCrossEyedStereo, setDoSideBySideStereo, setDoThreeWayView, setDoMultiView, setMultiViewRows, setMultiViewColumns, setSpecifyMultiViewRowsColumns, setThreeWayViewOrder, setLightPosition, setAmbient, setSpecular, setDiffuse, setSpecularPower, setFogClipOffset, setFogStart, setFogEnd, setClipStart, setClipEnd, setZoom, autoClipFogByZoom, addVector, removeVector, emptyVectors, addVectors, removeVectors, removeVectorsMatchingIDString, setSeqViewerOption, setValidationOption, setShownBottomPanel, setBusy, setTimeCapsuleBusy, setGlobalInstanceReady, setSearchBarActive, setMainMenuOpen, setShortCutsBlocked, setShownSidePanel, setSidePanelWidth, setBottomPanelHeight, setShownControl, lockControls, unlockControls, closeResidueSelectionTools, pauseClickAwayListener, resumeClickAwayListener, enqueueSnackbar, closeSnackbar, clearSnackbar } from "@/store";