var Module={preRun:[],postRun:[],print:function(){return function(t){postMessage(["output",t]);}}(),printErr:function(){return function(t){postMessage(["output",t]);}}()}

importScripts('web_example.js');

onmessage = function(e) {
    var contents = e.data[0];
    var selectedFile = e.data[1];

    try {
        Module['FS_createDataFile'](".", selectedFile.name, contents, true, true);
    } catch(e) {
    }

    var result = Module.mmdb2_example(selectedFile.name);
    postMessage(["result",result]);
}
