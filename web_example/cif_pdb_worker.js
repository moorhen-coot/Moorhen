var Module={preRun:[],postRun:[],print:function(){return function(t){postMessage(["output",t]);}}(),printErr:function(){return function(t){postMessage(["output",t]);}}()}

importScripts('web_example.js');

onmessage = function(e) {
    var contents = e.data[0];
    var selectedFile = e.data[1];
    var contents2 = e.data[2];
    var cifSelectedFile = e.data[3];

    try {
        Module['FS_createDataFile'](".", selectedFile.name, contents, true, true);
    } catch(e) {
    }
    try {
        Module['FS_createDataFile'](".", cifSelectedFile.name, contents2, true, true);
    } catch(e) {
    }

    var result = Module.initialize_cif_pdb(cifSelectedFile.name,selectedFile.name,0,0.75);
    Module.printMapStats(result);
    
    postMessage(["result",result]);
}
