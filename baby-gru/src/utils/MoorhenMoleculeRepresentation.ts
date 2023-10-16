import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';
import { cidToSpec, gemmiAtomPairsToCylindersInfo, gemmiAtomsToCirclesSpheresInfo, getCubeLines, guid, countResiduesInSelection, copyStructureSelection } from './MoorhenUtils';
import { libcootApi } from '../types/libcoot';
import { hexToRgb } from '@mui/material';

// TODO: It might be better to do this.glRef.current.drawScene() in the molecule... 
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
    visible: boolean;
    colourRules: moorhen.ColourRule[];
    isCustom: boolean;
    useDefaultBondOptions: boolean;
    useDefaultColourRules: boolean;
    applyColourToNonCarbonAtoms: boolean;
    bondOptions: moorhen.cootBondOptions;

    constructor(style: moorhen.RepresentationStyles, cid: string, commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>) {
        this.uniqueId = guid()
        this.style = style
        this.cid = cid
        this.commandCentre = commandCentre
        this.glRef = glRef
        this.parentMolecule = null
        this.buffers = null
        this.visible = false
        this.colourRules = null
        this.isCustom = false
        this.useDefaultColourRules = true
        this.useDefaultBondOptions = true
        this.applyColourToNonCarbonAtoms = false
        this.bondOptions = {
            smoothness: 1,
            width: 0.1,
            atomRadiusBondRatio: 1
        }
        this.styleHasAtomBuffers = ![
            'contact_dots', 'ligand_validation', 'chemical_features', 'unitCell', 'MolecularSurface', 'VdWSurface', 
            'gaussian', 'allHBonds', 'rotamer', 'rama', 'environment', 'ligand_environment', 'hover', 'CDs', 'restraints'
        ].includes(style)
        this.styleHasSymmetry = ![
            'hover', 'unitCell', 'originNeighbours', 'selection', 'transformation', 'contact_dots', 
            'chemical_features', 'VdWSurface', 'restraints'
        ].includes(style)
        this.styleHasColourRules = ![
            'allHBonds', 'rama', 'rotamer', 'unitCell', 'hover', 'environment', 'ligand_environment',
            'contact_dots', 'chemical_features', 'ligand_validation', 'restraints'
        ].includes(style)
        if (style === "ligands" && (typeof cid !== 'string' || cid === '/*/*/*/*')) {
            this.cid =  "/*/*/(!ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR,WAT,HOH,THP,SEP,TPO,TYP,PTR,OH2,H2O)"
        }
    }

    setApplyColourToNonCarbonAtoms(newVal: boolean) {
        if (newVal) {
            this.applyColourToNonCarbonAtoms = newVal
        } else {
            this.applyColourToNonCarbonAtoms = false
        }
    }

    setBondOptions(bondOptions: moorhen.cootBondOptions) {
        if (bondOptions) {
            this.useDefaultBondOptions = false
            this.bondOptions = bondOptions
        } else {
            this.useDefaultBondOptions = true
        }
    }

    setStyle(style: moorhen.RepresentationStyles) {
        this.style = style
        this.styleHasAtomBuffers = ![
            'contact_dots', 'ligand_validation', 'chemical_features', 'unitCell', 'MolecularSurface', 'VdWSurface', 
            'gaussian', 'allHBonds', 'rotamer', 'rama', 'environment', 'ligand_environment', 'hover', 'CDs'
        ].includes(style)
        this.styleHasSymmetry = ![
            'hover', 'unitCell', 'originNeighbours', 'selection', 'transformation', 'contact_dots', 'chemical_features', 'VdWSurface'
        ].includes(style)
        this.styleHasColourRules = ![
            'allHBonds', 'rama', 'rotamer', 'unitCell', 'hover', 'environment', 'ligand_environment',
            'contact_dots', 'chemical_features', 'ligand_validation'
        ].includes(style)
        if (style === "ligands" && (typeof this.cid !== 'string' || this.cid === '/*/*/*/*')) {
            this.cid =  "/*/*/(!ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR,WAT,HOH,THP,SEP,TPO,TYP,PTR,OH2,H2O)"
        }
    }

    setUseDefaultColourRules(newVal: boolean) {
        this.useDefaultColourRules = newVal
    }

    setColourRules(colourRules: moorhen.ColourRule[]) {
        if (colourRules && colourRules.length > 0) {
            this.colourRules = colourRules
            this.useDefaultColourRules = false
        } else {
            this.useDefaultColourRules = true
        }
    }

    setBuffers(buffers: moorhen.DisplayObject[]) {
        this.buffers = buffers
    }

    setAtomBuffers(atomBuffers: moorhen.AtomInfo[]) {
        if (atomBuffers.length > 0 && this.buffers.length > 0) {
            this.buffers[0].atoms = atomBuffers
        }
    }

    setParentMolecule(molecule: moorhen.Molecule) {
        this.parentMolecule = molecule
        this.colourRules = this.parentMolecule.defaultColourRules
        this.bondOptions = this.parentMolecule.defaultBondOptions
    }

    async buildBuffers(objects: moorhen.DisplayObject[]) {
        if (objects.length > 0 && !this.parentMolecule.gemmiStructure.isDeleted()) {
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

    async draw() {
        this.visible = true
        await this.applyColourRules()
        const objects = await this.getBufferObjects()
        this.buildBuffers(objects)
        if (this.styleHasAtomBuffers) {
            let atomBuffers = await this.parentMolecule.gemmiAtomsForCid(this.cid, true)
            this.setAtomBuffers(atomBuffers)
        }
    }

    async redraw() {
        this.visible = true
        await this.applyColourRules()
        const objects = await this.getBufferObjects()
        this.deleteBuffers()
        this.buildBuffers(objects)
        if (this.styleHasAtomBuffers) {
            let atomBuffers = await this.parentMolecule.gemmiAtomsForCid(this.cid, true)
            this.setAtomBuffers(atomBuffers)
        }
    }

    deleteBuffers() {
        if (this.buffers?.length > 0) {
            this.buffers.forEach(buffer => {
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
            this.glRef.current.drawScene()
            this.buffers = []   
        }
    }

    show() {
        try {
            this.visible = true
            if (this.buffers && this.buffers.length > 0) {
                this.buffers.forEach(buffer => buffer.visible = true)
                this.glRef.current.drawScene()
            } else {
                this.draw()
            }
        } catch (err) {
            console.log(err)
        }
    }

    hide() {
        try {
            this.visible = false
            this.buffers.forEach(buffer => buffer.visible = false)
            this.glRef.current.drawScene()
        } catch (err) {
            console.log(err)
        }
    }

    async getBufferObjects() {
        let objects
        switch (this.style) {
            case 'VdwSpheres':
            case 'ligands':
            case 'CAs':
            case 'CBs':
                objects = await this.getCootSelectionBondBuffers(this.style, this.cid)
                break
            case 'CDs':
                objects = await this.getCootContactDotsBuffers()
                break;
            case 'gaussian':
                objects = await this.getCootGaussianSurfaceBuffers()
                break;
            case 'allHBonds':
                objects = await this.getHBondBuffers(this.cid)
                break;
            case 'rama':
                objects = await this.getRamachandranBallBuffers()
                break;
            case 'rotamer':
                objects = await this.getRotamerDodecahedraBuffers()
                break;
            case 'glycoBlocks':
                objects = await this.getGlycoBlockBuffers(this.cid)
                break;
            case 'CRs':
            case 'MolecularSurface':
            case 'DishyBases':
            case 'VdWSurface':
            case 'Calpha':
                objects = await this.getCootRepresentationBuffers(this.style, this.cid)
                break
            case 'unitCell':
                objects = this.getUnitCellRepresentationBuffers()
                break
            case 'hover':
                objects = this.getResidueHighlightBuffers(this.cid, [1.0, 0.5, 0.0, 0.35])
                break
            case 'environment':
            case 'ligand_environment':
                objects = this.getEnvironmentBuffers(this.cid)
                break
            case 'contact_dots':
                objects = await this.getCootContactDotsCidBuffers(this.style, this.cid)
                break
            case 'chemical_features':
                objects = await this.getCootChemicalFeaturesCidBuffers(this.style, this.cid)    
                break
            case 'ligand_validation':
                objects = await this.getLigandValidationBuffers(this.style, this.cid)
                break
            case 'restraints':
                objects = await this.getRestraintsMeshBuffers()
                break
            default:
                console.log(`Unrecognised style ${this.style}...`)
                break
        }
        return objects
    }

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

    async getEnvironmentBuffers(cid: string, labelled: boolean = true) {
        const resSpec = cidToSpec(cid)
        const response = await this.commandCentre.current.cootCommand({
            returnType: "generic_3d_lines_bonds_box",
            command: "make_exportable_environment_bond_box",
            commandArgs: [this.parentMolecule.molNo, resSpec.chain_id, resSpec.res_no, resSpec.alt_conf]
        }, false)
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

    async getCootRepresentationBuffers(style: string, cidSelection?: string): Promise<libcootApi.InstancedMeshJS[]> {
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

        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_molecular_representation_mesh",
            commandArgs: [
                this.parentMolecule.molNo, m2tSelection, "colorRampChainsScheme", m2tStyle
            ]
        }, false) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>

        return [response.data.result.result]
    }

    async getCootSelectionBondBuffers(name: string, cid: null | string): Promise<libcootApi.InstancedMeshJS[]> {
        let meshCommand: Promise<moorhen.WorkerResponse<libcootApi.InstancedMeshJS>>
        let style = "COLOUR-BY-CHAIN-AND-DICTIONARY"
        let returnType = "instanced_mesh"
        if (name === "VdwSpheres") {
            style = "VDW-BALLS"
            returnType = "instanced_mesh_perfect_spheres"
        } else if (name === "CAs") {
            style = "CA+LIGANDS"
        }

        let bondSettings: [boolean, number, number, number]
        if (this.useDefaultBondOptions) {
            bondSettings = [
                this.parentMolecule.isDarkBackground,
                name === 'ligands' ? this.parentMolecule.defaultBondOptions.width * 1.5 : this.parentMolecule.defaultBondOptions.width,
                name === 'ligands' ? this.parentMolecule.defaultBondOptions.atomRadiusBondRatio * 1.5 : this.parentMolecule.defaultBondOptions.atomRadiusBondRatio,
                this.parentMolecule.defaultBondOptions.smoothness
            ]
        } else {
            bondSettings = [
                this.parentMolecule.isDarkBackground,
                name === 'ligands' ? this.bondOptions.width * 1.5 : this.bondOptions.width,
                name === 'ligands' ? this.bondOptions.atomRadiusBondRatio * 1.5 : this.bondOptions.atomRadiusBondRatio,
                this.bondOptions.smoothness
            ]
        }

        if (typeof cid !== 'string' || cid === '/*/*/*/*') {
            meshCommand = this.commandCentre.current.cootCommand({
                returnType: returnType,
                command: "get_bonds_mesh_instanced",
                commandArgs: [
                    this.parentMolecule.molNo,
                    style,
                    ...bondSettings
                ]
            }, false)
        } else {
            meshCommand = this.commandCentre.current.cootCommand({
                returnType: returnType,
                command: "get_bonds_mesh_for_selection_instanced",
                commandArgs: [
                    this.parentMolecule.molNo,
                    cid,
                    style,
                    ...bondSettings
                ]
            }, false)
        }

        const response = await meshCommand
        return [response.data.result.result]
    }

    drawSymmetry() {
        if (this.parentMolecule.symmetryMatrices && this.buffers && this.styleHasSymmetry) {
            this.buffers.forEach((displayObject: moorhen.DisplayObject) => {
                displayObject.symmetryMatrices = this.parentMolecule.symmetryMatrices
            })
            this.glRef.current.drawScene()
        }
    }

    async getResidueHighlightBuffers(selectionString: string, colour: number[]) {
        if (typeof selectionString === 'string') {
            const resSpec: moorhen.ResidueSpec = cidToSpec(selectionString)
            let modifiedSelection = `/*/${resSpec.chain_id}/${resSpec.res_no}-${resSpec.res_no}/*${resSpec.alt_conf === "" ? "" : ":"}${resSpec.alt_conf}`
            if (this.parentMolecule.sequences.length === 0) {
                modifiedSelection = `/*/${resSpec.chain_id}/${resSpec.res_no}-${resSpec.res_no}/${resSpec.atom_name}${resSpec.alt_conf === "" ? "" : ":"}${resSpec.alt_conf}`
            }
            const selectedGemmiAtoms = await this.parentMolecule.gemmiAtomsForCid(modifiedSelection)
            const atomColours = {}
            selectedGemmiAtoms.forEach(atom => { atomColours[`${atom.serial}`] = colour })
            let sphere_size = 0.3
            let click_tol = 0.65
            if (this.parentMolecule.representations.some(item => item.style === 'VdwSpheres' && item.visible)) {
                sphere_size = 1.8
                click_tol = 3.7
            }
            let objects = [
                gemmiAtomsToCirclesSpheresInfo(selectedGemmiAtoms, sphere_size, "PERFECT_SPHERES", atomColours)
            ]
            objects.forEach(object => {
                object["clickTol"] = click_tol
                object["doStencil"] = true
            })
            return objects
        }
    }

    async getCootContactDotsCidBuffers(style: string, cid: string) {
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

    getGemmiAtomPairsBuffers(gemmiAtomPairs: [moorhen.AtomInfo, moorhen.AtomInfo][], colour: number[], labelled: boolean = false): libcootApi.InstancedMeshJS[] {
        const atomColours = {}
        gemmiAtomPairs.forEach(atom => { atomColours[`${atom[0].serial}`] = colour; atomColours[`${atom[1].serial}`] = colour })
        let objects = [
            gemmiAtomPairsToCylindersInfo(gemmiAtomPairs, 0.07, atomColours, labelled)
        ]
        return objects
    }

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

    async getLigandValidationBuffers (style: string, cid: string) {
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

    async getCootChemicalFeaturesCidBuffers(style: string, cid: string) {
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

    async getRamachandranBallBuffers() {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_ramachandran_validation_markup_mesh",
            commandArgs: [this.parentMolecule.molNo]
        }, false) as moorhen.WorkerResponse<libcootApi.SimpleMeshJS>;
        const objects = [response.data.result.result];
        return objects
    }

    async getCootGaussianSurfaceBuffers(): Promise<libcootApi.InstancedMeshJS[]> {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_gaussian_surface",
            commandArgs: [
                this.parentMolecule.molNo, this.parentMolecule.gaussianSurfaceSettings.sigma,
                this.parentMolecule.gaussianSurfaceSettings.countourLevel,
                this.parentMolecule.gaussianSurfaceSettings.boxRadius,
                this.parentMolecule.gaussianSurfaceSettings.gridScale
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

    getUnitCellRepresentationBuffers() {
        const unitCell = this.parentMolecule.gemmiStructure.cell
        const lines = getCubeLines(unitCell)
        unitCell.delete()

        let objects = [
            gemmiAtomPairsToCylindersInfo(lines, 0.1, { unit_cell: [0.7, 0.4, 0.25, 1.0] }, false, 0, 99999, false) 
        ]

        return objects
    }

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
            if (['CBs', 'VdwSpheres', 'ligands', 'CAs'].includes(this.style)) {
                let colourObjectList: {cid: string, rgb: number[]}[] = []
                this.colourRules.forEach(rule => {
                    if(rule.isMultiColourRule) {
                        const allColours = rule.args[0] as string
                        allColours.split('|').forEach(colour => {
                            const [cid, hex] = colour.split('^')
                            const [r, g, b] = hexToRgb(hex).replace('rgb(', '').replace(')', '').split(', ').map(item => parseFloat(item))
                            colourObjectList.push({ cid: cid, rgb: [r / 255, g / 255, b / 255] })
                        })
                    } else {
                        const [r, g, b] = hexToRgb(rule.color).replace('rgb(', '').replace(')', '').split(', ').map(item => parseFloat(item))
                        colourObjectList.push({ cid: rule.label, rgb: [r / 255, g / 255, b / 255] })
                    }
                })
                await this.commandCentre.current.cootCommand({
                    message: 'coot_command',
                    command: 'shim_set_bond_colours',
                    returnType: 'status',
                    commandArgs: [this.parentMolecule.molNo, colourObjectList, this.applyColourToNonCarbonAtoms]
                }, false)
            } else {
                await Promise.all(
                    this.colourRules.map(rule => {
                        return this.commandCentre.current.cootCommand({
                            message: 'coot_command',
                            command: rule.isMultiColourRule ? 'add_colour_rules_multi' : 'add_colour_rule',
                            returnType: 'status',
                            commandArgs: [this.parentMolecule.molNo, ...rule.args]
                        }, false)
                    })
                )
            }
        }
    }
}
