import 'pako';
import { EnerLib, Model, parseMMCIF, parsePDB, atomsToHierarchy } from '../WebGLgComponents/mgMiniMol';
import { CalcSecStructure } from '../WebGLgComponents/mgSecStr';
import { ColourScheme } from '../WebGLgComponents/mgWebGLAtomsToPrimitives';
import { GetSplinesColoured } from '../WebGLgComponents/mgSecStr';
import { atomsToSpheresInfo } from '../WebGLgComponents/mgWebGLAtomsToPrimitives';
import { contactsToCylindersInfo, contactsToLinesInfo } from '../WebGLgComponents/mgWebGLAtomsToPrimitives';
import { singletonsToLinesInfo } from '../WebGLgComponents/mgWebGLAtomsToPrimitives';
import { readTextFile, readGemmiStructure, cidToSpec, residueCodesThreeToOne, centreOnGemmiAtoms, getBufferAtoms, nucleotideCodesThreeToOne, hexToHsl } from './MoorhenUtils'
import { quatToMat4 } from '../WebGLgComponents/quatToMat4.js';
import { isDarkBackground } from '../WebGLgComponents/mgWebGL'
import * as vec3 from 'gl-matrix/vec3';
import * as mat3 from 'gl-matrix/mat3';
import * as quat4 from 'gl-matrix/quat';

export function MoorhenMolecule(commandCentre, monomerLibraryPath) {
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
    this.connectedToMaps = null
    this.excludedSegments = []
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
        rama: [],
        rotamer: [],
        CDs: [],
        hover: [],
        selection: [],
        transformation: { origin: [0, 0, 0], quat: null, centre: [0, 0, 0] }
    }
    this.monomerLibraryPath = (typeof monomerLibraryPath === 'undefined' ? "./baby-gru/monomers" : monomerLibraryPath)
};

MoorhenMolecule.prototype.setBackgroundColour = function (backgroundColour) {
    this.cootBondsOptions.isDarkBackground = isDarkBackground(...backgroundColour)
}

