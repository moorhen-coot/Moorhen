import './app.css';
import { ErrorBoundary } from "./ErrorBoundary";
import { MoorhenApp } from './components/MoorhenApp';
import { MoorhenContainer } from './components/MoorhenContainer';
import { MoorhenDraggableModalBase } from "./components/modal/MoorhenDraggableModalBase";
import { MoorhenQuerySequenceModal } from "./components/modal/MoorhenQuerySequenceModal";
import { MoorhenColourRule } from './utils/MoorhenColourRule';
import { MoorhenMoleculeRepresentation } from './utils/MoorhenMoleculeRepresentation';
import { MoorhenMolecule } from './utils/MoorhenMolecule';
import { MoorhenMap } from './utils/MoorhenMap';
import { getMultiColourRuleArgs } from './utils/utils';
import { MoorhenCommandCentre } from './utils/MoorhenCommandCentre';
import { MoorhenTimeCapsule } from './utils/MoorhenTimeCapsule';
import { MoorhenPreferences } from "./utils/MoorhenPreferences";
import { MoorhenMoleculeSelect } from "./components/select/MoorhenMoleculeSelect";
import { MoorhenMapSelect } from "./components/select/MoorhenMapSelect";
import { MoorhenSlider } from "./components/inputs";
import { MoorhenFetchOnlineSourcesForm } from "./components/form/MoorhenFetchOnlineSourcesForm";
import { MoorhenRamachandran } from './components/validation-tools/MoorhenRamachandran';
import { MoorhenLigandValidation } from './components/validation-tools/MoorhenLigandValidation';
import { MoorhenCarbohydrateValidation } from './components/validation-tools/MoorhenCarbohydrateValidation';
import { MoorhenDifferenceMapPeaks } from './components/validation-tools/MoorhenDifferenceMapPeaks';
import { MoorhenFillMissingAtoms } from './components/validation-tools/MoorhenFillMissingAtoms';
import { MoorhenJsonValidation } from './components/validation-tools/MoorhenJsonValidation';
import { MoorhenMMRRCCPlot } from './components/validation-tools/MoorhenMMRRCCPlot';
import { MoorhenPepflipsDifferenceMap } from './components/validation-tools/MoorhenPepflipsDifferenceMap';
import { MoorhenQScore } from './components/validation-tools/MoorhenQScore';
import { MoorhenUnmodelledBlobs } from './components/validation-tools/MoorhenUnmodelledBlobs';
import { MoorhenValidation } from './components/validation-tools/MoorhenValidation';
import { MoorhenWaterValidation } from './components/validation-tools/MoorhenWaterValidation';
import { autoOpenFiles } from "./utils/MoorhenFileLoading"
import MoorhenReduxStore from "./store/MoorhenReduxStore";
import sceneSettingsReducer, { setDefaultBackgroundColor, setDrawCrosshairs, setDrawFPS, setDrawMissingLoops, setDefaultBondSmoothness,
    setDoSSAO, setSsaoRadius, setSsaoBias, setResetClippingFogging, setClipCap, setEdgeDetectNormalScale, resetSceneSettings,
    setUseOffScreenBuffers, setDoShadowDepthDebug, setDoShadow, setDoSpin, setDoOutline, setDepthBlurRadius, setDrawScaleBar,
    setDepthBlurDepth, setDrawAxes, setDoPerspectiveProjection, setHeight, setWidth, setIsDark, setBackgroundColor, 
    setDoEdgeDetect, setEdgeDetectDepthThreshold, setEdgeDetectNormalThreshold, setEdgeDetectDepthScale, setDoAnaglyphStereo,
    setDoCrossEyedStereo, setDoSideBySideStereo, setDoThreeWayView, setDoMultiView,
    setMultiViewColumns, setMultiViewRows, setSpecifyMultiViewRowsColumns, setThreeWayViewOrder} from './store/sceneSettingsSlice';
import backupSettingsReducer, { setEnableTimeCapsule, setMakeBackups, setMaxBackupCount, setModificationCountBackupThreshold, resetBackupSettings } from './store/backupSettingsSlice';
import generalStatesReducer, { 
    setActiveMap, setCootInitialized, setAppTittle, setDefaultExpandDisplayCards, setTransparentModalsOnMouseOut,
    setUserPreferencesMounted, setDevMode, setTheme, setViewOnly, resetGeneralStates, setUseGemmi, setShowHoverInfo,
 } from './store/generalStatesSlice';
