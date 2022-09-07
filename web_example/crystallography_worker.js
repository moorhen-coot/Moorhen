// FIXME - Handle mmCIF, data cif, monomers(?)
// FIXME - We may not want multiple modules (CCP4Module,RSRModule) since files have to be loaded into FS of each one.
// FIXME - Does not seem to work in Safari. Importing mini-rsr-web.js is *not possible* in a thread on Safari, because it uses
//         Workers internally to do the threading. And Safari does not support nested Workers, not even in technology preview.

let currentTaskName = "";
function rsrPrint(t){
    postMessage(["output",t,currentTaskName]);
}

let CCP4Module;
let RSRModule;

importScripts('./web_example.js');
importScripts('./pako.js');

createCCP4Module({print(t){postMessage(["output",t])},printErr(t){postMessage(["output",t]);}})
    .then(function(CCP4Mod) {
             CCP4Module = CCP4Mod;
            })
.catch((e) => {
        console.log("CCP4 problem :(");
        console.log(e);
        });

importScripts('./mini-rsr-web.js');

const Lib = {
    locateFile: (file) => file,
    onRuntimeInitialized: () => {
        console.log('onRuntimeInitialized');
    },
    mainScriptUrlOrBlob: "./mini-rsr-web.js",
    print: rsrPrint,
    printErr: rsrPrint,
};

createRSRModule(Lib)
    .then(function(CCP4Mod) {
             RSRModule = CCP4Mod;
            })
.catch((e) => {
        console.log("RSR problem :(");
        console.log(e);
        });


let dataObjects = {pdbFiles:{}, mtzFiles:{}, cifFiles:{}};
let dataObjectsNames = {pdbFiles:{}, mtzFiles:{}, cifFiles:{}};
let sharedArrayBuffer = null;

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

function updateShareArrayBuffer(){
    if(sharedArrayBuffer){
        const view = new Uint8Array(sharedArrayBuffer);
        const stringified = JSON.stringify(dataObjectsNames);
        const encoder = new TextEncoder();
        const enc_s = encoder.encode(stringified);
        for(let i=0;i<enc_s.length;i++){
            Atomics.store(view,i,enc_s[i]);
        }
        console.log(view,enc_s.length);
    }
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
        }
        updateShareArrayBuffer();
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
        }
        updateShareArrayBuffer();
    }).catch(function(err) {
        console.log(err);
    });

}

function flipPeptide(e) {

    postMessage(["output","This task currently does nothing useful","flip_peptide"]);
    console.log(e.data);
    const jobId = e.data.jobId;

    const pdbin = dataObjects.pdbFiles[e.data.pdbinKey].fileName;
    const chainId = e.data["chainId"];
    const resno = e.data["resnoFlip"];
    const pdbout = jobId+"out.pdb";

    var result = RSRModule.flipPeptide(pdbin,chainId,resno,pdbout);
    var pdb_out = RSRModule.FS.readFile(pdbout, { encoding: 'utf8' });

    postMessage(["result",result,currentTaskName]);
    postMessage(["pdb_out",pdb_out,jobId,currentTaskName]);
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

    postMessage(["result",result,currentTaskName]);
    postMessage(["pdb_out",pdb_out,jobId,currentTaskName]);
}


onmessage = function(e) {

    switch(e.data.method){
        case "setSharedArray":
            sharedArrayBuffer = e.data.buffer;
            updateShareArrayBuffer();
            break;
        case "loadFile":
            console.log("Load file(s)",e.data.files);
            loadFiles(e.data.files);
            break;
        case "loadUrl":
            console.log("Download file(s)",e.data.urls);
            downLoadFiles(e.data.urls);
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
        default:
            console.log("default, do nothing");
    }

}
