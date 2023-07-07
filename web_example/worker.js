importScripts('web_example.js');

var Module={preRun:[],postRun:[],print:function(){return function(t){console.log("LOG!!!!");}}(),printErr:function(){return function(t){console.log("LOG!!!!");}}()}

onmessage = function(e) {

    var result = Module.multiply(parseInt(e.data[0]) , parseInt(e.data[1]));
    var workerResult = 'Result: ' + (result);
    
    postMessage(workerResult);
}
