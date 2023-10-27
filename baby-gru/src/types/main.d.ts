import { moorhen as _moorhen } from "./moorhen"
import { webGL } from "./mgWebGL";
import { libcootApi } from "./libcoot";
import { gemmi } from "./gemmi";
import { emscriptem } from "./emscriptem";

declare module 'moorhen' {

    let MoorhenContainer: any;
    module.exports = MoorhenContainer;

    class MoorhenPreferences implements _moorhen.Preferences {
        name: string;
        localStorageInstance: {
            clear: () => void;
            setItem: (key: string, value: any) => Promise<string>;
            getItem: (key: string) => Promise<any>;
        };   
    }
    module.exports.MoorhenPreferences = MoorhenPreferences

    class MoorhenMolecule implements _moorhen.Molecule {
        constructor(commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, monomerLibrary: string)
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
        hideCid(cid: string): Promise<void>;
        unhideAll(): Promise<void>;
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
        rigidBodyFit(cidsString: string, mapNo: number): Promise<_moorhen.WorkerResponse>;
        generateSelfRestraints(cid?: string, maxRadius?: number): Promise<void>;
        clearExtraRestraints(): Promise<_moorhen.WorkerResponse>;
        refineResiduesUsingAtomCid(cid: string, mode: string, ncyc: number): Promise<_moorhen.WorkerResponse>;
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
        otherMapMolNoForColouring: number;
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


    function setDefaultBackgroundColor(arg0: [number, number, number, number]): void;
    module.exports = setDefaultBackgroundColor;
    
    function setDrawCrosshairs(arg0: boolean): void;
    module.exports = setDrawCrosshairs;
    
    function setDrawFPS(arg0: boolean): void;
    module.exports = setDrawFPS;
    
    function setDrawMissingLoops(arg0: boolean): void;
    module.exports = setDrawMissingLoops;
    
    function setDefaultBondSmoothness(arg0: number): void;
    module.exports = setDefaultBondSmoothness;
    
    function setDrawInteractions(arg0: boolean): void;
    module.exports = setDrawInteractions;
    
    function setDoSSAO(arg0: boolean): void;
    module.exports = setDoSSAO;
    
    function setSsaoRadius(arg0: number): void;
    module.exports = setSsaoRadius;
    
    function setSsaoBias(arg0: number): void;
    module.exports = setSsaoBias;
    
    function setResetClippingFogging(arg0: boolean): void;
    module.exports = setResetClippingFogging;
    
    function setClipCap(arg0: boolean): void;
    module.exports = setClipCap;
    
    function setUseOffScreenBuffers(arg0: boolean): void;
    module.exports = setUseOffScreenBuffers;
    
    function setDoShadowDepthDebug(arg0: boolean): void;
    module.exports = setDoShadowDepthDebug;
    
    function setDoShadow(arg0: boolean): void;
    module.exports = setDoShadow;
    
    function setDoSpinTest(arg0: boolean): void;
    module.exports = setDoSpinTest;
    
    function setDoOutline(arg0: boolean): void;
    module.exports = setDoOutline;
    
    function setDepthBlurRadius(arg0: number): void;
    module.exports = setDepthBlurRadius;
    
    function setDepthBlurDepth(arg0: number): void;
    module.exports = setDepthBlurDepth;
    
    function setDrawAxes(arg0: boolean): void;
    module.exports = setDrawAxes;
    
    function setDoPerspectiveProjection(arg0: boolean): void;
    module.exports = setDoPerspectiveProjection;

    function setEnableTimeCapsule(arg0: boolean): void;
    module.exports = setEnableTimeCapsule;

    function setMakeBackups(arg0: boolean): void;
    module.exports = setMakeBackups;

    function setMaxBackupCount(arg0: number): void;
    module.exports = setMaxBackupCount;

    function setModificationCountBackupThreshold(arg0: number): void;
    module.exports = setModificationCountBackupThreshold;

    function setHeight(arg0: number): void;
    module.exports = setHeight;

    function setWidth(arg0: number): void;
    module.exports = setWidth;

