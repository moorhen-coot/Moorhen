import React from "react"
import { emscriptem } from "./emscriptem";
import { gemmi } from "./gemmi";
import { webGL } from "./mgWebGL";
import { MoorhenCommandCentre } from "../moorhen";

export namespace moorhen {

    interface Preferences {
        name: string;
        static defaultPreferencesValues: PreferencesValues;
        localStorageInstance: {
            clear: () => void;
            setItem: (key: string, value: any) => Promise<string>;
            getItem: (key: string) => Promise<any>;
        };
    }

    type ResidueInfo = {
        resCode: string;
        resNum: number;
        cid: string;
    }
    
    type LigandInfo = {
        resName: string;
        chainName: string;
        resNum: string;
        modelName: string;
        cid: string;
    }
    
    type Sequence = {
        name: string;
        chain: string;
        type: number;
        sequence: ResidueInfo[];
    }
    
    type ResidueSpec = {
        mol_name: string;
        mol_no: string;
        chain_id: string;
        res_no: number;
        res_name: string;
        atom_name: string;
        ins_code: string;
        alt_conf: string;
        cid: string
    }
    
    type AtomInfo = {
        pos: [number, number, number];
        x: number;
        y: number;
        z: number;
        charge: number;
        element: emscriptem.instance<string>;
        symbol: string;
        tempFactor: number;
        serial: string;
        name: string;
        has_altloc: boolean;
        alt_loc: string;
        mol_name: string;
        chain_id: string;
        res_no: string;
        res_name: string;
        label: string;
    }
    
    type DisplayObject = {
        symmetryMatrices: any;
        [attr: string]: any;
    }
    
    type cootBondOptions = {
        smoothness: number;
        width: number;
        atomRadiusBondRatio: number;
    }
    
    type ColourRule = {
        args: (string | number)[];
        color?: string;
        isMultiColourRule: boolean;
        ruleType: string;
        label: string;
    }
    
