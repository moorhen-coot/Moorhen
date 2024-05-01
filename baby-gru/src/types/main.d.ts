import { moorhen as _moorhen } from "./moorhen"
import { webGL } from "./mgWebGL";
import { libcootApi } from "./libcoot";
import { gemmi } from "./gemmi";
import { privateer } from "./privateer";

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
    
    let activeModalsReducer: any;
    module.exports = activeModalsReducer
    
    let activePopUpsReducer: any;
    module.exports = activePopUpsReducer
    
    let mapContourSettingsReducer: any;
    module.exports = mapContourSettingsReducer
    
    let moleculeMapUpdateReducer: any;
    module.exports = moleculeMapUpdateReducer
    
    let sharedSessionReducer: any;
    module.exports = sharedSessionReducer
    
    let refinementSettingsReducer: any;
    module.exports = refinementSettingsReducer

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

    class MoorhenColourRule implements _moorhen.ColourRule {
        constructor(ruleType: string, cid: string, color: string, commandCentre: React.RefObject<_moorhen.CommandCentre>, isMultiColourRule?: boolean, applyColourToNonCarbonAtoms?: boolean)
        ruleType: string;
        cid: string;
        color: string;
        args: (string | number)[];
        label: string;
        isMultiColourRule: boolean;
        commandCentre: React.RefObject<_moorhen.CommandCentre>;
        parentMolecule: _moorhen.Molecule;
        parentRepresentation: _moorhen.MoleculeRepresentation;
        applyColourToNonCarbonAtoms: boolean;
        uniqueId: string;
        initFromDataObject(data: _moorhen.ColourRuleObject, commandCentre: React.RefObject<_moorhen.CommandCentre>, molecule: _moorhen.Molecule): _moorhen.ColourRule;
        initFromString(stringData: string, commandCentre: React.RefObject<_moorhen.CommandCentre>, molecule: _moorhen.Molecule): _moorhen.ColourRule;
        objectify(): _moorhen.ColourRuleObject;
        stringify(): string;
        setLabel(label: string): void;
        setArgs(args: (string | number)[]): void;
        setParentMolecule(molecule: _moorhen.Molecule): void;
        setParentRepresentation(representation: _moorhen.MoleculeRepresentation): void;    
        setApplyColourToNonCarbonAtoms(newVal: boolean): void;
        getUserDefinedColours(): { cid: string; rgb: [number, number, number]; applyColourToNonCarbonAtoms: boolean }[];
        apply(style: string, ruleIndex: number): Promise<void>;
    }
    module.exports.MoorhenColourRule = MoorhenColourRule

    class MoorhenMoleculeRepresentation implements _moorhen.MoleculeRepresentation {
        constructor(style: _moorhen.RepresentationStyles, cid: string, commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>)
        addColourRule(ruleType: string, cid: string, color: string, args: (string | number)[], isMultiColourRule?: boolean, applyColourToNonCarbonAtoms?: boolean, label?: string): void;
        getBufferObjects(): Promise<any>;
        applyColourRules(): Promise<void>;
        exportAsGltf(): Promise<ArrayBuffer>;
        setBondOptions(bondOptions: _moorhen.cootBondOptions): void;
        setStyle(style: string): void;
        setUseDefaultColourRules(arg0: boolean): void;
        setColourRules(ruleList: _moorhen.ColourRule[]): void;
        buildBuffers(arg0: _moorhen.DisplayObject[]): Promise<void>;
        setBuffers(meshObjects: _moorhen.DisplayObject[]): void;
        drawSymmetry(): void
        deleteBuffers(): void;
        draw(): Promise<void>;
        redraw(): Promise<void>;
        setParentMolecule(arg0: _moorhen.Molecule): void;
        show(): void;
        hide(): void;
        setAtomBuffers(arg0: _moorhen.AtomInfo[]): void;
        bondOptions: _moorhen.cootBondOptions;
        useDefaultColourRules: boolean;
        useDefaultBondOptions: boolean;
        uniqueId: string;
        style: string;
        cid: string;
        visible: boolean;
        buffers: _moorhen.DisplayObject[];
        commandCentre: React.RefObject<_moorhen.CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        parentMolecule: _moorhen.Molecule;
        colourRules: _moorhen.ColourRule[];
        styleHasAtomBuffers: boolean;
        styleHasSymmetry: boolean;
        isCustom: boolean;
        styleHasColourRules: boolean;
        ligandsCid: string;
        hoverColor: number[];
        residueSelectionColor: number[];    
    }
    module.exports.MoorhenMoleculeRepresentation = MoorhenMoleculeRepresentation

    class MoorhenMolecule implements _moorhen.Molecule {
        constructor(commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, store?: any, monomerLibrary?: string)
        transferLigandDicts(toMolecule: _moorhen.Molecule, override?: boolean): Promise<void>;
        minimizeEnergyUsingCidAnimated(cid: string, ncyc: number, nIterations: number, useRamaRestraints: boolean, ramaWeight: number, useTorsionRestraints: boolean, torsionWeight: number): Promise<void>;
        addColourRule(ruleType: string, cid: string, color: string, args: (string | number)[], isMultiColourRule?: boolean, applyColourToNonCarbonAtoms?: boolean, label?: string): void;
        splitMultiModels(draw?: boolean): Promise<_moorhen.Molecule[]>;
        exportAsGltf(representationId: string): Promise<ArrayBuffer>;
        getNonSelectedCids(cid: string): string[];
        getSecondaryStructInfo(modelNumber?: number): Promise<libcootApi.ResidueSpecJS[]>;
        parseCidIntoSelection(selectedCid: string): Promise<_moorhen.ResidueSelection>;
        animateRefine(n_cyc: number, n_iteration: number, final_n_cyc?: number): Promise<void>;
        refineResidueRange(chainId: string, start: number, stop: number, ncyc?: number, redraw?: boolean): Promise<void>;
        SSMSuperpose(movChainId: string, refMolNo: number, refChainId: string): Promise<_moorhen.WorkerResponse>;
        deleteCid(cid: string, redraw?: boolean): Promise<{first: number, second: number}>;
        getNumberOfAtoms(): Promise<number>;
        moveMoleculeHere(x: number, y: number, z: number): Promise<void>;
        checkHasGlycans(): Promise<boolean>;
        fitLigand(mapMolNo: number, ligandMolNo: number, fitRightHere?: boolean, redraw?: boolean, useConformers?: boolean, conformerCount?: number): Promise<_moorhen.Molecule[]>;
        checkIsLigand(): boolean;
        removeRepresentation(representationId: string): void;
        addRepresentation(style: string, cid: string, isCustom?: boolean, colour?: _moorhen.ColourRule[], bondOptions?: _moorhen.cootBondOptions): Promise<_moorhen.MoleculeRepresentation>;
        getNeighborResiduesCids(selectionCid: string, maxDist: number): Promise<string[]>;
        drawWithStyleFromMesh(style: string, meshObjects: any[], cid?: string, fetchAtomBuffers?: boolean): Promise<void>;
        updateWithMovedAtoms(movedResidues: _moorhen.AtomInfo[][]): Promise<void>;
        transformedCachedAtomsAsMovedAtoms(selectionCid?: string): _moorhen.AtomInfo[][];
        copyFragmentUsingCid(cid: string, doRecentre?: boolean, style?: string): Promise<_moorhen.Molecule>;
        hideCid(cid: string, redraw?: boolean): Promise<void>;
        unhideAll(redraw?: boolean): Promise<void>;
        drawUnitCell(): void;
        gemmiAtomsForCid: (cid: string, omitExcludedCids?: boolean) => Promise<_moorhen.AtomInfo[]>;
        mergeMolecules(otherMolecules: _moorhen.Molecule[], doHide?: boolean, doRedraw?: boolean): Promise<void>;
        copyMolecule(doRedraw?: boolean): Promise<_moorhen.Molecule>;
        setBackgroundColour(backgroundColour: [number, number, number, number]): void;
        addDict(fileContent: string): Promise<void>;
        cacheLigandDict(fileContent: string): void;
        toggleSymmetry(): Promise<void>;
        toggleBiomolecule(): void;
        getDict(newTlc: string): string;
        addLigandOfType(resType: string, fromMolNo?: number): Promise<_moorhen.WorkerResponse>;
        updateAtoms(): Promise<void>;
        rigidBodyFit(cidsString: string, mapNo: number, redraw?: boolean): Promise<void>;
        generateSelfRestraints(cid?: string, maxRadius?: number): Promise<void>;
        clearExtraRestraints(): Promise<_moorhen.WorkerResponse>;
        refineResiduesUsingAtomCid(cid: string, mode: string, ncyc?: number, redraw?: boolean): Promise<void>;
        getNcsRelatedChains(): Promise<string[][]>;
        getResidueBFactors(): { cid: string; bFactor: number; normalised_bFactor: number }[];
        redo(): Promise<void>;
        undo(): Promise<void>;
        show(style: string, cid?: string): void;
        setSymmetryRadius(radius: number): Promise<void>;
        drawSymmetry: (fetchSymMatrix?: boolean) => Promise<void>;
        drawBiomolecule (fetchSymMatrix?: boolean) : void;
        getUnitCellParams():  { a: number; b: number; c: number; alpha: number; beta: number; gamma: number; };
        replaceModelWithFile(fileUrl: string): Promise<void>;
        replaceModelWithCoordData(coordData: string): Promise<void>;
        delete(popBackImol?: boolean): Promise<_moorhen.WorkerResponse>;
        fetchDefaultColourRules(): Promise<void>;
        fetchIfDirtyAndDraw(arg0: string): Promise<void>;
        drawEnvironment: (cid: string, labelled?: boolean) => Promise<void>;
        centreOn: (selectionCid?: string, animate?: boolean, setZoom?: boolean) => Promise<void>;
        drawHover: (cid: string) => Promise<void>;
        drawResidueSelection: (cid: string) => Promise<void>;
        clearBuffersOfStyle: (style: string) => void;
        loadToCootFromURL: (inputFile: string, molName: string, options?: RequestInit) => Promise<_moorhen.Molecule>;
        applyTransform: () => Promise<void>;
        getAtoms(format?: string): Promise<string>;
        hide: (style: string, cid?: string) => void;
        redraw: () => Promise<void>;
        setAtomsDirty: (newVal: boolean) => void;
        isVisible: (excludeBuffers?: string[]) => boolean;
        centreAndAlignViewOn: (selectionCid: string, alignWithCB?: boolean, zoomLevel?: number) => Promise<void>;
        buffersInclude: (bufferIn: { id: string; }) => boolean;
        redrawRepresentation: (id: string) => Promise<void>;
        downloadAtoms(format?: 'mmcif' | 'pdb'): Promise<void>;
        mergeFragmentFromRefinement(cid: string, fragmentMolecule: _moorhen.Molecule, acceptTransform?: boolean, refineAfterMerge?: boolean): Promise<void>;
        copyFragmentForRefinement(cid: string[], refinementMap: _moorhen.Map, redraw?: boolean, readrawFragmentFirst?: boolean): Promise<_moorhen.Molecule>;
        refineResiduesUsingAtomCidAnimated(cid: string, activeMap: _moorhen.Map, dist?: number, redraw?: boolean, redrawFragmentFirst?: boolean): Promise<void>;
        getPrivateerValidation(useCache?: boolean): Promise<privateer.ResultsEntry[]>;
        getLigandSVG(resName: string, useCache?: boolean): Promise<string>;
        isValidSelection(cid: string): Promise<boolean>;
        changeChainId(oldId: string, newId: string, redraw?: boolean, startResNo?: number, endResNo?: number): Promise<number>;
        redrawAdaptativeBonds(selectionString?: string, maxDist?: number): Promise<void>;
        setDrawAdaptativeBonds(newValue: boolean): Promise<void>;
        getActiveAtom(): Promise<string>;
        adaptativeBondsEnabled: boolean;
        cachedLigandSVGs: {[key: string]: string};
        cachedGemmiAtoms: _moorhen.AtomInfo[];
        cachedPrivateerValidation: privateer.ResultsEntry[];
        isLigand: boolean;
        type: string;
        excludedCids: string[];
        commandCentre: React.RefObject<_moorhen.CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        store: any;
        atomsDirty: boolean;
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
        biomolOn: boolean;
        symmetryRadius : number;
        symmetryMatrices: number[][][];
        gaussianSurfaceSettings: {
            sigma: number;
            countourLevel: number;
            boxRadius: number;
            gridScale: number;
            bFactor: number;
        };
        isDarkBackground: boolean;
        representations: _moorhen.MoleculeRepresentation[];
        defaultBondOptions: _moorhen.cootBondOptions;
        displayObjectsTransformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
        uniqueId: string;
        defaultColourRules: _moorhen.ColourRule[];
        restraints: {maxRadius: number, cid: string}[];
        monomerLibraryPath: string;
        adaptativeBondsRepresentation: _moorhen.MoleculeRepresentation;
        hoverRepresentation: _moorhen.MoleculeRepresentation;
        unitCellRepresentation: _moorhen.MoleculeRepresentation;
        environmentRepresentation: _moorhen.MoleculeRepresentation;
        selectionRepresentation: _moorhen.MoleculeRepresentation;
        hasDNA: boolean;
        hasGlycans: boolean;
        coordsFormat: _moorhen.coorFormats;
        moleculeDiameter: number;
    }
    module.exports.MoorhenMolecule = MoorhenMolecule
    
    class MoorhenMap implements _moorhen.Map {
        constructor(commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, store?: any)
        exportAsGltf(): Promise<ArrayBuffer>;
        getHistogram(nBins?: number, zoomFactor?: number): Promise<libcootApi.HistogramInfoJS>;
        setMapWeight(weight?: number): Promise<_moorhen.WorkerResponse>;
        estimateMapWeight(): Promise<void>;
        fetchMapAlphaAndRedraw(): Promise<void>;
        centreOnMap(): Promise<void>;
        getSuggestedSettings(): Promise<void>;
        copyMap(): Promise<_moorhen.Map>;
        hideMapContour(): void;
        drawMapContour(): Promise<void>;
        getMapContourParams(): { 
            mapRadius: number; 
            contourLevel: number; 
            mapAlpha: number; 
            mapStyle: "lines" | "solid" | "lit-lines"; 
            mapColour: {r: number; g: number; b: number}; 
            positiveMapColour: {r: number; g: number; b: number}; 
            negativeMapColour: {r: number; g: number; b: number}
        };
        fetchColourAndRedraw(): Promise<void> ;
        fetchDiffMapColourAndRedraw(type: 'positiveDiffColour' | 'negativeDiffColour'): Promise<void> ;
        fetchMapRmsd(): Promise<number>;
        fetchSuggestedLevel(): Promise<number>;
        fetchMapCentre(): Promise<[number, number, number]>;
        replaceMapWithMtzFile(fileUrl: RequestInfo | URL, selectedColumns: _moorhen.selectedMtzColumns): Promise<void>;
        associateToReflectionData (selectedColumns: _moorhen.selectedMtzColumns, reflectionData: Uint8Array | ArrayBuffer): Promise<void>;
        delete(): Promise<void> 
        doCootContour(x: number, y: number, z: number, radius: number, contourLevel: number, style: "lines" | "lit-lines" | "solid"): Promise<void>;
        fetchReflectionData(): Promise<_moorhen.WorkerResponse<Uint8Array>>;
        getMap(): Promise<_moorhen.WorkerResponse>;
        loadToCootFromMtzURL(url: RequestInfo | URL, name: string, selectedColumns: _moorhen.selectedMtzColumns, options?: RequestInit): Promise<_moorhen.Map>;
        loadToCootFromMapURL(url: RequestInfo | URL, name: string, isDiffMap?: boolean, decompress?: boolean, options?: RequestInit): Promise<_moorhen.Map>;
        setActive(): Promise<void>;
        setupContourBuffers(objects: any[], keepCootColours?: boolean): void;
        setOtherMapForColouring(molNo: number, min?: number, max?: number): void;
        store: any;
        isEM: boolean;
        suggestedContourLevel: number;
        suggestedRadius: number;
        mapCentre: [number, number, number];
        type: string;
        name: string;
        molNo: number;
        commandCentre: React.RefObject<_moorhen.CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        webMGContour: boolean;
        showOnLoad: boolean;
        displayObjects: any;
        isDifference: boolean;
        hasReflectionData: boolean;
        selectedColumns: _moorhen.selectedMtzColumns;
        associatedReflectionFileName: string;
        uniqueId: string;
        otherMapForColouring: {molNo: number, min: number, max: number};
        mapRmsd: number;
        suggestedMapWeight: number;
        defaultMapColour: {r: number, g: number, b: number};
        defaultPositiveMapColour: {r: number, g: number, b: number};
        defaultNegativeMapColour: {r: number, g: number, b: number};
    }
    module.exports.MoorhenMap = MoorhenMap

    function loadSessionFromJsonString(
        sessionDataString: string,
        monomerLibraryPath: string,
        molecules: _moorhen.Molecule[],
        maps: _moorhen.Map[],
        commandCentre: React.RefObject<_moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<_moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        store: any,
        dispatch: (reduxStoreAction: any) => void,
    ): Promise<number>;
    module.exports = loadSessionFromJsonString;

    function loadSessionFromProtoMessage(
        sessionProtoMessage: any,
        monomerLibraryPath: string,
        molecules: _moorhen.Molecule[],
        maps: _moorhen.Map[],
        commandCentre: React.RefObject<_moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<_moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        store: any,
        dispatch: (reduxStoreAction: any) => void,
    ): Promise<number>;
    module.exports = loadSessionFromProtoMessage;


    function loadSessionData(
        sessionData: _moorhen.backupSession,
        monomerLibraryPath: string,
        molecules: _moorhen.Molecule[],
        maps: _moorhen.Map[],
        commandCentre: React.RefObject<_moorhen.CommandCentre>,
        timeCapsuleRef: React.RefObject<_moorhen.TimeCapsule>,
        glRef: React.RefObject<webGL.MGWebGL>,
        store: any,
        dispatch: (reduxStoreAction: any) => void,
    ): Promise<number>;
    module.exports = loadSessionData;

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

    function resetSceneSettings(): any;
    module.exports = resetSceneSettings;

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
    
    function resetActivePopUps(): any;
    module.exports = resetActivePopUps;
    
    function resetSharedSession(): any;
    module.exports = resetSharedSession;
}
