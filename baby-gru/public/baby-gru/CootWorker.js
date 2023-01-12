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

const instancedMeshToMeshData = (instanceMesh) => {

    let totIdxs = []
    let totPos = []
    let totNorm = []
    let totInstance_sizes = []
    let totInstance_colours = []
    let totInstance_origins = []
    let totInstance_orientations = []
    let totInstanceUseColours = []
    let totInstancePrimTypes = []

    const geom = instanceMesh.geom
    for(let i=0;i<geom.size();i++){
        let thisIdxs = []
        let thisPos = []
        let thisNorm = []
        let thisInstance_sizes = []
        let thisInstance_colours = []
        let thisInstance_origins = []
        let thisInstance_orientations = []
        const inst = geom.get(i);
        const vertices = inst.vertices;
        const triangles = inst.triangles;
        for (let i = 0; i < triangles.size(); i++) {
            const idxs = triangles.get(i).point_id;
            thisIdxs.push(...[idxs[0],idxs[2],idxs[1]]);
        }
        for (let i = 0; i < vertices.size(); i++) {
            const vert = vertices.get(i);
            thisPos.push(...vert.pos);
            thisNorm.push(...vert.normal);
        }
        //Cannot (yet?) cope with mix of type A and B. (I think!)
        if(inst.instancing_data_A.size()>0){
            for(let j=0;j<inst.instancing_data_A.size();j++){
                const inst_data = inst.instancing_data_A.get(j)
                thisInstance_origins.push(...inst_data.position)
                thisInstance_colours.push(...inst_data.colour)
                //Ah! I am assuming one scaling parameter; Coot provides 3.
                thisInstance_sizes.push(inst_data.size[0])
                thisInstance_orientations.push(...[
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0,
                ])
            }
        } else {
        }

        totNorm.push(thisNorm)
        totPos.push(thisPos)
        totIdxs.push(thisIdxs)
        totInstance_sizes.push(thisInstance_sizes)
        totInstance_origins.push(thisInstance_origins)
        totInstance_orientations.push(thisInstance_orientations)
        totInstance_colours.push(thisInstance_colours)
        totInstanceUseColours.push(true)
        totInstancePrimTypes.push("TRIANGLES")

    }

    return { prim_types: [totInstancePrimTypes], idx_tri: [totIdxs], vert_tri: [totPos], norm_tri: [totNorm], col_tri: [totInstance_colours], instance_use_colors:[totInstanceUseColours], instance_sizes:[totInstance_sizes], instance_origins:[totInstance_origins], instance_orientations:[totInstance_orientations]};

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

const floatArrayToJSArray = (floatArray) => {
    let returnResult = []
    for (let i = 0; i < floatArray.size(); i++) {
        returnResult.push(floatArray.get(i));
    }
    return returnResult;
}

const stringArrayToJSArray = (stringArray) => {
    let returnResult = []
    for (let i = 0; i < stringArray.size(); i++) {
        returnResult.push(stringArray.get(i));
    }
    return returnResult;
}

const residueCodesToJSArray = (residueCodes) => {
    let returnResult = []
    for (let ic = 0; ic < residueCodes.size(); ic++) {
        returnResult.push({ "resNum": residueCodes.get(ic).first.res_no, "resCode": residueCodes.get(ic).second })
    }
    return returnResult
}

const validationDataToJSArray = (validationData, chainID) => {
    const chainIndex = validationData.get_index_for_chain(chainID);
    const resInfo = validationData.cviv.get(chainIndex).rviv;

    let returnResult = [];
    for (let ir = 0; ir < resInfo.size(); ir++) {
        returnResult.push({
            chainId: resInfo.get(ir).residue_spec.chain_id,
            insCode: resInfo.get(ir).residue_spec.ins_code,
            seqNum: resInfo.get(ir).residue_spec.res_no,
            restype: "UNK",
            value: resInfo.get(ir).function_value
        });
    }
    return returnResult
}

const interestingPlaceDataToJSArray = (interestingPlaceData) => {

    let returnResult = [];
    for (let ir = 0; ir < interestingPlaceData.size(); ir++) {
        returnResult.push({
            chainId: interestingPlaceData.get(ir).residue_spec.chain_id,
            insCode: interestingPlaceData.get(ir).residue_spec.ins_code,
            seqNum: interestingPlaceData.get(ir).residue_spec.res_no,
            featureType: interestingPlaceData.get(ir).feature_type,
            featureValue: interestingPlaceData.get(ir).feature_value,
            buttonLabel: interestingPlaceData.get(ir).button_label,
            badness: interestingPlaceData.get(ir).badness,
            coordX: interestingPlaceData.get(ir).x,
            coordY: interestingPlaceData.get(ir).y,
            coordZ: interestingPlaceData.get(ir).z
        });
    }
    return returnResult
}

const ramachandranDataToJSArray = (ramachandraData) => {
    let returnResult = [];

    for (let ir = 0; ir < ramachandraData.size(); ir++) {
        returnResult.push({
            chainId: ramachandraData.get(ir).phi_psi.chain_id,
            insCode: ramachandraData.get(ir).phi_psi.ins_code,
            seqNum: ramachandraData.get(ir).phi_psi.residue_number,
            restype: ramachandraData.get(ir).residue_name,
            isOutlier: !ramachandraData.get(ir).is_allowed_flag,
            phi: ramachandraData.get(ir).phi_psi.phi(),
            psi: ramachandraData.get(ir).phi_psi.psi(),
            is_pre_pro: ramachandraData.get(ir).residue_name === 'PRO'
        });
    }
    return returnResult
}

const simpleMeshToLineMeshData = (simpleMesh, normalLighting) => {
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

    if (normalLighting)
        return { prim_types: [["NORMALLINES"]], useIndices: [[true]], idx_tri: [[totIdxs]], vert_tri: [[totPos]], additional_norm_tri: [[totNorm]], norm_tri: [[totNorm]], col_tri: [[totCol]] };
    else
        return { prim_types: [["LINES"]], useIndices: [[true]], idx_tri: [[totIdxs]], vert_tri: [[totPos]], norm_tri: [[totNorm]], col_tri: [[totCol]] };

}

const read_pdb = (coordData, name) => {
    const theGuid = guid()
    cootModule.FS_createDataFile(".", `${theGuid}.pdb`, coordData, true, true);
    const tempFilename = `./${theGuid}.pdb`
    console.log(`Off to read coords into coot ${tempFilename} ${name}`)
    const molNo = molecules_container.read_pdb(tempFilename)
    console.log(`Read coordinates as molecule ${molNo}`)
    cootModule.FS_unlink(tempFilename)
    return molNo
}

const read_dictionary = (coordData, associatedMolNo) => {
    const theGuid = guid()
    cootModule.FS_createDataFile(".", `${theGuid}.cif`, coordData, true, true);
    const tempFilename = `./${theGuid}.cif`
    console.log(`Off to read dictionary into coot ${tempFilename} ${associatedMolNo}`)
    const returnVal = molecules_container.import_cif_dictionary(tempFilename, associatedMolNo)
    console.log(`Read Dictionary with status ${returnVal}`)
    cootModule.FS_unlink(tempFilename)
    return returnVal
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

const new_positions_for_residue_atoms = (molToUpDate, residues) => {
    console.log("committal", molToUpDate, residues)
    let success = 0
    residues.forEach(atoms => {
        if (atoms.length > 0) {
            const cid = atoms[0].resCid
            let movedVector = new cootModule.Vectormoved_atom_t()
            atoms.forEach(atom => {
                const movedAtom = new cootModule.moved_atom_t(atom.name, "", atom.x, atom.y, atom.z, -1)
                movedVector.push_back(movedAtom)
            })
            const thisSuccess = molecules_container.new_positions_for_residue_atoms(molToUpDate, cid, movedVector)
            success += thisSuccess
        }
    })
    console.log("Success?", success)
    return success
}

const read_mtz = (mapData, name, selectedColumns) => {
    const theGuid = guid()
    const asUint8Array = new Uint8Array(mapData)
    cootModule.FS_createDataFile(".", `${theGuid}.mtz`, asUint8Array, true, true);
    const tempFilename = `./${theGuid}.mtz`
    const read_mtz_args = [tempFilename, selectedColumns.F,
        selectedColumns.PHI, "", false, selectedColumns.isDifference]
    //postMessage({ message: `read_mtz args ${read_mtz_args}` })
    const molNo = molecules_container.read_mtz(...read_mtz_args)
    cootModule.FS_unlink(tempFilename)
    return molNo
}

const associate_data_mtz_file_with_map = (iMol, mtzData, F, SIGF, FREE) => {
    const theGuid = guid()
    const asUint8Array = new Uint8Array(mtzData.data)
    cootModule.FS_createDataFile(".", `${theGuid}.mtz`, asUint8Array, true, true);
    const tempFilename = `./${theGuid}.mtz`
    /*associate_data_mtz_file_with_map(int imol, const std::string &data_mtz_file_name,
        const std::string &f_col, const std::string &sigf_col,
        const std::string &free_r_col);
        */
    const args = [iMol, tempFilename, F, SIGF, FREE]

    console.log('associate_data with args', { args })
    return molecules_container.associate_data_mtz_file_with_map(...args)
}

const read_ccp4_map = (mapData, name, isDiffMap) => {
    const theGuid = guid()
    const asUint8Array = new Uint8Array(mapData)
    cootModule.FS_createDataFile(".", `${theGuid}.map`, asUint8Array, true, true);
    const tempFilename = `./${theGuid}.map`
    const read_map_args = [tempFilename, isDiffMap]
    console.log({ read_map_args, length: asUint8Array })
    //postMessage({ message: `read_ccp4_map args ${read_map_args}` })
    const molNo = molecules_container.read_ccp4_map(...read_map_args)
    console.log('Read map into number', molNo)
    cootModule.FS_unlink(tempFilename)
    return molNo
}

onmessage = function (e) {
    //console.log(e.data.message)
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
            molecules_container.set_map_sampling_rate(1.7)
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
        molecules_container.writePDBASCII(e.data.molNo, tempFilename)
        const pdbData = cootModule.FS.readFile(tempFilename, { encoding: 'utf8' });
        cootModule.FS_unlink(tempFilename)
        postMessage({
            messageId: e.data.messageId,
            myTimeStamp: e.data.myTimeStamp,
            consoleMessage: `Fetched coordinates of molecule ${e.data.molNo}`,
            message: e.data.message,
            result: { molNo: e.data.molNo, pdbData: pdbData }
        })
    }

    else if (e.data.message === 'get_map') {
        const theGuid = guid()
        const tempFilename = `./${theGuid}.map`
        molecules_container.writeCCP4Map(e.data.molNo, tempFilename)

        const mapData = cootModule.FS.readFile(tempFilename, { encoding: 'binary' });
        cootModule.FS_unlink(tempFilename)
        postMessage({
            messageId: e.data.messageId,
            myTimeStamp: e.data.myTimeStamp,
            consoleMessage: `Fetched map of map ${e.data.molNo}`,
            message: e.data.message,
            result: { molNo: e.data.molNo, mapData: mapData.buffer }
        })
    }

    else if (e.data.message === 'read_mtz') {
        try {
            const theGuid = guid()
            //console.log('e.data.data type', typeof e.data.data, e.data.data.length)
            cootModule.FS_createDataFile(".", `${theGuid}.mtz`, e.data.data, true, true, true);
            const tempFilename = `./${theGuid}.mtz`
            const molNo = molecules_container.read_mtz(tempFilename, 'FWT', 'PHWT', "", false, false)
            cootModule.FS_unlink(tempFilename)
            postMessage({
                messageId: e.data.messageId,
                myTimeStamp: e.data.myTimeStamp,
                consoleMessage: `Read map MTZ as molecule ${molNo}`,
                message: e.data.message,
                result: { molNo: molNo, name: e.data.name }
            })
        }
        catch (err) {
            print(err)
        }
    }

    else if (e.data.message === 'get_rama') {
        const theGuid = guid()
        const tempFilename = `./${theGuid}.pdb`
        molecules_container.writePDBASCII(e.data.molNo, tempFilename)
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

    else if (e.data.message === 'copy_fragment') {
        const newmolNo = molecules_container.copy_fragment_using_residue_range(e.data.molNo, e.data.chainId, e.data.res_no_start, e.data.res_no_end)

        postMessage({
            messageId: e.data.messageId,
            myTimeStamp: e.data.myTimeStamp,
            messageTag: "result",
            result: newmolNo,
        })
    }

    else if (e.data.message === 'delete') {
        const result = molecules_container.close_molecule(e.data.molNo)

        postMessage({
            messageId: e.data.messageId,
            myTimeStamp: e.data.myTimeStamp,
            messageTag: "result",
            result: result,
        })
    }

    if (e.data.message === 'coot_command') {
        const { returnType, command, commandArgs, message, messageId, myTimeStamp } = e.data
        try {

            /* A debug message to show tht commands are reachng CootWorker
            postMessage({ consoleMessage: `Received ${command} with args ${commandArgs}` })
            */

            /* Here a block of "shims"
            * over time want to reduce these to none
            */
            let cootResult
            if (command === 'shim_read_pdb') {
                cootResult = read_pdb(...commandArgs)
            }
            else if (command === 'shim_new_positions_for_residue_atoms') {
                cootResult = new_positions_for_residue_atoms(...commandArgs)
            }
            else if (command === 'shim_read_mtz') {
                cootResult = read_mtz(...commandArgs)
            }
            else if (command === 'shim_read_ccp4_map') {
                cootResult = read_ccp4_map(...commandArgs)
            }
            else if (command === 'shim_read_dictionary') {
                cootResult = read_dictionary(...commandArgs)
            }
            else if (command === 'shim_associate_data_mtz_file_with_map') {
                cootResult = associate_data_mtz_file_with_map(...commandArgs)
            }
            else {
                cootResult = molecules_container[command](...commandArgs)
            }

            let returnResult;

            switch (returnType) {
                case 'instanced_mesh':
                    returnResult = instancedMeshToMeshData(cootResult)
                    break;
                case 'mesh':
                    returnResult = simpleMeshToMeshData(cootResult)
                    break;
                case 'lit_lines_mesh':
                    returnResult = simpleMeshToLineMeshData(cootResult, true)
                    break;
                case 'lines_mesh':
                    returnResult = simpleMeshToLineMeshData(cootResult, false)
                    break;
                case 'float_array':
                    returnResult = floatArrayToJSArray(cootResult)
                    break;
                case 'string_array':
                    returnResult = stringArrayToJSArray(cootResult)
                    break;
                case 'residue_codes':
                    returnResult = residueCodesToJSArray(cootResult)
                    break;
                case 'ramachandran_data':
                    returnResult = ramachandranDataToJSArray(cootResult)
                    break;
                case 'validation_data':
                    returnResult = validationDataToJSArray(cootResult, e.data.chainID)
                    break;
                case 'interesting_places_data':
                    returnResult = interestingPlaceDataToJSArray(cootResult)
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
            console.log(err)
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
