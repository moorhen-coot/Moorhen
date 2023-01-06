import 'pako';
import { EnerLib, Model, parseMMCIF, parsePDB, atomsToHierarchy } from '../WebGL/mgMiniMol';
import { CalcSecStructure } from '../WebGL/mgSecStr';
import { ColourScheme } from '../WebGL/mgWebGLAtomsToPrimitives';
import { GetSplinesColoured } from '../WebGL/mgSecStr';
import { atomsToSpheresInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { contactsToCylindersInfo, contactsToLinesInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { singletonsToLinesInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { readTextFile, readGemmiStructure, cidToSpec } from './MoorhenUtils'
import { quatToMat4 } from '../WebGL/quatToMat4.js';
import * as vec3 from 'gl-matrix/vec3';

export function MoorhenMolecule(commandCentre, urlPrefix) {
    this.type = 'molecule'
    this.commandCentre = commandCentre
    this.enerLib = new EnerLib()
    this.HBondsAssigned = false
    this.cachedAtoms = {}
    this.atomsDirty = true
    this.name = "unnamed"
    this.molNo = null
    this.gemmiStructure = null
    this.cootBondsOptions = {
        isDarkBackground: false,
        smoothness: 1,
        width: 0.1,
        atomRadiusBondRatio: 1
    }
    this.displayObjects = {
        ribbons: [],
        bonds: [],
        sticks: [],
        rama: [],
        rotamer: [],
        CBs: [],
        hover: [],
        ligands: [],
        CRs: [],
        MolecularSurface: [],
        VdWSurface: [],
        transformation: { origin: [0, 0, 0], quat: null, centre: [0, 0, 0] }
    }
    this.urlPrefix = (typeof urlPrefix === 'undefined' ? "." : urlPrefix);
};

MoorhenMolecule.prototype.updateGemmiStructure = async function () {
    let response = await this.getAtoms()
    this.gemmiStructure = readGemmiStructure(response.data.result.pdbData, this.name)
    window.CCP4Module.gemmi_setup_entities(this.gemmiStructure)
    return Promise.resolve()
}


MoorhenMolecule.prototype.delete = async function (glRef) {
    const $this = this
    Object.getOwnPropertyNames(this.displayObjects).forEach(displayObject => {
        if (this.displayObjects[displayObject].length > 0) { this.clearBuffersOfStyle(displayObject, glRef) }
    })
    glRef.current.drawScene()
    const inputData = { message: "delete", molNo: $this.molNo }
    const response = await $this.commandCentre.current.postMessage(inputData)
    return response
}

MoorhenMolecule.prototype.copyFragment = async function (chainId, res_no_start, res_no_end, glRef, doRecentre) {
    if (typeof doRecentre === 'undefined') {
        doRecentre = true
    }
    const $this = this
    const inputData = { message: "copy_fragment", molNo: $this.molNo, chainId: chainId, res_no_start: res_no_start, res_no_end: res_no_end }
    const response = await $this.commandCentre.current.postMessage(inputData)
    const newMolecule = new MoorhenMolecule($this.commandCentre, $this.urlPrefix)
    newMolecule.name = `${$this.name} fragment`
    newMolecule.molNo = response.data.result
    await newMolecule.fetchIfDirtyAndDraw('CBs', glRef)
    if (doRecentre) await newMolecule.centreOn(glRef)

    const sequenceInputData = { returnType: "residue_codes", command: "get_single_letter_codes_for_chain", commandArgs: [response.data.result, chainId] }
    const sequenceResponse = await $this.commandCentre.current.cootCommand(sequenceInputData)
    newMolecule.cachedAtoms.sequences = [{
        "sequence": sequenceResponse.data.result.result,
        "name": `${$this.name} fragment`,
        "chain": chainId,
        "type": this.cachedAtoms.sequences.length > 0 ? this.cachedAtoms.sequences[0].type : 'ligand'
    }]

    return newMolecule
}

MoorhenMolecule.prototype.loadToCootFromURL = function (url, molName) {
    const $this = this
    return fetch(url)
        .then(response => response.text())
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

    $this.name = name.replace(pdbRegex, "").replace(entRegex, "");
    $this.cachedAtoms = $this.webMGAtomsFromFileString(coordData)
    $this.gemmiStructure = readGemmiStructure(coordData, $this.name)
    window.CCP4Module.gemmi_setup_entities($this.gemmiStructure)
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
                const newPromise = fetch(`${$this.urlPrefix}/baby-gru/monomers/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`)
                    .then(response => response.text())
                    .then(fileContent => $this.commandCentre.current.cootCommand({
                        returnType: "status",
                        command: 'shim_read_dictionary',
                        commandArgs: [fileContent, -999999],
                        changesMolecules: []
                    }, true))
                monomerPromises.push(newPromise)
            })
            await Promise.all(monomerPromises)
            console.log('Fetched all')
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

MoorhenMolecule.prototype.updateAtoms = function () {
    const $this = this;
    return $this.getAtoms().then((result) => {
        return new Promise((resolve, reject) => {
            $this.cachedAtoms = $this.webMGAtomsFromFileString(result.data.result.pdbData)
            $this.gemmiStructure = readGemmiStructure(result.data.result.pdbData, $this.name)
            window.CCP4Module.gemmi_setup_entities($this.gemmiStructure)
            $this.atomsDirty = false
            resolve($this.cachedAtoms)
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
        promise = Promise.resolve($this.cachedAtoms)
    }
    return promise.then(webMGAtoms => {
        return $this.drawWithStyleFromAtoms(style, glRef, webMGAtoms)
    })
}

MoorhenMolecule.prototype.centreOn = function (glRef, selection) {
    //Note add selection to permit centringh on subset
    const $this = this
    let promise
    if (this.atomsDirty) {
        promise = this.updateAtoms()
    }
    else {
        promise = Promise.resolve()
    }

    return promise.then(() => {

        let selectionCentre = null;
        if (selection) {
            let selectedChainIndex = $this.cachedAtoms.atoms[selection.modelIndex].chains.findIndex(chain => chain.residues[0].atoms[0]["_atom_site.auth_asym_id"] === selection.chain);
            if (selectedChainIndex === -1) {
                console.log(`Cannot find chain ${selection.molName}/${selection.chain}`);
                return;
            }
            let selectedResidueIndex = $this.cachedAtoms.atoms[selection.modelIndex].chains[selectedChainIndex].residues.findIndex(residue => residue.atoms[0]["_atom_site.label_seq_id"] == selection.seqNum);
            if (selectedResidueIndex === -1) {
                console.log(`Cannot find residue ${selection.molName}/${selection.chain}/${selection.seqNum}`);
                return;
            } else {
                let selectedAtoms = $this.cachedAtoms.atoms[selection.modelIndex].chains[selectedChainIndex].residues[selectedResidueIndex].atoms;
                selectionCentre = $this.cachedAtoms.atoms[selection.modelIndex].centreOnAtoms(selectedAtoms);
            }
        } else {
            selectionCentre = $this.cachedAtoms.atoms[0].centre();
        }

        return new Promise((resolve, reject) => {
            glRef.current.setOrigin(selectionCentre);
            resolve(true);
        })
    })
}


MoorhenMolecule.prototype.drawWithStyleFromAtoms = async function (style, glRef, webMGAtoms) {

    switch (style) {
        case 'ribbons':
            this.drawRibbons(webMGAtoms, glRef)
            break;
        case 'bonds':
            this.drawBonds(webMGAtoms, glRef, this.molNo)
            break;
        case 'sticks':
            this.drawSticks(webMGAtoms, glRef, this.molNo)
            break;
        case 'rama':
            this.drawRamachandranBalls(glRef)
            break;
        case 'rotamer':
            this.drawRotamerDodecahedra(glRef)
            break;
        case 'CBs':
            await this.drawCootBonds(webMGAtoms, glRef)
            break;
        case 'CRs':
            await this.drawCootRepresentation(webMGAtoms, glRef, style)
            break;
        case 'MolecularSurface':
            await this.drawCootRepresentation(webMGAtoms, glRef, style)
            break;
        case 'VdWSurface':
            await this.drawCootRepresentation(webMGAtoms, glRef, style)
            break;
        case 'Calpha':
            await this.drawCootRepresentation(webMGAtoms, glRef, style)
            break;
        case 'ligands':
            await this.drawCootRepresentation(webMGAtoms, glRef, style)
            break;
        default:
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

MoorhenMolecule.prototype.drawRotamerDodecahedra = function (glRef) {
    const $this = this
    const style = "rotamer"
    return this.commandCentre.current.cootCommand({
        returnType: "mesh",
        command: "get_rotamer_dodecs",
        commandArgs: [$this.molNo]
    }).then(response => {
        const objects = [response.data.result.result]
        //console.log('rota', { objects })
        //Empty existing buffers of this type
        this.clearBuffersOfStyle(style, glRef)
        this.addBuffersOfStyle(glRef, objects, style)
    })
}

MoorhenMolecule.prototype.drawCootBonds = async function (webMGAtoms, glRef) {
    const $this = this
    const style = "CBs"
    return this.commandCentre.current.cootCommand({
        returnType: "mesh",
        command: "get_bonds_mesh",
        commandArgs: [
            $this.molNo, "COLOUR-BY-CHAIN-AND-DICTIONARY", $this.cootBondsOptions.isDarkBackground,
            $this.cootBondsOptions.width, $this.cootBondsOptions.atomRadiusBondRatio,
            $this.cootBondsOptions.smoothness
        ]
    }).then(response => {
        const objects = [response.data.result.result]
        if (objects.length > 0) {
            //Empty existing buffers of this type
            this.clearBuffersOfStyle(style, glRef)
            this.addBuffersOfStyle(glRef, objects, style)
            if (webMGAtoms.atoms.length > 0) {
                let bufferAtoms = []
                webMGAtoms.atoms[0].getAllAtoms().forEach(at1 => {
                    let atom = {};
                    atom["x"] = at1.x();
                    atom["y"] = at1.y();
                    atom["z"] = at1.z();
                    atom["tempFactor"] = at1["_atom_site.B_iso_or_equiv"];
                    atom["charge"] = at1["_atom_site.pdbx_formal_charge"];
                    atom["symbol"] = at1["_atom_site.type_symbol"];
                    atom["label"] = at1.getAtomID();
                    bufferAtoms.push(atom);
                    this.displayObjects[style][0].atoms = bufferAtoms
                })
            }
        }
        else {
            this.clearBuffersOfStyle(style, glRef)
        }
        return Promise.resolve(true)
    })
}

MoorhenMolecule.prototype.drawCootRepresentation = async function (webMGAtoms, glRef, style) {
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
            m2tSelection = "(ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR)"
            break;
        case "VdWSurface":
            m2tStyle = "VdWSurface"
            m2tSelection = "(ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR)"
            break;
        case "Calpha":
            m2tStyle = "Calpha"
            m2tSelection = "(ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR)"
            break;
        case "ligands":
            m2tStyle = "Cylinders"
            m2tSelection = "(!ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR)"
            break;
        default:
            m2tStyle = "Ribbon"
            m2tSelection = "//"
            break;
    }
    return this.commandCentre.current.cootCommand({
        returnType: "mesh",
        command: "get_molecular_representation_mesh",
        commandArgs: [
            $this.molNo, m2tSelection, "colorRampChainsScheme", m2tStyle
        ]
    }).then(response => {
        const objects = [response.data.result.result]
        if (objects.length > 0) {
            //Empty existing buffers of this type
            this.clearBuffersOfStyle(style, glRef)
            this.addBuffersOfStyle(glRef, objects, style)
            if (webMGAtoms.atoms.length > 0) {
                let bufferAtoms = []
                webMGAtoms.atoms[0].getAllAtoms().forEach(at1 => {
                    let atom = {};
                    atom["x"] = at1.x();
                    atom["y"] = at1.y();
                    atom["z"] = at1.z();
                    atom["tempFactor"] = at1["_atom_site.B_iso_or_equiv"];
                    atom["charge"] = at1["_atom_site.pdbx_formal_charge"];
                    atom["symbol"] = at1["_atom_site.type_symbol"];
                    atom["label"] = at1.getAtomID();
                    bufferAtoms.push(atom);
                    this.displayObjects[style][0].atoms = bufferAtoms
                })
            }
        }
        else {
            this.clearBuffersOfStyle(style, glRef)
        }
        return Promise.resolve(true)
    })
}

MoorhenMolecule.prototype.show = function (style, glRef) {
    //console.log("show",{style})
    if (this.displayObjects[style].length == 0) {
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
    //console.log(bufferIn)
    //console.log($this.displayObjects)
    const BreakException = {};
    try {
        Object.getOwnPropertyNames($this.displayObjects).forEach(style => {
            if (Array.isArray($this.displayObjects[style])) {
                const objectBuffers = $this.displayObjects[style].filter(buffer => bufferIn.id === buffer.id)
                //console.log('Object buffer length', objectBuffers.length, objectBuffers.length > 0)
                if (objectBuffers.length > 0) {
                    throw BreakException;
                }
            }
        })
    }
    catch (e) {
        if (e !== BreakException) throw e;
        //console.log('Catching Break Exception')
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
    //console.log('contacts are', contacts)
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
    //console.log('clearing', style, gl)
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
    //console.log('clearing', style, gl)
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
        sphere_vert_tri.push(atoms[iat].pos.at(0));
        sphere_vert_tri.push(atoms[iat].pos.at(1));
        sphere_vert_tri.push(atoms[iat].pos.at(2));
        for (let ip = 0; ip < colourScheme[`${atoms[iat].serial}`].length; ip++) {
            sphere_col_tri.push(colourScheme[`${atoms[iat].serial}`][ip])
        }
        sphere_sizes.push(size);
        let atom = {};
        atom["x"] = atoms[iat].pos.at(0);
        atom["y"] = atoms[iat].pos.at(1);
        atom["z"] = atoms[iat].pos.at(2);
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

MoorhenMolecule.prototype.drawHover = async function (glRef, selectionString) {
    const $this = this
    const style = "hover"

    if (typeof selectionString === 'string') {
        const resSpec = cidToSpec(selectionString)
        const modifiedSelection = `/*/${resSpec.chain_id}/${resSpec.res_no}-${resSpec.res_no}/*${resSpec.alt_conf === "" ? "" : ":"}${resSpec.alt_conf}`
        const selectedGemmiAtoms = await $this.gemmiAtomsForCid(modifiedSelection)
        const atomColours = {}
        selectedGemmiAtoms.forEach(atom => { atomColours[`${atom.serial}`] = [1.0, 0.5, 0.0, 0.35] })
        let objects = [
            gemmiAtomsToCirclesSpheresInfo(selectedGemmiAtoms, 0.3, "POINTS_SPHERES", atomColours)
        ]
        $this.clearBuffersOfStyle(style, glRef)
        this.addBuffersOfStyle(glRef, objects, style)
    }
    return

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
    Object.keys($this.displayObjects).filter(style => !["transformation"].includes(style)).forEach(style => {
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
                //console.log(`Redrawing ${style}`, $this.atomsDirty)
                return p.then(() => $this.fetchIfDirtyAndDraw(style, glRef)
                )
            },
            Promise.resolve()
        )
    })
}

MoorhenMolecule.prototype.transformedCachedAtomsAsMovedAtoms = function (glRef) {
    const $this = this
    let movedResidues = [];
    $this.cachedAtoms.atoms.forEach(mod => {
        mod.chains.forEach(chain => {
            chain.residues.forEach(res => {
                if (res.atoms.length > 0) {
                    const cid = res.atoms[0].getChainID() + "/" + res.atoms[0].getResidueID()
                    let movedAtoms = [];
                    res.atoms.forEach(atom => {
                        const atomName = atom["_atom_site.label_atom_id"];
                        const atomSymbol = atom["_atom_site.type_symbol"];
                        const diff = $this.displayObjects.transformation.centre
                        let x = atom.x() + glRef.current.origin[0] - diff[0]
                        let y = atom.y() + glRef.current.origin[1] - diff[1]
                        let z = atom.z() + glRef.current.origin[2] - diff[2]
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
                            if (atomSymbol.length == 2)
                                movedAtoms.push({ name: (atomName).padEnd(4, " "), x: transPos[0] - glRef.current.origin[0] + diff[0], y: transPos[1] - glRef.current.origin[1] + diff[1], z: transPos[2] - glRef.current.origin[2] + diff[2], resCid: cid })
                            else
                                movedAtoms.push({ name: (" " + atomName).padEnd(4, " "), x: transPos[0] - glRef.current.origin[0] + diff[0], y: transPos[1] - glRef.current.origin[1] + diff[1], z: transPos[2] - glRef.current.origin[2] + diff[2], resCid: cid })
                        }
                    })
                    movedResidues.push(movedAtoms)
                }
            })
        })
    })
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
                newMolecule = new MoorhenMolecule($this.commandCentre, $this.urlPrefix)
                newMolecule.setAtomsDirty(true)
                newMolecule.molNo = result.data.result.result
                newMolecule.name = resType.toUpperCase()
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

MoorhenMolecule.prototype.gemmiAtomsForCid = async function (cid) {
    const $this = this
    if ($this.atomsDirty) { const cachedAtoms = await $this.updateAtoms() }
    let result = []
    const selection = new window.CCP4Module.Selection(cid)
    const model = $this.gemmiStructure.first_model()
    if (selection.matches_model(model)) {
        const chains = model.chains
        for (let i = 0; i < chains.size(); i++) {
            const ch = chains.get(i)
            if (selection.matches_chain(ch)) {
                const residues = ch.residues
                for (let j = 0; j < residues.size(); j++) {
                    const res = residues.get(j)
                    if (selection.matches_residue(res)) {
                        const atoms = res.atoms
                        for (let k = 0; k < atoms.size(); k++) {
                            const at = atoms.get(k)
                            if (selection.matches_atom(at)) {
                                result.push(at)
                            }
                        }
                    }
                }
            }
        }
    }
    return Promise.resolve(result)
}
