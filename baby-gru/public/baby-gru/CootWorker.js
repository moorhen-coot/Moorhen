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

const instancedMeshToMeshData = (instanceMesh, perm) => {

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
    const markup = instanceMesh.markup
    const geomSize = geom.size()
    for (let i = 0; i < geomSize; i++) {
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
        const trianglesSize = triangles.size()
        for (let i = 0; i < trianglesSize; i++) {
            const triangle = triangles.get(i)
            const idxs = triangle.point_id
            if (perm) {
                thisIdxs.push(idxs[0])
                thisIdxs.push(idxs[2])
                thisIdxs.push(idxs[1])
            } else {
                thisIdxs.push(idxs[0])
                thisIdxs.push(idxs[1])
                thisIdxs.push(idxs[2])
            }
        }
        triangles.delete()

        const verticesSize = vertices.size()
        for (let i = 0; i < verticesSize; i++) {
            const vert = vertices.get(i);
            const vertPos = vert.pos
            thisPos.push(vertPos[0])
            thisPos.push(vertPos[1])
            thisPos.push(vertPos[2])
            const vertNormal = vert.normal
            thisNorm.push(vertNormal[0])
            thisNorm.push(vertNormal[1])
            thisNorm.push(vertNormal[2])
            vert.delete()
        }
        vertices.delete()

        const As = inst.instancing_data_A;
        const Asize = As.size();
        if (Asize > 0) {
            for (let j = 0; j < Asize; j++) {
                const inst_data = As.get(j)

                const instDataPosition = inst_data.position
                thisInstance_origins.push(instDataPosition[0])
                thisInstance_origins.push(instDataPosition[1])
                thisInstance_origins.push(instDataPosition[2])

                const instDataColour = inst_data.colour
                thisInstance_colours.push(instDataColour[0])
                thisInstance_colours.push(instDataColour[1])
                thisInstance_colours.push(instDataColour[2])
                thisInstance_colours.push(instDataColour[3])

                const instDataSize = inst_data.size
                thisInstance_sizes.push(instDataSize[0])
                thisInstance_sizes.push(instDataSize[1])
                thisInstance_sizes.push(instDataSize[2])

                thisInstance_orientations.push(...[
                    1.0, 0.0, 0.0, 0.0,
                    0.0, 1.0, 0.0, 0.0,
                    0.0, 0.0, 1.0, 0.0,
                    0.0, 0.0, 0.0, 1.0,
                ])

                inst_data.delete()
            }
        }
        As.delete()

        const Bs = inst.instancing_data_B;
        const Bsize = Bs.size();
        if (Bsize > 0) {
            for (let j = 0; j < Bsize; j++) {
                const inst_data = Bs.get(j)
                const instDataPosition = inst_data.position
                thisInstance_origins.push(instDataPosition[0])
                thisInstance_origins.push(instDataPosition[1])
                thisInstance_origins.push(instDataPosition[2])

                const instDataColour = inst_data.colour
                thisInstance_colours.push(instDataColour[0])
                thisInstance_colours.push(instDataColour[1])
                thisInstance_colours.push(instDataColour[2])
                thisInstance_colours.push(instDataColour[3])

                const instDataSize = inst_data.size
                thisInstance_sizes.push(instDataSize[0])
                thisInstance_sizes.push(instDataSize[1])
                thisInstance_sizes.push(instDataSize[2])

                const instDataOrientation = inst_data.orientation

                thisInstance_orientations.push(instDataOrientation[0][0])
                thisInstance_orientations.push(instDataOrientation[0][1])
                thisInstance_orientations.push(instDataOrientation[0][2])
                thisInstance_orientations.push(instDataOrientation[0][3])

                thisInstance_orientations.push(instDataOrientation[1][0])
                thisInstance_orientations.push(instDataOrientation[1][1])
                thisInstance_orientations.push(instDataOrientation[1][2])
                thisInstance_orientations.push(instDataOrientation[1][3])

                thisInstance_orientations.push(instDataOrientation[2][0])
                thisInstance_orientations.push(instDataOrientation[2][1])
                thisInstance_orientations.push(instDataOrientation[2][2])
                thisInstance_orientations.push(instDataOrientation[2][3])

                thisInstance_orientations.push(instDataOrientation[3][0])
                thisInstance_orientations.push(instDataOrientation[3][1])
                thisInstance_orientations.push(instDataOrientation[3][2])
                thisInstance_orientations.push(instDataOrientation[3][3])

                inst_data.delete()
            }
        }
        Bs.delete()
        inst.delete()

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

    geom.delete()
    const simpleMeshData = simpleMeshToMeshData(markup) // simpleMeshToMeshData should do the "delete"
    instanceMesh.delete()

    if(simpleMeshData.idx_tri.length>0&&simpleMeshData.idx_tri[0].length>0&&simpleMeshData.idx_tri[0][0].length>0){
        return {
            prim_types: [totInstancePrimTypes,simpleMeshData.prim_types[0]],
            idx_tri: [totIdxs,simpleMeshData.idx_tri[0]],
            vert_tri: [totPos,simpleMeshData.vert_tri[0]],
            norm_tri: [totNorm,simpleMeshData.norm_tri[0]],
            col_tri: [totInstance_colours,simpleMeshData.col_tri[0]],
            instance_use_colors: [totInstanceUseColours,null],
            instance_sizes: [totInstance_sizes,null],
            instance_origins: [totInstance_origins,null],
            instance_orientations: [totInstance_orientations,null]
        }
    } else{
        return {
            prim_types: [totInstancePrimTypes],
            idx_tri: [totIdxs],
            vert_tri: [totPos],
            norm_tri: [totNorm],
            col_tri: [totInstance_colours],
            instance_use_colors: [totInstanceUseColours],
            instance_sizes: [totInstance_sizes],
            instance_origins: [totInstance_origins],
            instance_orientations: [totInstance_orientations]
        }
    }
}

const simpleMeshToMeshData = (simpleMesh,perm) => {
    const vertices = simpleMesh.vertices;
    const triangles = simpleMesh.triangles;
    let totIdxs = [];
    let totPos = [];
    let totNorm = [];
    let totCol = [];

    const trianglesSize = triangles.size()
    for (let i = 0; i < trianglesSize; i++) {
        const triangle = triangles.get(i)
        const idxs = triangle.point_id;
        if(perm)
            totIdxs.push(...[idxs[0],idxs[2],idxs[1]]);
        else
            totIdxs.push(...idxs);
    }
    triangles.delete()

    const verticesSize = vertices.size()
    for (let i = 0; i < verticesSize; i++) {
        const vert = vertices.get(i);
        const vertPos = vert.pos
        const vertNormal = vert.normal
        const vertColor = vert.color
        totPos.push(...vertPos);
        if(perm)
            totNorm.push(...[-vertNormal[0],-vertNormal[1],-vertNormal[2]]);
        else
            totNorm.push(...vertNormal);
        totCol.push(...vertColor);
        vert.delete()
    }
    vertices.delete()

    simpleMesh.delete()

    return {
        prim_types: [["TRIANGLES"]],
        idx_tri: [[totIdxs]],
        vert_tri: [[totPos]],
        norm_tri: [[totNorm]],
        col_tri: [[totCol]]
    };
}

const SuperposeResultsToJSArray = (superposeResults) => {   
    const alignmentInfo = superposeResults.alignment_info
    return {
        referenceSequence: superposeResults.alignment.first,
        movingSequence: superposeResults.alignment.second,
        supperposeInfo: superposeResults.suppose_info,
        validationData: validationDataToJSArray(alignmentInfo)
    }
}

const colourRulesToJSArray = (colourRulesArray) => {
    let returnResult = []
    const colourRulesSize = colourRulesArray.size()
    for (let i = 0; i < colourRulesSize; i++) {
        const rule = colourRulesArray.get(i)
        returnResult.push(rule)
    }
    colourRulesArray.delete()
    return returnResult;
}

const floatArrayToJSArray = (floatArray) => {
    let returnResult = []
    const floatArraySize = floatArray.size()
    for (let i = 0; i < floatArraySize; i++) {
        const f = floatArray.get(i)
        returnResult.push(f);
    }
    floatArray.delete()
    return returnResult;
}

const intArrayToJSArray = (intArray) => {
    let returnResult = []
    const intArraySize = intArray.size()
    for (let i = 0; i < intArraySize; i++) {
        const f = intArray.get(i)
        returnResult.push(f);
    }
    intArray.delete()
    return returnResult;
}

const stringArrayToJSArray = (stringArray) => {
    let returnResult = []
    const stringArraySize = stringArray.size()
    for (let i = 0; i < stringArraySize; i++) {
        const s = stringArray.get(i)
        returnResult.push(s);
    }
    stringArray.delete()
    return returnResult;
}

const mmrrccStatsToJSArray = (mmrrccStats) => {
    const parseStats = (stats) => {
        let result = []
        const residueSpecs = stats.keys()
        const mapSize = residueSpecs.size()
        for (let i = 0; i < mapSize; i++) {
            const residueSpec = residueSpecs.get(i)
            const densityCorrStat = stats.get(residueSpec)
            result.push({
                resNum: residueSpec.res_no, 
                insCode: residueSpec.ins_code,
                modelNumber: residueSpec.model_number,
                chainId: residueSpec.chain_id,
                n: densityCorrStat.n,
                correlation: densityCorrStat.correlation()
            })
            residueSpec.delete()
            densityCorrStat.delete()
        }
        residueSpecs.delete()
        return result
    }

    const first = mmrrccStats.first
    const second = mmrrccStats.second

    const returnResult = {
        "All atoms": parseStats(first),
        "Side-chains": parseStats(second)
    }
    
    first.delete()
    second.delete()
    return returnResult
}

const residueSpecToJSArray = (residueSpecs) => {
    let returnResult = []
    const residuesSize = residueSpecs.size()
    for (let ic = 0; ic < residuesSize; ic++) {
        const residue = residueSpecs.get(ic)
        returnResult.push({
            resNum: residue.res_no, 
            insCode: residue.ins_code,
            modelNumber: residue.model_number,
            chainId: residue.chain_id 
        })
        residue.delete()
    }
    residueSpecs.delete()
    return returnResult
}

const validationDataToJSArray = (validationData, chainID) => {
    let returnResult = []
    const cviv = validationData.cviv
    const chainSize = cviv.size()
    for (let chainIndex = 0; chainIndex < chainSize; chainIndex++) {
        const chain = cviv.get(chainIndex)
        if (chain.chain_id === chainID) {
            const resInfo = chain.rviv;
            const resInfoSize = resInfo.size()
            for (let ir = 0; ir < resInfoSize; ir++) {
                const residue = resInfo.get(ir)
                const residueSpec = residue.residue_spec
                returnResult.push({
                    chainId: residueSpec.chain_id,
                    insCode: residueSpec.ins_code,
                    seqNum: residueSpec.res_no,
                    restype: "UNK",
                    value: residue.function_value
                })
                residue.delete()
                residueSpec.delete()
            }
            resInfo.delete()      
        }
        chain.delete()
    }
    cviv.delete()
    validationData.delete()
    return returnResult
}

const interestingPlaceDataToJSArray = (interestingPlaceData) => {
    let returnResult = [];
    const interestingPlaceDataSize = interestingPlaceData.size()
    for (let ir = 0; ir < interestingPlaceDataSize; ir++) {
        const residue = interestingPlaceData.get(ir)
        const residueSpec = residue.residue_spec
        returnResult.push({
            chainId: residueSpec.chain_id,
            insCode: residueSpec.ins_code,
            seqNum: residueSpec.res_no,
            featureType: residue.feature_type,
            featureValue: residue.feature_value,
            buttonLabel: residue.button_label,
            badness: residue.badness,
            coordX: residue.x,
            coordY: residue.y,
            coordZ: residue.z
        })
        residue.delete()
        residueSpec.delete()
    }
    interestingPlaceData.delete()
    return returnResult
}

const ramachandranDataToJSArray = (ramachandraData, chainID) => {
    let returnResult = [];
    const ramachandraDataSize = ramachandraData.size()
    for (let ir = 0; ir < ramachandraDataSize; ir++) {
        const residue = ramachandraData.get(ir)
        const phiPsi = residue.phi_psi
        if (phiPsi.chain_id === chainID) {
            returnResult.push({
                chainId: phiPsi.chain_id,
                insCode: phiPsi.ins_code,
                seqNum: phiPsi.residue_number,
                restype: residue.residue_name,
                isOutlier: !residue.is_allowed_flag,
                phi: phiPsi.phi(),
                psi: phiPsi.psi(),
                is_pre_pro: residue.residue_name === 'PRO'
            })
        }
        residue.delete()
        phiPsi.delete()
    }
    ramachandraData.delete()
    return returnResult
}

const simpleMeshToLineMeshData = (simpleMesh, normalLighting) => {
    const vertices = simpleMesh.vertices;
    const triangles = simpleMesh.triangles;
    let totIdxs = [];
    let totPos = [];
    let totNorm = [];
    let totCol = [];

    const trianglesSize = triangles.size()
    for (let i = 0; i < trianglesSize; i++) {
        const triangle = triangles.get(i)
        const idxs = triangle.point_id;
        totIdxs.push(...[idxs[0], idxs[1], idxs[0], idxs[2], idxs[1], idxs[2]]);
    }
    triangles.delete()

    const verticesSize = vertices.size()
    for (let i = 0; i < verticesSize; i++) {
        const vert = vertices.get(i);
        totPos.push(...vert.pos);
        totNorm.push(...vert.normal);
        totCol.push(...vert.color);
        vert.delete()
    }
    vertices.delete()

    simpleMesh.delete()

    if (normalLighting)
        return { prim_types: [["NORMALLINES"]], useIndices: [[true]], idx_tri: [[totIdxs]], vert_tri: [[totPos]], additional_norm_tri: [[totNorm]], norm_tri: [[totNorm]], col_tri: [[totCol]] };
    else
        return { prim_types: [["LINES"]], useIndices: [[true]], idx_tri: [[totIdxs]], vert_tri: [[totPos]], norm_tri: [[totNorm]], col_tri: [[totCol]] };

}

const read_pdb = (coordData, name) => {
    const theGuid = guid()
    cootModule.FS_createDataFile(".", `${theGuid}.pdb`, coordData, true, true);
    const tempFilename = `./${theGuid}.pdb`
    const molNo = molecules_container.read_pdb(tempFilename)
    cootModule.FS_unlink(tempFilename)
    return molNo
}

const auto_open_mtz = (mtzData) => {
    const theGuid = guid()
    const asUint8Array = new Uint8Array(mtzData)
    cootModule.FS_createDataFile(".", `${theGuid}.mtz`, asUint8Array, true, true);
    const tempFilename = `./${theGuid}.mtz`
    const result = molecules_container.auto_read_mtz(tempFilename)
    cootModule.FS_unlink(tempFilename)
    return result
}

const read_dictionary = (coordData, associatedMolNo) => {
    const theGuid = guid()
    cootModule.FS_createDataFile(".", `${theGuid}.cif`, coordData, true, true);
    const tempFilename = `./${theGuid}.cif`
    const returnVal = molecules_container.import_cif_dictionary(tempFilename, associatedMolNo)
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
    const asUint8Array = new Uint8Array(mtzData.data)
    cootModule.FS_createDataFile(".", `${mtzData.fileName}.mtz`, asUint8Array, true, true);
    const mtzFilename = `./${mtzData.fileName}.mtz`
    const args = [iMol, mtzFilename, F, SIGF, FREE]
    molecules_container.associate_data_mtz_file_with_map(...args)
    return mtzFilename
}

const read_ccp4_map = (mapData, name, isDiffMap) => {
    const theGuid = guid()
    const asUint8Array = new Uint8Array(mapData)
    cootModule.FS_createDataFile(".", `${theGuid}.map`, asUint8Array, true, true);
    const tempFilename = `./${theGuid}.map`
    const read_map_args = [tempFilename, isDiffMap]
    const molNo = molecules_container.read_ccp4_map(...read_map_args)
    cootModule.FS_unlink(tempFilename)
    return molNo
}

onmessage = function (e) {
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

    else if (e.data.message === 'get_mtz_data') {
        const mtzData = cootModule.FS.readFile(e.data.fileName, { encoding: 'binary' });
        postMessage({
            messageId: e.data.messageId,
            myTimeStamp: e.data.myTimeStamp,
            consoleMessage: `Fetched mtz data for map ${e.data.molNo}`,
            message: e.data.message,
            result: { molNo: e.data.molNo, mtzData: mtzData }
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

    else if (e.data.message === 'delete_file_name') {
        const result = cootModule.FS_unlink(e.data.fileName)

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
            else if (command === 'shim_auto_open_mtz') {
                cootResult = auto_open_mtz(...commandArgs)
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
                case 'instanced_mesh_perm':
                    returnResult = instancedMeshToMeshData(cootResult, true)
                    break;
                case 'mmrrcc_stats':
                    returnResult = mmrrccStatsToJSArray(cootResult)
                    break;
                case 'colour_rules':
                    returnResult = colourRulesToJSArray(cootResult)
                    break;
                case 'instanced_mesh':
                    returnResult = instancedMeshToMeshData(cootResult)
                    break;
                case 'mesh_perm':
                    returnResult = simpleMeshToMeshData(cootResult,true)
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
                case 'int_array':
                    returnResult = intArrayToJSArray(cootResult)
                    break;
                case 'string_array':
                    returnResult = stringArrayToJSArray(cootResult)
                    break;
                case 'residue_specs':
                    returnResult = residueSpecToJSArray(cootResult)
                    break;
                case 'ramachandran_data':
                    returnResult = ramachandranDataToJSArray(cootResult, e.data.chainID)
                    break;
                case 'validation_data':
                    returnResult = validationDataToJSArray(cootResult, e.data.chainID)
                    break;
                case 'interesting_places_data':
                    returnResult = interestingPlaceDataToJSArray(cootResult)
                    break;
                case 'superpose_results':
                    returnResult = SuperposeResultsToJSArray(cootResult)
                    break;
                case 'status':
                default:
                    returnResult = cootResult
                    break;
            }

            postMessage({
                returnType, command, message, messageId, myTimeStamp,
                consoleMessage: `Completed ${command} in ${Date.now() - e.data.myTimeStamp} ms`,
                result: { status: 'Completed', result: returnResult }
            })
        }
        catch (err) {
            console.log(err)
            postMessage({
                messageId: e.data.messageId,
                myTimeStamp: e.data.myTimeStamp,
                message: e.data.message,
                consoleMessage: `EXCEPTION RAISED IN ${command}, ${err}`,
                result: { status: 'Exception' }
            })
        }
    }

}
