import 'pako';
import $ from 'jquery';
import { EnerLib, Model, parseMMCIF, parsePDB, atomsToHierarchy } from '../WebGL/mgMiniMol';
import { CalcSecStructure } from '../WebGL/mgSecStr';
import { ColourScheme } from '../WebGL/mgWebGLAtomsToPrimitives';
import { GetSplinesColoured } from '../WebGL/mgSecStr';
import { getMultipleBonds } from '../WebGL/mgWebGLAtomsToPrimitives';
import { atomsToSpheresInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { contactsToCylindersInfo, contactsToCappedCylindersInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { readMapFromArrayBuffer, mapToMapGrid } from '../WebGL/mgWebGLReadMap';
import { singletonsToLinesInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { DisplayBuffer, getEncodedData } from '../WebGL/mgWebGL';
import { v4 as uuidv4 } from 'uuid';
import { postCootMessage, readTextFile, readDataFile } from '../BabyGruUtils'

export function BabyGruMolecule(cootWorker) {
    this.cootWorker = cootWorker
    this.HBondsAssigned = false
    this.displayObjects = {
        ribbons: [],
        bonds: []
    }
};

BabyGruMolecule.prototype.loadToCootFromFile = function (source) {
    const $this = this
    return new Promise((resolve, reject) => {
        return readTextFile(source)
            .then(coordData => {
                return postCootMessage($this.cootWorker, {
                    message: 'read_pdb',
                    name: source.name,
                    data: coordData
                }).then(e => {
                    $this.name = e.data.result.name
                    $this.coordMolNo = e.data.result.coordMolNo
                    resolve($this)
                })
            })
    })
}

BabyGruMolecule.prototype.loadToCootFromEBI = function (pdbCode) {
    const $this = this
    return new Promise((resolve, reject) => {
        //Remember to change this to an appropriate URL for downloads in produciton, and to deal with the consequent CORS headache
        return fetch(`/download/${pdbCode}.cif`, { mode: "no-cors" })
            .then(response => {
                return response.text()
            }).then((coordData) => {
                return postCootMessage($this.cootWorker, {
                    message: 'read_pdb',
                    name: pdbCode,
                    data: coordData
                }).then(e => {
                    $this.name = e.data.result.name
                    $this.coordMolNo = e.data.result.coordMolNo
                    resolve($this)
                })
            })
            .catch((err) => { console.log(err) })
    })
}

BabyGruMolecule.prototype.getAtoms = function () {
    const $this = this;
    return postCootMessage($this.cootWorker, { message: "get_atoms", coordMolNo: $this.coordMolNo })
}

BabyGruMolecule.prototype.fetchCoordsAndDrawBonds = function (gl, enerLib) {
    const $this = this;
    this.getAtoms()
        .then(result => {
            const webMGAtoms = $this.webMGAtomsFromFileString(result.data.result.pdbData)
            gl.current.setOrigin(webMGAtoms.atoms[0].centre())
            $this.drawBonds(webMGAtoms, gl.current, 0)
        })
}

BabyGruMolecule.prototype.webMGAtomsFromFileString = function (fileString) {
    let result = { atoms: [] }
    var possibleIndentedLines = fileString.split("\n");
    var unindentedLines = possibleIndentedLines.map(line => line.trim())
    try {
        result = parseMMCIF(unindentedLines);
        if (typeof result.atoms === 'undefined') {
            result = parsePDB(unindentedLines)
        }
    }
    catch (err) {
        console.log('Err', err)
        result = parsePDB(unindentedLines)
    }
    return result
}

BabyGruMolecule.prototype.drawBonds = function (webMGAtoms, gl, colourSchemeIndex) {

    var $this = this
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
    var objects = []
    objects.push(linePrimitiveInfo);
    objects.push(singletonPrimitiveInfo);
    objects.forEach(object => {
        var a = gl.appendOtherData(object, true);
        $this.displayObjects.bonds = $this.displayObjects.bonds.concat(a)
    })
    gl.buildBuffers();
    gl.drawScene();
}

BabyGruMolecule.prototype.drawRibbons = function (webMGAtoms, gl, enerLib) {

    const selectionString = '/*/*'

    //Attempt to apply selection, storing old hierarchy
    const oldHierarchy = webMGAtoms.atoms
    if (typeof selectionString === 'string') {
        try {
            const selectedAtoms = webMGAtoms.atoms[0].getAtoms(selectionString)
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

    if (typeof webMGAtoms.atoms === 'undefined' || webMGAtoms.atoms.length === 0) {
        webMGAtoms.atoms = oldHierarchy
        return;
    }

    if (typeof (webMGAtoms["modamino"]) !== "undefined") {
        webMGAtoms["modamino"].forEach(modifiedResidue => {
            Model.prototype.getPeptideLibraryEntry(modifiedResidue, enerLib);
        })
    }

    //Sort out H-bonding
    enerLib.AssignHBTypes(webMGAtoms, true);
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

    objects.forEach(object => {
        const a = gl.appendOtherData(object, true);
        this.displayObjects.ribbons = this.displayObjects.ribbons.concat(a)
    })

    gl.buildBuffers();
    gl.drawScene();

    //Restore odlHierarchy
    webMGAtoms.atoms = oldHierarchy
    return
}