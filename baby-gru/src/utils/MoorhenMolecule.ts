import 'pako';
import { guid, readTextFile, readGemmiStructure, centreOnGemmiAtoms, getRandomMoleculeColour, doDownload } from './MoorhenUtils'
import { MoorhenMoleculeRepresentation } from "./MoorhenMoleculeRepresentation"
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
    atomCount: number;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    atomsDirty: boolean;
    isVisible: boolean;
    name: string;
    molNo: number | null
    gemmiStructure: gemmi.Structure;
    sequences: moorhen.Sequence[];
    representations: moorhen.MoleculeRepresentation[];
    ligands: moorhen.LigandInfo[];
    ligandDicts: { [comp_id: string]: string };
    connectedToMaps: number[];
    excludedSelections: string[];
    excludedCids: string[];
    symmetryOn: boolean;
    symmetryRadius: number;
    symmetryMatrices: number[][][];
    gaussianSurfaceSettings: {
        sigma: number;
        countourLevel: number;
        boxRadius: number;
        gridScale: number;
        bFactor: number;
    };
    isDarkBackground: boolean;
    defaultBondOptions: moorhen.cootBondOptions;
    displayObjectsTransformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
    uniqueId: string;
    monomerLibraryPath: string;
    defaultColourRules: moorhen.ColourRule[];
    hoverRepresentation: moorhen.MoleculeRepresentation;
    unitCellRepresentation: moorhen.MoleculeRepresentation;
    environmentRepresentation: moorhen.MoleculeRepresentation;
    selectionRepresentation: moorhen.MoleculeRepresentation;
    hasGlycans: boolean;
    hasDNA: boolean;
    restraints: {maxRadius: number, cid: string}[];
    isLigand: boolean;
    coordsFormat: moorhen.coorFormats

    constructor(commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, monomerLibraryPath = "./baby-gru/monomers") {
        this.type = 'molecule'
        this.commandCentre = commandCentre
        this.glRef = glRef
        this.atomsDirty = true
        this.isVisible = true
        this.name = "unnamed"
        this.molNo = null
        this.coordsFormat = null
        this.gemmiStructure = null
        this.sequences = []
        this.ligands = null
        this.ligandDicts = {}
        this.connectedToMaps = null
        this.representations = []
        this.excludedSelections = []
        this.excludedCids = []
        this.symmetryOn = false
        this.symmetryRadius = 25
        this.symmetryMatrices = []
        this.isDarkBackground = false
        this.atomCount = null
        this.gaussianSurfaceSettings = {
            sigma: 4.4,
            countourLevel: 4.0,
            boxRadius: 5.0,
            gridScale: 0.7,
            bFactor: 100
        }
        this.defaultBondOptions = {
            smoothness: 1,
            width: 0.1,
            atomRadiusBondRatio: 1
        }
        this.restraints = []
        this.hasDNA = false
        this.hasGlycans = false
        this.isLigand = false
        this.displayObjectsTransformation = { origin: [0, 0, 0], quat: null, centre: [0, 0, 0] }
        this.uniqueId = guid()
        this.monomerLibraryPath = monomerLibraryPath
        this.defaultColourRules = null
        this.unitCellRepresentation = new MoorhenMoleculeRepresentation('unitCell', '/*/*/*/*', this.commandCentre, this.glRef)
        this.unitCellRepresentation.setParentMolecule(this)
        this.environmentRepresentation = new MoorhenMoleculeRepresentation('environment', null, this.commandCentre, this.glRef)
        this.environmentRepresentation.setParentMolecule(this)
        this.hoverRepresentation = new MoorhenMoleculeRepresentation('hover', null, this.commandCentre, this.glRef)
        this.hoverRepresentation.setParentMolecule(this)
        this.selectionRepresentation = new MoorhenMoleculeRepresentation('residueSelection', null, this.commandCentre, this.glRef)
        this.selectionRepresentation.setParentMolecule(this)
    }

    /**
     * Rename a given chain with a new ID
     * @param {string} oldId - The old chain ID
     * @param {string} newId - The new chain ID
     */
    async changeChainId(oldId: string, newId: string) {
        await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'rename_chain',
            commandArgs: [this.molNo, oldId, newId],
            changesMolecules: [this.molNo]
        }, true)
        this.setAtomsDirty(true)
        await this.redraw()
    }

    /**
     * Replace the current molecule with the model in a file
     * @param {string} fileUrl - The uri to the file with the new model
     */
    async replaceModelWithFile(fileUrl: string): Promise<void> {
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
            command: 'replace_molecule_by_model_from_string',
            commandArgs: [this.molNo, coordData],
            changesMolecules: [this.molNo]
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
            }, false) as moorhen.WorkerResponse<{ matrix: number[][] }[]>
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
        this.representations.forEach(representation => representation.drawSymmetry())
    }

    /**
     * Set the background colour where the molecule is being drawn. Used to detect whether the background is dark and molecule needs to be rendered using lighter colours.
     * @param {number[]} backgroundColour - The rgba indicating the background colour
     */
    setBackgroundColour(backgroundColour: [number, number, number, number]) {
        this.isDarkBackground = isDarkBackground(...backgroundColour)
    }

    /**
     * Update the cached gemmi structure for this molecule
     */
    async updateGemmiStructure(coordString: string): Promise<void> {
        if (this.gemmiStructure && !this.gemmiStructure.isDeleted()) {
            this.gemmiStructure.delete()
        }
        this.gemmiStructure = readGemmiStructure(coordString, this.name)
        window.CCP4Module.gemmi_setup_entities(this.gemmiStructure)
        // Only override if this is mmcif
        window.CCP4Module.gemmi_add_entity_types(this.gemmiStructure, this.coordsFormat === 'mmcif')
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
    async getNeighborResiduesCids(selectionCid: string, maxDist: number): Promise<string[]> {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'get_neighbours_cid',
            commandArgs: [this.molNo, selectionCid, maxDist]
        }, true) as moorhen.WorkerResponse<string>

        const multiCidRanges: string[] = response.data.result.result.split('||')
        return multiCidRanges
    }

    /**
     * Parse the sequences in the molecule 
     */
    parseSequences(): void {
        if (this.gemmiStructure === null) {
            return
        }

        let result: moorhen.Sequence[] = []
        const sequenceInfoVec = window.CCP4Module.get_sequence_info(this.gemmiStructure, this.name)
        const sequenceInfoVecSize = sequenceInfoVec.size()
        for (let i = 0; i < sequenceInfoVecSize; i++) {
            const sequenceInfo = sequenceInfoVec.get(i)
            const sequenceInfoSeq = sequenceInfo.sequence
            let currentSequence: moorhen.ResidueInfo[] = []
            const sequenceInfoSize = sequenceInfoSeq.size()
            for (let i = 0; i < sequenceInfoSize; i++) {
                currentSequence.push(sequenceInfoSeq.get(i))
            }
            sequenceInfoSeq.delete()    
            result.push({
                name: sequenceInfo.name,
                chain: sequenceInfo.chain,
                type: sequenceInfo.type,
                sequence: currentSequence
            })
        }
        sequenceInfoVec.delete()

        this.sequences = result
        this.hasDNA = this.sequences.some(sequence => [3, 4, 5].includes(sequence.type))
    }

    /**
     * Check if the molecule instance consists of a ligand
     * @returns {boolean} True if the molecule is a ligand
     */
    checkIsLigand(): boolean {
        let isLigand = true
        this.isLigand = window.CCP4Module.structure_is_ligand(this.gemmiStructure)
        return isLigand
    }

    /**
     * Delete this molecule instance
     */
    async delete(): Promise<moorhen.WorkerResponse> {
        this.hoverRepresentation?.deleteBuffers()
        this.unitCellRepresentation?.deleteBuffers()
        this.environmentRepresentation?.deleteBuffers()
        this.selectionRepresentation?.deleteBuffers()
        this.representations.forEach(representation => representation.deleteBuffers())
        this.glRef.current.drawScene()
        const response = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'close_molecule',
            commandArgs: [this.molNo]
        }, true) as moorhen.WorkerResponse<number>
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
        let coordString = await this.getAtoms()
        let newMolecule = new MoorhenMolecule(this.commandCentre, this.glRef, this.monomerLibraryPath)
        newMolecule.name = `${this.name}-placeholder`
        newMolecule.defaultBondOptions = this.defaultBondOptions
        newMolecule.coordsFormat = this.coordsFormat

        let response = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'read_pdb_string',
            commandArgs: [coordString, newMolecule.name]
        }, true) as moorhen.WorkerResponse<number>

        newMolecule.molNo = response.data.result.result
        newMolecule.isLigand = this.isLigand
        newMolecule.hasGlycans = this.hasGlycans
        newMolecule.hasDNA = this.hasDNA

        await Promise.all(Object.keys(this.ligandDicts).map(key => newMolecule.addDict(this.ligandDicts[key])))
        await newMolecule.fetchDefaultColourRules()
        await newMolecule.fetchIfDirtyAndDraw('CBs')

        return newMolecule
    }

    /**
     * Copy a fragment of the current model into a new molecule using a selection CID
     * @param {string} cid - The CID selection indicating the residues that will be copied into the new fragment
     * @param {boolean} [doRecentre=true] - Indicates whether the view should re-centre on the new copied fragment
     * @param {boolean} [style="CBs"] - Indicates the style used to draw the copied fragment (only takes effect if doRecentre=true)
     * @returns {Promise<moorhen.Molecule>}  New molecule instance
     */
    async copyFragmentUsingCid(cid: string, doRecentre: boolean = true, style: moorhen.RepresentationStyles = 'CBs'): Promise<moorhen.Molecule> {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "copy_fragment_using_cid",
            commandArgs: [this.molNo, cid],
        }, true) as moorhen.WorkerResponse<number>
        const newMolecule = new MoorhenMolecule(this.commandCentre, this.glRef, this.monomerLibraryPath)
        newMolecule.name = `${this.name} fragment`
        newMolecule.molNo = response.data.result.result
        newMolecule.isDarkBackground = this.isDarkBackground
        newMolecule.defaultBondOptions = this.defaultBondOptions
        newMolecule.coordsFormat = this.coordsFormat
        await Promise.all(Object.keys(this.ligandDicts).map(key => newMolecule.addDict(this.ligandDicts[key])))
        await newMolecule.fetchDefaultColourRules()
        if (doRecentre) {
            newMolecule.setAtomsDirty(true)
            await newMolecule.fetchIfDirtyAndDraw(style)
            await newMolecule.centreOn('/*/*/*/*', true, true)
        }
        return newMolecule
    }

    /**
     * Load a new molecule from a file URL
     * @param {string} url - The url to the path with the data for the new molecule
     * @param {string} molName - The new molecule name
     * @param {object} [options] - Options passed to fetch API
     * @returns {Promise<moorhen.Molecule>} The new molecule
     */
    async loadToCootFromURL(url: RequestInfo | URL, molName: string, options?: RequestInit): Promise<moorhen.Molecule> {
        const response = await fetch(url, options)
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
     * @param {File} source - The input file
     * @returns {Promise<moorhen.Molecule>} The new molecule
     */
    async loadToCootFromFile(source: File): Promise<moorhen.Molecule> {
        try {
            const coordData = await readTextFile(source);
            return await this.loadToCootFromString(coordData, source.name);
        } catch (err) {
            return await Promise.reject(err);
        }
    }

    /**
     * Guess the coordinate format from the file contents
     * @param {string} coordDataString - The file contents
     * @returns {string} - The file format
     */
    static guessCoordFormat(coordDataString: string): moorhen.coorFormats {
        let result: moorhen.coorFormats = 'pdb'
        try {
            const format = window.CCP4Module.guess_coord_data_format(coordDataString)
            if (format === 0) {
                // result = 'unknown'
            } else if (format === 1) {
                // result = 'detect'
            } else if (format === 2) {
                result = 'pdb'
            } else if (format === 3) {
                result = 'mmcif'
            } else if (format === 4) {
                // result = 'mmjson'
            } else if (format === 5) {
                // result = 'chemComp'
            }    
        } catch (err) {
            console.warn(err)
            console.log('Unable to guess format of coords using gemmi... Defaulting to PDB format')
        }
        return result
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

        this.coordsFormat = MoorhenMolecule.guessCoordFormat(coordData as string)
        this.name = name.replace(pdbRegex, "").replace(entRegex, "").replace(cifRegex, "").replace(mmcifRegex, "");

        try {
            this.updateGemmiStructure(coordData as string)
            this.atomsDirty = false
            const response = await this.commandCentre.current.cootCommand({
                returnType: "status",
                command: 'read_pdb_string',
                commandArgs: [coordData, this.name],
            }, true)
            this.molNo = response.data.result.result
            await Promise.all([
                this.getNumberOfAtoms(),
                this.loadMissingMonomers(),
                this.checkHasGlycans(),
                this.fetchDefaultColourRules()
            ])
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
    async loadMissingMonomer(newTlc: string, attachToMolecule: number): Promise<string> {
        let response: Response = await fetch(`${this.monomerLibraryPath}/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`)
        const fileContent = await response.text()
        let dictContent: string

        if (!fileContent.includes('data_')) {
            try {
                const url = `https://raw.githubusercontent.com/MonomerLibrary/monomers/master/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`
                response = await fetch(url);
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

        await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'read_dictionary_string',
            commandArgs: [dictContent, attachToMolecule],
        }, false)
        
        return dictContent
    }

    /**
     * Attempt to load dictionaries for all missing monomers present in the molecule
     * @returns {Promise<moorhen.Molecule>} This molecule instance
     */
    async loadMissingMonomers(): Promise<void> {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "string_array",
            command: 'get_residue_names_with_no_dictionary',
            commandArgs: [this.molNo],
        }, false) as moorhen.WorkerResponse<string[]>

        if (response.data.result.status === 'Completed') {
            try {
                const ligandDicts = await Promise.all(
                    response.data.result.result.map(newTlc => {
                        return this.loadMissingMonomer(newTlc, -999999)
                    })
                )
                ligandDicts.forEach(ligandDict => this.addDictShim(ligandDict))
            } catch (err) {
                console.log(err)
                console.warn('Error in loadMissingMonomers...')
            }
        } else {
            console.log('Error in loadMissingMonomers...');
        }
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
     * @param {string} [format='pdb'] - File format will match the one of the original file unless specified here
     * @returns {string}  A string representation file contents
     */
    async getAtoms(format?: 'mmcif' | 'pdb'): Promise<string> {
        let cootCommand = 'molecule_to_PDB_string'
        if (format) {
            cootCommand = format === 'mmcif' ? 'molecule_to_mmCIF_string' : 'molecule_to_PDB_string'
        } else if (this.coordsFormat) {
            cootCommand = this.coordsFormat === 'mmcif' ? 'molecule_to_mmCIF_string' : 'molecule_to_PDB_string'
        }
        const response = await this.commandCentre.current.cootCommand({
            returnType: "string",
            command: cootCommand,
            commandArgs: [this.molNo],
        }, false) as moorhen.WorkerResponse<string>
        return response.data.result.result
    }

    /**
     * Download the PDB file contents of the molecule in its current state
     * @param {string} [format='pdb'] - File format will match the one of the original file unless specified here
     */
    async downloadAtoms(format?: 'mmcif' | 'pdb') {
        const coordsString = await this.getAtoms(format)
        doDownload([coordsString], `${this.name}.${format ? format : this.coordsFormat ? this.coordsFormat : 'pdb'}`)
    }

    /**
     * Check if the current molecule has glycans
     * @returns {Promise<boolean>} - True if the current molecule has glycans
     */
    async checkHasGlycans(): Promise<boolean> {
        const result = await this.commandCentre.current.cootCommand({
            returnType: 'boolean',
            command: 'model_has_glycans',
            commandArgs: [this.molNo],
        }, false) as moorhen.WorkerResponse<boolean>
        this.hasGlycans = result.data.result.result
        return this.hasGlycans
    }

    /**
     * Update the cached atoms with the latest information from the libcoot api
     */
    async updateAtoms() {
        if (this.gemmiStructure && !this.gemmiStructure.isDeleted()) {
            this.gemmiStructure.delete()
        }
        const [_hasGlycans, coordString] = await Promise.all([
            this.checkHasGlycans(),
            this.getAtoms()
        ])
        try {
            this.updateGemmiStructure(coordString)
        }
        catch (err) {
            console.log(err)
            console.warn('Issue parsing coordinates into Gemmi structure', coordString)
        }
        this.atomsDirty = false
}

    /**
     * Draw the molecule with a particular style. If the molecule atoms are marked as "dirty" then fetch new atoms.
     * @param {string} style - The style that will be drawn
     */
    async fetchIfDirtyAndDraw(style: moorhen.RepresentationStyles): Promise<void> {
        if (this.atomsDirty) {
            await this.updateAtoms()
        }

        const cid = "/*/*/*/*"
        const representation = this.representations.find(item => item.style === style && item.cid === cid)
        if (representation) {
            await this.redrawRepresentation(representation.uniqueId)
        } else {
            await this.addRepresentation(style, cid)
        }
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
    async centreOn(selectionCid: string = '/*/*/*/*', animate: boolean = true, setZoom: boolean = false): Promise<void> {
        if (this.atomsDirty) {
            await this.updateAtoms()
        }

        const selectionAtoms = await this.gemmiAtomsForCid(selectionCid)

        if (selectionAtoms.length === 0) {
            console.log('Unable to selet any atoms, skip centering...')
            return
        }

        let selectionCentre = centreOnGemmiAtoms(selectionAtoms)

        if (animate && setZoom) {
            this.glRef.current.setOriginAndZoomAnimated(selectionCentre, 0.4)
        } else if (animate) {
            this.glRef.current.setOriginAnimated(selectionCentre)
        } else if (setZoom) {
            this.glRef.current.setOrigin(selectionCentre)
            this.glRef.current.setZoom(0.4)
        } else {
            this.glRef.current.setOrigin(selectionCentre)
        }
    }

    /**
     * Draw molecule from a given mesh
     * @param {string} style - Indicate the style to be drawn
     * @param {any[]} meshObjects - The mesh obects that will be drawn
     * @param {string} [cid] - The new buffer CID selection
     */
    async drawWithStyleFromMesh(style: moorhen.RepresentationStyles, meshObjects: any[], cid: string = "/*/*/*/*"): Promise<void> {
        let representation = this.representations.find(item => item.style === style && item.cid === cid)
        if (!representation) {
            representation = new MoorhenMoleculeRepresentation(style, cid, this.commandCentre, this.glRef)
            representation.setParentMolecule(this)
            this.representations.push(representation)
        }

        representation.deleteBuffers()
        representation.buildBuffers(meshObjects)
        let bufferAtoms = await this.gemmiAtomsForCid(cid)
        if(bufferAtoms.length > 0) {
            representation.setAtomBuffers(bufferAtoms)
        }
        representation.show()
    }

    /**
     * Add a representation to the molecule
     * @param {string} style - The style of the new representation
     * @param {string} cid - The CID selection for the residues included in the new representation
     * @param {boolean} [isCustom=false] - Indicates if the representation is considered "custom"
     * @param {moorhen.ColourRule[]} [colourRules=undefined] - A list of colour rules that will be applied to the new representation
     * @param {moorhen.cootBondOptions} [bondOptions=undefined] - An object that describes bond width, atom/bond ratio and other bond settings.
     * @param {boolean} [applyColourToNonCarbonAtoms=undefined] - If true then colours are applied to non-carbon atoms also.
     */
    async addRepresentation(style: moorhen.RepresentationStyles, cid: string = '/*/*/*/*', isCustom: boolean = false, colourRules?: moorhen.ColourRule[], bondOptions?: moorhen.cootBondOptions, applyColourToNonCarbonAtoms?: boolean) {
        if (!this.defaultColourRules) {
            await this.fetchDefaultColourRules()
        }
        const representation = new MoorhenMoleculeRepresentation(style, cid, this.commandCentre, this.glRef)
        representation.isCustom = isCustom
        representation.setParentMolecule(this)
        representation.setColourRules(colourRules)
        representation.setBondOptions(bondOptions)
        representation.setApplyColourToNonCarbonAtoms(applyColourToNonCarbonAtoms)
        await representation.draw()
        this.representations.push(representation)
        await this.drawSymmetry(false)
        return representation
    }

    /**
     * Redraw a molecule representation
     * @param {string} id - Unique identifier for the representation of interest
     */
    async redrawRepresentation(id: string) {
        const representation = this.representations.find(representation => representation.uniqueId === id)
        await representation.redraw()
        await this.drawSymmetry(false)
    }

    /**
     * Show the representation for the molecule 
     * @param {string} style - The representation style to show
     * @param {string} [cid=undefined] - The CID selection for the representation
     */
    show(style: moorhen.RepresentationStyles, cid?: string): void {
        if (!cid && style === 'ligands') {
            cid = "/*/*/(!ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR,WAT,HOH,THP,SEP,TPO,TYP,PTR,OH2,H2O)"
        } else if (!cid) {
            cid = '/*/*/*/*'
        }
        try {
            const representation = this.representations.find(item => item.style === style && item.cid === cid)
            if (representation) {
                representation.show()
            } else {
                this.addRepresentation(style, cid)
            }
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Hide a type of representation for the molecule 
     * @param {string} style - The representation style to hide
     * @param {string} [cid=undefined] - The CID selection for the representation
     */
    hide(style: moorhen.RepresentationStyles, cid?: string) {
        if (!cid && style === 'ligands') {
            cid = "/*/*/(!ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR,WAT,HOH,THP,SEP,TPO,TYP,PTR,OH2,H2O)"
        } else if (!cid) {
            cid = '/*/*/*/*'
        }
        try {
            const representation = this.representations.find(item => item.style === style && item.cid === cid)
            if (representation) {
                representation.hide()
            }
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Clears the representation buffers for a particular style
     * @param {string} style - The style to clear
     */
    clearBuffersOfStyle(style: string) {
        if (style === 'hover') {
            this.hoverRepresentation?.deleteBuffers()
        } else if (style === 'unitCell') {
            this.unitCellRepresentation?.deleteBuffers()
        } else if (style === 'environment') {
            this.environmentRepresentation?.deleteBuffers()
        } else if (style === 'residueSelection') {
            this.selectionRepresentation?.deleteBuffers()
        } else {
            this.representations.forEach(representation => representation.style === style ? representation.deleteBuffers() : null)
            this.representations = this.representations.filter(representation => representation.style !== style)
        }
    }

    /**
     * Remove a representation for this molecule instance
     * @param {string} representationId - The unique identifier for the representation
     */
    removeRepresentation(representationId: string) {
        this.representations.forEach(representation => representation.uniqueId === representationId ? representation.deleteBuffers() : null)
        this.representations = this.representations.filter(representation => representation.uniqueId !== representationId)
    }

    /**
     * Check whether a particular buffer is included within the representation buffer for this molecule
     * @param bufferIn - The buffer with the ID to search for
     * @returns {boolean} True if the buffer is included in this molecule
     */
    buffersInclude(bufferIn: { id: string; }): boolean {
        const BreakException = {};
        try {
            this.representations.forEach(representation => {
                if (Array.isArray(representation.buffers)) {
                    const matchedBuffer = representation.buffers.find(buffer => bufferIn.id === buffer.id)
                    if (matchedBuffer) {
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
    async drawUnitCell() {
        if (this.unitCellRepresentation && this.unitCellRepresentation.buffers?.length > 0) {
            this.unitCellRepresentation.show()
        } else {
            await this.unitCellRepresentation.draw()
        }
    }

    /**
     * Draw a hover effect over a selected residue
     * @param {string} selectionString - The CID selection for the residue that will be highlighted
     */
    async drawHover(selectionString: string): Promise<void> {
        if (typeof selectionString === 'string') {
            this.hoverRepresentation.cid = selectionString
            this.hoverRepresentation.redraw()
        }
    }

    /**
     * Highlight residues in a selected CID range
     * @param {string} selectionString - The CID selection for the residues that will be highlighted
     */
    async drawResidueSelection(selectionString: string): Promise<void> {
        if (typeof selectionString === 'string') {
            this.selectionRepresentation.cid = selectionString
            this.selectionRepresentation.redraw()
        }
    }

    /**
     * Draw enviroment distances for a given residue
     * @param {string} selectionCid - The CID
     * @param {boolean} [labelled=false] - Indicates whether the distances should be labelled
     */
    async drawEnvironment(selectionCid: string, labelled: boolean = false): Promise<void> {
        if (typeof selectionCid === 'string') {
            this.environmentRepresentation.cid = selectionCid
            this.environmentRepresentation.redraw()
        }
    }

    /**
     * Redraw the molecule representations
     */
    async redraw(): Promise<void> {
        if (this.atomsDirty) {
            try {
                await this.updateAtoms()
            } catch (err) {
                console.log(err)
                return
            }
        }

        for (const representation of this.representations) {
            if (representation.visible) {
                await this.redrawRepresentation(representation.uniqueId)
            } else {
                representation.deleteBuffers()
            }
        }

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
        }, true)
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
     * Get a list with the names of the chains in the current model
     * @returns {string[]} - A list of chain names in the current structure
     */
    getChainNames(): string[] {
        let result: string[] = []
        const models = this.gemmiStructure.models
        const modelsSize = models.size()
        for (let modelIndex = 0; modelIndex < modelsSize; modelIndex++) {
            const model = models.get(modelIndex)
            const chains = model.chains
            const chainsSize = chains.size()
            for (let chainIndex = 0; chainIndex < chainsSize; chainIndex++) {
                const chain = chains.get(chainIndex)
                result.push(chain.name)
                chain.delete()
            }
            model.delete()
            chains.delete()
        }
        models.delete()
        return result
    }

    /**
     * Merge a set of molecules in this molecule instance
     * @param {moorhen.Molecule} otherMolecules - A list of other molecules to merge into this instance
     * @param {boolean} [doHide=false] - Indicates whether the source molecules should be hidden when finish
     */
    async mergeMolecules(otherMolecules: moorhen.Molecule[], doHide: boolean = false): Promise<void> {
        try {
            const prevChainNames = this.getChainNames()
            await this.commandCentre.current.cootCommand({
                command: 'merge_molecules',
                commandArgs: [this.molNo, `${otherMolecules.map(molecule => molecule.molNo).join(':')}`],
                returnType: "merge_molecules_return",
                changesMolecules: [this.molNo]
            }, true)

            let promises = []
            otherMolecules.forEach(molecule => {
                if (doHide) {
                    molecule.representations.forEach(item => item.hide())
                }
                Object.keys(molecule.ligandDicts).forEach(key => {
                    if (!Object.hasOwn(this.ligandDicts, key)) {
                        promises.push(this.addDict(molecule.ligandDicts[key]))
                    }
                })
            })
            await Promise.all(promises)

            await this.updateAtoms()
            const currentChains = this.getChainNames()
            const newChains = currentChains.filter(chainName => !prevChainNames.includes(chainName))
            newChains.forEach(chainName => {
                const selectedColour = getRandomMoleculeColour()
                this.defaultColourRules.push({
                    args: [`//${chainName}`, selectedColour],
                    isMultiColourRule: false,
                    ruleType: 'chain',
                    color: selectedColour,
                    label: `//${chainName}`,
                })
            })

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
            newMolecule.defaultBondOptions = this.defaultBondOptions
            await this.mergeMolecules([newMolecule], true)
            return newMolecule.delete()
        } else {
            console.log('Error getting monomer... Missing dictionary?')
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
        if (!fileContent) {
            console.warn('File contents for dictionary not found, doing nothing...')
            return
        }

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
        if (!fileContent) {
            console.warn('File contents for dictionary not found, doing nothing...')
            return
        }

        await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'read_dictionary_string',
            commandArgs: [fileContent, this.molNo]
        }, false)

        this.addDictShim(fileContent)
    }

    /**
     * Undo last action performed on this molecule
     */
    async undo(): Promise<void> {
        await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "undo",
            commandArgs: [this.molNo],
            changesMolecules: [this.molNo]
        }, true)
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
            commandArgs: [this.molNo],
            changesMolecules: [this.molNo]
        }, true)
        this.setAtomsDirty(true)
        return this.redraw()
    }

    /**
     * Update the ligand dictionaries for this molecule instance
     */
    async updateLigands(): Promise<void> {
        let ligandList: moorhen.LigandInfo[] = []
        const ligandInfoVec = window.CCP4Module.get_ligand_info_for_structure(this.gemmiStructure)
        const ligandInfoVecSize = ligandInfoVec.size()
        for (let i = 0; i < ligandInfoVecSize; i++) {
            const ligandInfo = ligandInfoVec.get(i)
            ligandList.push({...ligandInfo})
        }
        ligandInfoVec.delete()

        this.ligands = ligandList
        this.checkIsLigand()
    }

    /**
     * Get atom information for a given CID selection
     * @param {string} cid - The CID selection
     * @returns {Promise<moorhen.AtomInfo[]>} JS objects containing atom information
     */
    async gemmiAtomsForCid(cid: string, omitExcludedCids: boolean = false): Promise<moorhen.AtomInfo[]> {
        if (this.atomsDirty || this.gemmiStructure.isDeleted()) {
            await this.updateAtoms()
        }
        
        let result: moorhen.AtomInfo[] = []
        const atomInfoVec = window.CCP4Module.get_atom_info_for_selection(this.gemmiStructure, cid, omitExcludedCids ? this.excludedSelections.join("||") : "")
        const atomInfoVecSize = atomInfoVec.size()
        for (let i = 0; i < atomInfoVecSize; i++) {
            const atomInfo = atomInfoVec.get(i)
            result.push({...atomInfo, pos: [atomInfo.x, atomInfo.y, atomInfo.z]})
        }
        atomInfoVec.delete()
        
        return result
    }

    /**
     * Determine whether this molecule instance has any visible buffers
     * @param {string[]} excludeBuffers - A list of buffers that should be excluded from this check
     * @returns {boolean} True if the molecule has any visible buffers
     */
    hasVisibleBuffers(excludeBuffers: string[] = ['hover', 'unitCell', 'originNeighbours', 'selection', 'transformation', 'contact_dots', 'chemical_features', 'VdWSurface']): boolean {
        const representations = this.representations.filter(item => !excludeBuffers.includes(item.style))
        const isVisible = representations.some(item => item.visible)
        return isVisible
    }

    /**
     * Set the default colour rules for this molecule from libcoot API
     */
    async fetchDefaultColourRules() {
        if (this.defaultColourRules) {
            console.log('Default colour rules already set, doing nothing...')
            return
        }

        let rules: moorhen.ColourRule[] = []

        const response = await this.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: "get_colour_rules",
            returnType: 'colour_rules',
            commandArgs: [this.molNo],
        }, false) as moorhen.WorkerResponse<libcootApi.PairType<string, string>[]>
        
        response.data.result.result.forEach(rule => {
            rules.push({
                args: [rule.first, rule.second],
                isMultiColourRule: false,
                ruleType: 'chain',
                color: rule.second,
                label: rule.first
            })
        })

        this.defaultColourRules = rules
    }

    /**
     * Hide representations for a given CID selection
     * @param {string} cid - The CID selection
     * @param {boolean} [redraw=true] - Indicates if the molecule should be redrawn
     */
    async hideCid(cid: string, redraw: boolean = true): Promise<void> {
        if (cid.includes('||')) {
            await Promise.all(cid.split('||').map(i => {
                this.commandCentre.current.cootCommand({
                    message: 'coot_command',
                    command: "add_to_non_drawn_bonds",
                    returnType: 'status',
                    commandArgs: [this.molNo, i],
                }, false)
            }))
        } else {
            await this.commandCentre.current.cootCommand({
                message: 'coot_command',
                command: "add_to_non_drawn_bonds",
                returnType: 'status',
                commandArgs: [this.molNo, cid],
            }, false)    
        }

        // We want a list with the CID ranges (e.g. //A/1-10)
        if (cid.includes("||")) {
            this.excludedSelections.push(...cid.split("||"))
        } else {
            this.excludedSelections.push(cid)
        }

        // We also want a list with individual residue CIDs
        const cidVect = window.CCP4Module.parse_multi_cids(this.gemmiStructure, cid)
        const cidVectSize = cidVect.size()
        for (let i = 0; i < cidVectSize; i++) {
            const cid = cidVect.get(i)
            this.excludedCids.push(cid)
        }
        cidVect.delete()

        // Redraw to apply changes
        if (redraw) {
            await this.redraw()
        }
    }

    /**
     * Unhide all the molecule representations
     * @param {boolean} [redraw=true] - Indicates if the molecule should be redrawn
     */
    async unhideAll(redraw: boolean = true) {
        await this.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: "clear_non_drawn_bonds",
            returnType: 'status',
            commandArgs: [this.molNo],
        }, false)
        this.excludedSelections = []
        this.excludedCids = []
        if (redraw) {
            await this.redraw()
        }
    }

    /**
     * Run rigid body fitting
     * @param {string} cidsString - Residue CID selection 
     * @param {number} mapNo - Map number that should be used
     */
    async rigidBodyFit(cidsString: string, mapNo: number, redraw: boolean = true): Promise<void> {
        await this.commandCentre.current.cootCommand({
            command: "rigid_body_fit",
            returnType: 'status',
            commandArgs: [this.molNo, cidsString, mapNo],
            changesMolecules: [this.molNo]
        }, true)
                
        this.setAtomsDirty(true)
        if (redraw) {
            await this.redraw()
        }
    }

    /**
     * Generate self restraints
     * @param {string} [cid="//"] The CID for local restraints
     * @param {number} [maxRadius=4.2] The maximum radius for the restraints
     */
    async generateSelfRestraints(cid: string = "//", maxRadius: number = 4.2): Promise<void> {
        await this.commandCentre.current.cootCommand({
            command: "generate_self_restraints",
            returnType: 'status',
            commandArgs: [this.molNo, maxRadius],
        }, false)
        this.restraints.push({ maxRadius, cid })
    }

    /**
     * Clear all additional restraints
     */
    clearExtraRestraints(): Promise<moorhen.WorkerResponse> {
        this.restraints = []
        return this.commandCentre.current.cootCommand({
            command: "clear_extra_restraints",
            returnType: 'status',
            commandArgs: [this.molNo],
        }, false)
    }

    /**
     * Refine a set of residues
     * @param {string} cid - The CID selection with the atoms that should be refined
     * @param {string} mode - Refinement mode (SINGLE, TRIPLE ...etc.)
     * @param {number} [ncyc=4000] - Number of refinement cycles
     * @param {boolean} [redraw=true] - Indicates if the molecule should be redrawn
     */
    async refineResiduesUsingAtomCid(cid: string, mode: string, ncyc: number = 4000, redraw: boolean = true): Promise<void> {
        await this.commandCentre.current.cootCommand({
            command: "refine_residues_using_atom_cid",
            returnType: 'status',
            commandArgs: [this.molNo, cid, mode, ncyc],
            changesMolecules: [this.molNo]
        }, true)
        
        this.setAtomsDirty(true)
        if (redraw) {
            await this.redraw()
        }
    }

    /**
     * Refine a residue range
     * @param {string} chainId - The chain ID for the residue range
     * @param {string} start - First residue number in the range
     * @param {string} stop - Last residue number in the range
     * @param {number} [ncyc=4000] - Number of refinement cycles
     * @param {boolean} [redraw=true] - Indicates if the molecule should be redrawn
     */
    async refineResidueRange(chainId: string, start: number, stop: number, ncyc: number = 4000, redraw: boolean = true): Promise<void> {
        await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'refine_residue_range',
            commandArgs: [this.molNo, chainId, start, stop, ncyc],
            changesMolecules: [this.molNo]
        }, true)

        this.setAtomsDirty(true)
        if (redraw) {
            await this.redraw()
        }
    }

    /**
     * Refine a molecule with animation effect
     * @param {number} n_cyc - The totale number of refinement cycles for each iteration
     * @param {number} n_iteration - The number of iterations
     * @param {number} [final_n_cyc=100] - Number of refinement cycles in the last iteration
     */
    async animateRefine(n_cyc: number, n_iteration: number, final_n_cyc: number = 100) {
        for (let i = 0; i <= n_iteration; i++) {
            const result = await this.commandCentre.current.cootCommand({
                returnType: 'status_instanced_mesh_pair',
                command: 'refine',
                commandArgs: [this.molNo, i !== n_iteration ? n_cyc : final_n_cyc]
            }, false) as moorhen.WorkerResponse<{ status: number; mesh: libcootApi.InstancedMeshJS[]; }>
    
            if (result.data.result.result.status !== -2) {
                return
            }
    
            if (i !== n_iteration) {
                await this.drawWithStyleFromMesh('CBs', [result.data.result.result.mesh])
            }
        }
        this.setAtomsDirty(true)
        await this.fetchIfDirtyAndDraw('CBs')
    }
    
    /**
     * Delete residues in a given CID
     * @param {string} cid - The CID to delete
     * @param {boolean} [redraw=true] - Indicates if the molecule should be redrawn
     * @returns {object} - A pair where first is the return status and second is the atom count of the molecule after deletion
     */
    async deleteCid(cid: string, redraw: boolean = true): Promise<libcootApi.PairType<number, number>> {
        const result = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: "delete_using_cid",
            commandArgs: [this.molNo, cid, "LITERAL"],
            changesMolecules: [this.molNo]
        }, true) as moorhen.WorkerResponse<libcootApi.PairType<number, number>>
        
        this.setAtomsDirty(true)
        if (redraw) {
            await this.redraw()
        }
        
        return result.data.result.result
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
            changesMolecules: [this.molNo]
        }, true)
    }

    /**
     * A function to fit a given ligand
     * @param {number} mapMolNo - The map iMol that will be used for ligand fitting
     * @param {number} ligandMolNo - The ligand iMol that will be fitted
     * @param {boolean} [fitRightHere=true] - Indicates if the ligand should be fitted at the current origin
     * @param {boolean} [redraw=false] - Indicates if the fitted ligands should be drawn
     * @param {boolean} [useConformers=false] - Indicates if there is need to test multiple conformers
     * @param {number} [conformerCount=0] - Conformer count
     * @returns {Promise<moorhen.Molecule[]>} - A list of fitted ligands
     */
    async fitLigand(mapMolNo: number, ligandMolNo: number, fitRightHere: boolean = true, redraw: boolean = false, useConformers: boolean = false, conformerCount: number = 0): Promise<moorhen.Molecule[]> {
        let newMolecules: moorhen.Molecule[] = []
        const command = fitRightHere ? 'fit_ligand_right_here' : 'fit_ligand'
        const returnType = fitRightHere ? 'int_array' : 'fit_ligand_info_array'
        
        const commandArgs = fitRightHere ? [
            this.molNo, mapMolNo, ligandMolNo,
            ...this.glRef.current.origin.map(coord => -coord),
            1., useConformers, conformerCount
        ] : [
            this.molNo, mapMolNo, ligandMolNo,
            1., useConformers, conformerCount
        ]

        const result = await this.commandCentre.current.cootCommand({
            returnType: returnType,
            command: command,
            commandArgs: commandArgs,
            changesMolecules: [this.molNo]
        }, true) as moorhen.WorkerResponse<(number[] | libcootApi.fitLigandInfo[])>
        
        if (result.data.result.status === "Completed") {
            newMolecules = await Promise.all(
                result.data.result.result.map(async (fitLigandResult: (number | libcootApi.fitLigandInfo), idx: number) => {
                    const newMolecule = new MoorhenMolecule(this.commandCentre, this.glRef, this.monomerLibraryPath)
                    newMolecule.molNo = fitRightHere ? fitLigandResult as number : (fitLigandResult as libcootApi.fitLigandInfo).imol 
                    newMolecule.name = `Fit. lig. #${idx + 1}`
                    newMolecule.isDarkBackground = this.isDarkBackground
                    newMolecule.defaultBondOptions = this.defaultBondOptions
                    if (redraw) {
                        await newMolecule.fetchIfDirtyAndDraw('CBs')
                    }
                    return newMolecule
                })
            )
        } else {
            console.warn('Something went wrong when finding ligands...')
        }
        
        return newMolecules
    }

    /**
     * Get information about the residue B-factors
     * @returns {object[]} An array of objects indicating the residue CID and B-factor
     */
    getResidueBFactors() {
        let result: { cid: string; bFactor: number; normalised_bFactor: number }[] = []
        const resBfactorInfoVec = window.CCP4Module.get_structure_bfactors(this.gemmiStructure)
        const resBfactorInfoVecSize = resBfactorInfoVec.size()
        for (let i = 0; i < resBfactorInfoVecSize; i++) {
            const resInfo = resBfactorInfoVec.get(i)
            result.push({...resInfo})
        }
        resBfactorInfoVec.delete()
        
        return result
    }

    /**
     * Get chain IDs that are related by NCS or molecular symmetry 
     * @returns {string[][]} An array of arrays where chain IDs are grouped together
     */
    async getNcsRelatedChains(): Promise<string[][]> {
        const result = await this.commandCentre.current.cootCommand({
            returnType: 'string_array_array',
            command: 'get_ncs_related_chains',
            commandArgs: [this.molNo]
        }, false) as moorhen.WorkerResponse<string[][]>
        return result.data.result.result
    }

    /**
     * A function to get the number of atoms in the current molecule
     * @returns {Promise<number>} The number of atoms in the molecule
     */
    async getNumberOfAtoms(): Promise<number> {
        const result = await this.commandCentre.current.cootCommand({
            returnType: 'int',
            command: 'get_number_of_atoms',
            commandArgs: [this.molNo],
        }, false) as moorhen.WorkerResponse<number>
        this.atomCount = result.data.result.result
        return result.data.result.result
    }

    /**
     * Move the molecule to a new position
     * @param {number} x - Coordinate X 
     * @param {number} y - Coordinate Y 
     * @param {number} z - Coordinate Z 
     */
    async moveMoleculeHere(x: number, y: number, z: number): Promise<void> {
        await this.commandCentre.current.cootCommand({
            returnType: 'int',
            command: 'move_molecule_to_new_centre',
            commandArgs: [this.molNo, x, y, z],
        }, false) as moorhen.WorkerResponse<number>
        this.setAtomsDirty(true)
        await this.redraw()
    }

    /**
     * Parse a CID selection into a residue selection object
     * @param {string} cid - The CID selection
     * @returns {object} An object for the residue selection
     */
    async parseCidIntoSelection(cid: string): Promise<moorhen.ResidueSelection> {

        const selectionAtoms = await this.gemmiAtomsForCid(cid)
        if (!selectionAtoms || selectionAtoms.length === 0) {
            console.warn(`Specified CID resulted in no residue selection: ${cid}`)
            return 
        }

        return {
            molecule: this,
            first: selectionAtoms[0].label,
            second: selectionAtoms[selectionAtoms.length - 1].label,
            isMultiCid: cid.includes('||'),
            cid: cid.includes('||') ? cid.split('||') : cid,
            label: cid
        }
    }
}
