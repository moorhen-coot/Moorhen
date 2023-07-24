import { moorhen as _moorhen } from "./moorhen"
import { webGL } from "./mgWebGL";
import { libcootApi } from "./libcoot";
import { gemmi } from "./gemmi";
import { emscriptem } from "./emscriptem";

declare module 'moorhen' {

    let MoorhenContextProvider: any;
    module.exports = MoorhenContextProvider;

    let MoorhenContainer: any;
    module.exports = MoorhenContainer;

    let MoorhenContext: React.Context<any>;
    module.exports = MoorhenContext;

    function itemReducer<T extends _moorhen.Molecule | _moorhen.Map> (oldList: T[], change: _moorhen.MolChange<T>): T[];
    module.exports = itemReducer;

    function getDefaultContextValues(): _moorhen.ContextValues;
    module.exports = getDefaultContextValues;

    class MoorhenMolecule implements _moorhen.Molecule {
        constructor(commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, monomerLibrary: string)
        getNeighborResiduesCids(selectionCid: string, radius: number, minDist: number, maxDist: number): Promise<string[]>;
        drawWithStyleFromMesh(style: string, meshObjects: any[], newBufferAtoms?: _moorhen.AtomInfo[]): Promise<void>;
        updateWithMovedAtoms(movedResidues: _moorhen.AtomInfo[][]): Promise<void>;
        transformedCachedAtomsAsMovedAtoms(selectionCid?: string): _moorhen.AtomInfo[][];
        drawWithStyleFromAtoms(style: string): Promise<void>;
        copyFragmentUsingCid(cid: string, backgroundColor: [number, number, number, number], defaultBondSmoothness: number, doRecentre?: boolean): Promise<moorhen.Molecule>;
        hideCid(cid: string): Promise<void>;
        unhideAll(): Promise<void>;
        drawSelection(cid: string): Promise<void>;
        drawUnitCell(): void;
        gemmiAtomsForCid: (cid: string) => Promise<_moorhen.AtomInfo[]>;
        mergeMolecules(otherMolecules: _moorhen.Molecule[], doHide?: boolean): Promise<void>;
        setBackgroundColour(backgroundColour: [number, number, number, number]): void;
        addDict(fileContent: string): Promise<void>;
        addDictShim(fileContent: string): void;
        toggleSymmetry(): Promise<void>;
        getDict(newTlc: string): string;
        addLigandOfType(resType: string, fromMolNo?: number): Promise<_moorhen.WorkerResponse>;
        updateAtoms(): Promise<void>;
        rigidBodyFit(cidsString: string, mapNo: number): Promise<_moorhen.WorkerResponse>;
        generateSelfRestraints(maxRadius: number): Promise<_moorhen.WorkerResponse>;
        clearExtraRestraints(): Promise<_moorhen.WorkerResponse>;
        refineResiduesUsingAtomCid(cid: string, mode: string, ncyc: number): Promise<_moorhen.WorkerResponse>;
        redo(): Promise<void>;
        undo(): Promise<void>;
        show(style: string): Promise<void>;
        setSymmetryRadius(radius: number): Promise<void>;
        drawSymmetry: (fetchSymMatrix?: boolean) => Promise<void>;
        getUnitCellParams():  { a: number; b: number; c: number; alpha: number; beta: number; gamma: number; };
        replaceModelWithFile(fileUrl: string, molName: string): Promise<void>
        delete(): Promise<_moorhen.WorkerResponse> 
        setColourRules(ruleList: _moorhen.ColourRule[], redraw?: boolean): Promise<void>;
        fetchCurrentColourRules(): Promise<void>;
        fetchIfDirtyAndDraw(arg0: string): Promise<void>;
        drawGemmiAtomPairs: (gemmiAtomPairs: any[], style: string,  colour: number[], labelled?: boolean, clearBuffers?: boolean) => void;
        drawEnvironment: (chainID: string, resNo: number,  altLoc: string, labelled?: boolean) => Promise<void>;
        centreOn: (selectionCid?: string, animate?: boolean) => Promise<void>;
        drawHover: (cid: string) => Promise<void>;
        clearBuffersOfStyle: (style: string) => void;
        loadToCootFromURL: (inputFile: string, molName: string) => Promise<_moorhen.Molecule>;
        type: string;
        commandCentre: React.RefObject<_moorhen.CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        HBondsAssigned: boolean;
        atomsDirty: boolean;
        isVisible: boolean;
        name: string;
        molNo: number;
        gemmiStructure: gemmi.Structure;
        sequences: _moorhen.Sequence[];
        colourRules: _moorhen.ColourRule[];
        ligands: _moorhen.LigandInfo[];
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
        cootBondsOptions: _moorhen.cootBondOptions;
        displayObjects: {
            CBs: _moorhen.DisplayObject[];
            CAs: _moorhen.DisplayObject[];
            CRs: _moorhen.DisplayObject[];
            ligands: _moorhen.DisplayObject[];
            gaussian: _moorhen.DisplayObject[];
            MolecularSurface: _moorhen.DisplayObject[];
            VdWSurface: _moorhen.DisplayObject[];
            DishyBases: _moorhen.DisplayObject[];
            VdwSpheres: _moorhen.DisplayObject[];
            rama: _moorhen.DisplayObject[];
            rotamer: _moorhen.DisplayObject[];
            CDs: _moorhen.DisplayObject[];
            allHBonds: _moorhen.DisplayObject[];
            hover: _moorhen.DisplayObject[];
            selection: _moorhen.DisplayObject[];
            originNeighbours: _moorhen.DisplayObject[];
            originNeighboursHBond: _moorhen.DisplayObject[];
            originNeighboursBump: _moorhen.DisplayObject[];
        };
        displayObjectsTransformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
        uniqueId: string;
        monomerLibraryPath: string;
        applyTransform: () => Promise<void>;
        getAtoms(format?: string): Promise<_moorhen.WorkerResponse>;
        hide: (style: string) => void;
        redraw: () => Promise<void>;
        setAtomsDirty: (newVal: boolean) => void;
        hasVisibleBuffers: (excludeBuffers?: string[]) => boolean;
        centreAndAlignViewOn(selectionCid: string, animate?: boolean): Promise<void>;
        buffersInclude: (bufferIn: { id: string; }) => boolean;
    }
    module.exports.MoorhenMolecule = MoorhenMolecule
    
