// FIXME - Handle mmCIF, data cif, monomers(?)
// FIXME - We may not want multiple modules (CCP4Module,RSRModule) since files have to be loaded into FS of each one.
// FIXME - Does not seem to work in Safari. Importing moorhen.js is *not possible* in a thread on Safari, because it uses
//         Workers internally to do the threading. And Safari does not support nested Workers, not even in technology preview.

let currentTaskName = "";
function rsrPrint(t){
    postMessage({
        messageTag: "output",
        result: t,
        taskName: currentTaskName
    })
}

let CCP4Module;
let RSRModule;
let molecules_container = null;

importScripts('./web_example.js');
importScripts('./pako.js');

createCCP4Module({print: rsrPrint,printErr: rsrPrint})
    .then(function(CCP4Mod) {
             CCP4Module = CCP4Mod;
            })
.catch((e) => {
        console.log("CCP4 problem :(");
        console.log(e);
        });

importScripts('./moorhen.js');

const Lib = {
    locateFile: (file) => file,
    onRuntimeInitialized: () => {
        console.log('onRuntimeInitialized');
    },
    mainScriptUrlOrBlob: "./moorhen.js",
    print: rsrPrint,
    printErr: rsrPrint,
};

createRSRModule(Lib)
    .then(function(CCP4Mod) {
             RSRModule = CCP4Mod;
             molecules_container = new RSRModule.molecules_container_js();
             molecules_container.geometry_init_standard();
             molecules_container.fill_rotamer_probability_tables();
             console.log("##################################################");
             console.log(molecules_container);
             console.log("##################################################");
            })
.catch((e) => {
        console.log("RSR problem :(");
        console.log(e);
        });


let dataObjects = {pdbFiles:{}, mtzFiles:{}, cifFiles:{}};
let dataObjectsNames = {pdbFiles:{}, mtzFiles:{}, cifFiles:{}, ramaInfo:{}, bvalInfo:{}, mol_cont_idx:{}, map_cont_idx:{}, densityFitInfo:{}, rotamersInfo:{}};

