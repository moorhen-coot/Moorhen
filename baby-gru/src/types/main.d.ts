import { moorhen as _moorhen } from "./moorhen"
import { webGL } from "./mgWebGL";

declare module 'moorhen' {
    let MoorhenStore: any;
    module.exports = MoorhenStore

    let moleculesReducer: any;
    module.exports = moleculesReducer

    let mapsReducer: any;
    module.exports = mapsReducer

    let mouseSettingsReducer: any;
    module.exports = mouseSettingsReducer

    let backupSettingsReducer: any;
    module.exports = backupSettingsReducer

    let shortcutSettingsReducer: any;
    module.exports = shortcutSettingsReducer

    let labelSettingsReducer: any;
    module.exports = labelSettingsReducer

    let sceneSettingsReducer: any;
    module.exports = sceneSettingsReducer

    let miscAppSettingsReducer: any;
    module.exports = miscAppSettingsReducer

    let generalStatesReducer: any;
    module.exports = generalStatesReducer

    let hoveringStatesReducer: any;
    module.exports = hoveringStatesReducer

    let modalsReducer: any;
    module.exports = modalsReducer

    let mapContourSettingsReducer: any;
    module.exports = mapContourSettingsReducer

    let moleculeMapUpdateReducer: any;
    module.exports = moleculeMapUpdateReducer

    let sharedSessionReducer: any;
    module.exports = sharedSessionReducer

    let refinementSettingsReducer: any;
    module.exports = refinementSettingsReducer

    let lhasaReducer: any;
    module.exports = lhasaReducer

    let sliceNDiceReducer: any;
    module.exports = sliceNDiceReducer

    let glRefSliceReducer: any;
    module.exports = glRefSliceReducer

    let atomInfoCardsReducer: any;
    module.exports = atomInfoCardsReducer

    let overlaysReducer: any;
    module.exports = overlaysReducer

    let menusReducer: any;
    module.exports = menusReducer

    let MoorhenReduxStore: any;
    module.exports = MoorhenReduxStore

    let MoorhenContainer: any;
    module.exports = MoorhenContainer;

    let ErrorBoundary: any;
    module.exports = ErrorBoundary;

    let MoorhenDraggableModalBase: any;
    module.exports = MoorhenDraggableModalBase;


    let MoorhenMoleculeSelect: any;
    module.exports = MoorhenMoleculeSelect;

    let MoorhenQuerySequenceModal: any;
    module.exports = MoorhenQuerySequenceModal;

    let MoorhenMapSelect: any;
    module.exports = MoorhenMapSelect;


    let MoorhenSlider: any;
    module.exports = MoorhenSlider;


    let MoorhenFetchOnlineSourcesForm: any;
    module.exports = MoorhenFetchOnlineSourcesForm;

    interface MoorhenPreferences extends _moorhen.Preferences { }
    class MoorhenPreferences implements MoorhenPreferences {
        static defaultPreferencesValues: _moorhen.PreferencesValues;
    }
    module.exports.MoorhenPreferences = MoorhenPreferences

    interface MoorhenColourRule extends _moorhen.ColourRule { }
    class MoorhenColourRule implements MoorhenColourRule {
        constructor(ruleType: string, cid: string, color: string, commandCentre: React.RefObject<_moorhen.CommandCentre>, isMultiColourRule?: boolean, applyColourToNonCarbonAtoms?: boolean)
        static initFromString: (stringifiedObject: string, commandCentre: React.RefObject<_moorhen.CommandCentre>, molecule: _moorhen.Molecule) => _moorhen.ColourRule;
        static initFromDataObject: (data: _moorhen.ColourRuleObject, commandCentre: React.RefObject<_moorhen.CommandCentre>, molecule: _moorhen.Molecule) => _moorhen.ColourRule;
        static parseHexToRgba: (hex: string) => [number, number, number, number];
    }
    module.exports.MoorhenColourRule = MoorhenColourRule

    interface MoorhenMoleculeRepresentation extends _moorhen.MoleculeRepresentation { }
    class MoorhenMoleculeRepresentation implements MoorhenMoleculeRepresentation {
        constructor(style: _moorhen.RepresentationStyles, cid: string, commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>)
    }
    module.exports.MoorhenMoleculeRepresentation = MoorhenMoleculeRepresentation

