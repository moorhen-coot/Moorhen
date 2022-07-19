let CCP4Module;

importScripts('web_example.js');

createCCP4Module({print(t){postMessage(["output",t])},printErr(t){postMessage(["output",t]);}})
    .then(function(CCP4Mod) {
             CCP4Module = CCP4Mod;
            })
.catch((e) => {
        console.log("CCP4 problem :(");
        console.log(e);
        });

let dataObjects = {pdbFiles:{}, mtzFiles:{}};
let dataObjectsNames = {pdbFiles:{}, mtzFiles:{}};
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

function updateShareArrayBuffer(){
    if(sharedArrayBuffer){
        const view = new Uint8Array(sharedArrayBuffer);
        const stringified = JSON.stringify(dataObjectsNames);
        const encoder = new TextEncoder();
        const enc_s = encoder.encode(stringified);
        for(let i=0;i<enc_s.length;i++){
            Atomics.store(view,i,enc_s[i]);
        }
    }
    //This message passing probably isn't necessary for real work. I am just triggering console debugging in main thread.
    postMessage(["updateSharedBuffer"]);
}

function loadFile(files){

    let PDBfiles = [];
    let MTZfiles = [];

    for(let x=0;x<files.length;x++){
        if(files[x].name.endsWith(".mtz")){
            MTZfiles.push(files[x]);
        } else if(files[x].name.endsWith(".pdb")){
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
            dataObjects.mtzFiles[key] = {fileName:key + ".mtz", originalFileName:thisResult[0], contents:byteArray};
            dataObjectsNames.mtzFiles[key] = {fileName:key + ".mtz", originalFileName:thisResult[0]};
        }
        updateShareArrayBuffer();
    }).catch(function(err) {
        console.log(err);
    });

}

onmessage = function(e) {

    switch(e.data.method){
        case "setSharedArray":
            sharedArrayBuffer = e.data.buffer;
            break;
        case "loadFile":
            console.log("Load a file",e.data.files);
            loadFile(e.data.files);
            break;
        default:
            console.log("default, do nothing");
    }

}
