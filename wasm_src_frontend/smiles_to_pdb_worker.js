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

function makeRequest (method, url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send();
  });
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function getLoop(lines,loopName_in){
    let loopName = loopName_in+".";
    let inWantedLoop = false;
    let loopLines = [];
    let len = lines.length;
    for(let il=0;il<len;il++){
        let l = lines[il].replace(/(^\s+|\s+$)/g,'');
        if(l === "loop_"||(l.substring(0,1)==="_"&&l.substring(0,loopName.length)!==loopName)){
            if(inWantedLoop){
                break;
            }else{
                if(il<lines.length){
                    if(lines[il+1].substring(0,loopName.length) === loopName){
                        inWantedLoop = true;
                    }
                }
            }
        }else{
            if(inWantedLoop){
                loopLines.push(l);
            }
        }
    }
    return loopLines;
}

function splitQuotedCIFString(stringToSplit){
    if(stringToSplit.length===0) return [];
    return stringToSplit.match(/(?:[^\s"]+|"[^"]*")+/g);
}

function addCIFAtomTypes(resname,cif) {

    let ener_lib_lines = cif.split("\n");
    let libAtomTypes = [];
    let libAtomLines = getLoop(ener_lib_lines,"_chem_comp_atom");
    let atoms = [];
    for(let il=0;il<libAtomLines.length;il++){
        // We are only interested in atom_id and type_energy, so we do not worry about float and int types.
        if(libAtomLines[il].substr(0,1)==="#"||libAtomLines[il].trim()===""){
            continue;
        } else if(libAtomLines[il].substr(0,1)==="_"){
            libAtomTypes.push(libAtomLines[il]);
        } else {
            let split = splitQuotedCIFString(libAtomLines[il]);
            if(split[0]!=="."){
                let atom = {};
                for(let iprop=0;iprop<split.length;iprop++){
                    atom[libAtomTypes[iprop]] = split[iprop];
                }
                atoms.push(atom);
            }
        }
    }
    return atoms;
}

function addCIFBondTypes(resname,cif) {
    let ener_lib_lines = cif.split("\n");
    let libAtomTypes = [];
    let libAtomLines = getLoop(ener_lib_lines,"_chem_comp_bond");
    let bonds = [];
    for(let il=0;il<libAtomLines.length;il++){
        // We are only interested in bond_id, atom_id and type, so we do not worry about float and int types.
        if(libAtomLines[il].substr(0,1)==="#"||libAtomLines[il].trim()===""){
            continue;
        } else if(libAtomLines[il].substr(0,1)==="_"){
            libAtomTypes.push(libAtomLines[il]);
        } else {
            let split = libAtomLines[il].match(/(?:[^\s"]+|"[^"]*")+/g);
            if(split[0]!=="."){
                let bond = {};
                for(let iprop=0;iprop<split.length;iprop++){
                    bond[libAtomTypes[iprop]] = split[iprop];
                }
                if(typeof(bond["_chem_comp_bond.type"])!=="undefined"&&bond["_chem_comp_bond.type"].length>0&&typeof(bond["_chem_comp_bond.comp_id"])!=="undefined"&&bond["_chem_comp_bond.comp_id"].length>0&&typeof(bond["_chem_comp_bond.atom_id_1"])!=="undefined"&&bond["_chem_comp_bond.atom_id_1"].length>0&&typeof(bond["_chem_comp_bond.atom_id_2"])!=="undefined"&&bond["_chem_comp_bond.atom_id_2"].length>0){
                    bonds.push(bond);
                } else if(typeof(bond["_chem_comp_bond.value_order"])!=="undefined"&&bond["_chem_comp_bond.value_order"].length>0&&typeof(bond["_chem_comp_bond.comp_id"])!=="undefined"&&bond["_chem_comp_bond.comp_id"].length>0&&typeof(bond["_chem_comp_bond.atom_id_1"])!=="undefined"&&bond["_chem_comp_bond.atom_id_1"].length>0&&typeof(bond["_chem_comp_bond.atom_id_2"])!=="undefined"&&bond["_chem_comp_bond.atom_id_2"].length>0){
                    if(bond["_chem_comp_bond.pdbx_aromatic_flag"]==="Y"){
                        bond["_chem_comp_bond.type"] = "aromatic";
                    } else if(bond["_chem_comp_bond.value_order"]==="SING"||bond["_chem_comp_bond.value_order"]==="SINGLE"){
                        bond["_chem_comp_bond.type"] = "single";
                    } else if(bond["_chem_comp_bond.value_order"]==="DOUB"||bond["_chem_comp_bond.value_order"]==="DOUBLE"){
                        bond["_chem_comp_bond.type"] = "double";
                    } else if(bond["_chem_comp_bond.value_order"]==="TRIP"||bond["_chem_comp_bond.value_order"]==="TRIPLE"){
                        bond["_chem_comp_bond.type"] = "triple";
                    } else {
                        bond["_chem_comp_bond.type"] = "single";
                    }
                    bonds.push(bond);
                }
            }
        }
    }

    return bonds;
}

function dictToMolBlock(name,dictLines){

    let atoms = addCIFAtomTypes(name,dictLines);
    let bonds = addCIFBondTypes(name,dictLines);

    let nAtoms = atoms.length;
    let nBonds = bonds.length;

    let nAtomsString = ("  " + nAtoms).slice(-3);
    let nBondsString = ("  " + nBonds).slice(-3);

    let molblock = name+`
  CCP4-MonomerLibrary-WebToCif

`

    molblock += nAtomsString+nBondsString+"  0  0  0  0  0  0  0  0999 V2000\n"
    let ncharged = 0;
    let chargeStr = "";
    for(let iat=0;iat<nAtoms;iat++){
        let x = parseFloat(atoms[iat]["_chem_comp_atom.x"]);
        let y = parseFloat(atoms[iat]["_chem_comp_atom.y"]);
        let z = parseFloat(atoms[iat]["_chem_comp_atom.z"]);
        if(atoms[iat]["_chem_comp_atom.charge"]!="."&&atoms[iat]["_chem_comp_atom.charge"]!="0"){
            ncharged++;
            chargeStr += ("   "+(iat+1)).slice(-4)+("   "+atoms[iat]["_chem_comp_atom.charge"]).slice(-4);
        }
        let symbol =  atoms[iat]["_chem_comp_atom.type_symbol"];
        let xString = ("          "+x.toFixed(4)).slice(-10)
        let yString = ("          "+y.toFixed(4)).slice(-10)
        let zString = ("          "+z.toFixed(4)).slice(-10)
        let symbolString = ("   "+symbol).slice(-3);
        molblock += xString+yString+zString+symbolString+"   0  0  0  0  0  0  0  0  0  0  0  0\n";
    }

    for(let ib=0;ib<nBonds;ib++){
        let atom1 = atoms.find(obj => {
                return obj["_chem_comp_atom.atom_id"] === bonds[ib]["_chem_comp_bond.atom_id_1"]
        })
        let atom2 = atoms.find(obj => {
                return obj["_chem_comp_atom.atom_id"] === bonds[ib]["_chem_comp_bond.atom_id_2"]
        })
        let idx1 = atoms.indexOf(atom1);
        let idx2 = atoms.indexOf(atom2);
        let atom1String = ("  " + (idx1+1)).slice(-3);
        let atom2String = ("  " + (idx2+1)).slice(-3);
        let bondType = 1;
        //FIXME - I am not sure this is handled by RDKit.
        if(["_chem_comp_bond.aromatic"] in bonds[ib] && (bonds[ib]["_chem_comp_bond.aromatic"]==='y_XXX'||bonds[ib]["_chem_comp_bond.aromatic"]==='Y_XXX')){
            bondType = 4;
        } else if(["_chem_comp_bond.type"] in bonds[ib] && (bonds[ib]["_chem_comp_bond.type"]==='TRIPLE'||bonds[ib]["_chem_comp_bond.type"]==='triple')) {
            bondType = 3;
        } else if(["_chem_comp_bond.type"] in bonds[ib] && (bonds[ib]["_chem_comp_bond.type"]==='DOUBLE'||bonds[ib]["_chem_comp_bond.type"]==='double')) {
            bondType = 2;
        } else if(["_chem_comp_bond.type"] in bonds[ib] && (bonds[ib]["_chem_comp_bond.type"]==='SINGLE'||bonds[ib]["_chem_comp_bond.type"]==='single')) {
            bondType = 1;
        } else {
            console.log("Unknown bond type");
            console.log(bonds[ib]);
        }
        let bondTypeString = ("  " + (bondType)).slice(-2);

        molblock += atom1String+atom2String+bondTypeString+" 0  0  0  0\n";
    }

    if(ncharged>0){
        molblock += "M  CHG"+(("   "+ncharged).slice(-3))+chargeStr+"\n";
    }
    molblock += "M  END";

    return molblock;

}

onmessage = function(e) {
    let contents = e.data[0];
    let name = e.data[1];

    let promises = [contents];
    let names = [name];

    console.log(promises);

    let svgResult = {};

    if(promises.length>0){
        Promise.all(promises).then((values) => {
            console.log("Do RDKit stuff");
            let mol2 = RDKit.get_mol(values[0]);
            let mol3 = RDKit.get_mol(mol2.add_hs());
            console.log("Done get_mol");
            svgResult[names[0]] = mol3.get_svg();
            console.log("Done get_svg");
            postMessage(["result",svgResult]);
            console.log("Done postMessage");
        }).catch((error) => {
             console.error(error);
             postMessage(["result",svgResult]);
        });
    }


}