function guid(){
    var d = Date.now();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c==='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

//TODO 
// * Make files loaded from PDB available to MiniRSR/Flip and Ramachandran plot. Do not know why they are not ...
// * Create method to get Rama data from a PDB file, 
// * Change dataObjectsNames to globalCache or something
// * Add Rama data to the globalCache

function updateDataObjectsNames(){
    postMessage({
        messageTag: "dataObjectsNames",
        result: dataObjectsNames,
    })
}

function downLoadFiles(files){
    let CIFfiles = [];
    let gzCIFfiles = [];
    let PDBfiles = [];
    let gzPDBfiles = [];
    let MTZfiles = [];

    for(let x=0;x<files.length;x++){
        if(files[x].endsWith(".mtz")){
            MTZfiles.push(files[x]);
        } else if(files[x].endsWith(".pdb")||files[x].endsWith(".ent")){
            PDBfiles.push(files[x]);
        } else if(files[x].endsWith(".cif")){
            CIFfiles.push(files[x]);
        } else if(files[x].endsWith(".pdb.gz")||files[x].endsWith(".ent.gz")){
            gzPDBfiles.push(files[x]);
        } else if(files[x].endsWith(".cif.gz")){
            gzCIFfiles.push(files[x]);
        } else {
            console.log("Unknown file suffix");
        }
    }

    console.log(gzCIFfiles);

    Promise.all(gzCIFfiles.map(function(url) {
        return fetch(url).then(resp => resp.blob()).then(data => [url, data]);
    })).then(results => {
        for(ires=0;ires<results.length;ires++){
            const thisResult = results[ires];
            console.log(thisResult);
            const key = guid();
            //Now gunzip, etc...
        }
    })

    /*
    Promise.all(gzPDBfiles.map(function(file) {
      return fetch(file).then(resp => resp.blob())
        .then(data => [file, data]);
    })).then(function(results){
        for(ires=0;ires<results.length;ires++){
            const thisResult = results[ires];
            console.log(thisResult);
            const key = guid();
            CCP4Module.FS_createDataFile(".", key + ".pdb", thisResult[1], true, true);
            RSRModule.FS_createDataFile(".", key + ".pdb", thisResult[1], true, true);
            //TODO - parsePDB is now in a react-app/src. How do I get at it from here?
            //const dataSplit = thisResult[1].split("\n");
            //const hierarchy = parsePDB(dataSplit,name);
            //dataObjects.pdbFiles[key] = {hierarchy:hierarchy, fileName:key + ".pdb", originalFileName:thisResult[0], contents:thisResult[1]};
            dataObjects.pdbFiles[key] = {fileName:key + ".pdb", originalFileName:thisResult[0], contents:thisResult[1]};
            dataObjectsNames.pdbFiles[key] = {fileName:key + ".pdb", originalFileName:thisResult[0]};
        }
        updateShareArrayBuffer();
    }) .catch(function(err) {
        console.log(err);
    });
    */


}

function loadFiles(files){

    let PDBfiles = [];
    let MTZfiles = [];

    for(let x=0;x<files.length;x++){
        if(files[x].name.endsWith(".mtz")){
            MTZfiles.push(files[x]);
        } else if(files[x].name.endsWith(".pdb")||files[x].name.endsWith(".ent")){
            PDBfiles.push(files[x]);
        }
    }

    Promise.all(PDBfiles.map(function(file) {
      return file.text()
        .then(data => [file.name, data]);
    })).then(function(results){
        for(ires=0;ires<results.length;ires++){
            const thisResult = results[ires];
            const key = guid();
            CCP4Module.FS_createDataFile(".", key + ".pdb", thisResult[1], true, true);
            RSRModule.FS_createDataFile(".", key + ".pdb", thisResult[1], true, true);
            //TODO - parsePDB is now in a react-app/src. How do I get at it from here?
            //const dataSplit = thisResult[1].split("\n");
            //const hierarchy = parsePDB(dataSplit,name);
            //dataObjects.pdbFiles[key] = {hierarchy:hierarchy, fileName:key + ".pdb", originalFileName:thisResult[0], contents:thisResult[1]};
            dataObjects.pdbFiles[key] = {fileName:key + ".pdb", originalFileName:thisResult[0], contents:thisResult[1]};
            dataObjectsNames.pdbFiles[key] = {fileName:key + ".pdb", originalFileName:thisResult[0]};
            const result = molecules_container.read_pdb(key + ".pdb");
            dataObjectsNames.mol_cont_idx[key] = result;
        }
        updateDataObjectsNames();
    }) .catch(function(err) {
        console.log(err);
    });


    Promise.all(MTZfiles.map(function(file) {
      return file.arrayBuffer()
        .then(data => [file.name, data]);
    })).then(function(results){
        for(ires=0;ires<results.length;ires++){
            const thisResult = results[ires];
            const key = guid();
            const byteArray = new Uint8Array(thisResult[1]);
            CCP4Module.FS_createDataFile(".", key + ".mtz", byteArray, true, true);
            RSRModule.FS_createDataFile(".", key + ".mtz", byteArray, true, true);
            dataObjects.mtzFiles[key] = {fileName:key + ".mtz", originalFileName:thisResult[0], contents:byteArray};
            dataObjectsNames.mtzFiles[key] = {fileName:key + ".mtz", originalFileName:thisResult[0]};
            //TODO - work out what columns to use ...
            const f = "FC";
            const phi = "PHIC";
            const wt = "";
            const use_wt = false;
            const is_diff = false;
            const result = molecules_container.read_mtz(key + ".mtz",f,phi,wt,use_wt,is_diff);
            dataObjectsNames.map_cont_idx[key] = result;
        }
        updateDataObjectsNames();
    }).catch(function(err) {
        console.log(err);
    });

}


function getDensityFit(e) {
    console.log(e.data);
    const jobId = e.data.jobId;
    const pdbin = dataObjects.pdbFiles[e.data.pdbinKey].fileName;
    const chainId = e.data["chainId"];
    const hklin = dataObjects.mtzFiles[e.data.hklinKey].fileName;
    const imol_model = dataObjectsNames.mol_cont_idx[e.data.pdbinKey];
    const imol_map = dataObjectsNames.map_cont_idx[e.data.hklinKey];
    console.log(imol_model,imol_map);
    const result = molecules_container.density_fit_analysis(imol_model, imol_map);
    console.log(result);
    const index_for_chain = result.get_index_for_chain(chainId);
    console.log(index_for_chain);
    console.log(result.cviv.get(index_for_chain));
    const resInfo = result.cviv.get(index_for_chain).rviv;
    console.log(resInfo);
    console.log(resInfo.size());
    let resInfoJS = [];
    for(let ir=0;ir<resInfo.size();ir++){
        const CPPchainId = resInfo.get(ir).residue_spec.chain_id;
        const seqNum = resInfo.get(ir).residue_spec.res_no;
        const value = resInfo.get(ir).distortion;
        const insCode = resInfo.get(ir).residue_spec.ins_code;
        //FIXME - It would be nice to know.
        const restype = "UNK";
        const jsres = {chainId:CPPchainId,insCode:insCode,seqNum:seqNum,restype:restype,density_fit:1./value};
        resInfoJS.push(jsres);
    }
    postMessage({
        messageId: e.data.messageId,
        messageTag: "result",
        result: resInfoJS,
        taskName: currentTaskName
    })
}

function getBVals(e) {
    console.log(e.data);
    const jobId = e.data.jobId;
    const pdbin = dataObjects.pdbFiles[e.data.pdbinKey].fileName;
    const chainId = e.data["chainId"];
    const result = RSRModule.getBVals(pdbin,chainId);
    let resInfo = [];
    for(let ir=0;ir<result.size();ir++){
        const cppres = result.get(ir);
        //TODO - Is there a nicer way to do this?
        const jsres = {chainId:cppres.chainId,insCode:cppres.insCode,seqNum:cppres.seqNum,restype:cppres.restype,bval:cppres.property};
        resInfo.push(jsres);
    }
    postMessage({
        messageId: e.data.messageId,
        messageTag: "result",
        result: resInfo,
        taskName: currentTaskName
    })
}

function getRama(e) {
    console.log(e.data);
    const jobId = e.data.jobId;
    const pdbin = dataObjects.pdbFiles[e.data.pdbinKey].fileName;
    const chainId = e.data["chainId"];
    const result = RSRModule.getRamachandranData(pdbin,chainId);
    console.log(result);
    let resInfo = [];
    for(let ir=0;ir<result.size();ir++){
        const cppres = result.get(ir);
        //TODO - Is there a nicer way to do this?
        const jsres = {chainId:cppres.chainId,insCode:cppres.insCode,seqNum:cppres.seqNum,restype:cppres.restype,phi:cppres.phi,psi:cppres.psi,isOutlier:cppres.isOutlier,is_pre_pro:cppres.is_pre_pro};
        resInfo.push(jsres);
    }
    postMessage({
        messageId: e.data.messageId,
        messageTag: "result",
        result: resInfo,
        taskName: currentTaskName
    })
}

function drawMesh(simpleMesh,e) {
    const nVertices = molecules_container.count_simple_mesh_vertices(simpleMesh);
    const vertices = simpleMesh.vertices;
    const nVerticesDirect = vertices.size();
    const triangles = simpleMesh.triangles;
    const nTriangles = triangles.size();
    let totIdxs = [];
    let totPos = [];
    let totNorm = [];
    let totCol = [];
    for(let i=0;i<triangles.size();i++){
        const idxs = triangles.get(i).point_id;
        totIdxs.push(...idxs);
    }
    for(let i=0;i<vertices.size();i++){
        const vert = vertices.get(i);
        totPos.push(...vert.pos);
        totNorm.push(...vert.normal);
        totCol.push(...vert.color);
    }
    const cubeInfo = {prim_types:[["TRIANGLES"]],idx_tri:[[totIdxs]],vert_tri:[[totPos]],norm_tri:[[totNorm]],col_tri:[[totCol]]};
    postMessage({
        messageId: e.data.messageId,
        messageTag: "result",
        result: cubeInfo,
        taskName: currentTaskName
    })
}

function drawDodos(e) {

    //This is not yet used
    //const chainId = e.data["chainId"];

    const idx = dataObjectsNames.mol_cont_idx[e.data.pdbinKey];
    const simpleMesh = molecules_container.get_rotamer_dodecs(idx);
    drawMesh(simpleMesh,e);
}

function drawRamaBalls(e) {

    //This is not yet used
    //const chainId = e.data["chainId"];

    const idx = dataObjectsNames.mol_cont_idx[e.data.pdbinKey];
    const simpleMesh = molecules_container.ramachandran_validation_markup_mesh(idx);
    drawMesh(simpleMesh,e);
}

function drawCube(e) {
    const simpleMesh = molecules_container.test_origin_cube();
    drawMesh(simpleMesh,e);
}


function getRotamers(e) {
    const jobId = e.data.jobId;
    const pdbin = dataObjects.pdbFiles[e.data.pdbinKey].fileName;
    const chainId = e.data["chainId"];

    const rotamersMap = RSRModule.getRotamersMap();

    let rotamersInfo = [];
    const residueList = RSRModule.getResidueListForChain(pdbin,chainId);
    const residueSpecList = RSRModule.getResidueSpecListForChain(pdbin,chainId);
    for(let i=0;i<residueList.size();i++){
        const resRot = rotamersMap.get(residueList.get(i));
        if(resRot){
            let irot = 0;
            let resRots = [];
            for(irot=0;irot<resRot.size();irot++){
                const rotamer = resRot.get(irot);
                const chi1 = rotamer.get_chi(1);
                const chi2 = rotamer.get_chi(2);
                const chi3 = rotamer.get_chi(3);
                const chi4 = rotamer.get_chi(4);
                resRots.push([chi1,chi2,chi3,chi4]);
            }
            rotamersInfo.push({chainId:chainId,seqNum:residueSpecList.get(i).res_no,insCode:residueSpecList.get(i).ins_code,restype:residueList.get(i),data:resRots});
        } else {
            rotamersInfo.push({chainId:chainId,seqNum:residueSpecList.get(i).res_no,insCode:residueSpecList.get(i).ins_code,restype:residueList.get(i),data:[]});
        }
    }
    postMessage({
        messageId: e.data.messageId,
        messageTag: "result",
        result: rotamersInfo,
        taskName: currentTaskName
    })
}

function autoFitRotamer(e) {

    const jobId = e.data.jobId;

    const pdbin = dataObjects.pdbFiles[e.data.pdbinKey].fileName;
    const chainId = e.data["chainId"];
    const resno = e.data["resno"];
    const pdbout = jobId+"out.pdb";
    const imol_model = dataObjectsNames.mol_cont_idx[e.data.pdbinKey];
    const imol_map = dataObjectsNames.map_cont_idx[e.data.hklinKey];

    const resultMolCont = molecules_container.auto_fit_rotamer(imol_model,chainId,resno,"","",imol_map)

    const write_result = molecules_container.writePDBASCII(dataObjectsNames.mol_cont_idx[e.data.pdbinKey],pdbout);
    console.log("result of which is",resultMolCont,write_result);
    var pdb_out = RSRModule.FS.readFile(pdbout, { encoding: 'utf8' });

    //postMessage(["result",result,currentTaskName]);
    postMessage({
        messageId: e.data.messageId,
        messageTag: "result",
        result: resultMolCont,
        taskName: currentTaskName
    })
    postMessage({
        messageId: e.data.messageId,
        messageTag: "pdb_out",
        jobId: jobId,
        result: pdb_out,
        taskName: currentTaskName
    })
}

function flipPeptide(e) {

    const jobId = e.data.jobId;

    const pdbin = dataObjects.pdbFiles[e.data.pdbinKey].fileName;
    const chainId = e.data["chainId"];
    const resno = e.data["resnoFlip"];
    const pdbout = jobId+"out.pdb";

    const resSpec = new RSRModule.residue_spec_t(chainId,resno,"");

    /*
    var result = RSRModule.flipPeptide(pdbin,resSpec,pdbout);
    var pdb_out = RSRModule.FS.readFile(pdbout, { encoding: 'utf8' });
    */

    console.log("Should in fact call molecules_container.flipPeptide_rs with", dataObjectsNames.mol_cont_idx[e.data.pdbinKey]);
    const resultMolCont = molecules_container.flipPeptide_rs(dataObjectsNames.mol_cont_idx[e.data.pdbinKey],resSpec,"");
    const write_result = molecules_container.writePDBASCII(dataObjectsNames.mol_cont_idx[e.data.pdbinKey],pdbout);
    console.log("result of which is",resultMolCont,write_result);
    var pdb_out = RSRModule.FS.readFile(pdbout, { encoding: 'utf8' });

    //postMessage(["result",result,currentTaskName]);
    postMessage({
        messageId: e.data.messageId,
        messageTag: "result",
        result: resultMolCont,
        taskName: currentTaskName
    })
    postMessage({
        messageId: e.data.messageId,
        messageTag: "pdb_out",
        jobId: jobId,
        result: pdb_out,
        taskName: currentTaskName
    })
}

function miniRSR(e) {

    console.log(e.data);

    const jobId = e.data.jobId;

    var args = new RSRModule.VectorString();
    args.push_back("mini_rsr");

    //mini_rsr --pdbin /Users/stuart/CCP4MG_DOWNLOAD/5a3h.pdb --hklin /Users/stuart/CCP4MG_DOWNLOAD/5a3h_final.mtz --pdbout mini_rsr_out.pdb --resno-start 27 --resno-end 37 --chain-id A --debug

    args.push_back("--pdbin");
    args.push_back(dataObjects.pdbFiles[e.data.pdbinKey].fileName);

    args.push_back("--hklin");
    args.push_back(dataObjects.mtzFiles[e.data.hklinKey].fileName);

    args.push_back("--pdbout");
    args.push_back(jobId+"out.pdb");

    args.push_back("--resno-start");
    args.push_back((e.data["resnoStart"]).toString());
    args.push_back("--resno-end");
    args.push_back((e.data["resnoEnd"]).toString());
    args.push_back("--chain-id");
    args.push_back(e.data["chainId"]);

    args.push_back("--debug");

    console.log("Calling");

    var result = RSRModule.mini_rsr(args);
    var pdb_out = RSRModule.FS.readFile(jobId+"out.pdb", { encoding: 'utf8' });
    //TODO We need to store pdb_out! (and cache with updateShareArrayBuffer)
    postMessage({
        messageId: e.data.messageId,
        messageTag: "result",
        result: result,
        taskName: currentTaskName
    })
    postMessage({
        messageId: e.data.messageId,
        messageTag: "pdb_out",
        jobId: jobId,
        result: pdb_out,
        taskName: currentTaskName
    })}


onmessage = function(e) {

    switch(e.data.method){
        case "loadFile":
            console.log("Load file(s)",e.data.files);
            loadFiles(e.data.files);
            break;
        case "loadUrl":
            console.log("Download file(s)",e.data.urls);
            downLoadFiles(e.data.urls);
            break;
        case "get_rama":
            currentTaskName = "get_rama";
            getRama(e);
            currentTaskName = "";
            break;
        case "flip_peptide":
            console.log("Do peptide-flip in cryst worker ...");
            currentTaskName = "flip_peptide";
            flipPeptide(e);
            currentTaskName = "";
            break;
        case "mini_rsr":
            console.log("Do mini-rsr in cryst worker ...");
            currentTaskName = "mini_rsr";
            miniRSR(e);
            currentTaskName = "";
            break;
        case "auto_fit_rotamer":
            console.log("Do auto-fit rotamer in cryst worker ...");
            currentTaskName = "mini_rsr";
            autoFitRotamer(e);
            currentTaskName = "";
            break;
        case "get_bvals":
            currentTaskName = "get_bvals";
            getBVals(e);
            currentTaskName = "";
            break;
        case "density_fit":
            currentTaskName = "density_fit";
            getDensityFit(e);
            currentTaskName = "";
            break;
        case "get_xyz":
            currentTaskName = "get_xyz";
            const pdbRegex = /.pdb$/;
            const pdbKeys = Object.keys(dataObjectsNames.pdbFiles);
            let theData_id;
            if(e.data.resInfo.molKey){
                theData_id = e.data.resInfo.molKey
            } else {
                for(let iobj=0;iobj<pdbKeys.length;iobj++){
                    const data_id = pdbKeys[iobj];
                    const name = dataObjectsNames.pdbFiles[data_id].originalFileName;
                    const shortName = name.replace(pdbRegex,"");
                    if(shortName===e.data.resInfo.molName){
                        console.log("Use",data_id,dataObjects.pdbFiles[data_id]);
                        theData_id = data_id;
                        break;
                    }
                }
            }
            if(theData_id){
                let result;
                if(e.data.resInfo.seqNum){
                    //FIXME - this is almost certainly dodgy. Ignoring insCode is probably a bad idea.
                    result = CCP4Module.getXYZSeqNumInsCode(dataObjects.pdbFiles[theData_id].fileName,e.data.resInfo.chain,e.data.resInfo.seqNum,"");
                } else {
                    result = CCP4Module.getXYZResNo(dataObjects.pdbFiles[theData_id].fileName,e.data.resInfo.chain,e.data.resInfo.resNo);
                }
                if(result.size()===3){
                    postMessage({
                        messageId: e.data.messageId,
                        messageTag: "result",
                        result: [-result.get(0),-result.get(1),-result.get(2)],
                        taskName: currentTaskName
                    })
                }
            }
            currentTaskName = "";
            break;
        case "get_rotamers":
            currentTaskName = "rotamers";
            getRotamers(e);
            currentTaskName = "";
            break;
        case "draw_cube":
            currentTaskName = "draw_cube";
            drawCube(e);
            currentTaskName = "";
            break;
        case "rotamer_dodecs":
            currentTaskName = "rotamer_dodecs";
            drawDodos(e);
            currentTaskName = "";
            break;
        case "rama_balls":
            currentTaskName = "rama_balls";
            drawRamaBalls(e);
            currentTaskName = "";
            break;
        default:
            console.log("default, do nothing",e.data.method);
    }

}
