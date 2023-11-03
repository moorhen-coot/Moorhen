import { moorhen as _moorhen } from "./moorhen"
import { webGL } from "./mgWebGL";
import { libcootApi } from "./libcoot";
import { gemmi } from "./gemmi";
import { emscriptem } from "./emscriptem";

declare module 'moorhen' {

    let MoorhenContainer: any;
    module.exports = MoorhenContainer;

    let MoorhenReduxProvider: any;
    module.exports = MoorhenReduxProvider;

    class MoorhenPreferences implements _moorhen.Preferences {
        name: string;
        static defaultPreferencesValues: _moorhen.PreferencesValues;
        localStorageInstance: {
            clear: () => void;
            setItem: (key: string, value: any) => Promise<string>;
            getItem: (key: string) => Promise<any>;
        };   
    }
    module.exports.MoorhenPreferences = MoorhenPreferences

    class MoorhenMolecule implements _moorhen.Molecule {
        constructor(commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, monomerLibrary: string)
        deleteCid(cid: string, redraw?: boolean): Promise<void>;
        getNumberOfAtoms(): Promise<number>;
        moveMoleculeHere(x: number, y: number, z: number): Promise<void>;
        checkHasGlycans(): Promise<boolean>;
        fitLigandHere(mapMolNo: number, ligandMolNo: number, redraw?: boolean, useConformers?: boolean, conformerCount?: number): Promise<_moorhen.Molecule[]>;
        isLigand(): boolean;
        removeRepresentation(representationId: string): void;
        addRepresentation(style: string, cid: string, isCustom?: boolean, colour?: _moorhen.ColourRule[], bondOptions?: _moorhen.cootBondOptions, applyColourToNonCarbonAtoms?: boolean): Promise<_moorhen.MoleculeRepresentation>;
        getNeighborResiduesCids(selectionCid: string, radius: number, minDist: number, maxDist: number): Promise<string[]>;
        drawWithStyleFromMesh(style: string, meshObjects: any[], cid?: string): Promise<void>;
        updateWithMovedAtoms(movedResidues: _moorhen.AtomInfo[][]): Promise<void>;
        transformedCachedAtomsAsMovedAtoms(selectionCid?: string): _moorhen.AtomInfo[][];
        copyFragmentUsingCid(cid: string, doRecentre?: boolean, style?: string): Promise<_moorhen.Molecule>;
        hideCid(cid: string, redraw?: boolean): Promise<void>;
        unhideAll(redraw?: boolean): Promise<void>;
        drawUnitCell(): void;
        gemmiAtomsForCid: (cid: string, omitExcludedCids?: boolean) => Promise<_moorhen.AtomInfo[]>;
        mergeMolecules(otherMolecules: _moorhen.Molecule[], doHide?: boolean): Promise<void>;
        setBackgroundColour(backgroundColour: [number, number, number, number]): void;
        addDict(fileContent: string): Promise<void>;
        addDictShim(fileContent: string): void;
        toggleSymmetry(): Promise<void>;
        getDict(newTlc: string): string;
        addLigandOfType(resType: string, fromMolNo?: number): Promise<_moorhen.WorkerResponse>;
        updateAtoms(): Promise<void>;
        rigidBodyFit(cidsString: string, mapNo: number, redraw?: boolean): Promise<void>;
        generateSelfRestraints(cid?: string, maxRadius?: number): Promise<void>;
        clearExtraRestraints(): Promise<_moorhen.WorkerResponse>;
        refineResiduesUsingAtomCid(cid: string, mode: string, ncyc?: number, redraw?: boolean): Promise<void>;
        redo(): Promise<void>;
        undo(): Promise<void>;
        show(style: string, cid?: string): void;
        setSymmetryRadius(radius: number): Promise<void>;
        drawSymmetry: (fetchSymMatrix?: boolean) => Promise<void>;
        getUnitCellParams():  { a: number; b: number; c: number; alpha: number; beta: number; gamma: number; };
        replaceModelWithFile(fileUrl: string, molName: string): Promise<void>
        delete(): Promise<_moorhen.WorkerResponse> 
        fetchDefaultColourRules(): Promise<void>;
        fetchIfDirtyAndDraw(arg0: string): Promise<void>;
        drawEnvironment: (cid: string, labelled?: boolean) => Promise<void>;
        centreOn: (selectionCid?: string, animate?: boolean) => Promise<void>;
        drawHover: (cid: string) => Promise<void>;
        clearBuffersOfStyle: (style: string) => void;
        loadToCootFromURL: (inputFile: string, molName: string) => Promise<_moorhen.Molecule>;
        applyTransform: () => Promise<void>;
        getAtoms(format?: string): Promise<string>;
        hide: (style: string, cid?: string) => void;
        redraw: () => Promise<void>;
        setAtomsDirty: (newVal: boolean) => void;
        hasVisibleBuffers: (excludeBuffers?: string[]) => boolean;
        centreAndAlignViewOn(selectionCid: string, animate?: boolean): Promise<void>;
        buffersInclude: (bufferIn: { id: string; }) => boolean;
        redrawRepresentation: (id: string) => Promise<void>;
        type: string;
        excludedCids: string[];
        commandCentre: React.RefObject<_moorhen.CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        atomsDirty: boolean;
        isVisible: boolean;
        name: string;
        molNo: number;
        gemmiStructure: gemmi.Structure;
        sequences: _moorhen.Sequence[];
        ligands: _moorhen.LigandInfo[];
        atomCount: number;
        ligandDicts: {[comp_id: string]: string};
        connectedToMaps: number[];
        excludedSelections: string[];
        symmetryOn: boolean;
        symmetryRadius : number;
        symmetryMatrices: number[][][];
        gaussianSurfaceSettings: {
            sigma: number;
            countourLevel: number;
            boxRadius: number;
            gridScale: number;
        };
        isDarkBackground: boolean;
        representations: _moorhen.MoleculeRepresentation[];
        defaultBondOptions: _moorhen.cootBondOptions;
        displayObjectsTransformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
        uniqueId: string;
        defaultColourRules: _moorhen.ColourRule[];
        restraints: {maxRadius: number, cid: string}[];
        monomerLibraryPath: string;
        hoverRepresentation: _moorhen.MoleculeRepresentation;
        unitCellRepresentation: _moorhen.MoleculeRepresentation;
        environmentRepresentation: _moorhen.MoleculeRepresentation;
        hasDNA: boolean;
        hasGlycans: boolean;
    }
    module.exports.MoorhenMolecule = MoorhenMolecule
    