    interface Molecule {
        refineResiduesUsingAtomCid(cid: string, mode: string, ncyc?: number, redraw?: boolean): Promise<void>;
        deleteCid(cid: string, redraw?: boolean): Promise<void>;
        getNumberOfAtoms(): Promise<number>;
        moveMoleculeHere(x: number, y: number, z: number): Promise<void>;
        checkHasGlycans(): Promise<boolean>;
        fitLigandHere(mapMolNo: number, ligandMolNo: number, redraw?: boolean, useConformers?: boolean, conformerCount?: number): Promise<Molecule[]>;
        isLigand(): boolean;
        removeRepresentation(representationId: string): void;
        addRepresentation(style: string, cid: string, isCustom?: boolean, colour?: ColourRule[], bondOptions?: cootBondOptions, applyColourToNonCarbonAtoms?: boolean): Promise<MoleculeRepresentation>;
        getNeighborResiduesCids(selectionCid: string, radius: number, minDist: number, maxDist: number): Promise<string[]>;
        drawWithStyleFromMesh(style: string, meshObjects: any[], cid?: string): Promise<void>;
        updateWithMovedAtoms(movedResidues: AtomInfo[][]): Promise<void>;
        transformedCachedAtomsAsMovedAtoms(selectionCid?: string): AtomInfo[][];
        copyFragmentUsingCid(cid: string, doRecentre?: boolean, style?: string): Promise<Molecule>;
        hideCid(cid: string, redraw?: boolean): Promise<void>;
        unhideAll(redraw?: boolean): Promise<void>;
        drawUnitCell(): void;
        gemmiAtomsForCid: (cid: string, omitExcludedCids?: boolean) => Promise<AtomInfo[]>;
        mergeMolecules(otherMolecules: Molecule[], doHide?: boolean): Promise<void>;
        setBackgroundColour(backgroundColour: [number, number, number, number]): void;
        addDict(fileContent: string): Promise<void>;
        addDictShim(fileContent: string): void;
        toggleSymmetry(): Promise<void>;
        getDict(newTlc: string): string;
        addLigandOfType(resType: string, fromMolNo?: number): Promise<WorkerResponse>;
        updateAtoms(): Promise<void>;
        rigidBodyFit(cidsString: string, mapNo: number, redraw?: boolean): Promise<void>;
        generateSelfRestraints(cid?: string, maxRadius?: number): Promise<void>;
        clearExtraRestraints(): Promise<WorkerResponse>;
        redo(): Promise<void>;
        undo(): Promise<void>;
        show(style: string, cid?: string): void;
        setSymmetryRadius(radius: number): Promise<void>;
        drawSymmetry: (fetchSymMatrix?: boolean) => Promise<void>;
        getUnitCellParams():  { a: number; b: number; c: number; alpha: number; beta: number; gamma: number; };
        replaceModelWithFile(fileUrl: string, molName: string): Promise<void>
        delete(): Promise<WorkerResponse> 
        fetchDefaultColourRules(): Promise<void>;
        fetchIfDirtyAndDraw(arg0: string): Promise<void>;
        drawEnvironment: (cid: string, labelled?: boolean) => Promise<void>;
        centreOn: (selectionCid?: string, animate?: boolean) => Promise<void>;
        drawHover: (cid: string) => Promise<void>;
        clearBuffersOfStyle: (style: string) => void;
        loadToCootFromURL: (inputFile: string, molName: string) => Promise<Molecule>;
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
        commandCentre: React.RefObject<CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        atomsDirty: boolean;
        isVisible: boolean;
        name: string;
        molNo: number;
        gemmiStructure: gemmi.Structure;
        sequences: Sequence[];
        ligands: LigandInfo[];
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
        representations: MoleculeRepresentation[];
        defaultBondOptions: cootBondOptions;
        displayObjectsTransformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
        uniqueId: string;
        defaultColourRules: ColourRule[];
        restraints: {maxRadius: number, cid: string}[];
        monomerLibraryPath: string;
        hoverRepresentation: MoleculeRepresentation;
        unitCellRepresentation: MoleculeRepresentation;
        environmentRepresentation: MoleculeRepresentation;
        hasDNA: boolean;
        hasGlycans: boolean;
    }

    type RepresentationStyles = 'VdwSpheres' | 'ligands' | 'CAs' | 'CBs' | 'CDs' | 'gaussian' | 'allHBonds' | 'rama' | 
    'rotamer' | 'CRs' | 'MolecularSurface' | 'DishyBases' | 'VdWSurface' | 'Calpha' | 'unitCell' | 'hover' | 'environment' | 
    'ligand_environment' | 'contact_dots' | 'chemical_features' | 'ligand_validation' | 'glycoBlocks' | 'restraints'

    interface MoleculeRepresentation {
        setApplyColourToNonCarbonAtoms(newVal: boolean): void;
        setBondOptions(bondOptions: cootBondOptions): void;
        setStyle(style: string): void;
        setUseDefaultColourRules(arg0: boolean): void;
        setColourRules(ruleList: ColourRule[]): void;
        buildBuffers(arg0: DisplayObject[]): Promise<void>;
        setBuffers(meshObjects: DisplayObject[]): void;
        drawSymmetry(): void
        deleteBuffers(): void;
        draw(): Promise<void>;
        redraw(): Promise<void>;
        setParentMolecule(arg0: Molecule): void;
        show(): void;
        hide(): void;
        setAtomBuffers(arg0: AtomInfo[]): void;
        bondOptions: cootBondOptions;
        useDefaultColourRules: boolean;
        useDefaultBondOptions: boolean;
        applyColourToNonCarbonAtoms: boolean;
        uniqueId: string;
        style: string;
        cid: string;
        visible: boolean;
        buffers: DisplayObject[];
        commandCentre: React.RefObject<CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        parentMolecule: Molecule;
        colourRules: ColourRule[];
        styleHasAtomBuffers: boolean;
        styleHasSymmetry: boolean;
        isCustom: boolean;
        styleHasColourRules: boolean;
    }
    
