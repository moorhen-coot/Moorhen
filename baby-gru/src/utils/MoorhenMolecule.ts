import 'pako';
import {
    guid, readTextFile, readGemmiStructure, cidToSpec, residueCodesThreeToOne, centreOnGemmiAtoms, getBufferAtoms,
    nucleotideCodesThreeToOne, hexToHsl, gemmiAtomPairsToCylindersInfo, gemmiAtomsToCirclesSpheresInfo, findConsecutiveRanges, getCubeLines
} from './MoorhenUtils'
import { quatToMat4 } from '../WebGLgComponents/quatToMat4.js';
import { isDarkBackground } from '../WebGLgComponents/mgWebGL'
import * as vec3 from 'gl-matrix/vec3';
import * as mat3 from 'gl-matrix/mat3';
import * as quat4 from 'gl-matrix/quat';
import { moorhen } from "../types/moorhen"
import { webGL } from "../types/mgWebGL"
import { gemmi } from "../types/gemmi"
import { libcootApi } from '../types/libcoot';

/**
 * Represents a molecule
 * @property {string} name - The name assigned to this molecule instance
 * @property {number} molNo - The imol assigned to this molecule instance
 * @property {boolean} atomsDirty - Whether the cached atoms are outdated 
 * @property {boolean} symmetryOn - Whether the symmetry is currently being displayed
 * @property {boolean} isVisible - Whether any of the buffers are currently being displayed
 * @property {object} sequences - List of sequences present in the molecule
 * @property {object} gemmiStructure - Object representation of the cached gemmi structure for this molecule
 * @property {React.RefObject<moorhen.CommandCentre>} commandCentre - A react reference to the command centre instance
 * @property {React.RefObject<webGL.MGWebGL>} glRef - A react reference to the MGWebGL instance
 * @property {string} monomerLibraryPath - A string with the path to the monomer library, relative to the root of the app
 * @constructor
 * @param {React.RefObject<moorhen.CommandCentre>} commandCentre - A react reference to the command centre instance
 * @param {React.RefObject<webGL.MGWebGL>} glRef - A react reference to the MGWebGL instance
 * @param {string} [monomerLibraryPath="./baby-gru/monomers"] - A string with the path to the monomer library, relative to the root of the app
 * @example
 * import { MoorhenMolecule } from 'moorhen';
 * 
 * // Create a new molecule
 * const molecule = new MoorhenMolecule(commandCentre, glRef, monomerLibraryPath);
 * 
 * // Set some defaults
 * molecule.setBackgroundColour(glRef.current.background_colour)
 * 
 * // Load file from a URL
 * molecule.loadToCootFromURL('/uri/to/file.pdb', 'mol-1');
 * 
 * // Draw coot bond representation and centre on molecule
 * molecule.fetchIfDirtyAndDraw('CBs');
 * molecule.centreOn();
 * 
 * // Delete molecule
 * molecule.delete();
 */
export class MoorhenMolecule implements moorhen.Molecule {

    type: string;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    HBondsAssigned: boolean;
    atomsDirty: boolean;
    isVisible: boolean;
    name: string;
    molNo: number | null
    gemmiStructure: gemmi.Structure;
    sequences: moorhen.Sequence[];
    colourRules: moorhen.ColourRule[];
    ligands: moorhen.LigandInfo[];
    ligandDicts: { [comp_id: string]: string };
    connectedToMaps: number[];
    excludedSegments: string[];
    excludedCids: string[];
    symmetryOn: boolean;
    symmetryRadius: number;
    symmetryMatrices: number[][][];
    gaussianSurfaceSettings: {
        sigma: number;
        countourLevel: number;
        boxRadius: number;
        gridScale: number;
    };
    cootBondsOptions: moorhen.cootBondOptions;
    displayObjects: {
        CBs: moorhen.DisplayObject[];
        CAs: moorhen.DisplayObject[];
        CRs: moorhen.DisplayObject[];
        ligands: moorhen.DisplayObject[];
        gaussian: moorhen.DisplayObject[];
        MolecularSurface: moorhen.DisplayObject[];
        VdWSurface: moorhen.DisplayObject[];
        DishyBases: moorhen.DisplayObject[];
        VdwSpheres: moorhen.DisplayObject[];
        rama: moorhen.DisplayObject[];
        rotamer: moorhen.DisplayObject[];
        CDs: moorhen.DisplayObject[];
        allHBonds: moorhen.DisplayObject[];
        hover: moorhen.DisplayObject[];
        selection: moorhen.DisplayObject[];
        originNeighbours: moorhen.DisplayObject[];
        originNeighboursHBond: moorhen.DisplayObject[];
        originNeighboursBump: moorhen.DisplayObject[];
        unitCell:  moorhen.DisplayObject[];
    };
    displayObjectsTransformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
    uniqueId: string;
    monomerLibraryPath: string

