import type { Store } from "redux"
import type { moorhen } from "./moorhen"
import { webGL } from "./mgWebGL";


declare module 'moorhen' {
    let MoorhenStore: Store<moorhen.State>;

    let setOrigin: any

    let setRequestDrawScene: any

    let setIsWebGL2: any

    let setActiveMolecule: any

    let setLightPosition: any

    let setAmbient: any

    let setSpecular: any

    let setDiffuse: any

    let setSpecularPower: any

    let setZoom: any

    let setQuat: any

    let setFogClipOffset: any

    let setFogStart: any

    let setFogEnd: any

    let setClipStart: any

    let setClipEnd: any

    let setShortCutHelp: any

    let triggerRedrawEnv: any

    let triggerClearLabels: any

    let setDisplayBuffers: any

    let setHoverSize: any

    let setLabelBuffers: any

    let setTexturedShapes: any

    let setElementsIndicesRestrict: any

    let moleculesReducer: any;

    let mapsReducer: any;

    let mouseSettingsReducer: any;

    let backupSettingsReducer: any;

    let shortcutSettingsReducer: any;

    let labelSettingsReducer: any;

    let sceneSettingsReducer: any;

    let miscAppSettingsReducer: any;

    let generalStatesReducer: any;

    let hoveringStatesReducer: any;

    let modalsReducer: any;

    let mapContourSettingsReducer: any;

    let moleculeMapUpdateReducer: any;

    let sharedSessionReducer: any;

    let refinementSettingsReducer: any;

    let lhasaReducer: any;

    let sliceNDiceReducer: any;

    let glRefSliceReducer: any;

    let atomInfoCardsReducer: any;

    let overlaysReducer: any;

    let menusReducer: any;

    let MoorhenReduxStore: Store;

    let MoorhenContainer: React.FC<moorhen.ContainerProps>;

    let MoorhenGlobalInstanceProvider: React.FC<moorhen.MoorhenGlobalInstanceProviderProps>;

    let MoorhenCarbohydrateValidation: any;

    let MoorhenDifferenceMapPeaks: any;

    let MoorhenFillMissingAtoms: any;

    let MoorhenJsonValidation: any;

    let MoorhenLigandValidation: any;

    let MoorhenMMRRCCPlot: any;

    let MoorhenPepflipsDifferenceMap: any;

    let MoorhenQScore: any;

    let MoorhenRamachandran: any;

    let MoorhenUnmodelledBlobs: any;

    let MoorhenValidation: any;

    let MoorhenWaterValidation: any;

    let autoOpenFiles: any;

    let ErrorBoundary: any;

    let MoorhenDraggableModalBase: any;

    let MoorhenMoleculeSelect: any;

    let MoorhenQuerySequenceModal: any;

    let MoorhenMapSelect: any;

    let MoorhenSlider: any;

    let MoorhenFetchOnlineSourcesForm: any;

    interface MoorhenPreferences extends moorhen.Preferences { }
    class MoorhenPreferences implements MoorhenPreferences {
        static defaultPreferencesValues: moorhen.PreferencesValues;
    }

    interface MoorhenColourRule extends moorhen.ColourRule { }
    class MoorhenColourRule implements MoorhenColourRule {
        constructor(ruleType: string, cid: string, color: string, commandCentre: React.RefObject<moorhen.CommandCentre|null>, isMultiColourRule?: boolean, applyColourToNonCarbonAtoms?: boolean)
        static initFromString: (stringifiedObject: string, commandCentre: React.RefObject<moorhen.CommandCentre|null>, molecule: moorhen.Molecule) => moorhen.ColourRule;
        static initFromDataObject: (data: moorhen.ColourRuleObject, commandCentre: React.RefObject<moorhen.CommandCentre|null>, molecule: moorhen.Molecule) => moorhen.ColourRule;
        static parseHexToRgba: (hex: string) => [number, number, number, number];
    }

    interface MoorhenMoleculeRepresentation extends moorhen.MoleculeRepresentation { }
    class MoorhenMoleculeRepresentation implements MoorhenMoleculeRepresentation {
        constructor(style: moorhen.RepresentationStyles, cid: string, commandCentre: React.RefObject<moorhen.CommandCentre|null>)
    }