    function setIsDark(arg0: boolean): void;
    module.exports = setIsDark;

    function setBackgroundColor(arg0: [number, number, number, number]): void;
    module.exports = setBackgroundColor;

    function setNotificationContent(arg0: JSX.Element): void;
    module.exports = setNotificationContent;

    function setActiveMap(arg0: _moorhen.Map): void;
    module.exports = setActiveMap;

    function setCootInitialized(arg0: boolean): void;
    module.exports = setCootInitialized;

    function setAppTitle(arg0: string): void;
    module.exports = setAppTitle;

    function setUserPreferencesMounted(arg0: boolean): void;
    module.exports = setUserPreferencesMounted;

    function setDevMode(arg0: boolean): void;
    module.exports = setDevMode;

    function setTheme(arg0: string): void;
    module.exports = setTheme;

    function setViewOnly(arg0: boolean): void;
    module.exports = setViewOnly;

    function setCursorStyle(arg0: string): void;
    module.exports = setCursorStyle;

    function setEnableAtomHovering(arg0: boolean): void;
    module.exports = setEnableAtomHovering;

    function setHoveredAtom(arg0: {molecule: null | _moorhen.Molecule; cid: null | string}): void;
    module.exports = setHoveredAtom;

    function addAvailableFontList(arg0: string): void;
    module.exports = addAvailableFontList;

    function setAtomLabelDepthMode(arg0: boolean): void;
    module.exports = setAtomLabelDepthMode;

    function setGLLabelsFontFamily(arg0: string): void;
    module.exports = setGLLabelsFontFamily;

    function setGLLabelsFontSize(arg0: number): void;
    module.exports = setGLLabelsFontSize;

    function setDefaultMapSamplingRate(arg0: number): void;
    module.exports = setDefaultMapSamplingRate;

    function setDefaultMapLitLines(arg0: boolean): void;
    module.exports = setDefaultMapLitLines;

    function setMapLineWidth(arg0: number): void;
    module.exports = setMapLineWidth;

    function setDefaultMapSurface(arg0: boolean): void;
    module.exports = setDefaultMapSurface;

    function setDefaultExpandDisplayCards(arg0: boolean): void;
    module.exports = setDefaultExpandDisplayCards;

    function setTransparentModalsOnMouseOut(arg0: boolean): void;
    module.exports = setTransparentModalsOnMouseOut;

    function setEnableRefineAfterMod(arg0: boolean): void;
    module.exports = setEnableRefineAfterMod;

    function addMolecule(arg0: _moorhen.Molecule): void;
    module.exports = addMolecule;

    function removeMolecule(arg0: _moorhen.Molecule): void;
    module.exports = removeMolecule;

    function emptyMolecules(): void;
    module.exports = emptyMolecules;

    function addMoleculeList(arg0: _moorhen.Molecule[]): void;
    module.exports = addMoleculeList;

    function setContourWheelSensitivityFactor(arg0: number): void;
    module.exports = setContourWheelSensitivityFactor;

    function setZoomWheelSensitivityFactor(arg0: number): void;
    module.exports = setZoomWheelSensitivityFactor;

    function setMouseSensitivity(arg0: number): void;
    module.exports = setMouseSensitivity;

    function setShowShortcutToast(arg0: boolean): void;
    module.exports = setShowShortcutToast;

    function setShortcutOnHoveredAtom(arg0: boolean): void;
    module.exports = setShortcutOnHoveredAtom;

    function setShortCuts(arg0: string): void;
    module.exports = setShortCuts;

    function setShowScoresToast(arg0: boolean): void;
    module.exports = setShowScoresToast;

    function addMapUpdatingScore(arg0: _moorhen.Map): void;
    module.exports = addMapUpdatingScore;

    function removeMapUpdatingScore(arg0: _moorhen.Map): void;
    module.exports = removeMapUpdatingScore;

    function overwriteMapUpdatingScores(arg0: _moorhen.Map[]): void;
    module.exports = overwriteMapUpdatingScores;
}
