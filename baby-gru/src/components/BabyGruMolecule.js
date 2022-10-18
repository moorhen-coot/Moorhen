import 'pako';
import { EnerLib, Model, parseMMCIF, parsePDB, atomsToHierarchy } from '../WebGL/mgMiniMol';
import { CalcSecStructure } from '../WebGL/mgSecStr';
import { ColourScheme } from '../WebGL/mgWebGLAtomsToPrimitives';
import { GetSplinesColoured } from '../WebGL/mgSecStr';
import { getMultipleBonds } from '../WebGL/mgWebGLAtomsToPrimitives';
import { atomsToSpheresInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { contactsToCylindersInfo, contactsToLinesInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { singletonsToLinesInfo } from '../WebGL/mgWebGLAtomsToPrimitives';
import { postCootMessage, readTextFile, readDataFile, cootCommand } from '../BabyGruUtils'

export function BabyGruMolecule(cootWorker) {
    this.cootWorker = cootWorker
    this.enerLib = new EnerLib()
    this.HBondsAssigned = false
    this.cachedAtoms = null
    this.atomsDirty = true
    this.name = "unnamed"
    this.fileName = null
    this.displayObjects = {
        ribbons: [],
        bonds: [],
        sticks: [],
        rama: [],
        rotamer: []
    }
};

BabyGruMolecule.prototype.loadToCootFromFile = function (source) {
    const $this = this
    const pdbRegex = /.pdb$/;
    const entRegex = /.ent$/;
    return new Promise((resolve, reject) => {
        return readTextFile(source)
            .then(coordData => {
                $this.name = source.name.replace(pdbRegex,"").replace(entRegex, "");
                $this.cachedAtoms = $this.webMGAtomsFromFileString(coordData)
                $this.atomsDirty = false
                return postCootMessage($this.cootWorker, {
                    message: 'read_pdb',
                    name: $this.name,
                    data: coordData
                }).then(e => {
                    $this.name = e.data.result.name
                    $this.coordMolNo = e.data.result.coordMolNo
                    $this.fileName = e.data.result.fileName
                    console.log('e is', e)
                    resolve($this)
                })
            })
    })
}
BabyGruMolecule.prototype.setAtomsDirty = function (state) {
    this.atomsDirty = state
}

BabyGruMolecule.prototype.loadToCootFromURL = function (url, molName) {
    const $this = this
    return new Promise((resolve, reject) => {
        console.log('Off to fetch url', url)
        //Remember to change this to an appropriate URL for downloads in produciton, and to deal with the consequent CORS headache
        return fetch(url, { mode: "no-cors" })
            .then(response => {
                return response.text()
            }).then((coordData) => {
                $this.name = molName
                $this.cachedAtoms = $this.webMGAtomsFromFileString(coordData)
                $this.atomsDirty = false
                return postCootMessage($this.cootWorker, {
                    message: 'read_pdb',
                    name: molName,
                    data: coordData
                }).then(reply => {
                    $this.name = reply.data.result.name
                    $this.coordMolNo = reply.data.result.coordMolNo
                    resolve($this)
                })
            })
            .catch((err) => { console.log(err) })
    })
}

BabyGruMolecule.prototype.getAtoms = function () {
    const $this = this;
    return postCootMessage($this.cootWorker, {
        message: "get_atoms",
        coordMolNo: $this.coordMolNo
    })
}

BabyGruMolecule.prototype.updateAtoms = function () {
    const $this = this;
    return $this.getAtoms().then((result) => {
        return new Promise((resolve, reject) => {
            $this.cachedAtoms = $this.webMGAtomsFromFileString(result.data.result.pdbData)
            $this.atomsDirty = false
            resolve($this.cachedAtoms)
        })
    })
}

BabyGruMolecule.prototype.fetchIfDirtyAndDraw = function (style, gl) {
    const $this = this
    let promise
    if ($this.atomsDirty) {
        promise = this.updateAtoms()
    }
    else {
        promise = new Promise((resolve, reject) => { resolve($this.cachedAtoms) })
    }
    return promise.then(webMGAtoms => {
        return new Promise((resolve, reject) => {
            $this.drawWithStyleFromAtoms(style, gl, webMGAtoms)
            resolve(true)
        })
    })
}

BabyGruMolecule.prototype.centreOn = function (gl, selection) {
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
        return new Promise((resolve, reject) => {
            gl.current.setOrigin($this.cachedAtoms.atoms[0].centre())
            resolve(true)
        })
    })
}

BabyGruMolecule.prototype.drawWithStyleFromAtoms = function (style, gl, webMGAtoms) {

    switch (style) {
        case 'ribbons':
            this.drawRibbons(webMGAtoms, gl.current)
            break;
        case 'bonds':
            this.drawBonds(webMGAtoms, gl.current, 0)
            break;
        case 'sticks':
            this.drawSticks(webMGAtoms, gl.current, 0)
            break;
        case 'rama':
            this.drawRamachandranBalls(gl.current)
            break;
        case 'rotamer':
            this.drawRotamerDodecahedra(gl.current)
            break;
        default:
            break;
    }
}

