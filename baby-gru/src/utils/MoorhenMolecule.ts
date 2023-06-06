import 'pako';
import { EnerLib, Model, parseMMCIF, parsePDB, atomsToHierarchy } from '../WebGLgComponents/mgMiniMol';
import { CalcSecStructure } from '../WebGLgComponents/mgSecStr';
import { ColourScheme } from '../WebGLgComponents/mgWebGLAtomsToPrimitives';
import { GetSplinesColoured } from '../WebGLgComponents/mgSecStr';
import { atomsToSpheresInfo } from '../WebGLgComponents/mgWebGLAtomsToPrimitives';
import { contactsToCylindersInfo, contactsToLinesInfo } from '../WebGLgComponents/mgWebGLAtomsToPrimitives';
import { singletonsToLinesInfo } from '../WebGLgComponents/mgWebGLAtomsToPrimitives';
import { guid, readTextFile, readGemmiStructure, cidToSpec, residueCodesThreeToOne, centreOnGemmiAtoms, getBufferAtoms, 
    nucleotideCodesThreeToOne, hexToHsl, gemmiAtomPairsToCylindersInfo, gemmiAtomsToCirclesSpheresInfo} from './MoorhenUtils'
import { MoorhenCommandCentreRef, cootCommandKwargsType } from "./MoorhenCommandCentre"
import { WorkerResponseType } from "./MoorhenCommandCentre"
import { quatToMat4 } from '../WebGLgComponents/quatToMat4.js';
import { isDarkBackground } from '../WebGLgComponents/mgWebGL'
import * as vec3 from 'gl-matrix/vec3';
import * as mat3 from 'gl-matrix/mat3';
import * as quat4 from 'gl-matrix/quat';

export type MoorhenResidueInfoType = {
    resCode: string;
    resNum: number;
    cid: string;
}

export type MoorhenLigandInfoType = {
    resName: string;
    chainName: string;
    resNum: string;
    modelName: string;
}

export type MoorhenSequenceType = {
    name: string;
    chain: string;
    type: number;
    sequence: MoorhenResidueInfoType[];
}