    type HoveredAtom = {
        molecule: Molecule | null,
        cid: string | null
    }

    interface History {
        reset(): void;
        setSkipTracking(arg0: boolean): void;
        setCurrentHead(uniqueId: string): void;
        setCommandCentre(arg0: CommandCentre): void;
        addEntry: (newEntry: cootCommandKwargs) => Promise<void>;
        getEntriesForMolNo: (molNo: number) => cootCommandKwargs[];
        getModifiedMolNo: () => number[];
        lastModifiedMolNo: () => number;
        rebase: (id: string) => void;
        entries: HistoryEntry[];
        headId: string;
        headIsDetached: boolean;
    }

    interface HistoryEntry extends cootCommandKwargs{
        uniqueId: string;
        associatedBackupKey: string;
        label: string;
    }

    interface CommandCentre {
        urlPrefix: string;
        cootWorker: Worker;
        history: History;
        activeMessages: WorkerMessage[];
        unhook: () => void;
        onCootInitialized: null | ( () => void );
        onConsoleChanged: null | ( (msg: string) => void );
        onNewCommand : null | ( (kwargs: any) => void );
        onActiveMessagesChanged: null | ( (activeMessages: WorkerMessage[]) => void );
        cootCommandList(commandList: cootCommandKwargs[]): Promise<WorkerResponse>;
        cootCommand: (kwargs: cootCommandKwargs, doJournal?: boolean) => Promise<WorkerResponse>;
        postMessage: (kwargs: cootCommandKwargs) => Promise<WorkerResponse>;
    }
    
    interface cootCommandKwargs { 
        message?: string;
        data?: {};
        returnType?: string;
        command?: string;
        commandArgs?: any[];
        changesMolecules?: number[];
        [key: string]: any;
    }
    
    type WorkerMessage = { 
        consoleMessage?: string;
        messageId: string;
        handler: (reply: WorkerResponse) => void;
        kwargs: cootCommandKwargs;
    }
    
    type WorkerResult<T = any> = {
        result: {
            status: string;
            result: T;
            [key: string]: any;
        }
        command: string;
        messageId: string;
        myTimeStamp: string;
        message: string;
        consoleMessage: string;
    }
    
    type WorkerResponse<T = any> = { 
        data: WorkerResult<T>;
    }
        
    type createCovLinkAtomInput = {
        selectedMolNo: number;
        selectedAtom: string;
        deleteAtom: boolean;
        deleteSelectedAtom: string;
        changeAtomCharge: boolean;
        changeSelectedAtomCharge: string;
        newAtomCharge: string;
        changeBondOrder: boolean;
        changeSelectedBondOrder: string;
        newBondOrder: string;
    }

    interface AceDRGInstance {
        createCovalentLink: (arg0: createCovLinkAtomInput, arg1: createCovLinkAtomInput) => void;
    }

    type selectedMtzColumns = {
        F?: string;
        PHI?: string;
        Fobs?: string;
        SigFobs?: string;
        FreeR?: string;
        isDifference?: boolean;
        useWeight?: boolean;
        calcStructFact?: any; 
    }

    interface ScreenRecorder {
        rec: MediaRecorder;
        chunks: Blob[];
        glRef: React.RefObject<webGL.MGWebGL>;
        canvasRef: React.RefObject<HTMLCanvasElement>;
        _isRecording: boolean;
        stopRecording: () => void;
        startRecording: () => void;
        isRecording: () => boolean;
        downloadVideo: (blob: Blob) => Promise<void>;
        takeScreenShot: (fileName: string) => void;
    }

