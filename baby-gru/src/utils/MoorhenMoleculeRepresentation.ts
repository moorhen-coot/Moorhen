import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';
import { cidToSpec, gemmiAtomPairsToCylindersInfo, gemmiAtomsToCirclesSpheresInfo, getCubeLines, guid, countResiduesInSelection, copyStructureSelection } from './utils';
import { libcootApi } from '../types/libcoot';
import { MoorhenColourRule } from './MoorhenColourRule';
import { COOT_BOND_REPRESENTATIONS, M2T_REPRESENTATIONS } from "./enums"

/**
 * Represents a molecule representation
 * @property {string} style - The style of this molecule representation instance
 * @property {string} cid - The CID selection for this colour rule
 * @property {moorhen.Molecule} parentMolecule - The molecule assigned to this colour rule
 * @property {string} uniqueId - A unique identifier for this colour rule
 * @property {boolean} visible - Indicates whether the molecule representation is currently visible
 * @property {moorhen.ColourRule[]} colourRules - The list of colour rules associated to this molecule representation
 * @property {React.RefObject<moorhen.CommandCentre>} commandCentre - A react reference to the command centre instance
 * @property {React.RefObject<webGL.MGWebGL>} glRef - A react reference to the MGWebGL instance
 * @constructor
 * @param {moorhen.RepresentationStyles} style - The style of this molecule representation instance
 * @param {string} cid - The CID selection for this colour rule
 * @param {React.RefObject<moorhen.CommandCentre>} commandCentre - A react reference to the command centre instance
 * @param {React.RefObject<webGL.MGWebGL>} glRef - A react reference to the MGWebGL instance
 * @example
 * import { MoorhenMolecule, MoorhenColourRule } from 'moorhen';
 *
 * const example = async () => {
 *    const molecule = new MoorhenMolecule(commandCentre, glRef, monomerLibraryPath);
 *
 *    const representation = new MoorhenMoleculeRepresentation(style, cid, commandCentre, glRef)
 *    representation.setParentMolecule(molecule)
 *    await representation.draw()
 * }
 */
export class MoorhenMoleculeRepresentation implements moorhen.MoleculeRepresentation {

    uniqueId: string;
    style: moorhen.RepresentationStyles;
    cid: string;
    buffers: moorhen.DisplayObject[];
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>
    parentMolecule: moorhen.Molecule;
    styleHasAtomBuffers: boolean;
    styleHasColourRules: boolean;
    styleHasSymmetry: boolean;
    styleIsM2tRepresentation: boolean;
    styleIsCootBondRepresentation: boolean;
    styleIsCombinedRepresentation: boolean;
    visible: boolean;
    colourRules: moorhen.ColourRule[];
    isCustom: boolean;
    useDefaultBondOptions: boolean;
    useDefaultColourRules: boolean;
    useDefaultResidueEnvironmentOptions: boolean;
    useDefaultM2tParams: boolean;
    bondOptions: moorhen.cootBondOptions;
    m2tParams: moorhen.m2tParameters;
    nonCustomOpacity: number;
    residueEnvironmentOptions: moorhen.residueEnvironmentOptions;
    ligandsCid: string;
    hoverColor: number[];
    residueSelectionColor: number[];
    mergeBufferObjects: (bufferObj1: libcootApi.InstancedMeshJS[], bufferObj2: libcootApi.InstancedMeshJS[]) => libcootApi.InstancedMeshJS[]