    class MoorhenMap implements _moorhen.Map {
        constructor(commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>)
        getHistogram(nBins?: number, zoomFactor?: number): Promise<libcootApi.HistogramInfoJS>;
        setMapWeight(weight?: number): Promise<_moorhen.WorkerResponse>;
        estimateMapWeight(): Promise<void>;
        setAlpha(alpha: number, redraw?: boolean): Promise<void>;
        centreOnMap(): Promise<void>;
        getSuggestedSettings(): Promise<void>;
        duplicate(): Promise<_moorhen.Map>;
        makeCootUnlive(): void;
        makeCootLive(): void;
        setColour(r: number, g: number, b: number, redraw?: boolean): Promise<void> ;
        setDiffMapColour(type: 'positiveDiffColour' | 'negativeDiffColour', r: number, g: number, b: number, redraw?: boolean): Promise<void> ;
        fetchMapRmsd(): Promise<number>;
        fetchSuggestedLevel(): Promise<number>;
        fetchMapCentre(): Promise<[number, number, number]>;
        replaceMapWithMtzFile(fileUrl: RequestInfo | URL, name: string, selectedColumns: _moorhen.selectedMtzColumns, mapColour?: { [type: string]: {r: number, g: number, b: number} }): Promise<void>;
        associateToReflectionData (selectedColumns: _moorhen.selectedMtzColumns, reflectionData: Uint8Array | ArrayBuffer): Promise<void>;
        delete(): Promise<void> 
        doCootContour(x: number, y: number, z: number, radius: number, contourLevel: number): Promise<void>;
        fetchReflectionData(): Promise<_moorhen.WorkerResponse<Uint8Array>>;
        getMap(): Promise<_moorhen.WorkerResponse>;
        loadToCootFromMtzURL(url: RequestInfo | URL, name: string, selectedColumns: _moorhen.selectedMtzColumns): Promise<_moorhen.Map>;
        loadToCootFromMapURL(url: RequestInfo | URL, name: string, isDiffMap?: boolean): Promise<_moorhen.Map>;
        setActive(): Promise<void>;
        setupContourBuffers(objects: any[], keepCootColours?: boolean): void;
        setOtherMapForColouring(molNo: number, min?: number, max?: number): void;
        isEM: boolean;
        suggestedContourLevel: number;
        suggestedRadius: number;
        mapCentre: [number, number, number];
        type: string;
        name: string;
        molNo: number;
        commandCentre: React.RefObject<_moorhen.CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        contourLevel: number;
        mapRadius: number;
        mapColour: [number, number, number, number];
        webMGContour: boolean;
        cootContour: boolean;
        displayObjects: any;
        litLines: boolean;
        solid: boolean;
        isDifference: boolean;
        hasReflectionData: boolean;
        selectedColumns: _moorhen.selectedMtzColumns;
        associatedReflectionFileName: string;
        uniqueId: string;
        otherMapForColouring: {molNo: number, min: number, max: number};
        mapRmsd: number;
        suggestedMapWeight: number;
        rgba: {
            mapColour: {r: number, g: number, b: number};
            positiveDiffColour: {r: number, g: number, b: number};
            negativeDiffColour: {r: number, g: number, b: number};
            a: number;
        }
    }
    module.exports.MoorhenMap = MoorhenMap

    function loadSessionData(
        sessionDataString: string,
        monomerLibraryPath: string,
        molecules: _moorhen.Molecule[],
        maps: _moorhen.Map[],
        commandCentre: React.RefObject<_moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<_moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        dispatch: (reduxStoreAction: any) => void,
    ): Promise<number>;
    module.exports = loadSessionData;


    function setDefaultBackgroundColor(arg0: [number, number, number, number]): any;
    module.exports = setDefaultBackgroundColor;
    
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
    
    function setDoSpinTest(arg0: boolean): any;
    module.exports = setDoSpinTest;
    
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

    function setNotificationContent(arg0: JSX.Element): any;
    module.exports = setNotificationContent;

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
}
