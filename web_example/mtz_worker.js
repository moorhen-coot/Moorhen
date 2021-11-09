var Module={preRun:[],postRun:[],print:function(){return function(t){postMessage(["output",t]);}}(),printErr:function(){return function(t){postMessage(["output",t]);}}()}

importScripts('web_example.js');

onmessage = function(e) {
    var byteCharacters = atob(e.data[0]);
    var selectedFile = e.data[1];

    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    try {
        Module['FS_createDataFile'](".", selectedFile.name, byteArray, true, true);
    } catch(e) {
    }

    var result = Module.clipper_example(selectedFile.name);
    console.log("In the worker...");
    console.log(result);
    console.log(result.cell());
    console.log(result.cell().a());
    Module.printMapStats(result);
    postMessage(["result",result]);
}
