var CCP4Module;

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

function guid(){
    var d = Date.now();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c==='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
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
            console.log(thisResult);
            const key = guid();
            CCP4Module.FS_createDataFile(".", key + ".pdb", thisResult[1], true, true);
            //TODO - parsePDB is now in a react-app/src. How do I get at it from here?
            //const dataSplit = thisResult[1].split("\n");
            //const hierarchy = parsePDB(dataSplit,name);
            //dataObjects.pdbFiles[key] = {hierarchy:hierarchy, fileName:key + ".pdb", originalFileName:thisResult[0], contents:thisResult[1]};
            dataObjects.pdbFiles[key] = {fileName:key + ".pdb", originalFileName:thisResult[0], contents:thisResult[1]};
        }
        console.log(dataObjects);
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

            const header_info = CCP4Module.get_mtz_columns(key + ".mtz");
            console.log(header_info);
            for(let ih=0;ih<header_info.size();ih+=2){
                console.log(header_info.get(ih),header_info.get(ih+1));
            }
            
            dataObjects.mtzFiles[key] = {fileName:key + ".mtz", originalFileName:thisResult[0], contents:byteArray};
        }
        console.log(dataObjects);
    }).catch(function(err) {
        console.log(err);
    });

}

onmessage = function(e) {
    console.log("Hello from everything worker");
    console.log(e);
    switch(e.data.method){
        case "loadFile":
            console.log("Load a file",e.data.files);
            loadFile(e.data.files);
            break;
        default:
            console.log("default, do nothing");
    }
}