    interface MoorhenTimeCapsule extends _moorhen.TimeCapsule { }
    class MoorhenTimeCapsule implements MoorhenTimeCapsule {
        constructor(moleculesRef: React.RefObject<_moorhen.Molecule[]>, mapsRef: React.RefObject<_moorhen.Map[]>, activeMapRef: React.RefObject<_moorhen.Map>, glRef: React.RefObject<webGL.MGWebGL>, store: any)
        static getBackupLabel(key: _moorhen.backupKey): string;
        static loadSessionData(
            sessionData: _moorhen.backupSession,
            monomerLibraryPath: string,
            molecules: _moorhen.Molecule[],
            maps: _moorhen.Map[],
            commandCentre: React.RefObject<_moorhen.CommandCentre>,
            timeCapsuleRef: React.RefObject<_moorhen.TimeCapsule>,
            glRef: React.RefObject<webGL.MGWebGL>,
            store: any,
            dispatch: any,
            fetchExternalUrl?: (uniqueId: string) => Promise<string>
        ): Promise<number>;
        static loadSessionFromArrayBuffer(
            sessionArrayBuffer: ArrayBuffer,
            monomerLibraryPath: string,
            molecules: _moorhen.Molecule[],
            maps: _moorhen.Map[],
            commandCentre: React.RefObject<_moorhen.CommandCentre>,
            timeCapsuleRef: React.RefObject<_moorhen.TimeCapsule>,
            glRef: React.RefObject<webGL.MGWebGL>,
            store: any,
            dispatch: any
        ): Promise<number>;
        static loadSessionFromProtoMessage(
            sessionProtoMessage: any,
            monomerLibraryPath: string,
            molecules: _moorhen.Molecule[],
            maps: _moorhen.Map[],
            commandCentre: React.RefObject<_moorhen.CommandCentre>,
            timeCapsuleRef: React.RefObject<_moorhen.TimeCapsule>,
            glRef: React.RefObject<webGL.MGWebGL>,
            store: any,
            dispatch: any
        ): Promise<number>;
        static loadSessionFromJsonString(
            sessionDataString: string,
            monomerLibraryPath: string,
            molecules: _moorhen.Molecule[],
            maps: _moorhen.Map[],
            commandCentre: React.RefObject<_moorhen.CommandCentre>,
            timeCapsuleRef: React.RefObject<_moorhen.TimeCapsule>,
            glRef: React.RefObject<webGL.MGWebGL>,
            store: any,
            dispatch: any
        ): Promise<number>;
    }
    module.exports.MoorhenTimeCapsule = MoorhenTimeCapsule

    interface MoorhenMolecule extends _moorhen.Molecule { }
    class MoorhenMolecule implements MoorhenMolecule {
        constructor(commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, store?: any, monomerLibrary?: string)
    }
    module.exports.MoorhenMolecule = MoorhenMolecule

    interface MoorhenMap extends _moorhen.Map { }
    class MoorhenMap implements MoorhenMap {
        constructor(commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, store?: any)
        static autoReadMtz(source: File, commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, store: any): Promise<_moorhen.Map[]>;
    }
    module.exports.MoorhenMap = MoorhenMap

    function getMultiColourRuleArgs(molecule: _moorhen.Molecule, ruleType: string): Promise<string>;
    module.exports = getMultiColourRuleArgs;

    function setPositiveMapColours(arg0: {molNo: number, rgb: {r: number; g: number; b: number}}): any;
    module.exports = setPositiveMapColours;

    function setNegativeMapColours(arg0: {molNo: number, rgb: {r: number; g: number; b: number}}): any;
    module.exports = setNegativeMapColours;

    function setMapColours(arg0: {molNo: number, rgb: {r: number; g: number; b: number}}): any;
    module.exports = setMapColours;

    function setMapAlpha(arg0: {molNo: number, alpha: number}): any;
    module.exports = setMapAlpha;

    function showMap(arg0: {molNo: number, show: boolean}): any;
    module.exports = showMap;

    function hideMap(arg0: {molNo: number}): any;
    module.exports = hideMap;

    function setContourLevel(arg0: {molNo: number, level: number}): any;
    module.exports = setContourLevel;

    function showMolecule(arg0: {molNo: number, show: boolean}): any;
    module.exports = showMolecule;

    function hideMolecule(arg0: {molNo: number}): any;
    module.exports = hideMolecule;

    function setMapStyle(arg0: {molNo: number, style: "lines" | "solid" | "lit-lines"}): any;
    module.exports = setMapStyle;

    function setMapRadius(arg0: {molNo: number, radius: number}): any;
    module.exports = setMapRadius;

    function setDefaultBackgroundColor(arg0: [number, number, number, number]): any;
    module.exports = setDefaultBackgroundColor;

    function setDrawScaleBar(arg0: boolean): any;
    module.exports = setDrawScaleBar;

    function setDrawCrosshairs(arg0: boolean): any;
    module.exports = setDrawCrosshairs;

    function setDrawFPS(arg0: boolean): any;
    module.exports = setDrawFPS;

    function setDrawMissingLoops(arg0: boolean): any;
    module.exports = setDrawMissingLoops;

