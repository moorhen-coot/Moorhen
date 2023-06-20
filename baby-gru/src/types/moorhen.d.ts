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
    
    type MoleculeColourRule = {
        commandInput: cootCommandKwargs;
        isMultiColourRule: boolean;
        ruleType: string;
        color: string;
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
            commandArgs: [number, string];
        };
        isMultiColourRule: boolean;
        ruleType: string;
        label: string;
    }
    
    interface Molecule {
        drawUnitCell(glRef: React.RefObject<webGL.MGWebGL>): void;
        gemmiAtomsForCid: (cid: string) => Promise<AtomInfo[]>;
        mergeMolecules(otherMolecules: Molecule[], glRef: React.RefObject<webGL.MGWebGL>, doHide?: boolean): Promise<void>;
        setBackgroundColour(backgroundColour: [number, number, number, number]): void;
        addDict(fileContent: string): Promise<void>;
        addDictShim(fileContent: string): void;
        toggleSymmetry(glRef: React.RefObject<webGL.MGWebGL>): Promise<void>;
        getDict(newTlc: string): string;
        addLigandOfType(resType: string, glRef: React.RefObject<webGL.MGWebGL>, fromMolNo?: number): Promise<WorkerResponse>;
        updateAtoms(): Promise<void>;
        rigidBodyFit(cidsString: string, mapNo: number): Promise<WorkerResponse>;
        redo(glRef: React.RefObject<webGL.MGWebGL>): Promise<void>;
        undo(glRef: React.RefObject<webGL.MGWebGL>): Promise<void>;
        copyFragment(chainId: string, res_no_start: number, res_no_end: number, glRef: React.RefObject<webGL.MGWebGL>, doRecentre?: boolean): Promise<Molecule>;
        show(style: string, glRef: React.RefObject<webGL.MGWebGL>): Promise<void>;
        setSymmetryRadius(radius: number, glRef: React.RefObject<webGL.MGWebGL>): Promise<void>;
        drawSymmetry: (glRef: React.RefObject<webGL.MGWebGL>, fetchSymMatrix?: boolean) => Promise<void>;
        getUnitCellParams():  { a: number; b: number; c: number; alpha: number; beta: number; gamma: number; };
        replaceModelWithFile(glRef: React.RefObject<webGL.MGWebGL>, fileUrl: string, molName: string): Promise<void>
        delete(glRef: React.RefObject<webGL.MGWebGL>): Promise<WorkerResponse> 
        setColourRules(glRef: React.RefObject<webGL.MGWebGL>, ruleList: ColourRule[], redraw?: boolean): void;
        fetchIfDirtyAndDraw(arg0: string, glRef: React.MutableRefObject<webGL.MGWebGL>): Promise<boolean>;
        drawGemmiAtomPairs: (glRef: React.ForwardedRef<webGL.MGWebGL>, gemmiAtomPairs: any[], style: string,  colour: number[], labelled?: boolean, clearBuffers?: boolean) => void;
        drawEnvironment: (glRef: React.RefObject<webGL.MGWebGL>, chainID: string, resNo: number,  altLoc: string, labelled?: boolean) => Promise<void>;
        centreOn: (glRef: React.ForwardedRef<webGL.MGWebGL>, selectionCid?: string, animate?: boolean) => Promise<void>;
        drawHover: (glRef: React.MutableRefObject<webGL.MGWebGL>, cid: string) => Promise<void>;
        clearBuffersOfStyle: (style: string, glRef: React.RefObject<webGL.MGWebGL>) => void;
        type: string;
        commandCentre: React.RefObject<CommandCentre>;
        enerLib: any;
        HBondsAssigned: boolean;
        atomsDirty: boolean;
        isVisible: boolean;
        name: string;
        molNo: number;
        gemmiStructure: gemmi.Structure;
        sequences: Sequence[];
        colourRules: MoleculeColourRule[];
        ligands: LigandInfo[];
        ligandDicts: {[comp_id: string]: string};
        connectedToMaps: number[];
        excludedSegments: string[];
        symmetryOn: boolean;
        symmetryRadius : number;
        symmetryMatrices: any;
        gaussianSurfaceSettings: {
            sigma: number;
            countourLevel: number;
            boxRadius: number;
            gridScale: number;
        };
        cootBondsOptions: cootBondOptions;
        displayObjects: {
            CBs: DisplayObject[];
            CRs: DisplayObject[];
            ligands: DisplayObject[];
            gaussian: DisplayObject[];
            MolecularSurface: DisplayObject[];
            VdWSurface: DisplayObject[];
            DishyBases: DisplayObject[];
            VdwSpheres: DisplayObject[];
            rama: DisplayObject[];
            rotamer: DisplayObject[];
            CDs: DisplayObject[];
            allHBonds: DisplayObject[];
            hover: DisplayObject[];
            selection: DisplayObject[];
            originNeighbours: DisplayObject[];
            originNeighboursHBond: DisplayObject[];
            originNeighboursBump: DisplayObject[];
            transformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
        };
        uniqueId: string;
        monomerLibraryPath: string;
        applyTransform: (glRef: React.RefObject<webGL.MGWebGL>) => Promise<void>;
        getAtoms(format?: string): Promise<WorkerResponse>;
        hide: (style: string, glRef: React.RefObject<webGL.MGWebGL>) => void;
        redraw: (glRef: React.RefObject<webGL.MGWebGL>) => Promise<void>;
        setAtomsDirty: (newVal: boolean) => void;
        hasVisibleBuffers: (excludeBuffers?: string[]) => boolean;
        centreAndAlignViewOn(glRef: React.RefObject<webGL.MGWebGL>, selectionCid: string, animate?: boolean): Promise<void>;
        buffersInclude: (bufferIn: { id: string; }) => boolean;
    }
    
    interface CommandCentre {
        urlPrefix: string;
        cootWorker: Worker;
        consoleMessage: string;
        activeMessages: WorkerMessageType[];
        unhook: () => void;
        onCootInitialized: null | ( () => void );
        onConsoleChanged: null | ( (msg: string) => void );
        onNewCommand : null | ( (kwargs: any) => void );
        onActiveMessagesChanged: null | ( (activeMessages: WorkerMessageType[]) => void );
        cootCommand: (kwargs: cootCommandKwargsType, doJournal?: boolean) => Promise<moorhen.WorkerResponseType>;
        postMessage: (kwargs: cootCommandKwargsType) => Promise<moorhen.WorkerResponseType>;
        extendConsoleMessage: (msg: string) => void;
    }
    
    type cootCommandKwargsType = { 
        message?: string;
        data?: {};
        returnType?: string;
        command?: string;
        commandArgs?: any[];
        changesMolecules?: number[];
        [key: string]: any;
    }
    
    type WorkerMessageType = { 
        consoleMessage?: string;
        messageId: string;
        handler: (reply: moorhen.WorkerResponseType) => void;
        kwargs: cootCommandKwargsType;
    }
    
    type WorkerResultType = {
        result: {
            status: string;
            result: any;
            [key: string]: any;
        }
        messageId: string;
        myTimeStamp: string;
        message: string;
        consoleMessage: string;
    }
    
    type WorkerResponseType = { 
        data: WorkerResultType;
    }
    
    
}