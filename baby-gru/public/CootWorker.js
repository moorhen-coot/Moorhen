importScripts('./wasm/mini-rsr-web.js')
importScripts('./wasm/web_example.js')

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
    console.log(stuff)
    postMessage({ consoleMessage: JSON.stringify(stuff) })
}

const simpleMeshToMeshData = (simpleMesh) => {
    const vertices = simpleMesh.vertices;
    const triangles = simpleMesh.triangles;
    let totIdxs = [];
    let totPos = [];
    let totNorm = [];
    let totCol = [];
    for (let i = 0; i < triangles.size(); i++) {
        const idxs = triangles.get(i).point_id;
        totIdxs.push(...idxs);
    }
    for (let i = 0; i < vertices.size(); i++) {
        const vert = vertices.get(i);
        totPos.push(...vert.pos);
        totNorm.push(...vert.normal);
        totCol.push(...vert.color);
    }
    return { prim_types: [["TRIANGLES"]], idx_tri: [[totIdxs]], vert_tri: [[totPos]], norm_tri: [[totNorm]], col_tri: [[totCol]] };
}

const simpleMeshToLineMeshData = (simpleMesh) => {
    const vertices = simpleMesh.vertices;
    const triangles = simpleMesh.triangles;
    let totIdxs = [];
    let totPos = [];
    let totNorm = [];
    let totCol = [];
    for (let i = 0; i < triangles.size(); i++) {
        const idxs = triangles.get(i).point_id;
        totIdxs.push(...[idxs[0],idxs[1],idxs[0],idxs[2],idxs[1],idxs[2]]);
    }
    for (let i = 0; i < vertices.size(); i++) {
        const vert = vertices.get(i);
        totPos.push(...vert.pos);
        totNorm.push(...vert.normal);
        totCol.push(...vert.color);
    }
    return { prim_types: [["LINES"]], useIndices: [[true]], idx_tri: [[totIdxs]], vert_tri: [[totPos]], norm_tri: [[totNorm]], col_tri: [[totCol]] };
}

onmessage = function (e) {
    console.log(e.data.message)
    if (e.data.message === 'CootInitialize') {
        postMessage({ message: 'Initializing molecules_container' })

        createRSRModule({
            locateFile: (file) => `./wasm/${file}`,
            onRuntimeInitialized: () => {
                postMessage({ message: 'onRuntimeInitialized' });
            },
            mainScriptUrlOrBlob: "mini-rsr-web.js",
            print: print,
            printErr: print,
        }).then((returnedModule) => {
            cootModule = returnedModule;
            molecules_container = new cootModule.molecules_container_js()
            molecules_container.geometry_init_standard()
            molecules_container.fill_rotamer_probability_tables()
            postMessage({ consoleMessage: 'Initialized molecules_container', message: e.data.message })
        })
            .catch((e) => {
                console.log(e)
                print(e);
            });

        createCCP4Module({
            locateFile: (file) => `./wasm/${file}`,
            onRuntimeInitialized: () => {
                postMessage({ message: 'onRuntimeInitialized' });
            },
            mainScriptUrlOrBlob: "web_example.js",
            print: print,
            printErr: print,
        }).then((returnedModule) => {
            ccp4Module = returnedModule;
            postMessage({ consoleMessage: 'Initialized ccp4Module', message: e.data.message })
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
        console.log(`Off to read coords into coot ${tempFilename} ${e.data.name}`)
        const coordMolNo = molecules_container.read_pdb(tempFilename)
        console.log(`Read coordinates as molecule ${coordMolNo}`)
        cootModule.FS_unlink(tempFilename)
        postMessage({
            messageId: e.data.messageId,
            consoleMessage: `Read coordinates as molecule ${coordMolNo}`,
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
            consoleMessage: `Fetched coordinates of molecule ${e.data.coordMolNo}`,
            message: e.data.message,
            result: { coordMolNo: e.data.coordMolNo, pdbData: pdbData }
        })
    }

    else if (e.data.message === 'get_map') {
        const theGuid = guid()
        const tempFilename = `./${theGuid}.map`
        molecules_container.writeCCP4Map(e.data.mapMolNo, tempFilename)

        const mapData = cootModule.FS.readFile(tempFilename, { encoding: 'binary' });
        cootModule.FS_unlink(tempFilename)
        postMessage({
            messageId: e.data.messageId,
            consoleMessage: `Fetched map of map ${e.data.mapMolNo}`,
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
            postMessage({
                messageId: e.data.messageId,
                consoleMessage: `Read map MTZ as molecule ${mapMolNo}`,
                message: e.data.message,
                result: { mapMolNo: mapMolNo, name: e.data.name }
            })
        }
        catch (err) {
            print(err)
        }
    }


    if (e.data.message === 'coot_command') {
        const { returnType, command, commandArgs, message, messageId } = e.data
        try {
            console.log(command, commandArgs)
            const cootResult = molecules_container[command](...commandArgs)

            let returnResult;
            switch (returnType) {
                case 'mesh':
                    returnResult = simpleMeshToMeshData(cootResult)
                    //returnResult = simpleMeshToLineMeshData(cootResult)
                    break;
                case 'lines_mesh':
                    returnResult = simpleMeshToLineMeshData(cootResult)
                    //returnResult = simpleMeshToLineMeshData(cootResult)
                    break;
                case 'status':
                default:
                    returnResult = cootResult
                    break;
            }
            postMessage({
                messageId: messageId,
                consoleMessage: `Completed ${command} with args ${commandArgs}`,
                message: message,
                result: { status: 'Completed', result: returnResult }
            })
        }
        catch (err) {
            postMessage({
                messageId: messageId,
                consoleMessage: `EXCEPTION RAISED IN ${command} with args ${commandArgs}`,
                message: message,
                result: { status: 'Exception' }
            })
        }
    }


    else if (e.data.message === 'flipPeptide') {
        try {
            console.log('Received flipPeptide', e.data)
            const { coordMolNo, cid } = e.data
            const [molNo, modelId, chainId, resNo] = cid.split('/')
            const resSpec = new cootModule.residue_spec_t(chainId, parseInt(resNo), "");
            const status = molecules_container.flipPeptide_rs(coordMolNo, resSpec, "")
            postMessage({
                messageId: e.data.messageId,
                consoleMessage: `Flipped Peptide command ${chainId} ${parseInt(resNo)} return ${status}`,
                message: e.data.message,
                result: {}
            })
        }
        catch (err) {
            print(err)
        }
    }

}