    interface MoorhenTimeCapsule extends moorhen.TimeCapsule { }
    class MoorhenTimeCapsule implements MoorhenTimeCapsule {
        constructor(moleculesRef: React.RefObject<moorhen.Molecule[]>, mapsRef: React.RefObject<moorhen.Map[]>, activeMapRef: React.RefObject<moorhen.Map>, glRef: React.RefObject<webGL.MGWebGL>, store: any)
        static getBackupLabel(key: moorhen.backupKey): string;
        static loadSessionData(
            sessionData: moorhen.backupSession,
            monomerLibraryPath: string,
            molecules: moorhen.Molecule[],
            maps: moorhen.Map[],
            commandCentre: React.RefObject<moorhen.CommandCentre|null>,
            timeCapsuleRef: React.RefObject<moorhen.TimeCapsule|null>,
            glRef: React.RefObject<webGL.MGWebGL|null>,
            store: any,
            dispatch: any,
            fetchExternalUrl?: (uniqueId: string) => Promise<string>
        ): Promise<number>;
        static loadSessionFromArrayBuffer(
            sessionArrayBuffer: ArrayBuffer,
            monomerLibraryPath: string,
            molecules: moorhen.Molecule[],
            maps: moorhen.Map[],
            commandCentre: React.RefObject<moorhen.CommandCentre|null>,
            timeCapsuleRef: React.RefObject<moorhen.TimeCapsule|null>,
            glRef: React.RefObject<webGL.MGWebGL|null>,
            store: any,
            dispatch: any
        ): Promise<number>;
        static loadSessionFromProtoMessage(
            sessionProtoMessage: any,
            monomerLibraryPath: string,
            molecules: moorhen.Molecule[],
            maps: moorhen.Map[],
            commandCentre: React.RefObject<moorhen.CommandCentre|null>,
            timeCapsuleRef: React.RefObject<moorhen.TimeCapsule|null>,
            glRef: React.RefObject<webGL.MGWebGL|null>,
            store: any,
            dispatch: any
        ): Promise<number>;
        static loadSessionFromJsonString(
            sessionDataString: string,
            monomerLibraryPath: string,
            molecules: moorhen.Molecule[],
            maps: moorhen.Map[],
            commandCentre: React.RefObject<moorhen.CommandCentre|null>,
            timeCapsuleRef: React.RefObject<moorhen.TimeCapsule|null>,
            glRef: React.RefObject<webGL.MGWebGL|null>,
            store: any,
            dispatch: any
        ): Promise<number>;
    }

    interface MoorhenMolecule extends moorhen.Molecule { }
    class MoorhenMolecule implements MoorhenMolecule {
        constructor(commandCentre: React.RefObject<moorhen.CommandCentre|null>, reduxStore: Store, monomerLibraryPath: string)
    }

    interface MoorhenMap extends moorhen.Map { }
    class MoorhenMap implements MoorhenMap {
        constructor(commandCentre: React.RefObject<moorhen.CommandCentre|null>, reduxStore: Store)
        static autoReadMtz(source: File, commandCentre: React.RefObject<moorhen.CommandCentre|null>, store: Store): Promise<moorhen.Map[]>;
    }

    function getMultiColourRuleArgs(molecule: moorhen.Molecule, ruleType: string): Promise<string>;

    function setPositiveMapColours(arg0: {molNo: number, rgb: {r: number; g: number; b: number}}): any;

    function setNegativeMapColours(arg0: {molNo: number, rgb: {r: number; g: number; b: number}}): any;

    function setMapColours(arg0: {molNo: number, rgb: {r: number; g: number; b: number}}): any;

    function setMapAlpha(arg0: {molNo: number, alpha: number}): any;

    function showMap(arg0: {molNo: number, show: boolean}): any;

    function hideMap(arg0: {molNo: number}): any;

    function setContourLevel(arg0: {molNo: number, level: number}): any;

    function showMolecule(arg0: {molNo: number, show: boolean}): any;

    function hideMolecule(arg0: {molNo: number}): any;

    function setMapStyle(arg0: {molNo: number, style: "lines" | "solid" | "lit-lines"}): any;

    function setMapRadius(arg0: {molNo: number, radius: number}): any;

    function setDefaultBackgroundColor(arg0: [number, number, number, number]): any;

    function setDrawScaleBar(arg0: boolean): any;

    function setDrawCrosshairs(arg0: boolean): any;

    function setDrawFPS(arg0: boolean): any;

    function setDrawMissingLoops(arg0: boolean): any;

    function setDefaultBondSmoothness(arg0: number): any;

    function setDrawInteractions(arg0: boolean): any;

    function setDoSSAO(arg0: boolean): any;

    function setDoEdgeDetect(arg0: boolean): any;

    function setEdgeDetectDepthThreshold(arg0: number): any;

    function setEdgeDetectNormalThreshold(arg0: number): any;

    function setEdgeDetectDepthScale(arg0: number): any;

    function setEdgeDetectNormalScale(arg0: number): any;

    function setSsaoRadius(arg0: number): any;

    function setSsaoBias(arg0: number): any;

    function setResetClippingFogging(arg0: boolean): any;

    function setClipCap(arg0: boolean): any;

    function setUseOffScreenBuffers(arg0: boolean): any;

