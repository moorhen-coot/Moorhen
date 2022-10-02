importScripts('./mini-rsr-web.js')

let cootModule;
let molecules_container;

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

const Lib = {
    locateFile: (file) => file,
    onRuntimeInitialized: () => {
        postMessage({ message: 'onRuntimeInitialized' });
    },
    mainScriptUrlOrBlob: "./mini-rsr-web.js",
    print: print,
    printErr: print,
};

onmessage = function (e) {
    if (e.data.message === 'CootInitialize') {
        postMessage({ message: 'Initializing molecules_container' })

        createRSRModule(Lib)
            .then((returnedModule) => {
                cootModule = returnedModule;
                molecules_container = new cootModule.molecules_container_js()
                postMessage({ response: 'Initialized molecules_container', message: e.data.message })
            })
            .catch((e) => {
                console.log(e)
                print(e);
            });
    }

    else if (e.data.message === 'read_pdb') {
        const theGuid = guid()
        cootModule.FS_createDataFile(".", `${theGuid}.pdb`, e.data.text, true, true);
        const tempFilename = `./${theGuid}.pdb`
        const coordMolNo = molecules_container.read_pdb(tempFilename)
        cootModule.FS_unlink(tempFilename)
        this.postMessage({
            response: `Read coordinates as molecule ${coordMolNo}`,
            message: e.data.message,
            result: { coordMolNo: coordMolNo, name: e.data.name }
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
                response: `Read map MTZ as molecule ${mapMolNo}`,
                message: e.data.message,
                result: { mapMolNo: mapMolNo, name: e.data.name }
            })
        }
        catch (err) {
            print(err)
        }
    }

}