    interface Map {
        getHistogram(nBins?: number, zoomFactor?: number): Promise<libcootApi.HistogramInfoJS>;
        setMapWeight(weight?: number): Promise<WorkerResponse>;
        estimateMapWeight(): Promise<void>;
        setAlpha(alpha: number, redraw?: boolean): Promise<void>;
        centreOnMap(): Promise<void>;
        getSuggestedSettings(): Promise<void>;
        duplicate(): Promise<Map>;
        makeCootUnlive(): void;
        makeCootLive(): void;
        setColour(r: number, g: number, b: number, redraw?: boolean): Promise<void> ;
        setDiffMapColour(type: 'positiveDiffColour' | 'negativeDiffColour', r: number, g: number, b: number, redraw?: boolean): Promise<void> ;
        fetchMapRmsd(): Promise<number>;
        fetchSuggestedLevel(): Promise<number>;
        fetchMapCentre(): Promise<[number, number, number]>;
        replaceMapWithMtzFile(fileUrl: RequestInfo | URL, name: string, selectedColumns: selectedMtzColumns, mapColour?: { [type: string]: {r: number, g: number, b: number} }): Promise<void>;
        associateToReflectionData (selectedColumns: selectedMtzColumns, reflectionData: Uint8Array | ArrayBuffer): Promise<void>;
        delete(): Promise<void> 
        doCootContour(x: number, y: number, z: number, radius: number, contourLevel: number): Promise<void>;
        fetchReflectionData(): Promise<WorkerResponse<Uint8Array>>;
        getMap(): Promise<WorkerResponse>;
        loadToCootFromMtzURL(url: RequestInfo | URL, name: string, selectedColumns: selectedMtzColumns): Promise<Map>;
        loadToCootFromMapURL(url: RequestInfo | URL, name: string, isDiffMap?: boolean): Promise<Map>;
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
        commandCentre: React.RefObject<CommandCentre>;
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
        selectedColumns: selectedMtzColumns;
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
    
    interface backupKey {
        name?: string;
        label?: string;
        dateTime: string;
        type: string;
        molNames: string[];
        mapNames?: string[];
        mtzNames?: string[];
    }
    
    type moleculeSessionData = {
        name: string;
        molNo: number;
        pdbData: string;
        representations: { cid: string, style: string, isCustom: boolean, colourRules: ColourRule[], bondOptions: cootBondOptions }[];
        defaultBondOptions: cootBondOptions;
        defaultColourRules: ColourRule[];
        connectedToMaps: number[];
        ligandDicts: {[comp_id: string]: string};
    }
    
    type mapDataSession = {
        name: string;
        molNo: number;
        uniqueId: string;
        mapData: Uint8Array;
        reflectionData: Uint8Array;
        cootContour: boolean;
        contourLevel: number;
        radius: number;
        colour: [number, number, number, number];
        litLines: boolean;
        isDifference: boolean;
        selectedColumns: selectedMtzColumns;
        hasReflectionData: boolean;
        associatedReflectionFileName: string;
    }

    type viewDataSession = {
        origin: [number, number, number];
        backgroundColor: [number, number, number, number];
        ambientLight: [number, number, number, number];
        diffuseLight: [number, number, number, number];
        lightPosition: [number, number, number, number];
        specularLight: [number, number, number, number];
        fogStart: number;
        fogEnd: number;
        zoom: number;
        doDrawClickedAtomLines: boolean;
        clipStart: number;
        clipEnd: number;
        quat4: any[];
    }
    
    type backupSession = {
        version: string;
        includesAdditionalMapData: boolean;
        moleculeData: moleculeSessionData[];
        mapData: mapDataSession[];
        viewData: viewDataSession;
        activeMapIndex: number;
    }
    
    interface TimeCapsule {
        setBusy: (arg0: boolean) => void;
        onIsBusyChange: (arg0: boolean) => void;
        getSortedKeys(): Promise<backupKey[]>;
        cleanupUnusedDataFiles(): Promise<void>;
        removeBackup(key: string): Promise<void>;
        updateDataFiles(): Promise<(string | void)[]>;
        createBackup(keyString: string, sessionString: string): Promise<string>;
        fetchSession(arg0: boolean): Promise<backupSession>;
        moleculesRef: React.RefObject<Molecule[]>;
        mapsRef: React.RefObject<Map[]>;
        glRef: React.RefObject<webGL.MGWebGL>;
        activeMapRef: React.RefObject<Map>;
        busy: boolean;
        modificationCount: number;
        modificationCountBackupThreshold: number;
        maxBackupCount: number;
        version: string;
        disableBackups: boolean;
        storageInstance: LocalStorageInstance;
        addModification: () =>  Promise<string>;
        init: () => Promise<void>;
        retrieveBackup: (arg0: string) => Promise<string | ArrayBuffer>;
    }

