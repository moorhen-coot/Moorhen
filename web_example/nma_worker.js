var CCP4Module;

importScripts('web_example.js');
importScripts('papaparse.min.js');

createCCP4Module({print(t){postMessage(["output",t])},printErr(t){postMessage(["output",t]);}})
    .then(function(CCP4Mod) {
             CCP4Module = CCP4Mod;
            })
.catch((e) => {
        console.log("CCP4 problem :(");
        console.log(e);
        });

onmessage = function(e) {

    var args = new CCP4Module.VectorString();

    try {
        CCP4Module.FS_createDataFile(".", e.data[1], e.data[0], true, true);
    } catch(e) {
        //This happens when we supply sme file name on subsequent calls to this function?:w
    }

    var nma = CCP4Module.calculate_normal_modes(e.data[1]);

    console.log(nma);

    let result = 0;
    
    postMessage(["result",result]);
}