    class MoorhenMap implements _moorhen.Map {
        constructor(commandCentre: React.RefObject<_moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>)
        setAlpha(alpha: number, redraw?: boolean): Promise<void>;
        getSuggestedSettings(): Promise<void>;
        centreOnMap(): Promise<void>;
        duplicate(): Promise<_moorhen.Map>;
        makeCootUnlive(): void;
        makeCootLive(): void;
        setColour(r: number, g: number, b: number, redraw?: boolean): Promise<void> ;
        setDiffMapColour(type: 'positiveDiffColour' | 'negativeDiffColour', r: number, g: number, b: number, redraw?: boolean): Promise<void> ;
        fetchMapRmsd(): Promise<number>;
        fetchSuggestedLevel(): Promise<number>;
        fetchMapCentre(): Promise<[number, number, number]>;
        replaceMapWithMtzFile(fileUrl: RequestInfo | URL, name: string, selectedColumns: _moorhen.selectedMtzColumns, mapColour?: { [type: string]: {r: number, g: number, b: number} }): Promise<void>;
        associateToReflectionData (selectedColumns: _moorhen.selectedMtzColumns, reflectionData: Uint8Array | ArrayBuffer): Promise<_moorhen.WorkerResponse>;
        delete(): Promise<void> 
        doCootContour(x: number, y: number, z: number, radius: number, contourLevel: number): Promise<void>;
        fetchReflectionData(): Promise<_moorhen.WorkerResponse<Uint8Array>>;
        getMap(): Promise<_moorhen.WorkerResponse>;
        loadToCootFromMtzURL(url: RequestInfo | URL, name: string, selectedColumns: _moorhen.selectedMtzColumns): Promise<_moorhen.Map>;
        suggestedContourLevel: number;
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
        mapRmsd: number;
        rgba: {
            mapColour: {r: number, g: number, b: number};
            positiveDiffColour: {r: number, g: number, b: number};
            negativeDiffColour: {r: number, g: number, b: number};
            a: number;
        }
    }
    module.exports.MoorhenMap = MoorhenMap
}