    type AtomRightClickEventInfo = {
        atom: {label: string};
        buffer: {id: string};
        coords: string,
        pageX: number;
        pageY: number;
    }

    type AtomRightClickEvent = CustomEvent<AtomRightClickEventInfo>
    
    type AtomDraggedEvent = CustomEvent<{ atom: {
        atom: {
            label: string;
        };
        buffer: any;
    } }>

    type OriginUpdateEvent = CustomEvent<{ origin: [number, number, number]; }>

    type WheelContourLevelEvent = CustomEvent<{ factor: number; }>

    type MapRadiusChangeEvent = CustomEvent<{ factor: number; }>

    type ScoresUpdateEvent = CustomEvent<{
        origin: [number, number, number];
        modifiedMolecule: number;
    }>
    
    type ConnectMapsInfo = {
        molecule: number;
        maps: [number, number, number];
        uniqueMaps: number[];
    }

    type AtomClickedEvent = CustomEvent<{
        buffer: { id: string };
        atom: { label: string };
    }>

    type ConnectMapsEvent = CustomEvent<ConnectMapsInfo>

    type NewMapContourEvent = CustomEvent<{
        molNo: number;
        mapRadius: number;
        cootContour: boolean;
        contourLevel: number;
        mapColour: [number, number, number, number],
        litLines: boolean;
    }>
    
    interface LocalStorageInstance {
        clear: () => Promise<void>;
        keys: () => Promise<string[]>;
        setItem: (key: string, value: string) => Promise<string>;
        removeItem: (key: string) => Promise<void>;
        getItem: (key: string) => Promise<string>;
    }

    type Shortcut = {
        modifiers: string[];
        keyPress: string;
        label: string;
        viewOnly: boolean;
    }