MoorhenMolecule.prototype.updateGemmiStructure = async function () {
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

MoorhenMolecule.prototype.parseSequences = function () {
    if (this.gemmiStructure === null) {
        return
    }

    let sequences = []
    const structure = this.gemmiStructure.clone()
    try {
        const models = structure.models
        const modelsSize = models.size()
        for (let modelIndex = 0; modelIndex < modelsSize; modelIndex++) {
            const model = models.get(modelIndex)
            const chains = model.chains
            const chainsSize = chains.size()
            for (let chainIndex = 0; chainIndex < chainsSize; chainIndex++) {
                let currentSequence = []
                const chain = chains.get(chainIndex)
                window.CCP4Module.remove_ligands_and_waters_chain(chain)
                const residues = chain.residues
                const chainName = chain.name
                const polymerConst = chain.get_polymer_const()
                const polymerType = window.CCP4Module.check_polymer_type(polymerConst)
                const polymerTypeValue = polymerType.value
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

MoorhenMolecule.prototype.delete = async function (glRef) {
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

MoorhenMolecule.prototype.copyMolecule = async function (glRef) {

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

    await newMolecule.fetchIfDirtyAndDraw('CBs', glRef)
    return newMolecule
}

MoorhenMolecule.prototype.copyFragment = async function (chainId, res_no_start, res_no_end, glRef, doRecentre) {
    if (typeof doRecentre === 'undefined') {
        doRecentre = true
    }
    const $this = this
    const inputData = { message: "copy_fragment", molNo: $this.molNo, chainId: chainId, res_no_start: res_no_start, res_no_end: res_no_end }
    const response = await $this.commandCentre.current.postMessage(inputData)
    const newMolecule = new MoorhenMolecule($this.commandCentre, $this.monomerLibraryPath)
    newMolecule.name = `${$this.name} fragment`
    newMolecule.molNo = response.data.result
    newMolecule.cootBondsOptions = $this.cootBondsOptions
    await newMolecule.fetchIfDirtyAndDraw('CBs', glRef)
    if (doRecentre) await newMolecule.centreOn(glRef)

    return newMolecule
}

MoorhenMolecule.prototype.copyFragmentUsingCid = async function (cid, backgroundColor, defaultBondSmoothness, glRef, doRecentre) {
    if (typeof doRecentre === 'undefined') {
        doRecentre = true
    }
    const $this = this
    return $this.commandCentre.current.cootCommand({
        returnType: "status",
        command: "copy_fragment_using_cid",
        commandArgs: [$this.molNo, cid],
        changesMolecules: [$this.molNo]
    }, true).then(async response => {
        const newMolecule = new MoorhenMolecule($this.commandCentre, $this.monomerLibraryPath)
        newMolecule.name = `${$this.name} fragment`
        newMolecule.molNo = response.data.result.result
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.cootBondsOptions.smoothness = defaultBondSmoothness
        return Promise.resolve(newMolecule)
    })
}

MoorhenMolecule.prototype.loadToCootFromURL = function (url, molName) {
    const $this = this
    return fetch(url)
        .then(response => {
            if (response.ok) {
                return response.text()
            } else {
                return Promise.reject(`Error fetching data from url ${url}`)
            }
        })
        .then(coordData => $this.loadToCootFromString(coordData, molName))
        .catch(err => Promise.reject(err))
}

MoorhenMolecule.prototype.loadToCootFromFile = function (source) {
    const $this = this
    return readTextFile(source)
        .then(coordData => $this.loadToCootFromString(coordData, source.name))
        .catch(err => Promise.reject(err))
}

MoorhenMolecule.prototype.loadToCootFromString = async function (coordData, name) {
    const $this = this
    const pdbRegex = /.pdb$/;
    const entRegex = /.ent$/;

    if ($this.gemmiStructure && !$this.gemmiStructure.isDeleted()) {
        $this.gemmiStructure.delete()
    }

    $this.name = name.replace(pdbRegex, "").replace(entRegex, "");
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

MoorhenMolecule.prototype.loadMissingMonomer = async function (newTlc, attachToMolecule) {
    const $this = this
    return fetch(`${$this.monomerLibraryPath}/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`)
        .then(response => { return response.text() })
        .then(fileContent => {
            if (!fileContent.includes('data_')) {
                return fetch(`https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/${newTlc.toUpperCase()}.cif`)
                    .then(response => { return response.text() })
            }
            else return Promise.resolve(fileContent)
        })
        .then(fileContent => $this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'shim_read_dictionary',
            commandArgs: [fileContent, attachToMolecule],
            changesMolecules: []
        }, true))
}


MoorhenMolecule.prototype.loadMissingMonomers = async function () {
    const $this = this
    return $this.commandCentre.current.cootCommand({
        returnType: "string_array",
        command: 'get_residue_names_with_no_dictionary',
        commandArgs: [$this.molNo],
    }, false).then(async response => {
        if (response.data.result.status === 'Completed') {
            let monomerPromises = []
            response.data.result.result.forEach(newTlc => {
                const newPromise = $this.loadMissingMonomer(newTlc, -999999)
                monomerPromises.push(newPromise)
            })
            await Promise.all(monomerPromises)
        }
        return Promise.resolve($this)
    }).catch(err => {
        console.log('Error in loadMissingMonomers', err);
        return Promise.reject(err)
    })
}

MoorhenMolecule.prototype.setAtomsDirty = function (state) {
    this.atomsDirty = state
}

MoorhenMolecule.prototype.getAtoms = function () {
    const $this = this;
    return $this.commandCentre.current.postMessage({
        message: "get_atoms",
        molNo: $this.molNo
    })
}

MoorhenMolecule.prototype.updateAtoms = async function () {
    const $this = this;
    if ($this.gemmiStructure && !$this.gemmiStructure.isDeleted()) {
        $this.gemmiStructure.delete()
    }
    return $this.getAtoms().then((result) => {
        return new Promise((resolve, reject) => {
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

MoorhenMolecule.prototype.fetchIfDirtyAndDraw = async function (style, glRef) {
    const $this = this
    let promise
    if ($this.atomsDirty) {
        promise = this.updateAtoms()
    }
    else {
        promise = Promise.resolve()
    }
    return promise.then(_ => {
        return $this.drawWithStyleFromAtoms(style, glRef)
    })
}

MoorhenMolecule.prototype.centreAndAlignViewOn = function (glRef, selectionCid, animate = true) {

    let promise
    if (this.atomsDirty) {
        promise = this.updateAtoms()
    }
    else {
        promise = Promise.resolve()
    }

    return promise.then(async () => {

        let selectionAtomsAlign = []
        let selectionAtomsCentre = []
        if (selectionCid) {
            selectionAtomsAlign = await this.gemmiAtomsForCid(selectionCid + "*")
            selectionAtomsCentre = await this.gemmiAtomsForCid(selectionCid + "CA")

        } else {
            selectionAtomsAlign = await this.gemmiAtomsForCid('/*/*/*/*')
            selectionAtomsCentre = await this.gemmiAtomsForCid('/*/*/*/*')
        }

        let CA = null
        let C = null
        let O = null

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
        return new Promise((resolve, reject) => {
            if (newQuat) {
                glRef.current.setOriginOrientationAndZoomAnimated(selectionCentre, newQuat, 0.20);
            }
            resolve(true);
        })
    })

}

MoorhenMolecule.prototype.centreOn = function (glRef, selectionCid, animate = true) {

    let promise
    if (this.atomsDirty) {
        promise = this.updateAtoms()
    }
    else {
        promise = Promise.resolve()
    }

    return promise.then(async () => {

        let selectionAtomsAlign = []
        let selectionAtomsCentre = []
        if (selectionCid) {
            selectionAtomsAlign = await this.gemmiAtomsForCid(selectionCid + "*")
            selectionAtomsCentre = await this.gemmiAtomsForCid(selectionCid + "CA")

        } else {
            selectionAtomsAlign = await this.gemmiAtomsForCid('/*/*/*/*')
            selectionAtomsCentre = await this.gemmiAtomsForCid('/*/*/*/*')
        }

        let CA = null
        let C = null
        let O = null

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
        return new Promise((resolve, reject) => {
            if (newQuat) {
                glRef.current.setOriginOrientationAndZoomAnimated(selectionCentre, newQuat, 0.20);
            }
            resolve(true);
        })
    })

}

MoorhenMolecule.prototype.centreOn = function (glRef, selectionCid, animate = true) {
    //Note add selection to permit centringh on subset
    let promise
    if (this.atomsDirty) {
        promise = this.updateAtoms()
    }
    else {
        promise = Promise.resolve()
    }

    return promise.then(async () => {

        let selectionAtoms = []
        if (selectionCid) {
            selectionAtoms = await this.gemmiAtomsForCid(selectionCid)

        } else {
            selectionAtoms = await this.gemmiAtomsForCid('/*/*/*/*')
        }

        let selectionCentre = centreOnGemmiAtoms(selectionAtoms)

        return new Promise((resolve, reject) => {
            if (animate) {
                glRef.current.setOriginAnimated(selectionCentre);
            } else {
                glRef.current.setOrigin(selectionCentre);
            }
            resolve(true);
        })
    })
}


MoorhenMolecule.prototype.drawWithStyleFromAtoms = async function (style, glRef) {

    switch (style) {
        case 'rama':
            this.drawRamachandranBalls(glRef)
            break;
        case 'rotamer':
            this.drawRotamerDodecahedra(glRef)
            break;
        case 'CBs':
            await this.drawCootBonds(glRef)
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

MoorhenMolecule.prototype.addBuffersOfStyle = function (glRef, objects, style) {
    const $this = this
    objects.forEach(object => {
        var a = glRef.current.appendOtherData(object, true);
        $this.displayObjects[style] = $this.displayObjects[style].concat(a)
    })
    glRef.current.buildBuffers();
    glRef.current.drawScene();
}

MoorhenMolecule.prototype.drawRamachandranBalls = function (glRef) {
    const $this = this
    const style = "rama"
    return this.commandCentre.current.cootCommand({
        returnType: "mesh",
        command: "get_ramachandran_validation_markup_mesh",
        commandArgs: [$this.molNo]
    }).then(response => {
        const objects = [response.data.result.result]
        //Empty existing buffers of this type
        this.clearBuffersOfStyle(style, glRef)
        this.addBuffersOfStyle(glRef, objects, style)
    })
}

MoorhenMolecule.prototype.drawCootContactDotsCid = function (glRef, style) {
    const $this = this
    const cid = style.substr("contact_dots-".length)

    return this.commandCentre.current.cootCommand({
        returnType: "instanced_mesh",
        command: "contact_dots_for_ligand",
        commandArgs: [$this.molNo, cid, $this.cootBondsOptions.smoothness]
    }).then(response => {
        const objects = [response.data.result.result]
        //Empty existing buffers of this type
        this.clearBuffersOfStyle(style, glRef)
        this.addBuffersOfStyle(glRef, objects, style)
    })
}

MoorhenMolecule.prototype.drawCootChemicalFeaturesCid = function (glRef, style) {
    const $this = this
    const cid = style.substr("chemical_features-".length)

    return this.commandCentre.current.cootCommand({
        returnType: "mesh",
        command: "get_chemical_features_mesh",
        commandArgs: [$this.molNo, cid]
    }).then(response => {
        const objects = [response.data.result.result]
        //Empty existing buffers of this type
        this.clearBuffersOfStyle(style, glRef)
        this.addBuffersOfStyle(glRef, objects, style)
    })
}

MoorhenMolecule.prototype.drawCootContactDots = function (glRef) {

    const $this = this
    const style = "CDs"

    return this.commandCentre.current.cootCommand({
        returnType: "instanced_mesh",
        command: "all_molecule_contact_dots",
        commandArgs: [$this.molNo, $this.cootBondsOptions.smoothness]
    }).then(response => {
        const objects = [response.data.result.result]
        //Empty existing buffers of this type
        this.clearBuffersOfStyle(style, glRef)
        this.addBuffersOfStyle(glRef, objects, style)
    })
}

MoorhenMolecule.prototype.drawRotamerDodecahedra = function (glRef) {
    const $this = this
    const style = "rotamer"
    return this.commandCentre.current.cootCommand({
        returnType: "instanced_mesh_perm",
        command: "get_rotamer_dodecs_instanced",
        commandArgs: [$this.molNo]
    }).then(response => {
        const objects = [response.data.result.result]
        //Empty existing buffers of this type
        this.clearBuffersOfStyle(style, glRef)
        this.addBuffersOfStyle(glRef, objects, style)
    })
}

MoorhenMolecule.prototype.drawCootLigands = async function (glRef) {
    const $this = this
    const name = "ligands"
    const ligandsCID = "/*/*/(!ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR,WAT,HOH,THP,SEP,TPO,TYP,PTR,OH2,H2O)"
    return $this.drawCootSelectionBonds(glRef, name, ligandsCID)
}

MoorhenMolecule.prototype.drawCootBonds = async function (glRef) {
    const $this = this
    const name = "CBs"
    return $this.drawCootSelectionBonds(glRef, name, false)
}

MoorhenMolecule.prototype.drawCootSelectionBonds = async function (glRef, name, cid) {
    const $this = this
    let meshCommand

    if (cid) {
        meshCommand = $this.commandCentre.current.cootCommand({
            returnType: "instanced_mesh",
            command: "get_bonds_mesh_for_selection_instanced",
            commandArgs: [
                $this.molNo,
                cid,
                "COLOUR-BY-CHAIN-AND-DICTIONARY",
                $this.cootBondsOptions.isDarkBackground,
                $this.cootBondsOptions.width * 1.5,
                $this.cootBondsOptions.atomRadiusBondRatio * 1.5,
                $this.cootBondsOptions.smoothness
            ]
        })
    }

    else {
        cid = "/*/*/*/*"
        meshCommand = $this.commandCentre.current.cootCommand({
            returnType: "instanced_mesh",
            //command: "get_bonds_mesh_for_selection_instanced",
            command: "get_bonds_mesh_instanced",
            commandArgs: [
                $this.molNo,
                //cid,
                "COLOUR-BY-CHAIN-AND-DICTIONARY",
                $this.cootBondsOptions.isDarkBackground,
                $this.cootBondsOptions.width,
                $this.cootBondsOptions.atomRadiusBondRatio,
                $this.cootBondsOptions.smoothness
            ]
        })
    }

    return meshCommand
        .then(async response => {
            const objects = [response.data.result.result]
            if (objects.length > 0 && !this.gemmiStructure.isDeleted()) {
                //Empty existing buffers of this type
                this.clearBuffersOfStyle(name, glRef)
                this.addBuffersOfStyle(glRef, objects, name)
                let bufferAtoms = await this.gemmiAtomsForCid(cid)
                if (bufferAtoms.length > 0) {
                    this.displayObjects[name][0].atoms = bufferAtoms.map(atom => {
                        const { pos, x, y, z, charge, label, symbol } = atom
                        const tempFactor = atom.b_iso
                        return { pos, x, y, z, charge, tempFactor, symbol, label }
                    })
                }
            }
            else {
                this.clearBuffersOfStyle(name, glRef)
            }
            return Promise.resolve(true)
        })
}

MoorhenMolecule.prototype.drawCootGaussianSurface = async function (glRef) {
    const $this = this
    const style = "gaussian"
    return this.commandCentre.current.cootCommand({
        returnType: "mesh",
        command: "get_gaussian_surface",
        commandArgs: [
            $this.molNo, $this.gaussianSurfaceSettings.sigma,
            $this.gaussianSurfaceSettings.countourLevel,
            $this.gaussianSurfaceSettings.boxRadius,
            $this.gaussianSurfaceSettings.gridScale
        ]
    }).then(response => {
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
    })
}

MoorhenMolecule.prototype.drawCootRepresentation = async function (glRef, style) {
    const $this = this
    let m2tStyle
    let m2tSelection
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
    return this.commandCentre.current.cootCommand({
        returnType: "mesh",
        command: "get_molecular_representation_mesh",
        commandArgs: [
            $this.molNo, m2tSelection, "colorRampChainsScheme", m2tStyle
        ]
    }).then(response => {
        let objects = [response.data.result.result]
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
            if (bufferAtoms.length > 0) {
                this.displayObjects[style][0].atoms = bufferAtoms
            }
        } else {
            this.clearBuffersOfStyle(style, glRef)
        }
        return Promise.resolve(true)
    })
}

MoorhenMolecule.prototype.show = function (style, glRef) {
    if (!this.displayObjects[style]) {
        this.displayObjects[style] = []
    }
    if (this.displayObjects[style].length === 0) {
        return this.fetchIfDirtyAndDraw(style, glRef)
            .then(_ => { glRef.current.drawScene() })
    }
    else {
        this.displayObjects[style].forEach(displayBuffer => {
            displayBuffer.visible = true
        })
        glRef.current.drawScene()
        return Promise.resolve(true)
    }

}

MoorhenMolecule.prototype.hide = function (style, gl) {
    this.displayObjects[style].forEach(displayBuffer => {
        displayBuffer.visible = false
    })
    gl.current.drawScene()
}

MoorhenMolecule.prototype.webMGAtomsFromFileString = function (fileString) {
    const $this = this
    let result = { atoms: [] }
    var possibleIndentedLines = fileString.split("\n");
    var unindentedLines = possibleIndentedLines.map(line => line.trim())
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

MoorhenMolecule.prototype.clearBuffersOfStyle = function (style, glRef) {
    const $this = this
    //Empty existing buffers of this type
    $this.displayObjects[style].forEach((buffer) => {
        buffer.clearBuffers()
        if (glRef.current.displayBuffers) {
            glRef.current.displayBuffers = glRef.current.displayBuffers.filter(glBuffer => glBuffer !== buffer)
        }
    })
    glRef.current.buildBuffers()
    $this.displayObjects[style] = []
}

MoorhenMolecule.prototype.buffersInclude = function (bufferIn) {
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

MoorhenMolecule.prototype.drawBonds = function (webMGAtoms, glRef, colourSchemeIndex) {
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

MoorhenMolecule.prototype.drawLigands = function (webMGAtoms, glRef, colourSchemeIndex) {
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

    return
    /*
    const $this = this
    if (typeof webMGAtoms["atoms"] === 'undefined') return;

    let ligandAtoms = webMGAtoms.atoms[0].getAtoms("ligands");
    const colourScheme = new ColourScheme(webMGAtoms);
    var atomColours = colourScheme.colourByChain({
        "nonCByAtomType": true,
        'C': colourScheme.order_colours[colourSchemeIndex % colourScheme.order_colours.length]
    });

    const objects = []
    var contactsAndSingletons = webMGAtoms.atoms[0].getBondsContactsAndSingletons();
    var contacts = contactsAndSingletons["contacts"];
    var linePrimitiveInfo = contactsToCylindersInfo(contacts, 0.15, atomColours);
    objects.push(linePrimitiveInfo)

    //console.log("Time to get ligands atoms: "+(new Date().getTime()-start));
    ligandAtoms = webMGAtoms.atoms[0].getAtoms("ligands");
    const multipleBonds = getMultipleBonds(ligandAtoms, $this.enerLib, 0.15, atomColours);
    //console.log("Time to get ligands multiple bonds: "+(new Date().getTime()-start));
    objects = objects.concat(multipleBonds)
    console.log({ objects })
    //console.log("Time to get ligands bonds objects: "+(new Date().getTime()-start));
    const spheres = atomsToSpheresInfo(ligandAtoms, 0.4, atomColours);
    //console.log("Time to get ligands spheres: "+(new Date().getTime()-start));
    objects.push(spheres);
    //console.log("Time to get ligands objects: "+(new Date().getTime()-start));
    console.log({ objects })
    $this.clearBuffersOfStyle("ligands", glRef)
    $this.addBuffersOfStyle(glRef, objects, "ligands")
*/
}

const gemmiAtomsToCirclesSpheresInfo = (atoms, size, primType, colourScheme) => {

    let sphere_sizes = [];
    let sphere_col_tri = [];
    let sphere_vert_tri = [];
    let sphere_idx_tri = [];
    let sphere_atoms = [];

    for (let iat = 0; iat < atoms.length; iat++) {
        sphere_idx_tri.push(iat);
        sphere_vert_tri.push(atoms[iat].pos[0]);
        sphere_vert_tri.push(atoms[iat].pos[1]);
        sphere_vert_tri.push(atoms[iat].pos[2]);
        for (let ip = 0; ip < colourScheme[`${atoms[iat].serial}`].length; ip++) {
            sphere_col_tri.push(colourScheme[`${atoms[iat].serial}`][ip])
        }
        sphere_sizes.push(size);
        let atom = {};
        atom["x"] = atoms[iat].pos[0];
        atom["y"] = atoms[iat].pos[1];
        atom["z"] = atoms[iat].pos[2];
        atom["tempFactor"] = atoms[iat].b_iso;
        atom["charge"] = atoms[iat].charge;
        atom["symbol"] = atoms[iat].element;
        atom["label"] = ""
        sphere_atoms.push(atom);
    }

    const spherePrimitiveInfo = {
        atoms: [[sphere_atoms]],
        sizes: [[sphere_sizes]],
        col_tri: [[sphere_col_tri]],
        norm_tri: [[[]]],
        vert_tri: [[sphere_vert_tri]],
        idx_tri: [[sphere_idx_tri]],
        prim_types: [[primType]]
    }
    return spherePrimitiveInfo;
}

MoorhenMolecule.prototype.drawResidueHighlight = async function (glRef, style, selectionString, colour, clearBuffers=false) {
    const $this = this

    if (typeof selectionString === 'string') {
        const resSpec = cidToSpec(selectionString)
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
    return
}

MoorhenMolecule.prototype.drawHover = async function (glRef, selectionString) {
    return await this.drawResidueHighlight(glRef, 'hover', selectionString, [1.0, 0.5, 0.0, 0.35], true)
}

MoorhenMolecule.prototype.drawSelection = async function (glRef, selectionString) {
    return await this.drawResidueHighlight(glRef, 'selection', selectionString, [1.0, 0.0, 0.0, 0.35], false)
}

MoorhenMolecule.prototype.drawRibbons = function (webMGAtoms, glRef) {
    const $this = this
    const style = "ribbons"

    if (typeof (webMGAtoms["modamino"]) !== "undefined") {
        webMGAtoms["modamino"].forEach(modifiedResidue => {
            Model.prototype.getPeptideLibraryEntry(modifiedResidue, this.enerLib);
        })
    }

    //Sort out H-bonding
    this.enerLib.AssignHBTypes(webMGAtoms, true);
    var model = webMGAtoms.atoms[0];
    model.calculateHBonds();

    var flagBulge = true;
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

    //Restore odlHierarchy
    return
}

MoorhenMolecule.prototype.drawSticks = function (webMGAtoms, glRef) {
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

MoorhenMolecule.prototype.redraw = function (glRef) {
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
    let promise
    if ($this.atomsDirty) {
        promise = $this.updateAtoms()
    }
    else {
        promise = Promise.resolve()
    }
    return promise.then(_ => {
        return itemsToRedraw.reduce(
            (p, style) => {
                return p.then(() => $this.fetchIfDirtyAndDraw(style, glRef)
                )
            },
            Promise.resolve()
        )
    }).catch(err => {
        console.log(err)
        console.log('Error updating atoms when redrawing')
    })
}

MoorhenMolecule.prototype.transformedCachedAtomsAsMovedAtoms = function (glRef) {
    const $this = this
    let movedResidues = [];

    const models = this.gemmiStructure.models
    const modelsSize = this.gemmiStructure.models.size()
    for (let modelIndex = 0; modelIndex < modelsSize; modelIndex++) {
        const model = models.get(modelIndex)
        const chains = model.chains
        const chainsSize = chains.size()
        for (let chainIndex = 0; chainIndex < chainsSize; chainIndex++) {
            const chain = chains.get(chainIndex)
            const residues = chain.residues
            const residuesSize = residues.size()
            for (let residueIndex = 0; residueIndex < residuesSize; residueIndex++) {
                const residue = residues.get(residueIndex)
                const residueSeqId = residue.seqid
                const cid = `${chain.name}/${residueSeqId.str()}`
                let movedAtoms = []
                const atoms = residue.atoms
                const atomsSize = atoms.size()
                for (let atomIndex = 0; atomIndex < atomsSize; atomIndex++) {
                    const atom = atoms.get(atomIndex)
                    const atomName = atom.name
                    const atomElement = atom.element
                    const gemmiAtomPos = atom.pos
                    const atomSymbol = window.CCP4Module.getElementNameAsString(atomElement)
                    const diff = $this.displayObjects.transformation.centre
                    let x = gemmiAtomPos.x + glRef.current.origin[0] - diff[0]
                    let y = gemmiAtomPos.y + glRef.current.origin[1] - diff[1]
                    let z = gemmiAtomPos.z + glRef.current.origin[2] - diff[2]
                    const origin = $this.displayObjects.transformation.origin
                    const quat = $this.displayObjects.transformation.quat
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
                        if (atomSymbol.length === 2) {
                            movedAtoms.push({ name: (atomName).padEnd(4, " "), x: transPos[0] - glRef.current.origin[0] + diff[0], y: transPos[1] - glRef.current.origin[1] + diff[1], z: transPos[2] - glRef.current.origin[2] + diff[2], resCid: cid })
                        } else {
                            movedAtoms.push({ name: (" " + atomName).padEnd(4, " "), x: transPos[0] - glRef.current.origin[0] + diff[0], y: transPos[1] - glRef.current.origin[1] + diff[1], z: transPos[2] - glRef.current.origin[2] + diff[2], resCid: cid })
                        }
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

    return movedResidues
}

MoorhenMolecule.prototype.updateWithMovedAtoms = async function (movedResidues, glRef) {
    const $this = this
    return $this.commandCentre.current.cootCommand({
        returnType: "status",
        command: "shim_new_positions_for_residue_atoms",
        commandArgs: [$this.molNo, movedResidues],
        changesMolecules: [$this.molNo]
    }).then(response => {
        $this.displayObjects.transformation.origin = [0, 0, 0]
        $this.displayObjects.transformation.quat = null
        $this.setAtomsDirty(true)
        return $this.redraw(glRef)
    })

}

MoorhenMolecule.prototype.applyTransform = function (glRef) {
    const $this = this
    const movedResidues = $this.transformedCachedAtomsAsMovedAtoms(glRef)
    return $this.updateWithMovedAtoms(movedResidues, glRef)
}

MoorhenMolecule.prototype.mergeMolecules = async function (otherMolecules, glRef, doHide) {
    //console.log('In merge molecules')
    const $this = this
    if (typeof doHide === 'undefined') doHide = false
    return $this.commandCentre.current.cootCommand({
        command: 'merge_molecules',
        commandArgs: [$this.molNo, `${otherMolecules.map(molecule => molecule.molNo).join(':')}`],
        returnType: "merge_molecules_return",
        changesMolecules: [$this.molNo]
    }, true).then(async result => {
        //console.log("Merge molecule result", { result })
        $this.setAtomsDirty(true)
        if (doHide) otherMolecules.forEach(molecule => {
            //console.log('Hiding', { molecule })
            Object.keys(molecule.displayObjects).forEach(style => {
                if (Array.isArray(molecule.displayObjects[style])) {
                    molecule.hide(style, glRef)
                }
            })
        })
        let answer = await $this.redraw(glRef)
        //console.log({ answer })
        return Promise.resolve(true)
    })
}

MoorhenMolecule.prototype.addLigandOfType = async function (resType, at, glRef) {
    const $this = this
    let newMolecule = null
    return $this.commandCentre.current.cootCommand({
        returnType: 'status',
        command: 'get_monomer_and_position_at',
        commandArgs: [resType.toUpperCase(), -999999, ...at]
    }, true)
        .then(async result => {
            if (result.data.result.status === "Completed") {
                newMolecule = new MoorhenMolecule($this.commandCentre, $this.monomerLibraryPath)
                newMolecule.setAtomsDirty(true)
                newMolecule.molNo = result.data.result.result
                newMolecule.name = resType.toUpperCase()
                newMolecule.cootBondsOptions = $this.cootBondsOptions
                const _ = await $this.mergeMolecules([newMolecule], glRef, true);
                return newMolecule.delete(glRef);
            }
            else {
                return Promise.resolve(false)
            }
        })
}

MoorhenMolecule.prototype.addDictShim = function (comp_id, unindentedLines) {
    var $this = this
    //console.log({ comp_id, unindentedLines })
    var reassembledCif = unindentedLines.join("\n")
    $this.enerLib.addCIFAtomTypes(comp_id, reassembledCif);
    $this.enerLib.addCIFBondTypes(comp_id, reassembledCif);
}

MoorhenMolecule.prototype.addDict = function (theData) {
    var $this = this
    //console.log('In addDict', theData)
    var possibleIndentedLines = theData.split("\n");
    var unindentedLines = []
    var comp_id = 'list'
    var rx = /data_comp_(.*)/;
    for (var line of possibleIndentedLines) {
        var trimmedLine = line.trim()
        var arr = rx.exec(trimmedLine);
        if (arr !== null) {
            //Had we encountered a previous compound ?  If so, add it into the energy lib
            if (comp_id !== 'list') {
                $this.addDictShim(comp_id, unindentedLines)
                unindentedLines = []
            }
            comp_id = arr[1]
        }
        unindentedLines.push(line.trim())
    }
    if (comp_id !== 'list') {
        $this.addDictShim(comp_id, unindentedLines)
    }
}

MoorhenMolecule.prototype.undo = async function (glRef) {
    const $this = this
    await $this.commandCentre.current.cootCommand({
        returnType: "status",
        command: "undo",
        commandArgs: [$this.molNo]
    })
    $this.setAtomsDirty(true)
    return $this.redraw(glRef)
}

MoorhenMolecule.prototype.redo = async function (glRef) {
    const $this = this
    await $this.commandCentre.current.cootCommand({
        returnType: "status",
        command: "redo",
        commandArgs: [$this.molNo]
    })
    $this.setAtomsDirty(true)
    return $this.redraw(glRef)
}

MoorhenMolecule.prototype.updateLigands = async function () {
    let ligandList = []
    const model = this.gemmiStructure.first_model()
    
    try{
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
                ligandList.push({resName: resName, chainName: chainName, resNum: resNum})
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

MoorhenMolecule.prototype.gemmiAtomsForCid = async function (cid) {
    const $this = this

    if ($this.atomsDirty) {
        await $this.updateAtoms()
    }

    let result = []
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
                                const atomInfo = {
                                    pos: [atomPosX, atomPosY, atomPosZ],
                                    x: atomPosX,
                                    y: atomPosY,
                                    z: atomPosZ,
                                    charge: atomCharge,
                                    element: atomElement,
                                    symbol: window.CCP4Module.getElementNameAsString(atomElement),
                                    b_iso: atomTempFactor,
                                    serial: atomSerial,
                                    name: atomName,
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

MoorhenMolecule.prototype.hasVisibleBuffers = function (excludeBuffers = ['hover', 'selection', 'transformation', 'contact_dots', 'chemical_features', 'VdWSurface']) {
    const styles = Object.keys(this.displayObjects).filter(key => !excludeBuffers.some(style => key.includes(style)))
    const displayBuffers = styles.map(style => this.displayObjects[style])
    const visibleDisplayBuffers = displayBuffers.filter(displayBuffer => displayBuffer.some(buffer => buffer.visible))
    return visibleDisplayBuffers.length !== 0
}

MoorhenMolecule.prototype.fetchCurrentColourRules = async function() {
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

MoorhenMolecule.prototype.setColourRules = async function(glRef, ruleList, redraw=false) {
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

MoorhenMolecule.prototype.hideCid = async function(cid, glRef) {
    await this.commandCentre.current.cootCommand({
        message: 'coot_command',
        command: "add_to_non_drawn_bonds", 
        returnType: 'status',
        commandArgs: [this.molNo, cid], 
    })
    this.excludedSegments.push(cid)
    const result = await this.redraw(glRef)
    return Promise.resolve(result)
}

MoorhenMolecule.prototype.unhideAll = async function(glRef) {
    await this.commandCentre.current.cootCommand({
        message: 'coot_command',
        command: "clear_non_drawn_bonds", 
        returnType: 'status',
        commandArgs: [this.molNo], 
    })
    this.excludedSegments = []
    const result = await this.redraw(glRef)
    return Promise.resolve(result)
}