    function setDefaultBondSmoothness(arg0: number): any;
    module.exports = setDefaultBondSmoothness;

    function setDrawInteractions(arg0: boolean): any;
    module.exports = setDrawInteractions;

    function setDoSSAO(arg0: boolean): any;
    module.exports = setDoSSAO;

    function setDoEdgeDetect(arg0: boolean): any;
    module.exports = setDoEdgeDetect;

    function setEdgeDetectDepthThreshold(arg0: number): any;
    module.exports = setEdgeDetectDepthThreshold;

    function setEdgeDetectNormalThreshold(arg0: number): any;
    module.exports = setEdgeDetectNormalThreshold;

    function setEdgeDetectDepthScale(arg0: number): any;
    module.exports = setEdgeDetectDepthScale;

    function setEdgeDetectNormalScale(arg0: number): any;
    module.exports = setEdgeDetectNormalScale;

    function setSsaoRadius(arg0: number): any;
    module.exports = setSsaoRadius;

    function setSsaoBias(arg0: number): any;
    module.exports = setSsaoBias;

    function setResetClippingFogging(arg0: boolean): any;
    module.exports = setResetClippingFogging;

    function setClipCap(arg0: boolean): any;
    module.exports = setClipCap;

    function setUseOffScreenBuffers(arg0: boolean): any;
    module.exports = setUseOffScreenBuffers;

    function setDoShadowDepthDebug(arg0: boolean): any;
    module.exports = setDoShadowDepthDebug;

    function setDoShadow(arg0: boolean): any;
    module.exports = setDoShadow;

    function setMultiViewRows(arg0: boolean): any;
    module.exports = setMultiViewRows;

    function setThreeWayViewOrder(arg0: boolean): any;
    module.exports = setThreeWayViewOrder;

    function setMultiViewColumns(arg0: boolean): any;
    module.exports = setMultiViewColumns;

    function setSpecifyMultiViewRowsColumns(arg0: boolean): any;
    module.exports = setSpecifyMultiViewRowsColumns;

    function setDoThreeWayView(arg0: boolean): any;
    module.exports = setDoThreeWayView;

    function setDoAnaglyphStereo(arg0: boolean): any;
    module.exports = setDoAnaglyphStereo;

    function setDoCrossEyedStereo(arg0: boolean): any;
    module.exports = setDoCrossEyedStereo;

    function setDoSideBySideStereo(arg0: boolean): any;
    module.exports = setDoSideBySideStereo;

    function setDoMultiView(arg0: boolean): any;
    module.exports = setDoMultiView;

    function setDoSpin(arg0: boolean): any;
    module.exports = setDoSpin;

    function setDoOutline(arg0: boolean): any;
    module.exports = setDoOutline;

    function setDepthBlurRadius(arg0: number): any;
    module.exports = setDepthBlurRadius;

    function setDepthBlurDepth(arg0: number): any;
    module.exports = setDepthBlurDepth;

    function setDrawAxes(arg0: boolean): any;
    module.exports = setDrawAxes;

    function setDoPerspectiveProjection(arg0: boolean): any;
    module.exports = setDoPerspectiveProjection;

    function setEnableTimeCapsule(arg0: boolean): any;
    module.exports = setEnableTimeCapsule;

    function setMakeBackups(arg0: boolean): any;
    module.exports = setMakeBackups;

    function setMaxBackupCount(arg0: number): any;
    module.exports = setMaxBackupCount;

    function setModificationCountBackupThreshold(arg0: number): any;
    module.exports = setModificationCountBackupThreshold;

    function setHeight(arg0: number): any;
    module.exports = setHeight;

    function setWidth(arg0: number): any;
    module.exports = setWidth;

    function setIsDark(arg0: boolean): any;
    module.exports = setIsDark;

    function setBackgroundColor(arg0: [number, number, number, number]): any;
    module.exports = setBackgroundColor;

    function setActiveMap(arg0: _moorhen.Map): any;
    module.exports = setActiveMap;

    function setCootInitialized(arg0: boolean): any;
    module.exports = setCootInitialized;

    function setAppTitle(arg0: string): any;
    module.exports = setAppTitle;

    function setUserPreferencesMounted(arg0: boolean): any;
    module.exports = setUserPreferencesMounted;

    function setDevMode(arg0: boolean): any;
    module.exports = setDevMode;

    function setUseGemmi(arg0: boolean): any;
    module.exports = setUseGemmi;

    function setTheme(arg0: string): any;
    module.exports = setTheme;

    function setViewOnly(arg0: boolean): any;
    module.exports = setViewOnly;

    function setCursorStyle(arg0: string): any;
    module.exports = setCursorStyle;

