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

    const bvalc = nma.GetBValues();
    const nbval = bvalc.size();
    //FIXME - Need to calculate real norm from exptl. BVals for this. See MG ElasticNetworkModel code.
    const norm = 1;
    const norm_matrix = CCP4Module.GetCorrelations(nma,norm);
    console.log(norm_matrix.get_rows(),norm_matrix.get_columns());

    let bvals = [];

//FIXME - x needs to be sequence number?
    for(let i=0;i<nbval;i++){
        bvals.push({x:i+1,y:bvalc.get(i)});
    }

    const nrows = norm_matrix.get_rows();
    const ncols = norm_matrix.get_columns();
    let corrMat = [];
    for(let i=0;i<nrows;i++){
        for(let j=0;j<ncols;j++){
            corrMat.push(norm_matrix.get(i,j));
        }
    }

    let result = 0;
    
    postMessage(["corrMat",corrMat]);
    postMessage(["bvalues",bvals]);
    postMessage(["result",result]);
}