    function setDoShadowDepthDebug(arg0: boolean): any;

    function setDoShadow(arg0: boolean): any;

    function setMultiViewRows(arg0: boolean): any;

    function setThreeWayViewOrder(arg0: boolean): any;

    function setMultiViewColumns(arg0: boolean): any;

    function setSpecifyMultiViewRowsColumns(arg0: boolean): any;

    function setDoThreeWayView(arg0: boolean): any;

    function setDoAnaglyphStereo(arg0: boolean): any;

    function setDoCrossEyedStereo(arg0: boolean): any;

    function setDoSideBySideStereo(arg0: boolean): any;

    function setDoMultiView(arg0: boolean): any;

    function setDoSpin(arg0: boolean): any;

    function setDoOutline(arg0: boolean): any;

    function setDepthBlurRadius(arg0: number): any;

    function setDepthBlurDepth(arg0: number): any;

    function setDrawAxes(arg0: boolean): any;

    function setDoPerspectiveProjection(arg0: boolean): any;

    function setEnableTimeCapsule(arg0: boolean): any;

    function setMakeBackups(arg0: boolean): any;

    function setMaxBackupCount(arg0: number): any;

    function setModificationCountBackupThreshold(arg0: number): any;

    function setHeight(arg0: number): any;

    function setWidth(arg0: number): any;

    function setIsDark(arg0: boolean): any;

    function setBackgroundColor(arg0: [number, number, number, number]): any;

    function setActiveMap(arg0: moorhen.Map): any;

    function setCootInitialized(arg0: boolean): any;

    function setAppTitle(arg0: string): any;

    function setUserPreferencesMounted(arg0: boolean): any;

    function setDevMode(arg0: boolean): any;

    function setUseGemmi(arg0: boolean): any;

    function setTheme(arg0: string): any;

    function setViewOnly(arg0: boolean): any;

    function setShowBackDropNavBar(arg0: boolean): any;

    function setCursorStyle(arg0: string): any;

    function setEnableAtomHovering(arg0: boolean): any;

    function setHoveredAtom(arg0: {molecule: null | moorhen.Molecule; cid: null | string}): any;

    function addAvailableFontList(arg0: string): any;

    function setAtomLabelDepthMode(arg0: boolean): any;

    function setGLLabelsFontFamily(arg0: string): any;

    function setGLLabelsFontSize(arg0: number): any;

    function setDefaultMapSamplingRate(arg0: number): any;

    function setDefaultMapLitLines(arg0: boolean): any;

    function setMapLineWidth(arg0: number): any;

    function setDefaultMapSurface(arg0: boolean): any;

    function setDefaultExpandDisplayCards(arg0: boolean): any;

    function setUrlPrefix(arg0: string): any;

    function setTransparentModalsOnMouseOut(arg0: boolean): any;

    function setEnableRefineAfterMod(arg0: boolean): any;

    function addMolecule(arg0: moorhen.Molecule): any;

    function removeMolecule(arg0: moorhen.Molecule): any;

    function emptyMolecules(): any;

    function addMoleculeList(arg0: moorhen.Molecule[]): any;

    function setContourWheelSensitivityFactor(arg0: number): any;

    function setZoomWheelSensitivityFactor(arg0: number): any;

    function setMouseSensitivity(arg0: number): any;

    function setShowShortcutToast(arg0: boolean): any;

    function setShowHoverInfo(arg0: boolean): any;

    function setShortcutOnHoveredAtom(arg0: boolean): any;

    function setShortCuts(arg0: string): any;

    function setShowScoresToast(arg0: boolean): any;

    function addMapUpdatingScore(arg0: moorhen.Map): any;

    function removeMapUpdatingScore(arg0: moorhen.Map): any;

    function overwriteMapUpdatingScores(arg0: moorhen.Map[]): any;

    function addMap(arg0: moorhen.Map): any;

    function removeMap(arg0: moorhen.Map): void;

    function emptyMaps(): void;

    function addMapList(arg0: moorhen.Map[]): void;

    function resetSceneSettings(): void;

    function setPAEFileContents(arg0: { fileContents: string; fileName: string }[]): void;

    function resetSliceNDiceSlice(): void;

    function resetBackupSettings(): void;

    function resetDefaultMouseSettings(): void;

    function resetGeneralStates(): void;

    function resetHoveringStates(): void;

    function resetLabelSettings(): void;

    function resetMapContourSettings(): void;

    function resetMiscAppSettings(): void;

    function resetMoleculeMapUpdates(): void;

    function resetRefinementSettings(): void;

    function resetShortcutSettings(): void;

    function resetActiveModals(): void;

    function focusOnModal(): void;

    function unFocusModal(): void;

    function resetSharedSession(): void;
}