    interface ContextSetters {
        setDefaultMapSamplingRate: React.Dispatch<React.SetStateAction<number>>;
        setDoShadowDepthDebug: React.Dispatch<React.SetStateAction<boolean>>;
        setDefaultBackgroundColor: React.Dispatch<React.SetStateAction<[number, number, number, number]>>;
        setDoShadow: React.Dispatch<React.SetStateAction<boolean>>;
        setDoSSAO: React.Dispatch<React.SetStateAction<boolean>>;
        setDoOutline: React.Dispatch<React.SetStateAction<boolean>>;
        setDoSpinTest: React.Dispatch<React.SetStateAction<boolean>>;
        setClipCap: React.Dispatch<React.SetStateAction<boolean>>;
        setResetClippingFogging: React.Dispatch<React.SetStateAction<boolean>>;
        setUseOffScreenBuffers: React.Dispatch<React.SetStateAction<boolean>>;
        setDepthBlurRadius: React.Dispatch<React.SetStateAction<number>>;
        setDepthBlurDepth: React.Dispatch<React.SetStateAction<number>>;
        setSsaoRadius: React.Dispatch<React.SetStateAction<number>>;
        setSsaoBias: React.Dispatch<React.SetStateAction<number>>;
        setDoPerspectiveProjection: React.Dispatch<React.SetStateAction<boolean>>;
        setDrawInteractions: React.Dispatch<React.SetStateAction<boolean>>;
        setDrawMissingLoops: React.Dispatch<React.SetStateAction<boolean>>;
        setDrawAxes: React.Dispatch<React.SetStateAction<boolean>>;
        setDrawCrosshairs: React.Dispatch<React.SetStateAction<boolean>>;
        setDrawFPS: React.Dispatch<React.SetStateAction<boolean>>;
        setDefaultExpandDisplayCards: React.Dispatch<React.SetStateAction<boolean>>;
        setEnableRefineAfterMod: React.Dispatch<React.SetStateAction<boolean>>;
        setDefaultMapLitLines: React.Dispatch<React.SetStateAction<boolean>>;
        setMapLineWidth: React.Dispatch<React.SetStateAction<number>>;
        setAtomLabelDepthMode: React.Dispatch<React.SetStateAction<boolean>>;
        setMouseSensitivity: React.Dispatch<React.SetStateAction<number>>;
        setShowShortcutToast: React.Dispatch<React.SetStateAction<boolean>>;
        setMakeBackups: React.Dispatch<React.SetStateAction<boolean>>;
        setContourWheelSensitivityFactor: React.Dispatch<React.SetStateAction<number>>;
        setDevMode: React.Dispatch<React.SetStateAction<boolean>>;
        setEnableTimeCapsule: React.Dispatch<React.SetStateAction<boolean>>;
        setShowScoresToast: React.Dispatch<React.SetStateAction<boolean>>;
        setDefaultMapSurface: React.Dispatch<React.SetStateAction<boolean>>;
        setDefaultBondSmoothness: React.Dispatch<React.SetStateAction<number>>;
        setGLLabelsFontFamily: React.Dispatch<React.SetStateAction<string>>;
        setGLLabelsFontSize: React.Dispatch<React.SetStateAction<number>>;
        setMaxBackupCount: React.Dispatch<React.SetStateAction<number>>;
        setModificationCountBackupThreshold: React.Dispatch<React.SetStateAction<number>>;
        setShortcutOnHoveredAtom: React.Dispatch<React.SetStateAction<boolean>>;
        setZoomWheelSensitivityFactor: React.Dispatch<React.SetStateAction<number>>;
        setShortCuts: React.Dispatch<React.SetStateAction<string>>;
        setDefaultUpdatingScores: React.Dispatch<{
            action: 'Add' | 'Remove' | 'Overwrite';
            item?: string;
            items?: string[];
        }>;
        setTransparentModalsOnMouseOut: React.Dispatch<React.SetStateAction<boolean>>;
    }
    
    interface PreferencesValues {
        version?: string;
        isMounted?: boolean;
        defaultMapSamplingRate: number;
        transparentModalsOnMouseOut: boolean;
        defaultBackgroundColor: [number, number, number, number];
        atomLabelDepthMode: boolean; 
        enableTimeCapsule: boolean;
        defaultExpandDisplayCards: boolean;
        defaultMapLitLines: boolean;
        enableRefineAfterMod: boolean; 
        drawCrosshairs: boolean; 
        drawAxes: boolean; 
        drawFPS: boolean; 
        drawMissingLoops: boolean; 
        drawInteractions: boolean; 
        doPerspectiveProjection: boolean; 
        useOffScreenBuffers: boolean; 
        depthBlurRadius: number; 
        depthBlurDepth: number; 
        ssaoBias: number; 
        ssaoRadius: number; 
        doShadowDepthDebug: boolean; 
        doShadow: boolean; 
        doSSAO: boolean; 
        doOutline: boolean; 
        GLLabelsFontFamily: string;
        GLLabelsFontSize: number;
        doSpinTest: boolean;
        mouseSensitivity: number;
        zoomWheelSensitivityFactor: number;
        contourWheelSensitivityFactor: number;
        mapLineWidth: number;
        makeBackups: boolean; 
        showShortcutToast: boolean; 
        defaultMapSurface: boolean; 
        defaultBondSmoothness: number,
        showScoresToast: boolean; 
        shortcutOnHoveredAtom: boolean; 
        resetClippingFogging: boolean; 
        clipCap: boolean; 
        defaultUpdatingScores: string[],
        maxBackupCount: number;
        modificationCountBackupThreshold: number;
        devMode: boolean; 
        shortCuts: string | {
            [label: string]: Shortcut;
        };
    }
    
