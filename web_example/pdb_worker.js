var CCP4Module;
var RDKit;

importScripts('web_example.js','RDKit_minimal.js');

createCCP4Module({print(t){postMessage(["output",t])},printErr(t){postMessage(["output",t]);}})
    .then(function(CCP4Mod) {
             CCP4Module = CCP4Mod;
            })
.catch((e) => {
        console.log("CCP4 problem :(");
        console.log(e);
        });

initRDKitModule({print(t){postMessage(["output",t])},printErr(t){postMessage(["output",t]);}})
    .then(function(RDKitMod) {
             RDKit = RDKitMod;
            })
.catch((e) => {
        console.log("RDKit problem :(");
        console.log(e);
        });

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

onmessage = function(e) {
    var contents = e.data[0];
    var selectedFile = e.data[1];

    try {
        CCP4Module.FS_createDataFile(".", selectedFile.name, contents, true, true);
    } catch(e) {
    }

    var result = CCP4Module.mmdb2_example(selectedFile.name);
    let resultJS = [];
    for(let ir=0;ir<result.size();ir++){
        resultJS.push(result.get(ir));
    }

    var unique = resultJS.filter(onlyUnique);

    // We could extract xyz data for ligands from PDB and combine with dictionary to produce a Mol block (like below).
    // (This is not actually done anywhere yet.)
    // Or we could just the dictionary to create xyz, it should not matter if all we are doing is creating 2D picture.
    var molblock =`702
  -OEChem-02271511112D

  9  8  0     0  0  0  0  0  0999 V2000
    0.5369    0.9749    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    1.4030    0.4749    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.2690    0.9749    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.8015    0.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    1.0044    0.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    1.9590    1.5118    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    2.8059    1.2849    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    2.5790    0.4380    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.6649    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  9  1  0  0  0  0
  2  3  1  0  0  0  0
  2  4  1  0  0  0  0
  2  5  1  0  0  0  0
  3  6  1  0  0  0  0
  3  7  1  0  0  0  0
  3  8  1  0  0  0  0
M  END`
    
    var mol = RDKit.get_mol(molblock);
    postMessage(["result",unique]);
}
