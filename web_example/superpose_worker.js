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
    var contents = e.data[0];
    var selectedFileName = e.data[1];
    var contents2 = e.data[2];
    var selectedFile2Name = e.data[3];

    try {
        CCP4Module.FS_createDataFile(".", selectedFileName, contents, true, true);
    } catch(e) {
    }
    try {
        CCP4Module.FS_createDataFile(".", selectedFile2Name, contents2, true, true);
    } catch(e) {
    }

    var files = new CCP4Module.VectorString();
    //Do not add program name for superpose, only gesamt. I probably should have had the programs behave the same.
    files.push_back("gesamt");
    var sels = new CCP4Module.VectorString();
    files.push_back(selectedFileName);
    files.push_back(selectedFile2Name);
    sels.push_back("dummy");
    sels.push_back("dummy");
    //var result = CCP4Module.superpose(files,sels);
    //Do not do this with superpose!
    files.push_back("-csv");
    files.push_back("out.csv");
    var result = CCP4Module.gesamt(files);
    var csv_out = CCP4Module.FS.readFile("out.csv", { encoding: 'utf8' });
    var json_out = Papa.parse(csv_out);
    
    /*
    //Testing, belongs elsewhere
    var bessel = CCP4Module.gsl_sf_bessel_J0(5.0);
    var hg = CCP4Module.gsl_cdf_hypergeometric_P(4, 7, 19, 13);
    console.log(bessel);
    console.log(hg);
    */

    postMessage(["result",result]);
    postMessage(["csvResult",json_out["data"]]);
}
