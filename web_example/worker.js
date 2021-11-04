importScripts('web_example.js');

onmessage = function(e) {
    var result = Module.multiply(parseInt(e.data[0]) , parseInt(e.data[1]));
    var workerResult = 'Result: ' + (result);
    
    postMessage(workerResult);
}
