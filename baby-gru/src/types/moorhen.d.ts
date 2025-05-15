import React from "react"
import { emscriptem } from "./emscriptem";
import { gemmi } from "./gemmi";
import { libcootApi } from "./libcoot";
import { webGL } from "./mgWebGL";
import { MoorhenMolecule } from "../moorhen";
import { ToolkitStore } from "@reduxjs/toolkit/dist/configureStore";
import { AnyAction, Dispatch } from "@reduxjs/toolkit";

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
        svg?: string;
        flev_svg?: string;
        smiles?: string;
        chem_comp_info?: {first: string; second: string}[];
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
        x: number;
        y: number;
        z: number;
        charge: number;
        element: string;
        tempFactor: number;
        serial: number;
        occupancy: number;
        name: string;
        has_altloc: boolean;
        alt_loc: string;
        mol_name: string;
        chain_id: string;
        res_no: string;
        res_name: string;
    }

    type DisplayObject = {
        symmetryMatrices: any;
        updateSymmetryAtoms(): void;
        changeColourWithSymmetry: boolean;
        atoms: any[];
        origin: number[];
        [attr: string]: any;
    }

    type cootBondOptions = {
        smoothness: number;
        width: number;
        atomRadiusBondRatio: number;
        showAniso: boolean;
        showOrtep: boolean;
        showHs: boolean;
    }

    type gaussianSurfSettings = {
        sigma: number;
        countourLevel: number;
        boxRadius: number;
        gridScale: number;
        bFactor: number;
    }

    type m2tParameters = {
        ribbonStyleCoilThickness: number;
        ribbonStyleHelixWidth: number;
        ribbonStyleStrandWidth: number;
        ribbonStyleArrowWidth: number;
        ribbonStyleDNARNAWidth: number;
        ribbonStyleAxialSampling: number;
        cylindersStyleAngularSampling: number;
        cylindersStyleCylinderRadius: number;
        cylindersStyleBallRadius: number;
        surfaceStyleProbeRadius: number;
        ballsStyleRadiusMultiplier: number;
        nucleotideRibbonStyle: "StickBases" | "DishyBases";
        dishStyleAngularSampling: number;
        ssUsageScheme: number;
    }

    type residueEnvironmentOptions = {
        maxDist: number;
        backgroundRepresentation: RepresentationStyles;
        focusRepresentation: RepresentationStyles;
        labelled: boolean;
        showHBonds: boolean;
        showContacts: boolean;
    }

    type ColourRuleObject = {
        cid: string;
        color: string;
        applyColourToNonCarbonAtoms: boolean;
        isMultiColourRule: boolean;
        ruleType: string;
        args: (string | number)[];
        label: string;
        uniqueId: string;
        parentMoleculeMolNo: number;
        parentRepresentationUniqueId: string;
    };

    type ColourRule = {
        ruleType: string;
        cid: string;
        color: string;
        args: (string | number)[];
        label: string;
        isMultiColourRule: boolean;
        commandCentre: React.RefObject<CommandCentre>;
        parentMolecule: Molecule;
        parentRepresentation: MoleculeRepresentation;
        applyColourToNonCarbonAtoms: boolean;
        uniqueId: string;
        static initFromDataObject(data: ColourRuleObject, commandCentre: React.RefObject<CommandCentre>, molecule: Molecule): ColourRule;
        static initFromString(stringData: string, commandCentre: React.RefObject<CommandCentre>, molecule: Molecule): ColourRule;
        static parseHexToRgba(hex: string): [number, number, number, number];
        objectify(): ColourRuleObject;
        stringify(): string;
        setLabel(label: string): void;
        setArgs(args: (string | number)[]): void;
        setParentMolecule(molecule: Molecule): void;
        setParentRepresentation(representation: MoleculeRepresentation): void;
        setApplyColourToNonCarbonAtoms(newVal: boolean): void;
        getUserDefinedColours(): { cid: string; rgba: [number, number, number, number]; applyColourToNonCarbonAtoms: boolean }[];
        apply(style?: string, ruleIndex: number): Promise<void>;
    }

    type coorFormats = 'pdb' | 'mmcif' | 'unk' | 'mmjson' | 'xml';
    interface Molecule {
        transferLigandDicts(toMolecule: Molecule, override?: boolean): Promise<void>;
        minimizeEnergyUsingCidAnimated(cid: string, ncyc: number, nIterations: number, useRamaRestraints: boolean, ramaWeight: number, useTorsionRestraints: boolean, torsionWeight: number): Promise<void>;
        addColourRule(ruleType: string, cid: string, color: string, args: (string | number)[], isMultiColourRule?: boolean, applyColourToNonCarbonAtoms?: boolean, label?: string): void;
        splitMultiModels(draw?: boolean): Promise<Molecule[]>;
        generateAssembly(assemblyNumber: string, draw?: boolean): Promise<Molecule>;
        getActiveAtom(): Promise<string>;
        setDrawAdaptativeBonds(newValue: boolean): Promise<void>;
        redrawAdaptativeBonds(selectionString?: string): Promise<void>;
        changeChainId(oldId: string, newId: string, redraw?: boolean, startResNo?: number, endResNo?: number): Promise<number>;
        refineResiduesUsingAtomCidAnimated(cid: string, activeMap: Map, dist?: number, redraw?: boolean, redrawFragmentFirst?: boolean): Promise<void>;
        mergeFragmentFromRefinement(cid: string, fragmentMolecule: Molecule, acceptTransform?: boolean, refineAfterMerge?: boolean): Promise<void>;
        copyFragmentForRefinement(cid: string[], refinementMap: Map, redraw?: boolean, readrawFragmentFirst?: boolean): Promise<Molecule>;
        exportAsGltf(representationId: string): Promise<ArrayBuffer>;
        getSecondaryStructInfo(modelNumber?: number): Promise<libcootApi.ResidueSpecJS[]>;
        getNonSelectedCids(cid: string): string[];
        parseCidIntoSelection(selectedCid: string): Promise<ResidueSelection>;
        downloadAtoms(format?: coorFormats, fileName?: string): Promise<void>;
        getResidueBFactors(): { cid: string; bFactor: number; normalised_bFactor: number }[];
        getNcsRelatedChains(): Promise<string[][]>;
        animateRefine(n_cyc: number, n_iteration: number, final_n_cyc?: number): Promise<void>;
        refineResidueRange(chainId: string, start: number, stop: number, ncyc?: number, redraw?: boolean): Promise<void>;
        SSMSuperpose(movChainId: string, refMolNo: number, refChainId: string, redraw?: boolean): Promise<void>;
        lsqkbSuperpose(refMolNo: number, residueMatches: lskqbResidueRangeMatch[], matchType?: number, redraw?: boolean): Promise<void>;
        refineResiduesUsingAtomCid(cid: string, mode: string, ncyc?: number, redraw?: boolean): Promise<void>;
        deleteCid(cid: string, redraw?: boolean): Promise<{first: number, second: number}>;
        getNumberOfAtoms(): Promise<number>;
        moveMoleculeHere(x: number, y: number, z: number): Promise<void>;
        checkHasGlycans(): Promise<boolean>;
        fitLigand(mapMolNo: number, ligandMolNo: number, fitRightHere?: boolean, redraw?: boolean, useConformers?: boolean, conformerCount?: number): Promise<Molecule[]>;
        checkIsLigand(): boolean;
        removeRepresentation(representationId: string): void;
        addRepresentation(style: string, cid: string, isCustom?: boolean, colour?: ColourRule[], bondOptions?: cootBondOptions, m2tParams?: m2tParameters, residueEnvOptions?: residueEnvironmentOptions, nonCustomOpacity?: number): Promise<MoleculeRepresentation>;
        getNeighborResiduesCids(selectionCid: string, maxDist: number): Promise<string[]>;
        drawWithStyleFromMesh(style: string, meshObjects: any[], cid?: string, fetchAtomBuffers?: boolean): Promise<void>;
        updateWithMovedAtoms(movedResidues: AtomInfo[][]): Promise<void>;
        transformedCachedAtomsAsMovedAtoms(selectionCid?: string): AtomInfo[][];
        copyFragmentUsingCid(cid: string, doRecentre?: boolean, style?: string): Promise<Molecule>;
        hideCid(cid: string, redraw?: boolean): Promise<void>;
        unhideAll(redraw?: boolean): Promise<void>;
        drawUnitCell(): void;
        gemmiAtomsForCid: (cid: string, omitExcludedCids?: boolean) => Promise<AtomInfo[]>;
        mergeMolecules(otherMolecules: Molecule[], doHide?: boolean, doRedraw?: boolean): Promise<void>;
        copyMolecule(doRedraw?: boolean): Promise<Molecule>;
        setBackgroundColour(backgroundColour: [number, number, number, number]): void;
        addDict(fileContent: string): Promise<void>;
        cacheLigandDict(fileContent: string): void;
        toggleSymmetry(): Promise<void>;
        toggleBiomolecule(): void;
        getDict(newTlc: string): string;
        addLigandOfType(resType: string, fromMolNo?: number): Promise<WorkerResponse>;
        updateAtoms(): Promise<void>;
        rigidBodyFit(cidsString: string, mapNo: number, redraw?: boolean): Promise<void>;
        generateSelfRestraints(cid?: string, maxRadius?: number): Promise<void>;
        clearExtraRestraints(): Promise<WorkerResponse>;
        redo(): Promise<void>;
        undo(): Promise<void>;
        show(style: string, cid?: string): Promise<MoleculeRepresentation>;
        setSymmetryRadius(radius: number): Promise<void>;
        drawSymmetry: (fetchSymMatrix?: boolean) => Promise<void>;
        drawBiomolecule(fetchSymMatrix?: boolean) : void;
        getUnitCellParams():  { a: number; b: number; c: number; alpha: number; beta: number; gamma: number; };
        replaceModelWithFile(fileUrl: string): Promise<void>;
        replaceModelWithCoordData(coordData: string): Promise<void>;
        delete(popBackImol?: boolean): Promise<WorkerResponse>;
        fetchDefaultColourRules(): Promise<void>;
        fetchIfDirtyAndDraw(arg0: string): Promise<void>;
        drawEnvironment: (cid?: string) => Promise<void>;
        centreOn: (selectionCid?: string, animate?: boolean, setZoom?: boolean) => Promise<void>;
        drawHover: (cid: string) => Promise<void>;
        drawResidueSelection: (cid: string) => Promise<void>;
        clearBuffersOfStyle: (style: string) => void;
        loadToCootFromURL: (inputFile: string, molName: string, options?: RequestInit) => Promise<Molecule>;
        loadToCootFromString: (coordData: ArrayBuffer | string, name: string) => Promise<Molecule>;
        applyTransform: () => Promise<void>;
        getAtoms(format?: coorFormats): Promise<string>;
        hide: (style: string, cid?: string) => MoleculeRepresentation;
        redraw: () => Promise<void>;
        setAtomsDirty: (newVal: boolean) => void;
        isVisible: (excludeBuffers?: string[]) => boolean;
        centreAndAlignViewOn: (selectionCid: string, alignWithCB?: boolean, zoomLevel?: number) => Promise<void>;
        buffersInclude: (bufferIn: { id: string; }) => boolean;
        redrawRepresentation: (id: string) => Promise<void>;
        getPrivateerValidation(useCache?: boolean): Promise<privateer.ResultsEntry[]>;
        getLigandSVG(resName: string, useCache?: boolean): Promise<string>;
        getFLEVSVG(cid: string): Promise<string>;
        isValidSelection(cid: string): Promise<boolean>;
        fetchHeaderInfo(useCache?: boolean): Promise<libcootApi.headerInfoJS>;
        calculateQscore(activeMap: Map, cid?: string): Promise<libcootApi.ValidationInformationJS[]>;
        type: string;
        adaptativeBondsEnabled: boolean;
        cachedLigandSVGs: {[key: string]: string};
        cachedGemmiAtoms: AtomInfo[];
        cachedPrivateerValidation: privateer.ResultsEntry[];
        isLigand: boolean;
        isMRSearchModel: boolean;
        excludedCids: string[];
        commandCentre: React.RefObject<CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        store: ToolkitStore;
        atomsDirty: boolean;
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
        biomolOn: boolean;
        symmetryRadius : number;
        symmetryMatrices: number[][][];
        gaussianSurfaceSettings: gaussianSurfSettings;
        defaultM2tParams: m2tParameters;
        defaultResidueEnvironmentOptions: residueEnvironmentOptions
        isDarkBackground: boolean;
        representations: MoleculeRepresentation[];
        defaultBondOptions: cootBondOptions;
        displayObjectsTransformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
        uniqueId: string;
        defaultColourRules: ColourRule[];
        restraints: {maxRadius: number, cid: string}[];
        monomerLibraryPath: string;
        adaptativeBondsRepresentation: MoleculeRepresentation;
        hoverRepresentation: MoleculeRepresentation;
        unitCellRepresentation: MoleculeRepresentation;
        environmentRepresentation: MoleculeRepresentation;
        selectionRepresentation: MoleculeRepresentation;
        hasDNA: boolean;
        hasGlycans: boolean;
        coordsFormat: coorFormats;
        moleculeDiameter: number;
        headerInfo: libcootApi.headerInfoJS;
    }

    type lskqbResidueRangeMatch = {
        refChainId: string;
        movChainId: string;
        refResidueRange: [number, number];
        movResidueRange: [number, number];
    }

    type RepresentationStyles = 'VdwSpheres' | 'ligands' | 'CAs' | 'CBs' | 'CDs' | 'gaussian' | 'allHBonds' | 'rama' |
    'rotamer' | 'CRs' | 'MolecularSurface' | 'DishyBases' | 'VdWSurface' | 'Calpha' | 'unitCell' | 'hover' | 'environment' |
    'ligand_environment' | 'contact_dots' | 'chemical_features' | 'ligand_validation' | 'glycoBlocks' | 'restraints' |
    'residueSelection' | 'MetaBalls' | 'adaptativeBonds' | 'StickBases' | 'residue_environment' | 'transformation'

    interface MoleculeRepresentation {
        addColourRule(ruleType: string, cid: string, color: string, args: (string | number)[], isMultiColourRule?: boolean, applyColourToNonCarbonAtoms?: boolean, label?: string): void;
        setNonCustomOpacity(nonCustomOpacity: number): void;
        getBufferObjects(): Promise<any>;
        applyColourRules(): Promise<void>;
        exportAsGltf(): Promise<ArrayBuffer>;
        setBondOptions(bondOptions: cootBondOptions): void;
        setResidueEnvOptions(newOptions: residueEnvironmentOptions): void;
        setStyle(style: string): void;
        setUseDefaultColourRules(arg0: boolean): void;
        setColourRules(ruleList: ColourRule[]): void;
        buildBuffers(arg0: DisplayObject[]): void;
        setBuffers(meshObjects: DisplayObject[]): void;
        drawSymmetry(): void
        deleteBuffers(): void;
        draw(): Promise<void>;
        redraw(): Promise<void>;
        setParentMolecule(arg0: Molecule): void;
        show(): Promise<void>;
        hide(): void;
        setAtomBuffers(arg0: AtomInfo[]): void;
        setM2tParams(arg0: m2tParameters): void;
        static mergeBufferObjects(bufferObj1: libcootApi.InstancedMeshJS[], bufferObj2: libcootApi.InstancedMeshJS[]): libcootApi.InstancedMeshJS[];
        bondOptions: cootBondOptions;
        m2tParams: m2tParameters;
        nonCustomOpacity: number;
        residueEnvironmentOptions: residueEnvironmentOptions;
        useDefaultM2tParams: boolean;
        useDefaultResidueEnvironmentOptions: boolean;
        useDefaultColourRules: boolean;
        useDefaultBondOptions: boolean;
        uniqueId: string;
        style: RepresentationStyles;
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
        ligandsCid: string;
        hoverColor: number[];
        residueSelectionColor: number[];
    }

    type ResidueSelection = {
        molecule: null | Molecule;
        first: null | string;
        second: null | string;
        cid: null | string | string[];
        isMultiCid: boolean;
        label: string;
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
        toggleSkipTracking(): void;
        entries: HistoryEntry[];
        headId: string;
        headIsDetached: boolean;
        timeCapsule: React.RefObject<TimeCapsule>;
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
        isClosed: boolean;
        init: () => Promise<void>;
        close: () => Promise<void>;
        onCootInitialized: null | ( () => void );
        onConsoleChanged: null | ( (msg: string) => void );
        onCommandStart : null | ( (kwargs: any) => void );
        onCommandExit : null | ( (kwargs: any) => void );
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
        takeScreenShot: (fileName: string, doTransparentBackground?: boolean) => void;
    }

    type mapHeaderInfo = {
        spacegroup: string;
        cell: libcootApi.mapCellJS;
        resolution: number;
    }

    interface Map {
        toggleOriginLock(val?: boolean): void;
        isOriginLocked: boolean;
        getHistogram(nBins?: number, zoomFactor?: number): Promise<libcootApi.HistogramInfoJS>;
        setMapWeight(weight?: number): Promise<WorkerResponse>;
        scaleMap(scale: number): Promise<WorkerResponse>;
        estimateMapWeight(): Promise<void>;
        fetchMapAlphaAndRedraw(): Promise<void>;
        centreOnMap(): Promise<void>;
        getSuggestedSettings(): Promise<void>;
        copyMap(): Promise<Map>;
        getMapContourParams(): {
            mapRadius: number;
            contourLevel: number;
            mapAlpha: number;
            mapStyle: "lines" | "solid" | "lit-lines";
            mapColour: {r: number; g: number; b: number};
            positiveMapColour: {r: number; g: number; b: number};
            negativeMapColour: {r: number; g: number; b: number}
        };
        hideMapContour(): void;
        drawMapContour(): Promise<void>;
        fetchColourAndRedraw(): Promise<void> ;
        fetchDiffMapColourAndRedraw(type: 'positiveDiffColour' | 'negativeDiffColour'): Promise<void> ;
        fetchMapRmsd(): Promise<number>;
        fetchMapMean(): Promise<number>;
        fetchSuggestedLevel(): Promise<number>;
        fetchMapCentre(): Promise<[number, number, number]>;
        replaceMapWithMtzFile(fileUrl: RequestInfo | URL, selectedColumns: selectedMtzColumns): Promise<void>;
        associateToReflectionData (selectedColumns: selectedMtzColumns, reflectionData: Uint8Array | ArrayBuffer): Promise<void>;
        delete(): Promise<void>
        doCootContour(x: number, y: number, z: number, radius: number, contourLevel: number, style: "lines" | "lit-lines" | "solid"): Promise<void>;
        fetchReflectionData(): Promise<WorkerResponse<Uint8Array>>;
        getMap(): Promise<WorkerResponse>;
        loadToCootFromMtzURL(url: RequestInfo | URL, name: string, selectedColumns: selectedMtzColumns, options?: RequestInit): Promise<Map>;
        loadToCootFromMapURL(url: RequestInfo | URL, name: string, isDiffMap?: boolean, decompress?: boolean, options?: RequestInit): Promise<Map>;
        loadToCootFromMtzData(data: Uint8Array, name: string, selectedColumns: selectedMtzColumns): Promise<Map>;
        loadToCootFromMapData(data: ArrayBuffer | Uint8Array, name: string, isDiffMap: boolean): Promise<Map>;
        setActive(): Promise<void>;
        setupContourBuffers(objects: any[], keepCootColours?: boolean): void;
        setOtherMapForColouring(molNo: number, min?: number, max?: number): void;
        exportAsGltf(): Promise<ArrayBuffer>;
        static autoReadMtz(source: File, commandCentre: React.RefObject<CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, store: ToolkitStore): Promise<Map[]>;
        store: ToolkitStore;
        isEM: boolean;
        suggestedContourLevel: number;
        suggestedRadius: number;
        levelRange: [number, number];
        mapCentre: [number, number, number];
        type: string;
        name: string;
        molNo: number;
        commandCentre: React.RefObject<CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        webMGContour: boolean;
        showOnLoad: boolean;
        displayObjects: any;
        isDifference: boolean;
        hasReflectionData: boolean;
        selectedColumns: selectedMtzColumns;
        associatedReflectionFileName: string;
        uniqueId: string;
        otherMapForColouring: {molNo: number, min: number, max: number};
        mapRmsd: number;
        mapMean: number;
        suggestedMapWeight: number;
        defaultMapColour: {r: number, g: number, b: number};
        defaultPositiveMapColour: {r: number, g: number, b: number};
        defaultNegativeMapColour: {r: number, g: number, b: number};
        fetchHeaderInfo(): Promise<mapHeaderInfo>;
        headerInfo: mapHeaderInfo;
    }

    interface backupKey {
        name?: string;
        label?: string;
        dateTime: string;
        type: string;
        serNo: string | number;
        molNames: string[];
        mapNames?: string[];
        mtzNames?: string[];
    }

    type moleculeSessionData = {
        name: string;
        molNo: number;
        coordString: string;
        coordFormat: coorFormats;
        representations: {
            cid: string;
            style: strin;
            isCustom: boolean;
            colourRules: ColourRuleObject[];
            bondOptions: cootBondOptions;
            m2tParams: m2tParameters;
            nonCustomOpacity: number;
            resEnvOptions: residueEnvironmentOptions;
         }[];
        defaultBondOptions: cootBondOptions;
        defaultM2tParams: m2tParameters;
        defaultResEnvOptions: residueEnvironmentOptions;
        defaultColourRules: ColourRuleObject[];
        connectedToMaps: number[];
        ligandDicts: {[comp_id: string]: string};
        symmetryOn: boolean;
        biomolOn: boolean;
        symmetryRadius: number;
        uniqueId: string;
    }

    type mapDataSession = {
        name: string;
        molNo: number;
        uniqueId: string;
        mapData: Uint8Array;
        reflectionData: Uint8Array;
        showOnLoad: boolean;
        contourLevel: number;
        radius: number;
        rgba: {
            mapColour: {r: number, g: number, b: number};
            positiveDiffColour: {r: number, g: number, b: number};
            negativeDiffColour: {r: number, g: number, b: number};
            a: number;
        };
        style: "solid" | "lit-lines" | "lines";
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
        specularPower: number;
        fogStart: number;
        fogEnd: number;
        zoom: number;
        doDrawClickedAtomLines: boolean;
        clipStart: number;
        clipEnd: number;
        quat4: any[];
        shadows: boolean;
        ssao: {enabled: boolean; radius: number; bias: number};
        edgeDetection: {
            enabled: boolean;
            depthScale: number;
            normalScale: number;
            depthThreshold: number;
            normalThreshold: number;
        };
        doPerspectiveProjection: boolean;
        blur: {enabled: boolean; depth: number; radius: number};
    }

    type backupSession = {
        version: string;
        includesAdditionalMapData: boolean;
        moleculeData: moleculeSessionData[];
        mapData: mapDataSession[];
        viewData: viewDataSession;
        activeMapIndex: number;
        dataIsEmbedded: boolean;
    }

    interface TimeCapsule {
        setBusy: (arg0: boolean) => void;
        onIsBusyChange: (arg0: boolean) => void;
        getSortedKeys(): Promise<backupKey[]>;
        cleanupUnusedDataFiles(): Promise<void>;
        removeBackup(key: string): Promise<void>;
        updateDataFiles(): Promise<(string | void)[]>;
        createBackup(keyString: string, sessionString: string): Promise<string>;
        fetchSession(includeAdditionalMapData: boolean, embedData: boolean=true): Promise<backupSession>;
        toggleDisableBackups(): void;
        addModification: () =>  Promise<string>;
        init: () => Promise<void>;
        retrieveBackup: (arg0: string) => Promise<string | ArrayBuffer>;
        static getBackupLabel(key: backupKey): string;
        static loadSessionData(
            sessionData: backupSession,
            monomerLibraryPath: string,
            molecules: Molecule[],
            maps: Map[],
            commandCentre: React.RefObject<CommandCentre>,
            timeCapsuleRef: React.RefObject<TimeCapsule>,
            glRef: React.RefObject<webGL.MGWebGL>,
            store: ToolkitStore,
            dispatch: Dispatch<AnyAction>,
            fetchExternalUrl?: (uniqueId: string) => Promise<string>
        ): Promise<number>;
        static loadSessionFromArrayBuffer(
            sessionArrayBuffer: ArrayBuffer,
            monomerLibraryPath: string,
            molecules: Molecule[],
            maps: Map[],
            commandCentre: React.RefObject<CommandCentre>,
            timeCapsuleRef: React.RefObject<TimeCapsule>,
            glRef: React.RefObject<webGL.MGWebGL>,
            store: ToolkitStore,
            dispatch: Dispatch<AnyAction>
        ): Promise<number>;
        static loadSessionFromProtoMessage(
            sessionProtoMessage: any,
            monomerLibraryPath: string,
            molecules: Molecule[],
            maps: Map[],
            commandCentre: React.RefObject<CommandCentre>,
            timeCapsuleRef: React.RefObject<TimeCapsule>,
            glRef: React.RefObject<webGL.MGWebGL>,
            store: ToolkitStore,
            dispatch: Dispatch<AnyAction>
        ): Promise<number>;
        static loadSessionFromJsonString(
            sessionDataString: string,
            monomerLibraryPath: string,
            molecules: Molecule[],
            maps: Map[],
            commandCentre: React.RefObject<CommandCentre>,
            timeCapsuleRef: React.RefObject<TimeCapsule>,
            glRef: React.RefObject<webGL.MGWebGL>,
            store: ToolkitStore,
            dispatch: Dispatch<AnyAction>
        ): Promise<number>;
        store: ToolkitStore;
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
    }

    type AtomRightClickEventInfo = {
        atom: AtomInfo;
        buffer: {id: string};
        coords: string,
        pageX: number;
        pageY: number;
    }

    type AtomRightClickEvent = CustomEvent<AtomRightClickEventInfo>

    type AtomDraggedEvent = CustomEvent<{
        atom: AtomInfo
        buffer: any;
    }>

    type OriginUpdateEvent = CustomEvent<{ origin: [number, number, number]; }>

    type WheelContourLevelEvent = CustomEvent<{ factor: number; }>

    type MapRadiusChangeEvent = CustomEvent<{ factor: number; }>

    type AtomClickedEvent = CustomEvent<{
        buffer: { id: string };
        atom: AtomInfo;
        isResidueSelection: boolean;
    }>

    type NewMapContourEvent = CustomEvent<{
        molNo: number;
        mapRadius: number;
        isVisible: boolean;
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
        setDoEdgeDetect: React.Dispatch<React.SetStateAction<boolean>>;
        setEdgeDetectDepthThreshold: React.Dispatch<React.SetStateAction<number>>;
        setEdgeDetectNormalThreshold: React.Dispatch<React.SetStateAction<number>>;
        setEdgeDetectDepthScale: React.Dispatch<React.SetStateAction<number>>;
        setEdgeDetectNormalScale: React.Dispatch<React.SetStateAction<number>>;
        setDoOutline: React.Dispatch<React.SetStateAction<boolean>>;
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
        setUseGemmi: React.Dispatch<React.SetStateAction<boolean>>;
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
        reContourMapOnlyOnMouseUp: boolean;
        isMounted?: boolean;
        defaultMapSamplingRate: number;
        transparentModalsOnMouseOut: boolean;
        defaultBackgroundColor: [number, number, number, number];
        atomLabelDepthMode: boolean;
        enableTimeCapsule: boolean;
        defaultExpandDisplayCards: boolean;
        defaultMapLitLines: boolean;
        enableRefineAfterMod: boolean;
        drawScaleBar: boolean;
        drawCrosshairs: boolean;
        drawAxes: boolean;
        drawFPS: boolean;
        drawEnvBOcc: boolean;
        drawMissingLoops: boolean;
        doPerspectiveProjection: boolean;
        useOffScreenBuffers: boolean;
        depthBlurRadius: number;
        depthBlurDepth: number;
        ssaoBias: number;
        ssaoRadius: number;
        doShadowDepthDebug: boolean;
        doShadow: boolean;
        doSSAO: boolean;
        doEdgeDetect: boolean;
        edgeDetectDepthThreshold: number;
        edgeDetectNormalThreshold: number;
        edgeDetectDepthScale: number;
        edgeDetectNormalScale: number;
        doOutline: boolean;
        GLLabelsFontFamily: string;
        GLLabelsFontSize: number;
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
        animateRefine: boolean;
        devMode: boolean;
        useGemmi: boolean;
        shortCuts: string | {
            [label: string]: Shortcut;
        };
    }

    interface Context extends ContextSetters, PreferencesValues { }

    type ContextButtonProps = {
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
        extraNavBarModals: {name: string; ref: React.RefObject<any> ; icon: JSX.Element; JSXElement: JSX.Element; show: boolean; setShow: React.Dispatch<React.SetStateAction<boolean>>;}[];
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
        includeNavBarMenuNames: string[];
        store: ToolkitStore;
        allowAddNewFittedLigand: boolean;
        allowMergeFittedLigand: boolean;
    }

    interface ContainerProps extends Partial<ContainerRefs>, Partial<ContainerOptionalProps> { }

    interface CollectedProps extends ContainerRefs, ContainerOptionalProps { }

    interface State {
        molecules: {
            moleculeList: Molecule[];
            visibleMolecules: number[];
            customRepresentations: MoleculeRepresentation[];
            generalRepresentations: MoleculeRepresentation[];
        };
        maps: Map[];
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
            drawScaleBar: boolean;
            drawCrosshairs: boolean;
            drawAxes: boolean;
            drawEnvBOcc: boolean;
            drawFPS: boolean;
            drawMissingLoops: boolean;
            doPerspectiveProjection: boolean;
            useOffScreenBuffers: boolean;
            depthBlurRadius: number;
            depthBlurDepth: number;
            ssaoBias: number;
            ssaoRadius: number;
            doShadowDepthDebug: boolean;
            doShadow: boolean;
            doSSAO: boolean;
            doEdgeDetect: boolean;
            edgeDetectDepthThreshold: number;
            edgeDetectNormalThreshold: number;
            edgeDetectDepthScale: number;
            edgeDetectNormalScale: number;
            doOutline: boolean;
            doSpin: boolean;
            doThreeWayView: boolean;
            multiViewRows: number;
            multiViewColumns: number;
            threeWayViewOrder: string;
            specifyMultiViewRowsColumns: boolean;
            doSideBySideStereo: boolean;
            doMultiView: boolean;
            doCrossEyedStereo: boolean;
            doAnaglyphStereo: boolean;
            defaultBondSmoothness: number,
            resetClippingFogging: boolean;
            clipCap: boolean;
            backgroundColor: [number, number, number, number];
            height: number;
            width: number;
            isDark: boolean;
        };
        generalStates: {
            devMode: boolean;
            useGemmi: boolean;
            userPreferencesMounted: boolean;
            appTitle: string;
            cootInitialized: boolean;
            activeMap: Map;
            theme: string;
            residueSelection: ResidueSelection;
            isShowingTomograms: boolean;
            isAnimatingTrajectory: boolean;
            isChangingRotamers: boolean;
            isDraggingAtoms: boolean;
            isRotatingAtoms: boolean;
            newCootCommandExit: boolean;
            newCootCommandStart: boolean;
            showResidueSelection: boolean;
            defaultExpandDisplayCards: boolean;
            transparentModalsOnMouseOut: boolean;
        };
        sharedSession: {
            isInSharedSession: boolean;
            sharedSessionToken: string;
            showSharedSessionManager: boolean;
        };
        hoveringStates: {
            enableAtomHovering: boolean;
            hoveredAtom: HoveredAtom;
            cursorStyle: string;
        };
        modals: {
            activeModals: string[];
            focusHierarchy: string[];
            modalsAttachedToSideBar: { key: string; isCollapsed: boolean }[];
        };
        mapContourSettings: {
            visibleMaps: number[];
            contourLevels: { molNo: number; contourLevel: number }[];
            mapRadii: { molNo: number; radius: number }[];
            mapAlpha: { molNo: number; alpha: number }[];
            mapStyles: { molNo: number; style: "solid" | "lit-lines" | "lines" }[];
            defaultMapSamplingRate: number;
            defaultMapLitLines: boolean;
            mapLineWidth: number;
            defaultMapSurface: boolean;
            mapColours: { molNo: number; rgb: {r: number, g: number, b: number} }[];
            negativeMapColours: { molNo: number; rgb: {r: number, g: number, b: number} }[];
            positiveMapColours: { molNo: number; rgb: {r: number, g: number, b: number} }[];
            reContourMapOnlyOnMouseUp: boolean;
        };
        moleculeMapUpdate: {
            updatingMapsIsEnabled: boolean;
            connectedMolecule: number;
            reflectionMap: number;
            twoFoFcMap: number;
            foFcMap: number;
            uniqueMaps: number[];
            defaultUpdatingScores: string[];
            showScoresToast: boolean;
            moleculeUpdate: { switch: boolean, molNo: number };
            currentScores: { rFactor: number; rFree: number; moorhenPoints: number; };
            currentScoreDiffs: { rFactor: number; rFree: number; moorhenPoints: number; };
        };
        refinementSettings: {
            useRamaRefinementRestraints: boolean;
            useTorsionRefinementRestraints: boolean;
            enableRefineAfterMod: boolean;
            animateRefine: boolean;
            refinementSelection: 'SINGLE' | 'TRIPLE' | 'SPHERE';
        };
        lhasa: {
            rdkitMoleculePickleList: { cid: string; moleculeMolNo: number; ligandName: string; pickle: string; id: string }[];
        };
        sliceNDice: {
            paeFileIsUploaded: boolean;
            thresholdType: "b-factor-norm" | "af2-plddt";
            moleculeBfactors: { cid: string; bFactor: number; normalised_bFactor: number; }[];
            moleculeMinBfactor: number;
            moleculeMaxBfactor: number;
            bFactorThreshold: number;
            nClusters: number;
            clusteringType: string;
            slicingResults: Molecule[];
            paeFileContents: { fileContents: string; fileName: string }[];
        };
        jsonValidation: {
            validationJson: { sections: any, title:string};
        };
        mrParse: {
            mrParseModels: Molecule[];
            targetSequence: string;
            afJson: any[];
            esmJson: any[];
            homologsJson: any[];
            afSortField: string;
            homologsSortField: string;
            afSortReversed: boolean;
            homologsSortReversed: boolean;
            AFDisplaySettings: any;
            HomologsDisplaySettings: any;
        };
        glRef: {
            origin: [number,number,number];
            requestDrawScene: boolean;
            requestBuildBuffers: boolean;
            isWebGL2: boolean;
            activeMolecule: Molecule;
            draggableMolecule: Molecule;
            lightPosition: [number,number,number,number],
            ambient: [number,number,number,number],
            specular: [number,number,number,number],
            diffuse: [number,number,number,number],
            specularPower: number,
            zoom: number,
            quat: any[],
            fogClipOffset: number,
            fogStart: number,
            fogEnd: number,
            clipStart: number,
            clipEnd: number,
            cursorPosition: [number,number],
            shortCutHelp: string[],
        };
        overlays: {
            imageOverlayList: any[]
            textOverlayList: any[]
            svgPathOverlayList: any[]
            fracPathOverlayList: any[]
            callBacks: any[]
        }
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