import mapsReducer, { addMap, addMapList, removeMap, emptyMaps } from "./store/mapsSlice";
import hoveringStatesReducer, { setCursorStyle, setEnableAtomHovering, setHoveredAtom, resetHoveringStates } from './store/hoveringStatesSlice';
import labelSettingsReducer, { addAvailableFontList, setAtomLabelDepthMode, setGLLabelsFontFamily, setGLLabelsFontSize, resetLabelSettings } from './store/labelSettingsSlice';
import mapContourSettingsReducer, { 
    showMap, hideMap, setPositiveMapColours, setNegativeMapColours, setMapAlpha, setMapColours, setMapRadius, 
    setMapStyle, setDefaultMapSamplingRate, setDefaultMapLitLines, setMapLineWidth, setDefaultMapSurface, setContourLevel, resetMapContourSettings
} from './store/mapContourSettingsSlice';
import sliceNDiceReducer, { 
    setBFactorThreshold, setClusteringType, setMoleculeBfactors, setMoleculeMaxBfactor, resetSliceNDiceSlice,
    setMoleculeMinBfactor, setNClusters, setPaeFileIsUploaded, setSlicingResults, setThresholdType, setPAEFileContents
 } from "./store/sliceNDiceSlice"
import refinementSettingsReducer, { setEnableRefineAfterMod, setUseRamaRefinementRestraints, setuseTorsionRefinementRestraints, setAnimateRefine, resetRefinementSettings } from './store/refinementSettingsSlice';
import moleculesReducer, { addMolecule, removeMolecule, emptyMolecules, addMoleculeList, showMolecule, hideMolecule, addCustomRepresentation, removeCustomRepresentation, addGeneralRepresentation, removeGeneralRepresentation } from './store/moleculesSlice';
import mouseSettingsReducer, { setContourWheelSensitivityFactor, setZoomWheelSensitivityFactor, setMouseSensitivity, resetDefaultMouseSettings } from './store/mouseSettings';
import shortcutSettingsReducer, { setShowShortcutToast, setShortcutOnHoveredAtom, setShortCuts, resetShortcutSettings } from './store/shortCutsSlice';
import moleculeMapUpdateReducer, { setShowScoresToast, addMapUpdatingScore, removeMapUpdatingScore, overwriteMapUpdatingScores, resetMoleculeMapUpdates } from './store/moleculeMapUpdateSlice';
import lhasaReducer, { resetLhasaSettings, addRdkitMoleculePickle, removeRdkitMoleculePickle, emptyRdkitMoleculePickleList }  from './store/lhasaSlice';
import modalsReducer, { resetActiveModals, focusOnModal, unFocusModal } from './store/modalsSlice';
import sharedSessionReducer, { resetSharedSession } from './store/sharedSessionSlice';
import glRefSliceReducer, { setOrigin, setRequestDrawScene, setIsWebGL2, setActiveMolecule,
    setLightPosition, setAmbient, setSpecular, setDiffuse, setSpecularPower, setZoom,
    setQuat, setFogClipOffset, setFogStart, setFogEnd, setClipStart, setClipEnd, setCursorPosition,
    setShortCutHelp, setDraggableMolecule, triggerRedrawEnv, triggerClearLabels, setGLCtx,
    setDisplayBuffers, setHoverSize, setLabelBuffers, setTexturedShapes,
    setRttFramebufferSize, setCanvasSize, setElementsIndicesRestrict } from './store/glRefSlice';
import overlaysReducer from './store/overlaysSlice';
import menusReducer from './store/menusSlice';
import atomInfoCardsReducer from './store/atomInfoCardsSlice';
import {setCommandCentre, setTimeCapsule, setPaths, setMonomerLibraryPath, setMoorhenIconsPath, setUrlPrefix } from './store/coreRefsSlice';
import { setBusy } from './store/userInterfaceSlice';
import MoorhenStore from './store/MoorhenReduxStore';

