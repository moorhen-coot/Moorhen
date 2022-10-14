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
//    postMessage({ response: JSON.stringify(stuff) })
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
            postMessage({ response: 'Initialized molecules_container', message: e.data.message })
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
        console.log(`Off to read coords into coot ${tempFilename} ${e.data.name}`)
        const coordMolNo = molecules_container.read_pdb(tempFilename)
        console.log(`Read coordinates as molecule ${coordMolNo}`)
        cootModule.FS_unlink(tempFilename)
        postMessage({
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
            postMessage({
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
            console.log('Received flipPeptide', e.data)
            const { coordMolNo, cid } = e.data
            const [molNo, modelId, chainId, resNo] = cid.split('/')
            const resSpec = new cootModule.residue_spec_t(chainId, parseInt(resNo), "");
            const status = molecules_container.flipPeptide_rs(coordMolNo, resSpec, "")
            postMessage({
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

    else if (e.data.message === 'auto_fit_rotamer') {
        /*molecules_container_t::auto_fit_rotamer(int imol,
                                        const std::string &chain_id, int res_no, const std::string &ins_code,
                                        const std::string &alt_conf,
                                        int imol_map) {
        */
        try {
            console.log('Received auto_fit_rotamer', e.data)
            const { coordMolNo, chain_id, res_no, ins_code, alt_conf, mapMolNo } = e.data
            const args = [coordMolNo, chain_id, res_no, ins_code, alt_conf, mapMolNo]
            console.log('args are', ...args)
            const status = molecules_container.auto_fit_rotamer(...args)
            console.log('Status is ', status)
            postMessage({
                messageId: e.data.messageId,
                response: `Autofitted rotamer ${chain_id} ${res_no} return ${status}`,
                message: e.data.message,
                result: {}
            })
        }
        catch (err) {
            print(err)
        }
    }

    else if (e.data.message === 'ramachandran_validation_markup_mesh') {
        try {
            const { coordMolNo } = e.data
            console.log(`Asked for rama validation spheres for mol ${coordMolNo}`)

            //Issue here while ramachandran_validation_markup_mesh not working
            //const simpleMesh = molecules_container.test_origin_cube();
            const simpleMesh = molecules_container.ramachandran_validation_markup_mesh(coordMolNo)

            const meshData = simpleMeshToMeshData(simpleMesh)
            postMessage({
                messageId: e.data.messageId,
                response: `Evaluated ramachandran validation mesh nVertices ${meshData.vert_tri.length / 3
                    }`,
                message: e.data.message,
                result: { meshData, status: "Success" }
            })

        }
        catch (err) {
            postMessage({
                messageId: e.data.messageId,
                response: `Failed with status ${err}`,
                message: e.data.message,
                result: { status: "Failed" }
            })
        }
    }


    else if (e.data.message === 'get_rotamer_dodecs') {
        try {
            const { coordMolNo } = e.data
            console.log(`Asked for rotamer dodecs  for mol ${coordMolNo}`)

            //Issue here while ramachandran_validation_markup_mesh not working
            //const simpleMesh = molecules_container.test_origin_cube();
            const simpleMesh = molecules_container.get_rotamer_dodecs(coordMolNo)
            console.log(simpleMesh)
            const meshData = simpleMeshToMeshData(simpleMesh)
            console.log(meshData)
            postMessage({
                messageId: e.data.messageId,
                response: `Evaluated rotamer validation mesh `,
                message: e.data.message,
                result: { meshData, status: "Success" }
            })

        }
        catch (err) {
            postMessage({
                messageId: e.data.messageId,
                response: `Failed with status ${err}`,
                message: e.data.message,
                result: { status: "Failed" }
            })
        }
    }

    else if (e.data.message === 'get_map_contours_mesh') {
        try {
            const { mapMolNo, x, y, z, radius, contourLevel } = e.data.data
            console.log(mapMolNo, x, y, z, radius, contourLevel, e.data.data)
            console.log(`Asked for coot contour for mol ${mapMolNo}`)

            //Issue here while ramachandran_validation_markup_mesh not working
            //const simpleMesh = molecules_container.test_origin_cube();
            const simpleMesh = molecules_container.get_map_contours_mesh(mapMolNo, x, y, z, radius, contourLevel)
            console.log(simpleMesh)
            const meshData = simpleMeshToMeshData(simpleMesh)
            postMessage({
                messageId: e.data.messageId,
                response: `Evaluated coot cotour mesh nVertices ${meshData.vert_tri.length / 3
                    }`,
                message: e.data.message,
                result: { meshData, status: "Success" }
            })

        }
        catch (err) {
            postMessage({
                messageId: e.data.messageId,
                response: `Failed with status ${err}`,
                message: e.data.message,
                result: { status: "Failed" }
            })
        }
    }


}