    interface Context extends ContextSetters, PreferencesValues { }
    
    type ContextButtonProps = {
        mode: 'context';
        monomerLibraryPath: string;
        urlPrefix: string;
        commandCentre: React.RefObject<CommandCentre>
        selectedMolecule: Molecule;
        chosenAtom: ResidueSpec;
        glRef: React.RefObject<webGL.MGWebGL>;
        setOverlayContents: React.Dispatch<React.SetStateAction<JSX.Element>>;
        setShowOverlay: React.Dispatch<React.SetStateAction<boolean>>;
        timeCapsuleRef: React.RefObject<TimeCapsule>;
        setToolTip: React.Dispatch<React.SetStateAction<string>>;
        setShowContextMenu: React.Dispatch<React.SetStateAction<false | AtomRightClickEventInfo>>;
        setOpacity: React.Dispatch<React.SetStateAction<number>>;
        setOverrideMenuContents: React.Dispatch<React.SetStateAction<JSX.Element | boolean>>;
        showContextMenu: false | AtomRightClickEventInfo;
        defaultActionButtonSettings: actionButtonSettings;
        setDefaultActionButtonSettings: (arg0: {key: string; value: string}) => void;     
    }
    
    type MolChange<T extends Molecule | Map> = {
        action: 'Add' | 'Remove' | 'AddList' | 'Empty';
        item?: T;
        items?: T[];
    }    

    type EditButtonProps = {
        mode?: 'edit';
        monomerLibraryPath: string;
        backgroundColor: [number, number, number, number];
        defaultBondSmoothness: number;
        urlPrefix: string;
        shortCuts: string | { [label: string]: Shortcut; };
        selectedButtonIndex: string;
        setSelectedButtonIndex: React.Dispatch<React.SetStateAction<string>>;
        setToolTip: React.Dispatch<React.SetStateAction<string>>;
        setOverlayContents: React.Dispatch<React.SetStateAction<JSX.Element>>;
        buttonIndex: string;
        enableRefineAfterMod: boolean;
        refineAfterMod?: boolean;
        glRef: React.RefObject<webGL.MGWebGL>;
        commandCentre: React.RefObject<CommandCentre>;
        activeMap: Map;
        molecules: Molecule[];
        timeCapsuleRef: React.RefObject<TimeCapsule>;
        windowHeight: number;
        changeMolecules: (arg0: MolChange<Molecule>) => void
    }

    interface ContainerRefs {
        glRef: React.MutableRefObject<null | webGL.MGWebGL>;
        timeCapsuleRef: React.MutableRefObject<null | TimeCapsule>;
        commandCentre: React.MutableRefObject<CommandCentre>;
        videoRecorderRef: React.MutableRefObject<null | ScreenRecorder>;
        moleculesRef: React.MutableRefObject<null | Molecule[]>;
        mapsRef: React.MutableRefObject<null | Map[]>;
        activeMapRef: React.MutableRefObject<Map>;
        lastHoveredAtomRef: React.MutableRefObject<null | HoveredAtom>;
    }
      
    interface ContainerOptionalProps {
        onUserPreferencesChange: (key: string, value: any) => void;
        disableFileUploads: boolean;
        urlPrefix: string;
        extraNavBarMenus: {name: string; ref: React.RefObject<any> ; icon: JSX.Element; JSXElement: JSX.Element}[];
        viewOnly: boolean;
        extraDraggableModals: JSX.Element[];
        monomerLibraryPath: string;
        setMoorhenDimensions?: null | ( () => [number, number] );
        extraFileMenuItems: JSX.Element[];
        allowScripting: boolean;
        backupStorageInstance?: any;
        extraEditMenuItems: JSX.Element[];
        extraCalculateMenuItems: JSX.Element[];
        aceDRGInstance: AceDRGInstance | null; 
    }
    
