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

onmessage = function(e) {
    var contents = e.data[0];
    var selectedFileName = e.data[1];
    var contents2 = e.data[2];
    var cifSelectedFileName = e.data[3];

    try {
        CCP4Module.FS_createDataFile(".", selectedFileName, contents, true, true);
    } catch(e) {
    }
    try {
        CCP4Module.FS_createDataFile(".", cifSelectedFileName, contents2, true, true);
    } catch(e) {
    }

    var result = CCP4Module.initialize_cif_pdb(cifSelectedFileName,selectedFileName,0,0.75);
    CCP4Module.printMapStats(result);
    
    postMessage(["result",result]);
}
