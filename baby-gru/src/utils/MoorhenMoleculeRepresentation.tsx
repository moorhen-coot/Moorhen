import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';
import { cidToSpec, gemmiAtomPairsToCylindersInfo, gemmiAtomsToCirclesSpheresInfo, getCubeLines, guid } from './MoorhenUtils';
import { libcootApi } from '../types/libcoot';

// TODO: Add colour rules controls. Set and remove them before getting the representation
// TODO: It might be better to do this.glRef.current.drawScene() in the molecule... 
export class MoorhenMoleculeRepresentation implements moorhen.MoleculeRepresentation {

    uniqueId: string;
    style: string;
    cid: string;
    buffers: moorhen.DisplayObject[];
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>
    parentMolecule: moorhen.Molecule;
    hasAtomBuffers: boolean;
    visible: boolean;

    constructor(style: string, cid: string, commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>) {
        this.uniqueId = guid()
        this.style = style
        this.cid = cid
        this.commandCentre = commandCentre
        this.glRef = glRef
        this.parentMolecule = null
        this.buffers = null
        this.hasAtomBuffers = true
        this.visible = false
    }

    setBuffers(buffers: moorhen.DisplayObject[]) {
        this.buffers = buffers
    }

    setAtomBuffers(atomBuffers: moorhen.AtomInfo[]) {
        if (this.buffers.length > 0) {
            this.buffers[0].atoms = atomBuffers.filter(atom => !this.parentMolecule.excludedCids.includes(`//${atom.chain_id}/${atom.res_no}/*`)).map(atom => {
                const { pos, x, y, z, charge, label, symbol } = atom
                const tempFactor = atom.tempFactor
                return { pos, x, y, z, charge, tempFactor, symbol, label }
            })
        }
    }

    setParentMolecule(molecule: moorhen.Molecule) {
        this.parentMolecule = molecule
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
        const objects = await this.getBufferObjects()
        this.buildBuffers(objects)
        if (this.hasAtomBuffers) {
            let atomBuffers = await this.parentMolecule.gemmiAtomsForCid(this.cid)
            if (atomBuffers.length > 0 && this.buffers.length > 0) {
                this.setAtomBuffers(atomBuffers)
            }    
        }
    }

    async redraw() {
        this.visible = true
        const objects = await this.getBufferObjects()
        this.delete()
        this.buildBuffers(objects)
        if(this.hasAtomBuffers) {
            let atomBuffers = await this.parentMolecule.gemmiAtomsForCid(this.cid)
            if (atomBuffers.length > 0 && this.buffers.length > 0) {
                this.setAtomBuffers(atomBuffers)
            }
        }
    }

    delete() {
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
        this.buffers = []
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
                objects = this.getEnvironmentBuffers(this.cid)
                break
            default:
                if (this.style.startsWith("chemical_features")) {
                    objects = await this.getCootChemicalFeaturesCidBuffers(this.style)
                } else if (this.style.startsWith("contact_dots")) {
                    objects = await this.getCootContactDotsCidBuffers(this.style)
                }
        }
        return objects
    }

    async getEnvironmentBuffers(cid: string, labelled: boolean = false) {
        const resSpec = cidToSpec(cid)
        const response = await this.commandCentre.current.cootCommand({
            returnType: "generic_3d_lines_bonds_box",
            command: "make_exportable_environment_bond_box",
            commandArgs: [this.parentMolecule.molNo, resSpec.chain_id, resSpec.res_no, resSpec.alt_conf]
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
            m2tSelection = `{${m2tSelection} & {${cidSelection}}}`
        }

        if (this.parentMolecule.excludedCids.length > 0) {
            m2tSelection = `{${m2tSelection} & !{${this.parentMolecule.excludedCids.join(' | ')}}}`
        }

        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_molecular_representation_mesh",
            commandArgs: [
                this.parentMolecule.molNo, m2tSelection, "colorRampChainsScheme", m2tStyle
            ]
        }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>

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
        } else if (name === "ligands" && (typeof cid !== 'string' || cid === '/*/*/*/*')) {
            this.cid =  "/*/*/(!ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR,WAT,HOH,THP,SEP,TPO,TYP,PTR,OH2,H2O)"
            cid = this.cid
        }

        if (typeof cid !== 'string' || cid === '/*/*/*/*') {
            meshCommand = this.commandCentre.current.cootCommand({
                returnType: returnType,
                command: "get_bonds_mesh_instanced",
                commandArgs: [
                    this.parentMolecule.molNo,
                    style,
                    this.parentMolecule.cootBondsOptions.isDarkBackground,
                    this.parentMolecule.cootBondsOptions.width,
                    this.parentMolecule.cootBondsOptions.atomRadiusBondRatio,
                    this.parentMolecule.cootBondsOptions.smoothness
                ]
            })
        } else {
            meshCommand = this.commandCentre.current.cootCommand({
                returnType: returnType,
                command: "get_bonds_mesh_for_selection_instanced",
                commandArgs: [
                    this.parentMolecule.molNo,
                    cid,
                    style,
                    this.parentMolecule.cootBondsOptions.isDarkBackground,
                    this.parentMolecule.cootBondsOptions.width * 1.5,
                    this.parentMolecule.cootBondsOptions.atomRadiusBondRatio * 1.5,
                    this.parentMolecule.cootBondsOptions.smoothness
                ]
            })
        }

        const response = await meshCommand
        return [response.data.result.result]
    }

    drawSymmetry() {
        if (this.parentMolecule.symmetryMatrices && this.buffers) {
            this.buffers.forEach((displayObject: moorhen.DisplayObject) => {
                displayObject.symmetryMatrices = this.parentMolecule.symmetryMatrices
            })
            this.glRef.current.drawScene()
        } else {
            console.log('Cannot draw symmetry: parent molecule has no sym. matrix...')
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

    async getCootContactDotsCidBuffers(style: string) {
        const cid = style.substr("contact_dots-".length)
        try {
            const response = await this.commandCentre.current.cootCommand({
                returnType: "instanced_mesh",
                command: "contact_dots_for_ligand",
                commandArgs: [this.parentMolecule.molNo, cid, this.parentMolecule.cootBondsOptions.smoothness]
            }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>;
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

    async getHBondBuffers(oneCid: string, labelled: boolean = false) {
        const response = await this.commandCentre.current.cootCommand({
            returnType: "vector_hbond",
            command: "get_h_bonds",
            commandArgs: [this.parentMolecule.molNo, oneCid, false]
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

        return this.getGemmiAtomPairsBuffers(selectedGemmiAtomsPairs, [0.7, 0.2, 0.7, 1.0], labelled)
    }

    async getCootChemicalFeaturesCidBuffers(style: string) {
        const cid = style.substr("chemical_features-".length)
        const response = await this.commandCentre.current.cootCommand({
            returnType: "mesh",
            command: "get_chemical_features_mesh",
            commandArgs: [this.parentMolecule.molNo, cid]
        }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
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
        }) as moorhen.WorkerResponse<libcootApi.SimpleMeshJS>;
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
        }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
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
            commandArgs: [this.parentMolecule.molNo, this.parentMolecule.cootBondsOptions.smoothness]
        }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
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
        }) as moorhen.WorkerResponse<libcootApi.InstancedMeshJS>
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

}