import 'pako';
import * as vec3 from 'gl-matrix/vec3';
import * as mat3 from 'gl-matrix/mat3';
import * as mat4 from 'gl-matrix/mat4';
import * as quat4 from 'gl-matrix/quat';
import { Store } from "@reduxjs/toolkit";
import { quatToMat4 } from '../WebGLgComponents/quatToMat4.js';
import { isDarkBackground } from '../WebGLgComponents/webGLUtils'
import { hideMolecule } from '../store/moleculesSlice';
import { moorhen } from "../types/moorhen"
import { webGL } from "../types/mgWebGL"
import { gemmi } from "../types/gemmi"
import { libcootApi } from '../types/libcoot';
import { privateer } from '../types/privateer';
import { setRequestDrawScene, setOrigin, setZoom, setQuat } from "../store/glRefSlice"
import { MoorhenColourRule } from "./MoorhenColourRule"
import { MoorhenMoleculeRepresentation } from "./MoorhenMoleculeRepresentation"
import {
    guid, readTextFile, readGemmiStructure, centreOnGemmiAtoms,
    getRandomMoleculeColour, doDownload, formatLigandSVG, getCentreAtom, parseAtomInfoLabel,
    readGemmiCifDocument
 } from './utils'

/**
 * Represents a molecule
 * @property {string} name - The name assigned to this molecule instance
 * @property {number} molNo - The imol assigned to this molecule instance
 * @property {boolean} atomsDirty - Whether the cached atoms are outdated
 * @property {boolean} symmetryOn - Whether the symmetry is currently being displayed
 * @property {object} sequences - List of sequences present in the molecule
 * @property {object} gemmiStructure - Object representation of the cached gemmi structure for this molecule
 * @property {object} gemmiDocument - Object representation of the cached gemmi document for this molecule
 * @property {React.RefObject<moorhen.CommandCentre>} commandCentre - A react reference to the command centre instance
 * @property {React.RefObject<webGL.MGWebGL>} glRef - A react reference to the MGWebGL instance
 * @property {string} monomerLibraryPath - A string with the path to the monomer library, relative to the root of the app
 * @constructor
 * @param {React.RefObject<moorhen.CommandCentre>} commandCentre - A react reference to the command centre instance
 * @param {React.RefObject<webGL.MGWebGL>} glRef - A react reference to the MGWebGL instance
 * @param {Store} [store=undefined] - A Redux store. By default Moorhen Redux store will be used
 * @param {string} [monomerLibraryPath="./monomers"] - A string with the path to the monomer library, relative to the root of the app
 * @example
 * import { MoorhenMolecule } from 'moorhen';
 *
 * const example = async () => {
 *    // Create a new molecule
 *    const molecule = new MoorhenMolecule(commandCentre, glRef, monomerLibraryPath);
 *
 *    // Set some defaults
 *    molecule.setBackgroundColour(glRef.current.background_colour)
 *
 *    // Load file from a URL
 *    await molecule.loadToCootFromURL('/uri/to/file.pdb', 'mol-1');
 *
 *    // Draw coot bond representation and centre on molecule
 *    await molecule.fetchIfDirtyAndDraw('CBs');
 *    await molecule.centreOn();
 *
 *    // Delete molecule
 *    await molecule.delete();
 * }
 */
export class MoorhenMolecule implements moorhen.Molecule {

    type: string;
    atomCount: number;
    commandCentre: React.RefObject<moorhen.CommandCentre|null>;
    glRef: React.RefObject<webGL.MGWebGL|null>;
    atomsDirty: boolean;
    name: string;
    molNo: number | null
    gemmiStructure: gemmi.Structure;
    gemmiDocument: gemmi.cifDocument;
    sequences: moorhen.Sequence[];
    representations: moorhen.MoleculeRepresentation[];
    ligands: moorhen.LigandInfo[];
    ligandDicts: { [comp_id: string]: string };
    connectedToMaps: number[];
    excludedSelections: string[];
    excludedCids: string[];
    symmetryOn: boolean;
    biomolOn: boolean;
    symmetryRadius: number;
    symmetryMatrices: number[][][];
    gaussianSurfaceSettings: moorhen.gaussianSurfSettings;
    isDarkBackground: boolean;
    defaultBondOptions: moorhen.cootBondOptions;
    defaultM2tParams: moorhen.m2tParameters;
    defaultResidueEnvironmentOptions: moorhen.residueEnvironmentOptions;
    displayObjectsTransformation: { origin: [number, number, number], quat: any, centre: [number, number, number] }
    uniqueId: string;
    monomerLibraryPath: string;
    defaultColourRules: moorhen.ColourRule[];
    adaptativeBondsRepresentation: moorhen.MoleculeRepresentation;
    hoverRepresentation: moorhen.MoleculeRepresentation;
    unitCellRepresentation: moorhen.MoleculeRepresentation;
    environmentRepresentation: moorhen.MoleculeRepresentation;
    selectionRepresentation: moorhen.MoleculeRepresentation;
    hasGlycans: boolean;
    hasDNA: boolean;
    restraints: {maxRadius: number, cid: string}[];
    isLigand: boolean;
    coordsFormat: moorhen.coorFormats;
    cachedPrivateerValidation: privateer.ResultsEntry[];
    cachedGemmiAtoms:moorhen.AtomInfo[];
    cachedLigandSVGs: {[key: string]: string};
    moleculeDiameter: number;
    adaptativeBondsEnabled: boolean;
    store: Store;
    headerInfo: libcootApi.headerInfoJS;
    isMRSearchModel: boolean;

    constructor(commandCentre: React.RefObject<moorhen.CommandCentre|null>, reduxStore: Store, monomerLibraryPath: string) {
        this.type = 'molecule'
        this.store = reduxStore
        this.commandCentre = commandCentre 
        this.monomerLibraryPath = monomerLibraryPath
        this.atomsDirty = true
        this.name = "unnamed"
        this.molNo = null
        this.coordsFormat = null
        this.gemmiStructure = null
        this.gemmiDocument = null
        this.sequences = []
        this.headerInfo = null
        this.cachedGemmiAtoms = null
        this.cachedLigandSVGs = null
        this.cachedPrivateerValidation = null
        this.ligands = null
        this.ligandDicts = {}
        this.connectedToMaps = null
        this.representations = []
        this.excludedSelections = []
        this.excludedCids = []
        this.symmetryOn = false
        this.biomolOn = false
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
            atomRadiusBondRatio: 1,
            showAniso: false,
            showOrtep: false,
            showHs: true,
        }
        this.defaultM2tParams = {
            ribbonStyleCoilThickness: 0.3,
            ribbonStyleHelixWidth: 1.2,
            ribbonStyleStrandWidth: 1.2,
            ribbonStyleArrowWidth: 1.5,
            ribbonStyleDNARNAWidth: 1.5,
            ribbonStyleAxialSampling: 6,
            cylindersStyleAngularSampling: 6,
            cylindersStyleCylinderRadius: 0.2,
            cylindersStyleBallRadius: 0.2,
            surfaceStyleProbeRadius: 1.4,
            ballsStyleRadiusMultiplier: 1,
            nucleotideRibbonStyle: 'StickBases',
            dishStyleAngularSampling: 32,
            ssUsageScheme: 2
        }
        this.defaultResidueEnvironmentOptions = {
            maxDist: 8,
            backgroundRepresentation: "CRs",
            focusRepresentation: "CBs",
            labelled: true,
            showHBonds: true,
            showContacts: true
        }
        this.restraints = []
        this.adaptativeBondsEnabled = false
        this.hasDNA = false
        this.hasGlycans = false
        this.isLigand = false
        this.isMRSearchModel = false
        this.displayObjectsTransformation = { origin: [0, 0, 0], quat: null, centre: [0, 0, 0] }
        this.uniqueId = guid()
        this.defaultColourRules = null
        this.moleculeDiameter = null
        this.unitCellRepresentation = new MoorhenMoleculeRepresentation('unitCell', '/*/*/*/*', this.commandCentre)
        this.unitCellRepresentation.setParentMolecule(this)
        this.environmentRepresentation = new MoorhenMoleculeRepresentation('environment', null, this.commandCentre)
        this.environmentRepresentation.setParentMolecule(this)
        this.hoverRepresentation = new MoorhenMoleculeRepresentation('hover', null, this.commandCentre)
        this.hoverRepresentation.setParentMolecule(this)
        this.selectionRepresentation = new MoorhenMoleculeRepresentation('residueSelection', null, this.commandCentre)
        this.selectionRepresentation.setParentMolecule(this)
        this.adaptativeBondsRepresentation = new MoorhenMoleculeRepresentation('adaptativeBonds', null, this.commandCentre)
        this.adaptativeBondsRepresentation.setParentMolecule(this)
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