    constructor(commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, monomerLibraryPath = "./baby-gru/monomers") {
        this.type = 'molecule'
        this.commandCentre = commandCentre
        this.glRef = glRef
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
            CAs: [],
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
            unitCell: [],
        }
        this.displayObjectsTransformation = { origin: [0, 0, 0], quat: null, centre: [0, 0, 0] }
        this.uniqueId = guid()
        this.monomerLibraryPath = monomerLibraryPath
    }

    /**
     * Replace the current molecule with the model in a file
     * @param {string} fileUrl - The uri to the file with the new model
     * @param {string} molName - The molecule name
     */
    async replaceModelWithFile(fileUrl: string, molName: string): Promise<void> {
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
            return this.redraw()
        }

        return Promise.reject(cootResponse.data.result.status)
    }

    /**
     * Turn on/off molecule symmetry
     */
    toggleSymmetry(): Promise<void> {
        this.symmetryOn = !this.symmetryOn;
        return this.drawSymmetry()
    }

    /**
     * Set the radius to draw symmetry mates
     * @param {number} radius - Symmetry mates with an atom within this radius will be drawn
     */
    setSymmetryRadius(radius: number): Promise<void> {
        this.symmetryRadius = radius
        return this.drawSymmetry()
    }

    /**
     * Fetch the symmetry matrix for the current model from libcoot api
     */
    async fetchSymmetryMatrix(): Promise<void> {
        if (!this.symmetryOn) {
            this.symmetryMatrices = []
        } else {
            const selectionCentre: number[] = this.glRef.current.origin.map(coord => -coord)
            const response = await this.commandCentre.current.cootCommand({
                returnType: "symmetry",
                command: 'get_symmetry_with_matrices',
                commandArgs: [this.molNo, this.symmetryRadius, ...selectionCentre]
            }, true) as moorhen.WorkerResponse<{ matrix: number[][] }[]>
            this.symmetryMatrices = response.data.result.result.map(symm => symm.matrix)
        }
    }

    /**
     * Draw symmetry mates for the current molecule
     * @param {boolean} [fetchSymMatrix=true] - Indicates whether a new symmetry matrix must be fetched from libcoot api
     */
    async drawSymmetry(fetchSymMatrix: boolean = true): Promise<void> {
        if (fetchSymMatrix) {
            await this.fetchSymmetryMatrix()
        }
        Object.keys(this.displayObjects)
            .filter(key => !['hover', 'unitCell', 'originNeighbours', 'selection', 'transformation', 'contact_dots', 'chemical_features', 'VdWSurface'].some(style => key.includes(style)))
            .forEach(displayObjectType => {
                if (this.displayObjects[displayObjectType].length > 0) {
                    this.displayObjects[displayObjectType].forEach((displayObject: moorhen.DisplayObject) => {
                        displayObject.symmetryMatrices = this.symmetryMatrices
                    })
                }
            })
        this.glRef.current.drawScene()
    }

    /**
     * Set the background colour where the molecule is being drawn. Used to detect whether the background is dark and molecule needs to be rendered using lighter colours.
     * @param {number[]} backgroundColour - The rgba indicating the background colour
     */
    setBackgroundColour(backgroundColour: [number, number, number, number]) {
        this.cootBondsOptions.isDarkBackground = isDarkBackground(...backgroundColour)
    }

    /**
     * Update the cached gemmi structure for this molecule
     */
    async updateGemmiStructure(): Promise<void> {
        if (this.gemmiStructure && !this.gemmiStructure.isDeleted()) {
            this.gemmiStructure.delete()
        }
        let response = await this.getAtoms()
        this.gemmiStructure = readGemmiStructure(response.data.result.pdbData, this.name)
        window.CCP4Module.gemmi_setup_entities(this.gemmiStructure)
        this.parseSequences()
        this.updateLigands()
    }

    /**
     * Get the unit cell parameters for the molecule
     * @returns An object with the unit cell parameters
     */
    getUnitCellParams(): { a: number; b: number; c: number; alpha: number; beta: number; gamma: number; } {
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

    /**
     * Get the CIDs for all residues wihtin a distance threshold of a set of residues
     * @param {string} selectionCid - The CID indicating the selection of residues used for the search
     * @param {number} radius - The radius used in the search
     * @param {number} minDist - Minimum distance for the serch
     * @param {number} maxDist - Maximum distance for the search
     * @returns {Promise<string[]>} List of CIDs with the residues found within the radius of search
     */
    async getNeighborResiduesCids(selectionCid: string, radius: number, minDist: number, maxDist: number): Promise<string[]> {
        let multiCidRanges: string[] = []
        let neighborResidues: { [chainId: string]: number[] } = {}

        const model = this.gemmiStructure.first_model()
        const unitCell = this.gemmiStructure.cell

        const neighborSearch = new window.CCP4Module.NeighborSearch(model, unitCell, radius)
        neighborSearch.populate(false)

        const selectedGemmiAtoms = await this.gemmiAtomsForCid(selectionCid)
        if (selectedGemmiAtoms.length === 0) {
            return multiCidRanges
        }

        const selectedAtom = selectedGemmiAtoms[0]
        const selectedAtomPosition = new window.CCP4Module.Position(selectedAtom.x, selectedAtom.y, selectedAtom.z)

        const marks = neighborSearch.find_atoms(selectedAtomPosition, minDist, maxDist)
        const chains = model.chains
        const marksSize = marks.size()

        for (let markIndex = 0; markIndex < marksSize; markIndex++) {
            const mark = marks.get(markIndex)
            const imageIdx = mark.image_idx
            if (imageIdx !== 0) {
                continue
            }
            const chain = chains.get(mark.chain_idx)
            const residues = chain.residues
            const residue = residues.get(mark.residue_idx)
            const residueSeqId = residue.seqid
            const resNum = residueSeqId.str()
            if (Object.hasOwn(neighborResidues, chain.name)) {
                neighborResidues[chain.name].push(parseInt(resNum))
            } else {
                neighborResidues[chain.name] = [parseInt(resNum)]
            }
            residue.delete()
            residueSeqId.delete()
            residues.delete()
            chain.delete()
            // mark.delete() For some reason this throws abort error. Maybe because the type is gemmi::Mark* ??
        }

        Object.keys(neighborResidues).forEach(chainId => {
            const residueRanges = findConsecutiveRanges(Array.from(new Set(neighborResidues[chainId])))
            residueRanges.forEach(range => multiCidRanges.push(`//${chainId}/${range[0]}-${range[1]}/*`))
        })

        model.delete()
        chains.delete()
        unitCell.delete()
        neighborSearch.delete()
        selectedAtomPosition.delete()
        marks.delete()
        return multiCidRanges
    }

    /**
     * Parse the sequences in the molecule 
     */
    parseSequences(): void {
        if (this.gemmiStructure === null) {
            return
        }

        let sequences: moorhen.Sequence[] = []
        const structure = this.gemmiStructure.clone()
        try {
            const models = structure.models
            const modelsSize = models.size()
            for (let modelIndex = 0; modelIndex < modelsSize; modelIndex++) {
                const model = models.get(modelIndex)
                const chains = model.chains
                const chainsSize = chains.size()
                for (let chainIndex = 0; chainIndex < chainsSize; chainIndex++) {
                    let currentSequence: moorhen.ResidueInfo[] = []
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

    /**
     * Delete this molecule instance
     */
    async delete(): Promise<moorhen.WorkerResponse> {
        Object.getOwnPropertyNames(this.displayObjects).forEach(displayObject => {
            if (this.displayObjects[displayObject].length > 0) { this.clearBuffersOfStyle(displayObject) }
        })
        this.glRef.current.drawScene()
        const inputData = { message: "delete", molNo: this.molNo }
        const response = await this.commandCentre.current.postMessage(inputData)
        if (this.gemmiStructure && !this.gemmiStructure.isDeleted()) {
            this.gemmiStructure.delete()
        }
        return response
    }

    /**
     * Copy molecule into a new instance
     * @returns {moorhen.Molecule} New molecule instance
     */
    async copyMolecule(): Promise<moorhen.Molecule> {

        let moleculeAtoms = await this.getAtoms()
        let newMolecule = new MoorhenMolecule(this.commandCentre, this.glRef, this.monomerLibraryPath)
        newMolecule.name = `${this.name}-placeholder`
        newMolecule.cootBondsOptions = this.cootBondsOptions

        let response = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'shim_read_pdb',
            commandArgs: [moleculeAtoms.data.result.pdbData, newMolecule.name]
        }, true) as moorhen.WorkerResponse<number>

        newMolecule.molNo = response.data.result.result

        await Promise.all(Object.keys(this.ligandDicts).map(key => newMolecule.addDict(this.ligandDicts[key])))
        await newMolecule.fetchIfDirtyAndDraw('CBs')

        return newMolecule
    }

    /**
     * Copy a fragment of the current model into a new molecule
     * @param {string} chainId - The chain ID
     * @param {number} res_no_start - The residue number where the fragment should start
     * @param {number} res_no_end - The residue number where the fragment should end
     * @param {boolean} [doRecentre=true] - Indicates whether the view should re-centre on the new copied fragment
     * @returns {Promise<moorhen.Molecule>}  New molecule instance
     */
    async copyFragment(chainId: string, res_no_start: number, res_no_end: number, doRecentre: boolean = true): Promise<moorhen.Molecule> {
        const inputData = { message: "copy_fragment", molNo: this.molNo, chainId: chainId, res_no_start: res_no_start, res_no_end: res_no_end }
        const response = await this.commandCentre.current.postMessage(inputData)
        const newMolecule = new MoorhenMolecule(this.commandCentre, this.glRef, this.monomerLibraryPath)
        newMolecule.name = `${this.name} fragment`
        newMolecule.molNo = response.data.result.result
        newMolecule.cootBondsOptions = this.cootBondsOptions
        await Promise.all(Object.keys(this.ligandDicts).map(key => newMolecule.addDict(this.ligandDicts[key])))
        await newMolecule.fetchIfDirtyAndDraw('CBs')
        if (doRecentre) await newMolecule.centreOn()

        return newMolecule
    }

    /**
     * Copy a fragment of the current model into a new molecule using a selection CID
     * @param {string} cid - The CID selection indicating the residues that will be copied into the new fragment
     * @param {number[]} backgroundColor - The background colour used to draw the new molecule
     * @param {number} defaultBondSmoothness - The default bond smoothness for the new molecule
     * @param {boolean} [doRecentre=true] - Indicates whether the view should re-centre on the new copied fragment
     * @returns {Promise<moorhen.Molecule>}  New molecule instance
     */
    async copyFragmentUsingCid(cid: string, backgroundColor: [number, number, number, number], defaultBondSmoothness: number, doRecentre: boolean = true): Promise<moorhen.Molecule> {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "copy_fragment_using_cid",
            commandArgs: [this.molNo, cid],
            changesMolecules: [this.molNo]
        }, true) as moorhen.WorkerResponse<number>;
        const newMolecule = new MoorhenMolecule(this.commandCentre, this.glRef, this.monomerLibraryPath);
        newMolecule.name = `${this.name} fragment`;
        newMolecule.molNo = response.data.result.result;
        newMolecule.setBackgroundColour(backgroundColor);
        newMolecule.cootBondsOptions.smoothness = defaultBondSmoothness;
        await Promise.all(Object.keys(this.ligandDicts).map(key => newMolecule.addDict(this.ligandDicts[key])));
        return newMolecule;
    }

    /**
     * Load a new molecule from a file URL
     * @param {string} url - The url to the path with the data for the new molecule
     * @param {string} molName - The new molecule name
     * @returns {Promise<moorhen.Molecule>} The new molecule
     */
    async loadToCootFromURL(url: RequestInfo | URL, molName: string): Promise<moorhen.Molecule> {
        const response = await fetch(url)
        try {
            if (response.ok) {
                const coordData = await response.text()
                return this.loadToCootFromString(coordData, molName)
            } else {
                return Promise.reject(`Error fetching data from url ${url}`)
            }

        } catch (err) {
            return Promise.reject(err)
        }
    }

    /**
     * Load a new molecule from the contents of a file
     * @param {Blob} source - The contents of the input file
     * @returns {Promise<moorhen.Molecule>} The new molecule
     */
    async loadToCootFromFile(source: Blob): Promise<moorhen.Molecule> {
        try {
            const coordData = await readTextFile(source);
            return await this.loadToCootFromString(coordData, source.name);
        } catch (err) {
            return await Promise.reject(err);
        }
    }

    /**
     * Load a new molecule from a string
     * @param {string} coordData - The molecule data
     * @param {string} name - The new molecule name
     * @returns {Promise<moorhen.Molecule>} The new molecule
     */
    async loadToCootFromString(coordData: ArrayBuffer | string, name: string): Promise<moorhen.Molecule> {
        const pdbRegex = /.pdb$/;
        const entRegex = /.ent$/;
        const cifRegex = /.cif$/;
        const mmcifRegex = /.mmcif$/;

        if (this.gemmiStructure && !this.gemmiStructure.isDeleted()) {
            this.gemmiStructure.delete()
        }

        this.name = name.replace(pdbRegex, "").replace(entRegex, "").replace(cifRegex, "").replace(mmcifRegex, "");
        this.gemmiStructure = readGemmiStructure(coordData, this.name)
        window.CCP4Module.gemmi_setup_entities(this.gemmiStructure)
        this.parseSequences()
        this.updateLigands()
        this.atomsDirty = false

        try {
            const response = await this.commandCentre.current.cootCommand({
                returnType: "status",
                command: 'shim_read_pdb',
                commandArgs: [coordData, this.name],
                changesMolecules: [this.molNo]
            }, true)
            this.molNo = response.data.result.result
            await this.loadMissingMonomers()
            return this
        } catch (err) {
            console.log('Error in loadToCootFromString', err)
        }
    }

    /**
     * Load a the missing dictionary for a monomer. First attempts to load it from the monomer library, if it fails it will load from the EBI.
     * @param {string} newTlc - Three letter code for the monomer
     * @param {number} attachToMolecule - Molecule number for which the dicitonary will be associated
     */
    async loadMissingMonomer(newTlc: string, attachToMolecule: number): Promise<moorhen.WorkerResponse> {
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

    /**
     * Attempt to load dictionaries for all missing monomers present in the molecule
     * @returns {Promise<moorhen.Molecule>} This molecule instance
     */
    async loadMissingMonomers(): Promise<moorhen.Molecule> {
        const $this = this
        const response = await $this.commandCentre.current.cootCommand({
            returnType: "string_array",
            command: 'get_residue_names_with_no_dictionary',
            commandArgs: [$this.molNo],
        }, false) as moorhen.WorkerResponse<string[]>

        if (response.data.result.status === 'Completed') {
            let monomerPromises = []
            response.data.result.result.forEach(newTlc => {
                const newPromise = $this.loadMissingMonomer(newTlc, -999999)
                monomerPromises.push(newPromise)
            })
            try {
                await Promise.all(monomerPromises)
            } catch (err) {
                console.log('Error in loadMissingMonomers...', err);
            }
        } else {
            console.log('Error in loadMissingMonomers...');
        }

        return $this
    }

    /**
     * Set the cached molecule atoms as "dirty". This means new bond representations need to be fetched 
     * next time the molecule is redrawn.
     * @param {boolean} state - Indicate whether the current atom representation is dirty
     */
    setAtomsDirty(state: boolean): void {
        this.atomsDirty = state
    }

    /**
     * Get a string with the PDB file contents of the molecule in its current state
     * @param {string} [format='pdb'] - Indicate the file format
     * @returns {Promise<moorhen.WorkerResponse>}  A worker response with the file contents
     */
    getAtoms(format: string = 'pdb'): Promise<moorhen.WorkerResponse> {
        const $this = this;
        return $this.commandCentre.current.postMessage({
            message: "get_atoms",
            molNo: $this.molNo,
            format: format
        })
    }

    /**
     * Update the cached atoms with the latest information from the libcoot api
     */
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

    /**
     * Draw the molecule with a particular style. If the molecule atoms are marked as "dirty" then fetch new atoms.
     * @param {string} style - The style that will be drawn
     */
    async fetchIfDirtyAndDraw(style: string): Promise<void> {
        if (this.atomsDirty) {
            await this.updateAtoms()
        }
        return this.drawWithStyleFromAtoms(style)
    }

    /**
     * Centre the view and align it with the axis of a particular residue
     * @param {string} selectionCid - CID selection for the residue to centre the view on
     * @param {boolean} [animate=true] - Indicates whether the change will be animated
     */
    async centreAndAlignViewOn(selectionCid: string, animate: boolean = true): Promise<void> {

        if (this.atomsDirty) {
            await this.updateAtoms()
        }

        let selectionAtomsAlign: moorhen.AtomInfo[] = []
        let selectionAtomsCentre: moorhen.AtomInfo[] = []
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
            this.glRef.current.setOriginOrientationAndZoomAnimated(selectionCentre, newQuat, 0.20);
        }
    }

    /**
     * Centre the view on a particular residue
     * @param {string} selectionCid - CID selection for the residue to centre the view on
     * @param {boolean} [animate=true] - Indicates whether the change will be animated
     */
    async centreOn(selectionCid: string = '/*/*/*/*', animate: boolean = true): Promise<void> {
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
            this.glRef.current.setOriginAnimated(selectionCentre);
        } else {
            this.glRef.current.setOrigin(selectionCentre);
        }
    }

    /**
     * Draw molecule from a given mesh
     * @param {string} style - Indicate the style to be drawn
     * @param {any[]} meshObjects - The mesh obects that will be drawn
     * @param {moorhen.AtomInfo[]} [newBufferAtoms=[]] - The new buffer atoms with the atom metadata
     */
    async drawWithStyleFromMesh(style: string, meshObjects: any[], newBufferAtoms: moorhen.AtomInfo[] = []): Promise<void> {
        this.clearBuffersOfStyle(style)
        if (meshObjects.length > 0 && !this.gemmiStructure.isDeleted()) {
            this.addBuffersOfStyle(meshObjects, style)
            let bufferAtoms: moorhen.AtomInfo[]
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

    /**
     * Draw molecule with a given style from atoms fetch from libcoot api
     * @param {string} style - Indicate the style to be drawn
     */
    async drawWithStyleFromAtoms(style: string): Promise<void> {
        switch (style) {
            case 'allHBonds':
                this.drawAllHBonds()
                break;
            case 'rama':
                this.drawRamachandranBalls()
                break;
            case 'rotamer':
                this.drawRotamerDodecahedra()
                break;
            case 'VdwSpheres':
            case 'CAs':
            case 'CBs':
                await this.drawCootBonds(style)
                break;
            case 'CDs':
                await this.drawCootContactDots()
                break;
            case 'gaussian':
                await this.drawCootGaussianSurface()
                break;
            case 'CRs':
            case 'MolecularSurface':
            case 'DishyBases':
            case 'VdWSurface':
            case 'Calpha':
                await this.drawCootRepresentation(style)
                break;
            case 'ligands':
                await this.drawCootLigands()
                break;
            default:
                if (style.startsWith("chemical_features")) {
                    await this.drawCootChemicalFeaturesCid(style)
                }
                if (style.startsWith("contact_dots")) {
                    await this.drawCootContactDotsCid(style)
                }
                break;
        }
    }

    /**
     * Add representation buffers of a particular style
     * @param {any[]} objects - The representation buffers
     * @param {string} style - The style
     */
    addBuffersOfStyle( objects: any[], style: string) {
        objects.filter(object => typeof object !== 'undefined' && object !== null).forEach(object => {
            const a = this.glRef.current.appendOtherData(object, true);
            this.displayObjects[style] = this.displayObjects[style].concat(a)
        })
        this.glRef.current.buildBuffers();
        this.glRef.current.drawScene();
    }

    /**
     * Draw all H bonds in the molecule
     */
    async drawAllHBonds() {
        const style = "allHBonds"
        //Empty existing buffers of this type
        this.clearBuffersOfStyle(style)
        this.drawHBonds("/*/*/*", style, false)
    }

    /**
     * Draw ramachandran balls representation
     */
    async drawRamachandranBalls() {
        const style = "rama"
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_ramachandran_validation_markup_mesh",
            commandArgs: [this.molNo]
        }) as moorhen.WorkerResponse<libcootApi.SimpleMeshJS>;
        const objects = [response.data.result.result];
        //Empty existing buffers of this type
        this.clearBuffersOfStyle(style);
        this.addBuffersOfStyle(objects, style);
    }

    /**
     * Draw contact dots using a particular style 
     * @param {string} style - The style
     */
    async drawCootContactDotsCid(style: string) {
        const cid = style.substr("contact_dots-".length)
        try {
            const response = await this.commandCentre.current.cootCommand({
                returnType: "instanced_mesh",
                command: "contact_dots_for_ligand",
                commandArgs: [this.molNo, cid, this.cootBondsOptions.smoothness]
            }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>;
            const objects = [response.data.result.result];
            //Empty existing buffers of this type
            this.clearBuffersOfStyle(style);
            this.addBuffersOfStyle(objects, style);
        } catch (err) {
            return console.log(err);
        }
    }

    /**
     * Draw chemical features using a particular style
     * @param {string} style - The style
     */
    async drawCootChemicalFeaturesCid(style: string) {
        const cid = style.substr("chemical_features-".length)

        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_chemical_features_mesh",
            commandArgs: [this.molNo, cid]
        }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
        try {
            const objects = [response.data.result.result]
            //Empty existing buffers of this type
            this.clearBuffersOfStyle(style)
            this.addBuffersOfStyle(objects, style)
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Draw contact dots
     */
    async drawCootContactDots() {
        const style = "CDs"

        const response = await this.commandCentre.current.cootCommand({
            returnType: "instanced_mesh",
            command: "all_molecule_contact_dots",
            commandArgs: [this.molNo, this.cootBondsOptions.smoothness]
        }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
        try {
            const objects = [response.data.result.result]
            //Empty existing buffers of this type
            this.clearBuffersOfStyle(style)
            this.addBuffersOfStyle(objects, style)
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Draw rotamer dodec. representations
     */
    async drawRotamerDodecahedra(): Promise<void> {
        const style = "rotamer"
        const response = await this.commandCentre.current.cootCommand({
            returnType: "instanced_mesh_perm",
            command: "get_rotamer_dodecs_instanced",
            commandArgs: [this.molNo]
        }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
        try {
            const objects = [response.data.result.result]
            this.clearBuffersOfStyle(style)
            this.addBuffersOfStyle(objects, style)
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Draw molecule ligands using coot's representations
     */
    drawCootLigands() {
        const name = "ligands"
        const ligandsCID = "/*/*/(!ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR,WAT,HOH,THP,SEP,TPO,TYP,PTR,OH2,H2O)"
        return this.drawCootSelectionBonds(name, ligandsCID)
    }

    /**
     * Draw molecule bonds using coot's representations
     * @param {string} style - The style
     */
    drawCootBonds(style: string) {
        const name = style
        return this.drawCootSelectionBonds(name, null)
    }

    /**
     * Draw molecule bonds for a given set of residues selected using a CID
     * @param {string} name - The style name
     * @param {string} cid - The CID selection for the residues to be drawn
     */
    async drawCootSelectionBonds(name: string, cid: null | string): Promise<void> {
        let meshCommand: Promise<moorhen.WorkerResponse<libcootApi.InstancedMeshJS>>

        let style = "COLOUR-BY-CHAIN-AND-DICTIONARY"
        let returnType = "instanced_mesh"
        if (name === "VdwSpheres") {
            style = "VDW-BALLS"
            returnType = "instanced_mesh_perfect_spheres"
        } else if (name === "CAs") {
            style = "CA+LIGANDS"
        }

        if (typeof cid === 'string') {
            meshCommand = this.commandCentre.current.cootCommand({
                returnType: returnType,
                command: "get_bonds_mesh_for_selection_instanced",
                commandArgs: [
                    this.molNo,
                    cid,
                    style,
                    this.cootBondsOptions.isDarkBackground,
                    this.cootBondsOptions.width * 1.5,
                    this.cootBondsOptions.atomRadiusBondRatio * 1.5,
                    this.cootBondsOptions.smoothness
                ]
            })
        } else {
            cid = "/*/*/*/*"
            meshCommand = this.commandCentre.current.cootCommand({
                returnType: returnType,
                command: "get_bonds_mesh_instanced",
                commandArgs: [
                    this.molNo,
                    style,
                    this.cootBondsOptions.isDarkBackground,
                    this.cootBondsOptions.width,
                    this.cootBondsOptions.atomRadiusBondRatio,
                    this.cootBondsOptions.smoothness
                ]
            })
        }

        const response = await meshCommand
        const objects = [response.data.result.result]
        if (objects.length > 0 && !this.gemmiStructure.isDeleted()) {
            //Empty existing buffers of this type
            this.clearBuffersOfStyle(name)
            this.addBuffersOfStyle(objects, name)
            let bufferAtoms = await this.gemmiAtomsForCid(cid)
            if (bufferAtoms.length > 0) {
                this.displayObjects[name][0].atoms = bufferAtoms.filter(atom => !this.excludedCids.includes(`//${atom.chain_id}/${atom.res_no}/*`)).map(atom => {
                    const { pos, x, y, z, charge, label, symbol } = atom
                    const tempFactor = atom.tempFactor
                    return { pos, x, y, z, charge, tempFactor, symbol, label }
                })
            }
        } else {
            this.clearBuffersOfStyle(name)
        }
    }

    /**
     * Draw molecule as a gaussian surface
     */
    async drawCootGaussianSurface(): Promise<void> {
        const style = "gaussian"
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_gaussian_surface",
            commandArgs: [
                this.molNo, this.gaussianSurfaceSettings.sigma,
                this.gaussianSurfaceSettings.countourLevel,
                this.gaussianSurfaceSettings.boxRadius,
                this.gaussianSurfaceSettings.gridScale
            ]
        }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
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
                this.clearBuffersOfStyle(style)
                this.addBuffersOfStyle(flippedNormalsObjects, style)
            }
            else {
                this.clearBuffersOfStyle(style)
            }
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Draw the molecule using a particular coot representation
     * @param {string} style - The representation style
     */
    async drawCootRepresentation(style: string): Promise<void> {
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

        if (this.excludedSegments.length > 0) {
            m2tSelection = `{${m2tSelection} & !{${this.excludedSegments.join(' | ')}}}`
        }

        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_molecular_representation_mesh",
            commandArgs: [
                this.molNo, m2tSelection, "colorRampChainsScheme", m2tStyle
            ]
        }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>

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
                this.clearBuffersOfStyle(style)
                this.addBuffersOfStyle(objects, style)
                let bufferAtoms = getBufferAtoms(this.gemmiStructure.clone())
                if (bufferAtoms.length > 0 && this.displayObjects[style].length > 0) {
                    this.displayObjects[style][0].atoms = bufferAtoms
                }
            } else {
                this.clearBuffersOfStyle(style)
            }
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Show the representation for the molecule 
     * @param {string} style - The representation style to show
     */
    async show(style: string): Promise<void> {
        if (!this.displayObjects[style]) {
            this.displayObjects[style] = []
        }
        try {
            if (this.displayObjects[style].length === 0) {
                await this.fetchIfDirtyAndDraw(style)
                this.glRef.current.drawScene()
            }
            else {
                this.displayObjects[style].forEach(displayBuffer => {
                    displayBuffer.visible = true
                })
                this.glRef.current.drawScene()
            }
            this.drawSymmetry(false)
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Hide a type of representation for the molecule 
     * @param {string} style - The representation style to hide
     */
    hide(style: string) {
        this.displayObjects[style].forEach(displayBuffer => {
            displayBuffer.visible = false
        })
        this.glRef.current.drawScene()
    }

    /**
     * Clears the representation buffers for a particular style
     * @param {string} style - The style to clear
     */
    clearBuffersOfStyle(style: string) {
        this.displayObjects[style].forEach((buffer) => {
            if ("clearBuffers" in buffer) {
                buffer.clearBuffers()
                if (this.glRef.current.displayBuffers) {
                    this.glRef.current.displayBuffers = this.glRef.current.displayBuffers.filter(glBuffer => glBuffer !== buffer)
                }
            } else if ("labels" in buffer) {
                this.glRef.current.labelsTextCanvasTexture.removeBigTextureTextImages(buffer.labels)
            }
        })
        this.glRef.current.buildBuffers()
        this.displayObjects[style] = []
    }

    /**
     * Check whether a particular buffer is included within the representation buffer for this molecule
     * @param bufferIn - The buffer with the ID to search for
     * @returns {boolean} True if the buffer is included in this molecule
     */
    buffersInclude(bufferIn: { id: string; }): boolean {
        const BreakException = {};
        try {
            Object.getOwnPropertyNames(this.displayObjects).forEach(style => {
                if (Array.isArray(this.displayObjects[style])) {
                    const objectBuffers = this.displayObjects[style].filter(buffer => bufferIn.id === buffer.id)
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

    /**
     * Draw the unit cell of this molecule
     */
    drawUnitCell() {
        const unitCell = this.gemmiStructure.cell
        const lines = getCubeLines(unitCell)
        unitCell.delete()

        let objects = [
            gemmiAtomPairsToCylindersInfo(lines, 0.1, { unit_cell: [0.7, 0.4, 0.25, 1.0] }, false, 0, 99999, false) 
        ]
        
        this.addBuffersOfStyle(objects, 'unitCell')
        this.glRef.current.drawScene()
    }

    /**
     * Draw a line between a pair of atoms
     * @param {moorhen.AtomInfo[][]} gemmiAtomPairs - The two atom pairs used to draw the line
     * @param {string} style - The style used to draw the line
     * @param {number[]} colour - The colour used to draw the line
     * @param {boolean} [labelled=false] - Indicates whether the line should be annotated with a label
     * @param {boolean} [clearBuffers=false] - Clear existing buffers for the line
     */
    drawGemmiAtomPairs(gemmiAtomPairs: [moorhen.AtomInfo, moorhen.AtomInfo][], style: string, colour: number[], labelled: boolean = false, clearBuffers: boolean = false) {
        const atomColours = {}
        gemmiAtomPairs.forEach(atom => { atomColours[`${atom[0].serial}`] = colour; atomColours[`${atom[1].serial}`] = colour })
        let objects = [
            gemmiAtomPairsToCylindersInfo(gemmiAtomPairs, 0.07, atomColours, labelled)
        ]
        if (clearBuffers) {
            this.clearBuffersOfStyle(style)
        }
        this.addBuffersOfStyle(objects, style)
    }

    /**
     * Draw yellow highlight balls around a particular residue selection
     * @param {string} style - The style
     * @param {string} selectionString - The CID selection for the residue that will be highlighted
     * @param {number[]} colour - The colour used for the highlight
     * @param {boolean} [clearBuffers=false] - Clear existing buffers for the line
     */
    async drawResidueHighlight(style: string, selectionString: string, colour: number[], clearBuffers: boolean = false): Promise<void> {
        if (typeof selectionString === 'string') {
            const resSpec: moorhen.ResidueSpec = cidToSpec(selectionString)
            let modifiedSelection = `/*/${resSpec.chain_id}/${resSpec.res_no}-${resSpec.res_no}/*${resSpec.alt_conf === "" ? "" : ":"}${resSpec.alt_conf}`
            if (this.sequences.length === 0) {
                modifiedSelection = `/*/${resSpec.chain_id}/${resSpec.res_no}-${resSpec.res_no}/${resSpec.atom_name}${resSpec.alt_conf === "" ? "" : ":"}${resSpec.alt_conf}`
            }
            const selectedGemmiAtoms = await this.gemmiAtomsForCid(modifiedSelection)
            const atomColours = {}
            selectedGemmiAtoms.forEach(atom => { atomColours[`${atom.serial}`] = colour })
            let sphere_size = 0.3
            let click_tol = 0.65
            if (this.displayObjects.VdwSpheres.length > 0 || this.displayObjects.VdWSurface.length > 0) {
                let spheres_visible = false;
                this.displayObjects.VdwSpheres.forEach(spheres => {
                    if (spheres.visible) {
                        spheres_visible = true
                    }
                })
                if (spheres_visible) {
                    sphere_size = 1.8;
                    click_tol = 3.7;
                }
            }
            let objects = [
                gemmiAtomsToCirclesSpheresInfo(selectedGemmiAtoms, sphere_size, "PERFECT_SPHERES", atomColours)
            ]
            objects.forEach(object => {
                object["clickTol"] = click_tol
                object["doStencil"] = true
            })
            if (clearBuffers) {
                this.clearBuffersOfStyle(style)
            }
            this.addBuffersOfStyle(objects, style)
        }
    }

    /**
     * Draw a hover effect over a selected residue
     * @param {string} selectionString - The CID selection for the residue that will be highlighted
     */
    async drawHover(selectionString: string): Promise<void> {
        await this.drawResidueHighlight('hover', selectionString, [1.0, 0.5, 0.0, 0.35], true)
    }

    /**
     * Draw a selection effect over a residue
     * @param {string} selectionString - The CID selection for the residue that will be highlighted
     */
    async drawSelection(selectionString: string): Promise<void> {
        await this.drawResidueHighlight('selection', selectionString, [1.0, 0.0, 0.0, 0.35], false)
    }

    /**
     * Redraw the molecule representations
     */
    async redraw(): Promise<void> {
        const itemsToRedraw = []
        Object.keys(this.displayObjects).filter(style => !["transformation", 'hover', 'unitCell', 'selection'].includes(style)).forEach(style => {
            const objectCategoryBuffers = this.displayObjects[style]
            //Note with transforamtion, not all properties of displayObjects are lists of buffer
            if (Array.isArray(objectCategoryBuffers)) {
                if (objectCategoryBuffers.length > 0) {
                    if (objectCategoryBuffers[0].visible) {
                        //FOr currently visible display types, put them on a list for redraw
                        itemsToRedraw.push(style)
                    }
                    else {
                        this.clearBuffersOfStyle(style)
                    }
                }
            }
        })

        if (this.atomsDirty) {
            try {
                await this.updateAtoms()
            } catch (err) {
                console.log(err)
                return
            }
        }

        await Promise.all([
            ...itemsToRedraw.map(style => this.fetchIfDirtyAndDraw(style)),
        ])

        await this.drawSymmetry(false)
    }

    /**
     * Move residues by applying a series of cached matrix transformations
     * @param {string} selectionCid - The CID selection for the set of residues that will be moved
     * @returns {moorhen.AtomInfo[][]} New atom information for the moved residues
     */
    transformedCachedAtomsAsMovedAtoms(selectionCid: string = '/*/*/*/*'): moorhen.AtomInfo[][] {
        let movedResidues: moorhen.AtomInfo[][] = [];

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
                    let movedAtoms: moorhen.AtomInfo[] = []
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
                        const diff = this.displayObjectsTransformation.centre
                        let x = gemmiAtomPos.x + this.glRef.current.origin[0] - diff[0]
                        let y = gemmiAtomPos.y + this.glRef.current.origin[1] - diff[1]
                        let z = gemmiAtomPos.z + this.glRef.current.origin[2] - diff[2]
                        const origin = this.displayObjectsTransformation.origin
                        const quat = this.displayObjectsTransformation.quat
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
                                    transPos[0] - this.glRef.current.origin[0] + diff[0],
                                    transPos[1] - this.glRef.current.origin[1] + diff[1],
                                    transPos[2] - this.glRef.current.origin[2] + diff[2]
                                ],
                                tempFactor: atom.b_iso,
                                charge: atom.charge,
                                symbol: atomSymbol,
                                x: transPos[0] - this.glRef.current.origin[0] + diff[0],
                                y: transPos[1] - this.glRef.current.origin[1] + diff[1],
                                z: transPos[2] - this.glRef.current.origin[2] + diff[2],
                                serial: atomSerial,
                                has_altloc: atomHasAltLoc,
                                alt_loc: atomHasAltLoc ? String.fromCharCode(atomAltLoc) : '',
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

    /**
     * Update the molecule with a set of moved residues
     * @param {moorhen.AtomInfo[][]} movedResidues - Set of moved residues
     */
    async updateWithMovedAtoms(movedResidues: moorhen.AtomInfo[][]): Promise<void> {
        await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "shim_new_positions_for_residue_atoms",
            commandArgs: [this.molNo, movedResidues],
            changesMolecules: [this.molNo]
        })
        this.displayObjectsTransformation.origin = [0, 0, 0]
        this.displayObjectsTransformation.quat = null
        this.setAtomsDirty(true)
        await this.redraw()
    }

    /**
     * Apply cached transformation matrix to molecule
     */
    applyTransform() {
        const movedResidues = this.transformedCachedAtomsAsMovedAtoms()
        return this.updateWithMovedAtoms(movedResidues)
    }

    /**
     * Merge a set of molecules in this molecule instance
     * @param {moorhen.Molecule} otherMolecules - A list of other molecules to merge into this instance
     * @param {boolean} [doHide=false] - Indicates whether the source molecules should be hidden when finish
     */
    async mergeMolecules(otherMolecules: moorhen.Molecule[], doHide: boolean = false): Promise<void> {
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
                            molecule.hide(style)
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
            await this.redraw()

        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Add a ligand of a given type to this molecule isntance
     * @param {string} resType - Three letter code for the ligand of interest
     * @param {number} [fromMolNo=-999999] - Indicate the molecule number to which the ligand dictionary was associated (use -999999 for "any")
     */
    async addLigandOfType(resType: string, fromMolNo: number = -999999): Promise<moorhen.WorkerResponse> {
        const getMonomer = () => {
            return this.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'get_monomer_and_position_at',
                commandArgs: [resType.toUpperCase(), fromMolNo,
                ...this.glRef.current.origin.map(coord => -coord)
                ]
            }, true) as Promise<moorhen.WorkerResponse<number>>
        }

        let result = await getMonomer()

        if (result.data.result.result === -1) {
            await this.loadMissingMonomer(resType.toUpperCase(), fromMolNo)
            result = await getMonomer()
        }
        if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
            const newMolecule = new MoorhenMolecule(this.commandCentre, this.glRef, this.monomerLibraryPath)
            newMolecule.setAtomsDirty(true)
            newMolecule.molNo = result.data.result.result
            newMolecule.name = resType.toUpperCase()
            newMolecule.cootBondsOptions = this.cootBondsOptions
            await this.mergeMolecules([newMolecule], true)
            return newMolecule.delete()
        } else {
            console.log('Error getting monomer... Missing dictionary?')
            this.commandCentre.current.extendConsoleMessage('Error getting monomer... Missing dictionary?')
        }
    }

    /**
     * Get dictionary for a ligand associated with this molecule
     * @param {string} comp_id - Three letter code for the ligand of interest
     * @returns {string} The ligand dictionary
     */
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
                    this.ligandDicts[comp_id] = reassembledCif
                    unindentedLines = []
                }
                comp_id = arr[1]
            }
            unindentedLines.push(line.trim())
        }

        if (comp_id !== 'list') {
            const reassembledCif = unindentedLines.join("\n")
            this.ligandDicts[comp_id] = reassembledCif
        }
    }

    /**
     * Associate ligand dictionary with this molecule instance
     * @param {string} fileContent - The dictionary contents
     */
    async addDict(fileContent: string): Promise<void> {
        await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'shim_read_dictionary',
            commandArgs: [fileContent, this.molNo],
            changesMolecules: []
        }, true)

        this.addDictShim(fileContent)
    }

    /**
     * Undo last action performed on this molecule
     */
    async undo(): Promise<void> {
        await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "undo",
            commandArgs: [this.molNo]
        })
        this.setAtomsDirty(true)
        return this.redraw()
    }

    /**
     * Redo last action performed on this molecule
     */
    async redo(): Promise<void> {
        await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "redo",
            commandArgs: [this.molNo]
        })
        this.setAtomsDirty(true)
        return this.redraw()
    }

    /**
     * Update the ligand dictionaries for this molecule instance
     */
    async updateLigands(): Promise<void> {
        let ligandList: moorhen.LigandInfo[] = []
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
                    ligandList.push({ resName: resName, chainName: chainName, resNum: resNum, modelName: modelName })
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

    /**
     * Get atom information for a given CID selection
     * @param {string} cid - The CID selection
     * @returns {Promise<moorhen.AtomInfo[]>} JS objects containing atom information
     */
    async gemmiAtomsForCid(cid: string): Promise<moorhen.AtomInfo[]> {
        const $this = this

        if ($this.atomsDirty) {
            await $this.updateAtoms()
        }

        let result: moorhen.AtomInfo[] = []
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
                                    const atomInfo: moorhen.AtomInfo = {
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

    /**
     * Determine whether this molecule instance has any visible buffers
     * @param {string[]} excludeBuffers - A list of buffers that should be excluded from this check
     * @returns {boolean} True if the molecule has any visible buffers
     */
    hasVisibleBuffers(excludeBuffers: string[] = ['hover', 'unitCell', 'originNeighbours', 'selection', 'transformation', 'contact_dots', 'chemical_features', 'VdWSurface']): boolean {
        const styles = Object.keys(this.displayObjects).filter(key => !excludeBuffers.some(style => key.includes(style)))
        const displayBuffers = styles.map(style => this.displayObjects[style])
        const visibleDisplayBuffers = displayBuffers.filter(displayBuffer => displayBuffer.some(buffer => buffer.visible))
        return visibleDisplayBuffers.length !== 0
    }

    /**
     * Fetch the colour rules currently used for this molecule
     */
    async fetchCurrentColourRules() {
        let rules: moorhen.ColourRule[] = []
        const response = await this.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: "get_colour_rules",
            returnType: 'colour_rules',
            commandArgs: [this.molNo],
        }) as moorhen.WorkerResponse<libcootApi.PairType<string, string>[]>

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

    /**
     * Set new colour rules for this molecule instance
     * @param {moorhen.ColourRule[]} ruleList - The new colour rules
     * @param {boolean} [redraw=false] - Indicates whether the molecule should be redrawn after setting the new colour rules
     */
    async setColourRules(ruleList: moorhen.ColourRule[], redraw: boolean = false) {
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
                        message: 'coot_command',
                        command: 'set_colour_wheel_rotation_base',
                        returnType: 'status',
                        commandArgs: [this.molNo, 360 * h]
                    })
                )
            }
        })

        await Promise.all(promises)

        if (redraw) {
            this.setAtomsDirty(true)
            await this.redraw()
        }
    }

    /**
     * Hide representations for a given CID selection
     * @param {string} cid - The CID selection
     */
    async hideCid(cid: string): Promise<void> {
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
        if (chainIds.all) {
            chainIdList = this.sequences.map(sequence => sequence.chain)
        }

        if (!fromSeqId.empty()) {
            chainIdList.forEach(chainName => {
                if (toSeqId.empty()) {
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
        await this.redraw()
    }

    /**
     * Unhide all the molecule representations
     */
    async unhideAll() {
        await this.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: "clear_non_drawn_bonds",
            returnType: 'status',
            commandArgs: [this.molNo],
        })
        this.excludedSegments = []
        this.excludedCids = []
        await this.redraw()
    }

    /**
     * Draw enviroment distances for a given residue
     * @param {string} chainID - The chain ID
     * @param {number} resNo - The residue number
     * @param {string} altLoc - Alt. Loc. for the residue
     * @param {boolean} [labelled=false] - Indicates whether the distances should be labelled
     */
    async drawEnvironment(chainID: string, resNo: number, altLoc: string, labelled: boolean = false): Promise<void> {

        const response = await this.commandCentre.current.cootCommand({
            returnType: "generic_3d_lines_bonds_box",
            command: "make_exportable_environment_bond_box",
            commandArgs: [this.molNo, chainID, resNo, altLoc]
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

        this.drawGemmiAtomPairs(bumpAtomsPairs, "originNeighboursBump", [0.7, 0.4, 0.25, 1.0], labelled, true)

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
        this.drawGemmiAtomPairs(hbondAtomsPairs, "originNeighboursHBond", [0.7, 0.2, 0.7, 1.0], labelled, true)
    }

    /**
     * Draw H bonds for a given CID selection
     * @param {string} oneCid - The CID selection
     * @param {string} style - The style for the representation
     * @param {boolean} [labelled=false] - Indicates whether the H bonds should be labelled
     */
    async drawHBonds(oneCid: string, style: string, labelled: boolean = false) {
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

        this.drawGemmiAtomPairs(selectedGemmiAtomsPairs, style, [0.7, 0.2, 0.7, 1.0], labelled, true)
    }

    /**
     * Run rigid body fitting
     * @param {string} cidsString - Residue CID selection 
     * @param {number} mapNo - Map number that should be used
     */
    rigidBodyFit(cidsString: string, mapNo: number): Promise<moorhen.WorkerResponse> {
        return this.commandCentre.current.cootCommand({
            command: "rigid_body_fit",
            returnType: 'status',
            commandArgs: [this.molNo, cidsString, mapNo],
        })
    }

    /**
     * Generate self restraints
     * @param {number} [maxRadius=4.2] The maximum radius for the restraints
     */
    generateSelfRestraints(maxRadius: number = 4.2): Promise<moorhen.WorkerResponse> {
        return this.commandCentre.current.cootCommand({
            command: "generate_self_restraints",
            returnType: 'status',
            commandArgs: [this.molNo, maxRadius],
        })
    }

    /**
     * Clear all additional restraints
     */
    clearExtraRestraints(): Promise<moorhen.WorkerResponse> {
        return this.commandCentre.current.cootCommand({
            command: "clear_extra_restraints",
            returnType: 'status',
            commandArgs: [this.molNo],
        })
    }

    /**
     * Refine a set of residues
     * @param {string} cid - The CID selection with the atoms that should be refined
     * @param {string} mode - Refinement mode (SINGLE, TRIPLE ...etc.)
     * @param {number} ncyc - Number of refinement cycles
     */
    refineResiduesUsingAtomCid(cid: string, mode: string, ncyc: number): Promise<moorhen.WorkerResponse> {
        return this.commandCentre.current.cootCommand({
            command: "refine_residues_using_atom_cid",
            returnType: 'status',
            commandArgs: [this.molNo, cid, mode, ncyc],
        })
    }

    /**
     * Use SSM to superpose this molecule (as the moving structure) with another molecule isntance
     * @param {string} movChainId - Chain ID for the moving structure
     * @param {string} refMolNo - Molecule number for the reference structure
     * @param {string} refChainId - Chain ID for the reference structure
     */
    SSMSuperpose(movChainId: string, refMolNo: number, refChainId: string): Promise<moorhen.WorkerResponse> {
        return this.commandCentre.current.cootCommand({
            command: "SSM_superpose",
            returnType: 'superpose_results',
            commandArgs: [refMolNo, refChainId, this.molNo, movChainId],
        })
    }
}