    interface ContainerProps extends Partial<ContainerRefs>, Partial<ContainerOptionalProps> { }
    
    interface CollectedProps extends ContainerRefs, ContainerOptionalProps { }

    interface State {
        molecules: Molecule[];
        maps: Map[];
        canvasStates: {
            backgroundColor: [number, number, number, number];
            height: number;
            width: number;
            isDark: boolean
        };
        mapSettings: {
            defaultMapSamplingRate: number;
            defaultMapLitLines: boolean;
            mapLineWidth: number;
            defaultMapSurface: boolean;
        };
        mouseSettings: {
            contourWheelSensitivityFactor: number;
            zoomWheelSensitivityFactor: number;
            mouseSensitivity: number;
        };
        backupSettings: {
            enableTimeCapsule: boolean;
            makeBackups: boolean;
            maxBackupCount: number;
            modificationCountBackupThreshold: number;     
        };
        updatingMapScoresSettings: {
            defaultUpdatingScores: string[];
            showScoresToast: boolean;
        };
        shortcutSettings: {
            shortcutOnHoveredAtom: boolean;
            showShortcutToast: boolean;
            shortCuts: string;        
        };
        labelSettings: {
            atomLabelDepthMode: boolean;
            GLLabelsFontFamily: string;
            GLLabelsFontSize: number;
            availableFonts: string[];
        };
        sceneSettings: {
            defaultBackgroundColor: [number, number, number, number];
            drawCrosshairs: boolean; 
            drawAxes: boolean; 
            drawFPS: boolean; 
            drawMissingLoops: boolean; 
            drawInteractions: boolean; 
            doPerspectiveProjection: boolean; 
            useOffScreenBuffers: boolean; 
            depthBlurRadius: number; 
            depthBlurDepth: number; 
            ssaoBias: number; 
            ssaoRadius: number; 
            doShadowDepthDebug: boolean; 
            doShadow: boolean; 
            doSSAO: boolean; 
            doOutline: boolean; 
            doSpinTest: boolean;
            defaultBondSmoothness: number,
            resetClippingFogging: boolean; 
            clipCap: boolean; 
        };
        miscAppSettings: {
            defaultExpandDisplayCards: boolean; 
            transparentModalsOnMouseOut: boolean; 
            enableRefineAfterMod: boolean; 
        };
        generalStates: {
            devMode: boolean; 
            userPreferencesMounted: boolean;
            appTitle: string;
            cootInitialized: boolean;
            notificationContent: JSX.Element;
            activeMap: Map;
            theme: string;
        };
        hoveringStates: {
            enableAtomHovering: boolean;
            hoveredAtom: HoveredAtom;
            cursorStyle: string;
        };
    }
    
    type actionButtonSettings = {
        mutate: 'ALA' | 'CYS' | 'ASP' | 'GLU' | 'PHE' | 'GLY' | 'HIS' | 'ILE' | 'LYS' | 'LEU' | 'MET' | 'ASN' | 'PRO' | 'GLN' | 'ARG' | 'SER' | 'THR' | 'VAL' | 'TRP' | 'TYR';
        refine: 'SINGLE' | 'TRIPLE' | 'QUINTUPLE' | 'HEPTUPLE' | 'SPHERE' | 'BIG_SPHERE' | 'CHAIN' | 'ALL';
        delete: 'ATOM' | 'RESIDUE' | 'RESIDUE HYDROGENS' | 'RESIDUE SIDE-CHAIN' | 'CHAIN' | 'CHAIN HYDROGENS' | 'MOLECULE HYDROGENS';
        rotateTranslate: 'ATOM' | 'RESIDUE' | 'CHAIN' | 'MOLECULE';
        drag: 'SINGLE' | 'TRIPLE' | 'QUINTUPLE' | 'HEPTUPLE' | 'SPHERE';
        rigidBodyFit: 'SINGLE' | 'TRIPLE' | 'QUINTUPLE' | 'HEPTUPLE' | 'CHAIN' | 'ALL';
    }
    
}