    constructor(style: moorhen.RepresentationStyles, cid: string, commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>) {
        this.uniqueId = guid()
        this.cid = cid
        this.setStyle(style)
        this.commandCentre = commandCentre
        this.glRef = glRef
        this.parentMolecule = null
        this.buffers = null
        this.visible = false
        this.colourRules = null
        this.isCustom = false
        this.useDefaultColourRules = true
        this.useDefaultBondOptions = true
        this.nonCustomOpacity = 1.0
        this.useDefaultM2tParams = true
        this.useDefaultResidueEnvironmentOptions = true
        this.bondOptions = {
            smoothness: 1,
            width: 0.1,
            atomRadiusBondRatio: 1,
            showAniso: false,
            showOrtep: false,
            showHs: true
        }
        this.m2tParams = {
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
        this.residueEnvironmentOptions = {
            maxDist: 8,
            backgroundRepresentation: "CRs",
            focusRepresentation: "CBs",
            labelled: true,
            showHBonds: true,
            showContacts: true
        }
        this.ligandsCid = "/*/*/(!ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR,WAT,HOH,THP,SEP,TPO,TYP,PTR,OH2,H2O,G,C,U,A,T)"
        this.hoverColor = [1.0, 0.5, 0.0, 0.35]
        this.residueSelectionColor = [0.25, 1.0, 0.25, 0.35]
    }

    /**
     * A method to set M2T style parameters for this molecule representation
     * @param {moorhen.m2tParameters} m2tParams - The new M2T parameters
     */
    setM2tParams(m2tParams: moorhen.m2tParameters) {
        if (m2tParams) {
            this.useDefaultM2tParams = false
            this.m2tParams = m2tParams
        } else {
            this.useDefaultM2tParams = true
        }
    }

    /**
     * A method to set alpha for molecular representation in case of colour not picked with colour picker
     */
    setNonCustomOpacity(nonCustomOpacity: number) {
        if(typeof(nonCustomOpacity)!=="number") return
        this.nonCustomOpacity = nonCustomOpacity
        if(this.buffers){
            this.buffers.forEach((buffer) => {
                if (nonCustomOpacity < 0.99) {
                    buffer.transparent = true
                } else {
                    buffer.transparent = false
                }
                buffer.triangleColours.forEach(colbuffer => {
                    for (let idx = 0; idx < colbuffer.length; idx += 4) {
                        colbuffer[idx + 3] = nonCustomOpacity
                    }
                })
                buffer.isDirty = true;
                buffer.alphaChanged = true;
            })
            this.glRef.current.buildBuffers();
            this.glRef.current.drawScene();
        }
    }

    /**
     * A method to set bond style options for this molecule representation
     * @param {moorhen.cootBondOptions} bondOptions - The new bond options
     */
    setBondOptions(bondOptions: moorhen.cootBondOptions) {
        if (bondOptions) {
            this.useDefaultBondOptions = false
            this.bondOptions = bondOptions
        } else {
            this.useDefaultBondOptions = true
        }
    }

    /**
     * A method to set res. env. options for this molecule representation
     * @param {moorhen.residueEnvironmentOptions} newOptions - The new res. env. options
     */
    setResidueEnvOptions(newOptions: moorhen.residueEnvironmentOptions) {
        if (newOptions) {
            this.useDefaultResidueEnvironmentOptions = false
            this.residueEnvironmentOptions = newOptions
        } else {
            this.useDefaultResidueEnvironmentOptions = true
        }
    }

    /**
     * A method to set the style attribute of this molecule representation instance
     * @param {moorhen.RepresentationStyles} style - The new representation style
     */
    setStyle(style: moorhen.RepresentationStyles) {
        this.style = style
        this.styleHasAtomBuffers = ![
            'contact_dots', 'ligand_validation', 'chemical_features', 'unitCell', 'MolecularSurface', 'VdWSurface', 'residueSelection',
            'gaussian', 'allHBonds', 'rotamer', 'rama', 'environment', 'ligand_environment', 'hover', 'CDs', 'restraints'
        ].includes(style)
        this.styleHasSymmetry = ![
            'residueSelection', 'unitCell', 'originNeighbours', 'selection', 'transformation', 'contact_dots', 'residue_environment',
            'chemical_features', 'VdWSurface', 'restraints', 'environment', 'ligand_environment', 'CDs', 'ligand_validation'
        ].includes(style)
        this.styleHasColourRules = ![
            'allHBonds', 'rama', 'rotamer', 'unitCell', 'hover', 'environment', 'ligand_environment',
            'contact_dots', 'chemical_features', 'ligand_validation', 'restraints', 'residueSelection'
        ].includes(style)
        if (style === "ligands") {
            this.cid = this.parentMolecule?.ligands?.length > 0 ? this.parentMolecule.ligands.map(ligand => ligand.cid).join('||') : this.ligandsCid
        }
        this.styleIsM2tRepresentation = M2T_REPRESENTATIONS.includes(this.style)
        this.styleIsCootBondRepresentation = COOT_BOND_REPRESENTATIONS.includes(this.style)
        this.styleIsCombinedRepresentation = [
            'adaptativeBonds', 'residue_environment'
        ].includes(this.style)
    }

    /**
     * A method to set whether the molecule default colour rules should be used for this molecule representation instance
     * @param {boolean} newVal - Indicates whether default molecule colour rules should be used
     */
    setUseDefaultColourRules(newVal: boolean) {
        this.useDefaultColourRules = newVal
    }

    /**
     * A method to associate a new colour rule to this representation
     * @param {string} ruleType - The type of this colour rule instance
     * @param {string} cid - The CID selection for this colour rule
     * @param {string} color - The colour for this rule (hex format)
     * @property {any[]} args - A list of arguments passed to libcoot API
     * @param {boolean} [isMultiColourRule=false] - Indicates whether this colour rule consists of multiple colours assigned to different residues
     * @param {boolean} [applyColourToNonCarbonAtoms=false] - Indicates if the colour rule will also be applied to non carbon atoms
     * @property {string} [label=undefined] - Label displayed in the UI for this colour rule
     */
    addColourRule(ruleType: string, cid: string, color: string, args: (string | number)[], isMultiColourRule: boolean = false, applyColourToNonCarbonAtoms: boolean = false, label?: string) {
        const newColourRule = new MoorhenColourRule(ruleType, cid, color, this.commandCentre, isMultiColourRule, applyColourToNonCarbonAtoms)
        newColourRule.setParentRepresentation(this)
        newColourRule.setArgs(args)
        if (label) {
            newColourRule.setLabel(label)
        }

        this.useDefaultColourRules = false
        if (this.colourRules === null) {
            this.colourRules = [ newColourRule ]
        } else {
            this.colourRules.push(newColourRule)
        }
    }

    /**
     * Set the colour rules used for this molecule representation
     * @param {moorhen.ColourRule[]} colourRules - An array with the new colour rules
     */
    setColourRules(colourRules: moorhen.ColourRule[]) {
        if (colourRules && colourRules.length > 0) {
            this.colourRules = colourRules
            colourRules.forEach(rule => rule.setParentRepresentation(this))
            this.useDefaultColourRules = false
        } else {
            this.useDefaultColourRules = true
        }
    }

    /**
     * Set the representation buffers
     * @param {moorhen.DisplayObject[]} buffers - The new buffers
     */
    setBuffers(buffers: moorhen.DisplayObject[]) {
        this.buffers = buffers
    }

    /**
     * Set the atom information in the buffers of this representation
     * @param {moorhen.AtomInfo[]} atomBuffers - The atom info objects that will be added to the representation buffers
     */
    setAtomBuffers(atomBuffers: moorhen.AtomInfo[]) {
        if (atomBuffers?.length > 0 && this.buffers?.length > 0) {
            this.buffers[0].atoms = atomBuffers
        }
    }

    /**
     * Set the molecule associated with this representation
     * @param {moorhen.Molecule} molecule - The molecule associated to this representation
     */
    setParentMolecule(molecule: moorhen.Molecule) {
        this.parentMolecule = molecule
        this.colourRules = this.parentMolecule.defaultColourRules
        this.bondOptions = this.parentMolecule.defaultBondOptions
        this.m2tParams = this.parentMolecule.defaultM2tParams
        this.residueEnvironmentOptions = this.parentMolecule.defaultResidueEnvironmentOptions
        if (this.style === "ligands") {
            this.cid = this.parentMolecule?.ligands?.length > 0 ? this.parentMolecule.ligands.map(ligand => ligand.cid).join('||') : this.ligandsCid
        }
    }

    /**
     * Build the buffers for this representation
     * @param {moorhen.DisplayObject[]} objects - The display objects for this representation
     */
    buildBuffers(objects: moorhen.DisplayObject[]) {
        if (objects.length > 0 && !this.parentMolecule.gemmiStructure?.isDeleted()) {
            objects.filter(object => typeof object !== 'undefined' && object !== null).forEach(object => {
                const a = this.glRef.current.appendOtherData(object, true)
                if (this.buffers) {
                    this.buffers = this.buffers.concat(a)
                } else {
                    this.buffers = a
                }
            })
            this.glRef.current.buildBuffers()
        }
        this.glRef.current.drawScene()
    }

    /**
     * Draw this molecule representation (tipically for the first time)
     */
    async draw() {
        this.visible = true
        await this.applyColourRules()
        const objects = await this.getBufferObjects()
        this.buildBuffers(objects)
        if (this.styleHasAtomBuffers) {
            let atomBuffers = await this.parentMolecule.gemmiAtomsForCid(this.styleIsCombinedRepresentation ? '/*/*/*/*' : this.cid, true)
            this.setAtomBuffers(atomBuffers)
        }
    }

    /**
     * Redraw this molecule representation (typically not the first time)
     */
    async redraw() {
        this.visible = true
        await this.applyColourRules()
        const objects = await this.getBufferObjects()
        this.deleteBuffers()
        this.buildBuffers(objects)
        if (this.styleHasAtomBuffers) {
            let atomBuffers = await this.parentMolecule.gemmiAtomsForCid(this.styleIsCombinedRepresentation ? '/*/*/*/*' : this.cid, true)
            this.setAtomBuffers(atomBuffers)
        }
    }

    /**
     * Delete the current representation buffers
     */
    deleteBuffers() {
        if (this.buffers?.length > 0) {
            this.buffers.forEach(buffer => {
                if ("clearBuffers" in buffer) {
                    buffer.clearBuffers()
                    if (this.glRef.current.displayBuffers) {
                        this.glRef.current.displayBuffers = this.glRef.current.displayBuffers.filter(glBuffer => glBuffer !== buffer)
                    }
                } else if ("labels" in buffer) {
                    this.glRef.current.labelsTextCanvasTexture.removeBigTextureTextImages(buffer.labels, buffer.uuid)
                }
            })
            this.glRef.current.buildBuffers()
            this.glRef.current.drawScene()
            this.buffers = []
        }
    }

    /**
     * Make the representation visible
     */
    async show() {
        try {
            this.visible = true
            if (this.buffers && this.buffers.length > 0) {
                this.buffers.forEach(buffer => {
                    buffer.visible = true
                    if ("labels" in buffer) {
                        buffer.labels.forEach(label => {
                            this.glRef.current.labelsTextCanvasTexture.addBigTextureTextImage(label, buffer.uuid)
                        })
                        this.glRef.current.labelsTextCanvasTexture.recreateBigTextureBuffers()
                    }
                })
                this.glRef.current.drawScene()
            } else {
                await this.draw()
            }
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Make the representation not visible
     */
    hide() {
        try {
            this.visible = false
            this.buffers.forEach(buffer => {
                 buffer.visible = false
                 if ("labels" in buffer) {
                    this.glRef.current.labelsTextCanvasTexture.removeBigTextureTextImages(buffer.labels, buffer.uuid)
                 }
                 this.glRef.current.labelsTextCanvasTexture.recreateBigTextureBuffers()
            })
            this.glRef.current.drawScene()
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Use libcoot API to get the buffers for this molecule representation
     * @param {moorhen.RepresentationStyles} [style=undefined] - The style of the representation (MoorhenMoleculeRepresentation.style attribute will be used if left undefined)
     * @param {string} [cid=undefined] - The CID selection (MoorhenMoleculeRepresentation.cid attribute will be used if left undefined)
     * @returns {object[]} The buffer objects for this molecule representation
     */
    async getBufferObjects(style?: moorhen.RepresentationStyles, cid?: string) {
        const _style = style ?? this.style
        const _cid = cid ?? this.cid
        let objects
        switch (_style) {
            case 'VdwSpheres':
            case 'ligands':
            case 'CAs':
            case 'CBs':
                objects = await this.getCootSelectionBondBuffers(_style, _cid)
                break
            case 'CDs':
                objects = await this.getCootContactDotsBuffers()
                break;
            case 'gaussian':
                objects = await this.getCootGaussianSurfaceBuffers()
                break;
            case 'allHBonds':
                objects = await this.getHBondBuffers(_cid)
                break;
            case 'rama':
                objects = await this.getRamachandranBallBuffers()
                break;
            case 'rotamer':
                objects = await this.getRotamerDodecahedraBuffers()
                break;
            case 'glycoBlocks':
                objects = await this.getGlycoBlockBuffers(_cid)
                break;
            case 'CRs':
            case 'MolecularSurface':
            case 'DishyBases':
            case 'VdWSurface':
            case 'Calpha':
                objects = await this.getM2TRepresentationBuffers(_style, _cid)
                break
            case 'unitCell':
                objects = this.getUnitCellRepresentationBuffers()
                break
            case 'hover':
                objects = await this.getResidueHighlightBuffers(_cid, this.hoverColor)
                break
            case 'residueSelection':
                objects = await this.getResidueHighlightBuffers(_cid, this.residueSelectionColor, true)
                break
            case 'environment':
            case 'ligand_environment':
                objects = await this.getEnvironmentBuffers(_cid)
                break
            case 'residue_environment':
                objects = await this.getResidueEnvironmentBuffers(_cid)
                break
            case 'contact_dots':
                objects = await this.getCootContactDotsCidBuffers(_cid)
                break
            case 'chemical_features':
                objects = await this.getCootChemicalFeaturesCidBuffers(_cid)
                break
            case 'ligand_validation':
                objects = await this.getLigandValidationBuffers(_cid)
                break
            case 'restraints':
                objects = await this.getRestraintsMeshBuffers()
                break
            case 'MetaBalls':
                objects = await this.getMetaBallBuffers(_cid)
                break
            case 'adaptativeBonds':
                objects = await this.getAdaptativeBondBuffers(_cid)
                break
            default:
                console.log(`Unrecognised style ${_style}...`)
                break
        }
        return objects
    }

    /**
     * A static method that can be used to merge together arrays of buffer objects
     * @param {libcootApi.InstancedMeshJS[]} bufferObj1 - The first array to be merged
     * @param {libcootApi.InstancedMeshJS[]} bufferObj2 - The second array to be merged
     * @returns {libcootApi.InstancedMeshJS[]} A merged array with the buffer objects in the second and first array
     */
    static mergeBufferObjects(bufferObj1: libcootApi.InstancedMeshJS[], bufferObj2: libcootApi.InstancedMeshJS[]): libcootApi.InstancedMeshJS[] {
        let resultBufferObjects: libcootApi.InstancedMeshJS[] = []

        for (let i=0; i < bufferObj1.length; i++) {
            let iObjects = {}
            for (let key in bufferObj1[i]) {
                if (!(key in bufferObj2[i])) {
                    console.warn(`Failed to merge: attr. ${key} with index ${i} not found in buffer object no. 2, skipping...`)
                } else {
                    iObjects[key] = bufferObj1[i][key].concat(bufferObj2[i][key])
                }
            }
            resultBufferObjects.push(iObjects as libcootApi.InstancedMeshJS)
        }

        return resultBufferObjects
    }

    /**
     * Get the buffers objects for a representation of style residue_environment
     * @param {string} cid - The CID selection for the representation
     * @returns {object[]} An array with the buffer objects for this representation
     */
    async getResidueEnvironmentBuffers(cid: string) {
        const envBuffers = await this.getEnvironmentBuffers(cid)
        const bufferObj = await this.getAdaptativeBondBuffers(cid, this.residueEnvironmentOptions.focusRepresentation, this.residueEnvironmentOptions.backgroundRepresentation)
        return [...bufferObj, ...envBuffers]
    }

    /**
     * Get the buffers objects for a representation of style adaptiveBonds
     * @param {string} cid - The CID selection for the representation
     * @param {moorhen.RepresentationStyles} [focusRepresentation="CBs"] - The representation style for the CID at focus
     * @param {moorhen.RepresentationStyles} [backgroundRepresentation="CAs"] - The representation style for the rest of the molecule
     * @returns {object[]} An array with the buffer objects for this representation
     */
    async getAdaptativeBondBuffers(cid: string, focusRepresentation: moorhen.RepresentationStyles = "CBs", backgroundRepresentation: moorhen.RepresentationStyles = "CAs") {
        if (!cid) {
            console.warn('No selection string provided when drawing origin bonds')
            return []
        }

        const maxDist = this.useDefaultResidueEnvironmentOptions ? this.parentMolecule.defaultResidueEnvironmentOptions.maxDist : this.residueEnvironmentOptions.maxDist
        let neighBoringResidues = await this.parentMolecule.getNeighborResiduesCids(cid, maxDist)
        let focusCids = neighBoringResidues.join('||')

        if (!focusCids) {
            const isValid = await this.parentMolecule.isValidSelection(cid)
            if (isValid) {
                console.warn(`Cannot find neighboring residues for ${cid}`)
                return []
            }
            const currentActiveAtom = await this.parentMolecule.getActiveAtom()
            neighBoringResidues = await this.parentMolecule.getNeighborResiduesCids(currentActiveAtom, maxDist)
            focusCids = neighBoringResidues.join('||')
            if (!focusCids) {
                console.warn(`Cannot find neighboring residues for ${cid}`)
                return []
            }
            console.warn(`Cannot find neighboring residues for ${cid}, defaulting to active atom ${currentActiveAtom}`)
        }

        const drawMissingLoops = this.parentMolecule.store.getState().sceneSettings.drawMissingLoops

        if (COOT_BOND_REPRESENTATIONS.includes(focusRepresentation) && drawMissingLoops) {
            await this.commandCentre.current.cootCommand({
                command: "set_draw_missing_residue_loops",
                returnType:'status',
                commandArgs: [ false ],
            }, false)
        }

        const focusBufferObjects = await this.getBufferObjects(focusRepresentation, focusCids)

        if (COOT_BOND_REPRESENTATIONS.includes(focusRepresentation) && drawMissingLoops) {
            await this.commandCentre.current.cootCommand({
                command: "set_draw_missing_residue_loops",
                returnType:'status',
                commandArgs: [ true ],
            }, false)
        }

        let originalExcludedSelections: string[]
        if (M2T_REPRESENTATIONS.includes(backgroundRepresentation)) {
            originalExcludedSelections = [ ...this.parentMolecule.excludedSelections ]
            this.parentMolecule.excludedSelections = [ ...neighBoringResidues ]
        } else {
            await Promise.all(neighBoringResidues.map(i => {
                this.commandCentre.current.cootCommand({
                    message: 'coot_command',
                    command: "add_to_non_drawn_bonds",
                    returnType: 'status',
                    commandArgs: [this.parentMolecule.molNo, i],
                }, false)
            }))
        }

        const backgroundBufferObjects = await this.getBufferObjects(backgroundRepresentation, '/*/*/*/*')

        if (M2T_REPRESENTATIONS.includes(backgroundRepresentation)) {
            this.parentMolecule.excludedSelections = [ ...originalExcludedSelections ]
        } else {
            await this.commandCentre.current.cootCommand({
                message: 'coot_command',
                command: "clear_non_drawn_bonds",
                returnType: 'status',
                commandArgs: [this.parentMolecule.molNo],
            }, false)

            await Promise.all(this.parentMolecule.excludedSelections.map(i => {
                this.commandCentre.current.cootCommand({
                    message: 'coot_command',
                    command: "add_to_non_drawn_bonds",
                    returnType: 'status',
                    commandArgs: [this.parentMolecule.molNo, i],
                }, false)
            }))
        }

        return [...focusBufferObjects, ...backgroundBufferObjects]
    }

    /**
     * Get buffer objects for restraints mesh representation
     * @returns {object[]} An array with the buffer objects for this representation
     */
    async getRestraintsMeshBuffers() {
        try {
            const response = await this.commandCentre.current.cootCommand({
                returnType: 'instanced_mesh',
                command: 'get_extra_restraints_mesh',
                commandArgs: [this.parentMolecule.molNo, 0]
            }, false) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>;
            const objects = [response.data.result.result];
            return objects
        } catch (err) {
            return console.log(err);
        }
    }

    /**
     * Get buffer objects for residue environment representation
     * @param {string} cid - The CID selection for this representation
     * @returns {object[]} An array with the buffer objects for this representation
     */
    async getEnvironmentBuffers(cid: string) {
        const resSpec = cidToSpec(cid)

        const response = await this.commandCentre.current.cootCommand({
            returnType: "generic_3d_lines_bonds_box",
            command: "make_exportable_environment_bond_box",
            commandArgs: [this.parentMolecule.molNo, resSpec.chain_id, resSpec.res_no, resSpec.alt_conf]
        }, false)
        const envDistances = response.data.result.result

        const labelled = this.useDefaultResidueEnvironmentOptions ? this.parentMolecule.defaultResidueEnvironmentOptions.labelled : this.residueEnvironmentOptions.labelled
        const showContacts = this.useDefaultResidueEnvironmentOptions ? this.parentMolecule.defaultResidueEnvironmentOptions.showContacts : this.residueEnvironmentOptions.showContacts
        const showHBonds = this.useDefaultResidueEnvironmentOptions ? this.parentMolecule.defaultResidueEnvironmentOptions.showHBonds : this.residueEnvironmentOptions.showHBonds

        const bumps = showContacts ? envDistances[0] : []
        const hbonds = showHBonds ? envDistances[1] : []

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

        let originNeighboursBump = this.getGemmiAtomPairsBuffers(bumpAtomsPairs, [0.7, 0.4, 0.25, 1.0], labelled)

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

        let originNeighboursHBond = this.getGemmiAtomPairsBuffers(hbondAtomsPairs, [0.7, 0.2, 0.7, 1.0], labelled)

        return originNeighboursBump.concat(originNeighboursHBond)
    }

    /**
     * Get arguments passed to libcoot API for M2T representations
     * @param style - The style of this representation
     * @param cidSelection - The CID selection of this representation
     * @returns {object} An object with the style name and CID selection to be passed as arguments to libcoot API
     */
    getM2tArgs(style: string, cidSelection: string) {
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

        if(cidSelection) {
            const struct_1 = copyStructureSelection(this.parentMolecule.gemmiStructure, cidSelection)
            const count_1 = countResiduesInSelection(struct_1)

            const struct_2 = copyStructureSelection(struct_1, m2tSelection)
            const count_2 = countResiduesInSelection(struct_2)

            struct_1.delete()
            struct_2.delete()

            if (count_1 > 0 && count_2 === 0) {
                m2tSelection = cidSelection
            } else {
                m2tSelection = `{${m2tSelection} & {${cidSelection}}}`
            }
        }

        if (this.parentMolecule.excludedSelections.length > 0) {
            m2tSelection = `{${m2tSelection} & !{${this.parentMolecule.excludedSelections.join(' | ')}}}`
        }

        return {
            m2tStyle,
            m2tSelection
        }
    }

    /**
     * Apply M2T parameters using libcoot API. This needs to be called before getting M2T buffer objects
     */
    async applyM2tParams() {
        await Promise.all(Object.keys(this.m2tParams).filter(param => param !== "nucleotideRibbonStyle").map(param => {
            return this.commandCentre.current.cootCommand({
                returnType: "status",
                command: [ "ribbonStyleAxialSampling", "cylindersStyleAngularSampling", "dishStyleAngularSampling" ].includes(param) ? "M2T_updateIntParameter" : "M2T_updateFloatParameter",
                commandArgs: [
                    this.parentMolecule.molNo, param, this.useDefaultM2tParams ? this.parentMolecule.defaultM2tParams[param] : this.m2tParams[param]
                ]
            }, false)
        }))
    }

    /**
     * Get buffer objects for nucleotide representation
     * @param {string} cidSelection - The CID selection for this representation
     * @returns {libcootApi.InstancedMeshJS[]} The buffer objects for this representation
     */
    async getNucleotideRepresentationBuffers(cidSelection: string): Promise<libcootApi.InstancedMeshJS[]> {
        const style = this.useDefaultM2tParams ? this.parentMolecule.defaultM2tParams.nucleotideRibbonStyle : this.m2tParams.nucleotideRibbonStyle

        await Promise.all([
            this.commandCentre.current.cootCommand({
                returnType: "status",
                command: "M2T_updateFloatParameter",
                commandArgs: [
                    this.parentMolecule.molNo, 'cylindersStyleCylinderRadius', style === "StickBases" ? 0.35 : 0.2
                ]
            }, false),
            this.commandCentre.current.cootCommand({
                returnType: "status",
                command: "M2T_updateFloatParameter",
                commandArgs: [
                    this.parentMolecule.molNo, 'cylindersStyleBallRadius', style === "StickBases" ? 0.5 : 0.2
                ]
            }, false)
        ])

        const result = await this.commandCentre.current.cootCommand({
            returnType: "mesh_perm3",
            command: "get_molecular_representation_mesh",
            commandArgs: [
                this.parentMolecule.molNo, cidSelection, "colorRampChainsScheme", style, 2
            ]
        }, false) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>

        await Promise.all([
            this.commandCentre.current.cootCommand({
                returnType: "status",
                command: "M2T_updateFloatParameter",
                commandArgs: [
                    this.parentMolecule.molNo, 'cylindersStyleCylinderRadius', this.useDefaultM2tParams ? this.parentMolecule.defaultM2tParams.cylindersStyleCylinderRadius : this.m2tParams.cylindersStyleCylinderRadius
                ]
            }, false),
            this.commandCentre.current.cootCommand({
                returnType: "status",
                command: "M2T_updateFloatParameter",
                commandArgs: [
                    this.parentMolecule.molNo, 'cylindersStyleBallRadius', this.useDefaultM2tParams ? this.parentMolecule.defaultM2tParams.cylindersStyleBallRadius : this.m2tParams.cylindersStyleBallRadius
                ]
            }, false)
        ])

        return [result.data.result.result]
    }

    /**
     * Get representation buffers for a M2T representation
     * @param style
     * @param cidSelection
     */
    async getM2TRepresentationBuffers(style: string, cidSelection?: string): Promise<libcootApi.InstancedMeshJS[]> {
        const { m2tStyle, m2tSelection } = this.getM2tArgs(style, cidSelection)

        await this.applyM2tParams()

        let colorStyle : string = "colorRampChainsScheme"

        if(this.colourRules.length>0&&this.colourRules[0].ruleType==="electrostatics")
            colorStyle = "ByOwnPotential"

        let ssUsageScheme
        if (this.useDefaultM2tParams) {
            ssUsageScheme = this.parentMolecule.defaultM2tParams.ssUsageScheme
        } else {
            ssUsageScheme = this.m2tParams.ssUsageScheme
        }

        console.log("##################################################")
        console.log("##################################################")
        console.log("get_molecular_representation_mesh, ssUsageScheme",ssUsageScheme)
        console.log("##################################################")
        console.log("##################################################")
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_molecular_representation_mesh",
            commandArgs: [
                this.parentMolecule.molNo, m2tSelection, colorStyle, m2tStyle, ssUsageScheme
            ]
        }, false) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
        console.log(response)

        const ribbonBufferObjects = [response.data.result.result]

        let resultBufferObjects: libcootApi.InstancedMeshJS[]
        if (m2tStyle === 'Ribbon' && this.parentMolecule.hasDNA) {
            const nucleotideBufferObjects = await this.getNucleotideRepresentationBuffers(m2tSelection)
            resultBufferObjects = MoorhenMoleculeRepresentation.mergeBufferObjects(nucleotideBufferObjects, ribbonBufferObjects)
        } else {
            resultBufferObjects = ribbonBufferObjects
        }

        return resultBufferObjects
    }

    /**
     * Get arguments passed to libcoot API to obtain bond representations
     * @param {string} name - The name of the representation style
     * @returns {any[]} An array of arguments passed to libcoot API
     */
    getBondArgs(name: string): [string, boolean, number, number, boolean, boolean, boolean, number] {
        let bondSettings: (string | boolean | number)[] = [
            name === "VdwSpheres" ? "VDW-BALLS" : name === "CAs" ? "CA+LIGANDS" : "COLOUR-BY-CHAIN-AND-DICTIONARY",
            this.parentMolecule.isDarkBackground
        ]
        if (this.useDefaultBondOptions) {
            bondSettings.push(
                (name === 'ligands' || name === 'CAs') ? this.parentMolecule.defaultBondOptions.width * 1.5 : this.parentMolecule.defaultBondOptions.width,
                (name === 'ligands' || name === 'CAs') ? this.parentMolecule.defaultBondOptions.atomRadiusBondRatio * 1.5 : this.parentMolecule.defaultBondOptions.atomRadiusBondRatio, 
                this.parentMolecule.defaultBondOptions.showAniso, this.parentMolecule.defaultBondOptions.showOrtep, this.parentMolecule.defaultBondOptions.showHs,
                this.parentMolecule.defaultBondOptions.smoothness
            )
        } else {
            bondSettings.push(
                (name === 'ligands' || name === 'CAs') ? this.bondOptions.width * 1.5 : this.bondOptions.width,
                (name === 'ligands' || name === 'CAs') ? this.bondOptions.atomRadiusBondRatio * 1.5 : this.bondOptions.atomRadiusBondRatio, 
                this.bondOptions.showAniso, this.bondOptions.showOrtep, this.bondOptions.showHs,
                this.bondOptions.smoothness
            )
        }
        return bondSettings as [string, boolean, number, number, boolean, boolean, boolean, number]
    }

    /**
     * Get bond representation buffers for a particular CID selection
     * @param {string} name - The name of the representation style
     * @param {string} cid - The CID selection for this representation
     * @returns {libcootApi.InstancedMeshJS[]} The representation buffers
     */
    async getCootSelectionBondBuffers(name: string, cid: null | string): Promise<libcootApi.InstancedMeshJS[]> {
        const bondArgs = this.getBondArgs(name)
        let meshCommand: Promise<moorhen.WorkerResponse<libcootApi.InstancedMeshJS>>
        let returnType = name === 'VdwSpheres' ? "instanced_mesh_perfect_spheres" : "instanced_mesh"

        if (name === "ligands") {
            this.cid = this.parentMolecule.ligands.length > 0 ? this.parentMolecule.ligands.map(ligand => ligand.cid).join('||') : this.ligandsCid
        }

        if (typeof cid !== 'string' || cid === '/*/*/*/*') {
            meshCommand = this.commandCentre.current.cootCommand({
                returnType: returnType,
                command: "get_bonds_mesh_instanced",
                commandArgs: [
                    this.parentMolecule.molNo,
                    ...bondArgs
                ]
            }, false)
        } else {
            meshCommand = this.commandCentre.current.cootCommand({
                returnType: returnType,
                command: "get_bonds_mesh_for_selection_instanced",
                commandArgs: [
                    this.parentMolecule.molNo,
                    cid,
                    ...bondArgs
                ]
            }, false)
        }

        const response = await meshCommand
        return [response.data.result.result]
    }

    /**
     * Draw molecule representations for the symmetry mates
     */
    drawSymmetry() {
        if (this.parentMolecule.symmetryMatrices && this.buffers && this.styleHasSymmetry) {
            this.buffers.forEach((displayObject: moorhen.DisplayObject) => {
                displayObject.symmetryMatrices = this.parentMolecule.symmetryMatrices
                displayObject.updateSymmetryAtoms()
            })
        }
    }

    /**
     * Get representation buffers corresponding with the residue highlight representation
     * @param {string} selectionString - The CID selection
     * @param {number[]} colour - The colour for the highlight
     * @param {boolean} [isResidueRange=false] - Indicates whether the CID selection consists of a residue range (e.g. //A/1-10)
     * @returns {object[]} Representation buffers for the residue highlight
     */
    async getResidueHighlightBuffers(selectionString: string, colour: number[], isResidueRange: boolean = false) {
        if (typeof selectionString !== 'string') {
            return
        }

        let modifiedSelection: string
        if (isResidueRange) {
            modifiedSelection = selectionString
        } else {
            const resSpec: moorhen.ResidueSpec = cidToSpec(selectionString)
            if (this.parentMolecule.isLigand) {
                modifiedSelection = `/*/${resSpec.chain_id}/${resSpec.res_no}-${resSpec.res_no}/${resSpec.atom_name}${resSpec.alt_conf === "" ? "" : ":"}${resSpec.alt_conf}`
            } else {
                modifiedSelection = `/*/${resSpec.chain_id}/${resSpec.res_no}-${resSpec.res_no}/*${resSpec.alt_conf === "" ? "" : ":"}${resSpec.alt_conf}`
            }
        }

        const selectedGemmiAtoms = await this.parentMolecule.gemmiAtomsForCid(modifiedSelection)
        const atomColours = {}
        selectedGemmiAtoms.forEach(atom => { atomColours[`${atom.serial}`] = colour })
        let sphere_size = 0.3
        let objects = [
            gemmiAtomsToCirclesSpheresInfo(selectedGemmiAtoms, sphere_size, "PERFECT_SPHERES", atomColours)
        ]
        objects.forEach(object => {
            object["clickTol"] = 1e-6
            object["doStencil"] = true
            object["isHoverBuffer"] = true
        })
        return objects
    }

    /**
     * Get representation buffers for the contact dots representation
     * @param {string} cid - The CID selection for this representation
     * @returns {libcootApi.InstancedMeshJS[]} The representation buffers
     */
    async getCootContactDotsCidBuffers(cid: string) {
        try {
            const response = await this.commandCentre.current.cootCommand({
                returnType: "instanced_mesh",
                command: "contact_dots_for_ligand",
                commandArgs: [this.parentMolecule.molNo, cid, this.bondOptions.smoothness]
            }, false) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>;
            const objects = [response.data.result.result];
            return objects
        } catch (err) {
            return console.log(err);
        }
    }

    /**
     * Get representation buffers for lines between pairs of atoms
     * @param {moorhen.AtomInfo[]} gemmiAtomPairs - An array describing the atom pairs
     * @param {number[]} colour - The colour for the lines
     * @param {boolean} [labelled=false] - Indicates whether the representation should include labels with the distance between the atom pairs
     * @returns {libcootApi.InstancedMeshJS[]} The representation buffers
     */
    getGemmiAtomPairsBuffers(gemmiAtomPairs: [moorhen.AtomInfo, moorhen.AtomInfo][], colour: number[], labelled: boolean = false): libcootApi.InstancedMeshJS[] {
        const atomColours = {}
        gemmiAtomPairs.forEach(atom => { atomColours[`${atom[0].serial}`] = colour; atomColours[`${atom[1].serial}`] = colour })
        let objects = [
            gemmiAtomPairsToCylindersInfo(gemmiAtomPairs, 0.07, atomColours, labelled)
        ]
        return objects
    }

    /**
     * Get representation buffers for the glycoblocks representation
     * @param {string} cid - The CID selection for this representation
     * @returns {libcootApi.InstancedMeshJS[]} The representation buffers
     */
    async getGlycoBlockBuffers(cid: string) {
        try {
            const response = await this.commandCentre.current.cootCommand({
                returnType: "instanced_mesh",
                command: "DrawGlycoBlocks",
                commandArgs: [this.parentMolecule.molNo, cid]
            }, false) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>;
            const objects = [response.data.result.result];
            return objects
        } catch (err) {
            return console.log(err);
        }
    }

    /**
     * Get representation buffers for the H-bonds representation
     * @param {string} cid - The CID selection for this representation
     * @param {boolean} [labelled=false] - Indicates whether the representation should include labels with the distance between the atom pairs
     * @returns {libcootApi.InstancedMeshJS[]} The representation buffers
     */
    async getHBondBuffers(cid: string, labelled: boolean = false) {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "vector_hbond",
            command: "get_h_bonds",
            commandArgs: [this.parentMolecule.molNo, cid, false]
        }, false)
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

        return this.getGemmiAtomPairsBuffers(selectedGemmiAtomsPairs, [0.7, 0.2, 0.7, 1.0], labelled)
    }

    /**
     * Get representation buffers for the ligand validation representation
     * @param {string} cid - The CID selection for this representation
     * @returns {libcootApi.InstancedMeshJS[]} The representation buffers
     */
    async getLigandValidationBuffers (cid: string) {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_mesh_for_ligand_validation_vs_dictionary",
            commandArgs: [this.parentMolecule.molNo, cid]
        }, false) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
        try {
            const objects = [response.data.result.result]
            return objects
        } catch (err) {
            console.log(err)
        }
    }


    /**
     * Get representation buffers for the chem. feat. representation
     * @param {string} cid - The CID selection for this representation
     * @returns {libcootApi.InstancedMeshJS[]} The representation buffers
     */
    async getCootChemicalFeaturesCidBuffers(cid: string) {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_chemical_features_mesh",
            commandArgs: [this.parentMolecule.molNo, cid]
        }, false) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
        try {
            const objects = [response.data.result.result]
            return objects
        } catch (err) {
            console.log(err)
        }
    }


    /**
     * Get representation buffers for the meta-balls representation
     * @param {string} cid - The CID selection for this representation
     * @returns {libcootApi.SimpleMeshJS[]} The representation buffers
     */
    async getMetaBallBuffers(cid: string) {
        const response = await this.commandCentre.current.cootCommand({
                returnType: "mesh_perm",
                command: "DrawMoorhenMetaBalls",
                commandArgs: [this.parentMolecule.molNo, cid, 0.2, 0.67, 1.8]
        }, false) as moorhen.WorkerResponse<libcootApi.SimpleMeshJS>;
        const objects = [response.data.result.result];
        return objects
    }


    /**
     * Get representation buffers for the rama-balls representation
     * @param {string} cid - The CID selection for this representation
     * @returns {libcootApi.SimpleMeshJS[]} The representation buffers
     */
    async getRamachandranBallBuffers() {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_ramachandran_validation_markup_mesh",
            commandArgs: [this.parentMolecule.molNo]
        }, false) as moorhen.WorkerResponse<libcootApi.SimpleMeshJS>;
        const objects = [response.data.result.result];
        return objects
    }

    /**
     * Get representation buffers for the gaussian surf. representation
     * @param {string} cid - The CID selection for this representation
     * @returns {libcootApi.InstancedMeshJS[]} The representation buffers
     */
    async getCootGaussianSurfaceBuffers(): Promise<libcootApi.InstancedMeshJS[]> {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_gaussian_surface",
            commandArgs: [
                this.parentMolecule.molNo,
                this.parentMolecule.gaussianSurfaceSettings.sigma,
                this.parentMolecule.gaussianSurfaceSettings.countourLevel,
                this.parentMolecule.gaussianSurfaceSettings.boxRadius,
                this.parentMolecule.gaussianSurfaceSettings.gridScale,
                this.parentMolecule.gaussianSurfaceSettings.bFactor
            ]
        }, false) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
        try {
            const objects = [response.data.result.result]
            if (objects.length > 0 && !this.parentMolecule.gemmiStructure.isDeleted()) {
                const flippedNormalsObjects = objects.map(object => {
                    const flippedNormalsObject = { ...object }
                    flippedNormalsObject.idx_tri = object.idx_tri.map(
                        element => element.map(subElement => subElement.reverse())
                    )
                    return flippedNormalsObject
                })
                //Empty existing buffers of this type
                return flippedNormalsObjects
            }
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Get representation buffers for the molecule-wide contact dots representation
     * @returns {libcootApi.InstancedMeshJS[]} The representation buffers
     */
    async getCootContactDotsBuffers() {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "instanced_mesh",
            command: "all_molecule_contact_dots",
            commandArgs: [this.parentMolecule.molNo, this.bondOptions.smoothness]
        }, false) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
        try {
            const objects = [response.data.result.result]
            return objects
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Get representation buffers for the molecule-wide rotamer dodec. representation
     * @returns {libcootApi.InstancedMeshJS[]} The representation buffers
     */
    async getRotamerDodecahedraBuffers() {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "instanced_mesh_perm",
            command: "get_rotamer_dodecs_instanced",
            commandArgs: [this.parentMolecule.molNo]
        }, false) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
        try {
            const objects = [response.data.result.result]
            return objects
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Get representation buffers for the unit cell representation
     * @returns {object[]} The representation buffers
     */
    getUnitCellRepresentationBuffers() {
        const unitCell = this.parentMolecule.gemmiStructure.cell
        const lines = getCubeLines(unitCell)
        unitCell.delete()

        let objects = [
            gemmiAtomPairsToCylindersInfo(lines, 0.1, { unit_cell: [0.7, 0.4, 0.25, 1.0] }, false, 0, 99999, false)
        ]

        return objects
    }

    /**
     * Apply the colour rules associated with this molecule representation
     */
    async applyColourRules() {
        if (!this.styleHasColourRules) {
            return
        }

        if (this.useDefaultColourRules) {
            this.colourRules = this.parentMolecule.defaultColourRules
        }

        await this.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: "delete_colour_rules",
            returnType: 'status',
            commandArgs: [this.parentMolecule.molNo],
        }, false)

        if (this.colourRules?.length > 0) {
            if (this.styleIsCootBondRepresentation || this.styleIsCombinedRepresentation) {
                let colourObjectList: {cid: string; rgba: number[]; applyColourToNonCarbonAtoms: boolean}[] = []
                this.colourRules.forEach(rule => {
                    colourObjectList.push(...rule.getUserDefinedColours())
                })
                await this.commandCentre.current.cootCommand({
                    message: 'coot_command',
                    command: 'shim_set_bond_colours',
                    returnType: 'status',
                    // FIXME: Here we just take applyColourToNonCarbonAtoms from the first colour rule but this needs
                    // to be done in a colour by colour basis.
                    commandArgs: [this.parentMolecule.molNo, colourObjectList, colourObjectList[0].applyColourToNonCarbonAtoms]
                }, false)
            }
            if (!this.styleIsCootBondRepresentation || this.styleIsCombinedRepresentation) {
                for (let colourRuleIndex = 0; colourRuleIndex < this.colourRules.length; colourRuleIndex++) {
                    const colourRule = this.colourRules[colourRuleIndex]
                    await colourRule.apply(this.style, colourRuleIndex)
                }
            }
        }
    }

    /**
     * Export the current representation as a gltf binary file
     * @returns {ArrayBuffer} - The contents of the gltf binary file
     */
    async exportAsGltf(): Promise<ArrayBuffer> {
        await this.applyColourRules()

        let gltfData: ArrayBuffer
        if (this.styleIsCootBondRepresentation || this.styleIsCombinedRepresentation) {
            const bondArgs = this.getBondArgs(this.style)
            const state = this.parentMolecule.store.getState()
            const drawMissingLoops = state.sceneSettings.drawMissingLoops
            const drawHydrogens = false
            const result = await this.commandCentre.current.cootCommand({
                returnType: 'string',
                command: 'shim_export_molecule_as_gltf',
                commandArgs: [ this.parentMolecule.molNo, this.cid, ...bondArgs, drawHydrogens, drawMissingLoops ],
            }, false) as moorhen.WorkerResponse<ArrayBuffer>
            gltfData = result.data.result.result
        } else if (this.styleIsM2tRepresentation || this.styleIsCombinedRepresentation) {
            const { m2tStyle, m2tSelection } = this.getM2tArgs(this.style, this.cid)
            let ssUsageScheme
            if (this.useDefaultM2tParams) {
                ssUsageScheme = this.parentMolecule.defaultM2tParams.ssUsageScheme
            } else {
                ssUsageScheme = this.m2tParams.ssUsageScheme
            }
            const result = await this.commandCentre.current.cootCommand({
                returnType: 'string',
                command: 'shim_export_molecular_representation_as_gltf',
                commandArgs: [ this.parentMolecule.molNo, m2tSelection, "colorRampChainsScheme", m2tStyle, ssUsageScheme ],
            }, false) as moorhen.WorkerResponse<ArrayBuffer>
            gltfData = result.data.result.result
        } else {
            console.warn(`Unable to export molecule representation of style ${this.style} as gltf`)
        }
        return gltfData
    }
}