BabyGruMolecule.prototype.drawRamachandranBalls = function (gl) {
    const $this = this
    cootCommand($this.cootWorker, {
        returnType: "mesh",
        command: "ramachandran_validation_markup_mesh",
        commandArgs: [$this.coordMolNo]
    }).then(response => {
        const objects = [response.data.result.result]

        //Empty existing buffers of this type
        this.displayObjects.rama.forEach((buffer) => {
            buffer.clearBuffers()
        })
        this.displayObjects.rama = []

        objects.forEach(object => {
            var a = gl.appendOtherData(object, true);
            $this.displayObjects.rama = $this.displayObjects.rama.concat(a)
        })
        gl.buildBuffers();
        gl.drawScene();
    })
}

BabyGruMolecule.prototype.drawRotamerDodecahedra = function (gl) {
    const $this = this
    cootCommand($this.cootWorker, {
        returnType: "mesh",
        command: "get_rotamer_dodecs",
        commandArgs: [$this.coordMolNo]
    }).then(response => {
        const objects = [response.data.result.result]

        //Empty existing buffers of this type
        this.clearBuffersOfStyle('rotamer')

        objects.forEach(object => {
            var a = gl.appendOtherData(object, true);
            $this.displayObjects.rotamer = $this.displayObjects.rotamer.concat(a)
        })

        gl.buildBuffers();
        gl.drawScene();
    })
}

BabyGruMolecule.prototype.show = function (style, gl) {
    if (this.displayObjects[style].length == 0) {
        this.fetchIfDirtyAndDraw(style, gl)
    }
    else {
        this.displayObjects[style].forEach(displayBuffer => {
            displayBuffer.visible = true
        })
    }
    gl.current.drawScene()
}

BabyGruMolecule.prototype.hide = function (style, gl) {
    this.displayObjects[style].forEach(displayBuffer => {
        displayBuffer.visible = false
    })
    gl.current.drawScene()
}

BabyGruMolecule.prototype.webMGAtomsFromFileString = function (fileString) {
    const $this = this
    let result = { atoms: [] }
    var possibleIndentedLines = fileString.split("\n");
    var unindentedLines = possibleIndentedLines.map(line => line.trim())
    try {
        result = parseMMCIF(unindentedLines, $this.name);
        if (typeof result.atoms === 'undefined') {
            result = parsePDB(unindentedLines, $this.name)
            console.log('Parsed file as PDB')
        }
    }
    catch (err) {
        result = parsePDB(unindentedLines, $this.name)
        console.log('Parsed file as PDB')
    }
    return result
}

BabyGruMolecule.prototype.clearBuffersOfStyle = function (style) {
    const $this = this
    //Empty existing buffers of this type
    $this.displayObjects[style].forEach((buffer) => {
        buffer.clearBuffers()
    })
    $this.displayObjects[style] = []
}

BabyGruMolecule.prototype.drawBonds = function (webMGAtoms, gl, colourSchemeIndex) {
    const $this = this

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

    const objects = linesAndSpheres.filter(item => {
        return typeof item.sizes !== "undefined" &&
            item.sizes.length > 0 &&
            item.sizes[0].length > 0 &&
            item.sizes[0][0].length > 0
    })

    $this.clearBuffersOfStyle('bonds')

    objects.forEach(object => {
        var a = gl.appendOtherData(object, true);
        $this.displayObjects.bonds = $this.displayObjects.bonds.concat(a)
    })
    gl.buildBuffers();
    gl.drawScene();
}

BabyGruMolecule.prototype.drawRibbons = function (webMGAtoms, gl) {
    const $this = this
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

    $this.clearBuffersOfStyle('ribbons')

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

BabyGruMolecule.prototype.drawSticks = function (webMGAtoms, gl) {
    const $this = this
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

    $this.clearBuffersOfStyle('sticks')

    objects.forEach(object => {
        const a = gl.appendOtherData(object, true);
        this.displayObjects.sticks = this.displayObjects.sticks.concat(a)
    })

    gl.buildBuffers();
    gl.drawScene();

}

BabyGruMolecule.prototype.redraw = function (gl) {
    const $this = this
    const itemsToRedraw = []
    Object.keys($this.displayObjects).forEach(style => {
        const objectCategoryBuffers = $this.displayObjects[style]
        if (objectCategoryBuffers.length > 0) {
            if (objectCategoryBuffers[0].visible) {
                //FOr currently visible display types, put them on a list for redraw
                itemsToRedraw.push(style)
            }
            else {
                $this.clearBuffersOfStyle(style)
            }
        }
    })
    itemsToRedraw.reduce(
        (p, style) => {
            console.log(`Redrawing ${style}`, $this.atomsDirty)
            return p.then(() => $this.fetchIfDirtyAndDraw(style, gl)
            )
        },
        Promise.resolve()
    )
}