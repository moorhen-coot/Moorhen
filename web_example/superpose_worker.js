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
    //Do not add program name for superpose, only gesamt. I probably should have had the programs behave the same.
    args.push_back("gesamt");
    var sels = new CCP4Module.VectorString();

    for(let ifile=0;ifile<e.data[0].length;ifile++){
        try {
            CCP4Module.FS_createDataFile(".", e.data[1][ifile], e.data[0][ifile], true, true);
        } catch(e) {
            //This happens when we supply sme file name on subsequent calls to this function?:w
        }
        args.push_back(e.data[1][ifile]);
        sels.push_back("dummy"); // TODO: Selections are not dealt with yet
    }

    //var result = CCP4Module.superpose(args,sels);
    //Do not do this with superpose!
    args.push_back("-csv");
    args.push_back("out.csv");
    var result = CCP4Module.gesamt(args);
    var csv_out = CCP4Module.FS.readFile("out.csv", { encoding: 'utf8' });
    var json_out = Papa.parse(csv_out);
    
    /*
    //Testing, belongs elsewhere
    var bessel = CCP4Module.gsl_sf_bessel_J0(5.0);
    var hg = CCP4Module.gsl_cdf_hypergeometric_P(4, 7, 19, 13);
    console.log(bessel);
    console.log(hg);
    */

    let csv_data = json_out["data"];
    if(e.data[0].length==2){ // TODO: I haven't thought about parsing multi-align csv yet.
        let inTransformation = false;
        let inAlign = false;
        let alignData = [];
        let transformMatrix = [];
        let iTransform = -1;
        for(let ij=0;ij<csv_data.length;ij++){
            if(inTransformation&&ij<iTransform+4){
                transformMatrix.push(parseFloat(csv_data[ij][0]));
                transformMatrix.push(parseFloat(csv_data[ij][1]));
                transformMatrix.push(parseFloat(csv_data[ij][2]));
                transformMatrix.push(parseFloat(csv_data[ij][3]));
            }
            if(inAlign){
                if(csv_data[ij][0].length>0){
                    let y = parseFloat(csv_data[ij][0]);
                    let x = parseFloat(csv_data[ij][4].trim().split(" ")[csv_data[ij][4].trim().split(" ").length-1]);
                    alignData.push({x:x,y:y});
                }
                if(csv_data[ij].length<5){
                    break;
                }
            }
            if(csv_data[ij].length==4 && csv_data[ij][0].trim()==="Rx" && csv_data[ij][1].trim()==="Ry" && csv_data[ij][2].trim()==="Rz"&& csv_data[ij][3].trim()==="T"){
                inTransformation = true;
                iTransform = ij;
            }
            if(csv_data[ij].length>4 && csv_data[ij][0].trim()==="Dist [A]" && csv_data[ij][3].trim()==="Query" && csv_data[ij][4].trim()==="Target"){
                inAlign = true;
            }
        }
        if(transformMatrix.length==12){
            transformMatrix.push(0.0);
            transformMatrix.push(0.0);
            transformMatrix.push(0.0);
            transformMatrix.push(1.0);
        }
        let cvsResult = {};
        cvsResult["alignData"] = alignData;
        cvsResult["transformMatrices"] = [transformMatrix];
        if(e.data.length>2){
            cvsResult["jobid"] = e.data[2];
        }
        postMessage(["csvResult",cvsResult]);
    } else {
        let inTransformation = false;
        let inAlign = false;
        let alignData = [];
        let transformMatrix = [];
        let transformMatrices = [];
        let iTransform = -1;
        for(let ij=0;ij<csv_data.length;ij++){
            if(inTransformation&&ij<iTransform+4){
                transformMatrix.push(parseFloat(csv_data[ij][0]));
                transformMatrix.push(parseFloat(csv_data[ij][1]));
                transformMatrix.push(parseFloat(csv_data[ij][2]));
                transformMatrix.push(parseFloat(csv_data[ij][3]));
            }
            if(transformMatrix.length==12){
                transformMatrix.push(0.0);
                transformMatrix.push(0.0);
                transformMatrix.push(0.0);
                transformMatrix.push(1.0);
                transformMatrices.push(transformMatrix);
                transformMatrix = [];
                inTransformation = false;
            }
            if(csv_data[ij].length==4 && csv_data[ij][0].trim()==="Rx" && csv_data[ij][1].trim()==="Ry" && csv_data[ij][2].trim()==="Rz"&& csv_data[ij][3].trim()==="T"){
                inTransformation = true;
                iTransform = ij;
            }
            if(inAlign){
                if(csv_data[ij][0].length>0){
                    let y = parseFloat(csv_data[ij][0]);
                    let x = parseFloat(csv_data[ij][1].trim().split(" ")[csv_data[ij][1].trim().split(" ").length-1]);
                    alignData.push({x:x,y:y});
                }
                if(csv_data[ij].length<e.data[0].length+1){
                    break;
                }
            }
            if(csv_data[ij][0].trim()==="Disp.[A]"&&ij>2&&csv_data[ij-2][0].trim()==="RESIDUE ALIGNMENT"){
                inAlign = true;
            }
        }
        let cvsResult = {};
        cvsResult["transformMatrices"] = transformMatrices;
        cvsResult["alignData"] = alignData;
        if(e.data.length>2){
            cvsResult["jobid"] = e.data[2];
        }
        postMessage(["csvResult",cvsResult]);
    }

    postMessage(["result",result]);
}