    function setEnableAtomHovering(arg0: boolean): any;
    module.exports = setEnableAtomHovering;

    function setHoveredAtom(arg0: {molecule: null | _moorhen.Molecule; cid: null | string}): any;
    module.exports = setHoveredAtom;

    function addAvailableFontList(arg0: string): any;
    module.exports = addAvailableFontList;

    function setAtomLabelDepthMode(arg0: boolean): any;
    module.exports = setAtomLabelDepthMode;

    function setGLLabelsFontFamily(arg0: string): any;
    module.exports = setGLLabelsFontFamily;

    function setGLLabelsFontSize(arg0: number): any;
    module.exports = setGLLabelsFontSize;

    function setDefaultMapSamplingRate(arg0: number): any;
    module.exports = setDefaultMapSamplingRate;

    function setDefaultMapLitLines(arg0: boolean): any;
    module.exports = setDefaultMapLitLines;

    function setMapLineWidth(arg0: number): any;
    module.exports = setMapLineWidth;

    function setDefaultMapSurface(arg0: boolean): any;
    module.exports = setDefaultMapSurface;

    function setDefaultExpandDisplayCards(arg0: boolean): any;
    module.exports = setDefaultExpandDisplayCards;

    function setTransparentModalsOnMouseOut(arg0: boolean): any;
    module.exports = setTransparentModalsOnMouseOut;

    function setEnableRefineAfterMod(arg0: boolean): any;
    module.exports = setEnableRefineAfterMod;

    function addMolecule(arg0: _moorhen.Molecule): any;
    module.exports = addMolecule;

    function removeMolecule(arg0: _moorhen.Molecule): any;
    module.exports = removeMolecule;

    function emptyMolecules(): any;
    module.exports = emptyMolecules;

    function addMoleculeList(arg0: _moorhen.Molecule[]): any;
    module.exports = addMoleculeList;

    function setContourWheelSensitivityFactor(arg0: number): any;
    module.exports = setContourWheelSensitivityFactor;

    function setZoomWheelSensitivityFactor(arg0: number): any;
    module.exports = setZoomWheelSensitivityFactor;

    function setMouseSensitivity(arg0: number): any;
    module.exports = setMouseSensitivity;

    function setShowShortcutToast(arg0: boolean): any;
    module.exports = setShowShortcutToast;

    function setShortcutOnHoveredAtom(arg0: boolean): any;
    module.exports = setShortcutOnHoveredAtom;

    function setShortCuts(arg0: string): any;
    module.exports = setShortCuts;

    function setShowScoresToast(arg0: boolean): any;
    module.exports = setShowScoresToast;

    function addMapUpdatingScore(arg0: _moorhen.Map): any;
    module.exports = addMapUpdatingScore;

    function removeMapUpdatingScore(arg0: _moorhen.Map): any;
    module.exports = removeMapUpdatingScore;

    function overwriteMapUpdatingScores(arg0: _moorhen.Map[]): any;
    module.exports = overwriteMapUpdatingScores;

    function addMap(arg0: _moorhen.Map): any;
    module.exports = addMap;

    function removeMap(arg0: _moorhen.Map): any;
    module.exports = removeMap;

    function emptyMaps(): any;
    module.exports = emptyMaps;

    function addMapList(arg0: _moorhen.Map[]): any;
    module.exports = addMapList;

    function resetSceneSettings(): any;
    module.exports = resetSceneSettings;

    function setPAEFileContents(arg0: { fileContents: string; fileName: string }[]): any;
    module.exports = setPAEFileContents;

    function resetSliceNDiceSlice(): any;
    module.exports = resetSliceNDiceSlice;

    function resetBackupSettings(): any;
    module.exports = resetBackupSettings;

    function resetDefaultMouseSettings(): any;
    module.exports = resetDefaultMouseSettings;

    function resetGeneralStates(): any;
    module.exports = resetGeneralStates;

    function resetHoveringStates(): any;
    module.exports = resetHoveringStates;

    function resetLabelSettings(): any;
    module.exports = resetLabelSettings;

    function resetMapContourSettings(): any;
    module.exports = resetMapContourSettings;

    function resetMiscAppSettings(): any;
    module.exports = resetMiscAppSettings;

    function resetMoleculeMapUpdates(): any;
    module.exports = resetMoleculeMapUpdates;

    function resetRefinementSettings(): any;
    module.exports = resetRefinementSettings;

    function resetShortcutSettings(): any;
    module.exports = resetShortcutSettings;

    function resetActiveModals(): any;
    module.exports = resetActiveModals;

    function focusOnModal(): any;
    module.exports = focusOnModal;

    function unFocusModal(): any;
    module.exports = unFocusModal;

    function resetSharedSession(): any;
    module.exports = resetSharedSession;
}
