importScripts('web_example.js');

onmessage = function(e) {
    var result = Module.ccall('multiply','number',['number,number'],[e.data[0] , e.data[1]]);
    var workerResult = 'Result: ' + (result);
    
    postMessage(workerResult);
}
