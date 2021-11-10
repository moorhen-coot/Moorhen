var Module={preRun:[],postRun:[],print:function(){return function(t){postMessage(["output",t]);}}(),printErr:function(){return function(t){postMessage(["output",t]);}}()}

importScripts('web_example.js');

onmessage = function(e) {
    var contents = e.data[0];
    var selectedFile = e.data[1];
    var contents2 = e.data[2];
    var selectedFile2 = e.data[3];

    try {
        Module['FS_createDataFile'](".", selectedFile.name, contents, true, true);
    } catch(e) {
    }
    try {
        Module['FS_createDataFile'](".", selectedFile2.name, contents2, true, true);
    } catch(e) {
    }

    var files = new Module.VectorString();
    var sels = new Module.VectorString();
    files.push_back(selectedFile.name);
    files.push_back(selectedFile2.name);
    sels.push_back("dummy");
    sels.push_back("dummy");
    var result = Module.superpose(files,sels);
    Module.printMapStats(result);
    
    postMessage(["result",result]);
}
