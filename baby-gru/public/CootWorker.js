importScripts('./mini-rsr-web.js')
importScripts('./web_example.js')

let cootModule;
let molecules_container;
let ccp4Module;

const guid = () => {
    var d = Date.now();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

let print = (stuff) => {
    postMessage({ response: JSON.stringify(stuff) })
}

onmessage = function (e) {

    if (e.data.message === 'CootInitialize') {
        postMessage({ message: 'Initializing molecules_container' })

        createRSRModule({
            locateFile: (file) => file,
            onRuntimeInitialized: () => {
                postMessage({ message: 'onRuntimeInitialized' });
            },
            mainScriptUrlOrBlob: "./mini-rsr-web.js",
            print: print,
            printErr: print,
        }).then((returnedModule) => {
            cootModule = returnedModule;
            molecules_container = new cootModule.molecules_container_js()
            postMessage({ response: 'Initialized molecules_container', message: e.data.message })
        })
            .catch((e) => {
                console.log(e)
                print(e);
            });

        createCCP4Module({
            locateFile: (file) => file,
            onRuntimeInitialized: () => {
                postMessage({ message: 'onRuntimeInitialized' });
            },
            mainScriptUrlOrBlob: "./web_example.js",
            print: print,
            printErr: print,
        }).then((returnedModule) => {
            ccp4Module = returnedModule;
            postMessage({ response: 'Initialized ccp4Module', message: e.data.message })
        })
            .catch((e) => {
                console.log(e)
                print(e);
            });

    }

    else if (e.data.message === 'read_pdb') {
        const theGuid = guid()
        cootModule.FS_createDataFile(".", `${theGuid}.pdb`, e.data.data, true, true);
        const tempFilename = `./${theGuid}.pdb`
        const coordMolNo = molecules_container.read_pdb(tempFilename)
        cootModule.FS_unlink(tempFilename)
        this.postMessage({
            messageId: e.data.messageId,
            response: `Read coordinates as molecule ${coordMolNo}`,
            message: e.data.message,
            result: { coordMolNo: coordMolNo, name: e.data.name }
        })
    }

    else if (e.data.message === 'get_atoms') {
        const theGuid = guid()
        const tempFilename = `./${theGuid}.pdb`
        molecules_container.writePDBASCII(e.data.coordMolNo, tempFilename)
        const pdbData = cootModule.FS.readFile(tempFilename, { encoding: 'utf8' });
        cootModule.FS_unlink(tempFilename)
        postMessage({
            messageId: e.data.messageId,
            response: `Fetched coordinates of molecule ${e.data.coordMolNo}`,
            message: e.data.message,
            result: { coordMolNo: e.data.coordMolNo, pdbData: pdbData }
        })
    }

    else if (e.data.message === 'get_map') {
        const theGuid = guid()
        const tempFilename = `./${theGuid}.map`
        /*
        var fout = new ccp4Module.CCP4MAPfile();
        var outpath = new ccp4Module.Clipper_String(tempFilename);
        fout.open_write(outpath);
        ccp4Module.exportXMapToMapFile(fout, molecules_container[e.data.mapMolNo].xmap);
        */
        molecules_container.writeCCP4Map(e.data.mapMolNo, tempFilename)

        const mapData = cootModule.FS.readFile(tempFilename, { encoding: 'binary' });
        cootModule.FS_unlink(tempFilename)
        postMessage({
            messageId: e.data.messageId,
            response: `Fetched map of map ${e.data.mapMolNo}`,
            message: e.data.message,
            result: { mapMolNo: e.data.mapMolNo, mapData: mapData.buffer }
        })
    }

    else if (e.data.message === 'read_mtz') {
        try {
            const theGuid = guid()
            console.log('e.data.data type', typeof e.data.data, e.data.data.length)
            cootModule.FS_createDataFile(".", `${theGuid}.mtz`, e.data.data, true, true, true);
            const tempFilename = `./${theGuid}.mtz`
            const mapMolNo = molecules_container.read_mtz(tempFilename, 'FWT', 'PHWT', "", false, false)
            cootModule.FS_unlink(tempFilename)
            this.postMessage({
                messageId: e.data.messageId,
                response: `Read map MTZ as molecule ${mapMolNo}`,
                message: e.data.message,
                result: { mapMolNo: mapMolNo, name: e.data.name }
            })
        }
        catch (err) {
            print(err)
        }
    }

    else if (e.data.message === 'flipPeptide') {
        try {
            const {coordMolNo, cid} = e.data
            const [molNo, modelId, chainId, resNo] = cid.split('/')
            const resSpec = new cootModule.residue_spec_t(chainId, parseInt(resNo), "");
            const status = molecules_container.flipPeptide_rs(coordMolNo, resSpec, "")         
            this.postMessage({
                messageId: e.data.messageId,
                response: `Flipped Peptide command ${chainId} ${parseInt(resNo)} return ${status}`,
                message: e.data.message,
                result: {}
            })
        }
        catch (err) {
            print(err)
        }
    }


}