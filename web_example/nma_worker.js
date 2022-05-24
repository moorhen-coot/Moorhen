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

    let bvals = [];
    let bvals_exptl = [];

    const bval_exptl =  CCP4Module.get_CA_bvalues_from_file(e.data[1]);
    let norm;
    if(nbval>0){
        norm = 0.0;
        for(let i=0;i<nbval;i++){
            const theo_bval = bvalc.get(i);
            const expr_bval = bval_exptl.get(i);
            norm += theo_bval/expr_bval;
        }
        norm /= nbval;
        norm = 1/norm;
    }else{
        norm = 1.0;
    }

    const norm_matrix = CCP4Module.GetCorrelations(nma,norm);

//FIXME - (possible) x should be sequence number?
    for(let i=0;i<nbval;i++){
        bvals.push({x:i+1,y:bvalc.get(i)*norm});
        bvals_exptl.push({x:i+1,y:bval_exptl.get(i)});
    }

    const nrows = norm_matrix.get_rows();
    const ncols = norm_matrix.get_columns();
    let corrMat = {x:[],y:[],z:[]};
    for(let i=0;i<nrows;i++){
        for(let j=0;j<ncols;j++){
            corrMat.x.push(i);
            corrMat.y.push(j);
            corrMat.z.push(norm_matrix.get(i,j));
        }
    }

    let result = 0;
    
    postMessage(["corrMat",corrMat]);
    postMessage(["bvalues",[bvals,bvals_exptl]]);
    postMessage(["result",result]);
}