export type MoorhenResidueSpecType = {
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

export type MoorhenAtomInfoType = {
    pos: [number, number, number];
    x: number;
    y: number;
    z: number;
    charge: number;
    element: emscriptemInstanceInterface<string>;
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

type MoleculeColourRuleType = {
    commandInput: cootCommandKwargsType;
    isMultiColourRule: boolean;
    ruleType: string;
    color: string;
    label: string;
}

type DisplayObjectType = {
    symmetryMatrices: any;
    [attr: string]: any;
}

export type cootBondOptionsType = {
    isDarkBackground: boolean;
    smoothness: number;
    width: number;
    atomRadiusBondRatio: number;
}

type MoorhenColourRuleType = {
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

export interface MoorhenMoleculeInterface {
    getUnitCellParams():  { a: number; b: number; c: number; alpha: number; beta: number; gamma: number; };
    replaceModelWithFile(glRef: React.RefObject<mgWebGLType>, fileUrl: string, molName: string): Promise<void>
    delete(glRef: React.RefObject<mgWebGLType>): Promise<WorkerResponseType> 
    setColourRules(glRef: React.RefObject<mgWebGLType>, ruleList: MoorhenColourRuleType[], redraw?: boolean): void;
    fetchIfDirtyAndDraw(arg0: string, glRef: React.MutableRefObject<mgWebGLType>): Promise<boolean>;
    drawGemmiAtomPairs: (glRef: React.ForwardedRef<mgWebGLType>, gemmiAtomPairs: any[], style: string,  colour: number[], labelled?: boolean, clearBuffers?: boolean) => void;
    drawEnvironment: (glRef: React.RefObject<mgWebGLType>, chainID: string, resNo: number,  altLoc: string, labelled?: boolean) => Promise<void>;
    centreOn: (glRef: React.ForwardedRef<mgWebGLType>, selectionCid: string, animate?: boolean) => Promise<void>;
    drawHover: (glRef: React.MutableRefObject<mgWebGLType>, cid: string) => Promise<void>;
    clearBuffersOfStyle: (style: string, glRef: React.RefObject<mgWebGLType>) => void;
    type: string;
    commandCentre: MoorhenCommandCentreRef;
    enerLib: any;
    HBondsAssigned: boolean;
    atomsDirty: boolean;
    isVisible: boolean;
    name: string;
    molNo: number;
    gemmiStructure: GemmiStructureInterface;
    sequences: MoorhenSequenceType[];
    colourRules: MoleculeColourRuleType[];
    ligands: MoorhenLigandInfoType[];
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
    cootBondsOptions: cootBondOptionsType;
    displayObjects: {
        CBs: DisplayObjectType[];
        CRs: DisplayObjectType[];
        ligands: DisplayObjectType[];
        gaussian: DisplayObjectType[];
        MolecularSurface: DisplayObjectType[];
        VdWSurface: DisplayObjectType[];
        DishyBases: DisplayObjectType[];
        VdwSpheres: DisplayObjectType[];
        rama: DisplayObjectType[];
        rotamer: DisplayObjectType[];
        CDs: DisplayObjectType[];
        allHBonds: DisplayObjectType[];
        hover: DisplayObjectType[];
        selection: DisplayObjectType[];
        originNeighbours: DisplayObjectType[];
        originNeighboursHBond: DisplayObjectType[];
        originNeighboursBump: DisplayObjectType[];
        transformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
    };
    uniqueId: string;
    monomerLibraryPath: string;
    applyTransform: (glRef: React.RefObject<mgWebGLType>) => Promise<void>;
    getAtoms(format?: string): Promise<WorkerResponseType>;
    hide: (style: string, glRef: React.RefObject<mgWebGLType>) => void;
    redraw: (glRef: React.RefObject<mgWebGLType>) => Promise<void>;
    setAtomsDirty: (newVal: boolean) => void;
    hasVisibleBuffers: (excludeBuffers?: string[]) => boolean;
    centreAndAlignViewOn(glRef: React.RefObject<mgWebGLType>, selectionCid: string, animate?: boolean): Promise<void>;
    buffersInclude: (bufferIn: { id: string; }) => boolean;
}

export class MoorhenMolecule implements MoorhenMoleculeInterface {
    
    type: string;
    commandCentre: MoorhenCommandCentreRef;
    enerLib: any;
    HBondsAssigned: boolean;
    atomsDirty: boolean;
    isVisible: boolean;
    name: string;
    molNo: number | null
    gemmiStructure: GemmiStructureInterface;
    sequences: MoorhenSequenceType[];
    colourRules: MoleculeColourRuleType[];
    ligands: MoorhenLigandInfoType[];
    ligandDicts: {[comp_id: string]: string};
    connectedToMaps: number[];
    excludedSegments: string[];
    excludedCids: string[];
    symmetryOn: boolean;
    symmetryRadius : number;
    symmetryMatrices: any;
    gaussianSurfaceSettings: {
        sigma: number;
        countourLevel: number;
        boxRadius: number;
        gridScale: number;
    };
    cootBondsOptions: cootBondOptionsType;
    displayObjects: {
        CBs: DisplayObjectType[];
        CRs: DisplayObjectType[];
        ligands: DisplayObjectType[];
        gaussian: DisplayObjectType[];
        MolecularSurface: DisplayObjectType[];
        VdWSurface: DisplayObjectType[];
        DishyBases: DisplayObjectType[];
        VdwSpheres: DisplayObjectType[];
        rama: DisplayObjectType[];
        rotamer: DisplayObjectType[];
        CDs: DisplayObjectType[];
        allHBonds: DisplayObjectType[];
        hover: DisplayObjectType[];
        selection: DisplayObjectType[];
        originNeighbours: DisplayObjectType[];
        originNeighboursHBond: DisplayObjectType[];
        originNeighboursBump: DisplayObjectType[];
        transformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
    };
    uniqueId: string;
    monomerLibraryPath: string
    
    constructor(commandCentre: MoorhenCommandCentreRef, monomerLibraryPath="./baby-gru/monomers") {
        this.type = 'molecule'
        this.commandCentre = commandCentre
        this.enerLib = new EnerLib()
        this.HBondsAssigned = false
        this.atomsDirty = true
        this.isVisible = true
        this.name = "unnamed"
        this.molNo = null
        this.gemmiStructure = null
        this.sequences = []
        this.colourRules = null
        this.ligands = null
        this.ligandDicts = {}
        this.connectedToMaps = null
        this.excludedSegments = []
        this.excludedCids = []
        this.symmetryOn = false
        this.symmetryRadius = 25
        this.symmetryMatrices = []
        this.gaussianSurfaceSettings = {
            sigma: 4.4,
            countourLevel: 4.0,
            boxRadius: 5.0,
            gridScale: 0.7
        }
        this.cootBondsOptions = {
            isDarkBackground: false,
            smoothness: 1,
            width: 0.1,
            atomRadiusBondRatio: 1
        }
        this.displayObjects = {
            CBs: [],
            CRs: [],
            ligands: [],
            gaussian: [],
            MolecularSurface: [],
            VdWSurface: [],
            DishyBases: [],
            VdwSpheres: [],
            rama: [],
            rotamer: [],
            CDs: [],
            allHBonds: [],
            hover: [],
            selection: [],
            originNeighbours: [],
            originNeighboursHBond: [],
            originNeighboursBump: [],
            transformation: { origin: [0, 0, 0], quat: null, centre: [0, 0, 0] }
        }
        this.uniqueId = guid()
        this.monomerLibraryPath = monomerLibraryPath
    }


    async replaceModelWithFile(glRef: React.RefObject<mgWebGLType>, fileUrl: string, molName: string): Promise<void> {
        let coordData: string
        let fetchResponse: Response
        
        try {
            fetchResponse = await fetch(fileUrl)
        } catch (err) {
            return Promise.reject(`Unable to fetch file ${fileUrl}`)
        }
        
        if (fetchResponse.ok) {
            coordData = await fetchResponse.text()
        } else {
            return Promise.reject(`Error fetching data from url ${fileUrl}`)
        }

        const cootResponse = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'shim_replace_molecule_by_model_from_file',
            commandArgs: [this.molNo, coordData]
        }, true)
        
        if (cootResponse.data.result.status === 'Completed') {
            this.atomsDirty = true
            return this.redraw(glRef)
        }
        
        return Promise.reject(cootResponse.data.result.status)
    }

    toggleSymmetry(glRef: React.RefObject<mgWebGLType>): Promise<void> {
        this.symmetryOn = !this.symmetryOn;
        return this.drawSymmetry(glRef)
    }

    setSymmetryRadius(radius: number, glRef: React.RefObject<mgWebGLType>): Promise<void> {
        this.symmetryRadius = radius
        return this.drawSymmetry(glRef)
    }

    async fetchSymmetryMatrix(glRef: React.RefObject<mgWebGLType>): Promise<void> {
        if(!this.symmetryOn) {
            this.symmetryMatrices = []
        } else {
            const selectionCentre: number[] = glRef.current.origin.map(coord => -coord)
            const response = await this.commandCentre.current.cootCommand({
                returnType: "symmetry",
                command: 'get_symmetry_with_matrices',
                commandArgs: [this.molNo, this.symmetryRadius, ...selectionCentre]
            }, true)
            this.symmetryMatrices = response.data.result.result.map(symm => symm.matrix)    
        }
    }

    async drawSymmetry(glRef: React.RefObject<mgWebGLType>, fetchSymMatrix: boolean = true): Promise<void> {
        if (fetchSymMatrix) {
            await this.fetchSymmetryMatrix(glRef)
        }
        Object.keys(this.displayObjects)
            .filter(key => !['hover', 'originNeighbours', 'selection', 'transformation', 'contact_dots', 'chemical_features', 'VdWSurface'].some(style => key.includes(style)))
            .forEach(displayObjectType => {
                if(this.displayObjects[displayObjectType].length > 0) {
                    this.displayObjects[displayObjectType].forEach((displayObject: DisplayObjectType) => {
                        displayObject.symmetryMatrices = this.symmetryMatrices
                    })
                }
        })
        glRef.current.drawScene()
    }

    setBackgroundColour(backgroundColour: [number, number, number, number]) {
        this.cootBondsOptions.isDarkBackground = isDarkBackground(...backgroundColour)
    }

    async updateGemmiStructure(): Promise<void> {
        if (this.gemmiStructure && !this.gemmiStructure.isDeleted()) {
            this.gemmiStructure.delete()
        }
        let response = await this.getAtoms()
        this.gemmiStructure = readGemmiStructure(response.data.result.pdbData, this.name)
        window.CCP4Module.gemmi_setup_entities(this.gemmiStructure)
        this.parseSequences()
        this.updateLigands()
        return Promise.resolve()
    }

    getUnitCellParams():  { a: number; b: number; c: number; alpha: number; beta: number; gamma: number; } {
        if (this.gemmiStructure === null) {
            return
        }

        const structure = this.gemmiStructure.clone()
        const unitCell = this.gemmiStructure.cell

        const unitCellParams = {
            a: unitCell.a,
            b: unitCell.b,
            c: unitCell.c,
            alpha: unitCell.alpha,
            beta: unitCell.beta,
            gamma: unitCell.gamma
        }

        structure.delete()
        unitCell.delete()

        return unitCellParams
    }

    parseSequences(): void {
        if (this.gemmiStructure === null) {
            return
        }

        let sequences: MoorhenSequenceType[] = []
        const structure = this.gemmiStructure.clone()
        try {
            const models = structure.models
            const modelsSize = models.size()
            for (let modelIndex = 0; modelIndex < modelsSize; modelIndex++) {
                const model = models.get(modelIndex)
                const chains = model.chains
                const chainsSize = chains.size()
                for (let chainIndex = 0; chainIndex < chainsSize; chainIndex++) {
                    let currentSequence: MoorhenResidueInfoType[] = []
                    const chain = chains.get(chainIndex)
                    window.CCP4Module.remove_ligands_and_waters_chain(chain)
                    const residues = chain.residues
                    const chainName = chain.name
                    const polymerConst = chain.get_polymer_const()
                    const polymerType = window.CCP4Module.check_polymer_type(polymerConst)
                    const polymerTypeValue: number = polymerType.value
                    let threeToOne = [3, 4, 5].includes(polymerTypeValue) ? nucleotideCodesThreeToOne : residueCodesThreeToOne
                    const residuesSize = residues.size()
                    for (let residueIndex = 0; residueIndex < residuesSize; residueIndex++) {
                        const residue = residues.get(residueIndex)
                        const resName = residue.name
                        const residueSeqId = residue.seqid
                        const resNum = residueSeqId.str()
                        currentSequence.push({
                            resNum: Number(resNum),
                            resCode: Object.keys(threeToOne).includes(resName) ? threeToOne[resName] : 'X',
                            cid: `//${chainName}/${resNum}(${resName})/`
                        })
                        residue.delete()
                        residueSeqId.delete()
                    }
                    if (currentSequence.length > 0) {
                        sequences.push({
                            name: `${this.name}_${chainName}`,
                            chain: chainName,
                            type: polymerTypeValue,
                            sequence: currentSequence,
                        })
                    }
                    chain.delete()
                    residues.delete()
                    polymerConst.delete()
                }
                model.delete()
                chains.delete()
            }
            models.delete()
        } finally {
            if (structure && !structure.isDeleted()) {
                structure.delete()
            }
        }

        this.sequences = sequences
    }

    async delete(glRef: React.RefObject<mgWebGLType>): Promise<WorkerResponseType> {
        const $this = this
        Object.getOwnPropertyNames(this.displayObjects).forEach(displayObject => {
            if (this.displayObjects[displayObject].length > 0) { this.clearBuffersOfStyle(displayObject, glRef) }
        })
        glRef.current.drawScene()
        const inputData = { message: "delete", molNo: $this.molNo }
        const response = await $this.commandCentre.current.postMessage(inputData)
        if ($this.gemmiStructure && !$this.gemmiStructure.isDeleted()) {
            $this.gemmiStructure.delete()
        }
        return response
    }

    async copyMolecule(glRef: React.RefObject<mgWebGLType>): Promise<MoorhenMoleculeInterface> {

        let moleculeAtoms = await this.getAtoms()
        let newMolecule = new MoorhenMolecule(this.commandCentre, this.monomerLibraryPath)
        newMolecule.name = `${this.name}-placeholder`
        newMolecule.cootBondsOptions = this.cootBondsOptions

        let response = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'shim_read_pdb',
            commandArgs: [moleculeAtoms.data.result.pdbData, newMolecule.name]
        }, true)

        newMolecule.molNo = response.data.result.result

        await Promise.all(Object.keys(this.ligandDicts).map(key => newMolecule.addDict(this.ligandDicts[key])))
        await newMolecule.fetchIfDirtyAndDraw('CBs', glRef)
        
        return newMolecule
    }

    async copyFragment(chainId: string, res_no_start: number, res_no_end: number, glRef: React.RefObject<mgWebGLType>, doRecentre: boolean = true): Promise<MoorhenMoleculeInterface>{
        const $this = this
        const inputData = { message: "copy_fragment", molNo: $this.molNo, chainId: chainId, res_no_start: res_no_start, res_no_end: res_no_end }
        const response = await $this.commandCentre.current.postMessage(inputData)
        const newMolecule = new MoorhenMolecule($this.commandCentre, $this.monomerLibraryPath)
        newMolecule.name = `${$this.name} fragment`
        newMolecule.molNo = response.data.result.result
        newMolecule.cootBondsOptions = $this.cootBondsOptions
        await Promise.all(Object.keys(this.ligandDicts).map(key => newMolecule.addDict(this.ligandDicts[key])))
        await newMolecule.fetchIfDirtyAndDraw('CBs', glRef)
        if (doRecentre) await newMolecule.centreOn(glRef)

        return newMolecule
    }

    async copyFragmentUsingCid(cid: string, backgroundColor: [number, number, number, number], defaultBondSmoothness: number, glRef: React.RefObject<mgWebGLType>, doRecentre: boolean = true): Promise<MoorhenMoleculeInterface> {
        const $this = this
        const response = await $this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "copy_fragment_using_cid",
            commandArgs: [$this.molNo, cid],
            changesMolecules: [$this.molNo]
        }, true);
        const newMolecule = new MoorhenMolecule($this.commandCentre, $this.monomerLibraryPath);
        newMolecule.name = `${$this.name} fragment`;
        newMolecule.molNo = response.data.result.result;
        newMolecule.setBackgroundColour(backgroundColor);
        newMolecule.cootBondsOptions.smoothness = defaultBondSmoothness;
        await Promise.all(Object.keys(this.ligandDicts).map(key => newMolecule.addDict(this.ligandDicts[key])));
        return await Promise.resolve(newMolecule);
    }

    async loadToCootFromURL (url: RequestInfo | URL, molName: string): Promise<MoorhenMoleculeInterface> {
        const $this = this
        const response = await fetch(url)
        try {
            if (response.ok) {
                const coordData = await response.text()
                return $this.loadToCootFromString(coordData, molName)
            } else {
                return Promise.reject(`Error fetching data from url ${url}`)
            }

        } catch(err) {
            return Promise.reject(err)
        }
    }

    async loadToCootFromFile(source: Blob): Promise<MoorhenMoleculeInterface> {
        const $this = this
        try {
            const coordData = await readTextFile(source);
            return await $this.loadToCootFromString(coordData, source.name);
        } catch (err) {
            return await Promise.reject(err);
        }
    }

    async loadToCootFromString(coordData: ArrayBuffer | string, name: string): Promise<MoorhenMoleculeInterface> {
        const $this = this
        const pdbRegex = /.pdb$/;
        const entRegex = /.ent$/;
        const cifRegex = /.cif$/;
        const mmcifRegex = /.mmcif$/;

        if ($this.gemmiStructure && !$this.gemmiStructure.isDeleted()) {
            $this.gemmiStructure.delete()
        }

        $this.name = name.replace(pdbRegex, "").replace(entRegex, "").replace(cifRegex, "").replace(mmcifRegex, "");
        $this.gemmiStructure = readGemmiStructure(coordData, $this.name)
        window.CCP4Module.gemmi_setup_entities($this.gemmiStructure)
        $this.parseSequences()
        $this.updateLigands()
        $this.atomsDirty = false

        return this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'shim_read_pdb',
            commandArgs: [coordData, $this.name],
            changesMolecules: [$this.molNo]
        }, true)
            .then(response => {
                $this.molNo = response.data.result.result
                return Promise.resolve($this)
            })
            .then(molecule => molecule.loadMissingMonomers())
            .catch(err => {
                console.log('Error in loadToCootFromString', err);
                return Promise.reject(err)
            })
    }

    async loadMissingMonomer(newTlc: string, attachToMolecule: number): Promise<WorkerResponseType> {
        const $this = this
        let response: Response = await fetch(`${$this.monomerLibraryPath}/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`)
        const fileContent = await response.text()
        let dictContent: string
        
        if (!fileContent.includes('data_')) {
            try {
                response = await fetch(`https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/${newTlc.toUpperCase()}.cif`);
                if (response.ok) {
                    dictContent = await response.text();
                } else {
                    console.log(`Unable to fetch ligand dictionary ${newTlc}`)
                    return
                }    
            } catch {
                console.log(`Unable to fetch ligand dictionary ${newTlc}`)
                return
            }
        } else {
            dictContent = fileContent
        }

        return $this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'shim_read_dictionary',
            commandArgs: [dictContent, attachToMolecule],
            changesMolecules: []
        }, true)
    }

    async loadMissingMonomers(): Promise<MoorhenMoleculeInterface> {
        const $this = this
        const response = await $this.commandCentre.current.cootCommand({
            returnType: "string_array",
            command: 'get_residue_names_with_no_dictionary',
            commandArgs: [$this.molNo],
        }, false)
        
        if (response.data.result.status === 'Completed') {
            let monomerPromises = []
            response.data.result.result.forEach(newTlc => {
                const newPromise = $this.loadMissingMonomer(newTlc, -999999)
                monomerPromises.push(newPromise)
            })
            try {
                await Promise.all(monomerPromises)
            } catch(err) {
                console.log('Error in loadMissingMonomers...', err);
            }
        } else {
            console.log('Error in loadMissingMonomers...');
        }

        return $this
    }

    setAtomsDirty(state: boolean): void {
        this.atomsDirty = state
    }

    getAtoms(format: string = 'pdb'): Promise<WorkerResponseType> {
        const $this = this;
        return $this.commandCentre.current.postMessage({
            message: "get_atoms",
            molNo: $this.molNo,
            format: format
        })
    }

    async updateAtoms() {
        const $this = this;
        if ($this.gemmiStructure && !$this.gemmiStructure.isDeleted()) {
            $this.gemmiStructure.delete()
        }
        return $this.getAtoms().then((result) => {
            return new Promise<void>((resolve, reject) => {
                try {
                    $this.gemmiStructure = readGemmiStructure(result.data.result.pdbData, $this.name)
                    window.CCP4Module.gemmi_setup_entities($this.gemmiStructure)
                    $this.parseSequences()
                    $this.updateLigands()
                }
                catch (err) {
                    console.log('Issue parsing coordinates into Gemmi structure', result.data.result.pdbData)
                    reject()
                }
                $this.atomsDirty = false
                resolve()
            })
        })
    }

    async fetchIfDirtyAndDraw(style: string, glRef: React.RefObject<mgWebGLType>): Promise<boolean> {
        if (this.atomsDirty) {
            await this.updateAtoms()
        }
        return this.drawWithStyleFromAtoms(style, glRef)
    }

    async centreAndAlignViewOn(glRef: React.RefObject<mgWebGLType>, selectionCid: string, animate: boolean = true): Promise<void> {

        if (this.atomsDirty) {
            await this.updateAtoms()
        }
        
        let selectionAtomsAlign: MoorhenAtomInfoType[] = []
        let selectionAtomsCentre: MoorhenAtomInfoType[] = []
        if (selectionCid) {
            selectionAtomsAlign = await this.gemmiAtomsForCid(selectionCid + "*")
            selectionAtomsCentre = await this.gemmiAtomsForCid(selectionCid + "CA")

        } else {
            selectionAtomsAlign = await this.gemmiAtomsForCid('/*/*/*/*')
            selectionAtomsCentre = await this.gemmiAtomsForCid('/*/*/*/*')
        }
    
        let CA: number[]
        let C: number[]
        let O: number[]

        selectionAtomsAlign.forEach(atom => {
            if (atom.name === "CA") {
                CA = [atom.x, atom.y, atom.z]
            }
            if (atom.name === "C") {
                C = [atom.x, atom.y, atom.z]
            }
            if (atom.name === "O") {
                O = [atom.x, atom.y, atom.z]
            }
        })

        let newQuat = null

        if (C && CA && O) {
            let right = vec3.create()
            vec3.set(right, C[0] - CA[0], C[1] - CA[1], C[2] - CA[2])
            let rightNorm = vec3.create()
            vec3.normalize(rightNorm, right);

            let upInit = vec3.create()
            vec3.set(upInit, O[0] - C[0], O[1] - C[1], O[2] - C[2])
            let upInitNorm = vec3.create()
            vec3.normalize(upInitNorm, upInit);

            let forward = vec3.create()
            vec3.cross(forward, right, upInitNorm)
            let forwardNorm = vec3.create()
            vec3.normalize(forwardNorm, forward);

            let up = vec3.create()
            vec3.cross(up, forwardNorm, rightNorm)
            let upNorm = vec3.create()
            vec3.normalize(upNorm, up);

            newQuat = quat4.create()
            let mat = mat3.create()
            const [right_x, right_y, right_z] = [rightNorm[0], rightNorm[1], rightNorm[2]]
            const [up_x, up_y, up_z] = [upNorm[0], upNorm[1], upNorm[2]]
            const [formaward_x, formaward_y, formaward_z] = [forwardNorm[0], forwardNorm[1], forwardNorm[2]]
            mat3.set(mat, right_x, right_y, right_z, up_x, up_y, up_z, formaward_x, formaward_y, formaward_z)
            quat4.fromMat3(newQuat, mat)
        }

        let selectionCentre = centreOnGemmiAtoms(selectionAtomsCentre)
        if (newQuat) {
            glRef.current.setOriginOrientationAndZoomAnimated(selectionCentre, newQuat, 0.20);
        }
    }

    async centreOn(glRef: React.RefObject<mgWebGLType>, selectionCid: string = '/*/*/*/*', animate: boolean = true): Promise<void> {
        if (this.atomsDirty) {
            await this.updateAtoms()
        }

        const selectionAtoms = await this.gemmiAtomsForCid(selectionCid)

        if (selectionAtoms.length === 0) {
            console.log('Unable to selet any atoms, skip centering...')
            return
        }

        let selectionCentre = centreOnGemmiAtoms(selectionAtoms)

        if (animate) {
            glRef.current.setOriginAnimated(selectionCentre);
        } else {
            glRef.current.setOrigin(selectionCentre);
        }
    }

    async drawWithStyleFromMesh(style: string, glRef: React.RefObject<mgWebGLType>, meshObjects: any[], newBufferAtoms: MoorhenAtomInfoType[] = []): Promise<void>{
        this.clearBuffersOfStyle(style, glRef)
        if (meshObjects.length > 0 && !this.gemmiStructure.isDeleted()) {
            this.addBuffersOfStyle(glRef, meshObjects, style)
            let bufferAtoms: MoorhenAtomInfoType[]
            if (newBufferAtoms.length > 0) {
                bufferAtoms = newBufferAtoms
            } else {
                bufferAtoms = await this.gemmiAtomsForCid('/*/*/*/*')
            }
            this.displayObjects[style][0].atoms = bufferAtoms.filter(atom => !this.excludedCids.includes(`//${atom.chain_id}/${atom.res_no}-${atom.res_no}/*`)).map(atom => {                   
                const { pos, x, y, z, charge, label, symbol } = atom
                const tempFactor = atom.tempFactor
                return { pos, x, y, z, charge, tempFactor, symbol, label }
            })
        }
    }

    async drawWithStyleFromAtoms(style: string, glRef: React.RefObject<mgWebGLType>) {
        switch (style) {
            case 'allHBonds':
                this.drawAllHBonds(glRef)
                break;
            case 'rama':
                this.drawRamachandranBalls(glRef)
                break;
            case 'rotamer':
                this.drawRotamerDodecahedra(glRef)
                break;
            case 'VdwSpheres':
            case 'CBs':
                await this.drawCootBonds(glRef,style)
                break;
            case 'CDs':
                await this.drawCootContactDots(glRef)
                break;
            case 'gaussian':
                await this.drawCootGaussianSurface(glRef)
                break;
            case 'CRs':
            case 'MolecularSurface':
            case 'DishyBases':
            case 'VdWSurface':
            case 'Calpha':
                await this.drawCootRepresentation(glRef, style)
                break;
            case 'ligands':
                await this.drawCootLigands(glRef)
                break;
            default:
                if (style.startsWith("chemical_features")) {
                    await this.drawCootChemicalFeaturesCid(glRef, style)
                }
                if (style.startsWith("contact_dots")) {
                    await this.drawCootContactDotsCid(glRef, style)
                }
                break;
        }
        return Promise.resolve(true)
    }

    addBuffersOfStyle(glRef: React.RefObject<mgWebGLType>, objects: any[], style: string) {
        const $this = this
        objects.filter(object => typeof object !== 'undefined' && object !== null).forEach(object => {
            const a = glRef.current.appendOtherData(object, true);
            $this.displayObjects[style] = $this.displayObjects[style].concat(a)
        })
        glRef.current.buildBuffers();
        glRef.current.drawScene();
    }

    async drawAllHBonds(glRef: React.RefObject<mgWebGLType>) {
        const style = "allHBonds"
        //Empty existing buffers of this type
        this.clearBuffersOfStyle(style, glRef)
        this.drawHBonds(glRef, "/*/*/*", style, false) 
    }

    async drawRamachandranBalls(glRef: React.RefObject<mgWebGLType>) {
        const $this = this
        const style = "rama"
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_ramachandran_validation_markup_mesh",
            commandArgs: [$this.molNo]
        });
        const objects = [response.data.result.result];
        //Empty existing buffers of this type
        this.clearBuffersOfStyle(style, glRef);
        this.addBuffersOfStyle(glRef, objects, style);
    }

    async drawCootContactDotsCid(glRef: React.RefObject<mgWebGLType>, style: string) {
        const $this = this
        const cid = style.substr("contact_dots-".length)

        try {
            const response = await this.commandCentre.current.cootCommand({
                returnType: "instanced_mesh",
                command: "contact_dots_for_ligand",
                commandArgs: [$this.molNo, cid, $this.cootBondsOptions.smoothness]
            });
            const objects = [response.data.result.result];
            //Empty existing buffers of this type
            this.clearBuffersOfStyle(style, glRef);
            this.addBuffersOfStyle(glRef, objects, style);
        } catch (err) {
            return console.log(err);
        }
    }

    async drawCootChemicalFeaturesCid(glRef: React.RefObject<mgWebGLType>, style: string) {
        const $this = this
        const cid = style.substr("chemical_features-".length)

        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_chemical_features_mesh",
            commandArgs: [$this.molNo, cid]
        }) 
        try {
            const objects = [response.data.result.result]
            //Empty existing buffers of this type
            this.clearBuffersOfStyle(style, glRef)
            this.addBuffersOfStyle(glRef, objects, style)
        } catch(err) {
            console.log(err)
        }
    }

    async drawCootContactDots(glRef: React.RefObject<mgWebGLType>) {

        const $this = this
        const style = "CDs"

        const response = await this.commandCentre.current.cootCommand({
            returnType: "instanced_mesh",
            command: "all_molecule_contact_dots",
            commandArgs: [$this.molNo, $this.cootBondsOptions.smoothness]
        })
        try {
            const objects = [response.data.result.result]
            //Empty existing buffers of this type
            this.clearBuffersOfStyle(style, glRef)
            this.addBuffersOfStyle(glRef, objects, style)
        } catch(err) {
            console.log(err)
        }
    }

    async drawRotamerDodecahedra(glRef: React.RefObject<mgWebGLType>): Promise<void> {
        const $this = this
        const style = "rotamer"
        const response = await this.commandCentre.current.cootCommand({
            returnType: "instanced_mesh_perm",
            command: "get_rotamer_dodecs_instanced",
            commandArgs: [$this.molNo]
        })
        try {
            const objects = [response.data.result.result]
            this.clearBuffersOfStyle(style, glRef)
            this.addBuffersOfStyle(glRef, objects, style)
        } catch(err){
            console.log(err)
        }
    }

    drawCootLigands(glRef: React.RefObject<mgWebGLType>) {
        const $this = this
        const name = "ligands"
        const ligandsCID = "/*/*/(!ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR,WAT,HOH,THP,SEP,TPO,TYP,PTR,OH2,H2O)"
        return $this.drawCootSelectionBonds(glRef, name, ligandsCID)
    }

    drawCootBonds(glRef: React.RefObject<mgWebGLType>, style: string) {
        const $this = this
        const name = style
        return $this.drawCootSelectionBonds(glRef, name, null)
    }

    async drawCootSelectionBonds(glRef: React.RefObject<mgWebGLType>, name: string, cid: null | string): Promise<boolean> {
        const $this = this
        let meshCommand: Promise<WorkerResponseType>

        let style = "COLOUR-BY-CHAIN-AND-DICTIONARY"
        let returnType = "instanced_mesh"
        if(name === "VdwSpheres"){
            style = "VDW-BALLS"
            returnType = "instanced_mesh_perfect_spheres"
        }

        if (typeof cid === 'string') {
            meshCommand = $this.commandCentre.current.cootCommand({
                returnType: returnType,
                command: "get_bonds_mesh_for_selection_instanced",
                commandArgs: [
                    $this.molNo,
                    cid,
                    style,
                    $this.cootBondsOptions.isDarkBackground,
                    $this.cootBondsOptions.width * 1.5,
                    $this.cootBondsOptions.atomRadiusBondRatio * 1.5,
                    $this.cootBondsOptions.smoothness
                ]
            })
        } else {
            cid = "/*/*/*/*"
            meshCommand = $this.commandCentre.current.cootCommand({
                returnType: returnType,
                command: "get_bonds_mesh_instanced",
                commandArgs: [
                    $this.molNo,
                    style,
                    $this.cootBondsOptions.isDarkBackground,
                    $this.cootBondsOptions.width,
                    $this.cootBondsOptions.atomRadiusBondRatio,
                    $this.cootBondsOptions.smoothness
                ]
            })
        }

        const response = await meshCommand
        const objects = [response.data.result.result]
        if (objects.length > 0 && !this.gemmiStructure.isDeleted()) {
            //Empty existing buffers of this type
            this.clearBuffersOfStyle(name, glRef)
            this.addBuffersOfStyle(glRef, objects, name)
            let bufferAtoms = await this.gemmiAtomsForCid(cid)
            if (bufferAtoms.length > 0) {
                this.displayObjects[name][0].atoms = bufferAtoms.filter(atom => !this.excludedCids.includes(`//${atom.chain_id}/${atom.res_no}/*`)).map(atom => {
                    const { pos, x, y, z, charge, label, symbol } = atom
                    const tempFactor = atom.tempFactor
                    return { pos, x, y, z, charge, tempFactor, symbol, label }
                })
            }
        } else {
            this.clearBuffersOfStyle(name, glRef)
        }
        return Promise.resolve(true)
    }

    async drawCootGaussianSurface(glRef: React.RefObject<mgWebGLType>): Promise<boolean> {
        const $this = this
        const style = "gaussian"
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_gaussian_surface",
            commandArgs: [
                $this.molNo, $this.gaussianSurfaceSettings.sigma,
                $this.gaussianSurfaceSettings.countourLevel,
                $this.gaussianSurfaceSettings.boxRadius,
                $this.gaussianSurfaceSettings.gridScale
            ]
        })
        try {
            const objects = [response.data.result.result]
            if (objects.length > 0 && !this.gemmiStructure.isDeleted()) {
                const flippedNormalsObjects = objects.map(object => {
                    const flippedNormalsObject = { ...object }
                    /*
                    flippedNormalsObject.norm_tri = object.norm_tri.map(
                        element => element.map(subElement => subElement.map(coord => coord * -1.))
                    )
                    */
                    flippedNormalsObject.idx_tri = object.idx_tri.map(
                        element => element.map(subElement => subElement.reverse())
                    )
                    return flippedNormalsObject
                })
                //Empty existing buffers of this type
                this.clearBuffersOfStyle(style, glRef)
                this.addBuffersOfStyle(glRef, flippedNormalsObjects, style)
            }
            else {
                this.clearBuffersOfStyle(style, glRef)
            }
            return Promise.resolve(true)
        } catch (err) {
            console.log(err)
        }
    }

    async drawCootRepresentation(glRef: React.RefObject<mgWebGLType>, style: string): Promise<boolean> {
        const $this = this
        let m2tStyle: string
        let m2tSelection: string

        switch (style) {
            case "CRs":
                m2tStyle = "Ribbon"
                m2tSelection = "//"
                break;
            case "MolecularSurface":
                m2tStyle = "MolecularSurface"
                m2tSelection = "(ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,MSE,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR)"
                break;
            case "VdWSurface":
                m2tStyle = "VdWSurface"
                m2tSelection = "(ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,MSE,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR)"
                break;
            case "DishyBases":
                m2tStyle = "DishyBases"
                m2tSelection = "(ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR)"
                break;
            case "Calpha":
                m2tStyle = "Calpha"
                m2tSelection = "(ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,MSE,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR)"
                break;
            case "ligands":
                m2tStyle = "Cylinders"
                m2tSelection = "(!ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,MSE,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR,HOH)"
                break;
            default:
                m2tStyle = "Ribbon"
                m2tSelection = "//"
                break;
        }

        if (this.excludedSegments.length > 0){
            m2tSelection = `{${m2tSelection} & !{${this.excludedSegments.join(' | ')}}}`
        }

        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_molecular_representation_mesh",
            commandArgs: [
                $this.molNo, m2tSelection, "colorRampChainsScheme", m2tStyle
            ]
        })
        
        let objects = [response.data.result.result]
        try {
            if (objects.length > 0 && !this.gemmiStructure.isDeleted()) {
                //Empty existing buffers of this type
                if (["Cylinders", "DishyBases"].includes(m2tStyle)) {
                    objects = objects.map(object => {
                        const flippedNormalsObject = { ...object }
                        flippedNormalsObject.idx_tri = object.idx_tri.map(
                            element => element.map(subElement => subElement.reverse())
                        )
                        return flippedNormalsObject
                    })
                }
                this.clearBuffersOfStyle(style, glRef)
                this.addBuffersOfStyle(glRef, objects, style)
                let bufferAtoms = getBufferAtoms(this.gemmiStructure.clone())
                if (bufferAtoms.length > 0 && this.displayObjects[style].length > 0) {
                        this.displayObjects[style][0].atoms = bufferAtoms
                }
            } else {
                this.clearBuffersOfStyle(style, glRef)
            }
            return Promise.resolve(true)    
        } catch(err){
            console.log(err)
        }
    }

    async show(style: string, glRef: React.RefObject<mgWebGLType>): Promise<void> {
        if (!this.displayObjects[style]) {
            this.displayObjects[style] = []
        }
        try {
            if (this.displayObjects[style].length === 0) {
                await this.fetchIfDirtyAndDraw(style, glRef)
                glRef.current.drawScene()    
            }
            else {
                this.displayObjects[style].forEach(displayBuffer => {
                    displayBuffer.visible = true
                })
                glRef.current.drawScene()
            }
            this.drawSymmetry(glRef, false)    
        } catch (err) {
            console.log(err)
        }
    }

    hide(style: string, glRef: React.RefObject<mgWebGLType>) {
        this.displayObjects[style].forEach(displayBuffer => {
            displayBuffer.visible = false
        })
        glRef.current.drawScene()
    }

    webMGAtomsFromFileString(fileString: string) {
        const $this = this
        let result = { atoms: [] }
        let possibleIndentedLines = fileString.split("\n");
        let unindentedLines = possibleIndentedLines.map(line => line.trim())
        try {
            result = parseMMCIF(unindentedLines, $this.name);
            if (typeof result.atoms === 'undefined') {
                result = parsePDB(unindentedLines, $this.name)
            }
        }
        catch (err) {
            result = parsePDB(unindentedLines, $this.name)
        }
        return result
    }

    clearBuffersOfStyle(style: string, glRef: React.RefObject<mgWebGLType>) {
        const $this = this
        //Empty existing buffers of this type
        $this.displayObjects[style].forEach((buffer) => {
            if("clearBuffers" in buffer){
                buffer.clearBuffers()
                if (glRef.current.displayBuffers) {
                    glRef.current.displayBuffers = glRef.current.displayBuffers.filter(glBuffer => glBuffer !== buffer)
                }
            } else if("labels" in buffer){
                glRef.current.labelsTextCanvasTexture.removeBigTextureTextImages(buffer.labels)
            }
        })
        glRef.current.buildBuffers()
        $this.displayObjects[style] = []
    }

    buffersInclude(bufferIn: { id: string; }): boolean {
        const $this = this
        const BreakException = {};
        try {
            Object.getOwnPropertyNames($this.displayObjects).forEach(style => {
                if (Array.isArray($this.displayObjects[style])) {
                    const objectBuffers = $this.displayObjects[style].filter(buffer => bufferIn.id === buffer.id)
                    if (objectBuffers.length > 0) {
                        throw BreakException;
                    }
                }
            })
        }
        catch (e) {
            if (e !== BreakException) throw e;
            return true
        }
        return false
    }

    drawBonds(webMGAtoms: any, glRef: React.RefObject<mgWebGLType>, colourSchemeIndex: number): void {
        const $this = this
        const style = "bonds"

        if (typeof webMGAtoms["atoms"] === 'undefined') return;
        var model = webMGAtoms["atoms"][0];

        const colourScheme = new ColourScheme(webMGAtoms);
        var atomColours = colourScheme.colourByChain({
            "nonCByAtomType": true,
            'C': colourScheme.order_colours[colourSchemeIndex % colourScheme.order_colours.length]
        });

        var contactsAndSingletons = model.getBondsContactsAndSingletons();

        var contacts = contactsAndSingletons["contacts"];
        var singletons = contactsAndSingletons["singletons"];
        var linePrimitiveInfo = contactsToCylindersInfo(contacts, 0.1, atomColours);
        var singletonPrimitiveInfo = singletonsToLinesInfo(singletons, 4, atomColours);
        var linesAndSpheres = []

        linesAndSpheres.push(linePrimitiveInfo);
        linesAndSpheres.push(singletonPrimitiveInfo);

        var nonHydrogenAtoms = model.getAtoms("not [H]");
        var nonHydrogenPrimitiveInfo = atomsToSpheresInfo(nonHydrogenAtoms, 0.13, atomColours);
        linesAndSpheres.push(nonHydrogenPrimitiveInfo);

        const objects = linesAndSpheres.filter(item => {
            return typeof item.sizes !== "undefined" &&
                item.sizes.length > 0 &&
                item.sizes[0].length > 0 &&
                item.sizes[0][0].length > 0
        })
        $this.clearBuffersOfStyle(style, glRef)
        this.addBuffersOfStyle(glRef, objects, style)
    }

    drawLigands(webMGAtoms: any, glRef: React.RefObject<mgWebGLType>) {
        const $this = this
        const style = "ligands"
        if (typeof webMGAtoms["atoms"] === 'undefined') return;

        //Attempt to apply selection, storing old hierarchy
        const selectionString = "ligands_old"
        const oldHierarchy = webMGAtoms.atoms
        let selectedAtoms = null
        if (typeof selectionString === 'string') {
            try {
                selectedAtoms = webMGAtoms.atoms[0].getAtoms(selectionString)
                if (selectedAtoms.length === 0) {
                    webMGAtoms.atoms = oldHierarchy
                    return
                }
                webMGAtoms.atoms = atomsToHierarchy(selectedAtoms)
            }
            catch (err) {
                webMGAtoms.atoms = oldHierarchy
                return
            }
        }
        if (selectedAtoms == null) return
        var model = webMGAtoms.atoms[0];

        const colourScheme = new ColourScheme(webMGAtoms);
        var atomColours = colourScheme.colourOneColour([0.8, 0.5, 0.2, 0.3])
        let linesAndSpheres = []
        var nonHydrogenAtoms = model.getAtoms("not [H]");
        var nonHydrogenPrimitiveInfo = atomsToSpheresInfo(nonHydrogenAtoms, 0.3, atomColours);
        linesAndSpheres.push(nonHydrogenPrimitiveInfo);

        //Restore old hierarchy
        webMGAtoms.atoms = oldHierarchy

        const objects = linesAndSpheres.filter(item => {
            return typeof item.sizes !== "undefined" &&
                item.sizes.length > 0 &&
                item.sizes[0].length > 0 &&
                item.sizes[0][0].length > 0
        })
        $this.clearBuffersOfStyle(style, glRef)
        this.addBuffersOfStyle(glRef, objects, style)
    }

    drawGemmiAtomPairs(glRef: React.RefObject<mgWebGLType>, gemmiAtomPairs: any[], style: string,  colour: number[], labelled: boolean = false, clearBuffers: boolean = false) {
        const $this = this
        const atomColours = {}
        gemmiAtomPairs.forEach(atom => { atomColours[`${atom[0].serial}`] = colour; atomColours[`${atom[1].serial}`] = colour })
        let objects = [
            gemmiAtomPairsToCylindersInfo(gemmiAtomPairs, 0.07, atomColours, labelled) 
        ]
        if (clearBuffers){
            $this.clearBuffersOfStyle(style, glRef)
        }
        $this.addBuffersOfStyle(glRef, objects, style)
    }

    async drawResidueHighlight(glRef: React.RefObject<mgWebGLType>, style: string, selectionString: string, colour: number[], clearBuffers: boolean = false): Promise<void> {
        const $this = this

        if (typeof selectionString === 'string') {
            const resSpec: MoorhenResidueSpecType = cidToSpec(selectionString)
            const modifiedSelection = `/*/${resSpec.chain_id}/${resSpec.res_no}-${resSpec.res_no}/*${resSpec.alt_conf === "" ? "" : ":"}${resSpec.alt_conf}`
            const selectedGemmiAtoms = await $this.gemmiAtomsForCid(modifiedSelection)
            const atomColours = {}
            selectedGemmiAtoms.forEach(atom => { atomColours[`${atom.serial}`] = colour })
            let objects = [
                gemmiAtomsToCirclesSpheresInfo(selectedGemmiAtoms, 0.3, "POINTS_SPHERES", atomColours)
            ]
            if (clearBuffers){
                $this.clearBuffersOfStyle(style, glRef)
            }
            $this.addBuffersOfStyle(glRef, objects, style)
        }
    }

    async drawHover(glRef: React.RefObject<mgWebGLType>, selectionString: string): Promise<void> {
        await this.drawResidueHighlight(glRef, 'hover', selectionString, [1.0, 0.5, 0.0, 0.35], true)
    }

    async drawSelection(glRef: React.RefObject<mgWebGLType>, selectionString: string): Promise<void> {
        await this.drawResidueHighlight(glRef, 'selection', selectionString, [1.0, 0.0, 0.0, 0.35], false)
    }

    drawRibbons(webMGAtoms: any, glRef: React.RefObject<mgWebGLType>) {
        const $this = this
        const style = "ribbons"

        if (typeof (webMGAtoms["modamino"]) !== "undefined") {
            webMGAtoms["modamino"].forEach(modifiedResidue => {
                Model.prototype.getPeptideLibraryEntry(modifiedResidue, this.enerLib);
            })
        }

        //Sort out H-bonding
        this.enerLib.AssignHBTypes(webMGAtoms, true);
        let model = webMGAtoms.atoms[0];
        model.calculateHBonds();

        let flagBulge = true;
        CalcSecStructure(webMGAtoms.atoms, flagBulge);

        const colourScheme = new ColourScheme(webMGAtoms);
        const atomColours = colourScheme.colourByChain({ "nonCByAtomType": true });

        const coloured_splines_info = GetSplinesColoured(webMGAtoms, atomColours);
        const objects = coloured_splines_info.filter(item => {
            return typeof item.sizes !== "undefined" &&
                item.sizes.length > 0 &&
                item.sizes[0].length > 0 &&
                item.sizes[0][0].length > 0
        })

        $this.clearBuffersOfStyle(style, glRef)
        this.addBuffersOfStyle(glRef, objects, style)
    }

    drawSticks(webMGAtoms: any, glRef: React.RefObject<mgWebGLType>) {
        const $this = this
        const style = "sticks"
        let hier = webMGAtoms["atoms"];

        let colourScheme = new ColourScheme(webMGAtoms);
        let atomColours = colourScheme.colourByAtomType();

        let model = hier[0];
        /*
        let atoms = model.getAllAtoms();
        contacts = model.SeekContacts(atoms,atoms,0.6,1.6);
        */
        let contactsAndSingletons = model.getBondsContactsAndSingletons();
        let contacts = contactsAndSingletons["contacts"];
        let singletons = contactsAndSingletons["singletons"];
        let linePrimitiveInfo = contactsToLinesInfo(contacts, 2, atomColours);
        let singletonPrimitiveInfo = singletonsToLinesInfo(singletons, 2, atomColours);
        linePrimitiveInfo["display_class"] = "bonds";
        singletonPrimitiveInfo["display_class"] = "bonds";

        let objects = [linePrimitiveInfo, singletonPrimitiveInfo];

        $this.clearBuffersOfStyle(style, glRef)
        this.addBuffersOfStyle(glRef, objects, style)
    }

    async redraw(glRef: React.RefObject<mgWebGLType>): Promise<void> {
        const $this = this
        const itemsToRedraw = []
        Object.keys($this.displayObjects).filter(style => !["transformation", 'hover', 'selection'].includes(style)).forEach(style => {
            const objectCategoryBuffers = $this.displayObjects[style]
            //Note with transforamtion, not all properties of displayObjects are lists of buffer
            if (Array.isArray(objectCategoryBuffers)) {
                if (objectCategoryBuffers.length > 0) {
                    if (objectCategoryBuffers[0].visible) {
                        //FOr currently visible display types, put them on a list for redraw
                        itemsToRedraw.push(style)
                    }
                    else {
                        $this.clearBuffersOfStyle(style, glRef)
                    }
                }
            }
        })

        if ($this.atomsDirty) {
            try {
                await $this.updateAtoms()
            } catch (err) {
                console.log(err)
                return
            }
        }

        await Promise.all([
            ...itemsToRedraw.map(style => $this.fetchIfDirtyAndDraw(style, glRef)), 
        ])
        
        await $this.drawSymmetry(glRef, false)
    }

    transformedCachedAtomsAsMovedAtoms(glRef: React.RefObject<mgWebGLType>, selectionCid: string = '/*/*/*/*'): MoorhenAtomInfoType[][] {
        const $this = this
        let movedResidues: MoorhenAtomInfoType[][] = [];

        const selection = new window.CCP4Module.Selection(selectionCid)
        const models = this.gemmiStructure.models
        const modelsSize = this.gemmiStructure.models.size()
        for (let modelIndex = 0; modelIndex < modelsSize; modelIndex++) {
            const model = models.get(modelIndex)
            if (!selection.matches_model(model)) {
                model.delete()
                continue
            }
            const chains = model.chains
            const chainsSize = chains.size()
            for (let chainIndex = 0; chainIndex < chainsSize; chainIndex++) {
                const chain = chains.get(chainIndex)
                if (!selection.matches_chain(chain)) {
                    chain.delete()
                    continue
                }
                const residues = chain.residues
                const residuesSize = residues.size()
                for (let residueIndex = 0; residueIndex < residuesSize; residueIndex++) {
                    const residue = residues.get(residueIndex)
                    if (!selection.matches_residue(residue)) {
                        residue.delete()
                        continue
                    }
                    const residueSeqId = residue.seqid
                    let movedAtoms: MoorhenAtomInfoType[] = []
                    const atoms = residue.atoms
                    const atomsSize = atoms.size()
                    for (let atomIndex = 0; atomIndex < atomsSize; atomIndex++) {
                        const atom = atoms.get(atomIndex)
                        if (!selection.matches_atom(atom)) {
                            atom.delete()
                            continue
                        }    
                        const atomElement = atom.element
                        const gemmiAtomPos = atom.pos
                        const atomAltLoc = atom.altloc
                        const atomSerial = atom.serial
                        const atomHasAltLoc = atom.has_altloc()
                        const atomSymbol: string = window.CCP4Module.getElementNameAsString(atomElement)
                        const atomName = atomSymbol.length === 2 ? (atom.name).padEnd(4, " ") : (" " + atom.name).padEnd(4, " ")
                        const diff = $this.displayObjects.transformation.centre
                        let x = gemmiAtomPos.x + glRef.current.origin[0] - diff[0]
                        let y = gemmiAtomPos.y + glRef.current.origin[1] - diff[1]
                        let z = gemmiAtomPos.z + glRef.current.origin[2] - diff[2]
                        const origin = $this.displayObjects.transformation.origin
                        const quat = $this.displayObjects.transformation.quat
                        const cid = `/${model.name}/${chain.name}/${residueSeqId.str()}/${atom.name}${atomHasAltLoc ? ':' + String.fromCharCode(atomAltLoc) : ''}`
                        if (quat) {
                            const theMatrix = quatToMat4(quat)
                            theMatrix[12] = origin[0]
                            theMatrix[13] = origin[1]
                            theMatrix[14] = origin[2]
                            // And then transform ...
                            const atomPos = vec3.create()
                            const transPos = vec3.create()
                            vec3.set(atomPos, x, y, z)
                            vec3.transformMat4(transPos, atomPos, theMatrix);
                            movedAtoms.push({
                                mol_name: model.name,
                                chain_id: chain.name,
                                res_no: residueSeqId.str(),
                                res_name: residue.name,
                                name: atomName, 
                                element: atomElement,
                                pos: [
                                    transPos[0] - glRef.current.origin[0] + diff[0], 
                                    transPos[1] - glRef.current.origin[1] + diff[1],
                                    transPos[2] - glRef.current.origin[2] + diff[2]
                                ],
                                tempFactor: atom.b_iso,
                                charge: atom.charge,
                                symbol: atomSymbol,
                                x: transPos[0] - glRef.current.origin[0] + diff[0],
                                y: transPos[1] - glRef.current.origin[1] + diff[1],
                                z: transPos[2] - glRef.current.origin[2] + diff[2],
                                serial: atomSerial,
                                has_altloc: atomHasAltLoc,
                                alt_loc : atomHasAltLoc ? String.fromCharCode(atomAltLoc) : '',
                                label: cid
                            })
                        }
                        atom.delete()
                        atomElement.delete()
                        gemmiAtomPos.delete()
                    }
                    movedResidues.push(movedAtoms)
                    residue.delete()
                    residueSeqId.delete()
                    atoms.delete()
                }
                chain.delete()
                residues.delete()
            }
            model.delete()
            chains.delete()
        }
        models.delete()
        selection.delete()

        return movedResidues
    }

    async updateWithMovedAtoms(movedResidues: MoorhenAtomInfoType[][], glRef: React.RefObject<mgWebGLType>): Promise<void> {
        const $this = this
        await $this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "shim_new_positions_for_residue_atoms",
            commandArgs: [$this.molNo, movedResidues],
            changesMolecules: [$this.molNo]
        })
        $this.displayObjects.transformation.origin = [0, 0, 0]
        $this.displayObjects.transformation.quat = null
        $this.setAtomsDirty(true)
        return $this.redraw(glRef)
    }

    applyTransform(glRef: React.RefObject<mgWebGLType>) {
        const $this = this
        const movedResidues = $this.transformedCachedAtomsAsMovedAtoms(glRef)
        return $this.updateWithMovedAtoms(movedResidues, glRef)
    }

    async mergeMolecules(otherMolecules: MoorhenMoleculeInterface[], glRef: React.RefObject<mgWebGLType>, doHide: boolean = false): Promise<void> {
        try {
            await this.commandCentre.current.cootCommand({
                command: 'merge_molecules',
                commandArgs: [this.molNo, `${otherMolecules.map(molecule => molecule.molNo).join(':')}`],
                returnType: "merge_molecules_return",
                changesMolecules: [this.molNo]
            }, true)

            let promises = []
            otherMolecules.forEach(molecule => {
                if (doHide) {
                    Object.keys(molecule.displayObjects).forEach(style => {
                        if (Array.isArray(molecule.displayObjects[style])) {
                            molecule.hide(style, glRef)
                        }
                    })     
                }
                Object.keys(molecule.ligandDicts).forEach(key => {
                    if (!Object.hasOwn(this.ligandDicts, key)) {
                        promises.push(this.addDict(molecule.ligandDicts[key]))
                    }
                })
            })
            await Promise.all(promises)

            this.setAtomsDirty(true)
            await this.redraw(glRef)

        } catch (err) {
            console.log(err)
        }
    }

    async addLigandOfType(resType: string, glRef: React.RefObject<mgWebGLType>, fromMolNo: number = -999999): Promise<WorkerResponseType> {
        const getMonomer = () => {
            return this.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'get_monomer_and_position_at',
                commandArgs: [resType.toUpperCase(), fromMolNo,
                    ...glRef.current.origin.map(coord => -coord)
                ]
            }, true)
        }

        let result = await getMonomer()
        
        if (result.data.result.result === -1) {
            await this.loadMissingMonomer(resType.toUpperCase(), fromMolNo)
            result = await getMonomer()
        } 
        if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
            const newMolecule = new MoorhenMolecule(this.commandCentre, this.monomerLibraryPath)
            newMolecule.setAtomsDirty(true)
            newMolecule.molNo = result.data.result.result
            newMolecule.name = resType.toUpperCase()
            newMolecule.cootBondsOptions = this.cootBondsOptions
            await this.mergeMolecules([newMolecule], glRef, true)
            return newMolecule.delete(glRef)
        } else {
            console.log('Error getting monomer... Missing dictionary?')
            this.commandCentre.current.extendConsoleMessage('Error getting monomer... Missing dictionary?')
        }
    }

    getDict(comp_id: string): string {
        if (Object.hasOwn(this.ligandDicts, comp_id)) {
            return this.ligandDicts[comp_id]
        }
        console.log(`Cannot find ligand dict with comp_id ${comp_id}`)
    }

    addDictShim(fileContent: string): void {
        let possibleIndentedLines = fileContent.split("\n")
        let unindentedLines: string[] = []
        let comp_id = 'list'
        let rx = /data_comp_(.*)/;
        
        for (let line of possibleIndentedLines) {
            let trimmedLine = line.trim()
            let arr = rx.exec(trimmedLine)
            if (arr !== null) {
                //Had we encountered a previous compound ?  If so, add it into the energy lib
                if (comp_id !== 'list') {
                    const reassembledCif = unindentedLines.join("\n")
                    this.enerLib.addCIFAtomTypes(comp_id, reassembledCif)
                    this.enerLib.addCIFBondTypes(comp_id, reassembledCif)
                    this.ligandDicts[comp_id] = reassembledCif
                    unindentedLines = []
                }
                comp_id = arr[1]
            }
            unindentedLines.push(line.trim())
        }
        
        if (comp_id !== 'list') {
            const reassembledCif = unindentedLines.join("\n")
            this.enerLib.addCIFAtomTypes(comp_id, reassembledCif)
            this.enerLib.addCIFBondTypes(comp_id, reassembledCif)
            this.ligandDicts[comp_id] = reassembledCif
        }
    }

    async addDict(fileContent: string): Promise<void> {
        await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'shim_read_dictionary',
            commandArgs: [fileContent, this.molNo],
            changesMolecules: []
        }, true)

        this.addDictShim(fileContent)
    }

    async undo(glRef: React.RefObject<mgWebGLType>): Promise<void> {
        const $this = this
        await $this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "undo",
            commandArgs: [$this.molNo]
        })
        $this.setAtomsDirty(true)
        return $this.redraw(glRef)
    }

    async redo(glRef: React.RefObject<mgWebGLType>): Promise<void> {
        const $this = this
        await $this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "redo",
            commandArgs: [$this.molNo]
        })
        $this.setAtomsDirty(true)
        return $this.redraw(glRef)
    }

    async updateLigands(): Promise<void> {
        let ligandList: MoorhenLigandInfoType[] = []
        const model = this.gemmiStructure.first_model()
        const modelName = model.name
        
        try {
            const chains = model.chains
            const chainsSize = chains.size()
            for (let i = 0; i < chainsSize; i++) {
                const chain = chains.get(i)
                const chainName = chain.name
                const ligands = chain.get_ligands_const()
                const ligandsSize = ligands.size()
                for (let j = 0; j < ligandsSize; j++) {
                    let ligand = ligands.at(j)
                    const resName = ligand.name
                    const ligandSeqId = ligand.seqid
                    const resNum = ligandSeqId.str()
                    ligandList.push({resName: resName, chainName: chainName, resNum: resNum, modelName: modelName})
                    ligand.delete()
                    ligandSeqId.delete()
                }
                chain.delete()
                ligands.delete()
            }
            chains.delete()
        } finally {
            model.delete()
        }

        this.ligands = ligandList
    }

    async gemmiAtomsForCid(cid: string): Promise<MoorhenAtomInfoType[]> {
        const $this = this

        if ($this.atomsDirty) {
            await $this.updateAtoms()
        }

        let result: MoorhenAtomInfoType[] = []
        const selection = new window.CCP4Module.Selection(cid)
        const model = $this.gemmiStructure.first_model()

        if (selection.matches_model(model)) {
            const modelName = model.name
            const chains = model.chains
            const chainsSize = chains.size()
            for (let i = 0; i < chainsSize; i++) {
                const chain = chains.get(i)
                if (selection.matches_chain(chain)) {
                    const chainName = chain.name
                    const residues = chain.residues
                    const residuesSize = residues.size()
                    for (let j = 0; j < residuesSize; j++) {
                        const residue = residues.get(j)
                        if (selection.matches_residue(residue)) {
                            const residueName = residue.name
                            const residueSeqId = residue.seqid
                            const resNum = residueSeqId.str()
                            const atoms = residue.atoms
                            const atomsSize = atoms.size()
                            for (let k = 0; k < atomsSize; k++) {
                                const atom = atoms.get(k)
                                if (selection.matches_atom(atom)) {
                                    const atomCharge = atom.charge
                                    const atomPos = atom.pos
                                    const atomPosX = atomPos.x
                                    const atomPosY = atomPos.y
                                    const atomPosZ = atomPos.z
                                    const atomElement = atom.element
                                    const atomTempFactor = atom.b_iso
                                    const atomSerial = atom.serial
                                    const atomName = atom.name
                                    const atomAltLoc = atom.altloc
                                    const atomHasAltLoc = atom.has_altloc()
                                    const atomInfo: MoorhenAtomInfoType = {
                                        res_name: residueName,
                                        res_no: resNum,
                                        mol_name: modelName,
                                        chain_id: chainName,
                                        pos: [atomPosX, atomPosY, atomPosZ],
                                        x: atomPosX,
                                        y: atomPosY,
                                        z: atomPosZ,
                                        charge: atomCharge,
                                        element: atomElement,
                                        symbol: window.CCP4Module.getElementNameAsString(atomElement),
                                        tempFactor: atomTempFactor,
                                        serial: atomSerial,
                                        name: atomName,
                                        has_altloc: atomHasAltLoc,
                                        alt_loc: atomHasAltLoc ? '' : String.fromCharCode(atomAltLoc),
                                        label: `/${modelName}/${chainName}/${resNum}(${residueName})/${atomName}${atomHasAltLoc ? ':' + String.fromCharCode(atomAltLoc) : ''}`
                                    }
                                    result.push(atomInfo)
                                    atomPos.delete()
                                    atomElement.delete()
                                }
                                atom.delete()
                            }
                            atoms.delete()
                            residueSeqId.delete()
                        }
                        residue.delete()
                    }
                    residues.delete()
                }
                chain.delete()
            }
            chains.delete()
        }

        selection.delete()
        model.delete()

        return Promise.resolve(result)
    }

    hasVisibleBuffers(excludeBuffers: string[] = ['hover', 'originNeighbours', 'selection', 'transformation', 'contact_dots', 'chemical_features', 'VdWSurface']): boolean {
        const styles = Object.keys(this.displayObjects).filter(key => !excludeBuffers.some(style => key.includes(style)))
        const displayBuffers = styles.map(style => this.displayObjects[style])
        const visibleDisplayBuffers = displayBuffers.filter(displayBuffer => displayBuffer.some(buffer => buffer.visible))
        return visibleDisplayBuffers.length !== 0
    }

    async fetchCurrentColourRules() {
        let rules = []
        const response = await this.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: "get_colour_rules", 
            returnType: 'colour_rules',
            commandArgs: [this.molNo], 
        })

        response.data.result.result.forEach(rule => {
            rules.push({
                commandInput: {
                    message: 'coot_command',
                    command: 'add_colour_rule', 
                    returnType: 'status',
                    commandArgs: [this.molNo, rule.first, rule.second]
                },
                isMultiColourRule: false,
                ruleType: 'chain',
                color: rule.second,
                label: rule.first
            })
        })

        this.colourRules = rules
    }

    async setColourRules(glRef: React.RefObject<mgWebGLType>, ruleList: any[], redraw: boolean = false) {
        this.colourRules = [...ruleList]

        await this.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: "delete_colour_rules", 
            returnType: 'status',
            commandArgs: [this.molNo], 
        })

        let promises = []
        this.colourRules.forEach(rule => {
            promises.push(
                this.commandCentre.current.cootCommand(rule.commandInput)
            )
            //TODO: in the future we should be able to set CID selection and only exclude property rules
            if (rule.ruleType === 'molecule') {
                const [h, s, l] = hexToHsl(rule.color)
                promises.push(
                    this.commandCentre.current.cootCommand({
                        message:'coot_command',
                        command: 'set_colour_wheel_rotation_base', 
                        returnType:'status',
                        commandArgs: [this.molNo, 360*h]
                    })
                )
            }
        })

        await Promise.all(promises)
        
        if (redraw) {
            this.setAtomsDirty(true)
            await this.redraw(glRef)
        }
    }

    async hideCid(cid: string, glRef: React.RefObject<mgWebGLType>) {
        await this.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: "add_to_non_drawn_bonds", 
            returnType: 'status',
            commandArgs: [this.molNo, cid], 
        })
        
        // A list with the segment CIDs
        this.excludedSegments.push(cid)
        
        // We also want a list with individual atom CIDs
        const selection = new window.CCP4Module.Selection(cid)
        const toSeqId = selection.to_seqid
        const fromSeqId = selection.from_seqid
        const chainIds = selection.chain_ids
        
        let chainIdList: string[] = [chainIds.str()]
        if(chainIds.all) {
            chainIdList = this.sequences.map(sequence => sequence.chain)
        }

        if(!fromSeqId.empty()) {
            chainIdList.forEach(chainName => {
                if(toSeqId.empty()){
                    this.excludedCids.push(`//${chainName}/${fromSeqId.seqnum}/*`)
                } else {
                    for (let resNum = fromSeqId.seqnum; resNum <= toSeqId.seqnum; resNum++) {
                        this.excludedCids.push(`//${chainName}/${resNum}/*`)
                    }
                }
            })
        } 

        chainIds.delete()
        toSeqId.delete()
        fromSeqId.delete()
        selection.delete()

        // Redraw to apply changes
        const result = await this.redraw(glRef)
        return Promise.resolve(result)
    }

    async unhideAll(glRef: React.RefObject<mgWebGLType>) {
        await this.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: "clear_non_drawn_bonds", 
            returnType: 'status',
            commandArgs: [this.molNo], 
        })
        this.excludedSegments = []
        this.excludedCids = []
        const result = await this.redraw(glRef)
        return Promise.resolve(result)
    }

    async drawEnvironment(glRef: React.RefObject<mgWebGLType>, chainID: string, resNo: number,  altLoc: string, labelled: boolean = false): Promise<void> {
        
        const response = await this.commandCentre.current.cootCommand({
            returnType: "generic_3d_lines_bonds_box",
            command: "make_exportable_environment_bond_box",
            commandArgs: [this.molNo, chainID, resNo,  altLoc]
        })
        const envDistances = response.data.result.result

        const bumps = envDistances[0];
        const hbonds = envDistances[1];

        const bumpAtomsPairs = bumps.map(bump => {
            const start = bump.start
            const end = bump.end
            
            const startAtomInfo = {
                pos: [start.x, start.y, start.z],
                x: start.x,
                y: start.y,
                z: start.z,
            }

            const endAtomInfo = {
                pos: [end.x, end.y, end.z],
                x: end.x,
                y: end.y,
                z: end.z,
            }

            const pair = [startAtomInfo, endAtomInfo]
            return pair
        })
        this.drawGemmiAtomPairs(glRef, bumpAtomsPairs, "originNeighboursBump", [0.7, 0.4, 0.25, 1.0], labelled, true)

        const hbondAtomsPairs = hbonds.map(hbond => {
            const start = hbond.start
            const end = hbond.end
            
            const startAtomInfo = {
                pos: [start.x, start.y, start.z],
                x: start.x,
                y: start.y,
                z: start.z,
            }

            const endAtomInfo = {
                pos: [end.x, end.y, end.z],
                x: end.x,
                y: end.y,
                z: end.z,
            }

            const pair = [startAtomInfo, endAtomInfo]
            return pair
        })
        this.drawGemmiAtomPairs(glRef, hbondAtomsPairs, "originNeighboursHBond", [0.7, 0.2, 0.7, 1.0], labelled, true)
    }

    async drawHBonds(glRef: React.RefObject<mgWebGLType>, oneCid: string, style: string, labelled: boolean = false) {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "vector_hbond",
            command: "get_h_bonds",
            commandArgs: [this.molNo, oneCid, false]
        })
        const hBonds = response.data.result.result

        const selectedGemmiAtomsPairs = hBonds.map(hbond => {
            const donor = hbond.donor
            const acceptor = hbond.acceptor
            
            const donorAtomInfo = {
                pos: [donor.x, donor.y, donor.z],
                x: donor.x,
                y: donor.y,
                z: donor.z,
                charge: donor.charge,
                element: donor.element, // ???
                name: donor.name,
                symbol: donor.element, // ???
                b_iso: donor.b_iso,
                serial: donor.serial,
                label: `/${donor.modelId}/${donor.chainName}/${donor.resNum}(${donor.residueName})/${donor.name}${donor.altLoc === "" ? ':' + String.fromCharCode(donor.altLoc) : ''}`
            }

            const acceptorAtomInfo = {
                pos: [acceptor.x, acceptor.y, acceptor.z],
                x: acceptor.x,
                y: acceptor.y,
                z: acceptor.z,
                charge: acceptor.charge,
                element: acceptor.element, // ???
                name: acceptor.name,
                symbol: acceptor.element, // ???
                b_iso: acceptor.b_iso,
                serial: acceptor.serial,
                label: `/${acceptor.modelId}/${acceptor.chainName}/${acceptor.resNum}(${acceptor.name})/${acceptor.name}${acceptor.altLoc === "" ? ':' + String.fromCharCode(acceptor.altLoc) : ''}`
            }
            
            const pair = [donorAtomInfo, acceptorAtomInfo]
            return pair
        })

        this.drawGemmiAtomPairs(glRef, selectedGemmiAtomsPairs, style, [0.7, 0.2, 0.7, 1.0], labelled, true)
    }

    generateSelfRestraints(maxRadius: number = 4.2): Promise<WorkerResponseType> {
        return this.commandCentre.current.cootCommand({
            command: "generate_self_restraints", 
            returnType: 'status',
            commandArgs: [this.molNo, maxRadius], 
        })
    }

    clearExtraRestraints(): Promise<WorkerResponseType> {
        return this.commandCentre.current.cootCommand({
            command: "clear_extra_restraints", 
            returnType: 'status',
            commandArgs: [this.molNo], 
        })
    }

    rigidBodyFit(cidsString: string, mapNo: number): Promise<WorkerResponseType> {
        return this.commandCentre.current.cootCommand({
            command: "rigid_body_fit", 
            returnType: 'status',
            commandArgs: [this.molNo, cidsString, mapNo], 
        })
    }


    refineResiduesUsingAtomCid(cid: string, mode: string, ncyc: number): Promise<WorkerResponseType> {
        return this.commandCentre.current.cootCommand({
            command: "refine_residues_using_atom_cid", 
            returnType: 'status',
            commandArgs: [this.molNo, cid, mode, ncyc], 
        })
    }

    SSMSuperpose(movChainId: string, refMolNo: number, refChainId: string): Promise<WorkerResponseType> {
        return this.commandCentre.current.cootCommand({
            command: "SSM_superpose", 
            returnType: 'superpose_results',
            commandArgs: [refMolNo, refChainId, this.molNo, movChainId], 
        })
    }
}