export {
    ErrorBoundary, MoorhenApp, MoorhenContainer, MoorhenTimeCapsule, MoorhenMoleculeSelect, MoorhenMolecule, MoorhenMap,
    MoorhenCommandCentre, MoorhenMapSelect, MoorhenDraggableModalBase, MoorhenStore,
    setDefaultBackgroundColor, setDrawCrosshairs, setDrawScaleBar, setDrawFPS, setDrawMissingLoops, setDefaultBondSmoothness,
    setDoSSAO, setSsaoRadius, setSsaoBias, setResetClippingFogging, setClipCap, MoorhenColourRule,
    setUseOffScreenBuffers, setDoShadowDepthDebug, setDoShadow, setDoSpin, setDoOutline, setDepthBlurRadius,
    setDepthBlurDepth, setDrawAxes, setDoPerspectiveProjection, setEnableTimeCapsule, setMakeBackups, setMaxBackupCount, 
    setModificationCountBackupThreshold, setHeight, setWidth, setIsDark, setBackgroundColor, 
    setActiveMap, setCootInitialized, setAppTittle, setUserPreferencesMounted, setDevMode, setTheme, setViewOnly,
    setCursorStyle, setEnableAtomHovering, setHoveredAtom, addAvailableFontList, setAtomLabelDepthMode, 
    setGLLabelsFontFamily, setGLLabelsFontSize, setDefaultMapSamplingRate, setDefaultMapLitLines, setMapLineWidth, 
    setDefaultMapSurface, setDefaultExpandDisplayCards, setTransparentModalsOnMouseOut, setEnableRefineAfterMod,
    addMolecule, removeMolecule, emptyMolecules, addMoleculeList, setContourWheelSensitivityFactor, MoorhenFetchOnlineSourcesForm,
    setZoomWheelSensitivityFactor, setMouseSensitivity, setShowShortcutToast, setShortcutOnHoveredAtom, setShortCuts,
    setShowScoresToast, addMapUpdatingScore, removeMapUpdatingScore, overwriteMapUpdatingScores, MoorhenSlider,
    addMap, addMapList, removeMap, emptyMaps, setPositiveMapColours, setNegativeMapColours, setMapAlpha, setMapColours, 
    setMapRadius, setMapStyle, showMap, hideMap, setContourLevel, showMolecule, hideMolecule, MoorhenMoleculeRepresentation, 
    MoorhenQuerySequenceModal, MoorhenPreferences, setDoEdgeDetect, addCustomRepresentation, removeCustomRepresentation,
    setEdgeDetectDepthThreshold, setEdgeDetectNormalThreshold, setEdgeDetectDepthScale, setEdgeDetectNormalScale,
    setUseRamaRefinementRestraints, setuseTorsionRefinementRestraints, setAnimateRefine, MoorhenReduxStore, 
    moleculesReducer, mapsReducer, mouseSettingsReducer, backupSettingsReducer, unFocusModal, resetSharedSession,
    shortcutSettingsReducer, labelSettingsReducer, sceneSettingsReducer, generalStatesReducer, removeGeneralRepresentation,
    modalsReducer, hoveringStatesReducer, mapContourSettingsReducer, moleculeMapUpdateReducer, addGeneralRepresentation,
    sharedSessionReducer, refinementSettingsReducer, sliceNDiceReducer, overlaysReducer, lhasaReducer, resetSceneSettings,
    resetBackupSettings, resetDefaultMouseSettings, menusReducer, 
    resetGeneralStates, resetHoveringStates, resetLabelSettings, resetMapContourSettings, resetMoleculeMapUpdates,
    resetRefinementSettings, resetShortcutSettings, resetActiveModals, focusOnModal, setBFactorThreshold, 
    setClusteringType, setMoleculeBfactors, setMoleculeMaxBfactor, resetSliceNDiceSlice, setMoleculeMinBfactor, 
    setNClusters, setPaeFileIsUploaded, setSlicingResults, setThresholdType, setPAEFileContents, getMultiColourRuleArgs,
    setUseGemmi, setDoAnaglyphStereo, setDoCrossEyedStereo, setDoSideBySideStereo, setDoThreeWayView, setDoMultiView,
    setMultiViewColumns, setMultiViewRows, setSpecifyMultiViewRowsColumns, setThreeWayViewOrder, glRefSliceReducer, atomInfoCardsReducer, setShowHoverInfo,
    MoorhenRamachandran, MoorhenLigandValidation, MoorhenCarbohydrateValidation, MoorhenDifferenceMapPeaks,
    MoorhenFillMissingAtoms, MoorhenJsonValidation, MoorhenMMRRCCPlot, MoorhenPepflipsDifferenceMap, MoorhenQScore,
    MoorhenUnmodelledBlobs, MoorhenValidation, MoorhenWaterValidation, autoOpenFiles,
    setOrigin, setRequestDrawScene, setIsWebGL2, setActiveMolecule,
    setLightPosition, setAmbient, setSpecular, setDiffuse, setSpecularPower, setZoom,
    setQuat, setFogClipOffset, setFogStart, setFogEnd, setClipStart, setClipEnd, setCursorPosition,
    setShortCutHelp, setDraggableMolecule, triggerRedrawEnv, triggerClearLabels, setGLCtx,
    setDisplayBuffers, setHoverSize, setLabelBuffers, setTexturedShapes,
    setRttFramebufferSize, setCanvasSize, setElementsIndicesRestrict, 
    setCommandCentre, setTimeCapsule, setPaths, setMonomerLibraryPath, setMoorhenIconsPath, setUrlPrefix,
    setBusy

};