        return this.replaceModelWithCoordData(coordData)
    }

    /**
     * Replace the current molecule some file contents
     * @param {string} coordData - The coord data for new model
     */
    async replaceModelWithCoordData(coordData: string): Promise<void> {
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
    toggleBiomolecule() : void {
        this.biomolOn = !this.biomolOn;
        if (this.biomolOn) {
            this.symmetryOn = false;
        } else {
            this.representations.forEach(representation => {
                representation.buffers.forEach(buffer => {
                    buffer.changeColourWithSymmetry = true
                })
            })
        }
        return this.drawBiomolecule()
    }

    /**
     * Turn on/off molecule symmetry
     */
    toggleSymmetry(): Promise<void> {
        this.symmetryOn = !this.symmetryOn;
        if (this.symmetryOn) {
            this.biomolOn = false;
            this.representations.forEach(representation => {
                representation.buffers.forEach(buffer => {
                    buffer.changeColourWithSymmetry = true
                })
            })
        }
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
     * Fetch the matrices representing the biomolecule of the current model from gemmi
     */
    fetchBiomoleculeMatrix() : void {
        this.symmetryMatrices = []
        if (this.biomolOn) {
            const assemblies = this.gemmiStructure.assemblies
            const n_assembly = assemblies.size()
            //if (n_assembly > 0) { // Just doing this with get(0) below ignores some matrices which is wrong.
                //const assembly = assemblies.get(1)
            for (let i_as=0; i_as < n_assembly; i_as++) { // But this with get(i_as) applies all mats to all chains which is also wrong.
                const assembly = assemblies.get(i_as)
                console.log("assembly")
                console.log(assembly.name)
                const generators = assembly.generators
                const n_gen = generators.size()
                console.log("n_gen",n_gen)
                for (let i_gen=0; i_gen < n_gen; i_gen++) {
                    const gen = generators.get(i_gen)
                    const operators = gen.operators
                    const n_op = operators.size()
                    const chains = gen.chains
                    const subchains = gen.subchains
                    const n_chains = chains.size()
                    const n_subchains = subchains.size()

                    for (let i_op=0; i_op < n_op; i_op++) {
                        const mat16 = []
                        const op = operators.get(i_op)
                        const transform = op.transform
                        const vec = transform.vec
                        const mat = transform.mat

                        if(mat.is_identity()&&Math.abs(vec.x)<1e-4&&Math.abs(vec.y)<1e-4&&Math.abs(vec.z)<1e-4){
                            continue
                        }

                        const mat_array = mat.as_array()
                        console.log(mat_array)

                        const matrot = mat4.create();
                        mat4.set(matrot,
                        mat_array[0],mat_array[1],mat_array[2], 0.0,
                        mat_array[3],mat_array[4],mat_array[5], 0.0,
                        mat_array[6],mat_array[7],mat_array[8], 0.0,
                        0.0, 0.0, 0.0, 1.0)
                        const matvec = mat4.create();
                        mat4.set(matvec,
                        1.0, 0.0, 0.0, 0.0,
                        0.0, 1.0, 0.0, 0.0,
                        0.0, 0.0, 1.0, 0.0,
                        -vec.x, -vec.y, -vec.z, 1.0)

                        mat4.multiply(matrot, matrot, matvec);

                        mat16.push(matrot[0]);  mat16.push(matrot[1]);  mat16.push(matrot[2]);  mat16.push(matrot[3]);
                        mat16.push(matrot[4]);  mat16.push(matrot[5]);  mat16.push(matrot[6]);  mat16.push(matrot[7]);
                        mat16.push(matrot[8]);  mat16.push(matrot[9]);  mat16.push(matrot[10]); mat16.push(matrot[11]);
                        mat16.push(matrot[12]); mat16.push(matrot[13]); mat16.push(matrot[14]); mat16.push(matrot[15]);

                        this.symmetryMatrices.push(mat16);
                        transform.delete()
                        vec.delete()
                        mat.delete()
                        op.delete()
                    }
                    operators.delete()
                    gen.delete()
                    subchains.delete()
                    chains.delete()
                }
                generators.delete()
                assembly.delete()
            }
            assemblies.delete()
        }
        console.log("Number of matrices",this.symmetryMatrices.length)
    }

    /**
     * Fetch the symmetry matrix for the current model from libcoot api
     */
    async fetchSymmetryMatrix(): Promise<void> {
        if (!this.symmetryOn) {
            this.symmetryMatrices = []
        } else {
            const originState = this.store.getState().glRef.origin
            const selectionCentre: number[] = originState.map(coord => -coord)
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
    drawBiomolecule(fetchSymMatrix: boolean = true): void {
        if (this.symmetryOn) {
            console.warn("Biomolecule will not be drawn when Crystal symmetry is being shown.")
            return
        }
        if (fetchSymMatrix) {
            this.fetchBiomoleculeMatrix()
        }
        this.representations.forEach(representation => representation.drawSymmetry())
        this.representations.forEach(representation => {
            representation.buffers.forEach(buffer => {
                buffer.changeColourWithSymmetry = false
            })
        })
        if (this.adaptativeBondsEnabled) {
            this.adaptativeBondsRepresentation.drawSymmetry()
        }
    }

    /**
     * Draw symmetry mates for the current molecule
     * @param {boolean} [fetchSymMatrix=true] - Indicates whether a new symmetry matrix must be fetched from libcoot api
     */
    async drawSymmetry(fetchSymMatrix: boolean = true): Promise<void> {
        if (this.biomolOn) {
            console.warn("Crystal symmetry will not be drawn when biomolecule is being shown.")
            return
        }
        if (fetchSymMatrix) {
            await this.fetchSymmetryMatrix()
        }
        this.representations.forEach(representation => representation.drawSymmetry())
        if (this.adaptativeBondsEnabled) {
            this.adaptativeBondsRepresentation.drawSymmetry()
        }
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
        this.cachedGemmiAtoms = null
        this.gemmiStructure = readGemmiStructure(coordString, this.name)
        window.CCP4Module.gemmi_setup_entities(this.gemmiStructure)
        // Only override if this is mmcif
        window.CCP4Module.gemmi_add_entity_types(this.gemmiStructure, this.coordsFormat === 'mmcif')
        this.parseSequences()
        this.updateLigands()
        try {
            //Only do this with original cif file - we (probably) want original header info.
            if(!this.gemmiDocument){
                this.gemmiDocument = readGemmiCifDocument(coordString as string)
            }
        } catch(e) {
            this.gemmiDocument = null
        }
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
        }, false) as moorhen.WorkerResponse<string>

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

        const result: moorhen.Sequence[] = []
        const sequenceInfoVec = window.CCP4Module.get_sequence_info(this.gemmiStructure, this.name)
        const sequenceInfoVecSize = sequenceInfoVec.size()
        for (let i = 0; i < sequenceInfoVecSize; i++) {
            const sequenceInfo = sequenceInfoVec.get(i)
            const sequenceInfoSeq = sequenceInfo.sequence
            const currentSequence: moorhen.ResidueInfo[] = []
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
        const isLigand = true
        this.isLigand = window.CCP4Module.structure_is_ligand(this.gemmiStructure)
        return isLigand
    }

    /**
     * Delete this molecule instance
     * @param {boolean} [popBackImol=false] - Indicates whether the imol for this molecule instance should be popped back (useful for ephemeral molecules)
     */
    async delete(popBackImol: boolean = false): Promise<moorhen.WorkerResponse> {
        this.hoverRepresentation?.deleteBuffers()
        this.unitCellRepresentation?.deleteBuffers()
        this.environmentRepresentation?.deleteBuffers()
        this.selectionRepresentation?.deleteBuffers()
        this.adaptativeBondsRepresentation?.deleteBuffers()
        this.representations.forEach(representation => representation.deleteBuffers())
        this.store.dispatch(setRequestDrawScene(true))
        const response = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: popBackImol ? 'pop_back' : 'close_molecule',
            commandArgs: popBackImol ? [ ] : [ this.molNo ]
        }, true) as moorhen.WorkerResponse<number>
        if (this.gemmiStructure && !this.gemmiStructure.isDeleted()) {
            this.gemmiStructure.delete()
        }
        return response
    }

    /**
     * Transfer metadata stored in this molecule instance to other molecule
     * @param {morhen.Molecule} otherMolecule - The molecule where the metadata will be transferred
     * @param {boolean} [transferDicts=true] - Indicates whether ligand dictionaries should also be transferred
     */
    async transferMetaData(otherMolecule: moorhen.Molecule, transferDicts: boolean = true) {
        otherMolecule.defaultBondOptions = this.defaultBondOptions
        otherMolecule.defaultM2tParams = this.defaultM2tParams
        otherMolecule.environmentRepresentation = this.environmentRepresentation
        otherMolecule.coordsFormat = this.coordsFormat
        otherMolecule.isLigand = this.isLigand
        otherMolecule.hasGlycans = this.hasGlycans
        otherMolecule.hasDNA = this.hasDNA
        otherMolecule.isDarkBackground = this.isDarkBackground
        if (transferDicts) {
            await this.transferLigandDicts(otherMolecule)
        }
    }

    /**
     * Transfer ligand dictionaries stored in this molecule instance to other molecule
     * @param {morhen.Molecule} toMolecule - The molecule where the metadata will be transferred
     * @param {boolean} [override=false] - Override ligand dictionaries already stored under the same ligand name in the other molecule instance
     */
    async transferLigandDicts(toMolecule: moorhen.Molecule, override: boolean = false) {
        await Promise.all(Object.keys(this.ligandDicts).map(key => {
            if (!override && Object.hasOwn(toMolecule.ligandDicts, key)) {
                return
            } else {
                toMolecule.addDict(this.ligandDicts[key])
            }
        }))
    }

    /**
     * Copy molecule into a new instance
     * @returns {moorhen.Molecule} New molecule instance
     */
    async copyMolecule(doRedraw: boolean = true): Promise<moorhen.Molecule> {
        const state = this.store.getState()
        const useGemmi = state.generalStates.useGemmi
        const use_gemmi_response = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'set_use_gemmi',
            commandArgs: [useGemmi],
        }, true)
        const coordString = await this.getAtoms()
        const newMolecule = new MoorhenMolecule(this.commandCentre, this.store, this.monomerLibraryPath)
        newMolecule.name = `${this.name}-copy`

        const response = await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'read_coords_string',
            commandArgs: [coordString, newMolecule.name]
        }, true) as moorhen.WorkerResponse<libcootApi.PairType<number, moorhen.coorFormats>>

        newMolecule.molNo = response.data.result.result.first

        await this.transferMetaData(newMolecule)
        await newMolecule.fetchDefaultColourRules()
        if (doRedraw) {
            await newMolecule.fetchIfDirtyAndDraw('CBs')
        }
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
        const newMolecule = new MoorhenMolecule(this.commandCentre, this.store, this.monomerLibraryPath)
        newMolecule.name = `${this.name} fragment`
        newMolecule.molNo = response.data.result.result
        await this.transferMetaData(newMolecule)
        await newMolecule.fetchDefaultColourRules()
        if (doRecentre) {
            newMolecule.setAtomsDirty(true)
            await newMolecule.fetchIfDirtyAndDraw(style)
            await newMolecule.centreOn('/*/*/*/*', true, true)
        }
        return newMolecule
    }

    /**
     * Copy a fragment of the current model into a new molecule for refinement
     * @param {string[]} cid - The CID selection indicating the residues that will be copied into the new fragment
     * @param {moorhen.Map} refinementMap - The map instance used in the refinement
     * @param {boolean} redraw - Indicate if the molecules should be redrawn
     * @param {boolean} redrawFragmentFirst - Indicate if the fragment should be redrawn first
     * @returns {moorhen.Molecule} A new molecule instance that can be used for refinement
     */
    async copyFragmentForRefinement(cid: string[], refinementMap: moorhen.Map, redraw: boolean = true, redrawFragmentFirst: boolean = true): Promise<moorhen.Molecule> {
        const newMolecule = new MoorhenMolecule(this.commandCentre, this.store, this.monomerLibraryPath)
        const copyResult = await this.commandCentre.current.cootCommand({
            returnType: 'int',
            command: 'copy_fragment_for_refinement_using_cid',
            commandArgs: [this.molNo, cid.join('||')]
        }, false)

        if (copyResult.data.result.result !== -1) {
            newMolecule.molNo = copyResult.data.result.result
            await this.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'init_refinement_of_molecule_as_fragment_based_on_reference',
                commandArgs: [newMolecule.molNo, this.molNo, refinementMap.molNo]
            }, false)
            await this.transferLigandDicts(newMolecule)
            newMolecule.setAtomsDirty(true)
            if (redraw) {
                const drawMissingLoops = this.store.getState().sceneSettings.drawMissingLoops
                if (drawMissingLoops) {
                    await this.commandCentre.current.cootCommand({
                        command: "set_draw_missing_residue_loops",
                        returnType:'status',
                        commandArgs: [ false ],
                    }, false)
                }
                await Promise.all(cid.map(cid => {
                    return this.hideCid(cid, false)
                }))
                if (redrawFragmentFirst) {
                    await newMolecule.fetchIfDirtyAndDraw('CBs')
                    await this.redraw()
                } else {
                    await this.redraw()
                    await newMolecule.fetchIfDirtyAndDraw('CBs')
                }
            }
        } else {
            console.warn(`Unable to copy fragment for refinement using cid ${cid} for molecule ${this.molNo}`)
        }

        return newMolecule
    }

    /**
     * Merge a fragment that was used for refinement into the current molecule
     * @param {string[]} cid - The CID selection used to create the fragment
     * @param {moorhen.Molecule} fragmentMolecule - The fragment molecule
     * @param {boolean} [acceptTransform=true] - Indicates whether the transformation should be accepted
     * @param {boolean} [refineAfterMerge=false] - Indicates whether another cycle of refinement should be run after merging the fragment
     */
    async mergeFragmentFromRefinement(cid: string, fragmentMolecule: moorhen.Molecule, acceptTransform: boolean = true, refineAfterMerge: boolean = false) {
        const drawMissingLoops = this.store.getState().sceneSettings.drawMissingLoops
        if (drawMissingLoops) {
            await this.commandCentre.current.cootCommand({
                command: "set_draw_missing_residue_loops",
                returnType:'status',
                commandArgs: [ true ],
            }, false)
        }

        await this.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'clear_refinement',
            commandArgs: [this.molNo],
        }, false)

        if (acceptTransform) {
            await this.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'replace_fragment',
                commandArgs: [this.molNo, fragmentMolecule.molNo, cid],
                changesMolecules: [this.molNo]
            }, !refineAfterMerge)
            if (refineAfterMerge) {
                await this.refineResiduesUsingAtomCid(cid, 'LITERAL', 4000, false)
            }
            this.setAtomsDirty(true)
        }

        await this.unhideAll()
        await fragmentMolecule.delete(true)
    }

    /**
     * Load a new molecule from a file URL
     * @param {string} url - The url to the path with the data for the new molecule
     * @param {string} molName - The new molecule name
     * @param {object} [options] - Options passed to fetch API
     * @returns {Promise<moorhen.Molecule>} The new molecule
     */
    async loadToCootFromURL(url: RequestInfo | URL, molName: string, options?: RequestInit): Promise<moorhen.Molecule> {
        console.log(url)
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
            let is_small = false;
            if(source.name.endsWith(".mmcif")||source.name.endsWith(".cif")||source.name.endsWith(".pdbx"))
                is_small = window.CCP4Module.is_small_structure(coordData as string)
            if(is_small){
                const small_to_cif_response = await this.commandCentre.current.cootCommand({
                    command: 'SmallMoleculeCifToMMCif',
                    commandArgs: [coordData],
                    returnType: 'str_str_pair'
                }, true) as moorhen.WorkerResponse<libcootApi.PairType<string, string>>
                const coordContent = small_to_cif_response.data.result.result.first
                const dictContent = small_to_cif_response.data.result.result.second
                //FIXME - I think I want specific molecule, but there is a circular dependency between mol and dicts
                const anyMolNo = -999999
                await this.commandCentre.current.cootCommand({
                    returnType: "status",
                    command: 'read_dictionary_string',
                    commandArgs: [dictContent, anyMolNo],
                }, false)
                return await this.loadToCootFromString(coordContent, source.name);
            }
            if(source.name.endsWith(".mol")){
                const response = await this.commandCentre.current.cootCommand({
                    command: 'mol_text_to_pdb',
                    commandArgs: [coordData, "UNL" , 10, 100, true, false],
                    returnType: 'str_str_pair'
                }, true) as moorhen.WorkerResponse<libcootApi.PairType<string, string>>
                const pdb = response.data.result.result.first
                const dict = response.data.result.result.second
                const mol = await this.loadToCootFromString(pdb, source.name);
                await this.commandCentre.current.cootCommand({
                    returnType: "status",
                    command: 'read_dictionary_string',
                    commandArgs: [dict,  mol.molNo],
                    changesMolecules: []
                }, false)
                return mol
            }
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

        this.name = name.replace(pdbRegex, "").replace(entRegex, "").replace(cifRegex, "").replace(mmcifRegex, "");

        try {
            const state = this.store.getState()
            const useGemmi = state.generalStates.useGemmi
            const use_gemmi_response = await this.commandCentre.current.cootCommand({
                returnType: "status",
                command: 'set_use_gemmi',
                commandArgs: [useGemmi],
            }, true)
            this.updateGemmiStructure(coordData as string)
            this.atomsDirty = false
            const response = await this.commandCentre.current.cootCommand({
                returnType: "status",
                command: 'read_coords_string',
                commandArgs: [coordData, this.name],
            }, true) as moorhen.WorkerResponse<libcootApi.PairType<number, moorhen.coorFormats>>
            this.molNo = response.data.result.result.first
            this.coordsFormat = response.data.result.result.second
            await Promise.all([
                this.getNumberOfAtoms(),
                this.loadMissingMonomers(),
                this.checkHasGlycans(),
                this.fetchDefaultColourRules(),
                this.getMoleculeDiameter()
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
        let fileContent =  ""
        let response : Response | null
        try {
            response = await fetch(`${this.monomerLibraryPath}/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`)
            if (response.ok) {
            fileContent = await response.text()
            }
        } catch(err) {
                console.log(err)
                console.log(`Unable to fetch ligand dictionary ${newTlc} from local url`)
        }
        let dictContent: string

        if (!fileContent.includes('data_')) {
            console.log(`Unable to fetch ligand dictionary ${newTlc} from local monomer library...`)
            try {
                const url = `https://raw.githubusercontent.com/MonomerLibrary/monomers/master/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`
                response = await fetch(url)
                if (response.ok) {
                    dictContent = await response.text()
                } else {
                    console.log(`Unable to fetch ligand dictionary ${newTlc} from remote monomer library...`)
                    const url = `https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/${newTlc.toUpperCase()}.cif`
                    response = await fetch(url)
                    if (response.ok) {
                        dictContent = await response.text()
                    } else {
                        console.log(`Unable to fetch ligand dictionary ${newTlc} from PDBe chem...`)
                    }
                }
            } catch (err) {
                console.log(err)
                console.log(`Unable to fetch ligand dictionary ${newTlc}`)
            }
        } else {
            dictContent = fileContent
        }

        if (dictContent) {
            await this.commandCentre.current.cootCommand({
                returnType: "status",
                command: 'read_dictionary_string',
                commandArgs: [dictContent, attachToMolecule],
            }, false)
        }

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
                        return this.loadMissingMonomer(newTlc, this.molNo)
                    })
                )
                ligandDicts.forEach(ligandDict => this.cacheLigandDict(ligandDict))
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
    async getAtoms(format?: moorhen.coorFormats): Promise<string> {
        const state = this.store.getState()
        const useGemmi = state.generalStates.useGemmi
        let cootCommand = 'molecule_to_PDB_string'
        if (format) {
            cootCommand = format === 'mmcif' ? 'molecule_to_mmCIF_string' : 'molecule_to_PDB_string'
        } else if (this.coordsFormat) {
            cootCommand = this.coordsFormat === 'mmcif' ? 'molecule_to_mmCIF_string' : 'molecule_to_PDB_string'
        }
        if(useGemmi && cootCommand === 'molecule_to_mmCIF_string')
            cootCommand = 'molecule_to_mmCIF_string_with_gemmi'
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
    async downloadAtoms(format?: moorhen.coorFormats, fileName?: string) {
        const coordsString = await this.getAtoms(format)
        doDownload([coordsString], `${fileName ?? this.name}.${format ? format : this.coordsFormat ? this.coordsFormat : 'pdb'}`)
    }

    /**
     * Check if the current molecule has glycans
     * @returns {Promise<boolean>} - True if the current molecule has glycans
     */
    async checkHasGlycans(): Promise<boolean> {
        this.cachedPrivateerValidation = null
        const result = await this.commandCentre.current.cootCommand({
            returnType: 'boolean',
            command: 'model_has_glycans',
            commandArgs: [this.molNo],
        }, false) as moorhen.WorkerResponse<boolean>
        this.hasGlycans = result.data.result.result
        return this.hasGlycans
    }

    /**
     * Get the diameter of this molecule
     * @returns {number} The molecule diameter
     */
    async getMoleculeDiameter(): Promise<number> {
        const diameter = await this.commandCentre.current.cootCommand({
            returnType: 'int',
            command: 'get_molecule_diameter',
            commandArgs: [ this.molNo ],
        }, false) as moorhen.WorkerResponse<number>

        this.moleculeDiameter = diameter.data.result.result

        return diameter.data.result.result
    }

    /**
     * Update the cached atoms with the latest information from the libcoot api
     */
    async updateAtoms() {
        if (this.gemmiStructure && !this.gemmiStructure.isDeleted()) {
            this.gemmiStructure.delete()
        }
        const [_hasGlycans, coordString, _diameter] = await Promise.all([
            this.checkHasGlycans(),
            this.getAtoms(),
            this.getMoleculeDiameter()
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
     * @param {boolean} [alignWithCB=false] - Indicates whether to align with the CB atom for better view of the side chain (when present in the residue)
     * @param {number} [zoomLevel=0.3] - Indicates the zoom level to use
     */
    async centreAndAlignViewOn(selectionCid: string, alignWithCB: boolean = false, zoomLevel: number = 0.3): Promise<void> {

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
        let CB: number[]
        let C: number[]
        let O: number[]

        selectionAtomsAlign.forEach(atom => {
            if (atom.name === "CA") {
                CA = [atom.x, atom.y, atom.z]
            } else if (atom.name === "CB") {
                CB = [atom.x, atom.y, atom.z]
            } else if (atom.name === "C") {
                C = [atom.x, atom.y, atom.z]
            } else if (atom.name === "O") {
                O = [atom.x, atom.y, atom.z]
            }
        })

        let newQuat = null

        if (C && CA && O) {
            const right = vec3.create()
            vec3.set(right, C[0] - CA[0], C[1] - CA[1], C[2] - CA[2])
            const rightNorm = vec3.create()
            vec3.normalize(rightNorm, right);

            const upInit = vec3.create()
            if (CB && alignWithCB) {
                vec3.set(upInit, CB[0] - C[0], CB[1] - C[1], CB[2] - C[2])
            } else {
                vec3.set(upInit, O[0] - C[0], O[1] - C[1], O[2] - C[2])
            }
            const upInitNorm = vec3.create()
            vec3.normalize(upInitNorm, upInit);

            const forward = vec3.create()
            vec3.cross(forward, right, upInitNorm)
            const forwardNorm = vec3.create()
            vec3.normalize(forwardNorm, forward);

            const up = vec3.create()
            vec3.cross(up, forwardNorm, rightNorm)
            const upNorm = vec3.create()
            vec3.normalize(upNorm, up);

            newQuat = quat4.create()
            const mat = mat3.create()
            const [right_x, right_y, right_z] = [rightNorm[0], rightNorm[1], rightNorm[2]]
            const [up_x, up_y, up_z] = [upNorm[0], upNorm[1], upNorm[2]]
            const [formaward_x, formaward_y, formaward_z] = [forwardNorm[0], forwardNorm[1], forwardNorm[2]]
            mat3.set(mat, right_x, right_y, right_z, up_x, up_y, up_z, formaward_x, formaward_y, formaward_z)
            quat4.fromMat3(newQuat, mat)
        }

        const selectionCentre = centreOnGemmiAtoms(selectionAtomsCentre)
        if (newQuat) {
            this.store.dispatch(setOrigin(selectionCentre))
            this.store.dispatch(setQuat(newQuat))
            this.store.dispatch(setZoom(zoomLevel))
        } else {
            await this.centreOn(selectionCid, true, true)
        }
    }

    /**
     * Centre the view on a particular residue
     * @param {string} selectionCid - CID selection for the residue to centre the view on
     * @param {boolean} [animate=true] - Indicates whether the change will be animated
     */
    async centreOn(selectionCid: string = '/*/*/*/*', animate: boolean = true, doSetZoom: boolean = true): Promise<void> {
        if (this.atomsDirty) {
            await this.updateAtoms()
        }

        const selectionAtoms = await this.gemmiAtomsForCid(selectionCid)

        if (selectionAtoms.length === 0) {
            console.log('Unable to select any atoms, skip centering...')
            return
        }

        let zoomLevel: number
        if (selectionCid === '/*/*/*/*' || selectionCid === '//') {
            if (this.moleculeDiameter === null) {
                this.moleculeDiameter = await this.getMoleculeDiameter()
            }
            zoomLevel = this.moleculeDiameter / 40
        } else {
            zoomLevel = 0.4
        }

        const selectionCentre = centreOnGemmiAtoms(selectionAtoms)
        if (doSetZoom) {
            this.store.dispatch(setOrigin(selectionCentre))
            this.store.dispatch(setZoom(zoomLevel))
        } else {
            this.store.dispatch(setOrigin(selectionCentre))
        }
    }

    /**
     * Draw molecule from a given mesh
     * @param {string} style - Indicate the style to be drawn
     * @param {any[]} meshObjects - The mesh obects that will be drawn
     * @param {string} [cid] - The new buffer CID selection
     */
    async drawWithStyleFromMesh(style: moorhen.RepresentationStyles, meshObjects: any[], cid: string = "/*/*/*/*", fetchAtomBuffers: boolean = false): Promise<void> {
        let representation = this.representations.find(item => item.style === style && item.cid === cid)
        if (!representation) {
            representation = new MoorhenMoleculeRepresentation(style, cid, this.commandCentre)
            representation.setParentMolecule(this)
            this.representations.push(representation)
        }

        representation.deleteBuffers()
        representation.buildBuffers(meshObjects)
        if (fetchAtomBuffers) {
            const bufferAtoms = await this.gemmiAtomsForCid(cid)
            if(bufferAtoms.length > 0) {
                representation.setAtomBuffers(bufferAtoms)
            }
        }
        await representation.show()
    }

    addColourRule(ruleType: string, cid: string, color: string, args: (string | number)[], isMultiColourRule: boolean = false, applyColourToNonCarbonAtoms: boolean = false, label?: string) {
        const newColourRule = new MoorhenColourRule(ruleType, cid, color, this.commandCentre, isMultiColourRule, applyColourToNonCarbonAtoms)
        newColourRule.setParentMolecule(this)
        newColourRule.setArgs(args)
        if (label) {
            newColourRule.setLabel(label)
        }
        this.defaultColourRules.push(newColourRule)
    }

    /**
     * Add a representation to the molecule
     * @param {string} style - The style of the new representation
     * @param {string} cid - The CID selection for the residues included in the new representation
     * @param {boolean} [isCustom=false] - Indicates if the representation is considered "custom"
     * @param {moorhen.ColourRule[]} [colourRules=undefined] - A list of colour rules that will be applied to the new representation
     * @param {moorhen.cootBondOptions} [bondOptions=undefined] - An object that describes bond width, atom/bond ratio and other bond settings.
     * @param {moorhen.m2tParameters} [m2tParams=undefined] - An object that describes ribbon width, nucleotide style and other ribbon settings.
     */
    async addRepresentation(style: moorhen.RepresentationStyles, cid: string = '/*/*/*/*', isCustom: boolean = false, colourRules?: moorhen.ColourRule[], bondOptions?: moorhen.cootBondOptions, m2tParams?: moorhen.m2tParameters, residueEnvOptions?: moorhen.residueEnvironmentOptions, nonCustomOpacity?: number) {
        if (!this.defaultColourRules) {
            await this.fetchDefaultColourRules()
        }
        const representation = new MoorhenMoleculeRepresentation(style, cid, this.commandCentre)
        representation.isCustom = isCustom
        representation.setParentMolecule(this)
        representation.setColourRules(colourRules)
        representation.setBondOptions(bondOptions)
        representation.setM2tParams(m2tParams)
        representation.setResidueEnvOptions(residueEnvOptions)
        await representation.draw()
        representation.setNonCustomOpacity(nonCustomOpacity)
        this.representations.push(representation)
        await this.drawSymmetry(false)
        this.drawBiomolecule(false)
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
    async show(style: moorhen.RepresentationStyles, cid?: string): Promise<moorhen.MoleculeRepresentation> {
        let representation: moorhen.MoleculeRepresentation
        try {
            if (style === 'ligands') {
                representation = this.representations.find(item => item.style === style)
            } else {
                if (!cid) cid = '/*/*/*/*'
                representation = this.representations.find(item => item.style === style && item.cid === cid)
            }
            if (representation) {
                await representation.show()
            } else {
                representation = await this.addRepresentation(style, cid)
            }
        } catch (err) {
            console.log(err)
        }
        return representation
    }

    /**
     * Hide a type of representation for the molecule
     * @param {string} style - The representation style to hide
     * @param {string} [cid=undefined] - The CID selection for the representation
     */
    hide(style: moorhen.RepresentationStyles, cid?: string): moorhen.MoleculeRepresentation {
        let representation: moorhen.MoleculeRepresentation
        try {
            if (style === 'ligands') {
                representation = this.representations.find(item => item.style === style)
            } else {
                if (!cid) cid = '/*/*/*/*'
                representation = this.representations.find(item => item.style === style && item.cid === cid)
            }
            if (representation) {
                representation.hide()
            }
        } catch (err) {
            console.log(err)
        }
        return representation
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
        } else if (style === 'adaptativeBonds') {
            this.adaptativeBondsRepresentation?.deleteBuffers()
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
        try {
            for (const representation of this.representations) {
                if (Array.isArray(representation.buffers)) {
                    for (const buffer of representation.buffers) {
                        if (bufferIn.id === buffer.id) {
                            return true
                        }
                    }
                }
            }
            if (this.adaptativeBondsEnabled) {
                if (Array.isArray(this.adaptativeBondsRepresentation.buffers)) {
                    for (const buffer of this.adaptativeBondsRepresentation.buffers) {
                        if (bufferIn.id === buffer.id) {
                            return true
                        }
                    }
                }
            }
        }
        catch (e) {
            console.log(e);
            return false
        }
        return false
    }

    /**
     * Draw the unit cell of this molecule
     */
    async drawUnitCell() {
        if (this.unitCellRepresentation && this.unitCellRepresentation.buffers?.length > 0) {
            await this.unitCellRepresentation.show()
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
            await this.hoverRepresentation.redraw()
            this.hoverRepresentation.drawSymmetry()
            this.hoverRepresentation.buffers[0].changeColourWithSymmetry = false
        }
    }

    /**
     * Highlight residues in a selected CID range
     * @param {string} selectionString - The CID selection for the residues that will be highlighted
     */
    async drawResidueSelection(selectionString: string): Promise<void> {
        if (typeof selectionString === 'string') {
            this.selectionRepresentation.cid = selectionString
            await this.selectionRepresentation.redraw()
        }
    }

    /**
     * Get the active atom for this molecule
     * @returns {string} The active atom CID
     */
    async getActiveAtom(): Promise<string> {
        const [_molecule, activeAtomCid] = await getCentreAtom([this], this.commandCentre, this.glRef)
        return activeAtomCid
    }

    /**
     * Value setter for MoorhenMolecule.adaptativeBondsEnabled
     * @param {boolean} newValue - The new value
     */
    async setDrawAdaptativeBonds(newValue: boolean) {
        this.adaptativeBondsEnabled = newValue
        if (newValue) {
            const activeAtomCid = await this.getActiveAtom()
            if (activeAtomCid === this.adaptativeBondsRepresentation.cid) {
                await this.adaptativeBondsRepresentation.show()
            }
            await this.redrawAdaptativeBonds(activeAtomCid)
        } else {
            this.adaptativeBondsRepresentation.hide()
        }
    }

    /**
     * Draw bonds for a given glRef origin
     * @param {string} selectionString - The CID selection for the residues that will be highlighted
     */
    async redrawAdaptativeBonds(selectionCid?: string): Promise<void> {
        if (!this.adaptativeBondsEnabled) {
            this.adaptativeBondsRepresentation?.deleteBuffers()
            this.adaptativeBondsEnabled = false
            return
        } else if (!selectionCid && !this.adaptativeBondsRepresentation.cid) {
            console.warn(`No selection string provided when drawing origin bonds`)
            this.adaptativeBondsEnabled = false
            return
        } else if (selectionCid) {
            this.adaptativeBondsRepresentation.cid = selectionCid
        }

        this.adaptativeBondsEnabled = true
        await this.adaptativeBondsRepresentation.redraw()
    }

    /**
     * Draw enviroment distances for a given residue
     * @param {string} [selectionCid=undefined] - The CID selection to draw the environment. If undefined then it will automatically determine the closest CID to the screen center.
     */
    async drawEnvironment(selectionCid?: string): Promise<void> {
        if (typeof selectionCid === 'string') {
            this.environmentRepresentation.cid = selectionCid
            await this.environmentRepresentation.redraw()
        } else {
            const [molecule, cid] = await getCentreAtom([this], this.commandCentre, this.glRef)
            this.clearBuffersOfStyle('environment')
            if (molecule?.molNo === this.molNo && cid) {
                this.environmentRepresentation.cid = cid
                await this.environmentRepresentation.redraw()
            }
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

        await this.redrawAdaptativeBonds()
        await this.drawSymmetry(false)
    }

    /**
     * Move residues by applying a series of cached matrix transformations
     * @param {string} selectionCid - The CID selection for the set of residues that will be moved
     * @returns {moorhen.AtomInfo[][]} New atom information for the moved residues
     */
    transformedCachedAtomsAsMovedAtoms(selectionCid: string = '/*/*/*/*'): moorhen.AtomInfo[][] {
        const movedResidues: moorhen.AtomInfo[][] = [];

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
            const originState = this.store.getState().glRef.origin
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
                    const movedAtoms: moorhen.AtomInfo[] = []
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
                        const atomElementString: string = window.CCP4Module.getElementNameAsString(atomElement)
                        const atomName = atomElementString.length === 2 ? (atom.name).padEnd(4, " ") : (" " + atom.name).padEnd(4, " ")
                        const diff = this.displayObjectsTransformation.centre
                        const x = gemmiAtomPos.x + originState[0] - diff[0]
                        const y = gemmiAtomPos.y + originState[1] - diff[1]
                        const z = gemmiAtomPos.z + originState[2] - diff[2]
                        const origin = this.displayObjectsTransformation.origin
                        const quat = this.displayObjectsTransformation.quat
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
                                element: atomElementString,
                                tempFactor: atom.b_iso,
                                charge: atom.charge,
                                occupancy: atom.occ,
                                x: transPos[0] - originState[0] + diff[0],
                                y: transPos[1] - originState[1] + diff[1],
                                z: transPos[2] - originState[2] + diff[2],
                                serial: atomSerial,
                                has_altloc: atomHasAltLoc,
                                alt_loc: atomHasAltLoc ? String.fromCharCode(atomAltLoc) : '',
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
        const result: string[] = []
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
    async mergeMolecules(otherMolecules: moorhen.Molecule[], doHide: boolean = false, doRedraw: boolean = true): Promise<void> {
        try {
            const prevChainNames = this.getChainNames()
            await this.commandCentre.current.cootCommand({
                command: 'merge_molecules',
                commandArgs: [this.molNo, `${otherMolecules.map(molecule => molecule.molNo).join(':')}`],
                returnType: "merge_molecules_return",
                changesMolecules: [this.molNo]
            }, true)

            await Promise.all(otherMolecules.map(molecule => {
                if (doHide) {
                    this.store.dispatch(hideMolecule(molecule))
                }
                return molecule.transferLigandDicts(this, false)
            }))

            await this.updateAtoms()
            const currentChains = this.getChainNames()
            const newChains = currentChains.filter(chainName => !prevChainNames.includes(chainName))
            newChains.forEach(chainName => {
                const selectedColour = getRandomMoleculeColour()
                this.addColourRule('chain', `//${chainName}`, selectedColour, [`//${chainName}`, selectedColour])
            })

            if (doRedraw) {
                await this.redraw()
            }
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
        const originState = this.store.getState().glRef.origin
        const getMonomer = () => {
            return this.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'get_monomer_and_position_at',
                commandArgs: [resType.toUpperCase(), fromMolNo,
                ...originState.map(coord => -coord)
                ]
            }, true) as Promise<moorhen.WorkerResponse<number>>
        }

        let result = await getMonomer()

        if (result.data.result.result === -1) {
            await this.loadMissingMonomer(resType.toUpperCase(), fromMolNo)
            result = await getMonomer()
        }
        if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
            const newMolecule = new MoorhenMolecule(this.commandCentre, this.store, this.monomerLibraryPath)
            newMolecule.setAtomsDirty(true)
            newMolecule.molNo = result.data.result.result
            newMolecule.name = resType.toUpperCase()
            newMolecule.defaultBondOptions = this.defaultBondOptions
            newMolecule.defaultM2tParams = this.defaultM2tParams
            newMolecule.defaultResidueEnvironmentOptions = this.defaultResidueEnvironmentOptions
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

    /**
     * Internal function used to store a ligand dictionary in the cache for this molecule instance
     * @param {string} fileContent - The dictionary contents
     */
    cacheLigandDict(fileContent: string): void {
        if (!fileContent) {
            console.warn('File contents for dictionary not found, doing nothing...')
            return
        }

        const possibleIndentedLines = fileContent.split("\n")
        let unindentedLines: string[] = []
        let comp_id = 'list'
        const rx_1 = /data_comp_(.*)/
        const rx_2 = /data_(.*)/

        for (const line of possibleIndentedLines) {
            const trimmedLine = line.trim()
            const arr = rx_1.exec(trimmedLine) ?? rx_2.exec(trimmedLine)
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

        this.cacheLigandDict(fileContent)
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
        this.cachedLigandSVGs = null
        const ligandList: moorhen.LigandInfo[] = []
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

        if (this.cachedGemmiAtoms && (cid === '/*/*/*/*' || cid === '//')) {
            return this.cachedGemmiAtoms
        }

        const result: moorhen.AtomInfo[] = []
        const atomInfoVec = window.CCP4Module.get_atom_info_for_selection(this.gemmiStructure, cid, omitExcludedCids ? this.excludedSelections.join("||") : "")
        const atomInfoVecSize = atomInfoVec.size()
        for (let i = 0; i < atomInfoVecSize; i++) {
            const atomInfo = atomInfoVec.get(i)
            result.push(atomInfo)
        }
        atomInfoVec.delete()

        if (cid === '/*/*/*/*' || cid === '//') {
            this.cachedGemmiAtoms = result
        }

        return result
    }

    /**
     * Determine whether this molecule instance has any visible buffers
     * @param {string[]} excludeStyles - A list of representation styles that should be excluded from this check
     * @returns {boolean} True if the molecule has any visible buffers
     */
    isVisible(excludeStyles: string[] = ['hover', 'unitCell', 'originNeighbours', 'selection', 'transformation', 'contact_dots', 'chemical_features', 'VdWSurface']): boolean {
        const state = this.store.getState()
        const isVisible = state.molecules.visibleMolecules.some(molNo => molNo === this.molNo)
        const hasVisibleBuffers = this.representations
            .filter(item => !excludeStyles.includes(item.style))
            .some(item => item.visible)
        return (hasVisibleBuffers || this.adaptativeBondsEnabled) && isVisible
    }

    /**
     * Set the default colour rules for this molecule from libcoot API
     */
    async fetchDefaultColourRules() {
        if (this.defaultColourRules) {
            console.log('Default colour rules already set, doing nothing...')
            return
        }

        const response = await this.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: "get_colour_rules",
            returnType: 'colour_rules',
            commandArgs: [this.molNo],
        }, false) as moorhen.WorkerResponse<libcootApi.PairType<string, string>[]>

        this.defaultColourRules = []
        for (const rule of response.data.result.result) {
            this.addColourRule('chain',  rule.first, rule.second, [rule.first, rule.second])
        }
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
            command: "generate_local_self_restraints",
            returnType: 'status',
            commandArgs: [this.molNo, maxRadius, cid],
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
     * Refine a residue CID with animation
     * @param {string[]} cid - The CID selection used to create the fragment
     * @param {moorhen.Map} activeMap - The map instance used in the refinement
     * @param {number} dist - The maximum distance used to get neighboring residues for the refinement. Use -1 for literal CID instead of neighbours.
     * @param {boolean} redraw - Indicate if the molecules should be redrawn
     * @param {boolean} redrawFragmentFirst - Indicate if the fragment should be redrawn first
     */
    async refineResiduesUsingAtomCidAnimated(cid: string, activeMap: moorhen.Map, dist: number = 6, redraw: boolean = true, redrawFragmentFirst: boolean = true) {
        let cidList: string[]
        if (dist <= 0) {
            cidList = [cid]
        } else {
            cidList = await this.getNeighborResiduesCids(cid, dist)
        }

        const newMolecule = await this.copyFragmentForRefinement(cidList, activeMap, redraw, redrawFragmentFirst)
        await newMolecule.animateRefine(50, 30, 50)
        await this.mergeFragmentFromRefinement(cidList.join('||'), newMolecule, true, true)
    }

    /**
     * Refine a molecule with animation effect
     * @param {number} n_cyc - The total number of refinement cycles for each iteration
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
     * @param {boolean} [redraw=true] - Indicates if the molecule should be redrawn
     */
    async SSMSuperpose(movChainId: string, refMolNo: number, refChainId: string, redraw: boolean = true): Promise<void> {
        this.commandCentre.current.cootCommand({
            command: "SSM_superpose",
            returnType: 'superpose_results',
            commandArgs: [refMolNo, refChainId, this.molNo, movChainId],
            changesMolecules: [this.molNo]
        }, true)

        this.setAtomsDirty(true)
        if (redraw) {
            await this.redraw()
            await this.centreOn('/*/*/*/*', true)
        }
    }

    /**
     * Use LSQKB to superpose this molecule (as the moving structure) with another molecule isntance
     * @param {string} refMolNo - Molecule number for the reference structure
     * @param {moorhen.lskqbResidueRangeMatch[]} residueMatches - A list of objects describing the residue matches for LSQKB
     * @param {number} [matchType=1] - The match type for LSQKB: 0 - all | 1 - main | 2 - CAs
     * @param {boolean} [redraw=true] - Indicates if the molecule should be redrawn
     */
    async lsqkbSuperpose(refMolNo: number, residueMatches: moorhen.lskqbResidueRangeMatch[], matchType: number = 1, redraw: boolean = true): Promise<void> {
        await this.commandCentre.current.cootCommand({
            command: 'clear_lsq_matches',
            commandArgs: [ ],
            returnType: 'status'
        }, false)

        await Promise.all(residueMatches.map(item => {
            return this.commandCentre.current.cootCommand({
                command: 'add_lsq_superpose_match',
                commandArgs: [item.refChainId, ...item.refResidueRange, item.movChainId, ...item.movResidueRange, matchType],
                returnType: 'status'
            }, false)
        }))

        await this.commandCentre.current.cootCommand({
            command: 'lsq_superpose',
            commandArgs: [refMolNo, this.molNo],
            returnType: 'status'
        }, false)

        this.setAtomsDirty(true)
        if (redraw) {
            await this.redraw()
            await this.centreOn('/*/*/*/*', true)
        }
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
        const originState = this.store.getState().glRef.origin
        let newMolecules: moorhen.Molecule[] = []
        const command = fitRightHere ? 'fit_ligand_right_here' : 'fit_ligand'
        const returnType = fitRightHere ? 'int_array' : 'fit_ligand_info_array'

        const commandArgs = fitRightHere ? [
            this.molNo, mapMolNo, ligandMolNo,
            ...originState.map(coord => -coord),
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
            const ligandMolecule: moorhen.Molecule = this.store.getState().molecules.moleculeList.find((molecule: moorhen.Molecule) => molecule.molNo === ligandMolNo)
            newMolecules = await Promise.all(
                result.data.result.result.map(async (fitLigandResult: (number | libcootApi.fitLigandInfo), idx: number) => {
                    const newMolecule = new MoorhenMolecule(this.commandCentre, this.store, this.monomerLibraryPath)
                    newMolecule.molNo = fitRightHere ? fitLigandResult as number : (fitLigandResult as libcootApi.fitLigandInfo).imol
                    newMolecule.name = `${ligandMolecule?.name ? ligandMolecule.name : "Lig."} fit. #${idx + 1}`
                    newMolecule.isDarkBackground = this.isDarkBackground
                    newMolecule.defaultBondOptions = this.defaultBondOptions
                    await ligandMolecule?.transferLigandDicts?.(newMolecule)
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
        const result: { cid: string; bFactor: number; normalised_bFactor: number }[] = []
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
            first: parseAtomInfoLabel(selectionAtoms[0]),
            second: parseAtomInfoLabel(selectionAtoms[selectionAtoms.length - 1]),
            isMultiCid: cid.includes('||'),
            cid: cid.includes('||') ? cid.split('||') : cid,
            label: cid
        }
    }

    /**
     * Test whether an atom selection is valid
     * @param {string} cid - The CID selection
     * @returns {boolean} Whether the selection is valid
     */
    async isValidSelection(cid: string): Promise<boolean> {
        try {
            const selectedAtoms = await this.gemmiAtomsForCid(cid)
            if (!selectedAtoms || selectedAtoms.length === 0) {
                return false
            }
        } catch (error) {
            console.warn(error)
            return false
        }
        return true
    }

    /**
     * Get the CIDs of residues not included in the input CID
     * @param {string} cid - The input CID selection
     * @returns {string[]} An array of CIDs for the residue ranges not included in the input CID
     */
    getNonSelectedCids(cid: string): string[] {
        const result: string[] = []
        const nonSelectedCidVec = window.CCP4Module.get_non_selected_cids(this.gemmiStructure, cid)
        const nonSelectedCidVecSize = nonSelectedCidVec.size()
        for (let i = 0; i < nonSelectedCidVecSize; i++) {
            const iCid = nonSelectedCidVec.get(i)
            result.push(iCid)
        }
        nonSelectedCidVec.delete()
        return result
    }

    /**
     * Get the secondary structure information for the residues in the current molecule
     * @param {number} modelNumber - The model number to extract secondary structure information from
     * @returns {object[]} An array of objects containing the secondary structure information for each residue
     */
    async getSecondaryStructInfo(modelNumber: number = 1): Promise<libcootApi.ResidueSpecJS[]> {
        const secondaryStructInfoVec = await this.commandCentre.current.cootCommand({
            returnType: 'residue_specs',
            command: 'GetSecondaryStructure',
            commandArgs: [ this.molNo, modelNumber ],
        }, false) as moorhen.WorkerResponse<libcootApi.ResidueSpecJS[]>

        return secondaryStructInfoVec.data.result.result
    }

    /**
     * Export the current molecule as a gltf file in binary format
     * @param {string} representationId - The id of the representation to export
     * @returns {ArrayBuffer} - The contents of the gltf file in binary format
     */
    async exportAsGltf(representationId: string): Promise<ArrayBuffer> {
        const selectedRepresentation = this.representations.find(item => item.uniqueId === representationId)
        if (selectedRepresentation) {
            const fileContents = await selectedRepresentation.exportAsGltf()
            return fileContents
        } else {
            console.warn(`Could not find representation with id ${representationId}`)
        }
    }

    /**
     * Get results of privateer validation for this molecule instance
     * @param {boolean} useCache - Whether to use the cached results or not
     * @returns {Promise<privateer.ResultsEntry[]>} A list of results from privateer validation
     */
    async getPrivateerValidation(useCache: boolean = false): Promise<privateer.ResultsEntry[]> {
        if (useCache && this.cachedPrivateerValidation && !this.atomsDirty) {
            return this.cachedPrivateerValidation
        }

        const result = await this.commandCentre.current.cootCommand({
            command: 'privateer_validate',
            commandArgs: [this.molNo],
            returnType: 'privateer_results'
        }, false) as moorhen.WorkerResponse<privateer.ResultsEntry[]>

        if (useCache) {
            this.cachedPrivateerValidation = result.data.result.result
        }

        return result.data.result.result
    }

    /**
     * Get SVG descriptions for the ligand environment
     * @param {string} cid - The selection string of the ligand to get SVG descriptions for
     */
    async getFLEVSVG(cid: string): Promise<string> {

        if(window.CCP4Module.has_hydrogen(this.gemmiStructure.first_model())){
            const flev_result = await this.commandCentre.current.cootCommand({
                returnType: "string",
                command: 'get_svg_for_2d_ligand_environment_view',
                commandArgs: [this.molNo, cid, true]
            }, false) as moorhen.WorkerResponse<string>
            const ligandSVG = flev_result.data.result.result
            return ligandSVG
        } else {

            const placeHolderSVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-12.000000 -2.000000 22.000000 2.000000" width="100%" height="100%">
<!-- Substitution Contour -->
   <text x="-9." y="-1.1" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="0.055000em" fill="slategrey">You must add hydrogen atoms to the model </text>
   <text x="-9." y="-0.4" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="0.055000em" fill="slategrey">before ligand environment can be shown correctly</text>
</svg>`

            return placeHolderSVG
        }
    }

    /**
     * Get SVG descriptions for the ligands in this molecule instance
     * @param {string} resName - The name of the ligand to get SVG descriptions for
     * @param {boolean} useCache - Whether to use the cached results or not
     * @returns {Promise<string[]>} A list of SVG descriptions for the ligands in this molecule instance
     */
    async getLigandSVG(resName: string, useCache: boolean = false): Promise<string> {
        if (useCache && this.cachedLigandSVGs && !this.atomsDirty && resName in this.cachedLigandSVGs) {
            return this.cachedLigandSVGs[resName]
        }

        const state = this.store.getState()
        const isDark = state.sceneSettings.isDark
        let coot_bg_type
        if(isDark)
            coot_bg_type = "light-bonds/transparent-bg"
        else
            coot_bg_type = "dark-bonds/transparent-bg"

        const use_rdkit = true

        const result = await this.commandCentre.current.cootCommand({
                returnType: "string",
                command: 'get_svg_for_residue_type',
                commandArgs: [this.molNo, resName, use_rdkit, coot_bg_type],
            }, false) as moorhen.WorkerResponse<string>

        const ligandSVG = formatLigandSVG(result.data.result.result, false)

        if (useCache && ligandSVG !== `No dictionary for ${resName}`) {
            this.cachedLigandSVGs = { ...this.cachedLigandSVGs, [resName]: ligandSVG }
        }

        return ligandSVG
    }

    /**
     * Change the ID of a given chain
     * @param {string} oldId - The old chain ID
     * @param {string} newId - The new chain ID
     * @param {number} startResNo - The start residue number
     * @param {number} endResNo - The end residue number
     * @returns {number} - Status code -1 on a conflict, 1 on good, 0 on did nothing
     */
    async changeChainId(oldId: string, newId: string, redraw: boolean = false, startResNo?: number, endResNo?: number): Promise<number> {
        const status = await this.commandCentre.current.cootCommand({
            returnType: 'pair_int_str',
            command: 'change_chain_id',
            commandArgs: [ this.molNo, oldId, newId, (startResNo !== undefined && endResNo !== undefined), startResNo ? startResNo : 0, endResNo ? endResNo : 0 ],
        }, false) as moorhen.WorkerResponse<{first: number; second: string}>

        if (status.data.result.result.first === 1) {
            this.setAtomsDirty(true)
            // If the chain is new, then we need to create a random colour rule for it...
            const selectedColour = getRandomMoleculeColour()
            this.addColourRule('chain', `//${newId}`, selectedColour, [`//${newId}`, selectedColour])
            if (redraw) {
                await this.redraw()
            }
        } else {
            console.warn(status.data.result.result.second)
            console.warn(`change_chain_id returned status ${status.data.result.result.first}`)
        }
        return status.data.result.result.first
    }

    /**
     * Split a molecule with multiple models into separate molecules (one for each model)
     * @param {boolean} [draw=false] - Indicates whether the new molecules should be drawn
     * @returns {moorhen.Molecule[]} - A list with the new molecules
     */
    async generateAssembly(assemblyNumber: string, draw: boolean = false): Promise<moorhen.Molecule> {
        const coordString = await this.gemmiStructure.as_string()
        const newMolecule = new MoorhenMolecule(this.commandCentre, this.store, this.monomerLibraryPath)
        newMolecule.name = `${this.name}-assembly-${assemblyNumber}`
        const response = await this.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'shim_generate_assembly',
            commandArgs: [ coordString, assemblyNumber, newMolecule.name ],
        }, true) as moorhen.WorkerResponse<libcootApi.PairType<number, moorhen.coorFormats>>

        newMolecule.molNo = response.data.result.result.first

        await this.transferMetaData(newMolecule)
        await newMolecule.fetchDefaultColourRules()
        await newMolecule.fetchIfDirtyAndDraw('CBs')
        return newMolecule
    }

    /**
     * Split a molecule with multiple models into separate molecules (one for each model)
     * @param {boolean} [draw=false] - Indicates whether the new molecules should be drawn
     * @returns {moorhen.Molecule[]} - A list with the new molecules
     */
    async splitMultiModels(draw: boolean = false): Promise<moorhen.Molecule[]> {
        const result = await this.commandCentre.current.cootCommand({
            returnType: 'int_array',
            command: 'split_multi_model_molecule',
            commandArgs: [ this.molNo ],
        }, false) as moorhen.WorkerResponse<number[]>

        if (result.data.result.status === 'Completed') {
            if (draw) {
                this.store.dispatch(hideMolecule(this))
            }
            return await Promise.all(
                result.data.result.result.map(async (molNo, index) => {
                    const newMolecule = new MoorhenMolecule(this.commandCentre, this.store, this.monomerLibraryPath)
                    newMolecule.name = `${this.name}-${index+1}`
                    newMolecule.molNo = molNo
                    await this.transferMetaData(newMolecule)
                    newMolecule.setAtomsDirty(true)
                    await newMolecule.fetchDefaultColourRules()
                    if (draw) {
                        await newMolecule.fetchIfDirtyAndDraw('CBs')
                    }
                    return newMolecule
                })
            )
        }
        else {
            console.warn(result.data.consoleMessage)
        }
    }

    /**
     * Minimize the energy of a given set of residues (usually a ligand)
     * @param cid - The CID for the input residues
     * @param ncyc - The number of cycles
     * @param nIterations - The number of iterations
     * @param useRamaRestraints - Indicates whether ramachandran restraints should be used
     * @param ramaWeight - Indicates the weight assigned to ramachandran restraints
     * @param useTorsionRestraints - Indicates whether torsion restraints should be used
     * @param torsionWeight - Indicates the weight assigned to torsion restraints
     */
    async minimizeEnergyUsingCidAnimated(cid: string, ncyc: number, nIterations: number, useRamaRestraints: boolean, ramaWeight: number, useTorsionRestraints: boolean, torsionWeight: number) {
        const commandArgs = [
            this.molNo,
            cid,
            ncyc,
            useRamaRestraints,
            ramaWeight,
            useTorsionRestraints,
            torsionWeight,
            true
        ]
        for (let i = 0; i < nIterations; i++) {
            const result = await this.commandCentre.current.cootCommand({
                command: 'minimize_energy',
                commandArgs: commandArgs,
                returnType: 'status_instanced_mesh_pair',
            }, false) as moorhen.WorkerResponse<{status: number; mesh: libcootApi.InstancedMeshJS}>

            if (result.data.result.result.status !== -2) {
                break
            } else {
                await this.drawWithStyleFromMesh('CBs', [result.data.result.result.mesh])
            }
        }
        this.setAtomsDirty(true)
        await this.redraw()
    }

    /**
     * Fetch header information for this molecule instance
     * @param {boolean} useCache - Whether to use the cached results or not
     * @returns {Promise<libcootApi.headerInfoJS>} Object containing header information
     */
    async fetchHeaderInfo(useCache: boolean = true): Promise<libcootApi.headerInfoJS> {

        const coordString = await this.gemmiStructure.as_string()
        let docString = ""
        if(this.gemmiDocument){
            docString = await this.gemmiDocument.as_string()
        }

        const dummy_name = (this.gemmiDocument) ? "dummy.cif" :  "dummy.pdb"

        const headerInfoGemmi = (this.gemmiDocument) ? await this.commandCentre.current.cootCommand({
                    command: 'get_coord_header_info',
                    commandArgs: [docString,dummy_name],
                    returnType: 'header_info_gemmi_t'
                }, true) as moorhen.WorkerResponse<libcootApi.headerInfoGemmiJS> :
                await this.commandCentre.current.cootCommand({
                    command: 'get_coord_header_info',
                    commandArgs: [coordString,dummy_name],
                    returnType: 'header_info_gemmi_t'
                }, true) as moorhen.WorkerResponse<libcootApi.headerInfoGemmiJS>

        if (useCache && this.headerInfo !== null) {
            return this.headerInfo
        }

        const headerInfo = await this.commandCentre.current.cootCommand({
            command: 'get_header_info',
            commandArgs: [ this.molNo ],
            returnType: 'header_info_t',
        }, false) as moorhen.WorkerResponse<libcootApi.headerInfoJS>

        if (useCache) {
            this.headerInfo = headerInfo.data.result.result
            if(this.gemmiDocument&&headerInfoGemmi.data.result.status==="Completed") {
                this.headerInfo.title = headerInfoGemmi.data.result.result.title
                this.headerInfo.author_journal = headerInfoGemmi.data.result.result.author_journal
                this.headerInfo.compound_lines = headerInfoGemmi.data.result.result.compound.split("\n")
            } else {
                if(headerInfoGemmi.data.result.result.title.length>headerInfo.data.result.result.title.length){
                    this.headerInfo.title = headerInfoGemmi.data.result.result.title
                } else {
                    this.headerInfo.title = headerInfo.data.result.result.title
                }
                this.headerInfo.author_journal = headerInfo.data.result.result.author_journal
                this.headerInfo.compound_lines = headerInfo.data.result.result.compound_lines
            }
        }

        return headerInfo.data.result.result
    }

    /**
     * Calculate the Q-Score for a CID
     * @param {string} cid - The CID selection used to calcualte the qscore
     * @param {moorhen.Map} activeMap - The map instance used in the refinement
     */
    async calculateQscore(activeMap: moorhen.Map, cid?: string) {
        const result = await this.commandCentre.current.cootCommand({
            command: cid ? 'get_q_score_for_cid' : 'get_q_score',
            commandArgs: cid ? [ this.molNo, cid, activeMap.molNo ] : [ this.molNo, activeMap.molNo ],
            returnType: 'validation_data',
        }, false) as moorhen.WorkerResponse<libcootApi.ValidationInformationJS[]>
        return result.data.result.result
    }
}
