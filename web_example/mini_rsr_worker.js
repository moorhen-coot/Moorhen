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

    var args = new CCP4Module.VectorString();
    args.push_back("mini_rsr");

    //mini_rsr --pdbin /Users/stuart/CCP4MG_DOWNLOAD/5a3h.pdb --hklin /Users/stuart/CCP4MG_DOWNLOAD/5a3h_final.mtz --pdbout mini_rsr_out.pdb --resno-start 27 --resno-end 37 --chain-id A --debug

    try {
        CCP4Module.FS_createDataFile(".", e.data["pdbinData"], e.data["pdbinName"], true, true);
    } catch(e) {
        //This happens when we supply same file name on subsequent calls to this function?
    }
    args.push_back("--pdbin");
    args.push_back(e.data["pdbinName"]);

    try {
        CCP4Module.FS_createDataFile(".", e.data["hklinData"], e.data["hklinName"], true, true);
    } catch(e) {
        //This happens when we supply same file name on subsequent calls to this function?
    }
    args.push_back("--hklin");
    args.push_back(e.data["hklinName"]);

    args.push_back("--pdbout");
    args.push_back("out.pdb");

    args.push_back("--resno-start");
    args.push_back((e.data["resnoStart"]).toString());
    args.push_back("--resno-end");
    args.push_back((e.data["resnoEnd"]).toString());

    args.push_back("--debug");

    var result = CCP4Module.mini_rsr(args);
    var pdb_out = CCP4Module.FS.readFile("out.pdb", { encoding: 'utf8' });

    postMessage(["result",result]);
    postMessage(["pdb_out",pdb_out]);
}
