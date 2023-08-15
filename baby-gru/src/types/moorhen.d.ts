import React from "react"
import { emscriptem } from "./emscriptem";
import { gemmi } from "./gemmi";
import { webGL } from "./mgWebGL";

export namespace moorhen {

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
        isDarkBackground: boolean;
        smoothness: number;
        width: number;
        atomRadiusBondRatio: number;
    }
    
    type ColourRule = {
        commandInput: {
            message: string;
            command: string;
            returnType: string;
            commandArgs: [number, string, string?];
        };
        color?: string;
        isMultiColourRule: boolean;
        ruleType: string;
        label: string;
    }
    
    interface Molecule {
        isLigand(): boolean;
        removeRepresentation(representationId: string): void;
        addRepresentation(style: string, cid: string, isCustom?: boolean, colour?: moorhen.ColourRule[]): Promise<void>;
        getNeighborResiduesCids(selectionCid: string, radius: number, minDist: number, maxDist: number): Promise<string[]>;
        drawWithStyleFromMesh(style: string, meshObjects: any[], cid?: string): Promise<void>;
        updateWithMovedAtoms(movedResidues: AtomInfo[][]): Promise<void>;
        transformedCachedAtomsAsMovedAtoms(selectionCid?: string): AtomInfo[][];
        copyFragmentUsingCid(cid: string, backgroundColor: [number, number, number, number], defaultBondSmoothness: number, doRecentre?: boolean, style?: string): Promise<Molecule>;
        hideCid(cid: string): Promise<void>;
        unhideAll(): Promise<void>;
        drawUnitCell(): void;
        gemmiAtomsForCid: (cid: string) => Promise<AtomInfo[]>;
        mergeMolecules(otherMolecules: Molecule[], doHide?: boolean): Promise<void>;
        setBackgroundColour(backgroundColour: [number, number, number, number]): void;
        addDict(fileContent: string): Promise<void>;
        addDictShim(fileContent: string): void;
        toggleSymmetry(): Promise<void>;
        getDict(newTlc: string): string;
        addLigandOfType(resType: string, fromMolNo?: number): Promise<WorkerResponse>;
        updateAtoms(): Promise<void>;
        rigidBodyFit(cidsString: string, mapNo: number): Promise<WorkerResponse>;
        generateSelfRestraints(maxRadius: number): Promise<WorkerResponse>;
        clearExtraRestraints(): Promise<WorkerResponse>;
        refineResiduesUsingAtomCid(cid: string, mode: string, ncyc: number): Promise<WorkerResponse>;
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
        loadToCootFromURL: (inputFile: string, molName: string) => Promise<_moorhen.Molecule>;
        applyTransform: () => Promise<void>;
        getAtoms(format?: string): Promise<WorkerResponse>;
        hide: (style: string, cid?: string) => void;
        redraw: () => Promise<void>;
        setAtomsDirty: (newVal: boolean) => void;
        hasVisibleBuffers: (excludeBuffers?: string[]) => boolean;
        centreAndAlignViewOn(selectionCid: string, animate?: boolean): Promise<void>;
        buffersInclude: (bufferIn: { id: string; }) => boolean;
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
        ligandDicts: {[comp_id: string]: string};
        connectedToMaps: number[];
        excludedSegments: string[];
        symmetryOn: boolean;
        symmetryRadius : number;
        symmetryMatrices: number[][][];
        gaussianSurfaceSettings: {
            sigma: number;
            countourLevel: number;
            boxRadius: number;
            gridScale: number;
        };
        representations: MoleculeRepresentation[];
        cootBondsOptions: cootBondOptions;
        displayObjectsTransformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
        uniqueId: string;
        defaultColourRules: ColourRule[];
        monomerLibraryPath: string;
        hoverRepresentation: moorhen.MoleculeRepresentation;
        unitCellRepresentation: moorhen.MoleculeRepresentation;
        environmentRepresentation: moorhen.MoleculeRepresentation;
    }

    type RepresentationStyles = 'VdwSpheres' | 'ligands' | 'CAs' | 'CBs' | 'CDs' | 'gaussian' | 'allHBonds' | 'rama' | 
    'rotamer' | 'CRs' | 'MolecularSurface' | 'DishyBases' | 'VdWSurface' | 'Calpha' | 'unitCell' | 'hover' | 'environment' | 
    'ligand_environment' | 'contact_dots' | 'chemical_features' | 'ligand_validation' | 'glycoBlocks'

    interface MoleculeRepresentation {
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
        useDefaultColourRules: boolean;
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

    interface CommandCentre {
        urlPrefix: string;
        cootWorker: Worker;
        consoleMessage: string;
        activeMessages: WorkerMessage[];
        unhook: () => void;
        onCootInitialized: null | ( () => void );
        onConsoleChanged: null | ( (msg: string) => void );
        onNewCommand : null | ( (kwargs: any) => void );
        onActiveMessagesChanged: null | ( (activeMessages: WorkerMessage[]) => void );
        cootCommandList(commandList: cootCommandKwargs[]): Promise<WorkerResponse>;
        cootCommand: (kwargs: cootCommandKwargs, doJournal?: boolean) => Promise<WorkerResponse>;
        postMessage: (kwargs: cootCommandKwargs) => Promise<WorkerResponse>;
        extendConsoleMessage: (msg: string) => void;
    }
    
    type cootCommandKwargs = { 
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

    interface Map {
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
        associateToReflectionData (selectedColumns: selectedMtzColumns, reflectionData: Uint8Array | ArrayBuffer): Promise<WorkerResponse>;
        delete(): Promise<void> 
        doCootContour(x: number, y: number, z: number, radius: number, contourLevel: number): Promise<void>;
        fetchReflectionData(): Promise<WorkerResponse<Uint8Array>>;
        getMap(): Promise<WorkerResponse>;
        loadToCootFromMtzURL(url: RequestInfo | URL, name: string, selectedColumns: selectedMtzColumns): Promise<Map>;
        suggestedContourLevel: number;
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
        mapRmsd: number;
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
        representations: {cid: string, style: string}[];
        cootBondsOptions: cootBondOptions;
        connectedToMaps: number[];
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
        context: Context;
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
        setDoShadowDepthDebug: React.Dispatch<React.SetStateAction<boolean>>;
        setDefaultBackgroundColor: React.Dispatch<React.SetStateAction<[number, number, number, number]>>;
        setDoShadow: React.Dispatch<React.SetStateAction<boolean>>;
        setDoOutline: React.Dispatch<React.SetStateAction<boolean>>;
        setDoSpinTest: React.Dispatch<React.SetStateAction<boolean>>;
        setClipCap: React.Dispatch<React.SetStateAction<boolean>>;
        setResetClippingFogging: React.Dispatch<React.SetStateAction<boolean>>;
        setUseOffScreenBuffers: React.Dispatch<React.SetStateAction<boolean>>;
        setDepthBlurRadius: React.Dispatch<React.SetStateAction<number>>;
        setDepthBlurDepth: React.Dispatch<React.SetStateAction<number>>;
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
    
    interface ContextValues {
        version?: string;
        transparentModalsOnMouseOut: boolean;
        isMounted?: boolean;
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
        doShadowDepthDebug: boolean; 
        doShadow: boolean; 
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
    
    interface Context extends ContextSetters, ContextValues { }
    
    type ContextButtonProps = {
        mode: 'context';
        monomerLibraryPath: string;
        shortCuts: string | { [label: string]: Shortcut; };
        urlPrefix: string;
        commandCentre: React.RefObject<CommandCentre>
        selectedMolecule: Molecule;
        chosenAtom: ResidueSpec;
        activeMap: Map;
        enableRefineAfterMod: boolean;
        molecules: Molecule[];
        glRef: React.RefObject<webGL.MGWebGL>;
        setOverlayContents: React.Dispatch<React.SetStateAction<JSX.Element>>;
        setShowOverlay: React.Dispatch<React.SetStateAction<boolean>>;
        timeCapsuleRef: React.RefObject<TimeCapsule>;
        setToolTip: React.Dispatch<React.SetStateAction<string>>;
        setShowContextMenu: React.Dispatch<React.SetStateAction<false | AtomRightClickEventInfo>>;
        setOpacity: React.Dispatch<React.SetStateAction<number>>;
        setOverrideMenuContents: React.Dispatch<React.SetStateAction<JSX.Element | boolean>>;
        showContextMenu: false | AtomRightClickEventInfo;
        backgroundColor: [number, number, number, number];
        defaultBondSmoothness: number;
        isDark: boolean;
        changeMolecules: (arg0: MolChange<Molecule>) => void
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
    
    interface ContainerOptionalProps {
        disableFileUploads: boolean;
        urlPrefix: string;
        extraNavBarMenus: {name: string; ref: React.RefObject<any> ; icon: JSX.Element; JSXElement: JSX.Element}[];
        viewOnly: boolean;
        extraDraggableModals: JSX.Element[];
        monomerLibraryPath: string;
        setMoorhenDimensions?: null | ( () => [number, number] );
        forwardControls?: (arg0: Controls) => any;
        extraFileMenuItems: JSX.Element[];
        allowScripting: boolean;
        backupStorageInstance?: any;
        extraEditMenuItems: JSX.Element[];
        extraCalculateMenuItems: JSX.Element[];
        aceDRGInstance: AceDRGInstance | null; 
    }
    
    interface Controls extends Context, ContainerOptionalProps {
        isDark: boolean;
        molecules: Molecule[];
        changeMolecules: (arg0: MolChange<Molecule>) => void;
        maps: Map[];
        changeMaps: (arg0: MolChange<Map>) => void;
        appTitle: string;
        setAppTitle: React.Dispatch<React.SetStateAction<string>>;
        glRef: React.MutableRefObject<null | webGL.MGWebGL>;
        timeCapsuleRef: React.MutableRefObject<null | TimeCapsule>;
        commandCentre: React.MutableRefObject<CommandCentre>;
        moleculesRef: React.MutableRefObject<null | Molecule[]>;
        mapsRef: React.MutableRefObject<null | Map[]>;
        activeMap: Map;
        setActiveMap: React.Dispatch<React.SetStateAction<Map>>;
        activeMolecule: Molecule;
        setActiveMolecule: React.Dispatch<React.SetStateAction<Molecule>>;
        hoveredAtom: null | HoveredAtom;
        setHoveredAtom: React.Dispatch<React.SetStateAction<HoveredAtom>>;
        commandHistory: any;
        backgroundColor: [number, number, number, number];
        setBackgroundColor: React.Dispatch<React.SetStateAction<[number, number, number, number]>>;
        toastContent: null | JSX.Element;
        setToastContent: React.Dispatch<React.SetStateAction<JSX.Element>>;
        showToast: boolean;
        setShowToast: React.Dispatch<React.SetStateAction<boolean>>;
        windowWidth: number;
        windowHeight: number;
        availableFonts: string[];
    }
    
    interface ContainerStates {
        glRef: React.MutableRefObject<null | webGL.MGWebGL>;
        timeCapsuleRef: React.MutableRefObject<null | TimeCapsule>;
        commandCentre: React.MutableRefObject<CommandCentre>;
        moleculesRef: React.MutableRefObject<null | Molecule[]>;
        mapsRef: React.MutableRefObject<null | Map[]>;
        activeMapRef: React.MutableRefObject<Map>;
        consoleDivRef: React.MutableRefObject<null | HTMLDivElement>;
        lastHoveredAtom: React.MutableRefObject<null | HoveredAtom>;
        prevActiveMoleculeRef: React.MutableRefObject<null | Molecule>;
        context: Context;
        activeMap: Map;
        setActiveMap: React.Dispatch<React.SetStateAction<Map>>;
        activeMolecule: Molecule;
        setActiveMolecule: React.Dispatch<React.SetStateAction<Molecule>>;
        hoveredAtom: null | HoveredAtom;
        setHoveredAtom: React.Dispatch<React.SetStateAction<HoveredAtom>>;
        consoleMessage: string;
        setConsoleMessage: React.Dispatch<React.SetStateAction<string>>;
        cursorStyle: string;
        setCursorStyle: React.Dispatch<React.SetStateAction<string>>;
        busy: boolean;
        setBusy: React.Dispatch<React.SetStateAction<boolean>>;
        windowWidth: number;
        setWindowWidth: React.Dispatch<React.SetStateAction<number>>;
        windowHeight: number;
        setWindowHeight: React.Dispatch<React.SetStateAction<number>>;
        commandHistory: any;
        dispatchHistoryReducer: (arg0: any) => void;
        molecules: Molecule[];
        changeMolecules: (arg0: MolChange<Molecule>) => void;
        maps: Map[];
        changeMaps: (arg0: MolChange<Map>) => void;
        backgroundColor: [number, number, number, number];
        setBackgroundColor: React.Dispatch<React.SetStateAction<[number, number, number, number]>>;
        appTitle: string;
        setAppTitle: React.Dispatch<React.SetStateAction<string>>;
        cootInitialized: boolean;
        setCootInitialized: React.Dispatch<React.SetStateAction<boolean>>;
        theme: string,
        setTheme: React.Dispatch<React.SetStateAction<string>>;
        showToast: boolean;
        setShowToast: React.Dispatch<React.SetStateAction<boolean>>;
        toastContent: null | JSX.Element;
        setToastContent: React.Dispatch<React.SetStateAction<JSX.Element>>;
        availableFonts: string[];
        setAvailableFonts: React.Dispatch<React.SetStateAction<string[]>>
    }
    
    interface ContainerProps extends Partial<ContainerStates>, Partial<ContainerOptionalProps> { }
    
}
