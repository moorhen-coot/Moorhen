importScripts('./wasm/moorhen.js')
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
        totIdxs.push(...[idxs[0], idxs[1], idxs[0], idxs[2], idxs[1], idxs[2]]);
    }
    for (let i = 0; i < vertices.size(); i++) {
        const vert = vertices.get(i);
        totPos.push(...vert.pos);
        totNorm.push(...vert.normal);
        totCol.push(...vert.color);
    }
    return { prim_types: [["LINES"]], useIndices: [[true]], idx_tri: [[totIdxs]], vert_tri: [[totPos]], norm_tri: [[totNorm]], col_tri: [[totCol]] };
}

const read_pdb = (coordData, name) => {
    const theGuid = guid()
    cootModule.FS_createDataFile(".", `${theGuid}.pdb`, coordData, true, true);
    const tempFilename = `./${theGuid}.pdb`
    console.log(`Off to read coords into coot ${tempFilename} ${name}`)
    const coordMolNo = molecules_container.read_pdb(tempFilename)
    console.log(`Read coordinates as molecule ${coordMolNo}`)
    cootModule.FS_unlink(tempFilename)
    return coordMolNo
}

function base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

const read_mtz = (mapData, name, selectedColumns) => {
    const theGuid = guid()
    const asUint8Array = new Uint8Array(mapData)
    cootModule.FS_createDataFile(".", `${theGuid}.mtz`, asUint8Array, true, true);
    const tempFilename = `./${theGuid}.mtz`
    const mapMolNo = molecules_container.read_mtz(tempFilename, selectedColumns.F,
        selectedColumns.PHI, "", false, false)
    cootModule.FS_unlink(tempFilename)
    return mapMolNo
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
            mainScriptUrlOrBlob: "moorhen.js",
            print: print,
            printErr: print,
        }).then((returnedModule) => {
            cootModule = returnedModule;
            molecules_container = new cootModule.molecules_container_js()
            molecules_container.geometry_init_standard()
            molecules_container.fill_rotamer_probability_tables()
            cootModule.FS.mkdir("COOT_BACKUP");
            postMessage({ consoleMessage: 'Initialized molecules_container', message: e.data.message, messageId: e.data.messageId })
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

    else if (e.data.message === 'get_atoms') {
        const theGuid = guid()
        const tempFilename = `./${theGuid}.pdb`
        molecules_container.writePDBASCII(e.data.coordMolNo, tempFilename)
        const pdbData = cootModule.FS.readFile(tempFilename, { encoding: 'utf8' });
        cootModule.FS_unlink(tempFilename)
        postMessage({
            messageId: e.data.messageId,
            myTimeStamp: e.data.myTimeStamp,
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
            myTimeStamp: e.data.myTimeStamp,
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
                myTimeStamp: e.data.myTimeStamp,
                consoleMessage: `Read map MTZ as molecule ${mapMolNo}`,
                message: e.data.message,
                result: { mapMolNo: mapMolNo, name: e.data.name }
            })
        }
        catch (err) {
            print(err)
        }
    }

    else if (e.data.message === 'get_rama') {
        const theGuid = guid()
        const tempFilename = `./${theGuid}.pdb`
        molecules_container.writePDBASCII(e.data.coordMolNo, tempFilename)
        const result = cootModule.getRamachandranData(tempFilename, e.data.chainId);
        cootModule.FS_unlink(tempFilename)
        let resInfo = [];
        for (let ir = 0; ir < result.size(); ir++) {
            const cppres = result.get(ir);
            //TODO - Is there a nicer way to do this?
            const jsres = { chainId: cppres.chainId, insCode: cppres.insCode, seqNum: cppres.seqNum, restype: cppres.restype, phi: cppres.phi, psi: cppres.psi, isOutlier: cppres.isOutlier, is_pre_pro: cppres.is_pre_pro };
            resInfo.push(jsres);
        }

        postMessage({
            messageId: e.data.messageId,
            myTimeStamp: e.data.myTimeStamp,
            messageTag: "result",
            result: resInfo,
        })
    }

    if (e.data.message === 'coot_command') {
        const { returnType, command, commandArgs, message, messageId, myTimeStamp } = e.data
        try {
            postMessage({ consoleMessage: `Received ${command} with args ${commandArgs}` })
            /* Here a block of "shims"
            * over time want to reduce these to none
            */
            let cootResult
            if (command === 'shim_read_pdb') {
                cootResult = read_pdb(...commandArgs)
            }
            else if (command === 'shim_read_mtz') {
                cootResult = read_mtz(...commandArgs)
            }
            else {
                cootResult = molecules_container[command](...commandArgs)
            }
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
                returnType, command, commandArgs, message, messageId, myTimeStamp,
                consoleMessage: `Completed ${command} with args ${commandArgs} in ${Date.now() - e.data.myTimeStamp} ms`,
                result: { status: 'Completed', result: returnResult }
            })
        }
        catch (err) {
            postMessage({
                messageId: e.data.messageId,
                myTimeStamp: e.data.myTimeStamp,
                message: e.data.message,
                consoleMessage: `EXCEPTION RAISED IN ${command} with args ${commandArgs}, ${err}`,
                result: { status: 'Exception' }
            })
        }
    }

}
