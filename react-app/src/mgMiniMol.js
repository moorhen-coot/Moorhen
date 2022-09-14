import { guid } from './guid.js';
import {vec3,mat4} from 'gl-matrix/esm';
import pako from 'pako';
import {ener_lib_cif,monomers} from './ener_lib';
import {Cell} from './mgWebGLReadMap';
import {peptideMonomers} from './peptideMonLib';
import {getSymOpsFromSpGrpName,getMatrixFromSymOp} from './symop';
import {base64decode} from './mgBase64'; 

const covalentData = {
"N O":[1.1,1.6],
"N H":[0.8,1.6],
"O H":[0.8,1.6],
"S H":[0.8,1.6],
"C H":[0.9,1.6],
"C C":[1.15,2.0],
"C N":[1.1,2.0],
"N N":[0.9,2.0],
"C O":[1.12,1.63],
"S S":[1.4,2.6],
"P O":[1.35,1.7],
"C S":[1.55,1.9],
"P S":[1.4,2.6],
"S O":[1.3,2.0],
"C CL":[1.65,2.0],
"C F":[1.25,2.0],
"N F":[1.20,1.8],
"N CL":[1.65,2.0],
"P P":[1.85,2.4],
"P F":[1.40,1.7],
"P CL":[1.90,2.3],
"C BR":[1.8,2.1],
"C I":[2.0,2.3],
"F O":[1.3,1.6],
"S F":[1.4,1.7],
"S CL":[1.9,2.2],
"S N":[1.4,2.0],
"H H":[0.6,1.0],
}

const covalentDataSq = {
"N O":[1.21,2.56],
"N H":[0.64,2.56],
"O H":[0.64,2.56],
"S H":[0.64,2.56],
"C H":[0.81,2.56],
"C C":[1.32,4.0],
"C N":[1.21,4.0],
"N N":[0.81,4.0],
"C O":[1.25,2.66],
"S S":[1.96,6.76],
"P O":[1.82,2.89],
"C S":[.24,3.6],
"P S":[1.96,6.76],
"S O":[1.69,4.0],
"C CL":[2.7,4.0],
"C F":[1.56,4.0],
"N F":[1.44,3.24],
"N CL":[2.72,4.0],
"P P":[3.42,5.76],
"P F":[1.96,2.89],
"P CL":[3.61,5.29],
"C BR":[3.24,4.41],
"C I":[4.0,5.29],
"F O":[1.69,2.56],
"S F":[1.96,2.89],
"S CL":[3.61,4.84],
"S N":[1.96,4.0],
"H H":[0.36,1.0],
}

const sequenceAminoThreeLetterMap = {
    "ALA":'A',
    "ARG":'R',
    "ASN":'N',
    "ASP":'D',
    "CYS":'C',
    "GLN":'Q',
    "GLU":'E',
    "GLY":'G',
    "HIS":'H',
    "ILE":'I',
    "LEU":'L',
    "LYS":'K',
    "MET":'M',
    "PHE":'F',
    "PRO":'P',
    "SER":'S',
    "THR":'T',
    "TRP":'W',
    "TYR":'Y',
    "VAL":'V',
    "UNK":'X',
}

const sequenceNucleicThreeLetterMap = {
    "A": "A",
    "T": "T",
    "G": "G",
    "C": "C",
    "U": "U",
    "A": "A",
    "N": "N",
    "I": "I",
    "DT": "T",
    "DG": "G",
    "DC": "C",
    "DA": "A",
    "DU": "U",
    "ADE": "A",
    "THY": "T",
    "GUA": "G",
    "CYT": "C",
    "URA": "U",
    "PSU": "U",
    "UNK":'X',
}

function countPossibleNucleotide(currentSeqRes){
    let nposs_nuc = currentSeqRes.filter(x => x==="A").length +
        currentSeqRes.filter(x => x==="G").length +
        currentSeqRes.filter(x => x==="C").length +
        currentSeqRes.filter(x => x==="T").length +
        currentSeqRes.filter(x => x==="U").length +
        currentSeqRes.filter(x => x==="N").length +
        currentSeqRes.filter(x => x==="I").length +
        currentSeqRes.filter(x => x==="DA").length +
        currentSeqRes.filter(x => x==="DG").length +
        currentSeqRes.filter(x => x==="DC").length +
        currentSeqRes.filter(x => x==="DT").length +
        currentSeqRes.filter(x => x==="DU").length +
        currentSeqRes.filter(x => x==="ADE").length +
        currentSeqRes.filter(x => x==="THY").length +
        currentSeqRes.filter(x => x==="GUA").length +
        currentSeqRes.filter(x => x==="CYT").length +
        currentSeqRes.filter(x => x==="URA").length +
        currentSeqRes.filter(x => x==="PSU").length;
    return nposs_nuc;
}

function vec3Subtract(v1,v2,out){
    if(!out){
        vec3.subtract(v1,v1,v2);
    }else{
        vec3.subtract(out,v1,v2);
    }
}

function vec3Create(v){
    var theVec = vec3.create();
    if(v){
        vec3.set(theVec,v[0],v[1],v[2],v[3]);
    }
    return theVec;
}

function trim27(str) {
  var i,j;
  for (i = 0; i < str.length; i++) {
    if (str[i] === ' ')
    continue; else break;
  }
  for (j = str.length - 1; j >= i; j--) {
    if (str[j] === ' ')
    continue; else break;
  }
  return str.substring(i, j + 1);
}

function addSymmetry(pdbatoms){
    let hier = pdbatoms["atoms"];
    console.log(pdbatoms["cryst"]);
    console.log(pdbatoms["cryst"]["sg"]);

    let symops = getSymOpsFromSpGrpName(pdbatoms["cryst"]["sg"]);
    console.log(symops);

    let symmats = [];
    let invmats = [];
    for(let i=0;i<symops.length;i++){
        let mat = getMatrixFromSymOp(symops[i]);
        let invMat = mat4.create();
        mat4.invert(invMat,mat);
        symmats.push(mat);
        invmats.push(invMat);
    }

    let cell = pdbatoms["cryst"]["cell"];
    console.log(cell);
    let RF = cell.matrix_frac;
    let RO = cell.matrix_orth;

    let centre = [-hier[0].centre()[0],-hier[0].centre()[1],-hier[0].centre()[2]];
    pdbatoms["symmetry"] = {"RO":RO,"RF":RF,"symmats":symmats,"radius":150.0,"centre":centre};
}

function insertAnisou(atoms,anisou){
    for(let j=0;j<anisou.length;j++){
        for(let i=0;i<atoms.length;i++){
            if(typeof(atoms[i]["_atom_site.id"]) !=="undefined" && (atoms[i]["_atom_site.id"] === anisou[j]["_atom_site_anisotrop.id"])){
                atoms[i]["_atom_site_anisotrop.U[1][1]"] = anisou[j]["_atom_site_anisotrop.U[1][1]"];
                atoms[i]["_atom_site_anisotrop.U[1][2]"] = anisou[j]["_atom_site_anisotrop.U[1][2]"];
                atoms[i]["_atom_site_anisotrop.U[1][3]"] = anisou[j]["_atom_site_anisotrop.U[1][3]"];
                atoms[i]["_atom_site_anisotrop.U[2][2]"] = anisou[j]["_atom_site_anisotrop.U[2][2]"];
                atoms[i]["_atom_site_anisotrop.U[2][3]"] = anisou[j]["_atom_site_anisotrop.U[2][3]"];
                atoms[i]["_atom_site_anisotrop.U[3][3]"] = anisou[j]["_atom_site_anisotrop.U[3][3]"];
                break;
            }
        }
    }
}

function atomsToHierarchy(atoms){
    let models = [];
    let chains = {}
    if(atoms.length>0){
        let model = new Model();
        let chain = new Chain();
        let residue = new Residue();
        residue.addAtom(atoms[0]);
        chain.addResidue(residue);
        model.addChain(chain);
        models.push(model);
        chains[chain.getChainID()] = chain;

        for(let i=1;i<atoms.length;i++){
            if(atoms[i]["_atom_site.pdbx_PDB_model_num"]!==model.getModelNum()){
                model = new Model();
                chain = new Chain();
                chains = {};
                residue = new Residue();
                residue.addAtom(atoms[i]);
                chain.addResidue(residue);
                model.addChain(chain);
                models.push(model);
                chains[chain.getChainID()] = chain;
            //} else if(atoms[i]["_atom_site.label_asym_id"]!==chain.getChainID()){
            } else if(atoms[i]["_atom_site.auth_asym_id"]!==chain.getChainID()){
                if(atoms[i]["_atom_site.auth_asym_id"] in chains){
                    chain = chains[atoms[i]["_atom_site.auth_asym_id"]];
                } else {
                    chain = new Chain();
                    chains[atoms[i]["_atom_site.auth_asym_id"]] = chain;
                    model.addChain(chain);
                }
                residue = new Residue();
                residue.addAtom(atoms[i]);
                chain.addResidue(residue);
            } else if(atoms[i].getSeqIDLabel()!==residue.getSeqIDLabel()||atoms[i].getSeqIDAuth()!==residue.getSeqIDAuth()){
                residue = new Residue();
                residue.addAtom(atoms[i]);
                chain.addResidue(residue);
            } else {
                residue.addAtom(atoms[i]);
            }
        }

    }

    //This helps us with spline colouring.
    for(let imod=0;imod<models.length;imod++){
        models[imod].hierarchy = models;
    }

    return models;
}

class EnerLib {
constructor () {
    let ener_lib_lines = ener_lib_cif.split("\n");
    const LIBATOM_FLOAT_PROPS = ["_lib_atom.weight","_lib_atom.vdw_radius","_lib_atom.vdwh_radius","_lib_atom.ion_radius","_lib_atom.surface_potential_charge"];
    const LIBATOM_INT_PROPS = ["_lib_atom.valency","_lib_atom.sp"];
    let libAtomTypes = [];
    let libAtomLines = getLoop(ener_lib_lines,"_lib_atom");
    this.enerLibAtoms = {};
    this.monLibBonds = {};
    this.monLibAtoms = {};
    for(let il=0;il<libAtomLines.length;il++){
        if(libAtomLines[il].substr(0,1)==="#"||libAtomLines[il].trim()===""){
            continue;
        } else if(libAtomLines[il].substr(0,1)==="_"){
            libAtomTypes.push(libAtomLines[il]);
        } else {
            let split = splitQuotedCIFString(libAtomLines[il]);
            if(split[0]!=="."){
                let atom = {};
                for(let iprop=0;iprop<split.length;iprop++){
                    if(LIBATOM_FLOAT_PROPS.indexOf(libAtomTypes[iprop])>-1){
                        try{
                            atom[libAtomTypes[iprop]] = parseFloat(split[iprop]);
                        } catch(e) {
                            atom[libAtomTypes[iprop]] = Number.NaN;
                        }
                    } else if(LIBATOM_INT_PROPS.indexOf(libAtomTypes[iprop])>-1){
                        try{
                            atom[libAtomTypes[iprop]] = parseInt(split[iprop]);
                        } catch(e) {
                            atom[libAtomTypes[iprop]] = Number.NaN;
                        }
                    } else {
                        atom[libAtomTypes[iprop]] = split[iprop];
                    }
                }
                if(typeof(atom["_lib_atom.type"])!=="undefined"&&atom["_lib_atom.type"].length>0){
                    this.enerLibAtoms[atom["_lib_atom.type"]] = atom;
                }
            }
        }
    }
    this.loadAminoAcidAtomTypes();
}

addCIFBondTypes(resname,cif) {
    let ener_lib_lines = cif.split("\n");
    let libAtomTypes = [];
    let libAtomLines = getLoop(ener_lib_lines,"_chem_comp_bond");
    this.monLibBonds[resname] = [];
    for(let il=0;il<libAtomLines.length;il++){
        // We are only interested in bond_id, atom_id and type, so we do not worry about float and int types.
        if(libAtomLines[il].substr(0,1)==="#"||libAtomLines[il].trim()===""){
            continue;
        } else if(libAtomLines[il].substr(0,1)==="_"){
            libAtomTypes.push(libAtomLines[il]);
        } else {
            //let split = splitQuotedCIFString(libAtomLines[il]);
            let split = libAtomLines[il].match(/(?:[^\s"]+|"[^"]*")+/g);
            if(split[0]!=="."){
                let bond = {};
                for(let iprop=0;iprop<split.length;iprop++){
                    bond[libAtomTypes[iprop]] = split[iprop];
                }
                if(typeof(bond["_chem_comp_bond.type"])!=="undefined"&&bond["_chem_comp_bond.type"].length>0&&typeof(bond["_chem_comp_bond.comp_id"])!=="undefined"&&bond["_chem_comp_bond.comp_id"].length>0&&typeof(bond["_chem_comp_bond.atom_id_1"])!=="undefined"&&bond["_chem_comp_bond.atom_id_1"].length>0&&typeof(bond["_chem_comp_bond.atom_id_2"])!=="undefined"&&bond["_chem_comp_bond.atom_id_2"].length>0){
                    this.monLibBonds[resname].push(bond);
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
                    this.monLibBonds[resname].push(bond);
                }
            }
        }
    }
}
    
getMonIDFromCIF(cif) {
    let ener_lib_lines = cif.split("\n");
    let libIDTypes = [];
    let libIDLines = getLoop(ener_lib_lines,"_chem_comp");
    for(let il=0;il<libIDLines.length;il++){
        if(libIDLines[il].substr(0,1)==="#"||libIDLines[il].trim()===""){
            continue;
        } else if(libIDLines[il].substr(0,1)==="_"){
            libIDTypes.push(libIDLines[il]);
        } else {
            //let split = splitQuotedCIFString(libIDLines[il]);
            let split = [];
            if(libIDLines[il].indexOf("'")>-1&&((libIDLines[il].indexOf("'")<libIDLines[il].indexOf('"'))||libIDLines[il].indexOf('"')===-1)){
                split = libIDLines[il].match(/(?:[^\s']+|'[^']*')+/g);
            } else {
                split = libIDLines[il].match(/(?:[^\s"]+|"[^"]*")+/g);
            }
            if(split.length===libIDTypes.length){
                for(let i=0;i<split.length;i++){
                    if(libIDTypes[i]==="_chem_comp.id"){
                        return split[i];
                    }
                }
            }
        }
    }

    for(let il=0;il<ener_lib_lines.length;il++){
        if(ener_lib_lines[il].substring(0,13)==="_chem_comp.id"){
            let split = splitQuotedCIFString(ener_lib_lines[il]);
            return split[1];
        }
    }

    return null;
}

addCIFAtomTypes(resname,cif) {

    let ener_lib_lines = cif.split("\n");
    let libAtomTypes = [];
    let libAtomLines = getLoop(ener_lib_lines,"_chem_comp_atom");
    this.monLibAtoms[resname] = {};
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
                if(typeof(atom["_chem_comp_atom.atom_id"])!=="undefined"&&atom["_chem_comp_atom.atom_id"].length>0&&typeof(atom["_chem_comp_atom.type_energy"])!=="undefined"&&atom["_chem_comp_atom.type_energy"].length>0){
                    this.monLibAtoms[resname][atom["_chem_comp_atom.atom_id"]] = atom["_chem_comp_atom.type_energy"];
                }
            }
        }
    }
}

loadAminoAcidAtomTypes() {
    let aminoAcids = Model.prototype.aminoResidues;
    for(let ia=0;ia<aminoAcids.length;ia++){
        let ener_lib_lines = monomers[aminoAcids[ia]].split("\n");
        let libAtomTypes = [];
        let libAtomLines = getLoop(ener_lib_lines,"_chem_comp_atom");
        this.monLibAtoms[aminoAcids[ia]] = {};
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
                    if(typeof(atom["_chem_comp_atom.atom_id"])!=="undefined"&&atom["_chem_comp_atom.atom_id"].length>0&&typeof(atom["_chem_comp_atom.type_energy"])!=="undefined"&&atom["_chem_comp_atom.type_energy"].length>0){
                        this.monLibAtoms[aminoAcids[ia]][atom["_chem_comp_atom.atom_id"]] = atom["_chem_comp_atom.type_energy"];
                    }
                }
            }
        }
    }
}

AssignHBTypes(atoms,bruteForce){
    if(typeof(atoms.assignedHBTypes)!=="undefined"&&atoms.assignedHBTypes){
        return;
    }
    atoms.assignedHBTypes = true;
    for(let i=0;i<atoms.atoms.length;i++){
        let modelAtoms = atoms.atoms[i].getAllAtoms();
        for(let iat=0;iat<modelAtoms.length;iat++){
            let atType = modelAtoms[iat]["_atom_site.label_atom_id"];
            if(bruteForce){
                if(modelAtoms[iat].element()==="N"||modelAtoms[iat].element()==="O"||modelAtoms[iat].element()==="S"||modelAtoms[iat].element()==="F") {
                    modelAtoms[iat]["_ccp4mg_hb_type"] = "B";
                }
            } else if(typeof(this.monLibAtoms[modelAtoms[iat].residue.getName()])!=="undefined") {
                if(typeof(this.monLibAtoms[modelAtoms[iat].residue.getName()][atType])!=="undefined"){
                    let aliasType = this.monLibAtoms[modelAtoms[iat].residue.getName()][atType];
                    modelAtoms[iat]["_ccp4mg_hb_type"] = this.enerLibAtoms[aliasType]["_lib_atom.hb_type"];
                }
            } else if(typeof(this.enerLibAtoms[atType])!=="undefined"){
                modelAtoms[iat]["_ccp4mg_hb_type"] = ""+this.enerLibAtoms[atType]["_lib_atom.hb_type"];
            } else {
                modelAtoms[iat]["_ccp4mg_hb_type"] = "N";
            }
        }
    }
}

AssignVDWRadii(atoms){
    if(typeof(atoms.assignedVDWRadii)!=="undefined"&&atoms.assignedVDWRadii){
        return;
    }
    atoms.assignedVDWRadii = true;
    for(let i=0;i<atoms.atoms.length;i++){
        let modelAtoms = atoms.atoms[i].getAllAtoms();
        for(let iat=0;iat<modelAtoms.length;iat++){
            let atSymbol = modelAtoms[iat]["_atom_site.type_symbol"];
            //FIXME - Eugh! Can have C atoms named CM1, etc. and be confused with Cm. Sigh, use element if we have it.
            let atType = modelAtoms[iat]["_atom_site.label_atom_id"];
            if(typeof(this.monLibAtoms[modelAtoms[iat].residue.getName()])!=="undefined") {
                if(typeof(this.monLibAtoms[modelAtoms[iat].residue.getName()][atType])!=="undefined"){
                    let aliasType = this.monLibAtoms[modelAtoms[iat].residue.getName()][atType];
                    modelAtoms[iat]["_ccp4mg_vdw_radius"] = parseFloat(this.enerLibAtoms[aliasType]["_lib_atom.vdw_radius"]);
                } else {
                    console.log("FAIL to assign vdw radius");
                    console.log(modelAtoms[iat]);
                    console.log(this.monLibAtoms[modelAtoms[iat].residue.getName()]);
                    console.log(this.monLibAtoms[modelAtoms[iat].residue.getName()]);
                }
            } else if(typeof(this.enerLibAtoms[atSymbol])!=="undefined"){
                modelAtoms[iat]["_ccp4mg_vdw_radius"] = parseFloat(this.enerLibAtoms[atSymbol]["_lib_atom.vdw_radius"]);
            } else {
                let firstDigit = atType.match(/\d/);
                let firstDigitPos = atType.indexOf(firstDigit);
                if(firstDigitPos>0){
                    let elName = atType.substr(0,firstDigitPos);
                    try {
                         modelAtoms[iat]["_ccp4mg_vdw_radius"] = parseFloat(this.enerLibAtoms[elName]["_lib_atom.vdw_radius"]);
                    } catch(e) {
                        modelAtoms[iat]["_ccp4mg_vdw_radius"] = 1.0;
                    }
                }
            }
            //console.log(modelAtoms[iat]["_ccp4mg_vdw_radius"],modelAtoms[iat]["_atom_site.label_atom_id"],modelAtoms[iat]["_atom_site.type_symbol"]);
        }
    }
}
}


class Model{
constructor() {
    this.chains = [];
    this.hasBonds = false;
    this.hbonds = [];
    this.selection_cache = {};
    this.glycan_cache = {};
}

SeekContacts(atoms,atoms2,mindist,maxdist) {

    //let junk = this.SeekContactsSimple(atoms,atoms2,mindist,maxdist);

    let minsq = mindist * mindist;
    let maxsq = maxdist * maxdist;
    let contacts = [];

    //FIXME - We should be able to cope with 1 by non-bricking method.
    if(atoms.length===1||atoms2.length===1) return contacts;

    let abs = Math.abs;
    let sqrt = Math.sqrt;

    let len = atoms.length;
    let len2 = atoms2.length;

    if(maxdist<mindist||len===0||len2===0) return contacts;

    let start = new Date().getTime();
    let minx = 1e+6;
    let miny = 1e+6;
    let minz = 1e+6;
    let maxx = -1e+6;
    let maxy = -1e+6;
    let maxz = -1e+6;
    for(let iat1=0;iat1<len;iat1++){
        let at1 = atoms[iat1];
        let at1x = at1["_atom_site.Cartn_x"];
        let at1y = at1["_atom_site.Cartn_y"];
        let at1z = at1["_atom_site.Cartn_z"];
        if(at1x>maxx) maxx = at1x;
        if(at1x<minx) minx = at1x;
        if(at1y>maxy) maxy = at1y;
        if(at1y<miny) miny = at1y;
        if(at1z>maxz) maxz = at1z;
        if(at1z<minz) minz = at1z;

    }
    for(let iat2=0;iat2<len2;iat2++){
        let at2 = atoms2[iat2];
        let at2x = at2["_atom_site.Cartn_x"];
        let at2y = at2["_atom_site.Cartn_y"];
        let at2z = at2["_atom_site.Cartn_z"];
        if(at2x>maxx) maxx = at2x;
        if(at2x<minx) minx = at2x;
        if(at2y>maxy) maxy = at2y;
        if(at2y<miny) miny = at2y;
        if(at2z>maxz) maxz = at2z;
        if(at2z<minz) minz = at2z;

    }

    if(maxx<minx||maxy<miny||maxz<minz) return contacts;

    //console.log(minx+" "+maxx);
    //console.log(miny+" "+maxx);
    //console.log(minz+" "+maxz);

    let brickSize = 6.0;

    let nbricks_x = parseInt((maxx - minx)/brickSize) + 1;
    let nbricks_y = parseInt((maxy - miny)/brickSize) + 1;
    let nbricks_z = parseInt((maxz - minz)/brickSize) + 1;
    let x_brick = (maxx - minx)/nbricks_x;
    let y_brick = (maxy - miny)/nbricks_y;
    let z_brick = (maxz - minz)/nbricks_z;

    //console.log(nbricks_x);
    //console.log(nbricks_y);
    //console.log(nbricks_z);

    let bricks = [];
    let bricks2 = [];

    for(let zidx=0;zidx<nbricks_z;zidx++){
        for(let yidx=0;yidx<nbricks_y;yidx++){
            for(let xidx=0;xidx<nbricks_x;xidx++){
                let idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                bricks[idx] = [];
                bricks2[idx] = [];
            }
        }
    }

    for(let iat1=0;iat1<len;iat1++){
        let at1 = atoms[iat1];
        let at1x = at1["_atom_site.Cartn_x"];
        let at1y = at1["_atom_site.Cartn_y"];
        let at1z = at1["_atom_site.Cartn_z"];
        let xdiff = at1x - minx;
        let ydiff = at1y - miny;
        let zdiff = at1z - minz;
        let xidx = parseInt(xdiff/x_brick);
        let yidx = parseInt(ydiff/y_brick);
        let zidx = parseInt(zdiff/z_brick);
        if(xidx>=nbricks_x) xidx = nbricks_x - 1;
        if(yidx>=nbricks_y) yidx = nbricks_y - 1;
        if(zidx>=nbricks_z) zidx = nbricks_z - 1;
        let idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
        bricks[idx].push(at1);
    }
    for(let iat2=0;iat2<len2;iat2++){
        let at2 = atoms2[iat2];
        let at2x = at2["_atom_site.Cartn_x"];
        let at2y = at2["_atom_site.Cartn_y"];
        let at2z = at2["_atom_site.Cartn_z"];
        let xdiff = at2x - minx;
        let ydiff = at2y - miny;
        let zdiff = at2z - minz;
        let xidx = parseInt(xdiff/x_brick);
        let yidx = parseInt(ydiff/y_brick);
        let zidx = parseInt(zdiff/z_brick);
        if(xidx>=nbricks_x) xidx = nbricks_x - 1;
        if(yidx>=nbricks_y) yidx = nbricks_y - 1;
        if(zidx>=nbricks_z) zidx = nbricks_z - 1;
        let idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
        bricks2[idx].push(at2);
    }

    for(let zidx=0;zidx<nbricks_z;zidx++){
        for(let yidx=0;yidx<nbricks_y;yidx++){
            for(let xidx=0;xidx<nbricks_x;xidx++){

                let idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                let lenBrick = bricks[idx].length;

                function GetBrickContacts(idx2,contacts){
                    let lenBrick2 = bricks2[idx2].length;
                    //console.log(lenBrick+" "+lenBrick2);
                    //console.log(len+" "+len2);
                    for(let iat1=0;iat1<lenBrick;iat1++){
                        let at1 = bricks[idx][iat1];
                        let at1x = at1["_atom_site.Cartn_x"];
                        let at1y = at1["_atom_site.Cartn_y"];
                        let at1z = at1["_atom_site.Cartn_z"];
                        for(let iat2=0;iat2<lenBrick2;iat2++){
                            let at2  = bricks2[idx2][iat2];
                            let at2x = at2["_atom_site.Cartn_x"];
                            let at1at2x = abs(at1x-at2x);
                            if(at1at2x<=maxdist){
                                let at2y = at2["_atom_site.Cartn_y"];
                                let at1at2y = abs(at1y-at2y);
                                if(at1at2y<=maxdist){
                                    let at2z = at2["_atom_site.Cartn_z"];
                                    let at1at2z = abs(at1z-at2z);
                                    if(at1at2z<=maxdist){
                                        let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                                        if (distsq >= minsq && distsq <= maxsq){
                                            contacts.push([sqrt(distsq), at1, at2]);
                                            //console.log("Add bricks "+at1.getAtomID()+" "+at2.getAtomID());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                // Central
                GetBrickContacts(idx,contacts);
                // -z
                if(zidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                    GetBrickContacts(idx2,contacts);
                }
                // +z
                if(zidx<nbricks_z-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                    GetBrickContacts(idx2,contacts);
                }
                // -y
                if(yidx>0){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickContacts(idx2,contacts);
                }
                // +y
                if(yidx<nbricks_y-1){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickContacts(idx2,contacts);
                }
                // -x
                if(xidx>0){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx-1;
                    GetBrickContacts(idx2,contacts);
                }
                // +x
                if(xidx<nbricks_x-1){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx+1;
                    GetBrickContacts(idx2,contacts);
                }
                // -z-y
                if(zidx>0&&yidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickContacts(idx2,contacts);
                }
                // -z+y
                if(zidx>0&&yidx<nbricks_y-1){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickContacts(idx2,contacts);
                }
                // +z-y
                if(zidx<nbricks_z-1&&yidx>0){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickContacts(idx2,contacts);
                }
                // +z+y
                if(zidx<nbricks_z-1&&yidx<nbricks_y-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickContacts(idx2,contacts);
                }
                // -z-x
                if(zidx>0&&xidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2,contacts);
                }
                // -z+x
                if(zidx>0&&xidx<nbricks_x-1){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2,contacts);
                }
                // +z-x
                if(zidx<nbricks_z-1&&xidx>0){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2,contacts);
                }
                // +z+x
                if(zidx<nbricks_z-1&&xidx<nbricks_x-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2,contacts);
                }
                // -y-x
                if(yidx>0&&xidx>0){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2,contacts);
                }
                // -y+x
                if(yidx>0&&xidx<nbricks_x-1){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2,contacts);
                }
                // +y-x
                if(yidx<nbricks_y-1&&xidx>0){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2,contacts);
                }
                // +y+x
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2,contacts);
                }
                // -y-x+z
                if(yidx>0&&xidx>0&&zidx<nbricks_z-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2,contacts);
                }
                // -y+x+z
                if(yidx>0&&xidx<nbricks_x-1&&zidx<nbricks_z-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2,contacts);
                }
                // +y-x+z
                if(yidx<nbricks_y-1&&xidx>0&&zidx<nbricks_z-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2,contacts);
                }
                // +y+x+z
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1&&zidx<nbricks_z-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2,contacts);
                }
                // -y-x-z
                if(yidx>0&&xidx>0&&zidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2,contacts);
                }
                // -y+x-z
                if(yidx>0&&xidx<nbricks_x-1&&zidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2,contacts);
                }
                // +y-x-z
                if(yidx<nbricks_y-1&&xidx>0&&zidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2,contacts);
                }
                // +y+x-z
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1&&zidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2,contacts);
                }
            }
        }
    }

    function fixAltLocs(acontact){
        let at1 = acontact[1];
        let altLoc = at1["_atom_site.label_alt_id"];
        if(altLoc!=="*"&&altLoc!=="?"&&altLoc!==" "&&altLoc!=="."){
            let at2  = acontact[2];
            let altLoc2 = at2["_atom_site.label_alt_id"];
            if(altLoc2==="*"||altLoc2==="?"||altLoc2===" "||altLoc2==="."||altLoc2===altLoc){
                return true;
            } else {
                return false;
            }
        }
        return true;
    }

    contacts = contacts.filter(fixAltLocs);
    console.log("Time to make bricks (seek contacts): "+(new Date().getTime()-start));

    //console.log(bricks);

    return contacts;
    
}

getBondsContactsAndSingletons(atomsIn) {
    this.calculateBonds();

    let contacts = [];
    let singletons = [];

    let atoms;
    if(typeof(atomsIn)==="undefined"){
        atoms = this.getAllAtoms();
    } else {
        atoms = atomsIn;
    }

    let len = atoms.length;
    for(let iat1=0;iat1<len;iat1++){
        let at1 = atoms[iat1];
        let bonds = at1.bonds;
        let lenbonds = bonds.length;
        for(let j=0;j<lenbonds;j++){
            let at2 = bonds[j];
            contacts.push([1.0,at1,at2]);
        }
        if(lenbonds===0){
            singletons.push(at1);
        }
    }
    let ret = {};
    ret["contacts"] = contacts;
    ret["singletons"] = singletons;
    return ret;
}

calculateBonds() {

    if(this.hasBonds){
        return;
    }

    let abs = Math.abs;

    let mindist = 0.6;
    let maxdist = 1.8;
    let minsq = mindist * mindist;
    let maxsq = maxdist * maxdist;

    let atoms = this.getAllAtoms();
    let len = atoms.length;

    let start = new Date().getTime();
    let minx = 1e+6;
    let miny = 1e+6;
    let minz = 1e+6;
    let maxx = -1e+6;
    let maxy = -1e+6;
    let maxz = -1e+6;
    for(let iat1=0;iat1<len;iat1++){
        let at1 = atoms[iat1];
        let at1x = at1["_atom_site.Cartn_x"];
        let at1y = at1["_atom_site.Cartn_y"];
        let at1z = at1["_atom_site.Cartn_z"];
        if(at1x>maxx) maxx = at1x;
        if(at1x<minx) minx = at1x;
        if(at1y>maxy) maxy = at1y;
        if(at1y<miny) miny = at1y;
        if(at1z>maxz) maxz = at1z;
        if(at1z<minz) minz = at1z;

    }
    //console.log(minx+" "+maxx);
    //console.log(miny+" "+maxx);
    //console.log(minz+" "+maxz);

    let brickSize = 6.0;

    let nbricks_x = parseInt((maxx - minx)/brickSize) + 1;
    let nbricks_y = parseInt((maxy - miny)/brickSize) + 1;
    let nbricks_z = parseInt((maxz - minz)/brickSize) + 1;
    let x_brick = (maxx - minx)/nbricks_x;
    let y_brick = (maxy - miny)/nbricks_y;
    let z_brick = (maxz - minz)/nbricks_z;

    //console.log(nbricks_x);
    //console.log(nbricks_y);
    //console.log(nbricks_z);

    let bricks = [];

    for(let zidx=0;zidx<nbricks_z;zidx++){
        for(let yidx=0;yidx<nbricks_y;yidx++){
            for(let xidx=0;xidx<nbricks_x;xidx++){
                let idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                bricks[idx] = [];
            }
        }
    }

    for(let iat1=0;iat1<len;iat1++){
        let at1 = atoms[iat1];
        let at1x = at1["_atom_site.Cartn_x"];
        let at1y = at1["_atom_site.Cartn_y"];
        let at1z = at1["_atom_site.Cartn_z"];
        let xdiff = at1x - minx;
        let ydiff = at1y - miny;
        let zdiff = at1z - minz;
        let xidx = parseInt(xdiff/x_brick);
        let yidx = parseInt(ydiff/y_brick);
        let zidx = parseInt(zdiff/z_brick);
        if(xidx>=nbricks_x) xidx = nbricks_x - 1;
        if(yidx>=nbricks_y) yidx = nbricks_y - 1;
        if(zidx>=nbricks_z) zidx = nbricks_z - 1;
        let idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
        bricks[idx].push(at1);
    }

    for(let zidx=0;zidx<nbricks_z;zidx++){
        for(let yidx=0;yidx<nbricks_y;yidx++){
            for(let xidx=0;xidx<nbricks_x;xidx++){

                let idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx; // FIXME ??? SHOULD THIS NOT BE nbricks_x*nbricks_y ??? And 2 cases above.
                let lenBrick = bricks[idx].length;
                for(let iat1=0;iat1<lenBrick;iat1++){
                    let at1 = bricks[idx][iat1];
                    let at1x = at1["_atom_site.Cartn_x"];
                    let at1y = at1["_atom_site.Cartn_y"];
                    let at1z = at1["_atom_site.Cartn_z"];
                    for(let iat2=iat1+1;iat2<lenBrick;iat2++){
                        let at2  = bricks[idx][iat2];
                        let at2x = at2["_atom_site.Cartn_x"];
                        let at1at2x = abs(at1x-at2x);
                        if(at1at2x<=maxdist){
                            let at2y = at2["_atom_site.Cartn_y"];
                            let at1at2y = abs(at1y-at2y);
                            if(at1at2y<=maxdist){
                                let at2z = at2["_atom_site.Cartn_z"];
                                let at1at2z = abs(at1z-at2z);
                                if(at1at2z<=maxdist){
                                    let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                                    if (distsq >= minsq && distsq <= maxsq){
                                        let aLoc1 = at1["_atom_site.label_alt_id"];
                                        let aLoc2 = at2["_atom_site.label_alt_id"];
                                        if((aLoc1==="*"||aLoc1==="?"||aLoc1===" "||aLoc1===".")||(aLoc2==="*"||aLoc2==="?"||aLoc2===" "||aLoc2===".")||(aLoc2===aLoc1)){
                                            if(at1["_atom_site.type_symbol"]+' '+at2["_atom_site.type_symbol"] in covalentDataSq && 
                                                ((distsq>covalentDataSq[at1["_atom_site.type_symbol"]+' '+at2["_atom_site.type_symbol"]][1])
                                                ||(distsq<covalentDataSq[at1["_atom_site.type_symbol"]+' '+at2["_atom_site.type_symbol"]][0])
                                                )){
                                            } else if(at2["_atom_site.type_symbol"]+' '+at1["_atom_site.type_symbol"] in covalentDataSq && 
                                                ((distsq>covalentDataSq[at2["_atom_site.type_symbol"]+' '+at1["_atom_site.type_symbol"]][1])
                                                ||(distsq<covalentDataSq[at2["_atom_site.type_symbol"]+' '+at1["_atom_site.type_symbol"]][0])
                                                )){
                                            } else {
                                                at1.bonds.push(at2);
                                                at2.bonds.push(at1);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                function GetBrickBonds(idx2){
                    let lenBrick2 = bricks[idx2].length;
                    for(let iat1=0;iat1<lenBrick;iat1++){
                        let at1 = bricks[idx][iat1];
                        let at1x = at1["_atom_site.Cartn_x"];
                        let at1y = at1["_atom_site.Cartn_y"];
                        let at1z = at1["_atom_site.Cartn_z"];
                        for(let iat2=0;iat2<lenBrick2;iat2++){
                            let at2  = bricks[idx2][iat2];
                            let at2x = at2["_atom_site.Cartn_x"];
                            let at1at2x = abs(at1x-at2x);
                            if(at1at2x<=maxdist){
                                let at2y = at2["_atom_site.Cartn_y"];
                                let at1at2y = abs(at1y-at2y);
                                if(at1at2y<=maxdist){
                                    let at2z = at2["_atom_site.Cartn_z"];
                                    let at1at2z = abs(at1z-at2z);
                                    if(at1at2z<=maxdist){
                                        let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                                        if (distsq >= minsq && distsq <= maxsq){
                                            let aLoc1 = at1["_atom_site.label_alt_id"];
                                            let aLoc2 = at2["_atom_site.label_alt_id"];
                                            if((aLoc1==="*"||aLoc1==="?"||aLoc1===" "||aLoc1===".")||(aLoc2==="*"||aLoc2==="?"||aLoc2===" "||aLoc2===".")||(aLoc2===aLoc1)){
                                                if(at1["_atom_site.type_symbol"]+' '+at2["_atom_site.type_symbol"] in covalentDataSq && 
                                                        ((distsq>covalentDataSq[at1["_atom_site.type_symbol"]+' '+at2["_atom_site.type_symbol"]][1])
                                                         ||(distsq<covalentDataSq[at1["_atom_site.type_symbol"]+' '+at2["_atom_site.type_symbol"]][0])
                                                        )){
                                                } else if(at2["_atom_site.type_symbol"]+' '+at1["_atom_site.type_symbol"] in covalentDataSq && 
                                                        ((distsq>covalentDataSq[at2["_atom_site.type_symbol"]+' '+at1["_atom_site.type_symbol"]][1])
                                                         ||(distsq<covalentDataSq[at2["_atom_site.type_symbol"]+' '+at1["_atom_site.type_symbol"]][0])
                                                        )){
                                                } else {
                                                    at1.bonds.push(at2);
                                                    at2.bonds.push(at1);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                // -z
                if(zidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // +z
                if(zidx<nbricks_z-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // -y
                if(yidx>0){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // +y
                if(yidx<nbricks_y-1){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // -x
                if(xidx>0){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx-1;
                    GetBrickBonds(idx2);
                }
                // +x
                if(xidx<nbricks_x-1){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx+1;
                    GetBrickBonds(idx2);
                }
                // -z-y
                if(zidx>0&&yidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // -z+y
                if(zidx>0&&yidx<nbricks_y-1){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // +z-y
                if(zidx<nbricks_z-1&&yidx>0){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // +z+y
                if(zidx<nbricks_z-1&&yidx<nbricks_y-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // -z-x
                if(zidx>0&&xidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // -z+x
                if(zidx>0&&xidx<nbricks_x-1){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // +z-x
                if(zidx<nbricks_z-1&&xidx>0){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // +z+x
                if(zidx<nbricks_z-1&&xidx<nbricks_x-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // -y-x
                if(yidx>0&&xidx>0){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // -y+x
                if(yidx>0&&xidx<nbricks_x-1){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // +y-x
                if(yidx<nbricks_y-1&&xidx>0){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // +y+x
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1){
                    let idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // -y-x+z
                if(yidx>0&&xidx>0&&zidx<nbricks_z-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // -y+x+z
                if(yidx>0&&xidx<nbricks_x-1&&zidx<nbricks_z-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // +y-x+z
                if(yidx<nbricks_y-1&&xidx>0&&zidx<nbricks_z-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // +y+x+z
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1&&zidx<nbricks_z-1){
                    let idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // -y-x-z
                if(yidx>0&&xidx>0&&zidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // -y+x-z
                if(yidx>0&&xidx<nbricks_x-1&&zidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // +y-x-z
                if(yidx<nbricks_y-1&&xidx>0&&zidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // +y+x-z
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1&&zidx>0){
                    let idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
            }
        }
    }
    console.log("Time to make bricks: "+(new Date().getTime()-start));

    //console.log(bricks);

    this.hasBonds = true;
    return;
}

bondLength(at1,at2) {
    let A = vec3Create([at1.x(),at1.y(),at1.z()]);
    let B = vec3Create([at2.x(),at2.y(),at2.z()]);
    let BA = vec3Create();
    vec3Subtract(B,A,BA);
    let ab = vec3.length(BA);
    return ab;
}

bondAngle(at1,at2,at3) {

    let A = vec3Create([at1.x(),at1.y(),at1.z()]);
    let B = vec3Create([at2.x(),at2.y(),at2.z()]);
    let C = vec3Create([at3.x(),at3.y(),at3.z()]);

    let BA = vec3Create();
    let CA = vec3Create();
    let CB = vec3Create();

    vec3Subtract(B,A,BA);
    vec3Subtract(C,A,CA);
    vec3Subtract(C,B,CB);

    let ab = vec3.length(BA);
    let ac = vec3.length(CA);
    let bc = vec3.length(CB);

    let absq = ab*ab;
    let acsq = ac*ac;
    let bcsq = bc*bc;

    return  Math.acos((bcsq + absq - acsq)/(2*bc*ab));
}

calculateHBonds() {

    let start = new Date().getTime();
    this.hbonds = [];

    let min_D_A = 2.0;
    let max_D_A = 3.1;
    let max_D_A_S = 3.9;
    let max_H_A = 2.5;
    let min_DD_D_A = 90 * Math.PI/180.0;
    let min_D_A_AA = 90 * Math.PI/180.0;
    let min_H_A_AA = 90 * Math.PI/180.0;
    let min_D_H_A = 90 * Math.PI/180.0;
    let donor_angles_OK;

    this.calculateBonds();
    console.log("Time to calculateBonds: "+(new Date().getTime()-start));

    let donors = this.getAtoms("D == STRINGPROP__ccp4mg_hb_type or B == STRINGPROP__ccp4mg_hb_type");
    //console.log(donors);
    let acceptors = this.getAtoms("A == STRINGPROP__ccp4mg_hb_type or B == STRINGPROP__ccp4mg_hb_type");
    //console.log(acceptors);
    let hydrogens = this.getAtoms("H == STRINGPROP___atom_site.label_asym_id");
    //console.log(hydrogens);
    console.log("Time to get selections: "+(new Date().getTime()-start));

    if(donors.length>0&&acceptors.length>0){
        let max_D = max_D_A;
        if(max_D_A_S>max_D){
            max_D = max_D_A_S;
        }
        let contacts = this.SeekContacts(donors,acceptors,min_D_A,max_D);
        console.log("Time to SeekContacts: "+(new Date().getTime()-start));
        //console.log(contacts.length);
        let clen = contacts.length;
        for(let ic=0;ic<clen;ic++){
            // FIXME - Check both in "matching" altLoc's.

            let donorBonds    = contacts[ic][1].getBonds();
            let acceptorBonds = contacts[ic][2].getBonds();
            let donorLen = donorBonds.length;
            let acceptorLen = acceptorBonds.length;
            //console.log(donorBonds.length);
            //console.log(acceptorBonds.length);
            let contactAt1 = contacts[ic][1];
            let contactAt2 = contacts[ic][2];
            let contactAt1Symbol = contactAt1["_atom_site.type_symbol"];
            let contactAt2Symbol = contactAt2["_atom_site.type_symbol"];
            let haveH = false;

            // If there is a hydrogen then test geometry
            for ( let i = 0; i < donorLen; i++ ) {
                if (hydrogens.indexOf(donorBonds[i])>-1){
                    haveH = true;
                    let H_A = this.bondLength(donorBonds[i],contacts[ic][2]);
                    let D_H_A = this.bondAngle(contacts[ic][1],donorBonds[i],contacts[ic][2]);
                    if ( H_A < max_H_A && D_H_A > min_D_H_A ) {
                        if ( acceptorLen === 0 || this.bondAngle( donorBonds[i], contacts[ic][2],acceptorBonds[0] ) > min_H_A_AA ) {
                            // If the hydrogen atom is part of the original atom selection
                            // then record the bond as being to the hydrogen
                            if(donors.indexOf(donorBonds[i])>-1){
                                this.hbonds.push([H_A,contacts[ic][2],donorBonds[i]]);
                            } else {
                                this.hbonds.push(contacts[ic]);
                            }
                        }
                    }
                }
            }
            if(!haveH){
                // Now just check angles.
                if(acceptorLen===0 || this.bondAngle(contactAt1,contactAt2,acceptorBonds[0])>min_D_A_AA){
                    donor_angles_OK = true;
                    for(let idb=0;idb<donorLen;idb++){
                        // FIXME - Only do this if not H
                        if(donorBonds[idb]["_atom_site.type_symbol"]!=="H"&&this.bondAngle(donorBonds[idb],contactAt1,contactAt2) < min_DD_D_A ) {
                            donor_angles_OK = false;
                        }
                    }
                    if(donor_angles_OK){
                        if((contactAt1Symbol==="S"||contactAt2Symbol==="S")&&contacts[ic][0]<=max_D_A_S){
                            this.hbonds.push(contacts[ic]);
                        } else if((contactAt1Symbol!=="S"&&contactAt2Symbol!=="S")&&contacts[ic][0]<=max_D_A) {
                            this.hbonds.push(contacts[ic]);
                        }
                    }
                }
            }
        }
    }
    console.log("Time to do all hbond: "+(new Date().getTime()-start));
}

getHBonds(atoms1,atoms2) {
    // Now seem to be getting odd (rather random) slowdowns on Safari (or was it Chrome) with this. Don't understand.
    console.log("getHBonds "+this.hbonds.length);
    let hbonds = [];

    let uuid = guid();
    let uuid2 = guid();
    let len1 = atoms1.length;
    let len2 = atoms2.length;
    console.log("getHBonds: "+len1+", "+len2);

    console.log("this.hbonds.length: "+this.hbonds.length);
    for(let ih=0;ih<this.hbonds.length;ih++){
        this.hbonds[ih][1][uuid] = 0;
        this.hbonds[ih][2][uuid] = 0;
        this.hbonds[ih][1][uuid2] = 0;
        this.hbonds[ih][2][uuid2] = 0;
    }

    for(let iat=0;iat<len1;iat++){
        atoms1[iat][uuid] = 1;
    }
    for(let iat=0;iat<len2;iat++){
         atoms2[iat][uuid2] = 2;
    }

    for(let ih=0;ih<this.hbonds.length;ih++){
        if((this.hbonds[ih][1][uuid]===1&&this.hbonds[ih][2][uuid2]===2)||(this.hbonds[ih][2][uuid]===1&&this.hbonds[ih][1][uuid2]===2)){
            hbonds.push(this.hbonds[ih]);
        }
    }

    /*
    for(let ih=0;ih<this.hbonds.length;ih++){
        if((atoms1.indexOf(this.hbonds[ih][1])>-1&&atoms2.indexOf(this.hbonds[ih][2])>-1)||
                (atoms2.indexOf(this.hbonds[ih][1])>-1&&atoms1.indexOf(this.hbonds[ih][2])>-1)){
            hbonds.push(this.hbonds[ih]);
        }
    }
    */

    return hbonds;
}

centreOnAtoms(atoms) {
    let xtot = 0.0;
    let ytot = 0.0;
    let ztot = 0.0;
    for(let ia=0;ia<atoms.length;ia++){
        xtot += atoms[ia].x();
        ytot += atoms[ia].y();
        ztot += atoms[ia].z();
    }
    if(atoms.length>0){
        // FIXME - Why negative ???
        return [-xtot/atoms.length,-ytot/atoms.length,-ztot/atoms.length];
    }
    return [0,0,0];
}

centre() {
    let chains = this.chains;
    let xtot = 0.0;
    let ytot = 0.0;
    let ztot = 0.0;
    let natoms = 0;
    for(let ic=0;ic<chains.length;ic++){
        let residues = chains[ic].residues;
        for(let ir=0;ir<residues.length;ir++){
            let atoms = residues[ir].atoms;
            for(let ia=0;ia<atoms.length;ia++){
                xtot += atoms[ia].x();
                ytot += atoms[ia].y();
                ztot += atoms[ia].z();
                natoms++;
            }
        }
    }
    if(natoms>0){
        // FIXME - Why negative ???
        return [-xtot/natoms,-ytot/natoms,-ztot/natoms];
    }
    return [0,0,0];
}

getLigandsList() {
    let ligands_list = [];
    let ligand_atoms = this.getAtoms("ligands");

    let ligands_dict = {};
    for(let iat=0;iat<ligand_atoms.length;iat++){
        ligands_dict["/1/"+ligand_atoms[iat].getChainID()+"/"+ligand_atoms[iat].getResidueID()] = "/1/"+ligand_atoms[iat].getChainID()+"/"+ligand_atoms[iat].getResidueID();
    }
    ligands_list = Object.keys(ligands_dict).map(function (key) {return ligands_dict[key]});

    return ligands_list;
}

getPeptideLibraryEntry(monid,enerLib){
    if(typeof(peptideMonomers[monid])!=="undefined"){
        try {
            let b64Data = peptideMonomers[monid];
            var strData;
            if(window.atob&&window.btoa){
                strData = atob(b64Data.replace(/\s/g, ''));
            } else {
                strData = base64decode(b64Data.replace(/\s/g, ''));
            }
            var binData     = new Uint8Array(strData.length);
            for(let j=0;j<strData.length;j++){
                binData[j] = strData[j].charCodeAt(0);
            }
            let data  = pako.inflate(binData);
            if(window.TextDecoder){
                // THIS'LL only work in Firefox 19+, Opera 25+ and Chrome 38+.
                let decoder = new TextDecoder('utf-8');
                strData = decoder.decode(data);
            }else {
                let unpackBufferLength = 60000;
                for(let j=0;j<data.length/unpackBufferLength;j++){
                    let lower = j*unpackBufferLength;
                    let upper = (j+1)*unpackBufferLength;
                    if(upper>data.length){
                        upper = data.length;
                    }
                    // FECK, no slice on Safari!
                    strData += String.fromCharCode.apply(null, data.subarray(lower,upper));
                }   
            }
            enerLib.addCIFAtomTypes(monid,strData);
            enerLib.addCIFBondTypes(monid,strData);
            Model.prototype.aminoResidues.push(monid);
        } catch(e) {
            console.log("Failed adding modified amino acid "+monid);
        }
    }
}

metalCoordDistance = function(element_in){
    let element = element_in.toUpperCase();
    if(element==="NA")
        return 2.6;
    if(element==="MG")
        return 2.5;
    if(element==="K")
        return 3.0;
    if(element==="CA")
        return 2.6;
    if(element==="MN")
        return 2.6;
    if(element==="FE")
        return 2.5;
    if(element==="CO")
        return 2.4;
    if(element==="CU")
        return 2.3;
    if(element==="ZN")
        return 2.5;
    return 3.0;
}

filterConnectionsByAtoms1(conn,atoms) {
    let filterConn = [];
    let atLength = atoms.length;
    let connLength = conn.length;
    for(let iconn=0;iconn<connLength;iconn++){
        for(let iat=0;iat<atLength;iat++){
            let atom = atoms[iat];
            if(atom.getResidueID()===conn[iconn][1].getResidueID()){
                filterConn.push(conn[iconn]);
                break;
            }
        }
    }
    return filterConn;
}

filterConnectionsByAtoms2(conn,atoms) {
    let filterConn = [];
    let atLength = atoms.length;
    let connLength = conn.length;
    for(let iconn=0;iconn<connLength;iconn++){
        for(let iat=0;iat<atLength;iat++){
            let atom = atoms[iat];
            if(atom.getResidueID()===conn[iconn][2].getResidueID()){
                filterConn.push(conn[iconn]);
                break;
            }
        }
    }
    return filterConn;
}

filterGlycanConnectionsByAtoms(glycConn,atoms) {
    let filterGlycConn = [];
    let atLength = atoms.length;
    let connLength = glycConn.length;
    for(let iconn=0;iconn<connLength;iconn++){
        for(let iat=0;iat<atLength;iat++){
            let atom = atoms[iat];
            if(atom.getResidueID()===glycConn[iconn][1].getResidueID()){
                filterGlycConn.push(glycConn[iconn]);
                break;
            }
        }
    }
    return filterGlycConn;
}

filterResiduesByAtoms(residues,atoms) {
    let filteredResidues = [];
    let atLength = atoms.length;
    let resLength = residues.length;
    for(let ires=0;ires<resLength;ires++){
        for(let iat=0;iat<atLength;iat++){
            let atom = atoms[iat];
            if(atom.getResidueID()===residues[ires].getResidueID()){
                filteredResidues.push(residues[ires]);
                break;
            }
        }
    }
    return filteredResidues;
}

getGlycanResidues() {
    if(typeof(this.glycan_cache["glycans"])!=="undefined"){
        return this.glycan_cache["glycans"];
    }
    this.calculateBonds();
    // FIXME - Misnaming, doing O-glycos to THR and SER too
    let asnND2Atoms = this.getAtoms("/*/*/(ASN)/ND2 or /*/*/(THR)/OG1 or /*/*/(SER)/OG");
    let saccharideAtoms = this.getAtoms("saccharide");
    let glycosContacts = this.SeekContacts(asnND2Atoms,saccharideAtoms,0.6,1.7);

    // These are all the "roots"

    let glycanResidues = [];
    let glycanGlycanConnections = [];
    for(let ig=0;ig<glycosContacts.length;ig++){
        glycanResidues.push(glycosContacts[ig][2].residue);
    }

    let newGlycans = [];
    function getGlycanConnections(glycan){
        for(let iat=0;iat<glycan.atoms.length;iat++){
            let atom = glycan.atoms[iat];
            for(let ib=0;ib<atom.bonds.length;ib++){
                //console.log(atom.bonds[ib].getAtomID());
                if(saccharideAtoms.indexOf(atom.bonds[ib])!==-1){
                    if(atom.bonds[ib].residue!==glycan&&newGlycans.indexOf(atom.bonds[ib].residue)===-1){
                        newGlycans.push(atom.bonds[ib].residue);
                        glycanGlycanConnections.push([glycan,atom.bonds[ib].residue]);
                        getGlycanConnections(atom.bonds[ib].residue);
                    }
                }
            }
        }
    }

    for(let ig=0;ig<glycanResidues.length;ig++){
        newGlycans.push(glycanResidues[ig]);
    }

    for(let ig=0;ig<glycanResidues.length;ig++){
        getGlycanConnections(glycanResidues[ig]);
    }

    for(let ig=0;ig<glycosContacts.length;ig++){
        glycosContacts[ig][1] =  glycosContacts[ig][1].residue.getAtom("CA");
    }

    this.glycan_cache["glycans"] = newGlycans;
    this.glycan_cache["rootGlycans"] = glycosContacts;
    this.glycan_cache["glycanGlycanConnections"] = glycanGlycanConnections;
    return newGlycans;
    
}

getAtoms(selin) {

    let atoms = [];
    //console.log("selin: "+selin);

    if(selin==="water"||selin==="solvent"){
        if(typeof(this.selection_cache["water"])==="undefined"){
            this.selection_cache["water"] = this.getAtoms("/*/*/(HOH,H2O,WAT,SOL,DOD,D2O)/*");
        }
        return this.selection_cache["water"];
    } else if(selin==="nglycosylation"){
        let glycanResidues = this.getGlycanResidues();
        let glycanAtoms = [];
        for(let ig=0;ig<glycanResidues.length;ig++){
            for(let iat=0;iat<glycanResidues[ig].atoms.length;iat++){
                glycanAtoms.push(glycanResidues[ig].atoms[iat]);
            }
        }
        return glycanAtoms;
    } else if(selin==="peptide"){
        return this.getAtoms("/*/*/("+Model.prototype.aminoResidues.join()+")/*");
    } else if(selin==="main"){
        return this.getAtoms("/*/*/("+Model.prototype.aminoResidues.join()+")/N,CA,C,O");
    } else if(selin==="catrace"){
        return this.getAtoms("/*/*/("+Model.prototype.aminoResidues.join()+")/CA");
    } else if(selin==="ssbridge"||selin==="ssbond"){
        return this.getAtoms("/*/*/(CYS)/CB,SG");
    } else if(selin==="solute"){
        return this.getAtoms("/*/*/(SUL,SO4,NO3,MOH,EOH,GOL,ACT,CL,BR,PG4,PG5,PG6,1PE,2PE,7PE,PE3,PE4,PE5,PE6,PE7,PGE,XPE,C10,CE1,CE9,CXE,EDO,N8E,P33,P4C,12P,15P,DMS,IOD,MRD,BE7,MHA,BU3,PGO,BU2,PDO,BU1,1BO,TFP,DHD,PEU,TRS,TAU,SBT,SAL,MPD,IOH,IPA,BU2,PIG,B3P,BTB,B3P,NHE,C8E,OTE,PE8,2OS,1PS,CPS,DMX,MPO,DXG,CM5,ACA,ACN,CCN,DR6,NH4,AZI,LAK,BCN,BRO,CAC,CBX,FMT,ACY,CBM,CLO,FCL,CIT,3CO,NCO,CU1,CYN,CYN,MA4,BTC,TAR,MTL,DPR,SOR,SYL,DDQ,DMF,DIO,DOX,SDS,EEE,EGL,FLO,TRT,FCY,FRU,GBL,GPX,HTO,HTG,B7G,16D,HEZ,IDO,ICI,ICT,TLA,LDA,MRY,BEQ,C15,MG8,POL,JEF,DIA,IPH,PIN,CRY,PGR,PGQ,SPD,SPK,SPM,TBU,TMA,TEP,SCN,ETF,144,UMQ,URE,CN,EPE,HEPES,HEPE,MES,PEG,ETA,HED,IMD,BO3,IUM,PO4)/*");
    } else if(selin==="nucleotide"){
        return this.getAtoms("/*/*/(Ad,Cd,Gd,Td,ADE,CYT,GUA,INO,THY,URA,AMP,ADP,ATP,CMP,CDP,CTP,GMP,GDP,GTP,TMP,TDP,TTP)/*");
    } else if(selin==="saccharide"){
        return this.getAtoms("/*/*/("+Model.prototype.saccharideResidues.join()+")/*");
    } else if(selin==="nucleic"||selin==="nucleic_acid"){
        return this.getAtoms("/*/*/(DC,DT,U,T,C,PSU,DA,DG,A,G,I)/*");
    } else if(selin==="metal"){
        return this.getAtoms("/*/*/(LI,BE,NA,MG,AL,K,CA,SC,TI,V,MN,FE,CO,NI,CU,ZN,GA,RB,SR,Y,ZR,NB,MO,TC,RU,RH,PD,AG,CD,IN,SN,SB,CS,BA,LA,CE,PR,ND,PM,SM,EU,GD,TB,DY,HO,ER,TM,YB,LU,HF,TA,W,RE,OS,IR,PT,AU,HG,TL,PB,BI,PO,FR,RA,AC,TH,PA,U,NP,PU,AM,CM,BK,CF,ES,FM,MD,NO,LR,RF,DB,SG,BH,HS,MT,UN,UU,UB,UQ,UH,UO)/*[LI,BE,NA,MG,AL,K,CA,SC,TI,V,MN,FE,CO,NI,CU,ZN,GA,RB,SR,Y,ZR,NB,MO,TC,RU,RH,PD,AG,CD,IN,SN,SB,CS,BA,LA,CE,PR,ND,PM,SM,EU,GD,TB,DY,HO,ER,TM,YB,LU,HF,TA,W,RE,OS,IR,PT,AU,HG,TL,PB,BI,PO,FR,RA,AC,TH,PA,U,NP,PU,AM,CM,BK,CF,ES,FM,MD,NO,LR,RF,DB,SG,BH,HS,MT,UN,UU,UB,UQ,UH,UO]");
    } else if(selin==="allmetal"){
        return this.getAtoms("/*/*/*/*[LI,BE,NA,MG,AL,K,CA,SC,TI,V,MN,FE,CO,NI,CU,ZN,GA,RB,SR,Y,ZR,NB,MO,TC,RU,RH,PD,AG,CD,IN,SN,SB,CS,BA,LA,CE,PR,ND,PM,SM,EU,GD,TB,DY,HO,ER,TM,YB,LU,HF,TA,W,RE,OS,IR,PT,AU,HG,TL,PB,BI,PO,FR,RA,AC,TH,PA,U,NP,PU,AM,CM,BK,CF,ES,FM,MD,NO,LR,RF,DB,SG,BH,HS,MT,UN,UU,UB,UQ,UH,UO]");
    } else if(selin==="all"){
        return this.getAllAtoms();
    } else if(selin==="ligands_old"){
        // FIXME This may not be very efficient: use getAllAtoms a lot.
        return this.getAtoms("not peptide and not water and not metal and not nucleic and not nucleotide and not solute and not saccharide");
    } else if(selin==="ligands"){
        // FIXME, if structure is edited, this cache has to be cleared.
        if(typeof(this.selection_cache["ligands"])==="undefined"){
            console.log("Attempting to get the ligands");
            console.log(this.getAtoms("not peptide"));
            console.log(this.getAtoms("not water"));
            console.log("Really ......?");
            console.log(this.getAtoms("{not peptide} and {not water}"));
            //console.log(this.getAtoms("not peptide and not water and not metal"));
            //console.log(this.getAtoms("not peptide and not water and not metal and not nucleic"));
            //console.log(this.getAtoms("not peptide and not water and not metal and not nucleic and not nucleitide"));
            //console.log(this.getAtoms("not peptide and not water and not metal and not nucleic and not nucleitide and not solute"));
            //console.log(this.getAtoms("not peptide and not water and not metal and not nucleic and not nucleitide and not solute and not nglycosylation"));
            this.selection_cache["ligands"] = this.getAtoms("not {peptide or water or metal or nucleic or nucleotide or solute or nglycosylation}");
        }
        return this.selection_cache["ligands"];
    } else if(selin==="not_base"){
        return this.getAtoms("/*/*/*/C3*,O3*,H3*,C5*,1H5*,O5*,2H5*,H5T,P,O1P,O2P,C3',O3',H3',C5',1H5',O5',2H5',H7,P,OP1,OP2,HO5',HO3'");
    } else if(selin==="base"){
        return this.getAtoms("nucleic and not not_base");
    } else if(selin==="side"){
        return this.getAtoms("peptide and not main");
    } else if(selin.substring(0,6)==="neighb"){
        /*
        // FIXME - Unsupported.
        let model = ''
        let selobj_alias='';
        let selobj_model='';
        let hbonded=0;
        let sym_mates=0;
        // Also sellist=None, nsellist=0, selhnd=None !??
         */
        let cidStart = selin.indexOf(" cid=\"");
        if(cidStart===-1){
            return atoms;
        } else {
            let cidSel = selin.substring(cidStart+6);
            let cidEnd = cidSel.indexOf("\"");
            if(cidEnd===-1){
                return atoms;
            } else {
                let cid = cidSel.substring(0,cidEnd);
                let postCid = selin.substring(cidStart+cid.length+7).trim();
                //console.log(cid);
                //console.log(postCid);
                let cidAtoms = this.getAtoms(cid);
                let ligandAtoms = [];
                if(selin.indexOf("ligands")>-1){
                    if(cid==="ligands"){
                        ligandAtoms = cidAtoms;
                    } else {
                        ligandAtoms = this.getAtoms("ligands");
                    }
                }
                //console.log(cidAtoms);
                let maxd = 10.0;
                let mind = 0.0;
                let excl = [""];
                let group = "residue";
                let maxStart = selin.indexOf(" maxd=");
                let hbond = "";
                if(maxStart>-1){
                    let maxEnd = selin.indexOf(" ",maxStart+1);
                    if(maxEnd===-1) maxEnd = selin.length;
                    maxd = parseFloat(selin.substring(maxStart+6,maxEnd));
                }
                let minStart = selin.indexOf(" mind=");
                if(minStart>-1){
                    let minEnd = selin.indexOf(" ",minStart+1);
                    if(minEnd===-1) minEnd = selin.length;
                    mind = parseFloat(selin.substring(minStart+6,minEnd));
                }
                let groupStart = selin.indexOf(" group=");
                if(groupStart>-1){
                    let groupEnd = selin.indexOf(" ",groupStart+1);
                    if(groupEnd===-1) groupEnd = selin.length;
                    group = selin.substring(groupStart+7,groupEnd);
                }
                let hbondStart = selin.indexOf(" hbonded=");
                if(hbondStart>-1){
                    let hbondEnd = selin.indexOf(" ",hbondStart+1);
                    if(hbondEnd===-1) hbondEnd = selin.length;
                    hbond = selin.substring(hbondStart+9,hbondEnd);
                }
                let exclStart = selin.indexOf(" excl=");
                if(exclStart>-1){
                    let exclEnd = selin.indexOf(" ",exclStart+1);
                    if(exclEnd===-1) exclEnd = selin.length;
                    excl = selin.substring(exclStart+6,exclEnd).split(",");
                }
                let allAtoms = this.getAllAtoms();
                let maxdsq = maxd*maxd;
                let mindsq = mind*mind;
                // FIXME, not considered excl or group at all.
                if(allAtoms.length>0&&cidAtoms.length>0){
                    if(group==="atom"||group==="all"){
                        for(let iat1=0;iat1<allAtoms.length;iat1++){
                            let at1 = allAtoms[iat1];
                            for(let iat2=0;iat2<cidAtoms.length;iat2++){
                                let at2  = cidAtoms[iat2];
                                let distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    atoms.push(at1);
                                    break;
                                }
                            }
                        }
                    }
                    if(group==="water"||group==="solvent"||(excl.indexOf("water")===-1&&excl.indexOf("solvent")===-1)){
                        let waterAtoms = this.getAtoms("water");
                        for(let iat1=0;iat1<waterAtoms.length;iat1++){
                            let at1 = waterAtoms[iat1];
                            for(let iat2=0;iat2<cidAtoms.length;iat2++){
                                let at2  = cidAtoms[iat2];
                                let distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    atoms.push(at1);
                                    break;
                                }
                            }
                        }
                    }
                    if(group==="catrace"){
                        let traceAtoms = this.getAtoms("catrace");
                        for(let iat1=0;iat1<traceAtoms.length;iat1++){
                            let at1 = traceAtoms[iat1];
                            for(let iat2=0;iat2<cidAtoms.length;iat2++){
                                let at2  = cidAtoms[iat2];
                                let distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    atoms.push(at1);
                                    break;
                                }
                            }
                        }
                    }
                    if(group==="water_ligands"||group==="solvent_monomers"){
                        let waterLigandAtoms = this.getAtoms("water or ligands");
                        for(let iat1=0;iat1<waterLigandAtoms.length;iat1++){
                            let at1 = waterLigandAtoms[iat1];
                            for(let iat2=0;iat2<cidAtoms.length;iat2++){
                                let at2  = cidAtoms[iat2];
                                let distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    atoms.push(at1);
                                    break;
                                }
                            }
                        }
                    }
                    if(group==="ligands"){
                        for(let iat1=0;iat1<ligandAtoms.length;iat1++){
                            let at1 = ligandAtoms[iat1];
                            for(let iat2=0;iat2<cidAtoms.length;iat2++){
                                let at2  = cidAtoms[iat2];
                                let distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    atoms.push(at1);
                                    break;
                                }
                            }
                        }
                    }
                    //FIXMEm these should be different, I think
                    if(group==="side"||group==="main_side"||group==="CA+side"){
                        let sideAtoms = this.getAtoms("side");
                        let prevId = "";
                        let doneThisResidue = false;
                        for(let iat1=0;iat1<sideAtoms.length;iat1++){
                            let at1 = sideAtoms[iat1];
                            if(at1.getResidueID()!==prevId){
                                doneThisResidue = false;
                            }
                            if(at1.getResidueID()===prevId&&doneThisResidue){
                                continue;
                            }
                            for(let iat2=0;iat2<cidAtoms.length;iat2++){
                                let at2  = cidAtoms[iat2];
                                let distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    let side_atoms = at1.residue.getCASideAtoms();
                                    for(let ip=0;ip<side_atoms.length;ip++) atoms.push(side_atoms[ip]);
                                    doneThisResidue = true;
                                    break;
                                }
                            }
                            prevId = at1.getResidueID();
                        }
                    }
                    if(group==="main"||group==="main_side"){
                        let mainAtoms = this.getAtoms("main");
                        let prevId = "";
                        let doneThisResidue = false;

                        function hBondsToCidAndThese(thisHBond){
                            if(cidAtoms.indexOf(thisHBond[1])>-1&&mainAtoms.indexOf(thisHBond[2])>-1){
                                return true;
                            }
                            if(cidAtoms.indexOf(thisHBond[2])>-1&&mainAtoms.indexOf(thisHBond[1])>-1){
                                return true;
                            }
                            return false;
                        }
                        if(hbond.length>0&&parseInt(hbond)===1){
                            let filteredHbonds = this.hbonds.filter(hBondsToCidAndThese);
                            for(let ihb=0;ihb<filteredHbonds.length;ihb++){
                                if(cidAtoms.indexOf(filteredHbonds[ihb][1])>-1){
                                    let main_atoms = filteredHbonds[ihb][2].residue.getMainAtoms();
                                    for(let ip=0;ip<main_atoms.length;ip++) atoms.push(main_atoms[ip]);
                                } else {
                                    let main_atoms = filteredHbonds[ihb][1].residue.getMainAtoms();
                                    for(let ip=0;ip<main_atoms.length;ip++) atoms.push(main_atoms[ip]);
                                }
                            }
                        } else {
                            for(let iat1=0;iat1<mainAtoms.length;iat1++){
                                let at1 = mainAtoms[iat1];
                                if(at1.getResidueID()!==prevId){
                                    doneThisResidue = false;
                                }
                                if(at1.getResidueID()===prevId&&doneThisResidue){
                                    continue;
                                }
                                for(let iat2=0;iat2<cidAtoms.length;iat2++){
                                    let at2  = cidAtoms[iat2];
                                    let distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                    if (distsq >= mindsq && distsq <= maxdsq){
                                        let main_atoms = at1.residue.getMainAtoms();
                                        for(let ip=0;ip<main_atoms.length;ip++) atoms.push(main_atoms[ip]);
                                        doneThisResidue = true;
                                        break;
                                    }
                                }
                                prevId = at1.getResidueID();
                            }
                        }
                    }
                    if(group==="residue"){
                        let sideAtoms = this.getAtoms("side");
                        let prevId = "";
                        let doneThisResidue = false;
                        for(let iat1=0;iat1<sideAtoms.length;iat1++){
                            let at1 = sideAtoms[iat1];
                            if(at1.getResidueID()!==prevId){
                                doneThisResidue = false;
                            }
                            if(at1.getResidueID()===prevId&&doneThisResidue){
                                continue;
                            }
                            for(let iat2=0;iat2<cidAtoms.length;iat2++){
                                let at2  = cidAtoms[iat2];
                                let distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    let res_atoms = at1.residue.atoms;
                                    for(let ip=0;ip<res_atoms.length;ip++) atoms.push(res_atoms[ip]);
                                    doneThisResidue = true;
                                    break;
                                }
                            }
                            prevId = at1.getResidueID();
                        }
                    }
                    if(group==="chain"){
                        let prevId = "";
                        let doneThisChain = false;
                        for(let iat1=0;iat1<allAtoms.length;iat1++){
                            let at1 = allAtoms[iat1];
                            if(at1.residue.chain.getChainID()!==prevId){
                                doneThisChain = false;
                            }
                            if(at1.residue.chain.getChainID()===prevId&&doneThisChain){
                                continue;
                            }
                            for(let iat2=0;iat2<cidAtoms.length;iat2++){
                                let at2  = cidAtoms[iat2];
                                let distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    let chain_atoms = at1.residue.chain.getAtoms();
                                    for(let ip=0;ip<chain_atoms.length;ip++) atoms.push(chain_atoms[ip]);
                                    doneThisChain = true;
                                    break;
                                }
                            }
                            prevId = at1.residue.chain.getChainID();
                        }
                    }
                    if(group==="model"){
                        let prevModel = null;
                        let doneThisModel = false;
                        for(let iat1=0;iat1<allAtoms.length;iat1++){
                            let at1 = allAtoms[iat1];
                            if(at1.residue.chain.model!==prevModel){
                                doneThisModel = false;
                            }
                            if(at1.residue.chain.model===prevModel&&doneThisModel){
                                continue;
                            }
                            for(let iat2=0;iat2<cidAtoms.length;iat2++){
                                let at2  = cidAtoms[iat2];
                                let distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    let model_atoms = at1.residue.chain.model.getAllAtoms();
                                    for(let ip=0;ip<model_atoms.length;ip++) atoms.push(model_atoms[ip]);
                                    doneThisModel = true;
                                    break;
                                }
                            }
                            prevModel = at1.residue.chain.model;
                        }
                    }
                    if(excl.indexOf("central")===-1){
                        // Don't exclude central, i.e. do include it.
                        for(let ic=0;ic<cidAtoms.length;ic++){
                            if(atoms.indexOf(cidAtoms[ic])===-1){
                                atoms.push(cidAtoms[ic]);
                            }
                        }
                    } else {
                        // Exclude central
                        for(let iat = atoms.length - 1; iat >= 0; iat--) {
                            if(cidAtoms.indexOf(atoms[iat])!==-1) {
                                atoms.splice(iat, 1);
                            }
                        }
                    }
                    if(excl.indexOf("water")!==-1||excl.indexOf("solvent")!==-1){
                        // Exclude water
                        let waterAtoms = this.getAtoms("water");
                        for(let iat = atoms.length - 1; iat >= 0; iat--) {
                            if(waterAtoms.indexOf(atoms[iat])!==-1) {
                                atoms.splice(iat, 1);
                            }
                        }
                    }
                    if(excl.indexOf("solute")!==-1){
                        // Exclude solute
                        let excludeAtoms = this.getAtoms("solute");
                        for(let iat = atoms.length - 1; iat >= 0; iat--) {
                            if(excludeAtoms.indexOf(atoms[iat])!==-1) {
                                atoms.splice(iat, 1);
                            }
                        }
                    }
                    if(excl.indexOf("ligands")!==-1){
                        // Exclude ligands
                        let excludeAtoms = ligandAtoms;
                        for(let iat = atoms.length - 1; iat >= 0; iat--) {
                            if(excludeAtoms.indexOf(atoms[iat])!==-1) {
                                atoms.splice(iat, 1);
                            }
                        }
                    }
                }
                if(postCid.indexOf(" and ")>-1){
                    let sel2 = postCid.substring(postCid.indexOf(" and ")+5).trim();
                    let atoms1 = atoms;// THE NEIGHBOURS
                    let atoms2 = this.getAtoms(sel2);
                    let andAtoms = [];
                    for(let iat=0;iat<atoms1.length;iat++){
                        if(atoms2.indexOf(atoms1[iat])!==-1){
                            andAtoms.push(atoms1[iat]);
                        }
                    }
                    return andAtoms;
                }
                if(postCid.indexOf(" or ")>-1){
                    let sel2 = postCid.substring(postCid.indexOf(" or ")+4).trim();
                    let atoms1 = atoms;// THE NEIGHBOURS
                    let atoms2 = this.getAtoms(sel2);
                    for(let ip=0;ip<atoms1.length;ip++) atoms.push(atoms1[ip]);
                    for(let ip=0;ip<atoms2.length;ip++) atoms.push(atoms2[ip]);
                    return atoms;
                }
            }
        }
        return atoms;

    } else if(selin.indexOf("{")===0){
        // Now it gets tricky, we want proper recursive parsing with brackets {}. I think this all works.
        let lhb = 0;
        let rhb = 0;
        for(let ib=0;ib<selin.length;ib++){
            if(selin.substring(ib,ib+1)==="{") lhb++;
            if(selin.substring(ib,ib+1)==="}") rhb++;
            if(lhb===rhb){
                //console.log("Brackets: "+lhb+" "+rhb+" "+ib);
                let sel1 = selin.substring(1,ib);
                if(ib===selin.length-1){
                    return this.getAtoms(sel1);
                }
                let sel2 = selin.substring(ib+1).trim();
                if(sel2.substring(0,4)==="and "){
                    let atoms1 = this.getAtoms(sel1);
                    let atoms2 = this.getAtoms(sel2.substring(4));
                    let andAtoms = [];
                    for(let iat=0;iat<atoms1.length;iat++){
                        if(atoms2.indexOf(atoms1[iat])!==-1){
                            andAtoms.push(atoms1[iat]);
                        }
                    }
                    return andAtoms;
                } else if(sel2.substring(0,3)==="or "){
                    let atoms1 = this.getAtoms(sel1);
                    let atoms2 = this.getAtoms(sel2.substring(3));
                    for(let ip=0;ip<atoms1.length;ip++) atoms.push(atoms1[ip]);
                    for(let ip=0;ip<atoms2.length;ip++) atoms.push(atoms2[ip]);
                    return atoms;
                }
                //console.log(sel1);
                //console.log(sel2);
                break;
            }
        }
        return atoms;
    } else if(selin.indexOf(" and ")>-1){
        console.log("Doing some anding");
        let sel1 = selin.substring(0,selin.indexOf(" and ")).trim();
        let sel2 = selin.substring(selin.indexOf(" and ")+5).trim();
        console.log(sel1);
        console.log(sel2);
        let atoms1 = this.getAtoms(sel1);
        let atoms2 = this.getAtoms(sel2);
        let andAtoms = [];
        /*
        for(let iat=0;iat<atoms1.length;iat++){
            if(atoms2.indexOf(atoms1[iat])!=-1){
                andAtoms.push(atoms1[iat]);
            }
        }
        */
        let allAtoms = this.getAllAtoms();
        let allLen = allAtoms.length;
        let len1 = atoms1.length;
        let len2 = atoms2.length;
        let uuid = guid();
        let uuid2 = guid();
        for(let iat=0;iat<allLen;iat++){
            allAtoms[iat][uuid] = 0;
            allAtoms[iat][uuid2] = 0;
        }
        for(let iat=0;iat<len1;iat++){
            atoms1[iat][uuid] = 1;
        }
        for(let iat=0;iat<len2;iat++){
            atoms2[iat][uuid2] = 1;
        }
        andAtoms = allAtoms.filter(function(x) { return x[uuid] === 1 && x[uuid2] === 1 });
        for(let iat=0;iat<allLen;iat++){
            delete allAtoms[iat][uuid];
            delete allAtoms[iat][uuid2];
        }
        return andAtoms;
    } else if(selin.indexOf(" or ")>-1){
        if(selin.indexOf("{")>-1&&selin.indexOf("{")<selin.indexOf(" or ")){
            if(selin.substring(0,selin.indexOf("{")).trim()==="not"){
                let atoms1 = this.getAtoms(selin.substring(selin.indexOf("{")));
                let allAtoms = this.getAllAtoms();
                let notAtoms = [];
                let allLen = allAtoms.length;
                let len = atoms1.length;
                // FIXME *THIS* takes 8s for 1aon!
                /*
                for(let iat=0;iat<allLen;iat++){
                    if(atoms1.indexOf(allAtoms[iat])==-1){
                        notAtoms.push(allAtoms[iat]);
                    }
                }
                */
                // this is *fast*
                let uuid = guid();
                for(let iat=0;iat<allLen;iat++){
                    allAtoms[iat][uuid] = 0;
                }
                for(let iat=0;iat<len;iat++){
                    atoms1[iat][uuid] = 1;
                }
                notAtoms = allAtoms.filter(function(x) { return x[uuid] === 0 });
                for(let iat=0;iat<allLen;iat++){
                    delete allAtoms[iat][uuid];
                }
                return notAtoms;
            }
        }
        let sel1 = selin.substring(0,selin.indexOf(" or ")).trim();
        let sel2 = selin.substring(selin.indexOf(" or ")+4).trim();
        let atoms1 = this.getAtoms(sel1);
        let atoms2 = this.getAtoms(sel2);
        for(let ip=0;ip<atoms1.length;ip++) atoms.push(atoms1[ip]);
        for(let ip=0;ip<atoms2.length;ip++) atoms.push(atoms2[ip]);
        return atoms;
    } else if(selin.indexOf(" not ")>-1 || selin.substring(0,4)==="not "){
        console.log("Doing some notting");
        let sel1;
        if(selin.substring(0,4)==="not "){
            sel1 = selin.substring(4).trim();
        } else {
            sel1 = selin.substring(selin.indexOf(" not ")+5).trim();
        }
        let atoms1 = this.getAtoms(sel1);
        let allAtoms = this.getAllAtoms();
        let notAtoms = [];
        let allLen = allAtoms.length;
        let len = atoms1.length;
        /*
        for(let iat=0;iat<allAtoms.length;iat++){
            if(atoms1.indexOf(allAtoms[iat])==-1){
                notAtoms.push(allAtoms[iat]);
            }
        }
         */
        let uuid = guid();
        for(let iat=0;iat<allLen;iat++){
            allAtoms[iat][uuid] = 0;
        }
        for(let iat=0;iat<len;iat++){
            atoms1[iat][uuid] = 1;
        }
        notAtoms = allAtoms.filter(function(x) { return x[uuid] === 0 });
        for(let iat=0;iat<allLen;iat++){
            delete allAtoms[iat][uuid];
        }
        return notAtoms;
    } else if(selin.indexOf("<")>-1||selin.indexOf("==")>-1){
        let allAtoms = this.getAllAtoms();
        //console.log("A property?: "+selin);
        let op1 = "";
        let op2 = "";
        let propVal1;
        let propVal2;
        let property;
        let isString = false;
        if(selin.indexOf("STRINGPROP_")>-1){
            if(selin.indexOf("==")>-1){
                propVal1 = selin.split("==")[0].trim();
                property = selin.split("==")[1].split("<")[0].trim().substr(11);
                op1 = "==";
                isString = true;
            }
        } else {
            propVal1 = Number.NaN;
            propVal2 = Number.NaN;
            property = "unk";
            propVal1 = parseFloat(selin);
            if(selin.indexOf("==")>-1){
                //console.log(propVal1);
                property = selin.split("==")[1].split("<")[0].trim();
                op1 = "==";
                //console.log(property);
            } else {
                let indexOfFirstLessThan          = selin.indexOf("<");
                let indexOfFirstLessThanOrEqualTo = selin.indexOf("<=");
                //console.log(indexOfFirstLessThan+" "+indexOfFirstLessThanOrEqualTo);
                if(indexOfFirstLessThan>-1){
                    if(indexOfFirstLessThan===indexOfFirstLessThanOrEqualTo){
                        op1 = "<=";
                        property = selin.split("<=")[1].split("<")[0].trim();
                    } else {
                        op1 = "<";
                        property = selin.split("<")[1].split("<")[0].trim();
                    }
                    let indexOfSecondLessThan          = selin.indexOf("<",indexOfFirstLessThan+1);
                    let indexOfSecondLessThanOrEqualTo = selin.indexOf("<=",indexOfFirstLessThan+1);
                    //console.log(indexOfFirstLessThan+" "+indexOfFirstLessThanOrEqualTo+" "+indexOfSecondLessThan+" "+indexOfSecondLessThanOrEqualTo);
                    if(indexOfSecondLessThan===indexOfSecondLessThanOrEqualTo){
                        op2 = "<=";
                        propVal2 = parseFloat(selin.substr(indexOfFirstLessThan+2).split("<=")[1]);
                    } else {
                        op2 = "<";
                        propVal2 = parseFloat(selin.substr(indexOfFirstLessThan+2).split("<")[1]);
                    }
                }
            }
        }

        //console.log(propVal1+" "+op1+" "+property+" "+op2+" "+propVal2);

        // Props: hard(require calculations) - ATOM_SAS, RES_SAS, ATOM_BURIED, RES_BURIED, 
        let propAliases = {"B":"_atom_site.B_iso_or_equiv","OCC":"_atom_site.occupancy","X":"_atom_site.Cartn_x","Y":"_atom_site.Cartn_y","Z":"_atom_site.Cartn_z","SERIAL":"_atom_site.id"};

        function GTEProp1(atom){
            return atom[propAliases[property]] >= propVal1;
        }
        function GTProp1(atom){
            return atom[propAliases[property]] > propVal1;
        }
        function EQProp1Str(atom){
            return atom[property] === propVal1;
        }
        function EQProp1(atom){
            return (Math.abs(atom[propAliases[property]]-propVal1)<1e-6);
        }
        function LTEProp2(atom){
            return atom[propAliases[property]] <= propVal2;
        }
        function LTProp2(atom){
            return atom[propAliases[property]] < propVal2;
        }
        if(op1==="=="){
            if(isString){
                atoms = allAtoms.filter(EQProp1Str);
            } else {
                atoms = allAtoms.filter(EQProp1);
            }
        }else if(op1==="<="&&op2==="<="){
            atoms = allAtoms.filter(GTEProp1).filter(LTEProp2);
        } else if(op1==="<"&&op2==="<"){
            atoms = allAtoms.filter(GTProp1).filter(LTProp2);
        } else if(op1==="<="&&op2==="<"){
            atoms = allAtoms.filter(GTEProp1).filter(LTProp2);
        } else if(op1==="<"&&op2==="<="){
            atoms = allAtoms.filter(GTProp1).filter(LTEProp2);
        }
    }

    var sel;
    if(selin.substring(0,1)==="/"){
        sel = selin.substring(1,selin.length);
    } else {
        sel = selin.substring(0,selin.length);
    }
    let selSplit = sel.split("/");

    //FIXME - modelRange is not used.
    let modelRange   = selSplit[0];
    let chainRange   = selSplit[1];
    let residueRange = selSplit[2];

    if(selSplit.length<3){
        modelRange   = "1";
        chainRange   = selSplit[0];
        residueRange = selSplit[1];
    } else {
        modelRange   = selSplit[0];
        chainRange   = selSplit[1];
        residueRange = selSplit[2];
    }

    //console.log("modelRange",modelRange);
    //console.log("chainRange",chainRange);
    //console.log("residueRange",residueRange);

    var atomsRange;
    let altLocsRange   = "";
    let elementsRange   = "";

    if(selSplit.length<4){
        atomsRange   = "*";
    } else {
        atomsRange   = selSplit[3];
    }

    if(atomsRange.indexOf(":")>-1){
        let atomsAltlocs = atomsRange.split(":");
        atomsRange = atomsAltlocs[0];
        altLocsRange = atomsAltlocs[1].split(",");
        if(altLocsRange.length===1&&altLocsRange[0]==="*"){
            altLocsRange   = "";
        }
    }

    if(atomsRange.indexOf("[")>-1){
        let atomsElements = atomsRange.split("[");
        atomsRange = atomsElements[0];
        elementsRange = atomsElements[1].split("]")[0].split(",");
        // FIXME - LOOKS DODGY ?????????
        if(elementsRange.length===1&&elementsRange==="*"){
            elementsRange   = "";
        }
    }

    let selChains = [];
    let chainRanges = chainRange.split(",");
    for(let ic=0;ic<chainRanges.length;ic++){
        let thisRange = chainRanges[ic].split("-");
        if(thisRange.length===1){
            if(thisRange[0]==="*"){
                for(let jc=0;jc<this.chains.length;jc++){
                    selChains.push(this.chains[jc].getChainID());
                }
            } else {
                selChains.push(thisRange[0]);
            }
        } else {
            let selStart = thisRange[0];
            let selEnd   = thisRange[1];
            let inRange = false;
            for(let jc=0;jc<this.chains.length;jc++){
                if(this.chains[jc].getChainID() === selStart){
                    inRange = true;
                }
                if(inRange){
                    selChains.push(this.chains[jc].getChainID());
                }
                if(this.chains[jc].getChainID() === selEnd){
                    inRange = false;
                }
            }
        }
    }

    function getChainResidues(theChain){
        //console.log("getChainResidues",theChain,residueRange);
        let selRes = [];
        if(residueRange.indexOf("(")>-1&&residueRange.split("(")[0].length===0){
            let residueRanges = residueRange.split("(");
            residueRanges = residueRanges[1].split(")")[0];
            residueRanges = residueRanges.split(",");
            for(let jr=0;jr<theChain.residues.length;jr++){
                if(residueRanges.indexOf(theChain.residues[jr].getName())>-1){
                    let seqId = theChain.residues[jr].getSeqID();
                    selRes.push(seqId);
                }
            }
        } else if(residueRange.length===0){
            //console.log("No residues specified, need to add them all?");
            for(let jr=0;jr<theChain.residues.length;jr++){
                let seqId = theChain.residues[jr].getSeqID();
                selRes.push(seqId);
            }
        } else {
            var residueRanges;
            if(residueRange.indexOf("(")>-1){
                residueRanges = residueRange.split("(")[0].split(",");
            } else {
                residueRanges = residueRange.split(",");
            }
            for(let ir=0;ir<residueRanges.length;ir++){
                let thisRange = residueRanges[ir].split("-");
                if(thisRange.length===1){
                    if(thisRange[0]==="*"){
                        for(let jr=0;jr<theChain.residues.length;jr++){
                            let seqId = theChain.residues[jr].getSeqID();
                            selRes.push(seqId);
                        }
                    } else {
                        selRes.push(thisRange[0]);
                    }
                } else {
                    let selStart = thisRange[0];
                    let selEnd   = thisRange[1];
                    let insStart = "?";
                    let insEnd   = "?";
                    if(selStart.indexOf(".")>-1){
                        let selInsStart = selStart.split(".");
                        selStart = selInsStart[0];
                        insStart = selInsStart[1];
                    }
                    if(selEnd.indexOf(".")>-1){
                        let selInsEnd = selEnd.split(".");
                        selEnd = selInsEnd[0];
                        insEnd = selInsEnd[1];
                    }
                    let inRange = false;
                    for(let jr=0;jr<theChain.residues.length;jr++){
                        let seqId = theChain.residues[jr].getSeqID();
                        let seqIns = theChain.residues[jr].getInsCode();
                        if(seqId === selStart && seqIns === insStart){
                            inRange = true;
                        }
                        if(inRange){
                            selRes.push(seqId);
                        }
                        if(seqId === selEnd && seqIns === insEnd){
                            inRange = false;
                        }
                    }
                }
            }
        }
        return selRes;
    }

    function getResidueAtoms(theResidue){
        let theSelAtoms = [];
        if(atomsRange==="*"){
            if(altLocsRange.length===0&&elementsRange.length===0){
                for(let ip=0;ip<theResidue.atoms.length;ip++) theSelAtoms.push(theResidue.atoms[ip]);
            } else if(altLocsRange.length===0) {
                for(let ja=0;ja<theResidue.atoms.length;ja++){
                    if(elementsRange.indexOf(theResidue.atoms[ja]["_atom_site.type_symbol"])>-1){
                        theSelAtoms.push(theResidue.atoms[ja]);
                    }
                }
            } else if(elementsRange.length===0) {
                for(let ja=0;ja<theResidue.atoms.length;ja++){
                    if(altLocsRange.indexOf(theResidue.atoms[ja]["_atom_site.label_alt_id"])>-1){
                        theSelAtoms.push(theResidue.atoms[ja]);
                    }
                }
            } else {
                for(let ja=0;ja<theResidue.atoms.length;ja++){
                    if(elementsRange.indexOf(theResidue.atoms[ja]["_atom_site.type_symbol"])>-1){
                        if(altLocsRange.indexOf(theResidue.atoms[ja]["_atom_site.label_alt_id"])>-1){
                            theSelAtoms.push(theResidue.atoms[ja]);
                        }
                    }
                }
            }
        } else {
            let atomSels = atomsRange.split(",");
            if(altLocsRange.length===0&&elementsRange.length===0){
                for(let ja=0;ja<theResidue.atoms.length;ja++){
                    if(atomSels.indexOf(theResidue.atoms[ja]["_atom_site.label_atom_id"])>-1){
                        theSelAtoms.push(theResidue.atoms[ja]);
                    }
                }
            } else if(altLocsRange.length===0) {
                for(let ja=0;ja<theResidue.atoms.length;ja++){
                    if(atomSels.indexOf(theResidue.atoms[ja]["_atom_site.label_atom_id"])>-1){
                        if(elementsRange.indexOf(theResidue.atoms[ja]["_atom_site.type_symbol"])>-1){
                            theSelAtoms.push(theResidue.atoms[ja]);
                        }
                    }
                }
            } else if(elementsRange.length===0) {
                for(let ja=0;ja<theResidue.atoms.length;ja++){
                    if(atomSels.indexOf(theResidue.atoms[ja]["_atom_site.label_atom_id"])>-1){
                        if(altLocsRange.indexOf(theResidue.atoms[ja]["_atom_site.label_alt_id"])>-1){
                            theSelAtoms.push(theResidue.atoms[ja]);
                        }
                    }
                }
            } else {
                for(let ja=0;ja<theResidue.atoms.length;ja++){
                    if(elementsRange.indexOf(theResidue.atoms[ja]["_atom_site.type_symbol"])>-1){
                        if(altLocsRange.indexOf(theResidue.atoms[ja]["_atom_site.label_alt_id"])>-1){
                            theSelAtoms.push(theResidue.atoms[ja]);
                        }
                    }
                }
            }
        }
        return theSelAtoms;
    }

    for(let ic=0;ic<this.chains.length;ic++){
        if(selChains.indexOf(this.chains[ic].getChainID())>-1){
            let residues = this.chains[ic].residues;
            let selResidues = getChainResidues(this.chains[ic]);
            for(let ir=0;ir<residues.length;ir++){
                let res = residues[ir];
                if(selResidues.indexOf(res.atoms[0].getSeqID())>-1){
                    let resAtoms = getResidueAtoms(residues[ir]);
                    for(let ip=0;ip<resAtoms.length;ip++) atoms.push(resAtoms[ip]);
                }
            }
        }
    }
    return atoms;
}

getAllAtoms() {
    let atoms = [];
    for(let ic=0;ic<this.chains.length;ic++){
        let residues = this.chains[ic].residues;
        for(let ir=0;ir<residues.length;ir++){
            let res = residues[ir];
            let resAtoms = res.atoms;
            for(let ip=0;ip<resAtoms.length;ip++) atoms.push(resAtoms[ip]);
        }
    }
    return atoms;
}

getTraceBFactor() {
    // FIXME - Nucleic acid?
    let trace = [];
    let chains = this.chains;
    let maxcadistsq = 23.0;
    let maxc5distsq = 66.0;
    let bFacScale = 0.05; // Why 0.05 ???
    for(let ic=0;ic<chains.length;ic++){
        let thisTrace = [];
        let thisTraceAt = [];
        let residues = chains[ic].residues;
        for(let ir=0;ir<residues.length;ir++){
            let ca = residues[ir].getAtomTrimmed( "CA" );
            if(ca&&ca.element()==="C"){
                if(thisTraceAt.length>0){
                    let caprev = thisTraceAt[thisTraceAt.length-1];
                    let at1x = ca["_atom_site.Cartn_x"];
                    let at1y = ca["_atom_site.Cartn_y"];
                    let at1z = ca["_atom_site.Cartn_z"];
                    let at2x = caprev["_atom_site.Cartn_x"];
                    let at2y = caprev["_atom_site.Cartn_y"];
                    let at2z = caprev["_atom_site.Cartn_z"];
                    let at1at2x = at1x-at2x;
                    let at1at2y = at1y-at2y;
                    let at1at2z = at1z-at2z;
                    let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                    if(distsq>maxcadistsq){
                        trace.push(thisTrace);
                        thisTrace = [];
                        thisTraceAt = [];
                    }
                }
                thisTraceAt.push(ca);
                if(!isNaN(ca["_atom_site.B_iso_or_equiv"])){
                    thisTrace.push(bFacScale*ca["_atom_site.B_iso_or_equiv"]);
                } else {
                    thisTrace.push(0.0);
                }
            } else {
                let c5 = residues[ir].getAtomTrimmed( "C5*" );
                if(!c5){
                    c5 = residues[ir].getAtomTrimmed( "C5'" );
                }
                if(c5){
                    if(thisTraceAt.length>0){
                        let caprev = thisTraceAt[thisTraceAt.length-1];
                        let at1x = c5["_atom_site.Cartn_x"];
                        let at1y = c5["_atom_site.Cartn_y"];
                        let at1z = c5["_atom_site.Cartn_z"];
                        let at2x = caprev["_atom_site.Cartn_x"];
                        let at2y = caprev["_atom_site.Cartn_y"];
                        let at2z = caprev["_atom_site.Cartn_z"];
                        let at1at2x = at1x-at2x;
                        let at1at2y = at1y-at2y;
                        let at1at2z = at1z-at2z;
                        let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                        if(distsq>maxc5distsq){
                            trace.push(thisTrace);
                            thisTrace = [];
                            thisTraceAt = [];
                        }
                    }
                    thisTraceAt.push(c5);
                    if(!isNaN(ca["_atom_site.B_iso_or_equiv"])){
                        thisTrace.push(bFacScale*c5["_atom_site.B_iso_or_equiv"]);
                    } else {
                        thisTrace.push(0.0);
                    }
                } else {
                    let c3 = residues[ir].getAtomTrimmed( "C3*" );
                    if(!c3){
                        c3 = residues[ir].getAtomTrimmed( "C3'" );
                    }
                    if(c3){
                        if(thisTraceAt.length>0){
                            let caprev = thisTraceAt[thisTraceAt.length-1];
                            let at1x = c3["_atom_site.Cartn_x"];
                            let at1y = c3["_atom_site.Cartn_y"];
                            let at1z = c3["_atom_site.Cartn_z"];
                            let at2x = caprev["_atom_site.Cartn_x"];
                            let at2y = caprev["_atom_site.Cartn_y"];
                            let at2z = caprev["_atom_site.Cartn_z"];
                            let at1at2x = at1x-at2x;
                            let at1at2y = at1y-at2y;
                            let at1at2z = at1z-at2z;
                            let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                            if(distsq>maxc5distsq){
                                trace.push(thisTrace);
                                thisTrace = [];
                                thisTraceAt = [];
                            }
                        }
                        thisTraceAt.push(c3);
                        if(!isNaN(ca["_atom_site.B_iso_or_equiv"])){
                            thisTrace.push(0.1*c3["_atom_site.B_iso_or_equiv"]); // Why 0.1 ???
                        } else {
                            thisTrace.push(0.0);
                        }
                    }
                }
            }
        }
        trace.push(thisTrace);
    }
    return trace;
}

getTraceSecStr() {
    // FIXME - Nucleic acid?
    let trace = [];
    let chains = this.chains;
    let maxcadistsq = 23.0;
    let maxc5distsq = 66.0;
    for(let ic=0;ic<chains.length;ic++){
        let thisTrace = [];
        let thisTraceAt = [];
        let residues = chains[ic].residues;
        for(let ir=0;ir<residues.length;ir++){
            let ca = residues[ir].getAtomTrimmed( "CA" );
            if(ca&&ca.element()==="C"){
                if(thisTraceAt.length>0){
                    let caprev = thisTraceAt[thisTraceAt.length-1];
                    let at1x = ca["_atom_site.Cartn_x"];
                    let at1y = ca["_atom_site.Cartn_y"];
                    let at1z = ca["_atom_site.Cartn_z"];
                    let at2x = caprev["_atom_site.Cartn_x"];
                    let at2y = caprev["_atom_site.Cartn_y"];
                    let at2z = caprev["_atom_site.Cartn_z"];
                    let at1at2x = at1x-at2x;
                    let at1at2y = at1y-at2y;
                    let at1at2z = at1z-at2z;
                    let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                    if(distsq>maxcadistsq){
                        trace.push(thisTrace);
                        thisTrace = [];
                        thisTraceAt = [];
                    }
                }
                thisTraceAt.push(ca);
                thisTrace.push(residues[ir]["SSE"]);
            } else {
                let c5 = residues[ir].getAtomTrimmed( "C5*" );
                if(!c5){
                    c5 = residues[ir].getAtomTrimmed( "C5'" );
                }
                if(c5){
                    if(thisTraceAt.length>0){
                        let caprev = thisTraceAt[thisTraceAt.length-1];
                        let at1x = c5["_atom_site.Cartn_x"];
                        let at1y = c5["_atom_site.Cartn_y"];
                        let at1z = c5["_atom_site.Cartn_z"];
                        let at2x = caprev["_atom_site.Cartn_x"];
                        let at2y = caprev["_atom_site.Cartn_y"];
                        let at2z = caprev["_atom_site.Cartn_z"];
                        let at1at2x = at1x-at2x;
                        let at1at2y = at1y-at2y;
                        let at1at2z = at1z-at2z;
                        let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                        if(distsq>maxc5distsq){
                            trace.push(thisTrace);
                            thisTrace = [];
                            thisTraceAt = [];
                        }
                    }
                    thisTraceAt.push(c5);
                    thisTrace.push("SSE_Nucleic");
                } else {
                    let c3 = residues[ir].getAtomTrimmed( "C3*" );
                    if(!c3){
                        c3 = residues[ir].getAtomTrimmed( "C3'" );
                    }
                    if(c3){
                        if(thisTraceAt.length>0){
                            let caprev = thisTraceAt[thisTraceAt.length-1];
                            let at1x = c3["_atom_site.Cartn_x"];
                            let at1y = c3["_atom_site.Cartn_y"];
                            let at1z = c3["_atom_site.Cartn_z"];
                            let at2x = caprev["_atom_site.Cartn_x"];
                            let at2y = caprev["_atom_site.Cartn_y"];
                            let at2z = caprev["_atom_site.Cartn_z"];
                            let at1at2x = at1x-at2x;
                            let at1at2y = at1y-at2y;
                            let at1at2z = at1z-at2z;
                            let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                            if(distsq>maxc5distsq){
                                trace.push(thisTrace);
                                thisTrace = [];
                                thisTraceAt = [];
                            }
                        }
                        thisTraceAt.push(c3);
                        thisTrace.push("SSE_Nucleic");
                    }
                }
            }
        }
        trace.push(thisTrace);
    }
    return trace;
}

getTraceSecStrAtoms() {
    // FIXME - Nucleic acid?
    let trace = [];
    let chains = this.chains;
    let maxcadistsq = 23.0;
    let maxc5distsq = 66.0;
    for(let ic=0;ic<chains.length;ic++){
        let thisTrace = [];
        let thisTraceAt = [];
        let residues = chains[ic].residues;
        for(let ir=0;ir<residues.length;ir++){
            let ca = residues[ir].getAtomTrimmed( "CA" );
            if(ca&&ca.element()==="C"){
                if(thisTraceAt.length>0){
                    let caprev = thisTraceAt[thisTraceAt.length-1];
                    let at1x = ca["_atom_site.Cartn_x"];
                    let at1y = ca["_atom_site.Cartn_y"];
                    let at1z = ca["_atom_site.Cartn_z"];
                    let at2x = caprev["_atom_site.Cartn_x"];
                    let at2y = caprev["_atom_site.Cartn_y"];
                    let at2z = caprev["_atom_site.Cartn_z"];
                    let at1at2x = at1x-at2x;
                    let at1at2y = at1y-at2y;
                    let at1at2z = at1z-at2z;
                    let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                    if(distsq>maxcadistsq){
                        trace.push(thisTrace);
                        thisTrace = [];
                        thisTraceAt = [];
                    }
                }
                thisTraceAt.push(ca);
                thisTrace.push(ca);
            } else {
                let c5 = residues[ir].getAtomTrimmed( "C5*" );
                if(!c5){
                    c5 = residues[ir].getAtomTrimmed( "C5'" );
                }
                if(c5){
                    if(thisTraceAt.length>0){
                        let caprev = thisTraceAt[thisTraceAt.length-1];
                        let at1x = c5["_atom_site.Cartn_x"];
                        let at1y = c5["_atom_site.Cartn_y"];
                        let at1z = c5["_atom_site.Cartn_z"];
                        let at2x = caprev["_atom_site.Cartn_x"];
                        let at2y = caprev["_atom_site.Cartn_y"];
                        let at2z = caprev["_atom_site.Cartn_z"];
                        let at1at2x = at1x-at2x;
                        let at1at2y = at1y-at2y;
                        let at1at2z = at1z-at2z;
                        let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                        if(distsq>maxc5distsq){
                            trace.push(thisTrace);
                            thisTrace = [];
                            thisTraceAt = [];
                        }
                    }
                    thisTraceAt.push(c5);
                    thisTrace.push(c5);
                } else {
                    let c3 = residues[ir].getAtomTrimmed( "C3*" );
                    if(!c3){
                        c3 = residues[ir].getAtomTrimmed( "C3'" );
                    }
                    if(c3){
                        if(thisTraceAt.length>0){
                            let caprev = thisTraceAt[thisTraceAt.length-1];
                            let at1x = c3["_atom_site.Cartn_x"];
                            let at1y = c3["_atom_site.Cartn_y"];
                            let at1z = c3["_atom_site.Cartn_z"];
                            let at2x = caprev["_atom_site.Cartn_x"];
                            let at2y = caprev["_atom_site.Cartn_y"];
                            let at2z = caprev["_atom_site.Cartn_z"];
                            let at1at2x = at1x-at2x;
                            let at1at2y = at1y-at2y;
                            let at1at2z = at1z-at2z;
                            let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                            if(distsq>maxc5distsq){
                                trace.push(thisTrace);
                                thisTrace = [];
                                thisTraceAt = [];
                            }
                        }
                        thisTraceAt.push(c3);
                        thisTrace.push(c3);
                    }
                }
            }
        }
        trace.push(thisTrace);
    }
    return trace;
}

getTraceColours(atomColours) {
    // FIXME - Nucleic acid?
    //FIXME - We need to get colours for the ca["_atom_site.id"] for MODEL 1, not this model.
    console.log(this);
    let trace = [];
    let chains = this.chains;
    let maxcadistsq = 23.0;
    let maxc5distsq = 66.0;
    for(let ic=0;ic<chains.length;ic++){
        let thisTrace = [];
        let thisTraceAt = [];
        let residues = chains[ic].residues;
        for(let ir=0;ir<residues.length;ir++){
            let ca = residues[ir].getAtomTrimmed( "CA" );
            let ca1 = this.hierarchy[0].chains[ic].residues[ir].getAtomTrimmed( "CA" );
            if(ca&&ca.element()==="C"){
                if(thisTraceAt.length>0){
                    let caprev = thisTraceAt[thisTraceAt.length-1];
                    let at1x = ca["_atom_site.Cartn_x"];
                    let at1y = ca["_atom_site.Cartn_y"];
                    let at1z = ca["_atom_site.Cartn_z"];
                    let at2x = caprev["_atom_site.Cartn_x"];
                    let at2y = caprev["_atom_site.Cartn_y"];
                    let at2z = caprev["_atom_site.Cartn_z"];
                    let at1at2x = at1x-at2x;
                    let at1at2y = at1y-at2y;
                    let at1at2z = at1z-at2z;
                    let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                    if(distsq>maxcadistsq){
                        trace.push(thisTrace);
                        thisTrace = [];
                        thisTraceAt = [];
                    }
                }
                thisTraceAt.push(ca);
                thisTrace.push(atomColours[ca1["_atom_site.id"]]);
            } else {
                let c5 = residues[ir].getAtomTrimmed( "C5*" );
                let c51 = this.hierarchy[0].chains[ic].residues[ir].getAtomTrimmed( "C5*" );
                if(!c5){
                    c5 = residues[ir].getAtomTrimmed( "C5'" );
                    c51 = this.hierarchy[0].chains[ic].residues[ir].getAtomTrimmed( "C5'" );
                }
                if(c5){
                    if(thisTraceAt.length>0){
                        let caprev = thisTraceAt[thisTraceAt.length-1];
                        let at1x = c5["_atom_site.Cartn_x"];
                        let at1y = c5["_atom_site.Cartn_y"];
                        let at1z = c5["_atom_site.Cartn_z"];
                        let at2x = caprev["_atom_site.Cartn_x"];
                        let at2y = caprev["_atom_site.Cartn_y"];
                        let at2z = caprev["_atom_site.Cartn_z"];
                        let at1at2x = at1x-at2x;
                        let at1at2y = at1y-at2y;
                        let at1at2z = at1z-at2z;
                        let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                        if(distsq>maxc5distsq){
                            trace.push(thisTrace);
                            thisTrace = [];
                            thisTraceAt = [];
                        }
                    }
                    thisTraceAt.push(c5);
                    thisTrace.push(atomColours[c51["_atom_site.id"]]);
                } else {
                    let c3 = residues[ir].getAtomTrimmed( "C3*" );
                    let c31 = this.hierarchy[0].chains[ic].residues[ir].getAtomTrimmed( "C3*" );
                    if(!c3){
                        c3 = residues[ir].getAtomTrimmed( "C3'" );
                        c31 = this.hierarchy[0].chains[ic].residues[ir].getAtomTrimmed( "C3'" );
                    }
                    if(c3){
                        if(thisTraceAt.length>0){
                            let caprev = thisTraceAt[thisTraceAt.length-1];
                            let at1x = c3["_atom_site.Cartn_x"];
                            let at1y = c3["_atom_site.Cartn_y"];
                            let at1z = c3["_atom_site.Cartn_z"];
                            let at2x = caprev["_atom_site.Cartn_x"];
                            let at2y = caprev["_atom_site.Cartn_y"];
                            let at2z = caprev["_atom_site.Cartn_z"];
                            let at1at2x = at1x-at2x;
                            let at1at2y = at1y-at2y;
                            let at1at2z = at1z-at2z;
                            let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                            if(distsq>maxc5distsq){
                                trace.push(thisTrace);
                                thisTrace = [];
                                thisTraceAt = [];
                            }
                        }
                        thisTraceAt.push(c3);
                        thisTrace.push(atomColours[c31["_atom_site.id"]]);
                    }
                }
            }
        }
        trace.push(thisTrace);
    }
    return trace;
}

getTrace() {
    // FIXME - Nucleic acid?
    let trace = [];
    let chains = this.chains;
    let maxcadistsq = 23.0;
    let maxc5distsq = 66.0;
    for(let ic=0;ic<chains.length;ic++){
        let thisTrace = [];
        let thisTraceAt = [];
        let residues = chains[ic].residues;
        for(let ir=0;ir<residues.length;ir++){
            let ca = residues[ir].getAtomTrimmed( "CA" );
            if(ca&&ca.element()==="C"){
                if(thisTraceAt.length>0){
                    let caprev = thisTraceAt[thisTraceAt.length-1];
                    let at1x = ca["_atom_site.Cartn_x"];
                    let at1y = ca["_atom_site.Cartn_y"];
                    let at1z = ca["_atom_site.Cartn_z"];
                    let at2x = caprev["_atom_site.Cartn_x"];
                    let at2y = caprev["_atom_site.Cartn_y"];
                    let at2z = caprev["_atom_site.Cartn_z"];
                    let at1at2x = at1x-at2x;
                    let at1at2y = at1y-at2y;
                    let at1at2z = at1z-at2z;
                    let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                    if(distsq>maxcadistsq){
                        trace.push(thisTrace);
                        thisTrace = [];
                        thisTraceAt = [];
                    }
                }
                thisTraceAt.push(ca);
                thisTrace.push(ca.x());
                thisTrace.push(ca.y());
                thisTrace.push(ca.z());
            } else {
                let c5 = residues[ir].getAtomTrimmed( "C5*" );
                if(!c5){
                    c5 = residues[ir].getAtomTrimmed( "C5'" );
                }
                if(c5){
                    if(thisTraceAt.length>0){
                        let caprev = thisTraceAt[thisTraceAt.length-1];
                        let at1x = c5["_atom_site.Cartn_x"];
                        let at1y = c5["_atom_site.Cartn_y"];
                        let at1z = c5["_atom_site.Cartn_z"];
                        let at2x = caprev["_atom_site.Cartn_x"];
                        let at2y = caprev["_atom_site.Cartn_y"];
                        let at2z = caprev["_atom_site.Cartn_z"];
                        let at1at2x = at1x-at2x;
                        let at1at2y = at1y-at2y;
                        let at1at2z = at1z-at2z;
                        let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                        if(distsq>maxc5distsq){
                            trace.push(thisTrace);
                            thisTrace = [];
                            thisTraceAt = [];
                        }
                    }
                    thisTraceAt.push(c5);
                    thisTrace.push(c5.x());
                    thisTrace.push(c5.y());
                    thisTrace.push(c5.z());
                } else {
                    let c3 = residues[ir].getAtomTrimmed( "C3*" );
                    if(!c3){
                        c3 = residues[ir].getAtomTrimmed( "C3'" );
                    }
                    if(c3){
                        if(thisTraceAt.length>0){
                            let caprev = thisTraceAt[thisTraceAt.length-1];
                            let at1x = c3["_atom_site.Cartn_x"];
                            let at1y = c3["_atom_site.Cartn_y"];
                            let at1z = c3["_atom_site.Cartn_z"];
                            let at2x = caprev["_atom_site.Cartn_x"];
                            let at2y = caprev["_atom_site.Cartn_y"];
                            let at2z = caprev["_atom_site.Cartn_z"];
                            let at1at2x = at1x-at2x;
                            let at1at2y = at1y-at2y;
                            let at1at2z = at1z-at2z;
                            let distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                            if(distsq>maxc5distsq){
                                trace.push(thisTrace);
                                thisTrace = [];
                                thisTraceAt = [];
                            }
                        }
                        thisTraceAt.push(c3);
                        thisTrace.push(c3.x());
                        thisTrace.push(c3.y());
                        thisTrace.push(c3.z());
                    }
                }
            }
        }
        trace.push(thisTrace);
    }

    return trace;
}

getModelNum() {
    return this.chains[0].residues[0].atoms[0]["_atom_site.pdbx_PDB_model_num"];
}

addChain(chain) {
    this.chains.push(chain);
    chain.model = this;
}

CloseContacts(atoms,atoms2,mindist,maxdist,checkMetalDistance) {
    let self = this;
    let contacts = this.SeekContacts(atoms,atoms2,mindist,maxdist);
    function checkMetal(contact){
        if(!contact[1].isMetal()&&!contact[2].isMetal()){
            return true;
        }
        if(contact[1].isMetal()&&contact[0]<self.metalCoordDistance(contact[1].element())){
            return true;
        }
        if(contact[2].isMetal()&&contact[0]<self.metalCoordDistance(contact[2].element())){
            return true;
        }
        return false;
    }
    if(checkMetalDistance){
        return contacts.filter(checkMetal);
    }
    return contacts;
}

}

class Chain{
constructor() {
    this.residues = [];
}

getAtoms() {
    let chainAtoms = [];
    for(let ir=0;ir<this.residues.length;ir++){
        for(let ip=0;ip<this.residues[ir].atoms.length;ip++) chainAtoms.push(this.residues[ir].atoms[ip]);
    }
    return chainAtoms;
}

getChainID() {
    //return this.residues[0].atoms[0]["_atom_site.label_asym_id"];
    return this.residues[0].atoms[0]["_atom_site.auth_asym_id"];
}

addResidue(res) {
    this.residues.push(res);
    res.chain = this;
}

getResidue(i) {
    return this.residues[i];
}
}

class Residue{
constructor() {
    this.atoms = [];
}

isAminoAcid() {
    return (Model.prototype.aminoResidues.indexOf(this.atoms[0]["_atom_site.label_comp_id"])>-1);
}

getCASideAtoms(atname) {
    let sideAtoms = [];

    for(let iat=0;iat<this.atoms.length;iat++){
        if((Model.prototype.mainAtoms.indexOf(this.atoms[iat]["_atom_site.label_atom_id"])===-1)||this.atoms[iat]["_atom_site.label_atom_id"]==="CA"){
            sideAtoms.push(this.atoms[iat]);
        }
    }

    return sideAtoms;
}

getMainAtoms(atname) {
    let mainAtoms = [];

    for(let iat=0;iat<this.atoms.length;iat++){
        if(Model.prototype.mainAtoms.indexOf(this.atoms[iat]["_atom_site.label_atom_id"])!==-1){
            mainAtoms.push(this.atoms[iat]);
        }
    }

    return mainAtoms;
}

getSideAtoms(atname) {
    let sideAtoms = [];

    for(let iat=0;iat<this.atoms.length;iat++){
        if(Model.prototype.mainAtoms.indexOf(this.atoms[iat]["_atom_site.label_atom_id"])===-1){
            sideAtoms.push(this.atoms[iat]);
        }
    }

    return sideAtoms;
}

getAtom(atname) {
    for(let iat=0;iat<this.atoms.length;iat++){
        if(atname===this.atoms[iat]["_atom_site.label_atom_id"]){
            return this.atoms[iat];
        }
        //Deal with mmCIF quoting certain atom names.
        var y = this.atoms[iat]["_atom_site.label_atom_id"].replace(/^\"|\"$/g, '');
        if(atname===y){
            return this.atoms[iat];
        }
    }
    return false;
}

getAtomTrimmed(atname) {
    return this.getAtom(atname);
}

getResidueID() {
    let resId = "";
    let seqId = this.getSeqID();
    resId += seqId;
    let insCode = this.getInsCode();
    if(insCode!=="?"&&insCode!=="."){
        resId += "."+insCode;
    }
    return resId;
}

getName() {
    return this.atoms[0]["_atom_site.label_comp_id"];
}

addAtom(atom) {
    this.atoms.push(atom);
    atom.residue = this;
}

getSeqID() {
    return this.atoms[0].getSeqID();
}

getSeqIDLabel() {
    return this.atoms[0].getSeqIDLabel();
}

getSeqIDAuth() {
    return this.atoms[0].getSeqIDAuth();
}

getInsCode() {
    return this.atoms[0]["_atom_site.pdbx_PDB_ins_code"];
}
}

class Atom {
constructor(oldAtom) {
    this.bonds = [];
    if(typeof(oldAtom)!=="undefined"&&oldAtom){
        for (let prop in oldAtom) {
            if (oldAtom.hasOwnProperty(prop)) {
                this[prop] = oldAtom[prop];
            }
        }
    }
}

getAtomID() {
    // FIXME, doesn't do altLocs.
    let altLoc = this["_atom_site.label_alt_id"];
    let modelNum = this.residue.chain.model.getModelNum();
    let chainID = this.getChainID();
    let residueID = this.getResidueID();
    let thisAtomID = ""+this["_atom_site.label_atom_id"];
    if(typeof(modelNum)==="undefined"){
        modelNum = "?";
    }
    if(typeof(chainID)==="undefined"){
        chainID = "?";
    }
    if(typeof(residueID)==="undefined"){
        residueID = "?";
    }
    if(typeof(thisAtomID)==="undefined"){
        thisAtomID = "?";
    }
    let atomId = "/"+modelNum+"/"+chainID+"/"+residueID+"("+this.residue.getName()+")/"+thisAtomID;
    if(typeof(altLoc)!=="undefined"&&altLoc!=="."&&altLoc!=="?"&&altLoc!==""&&altLoc!==" "){
        atomId += ":"+altLoc;
    }
    return atomId;
}

getResidueID() {
    let resId = "";
    let seqId = this.getSeqID();
    if(typeof(seqId)==="undefined"){
        seqId = this.getSeqIDLabel();
    }
    resId += seqId;
    let insCode = this.getInsCode();
    if(insCode!=="?"&&insCode!=="."){
        resId += "."+insCode;
    }
    return resId;
}

getSeqIDAuth() {
    return this["_atom_site.auth_seq_id"];
}

getSeqIDLabel() {
    return this["_atom_site.label_seq_id"];
}

getSeqID() {
    return this.getSeqIDAuth();
}

getInsCode() {
    return this["_atom_site.pdbx_PDB_ins_code"];
}

element() {
    return this["_atom_site.type_symbol"];
}

x() {
    return this["_atom_site.Cartn_x"];
}

y() {
    return this["_atom_site.Cartn_y"];
}

z() {
    return this["_atom_site.Cartn_z"];
}

isMetal() {
    if(Model.prototype.metalElements.indexOf(this.element().toUpperCase())>-1){
        return true;
    }
    return false;
}

getBonds() {
    return this.bonds;
}

getChainIDAuth() {
    return this["_atom_site.auth_asym_id"];
}

getChainIDLabel() {
    return this["_atom_site.label_asym_id"];
}

getChainID() {
    return this.getChainIDAuth();
}

}

function parsePDB(lines,structureName) {

/*
MODEL, MDLNUM
_atom_site.label_entity_id : "1"
*/
    let sequences = [];
    let atoms = [];
    let elements = [];
    let restypes = [];
    let models = [];
    let altlocs = [];
    let current_model = "?";
    let modamino = [];
    let cryst = {};

    let inSeqRes = false;
    let currentSeqRes = [];
    let currentSeqChain = "XXX_UNKNOWN_XXX";

    for(let il=0;il<lines.length;il++){
        if(lines[il].substr(0,6)==="SEQRES"){
            inSeqRes = true;
            let theChain = lines[il][11];
            let nSeqRes = parseInt(lines[il].substr(13,4));
            let thisSeqResSeq = [];
            try {
                let res1 = lines[il].substr(19,3).trim();
                if(res1.length>0) thisSeqResSeq.push(res1);
                let res2 = lines[il].substr(23,3).trim();
                if(res2.length>0) thisSeqResSeq.push(res2);
                let res3 = lines[il].substr(27,3).trim();
                if(res3.length>0) thisSeqResSeq.push(res3);
                let res4 = lines[il].substr(31,3).trim();
                if(res4.length>0) thisSeqResSeq.push(res4);
                let res5 = lines[il].substr(35,3).trim();
                if(res5.length>0) thisSeqResSeq.push(res5);
                let res6 = lines[il].substr(39,3).trim();
                if(res6.length>0) thisSeqResSeq.push(res6);
                let res7 = lines[il].substr(43,3).trim();
                if(res7.length>0) thisSeqResSeq.push(res7);
                let res8 = lines[il].substr(47,3).trim();
                if(res8.length>0) thisSeqResSeq.push(res8);
                let res9 = lines[il].substr(51,3).trim();
                if(res9.length>0) thisSeqResSeq.push(res9);
                let res10 = lines[il].substr(55,3).trim();
                if(res10.length>0) thisSeqResSeq.push(res10);
                let res11 = lines[il].substr(59,3).trim();
                if(res11.length>0) thisSeqResSeq.push(res11);
                let res12 = lines[il].substr(63,3).trim();
                if(res12.length>0) thisSeqResSeq.push(res12);
                let res13 = lines[il].substr(67,3).trim();
                if(res13.length>0) thisSeqResSeq.push(res13);
            } catch(e) {
                console.log("Ran out of residues - not a problem hopefully.");
            }
            if(theChain===currentSeqChain){
                currentSeqRes.push(...thisSeqResSeq);
            } else {
                if(currentSeqRes.length>0){
                    //Push the old one
                    let nposs_nuc = countPossibleNucleotide(currentSeqRes);
                    if(nposs_nuc/currentSeqRes.length>0.9){
                        let sequenceShort = currentSeqRes.map(x => sequenceNucleicThreeLetterMap[x]).join('');
                        let theType = analyzeSequenceType(sequenceShort);//this had better return one of the RNA/DNA types
                        sequences.push({name:structureName+"_"+currentSeqChain,id:guid(),"sequence":sequenceShort,chain:currentSeqChain,type:theType});
                    } else {
                        let sequenceShort = currentSeqRes.map(x => sequenceAminoThreeLetterMap[x]).join('');
                        sequences.push({name:structureName+"_"+currentSeqChain,id:guid(),"sequence":sequenceShort,chain:currentSeqChain,type:"polypeptide(L)"});
                    }
                }
                currentSeqRes = thisSeqResSeq;
                currentSeqChain = theChain;
            }
        } else {
            if(inSeqRes){
                //Reset this in case more SEQRES cards come along. (Probably not).
                inSeqRes = false;
                //Push the remaining one
                let nposs_nuc = countPossibleNucleotide(currentSeqRes);
                if(nposs_nuc/currentSeqRes.length>0.9){
                    let sequenceShort = currentSeqRes.map(x => sequenceNucleicThreeLetterMap[x]).join('');
                    let theType = analyzeSequenceType(sequenceShort);//this had better return one of the RNA/DNA types
                    sequences.push({name:structureName+"_"+currentSeqChain,id:guid(),"sequence":sequenceShort,chain:currentSeqChain,type:theType});
                } else {
                    let sequenceShort = currentSeqRes.map(x => sequenceAminoThreeLetterMap[x]).join('');
                    sequences.push({name:structureName+"_"+currentSeqChain,id:guid(),"sequence":sequenceShort,chain:currentSeqChain,type:"polypeptide(L)"});
                }
            }
        }

        if(lines[il].substr(0,6)==="MODEL "){
            current_model = parseInt(lines[il].substr(10,4).trim());
            if(models.indexOf(current_model)===-1){
                models.push(current_model);
            }
        }
        if(lines[il].substr(0,6)==="CRYST1"){
            let a = parseFloat(lines[il].substring(6,15));
            let b = parseFloat(lines[il].substring(15,24));
            let c = parseFloat(lines[il].substring(24,33));
            let alpha = parseFloat(lines[il].substring(33,40));
            let beta  = parseFloat(lines[il].substring(40,47));
            let gamma = parseFloat(lines[il].substring(47,54));
            let sg = lines[il].substring(55,66).trim();
            let cell = new Cell();
            cell.init(a,b,c,alpha,beta,gamma);
            cryst["cell"] = cell;
            cryst["sg"] = sg;
        }
        if(lines[il].substr(0,6)==="ATOM  "||lines[il].substr(0,6)==="HETATM"){
            let atom = new Atom();
            atom["_atom_site.Cartn_x_esd"] = Number.NaN;
            atom["_atom_site.Cartn_y_esd"] = Number.NaN;
            atom["_atom_site.Cartn_z_esd"] = Number.NaN;
            atom["_atom_site.B_iso_or_equiv_esd"] = Number.NaN;
            atom["_atom_site.occupancy_esd"] = Number.NaN;
            atom["_atom_site.pdbx_formal_charge_esd"] = Number.NaN;
            atom["_atom_site.Cartn_x"] = Number.NaN;
            atom["_atom_site.Cartn_y"] = Number.NaN;
            atom["_atom_site.Cartn_z"] = Number.NaN;
            atom["_atom_site.B_iso_or_equiv"] = Number.NaN;
            atom["_atom_site.occupancy"] = Number.NaN;
            atom["_atom_site.pdbx_formal_charge"] = Number.NaN;
            atom["_atom_site.id"] = "?";
            atom["_atom_site.label_atom_id"] = "?";
            atom["_atom_site.label_alt_id"] = "?";
            atom["_atom_site.label_comp_id"] = "?";
            atom["_atom_site.label_seq_id"] = "?";
            atom["_atom_site.label_asym_id"] = "?";
            atom["_atom_site.auth_asym_id"] = "?";
            atom["_atom_site.pdbx_PDB_ins_code"] = "?";
            atom["_atom_site.type_symbol"] = "?";
            atom["_atom_site.pdbx_PDB_model_num"] = current_model;
            let id = lines[il].substr(6,5).trim();
            // This next line is arguably "wrong" but makes PDB parsing same as MMCIF and means we do not have to trim atom names repeatedly.
            let label_atom_id = lines[il].substr(12,4).trim(); 
            let label_alt_id = lines[il].substr(16,1).trim();
            let label_comp_id = lines[il].substr(17,3).trim();
            let label_asym_id = lines[il].substr(21,1).trim();
            let auth_asym_id = lines[il].substr(21,1).trim();
            let label_seq_id = lines[il].substr(22,4).trim();
            let pdbx_PDB_ins_code = lines[il].substr(26,1).trim();
            let type_symbol = lines[il].substr(76,2).trim();
            let Cartn_x = lines[il].substr(30,8).trim();
            let Cartn_y = lines[il].substr(38,8).trim();
            let Cartn_z = lines[il].substr(46,8).trim();
            let B_iso_or_equiv = lines[il].substr(60,6).trim();
            let occupancy = lines[il].substr(54,6).trim();
            let pdbx_formal_charge = lines[il].substr(78,2).trim();
            if(lines[il].substr(0,6)==="HETATM"){
                atom["_atom_site.group_PDB"] = "HETATM";
            } else {
                atom["_atom_site.group_PDB"] = "ATOM";
                if(label_comp_id.length>0){
                    if(Model.prototype.aminoResidues.indexOf(label_comp_id)===-1){
                        if(modamino.indexOf(label_comp_id)===-1){
                            modamino.push(label_comp_id);
                        }
                    }
                }
            }
            if(id.length>0){
                atom["_atom_site.id"] = id;
            }
            if(label_atom_id.length>0){
                atom["_atom_site.label_atom_id"] = label_atom_id;
            }
            if(label_alt_id.length>0){
                atom["_atom_site.label_alt_id"] = label_alt_id;
                if(altlocs.indexOf(label_alt_id)===-1){
                    altlocs.push(label_alt_id);
                }
            }
            if(label_comp_id.length>0){
                atom["_atom_site.label_comp_id"] = label_comp_id;
                if(restypes.indexOf(label_comp_id)===-1){
                    restypes.push(label_comp_id);
                }
            }
            if(label_asym_id.length>0){
                atom["_atom_site.label_asym_id"] = label_asym_id;
            }
            if(auth_asym_id.length>0){
                atom["_atom_site.auth_asym_id"] = auth_asym_id;
            }
            if(label_seq_id.length>0){
                atom["_atom_site.label_seq_id"] = label_seq_id;
            }
            if(pdbx_PDB_ins_code.length>0){
                atom["_atom_site.pdbx_PDB_ins_code"] = pdbx_PDB_ins_code;
            }
            if(type_symbol.length>0){
                atom["_atom_site.type_symbol"] = type_symbol;
                if(elements.indexOf(type_symbol)===-1){
                    elements.push(type_symbol);
                }
            }
            if(Cartn_x.length>0){
                atom["_atom_site.Cartn_x"] = parseFloat(Cartn_x);
            }
            if(Cartn_y.length>0){
                atom["_atom_site.Cartn_y"] = parseFloat(Cartn_y);
            }
            if(Cartn_z.length>0){
                atom["_atom_site.Cartn_z"] = parseFloat(Cartn_z);
            }
            if(B_iso_or_equiv.length>0){
                atom["_atom_site.B_iso_or_equiv"] = parseFloat(B_iso_or_equiv);
            }
            if(occupancy.length>0){
                atom["_atom_site.occupancy"] = parseFloat(occupancy);
            }
            if(pdbx_formal_charge.length>0){
                if(pdbx_formal_charge.substr(0,1)==="-"){
                    atom["_atom_site.pdbx_formal_charge"] = -parseFloat(pdbx_formal_charge.substr(1,1));
                } else if(pdbx_formal_charge.substr(0,1)==="+"){
                    atom["_atom_site.pdbx_formal_charge"] = parseFloat(pdbx_formal_charge.substr(1,1));
                } else {
                    atom["_atom_site.pdbx_formal_charge"] = parseFloat(pdbx_formal_charge.substr(0,1));
                    if(pdbx_formal_charge.substr(1,1)==="-"){
                        atom["_atom_site.pdbx_formal_charge"] = -atom["_atom_site.pdbx_formal_charge"];
                    }
                }
            }
            atoms.push(atom);
        }
    }

    atoms = atomsToHierarchy(atoms);
    let res = {};
    res["atoms"] = atoms;
    res["elements"] = elements;
    res["restypes"] = restypes;
    res["altlocs"] = altlocs;
    res["models"] = models;
    res["modamino"] = modamino;
    res["cryst"] = cryst;
    res["sequences"] = sequences;
    res["structureName"] = structureName;

    console.log(res["sequences"]);

    return res;
}

function getNonLoopPreSplit(lines,loopName_in,filterName,filterValue){
    let il=0;
    let len = lines.length;
    let loopName = loopName_in+".";
    let loopLines = [];
    let headerLines = [];
    for(;il<len;il++){
        let l = lines[il].replace(/(^\s+|\s+$)/g,'').trim();
        if(l.startsWith(loopName)){
            console.log(l);
            let split = l.match(/(?:[^\s"]+|"[^"]*")+/g);
            console.log(split);
            let name = split[0];
            let value = "";
            let inChunk = false;
            if(split.length===1){
                //We look on subsequent lines
                while(il<len){
                    il++;
                    if(lines[il].startsWith(";")&&!inChunk&&lines[il].endsWith(";")){
                        value = '"' + trim27(lines[il].substring(1,lines[il].length-1)).replace("'","\\\'") + '"';
                        inChunk = true;
                    } else if(lines[il].startsWith(";")&&!inChunk){
                        value = '"' + trim27(lines[il].substring(1,lines[il].length-1)).replace("'","\\\'");
                        inChunk = true;
                    } else {
                        if(lines[il].includes(";")){
                            value += " " + trim27(lines[il].substring(0,lines[il].indexOf(";"))).replace("'","\\\'") + '"';
                            inChunk = false;
                            break;
                        }
                        value += " " + trim27(lines[il]).replace("'","\\\'");
                    }
                }
            } else {
                value = split[1];
            }
            loopLines.push(value);
            headerLines.push(name);
        }
    }
    return [headerLines,[loopLines]];
}

function getLoopPreSplit(lines,loopName_in,filterName,filterValue){
    // This is faster, but still quite slow ...
    let start = new Date().getTime();
    let loopName = loopName_in+".";
    let inWantedLoop = false;
    let loopLines = [];
    let headerLines = [];
    let len = lines.length;
    let il=0;

    let doPrint = false;
    //if(loopName==="_entity_poly.") doPrint = true;

    for(;il<len;il++){
        let l = lines[il].replace(/(^\s+|\s+$)/g,'').trim();
        if(l === "loop_"||(l.substring(0,1)==="_"&&l.substring(0,loopName.length)!==loopName)){
            if(inWantedLoop){
                console.log(loopName_in+" "+loopLines.length+" "+il);
                break;
            }else{
                if(il<lines.length){
                    if(lines[il+1].trim().substring(0,loopName.length) === loopName){
                        inWantedLoop = true;
                    }
                }
            }
        }else{
            if(inWantedLoop){
                if(l.substring(0,1) === "_"){
                    headerLines.push(l.trim());
                } else {
                    break;
                }
            }
        }
    }

    console.log("Time to end of first getLoopPreSplit loop: "+(new Date().getTime()-start));
    if(typeof(filterName)==="undefined"||typeof(filterValue)==="undefined"){
        let accumStringArray = [];
        for(;il<len;il++){
            //FIXME - There may be problems with some semi-colon (;) separated "non-simple" (multi-line?) strings.
            //let l = lines[il].replace(/(^\s+|\s+$)/g,'');
            let l = trim27(lines[il]);
            let theRest = "";
            if(lines[il].startsWith(";")){
                if(doPrint) console.log("---",lines[il]);
                //FIXME - I am not coping with variables that contain double-quotes (").
                if(l.endsWith(";")){
                    //No idea if such lines are valid, or exist in any mmCIF files.
                    l = '"' + trim27(lines[il].substring(1,lines[il].length-1)).replace("'","\\\'") + '"';
                } else {
                    l = '"' + trim27(lines[il].substring(1)).replace("'","\\\'");
                    while(il<len){
                        il++;
                        if(doPrint) console.log("+++",lines[il]);
                        if(lines[il].includes(";")){
                            l += " " + trim27(lines[il].substring(0,lines[il].indexOf(";"))).replace("'","\\\'") + '"';
                            theRest = trim27(lines[il].substring(lines[il].indexOf(";")+1,lines[il].length)).replace("'","\\\'");
                            break;
                        }
                        l += " " + trim27(lines[il]).replace("'","\\\'");
                    }
                }
            }
            if(l === "loop_"||(l.substring(0,1)==="_"&&l.substring(0,loopName.length)!==loopName)){
                //console.log(loopName_in+" "+loopLines.length+" "+il);
                break;
            }else{
                if(doPrint) console.log(l,l.length);
                let split = l.match(/(?:[^\s"]+|"[^"]*")+/g);
                if(doPrint) console.log(split.length,headerLines.length,split);
                if(doPrint) console.log(theRest,theRest.length);
                //This chomps lines to get appropriate number of elements consistent with headers. But see FIXME above.
                accumStringArray.push(...split);
                if(theRest.length>0){
                    let splitRest = theRest.match(/(?:[^\s"]+|"[^"]*")+/g);
                    accumStringArray.push(...splitRest);
                }
                if(accumStringArray.length>=headerLines.length){
                    loopLines.push(accumStringArray.splice(0,headerLines.length));
                }
            }
        }
    } else {
        let nameIdx = headerLines.indexOf(filterName);
        for(;il<len;il++){
            //let l = lines[il].replace(/(^\s+|\s+$)/g,'');
            let l = trim27(lines[il]);
            if(l === "loop_"||(l.substring(0,1)==="_"&&l.substring(0,loopName.length)!==loopName)){
                //console.log(loopName_in+" "+loopLines.length+" "+il);
                break;
            }else{
                if(l.indexOf(filterValue)!==-1){
                    // This line is the killer .....
                    let split = l.match(/(?:[^\s"]+|"[^"]*")+/g);
                    if(split[nameIdx]===filterValue){
                        // or is it this ....
                        loopLines.push(split);
                    }
                }
            }
        }
    }
    console.log("Time to end of second getLoopPreSplit loop: "+(new Date().getTime()-start));
    
    return [headerLines,loopLines];
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

function parseLoop(loopLines,FLOAT_PROPS){
    let loopItems = [];
    let loopLinesTypes = [];
    for(let il=0;il<loopLines.length;il++){
        if(loopLines[il].substring(0,1) === "_"){
            loopLinesTypes.push(loopLines[il]);
        } else if(splitQuotedCIFString(loopLines[il]).length===loopLinesTypes.length){
            let atom = {};
            let split = splitQuotedCIFString(loopLines[il]);
            if(split[0]==="TER") continue; // FIXME - Hmm. In general, do these pop-up.
            for(let iprop=0;iprop<split.length;iprop++){
                if(FLOAT_PROPS.indexOf(loopLinesTypes[iprop])>-1){
                    try{
                        atom[loopLinesTypes[iprop]] = parseFloat(split[iprop]);
                    } catch(e) {
                        atom[loopLinesTypes[iprop]] = Number.NaN;
                    }
                } else {
                    atom[loopLinesTypes[iprop]] = split[iprop];
                }
            }
            loopItems.push(atom);
        } else {
            //console.log(loopLines[il].match(/\S+/g).length+" "+loopLines.length+" "+loopLines[il]);
            //console.log(loopLines[il]);
        }
    }
    return loopItems;
}

function parseCIFFromDict(lines) {

    const FLOAT_PROPS = ["_chem_comp_atom.partial_charge", "_chem_comp_atom.x", "_chem_comp_atom.y","_chem_comp_atom.z" ];

    let atomSiteLines = getLoop(lines,"_chem_comp_atom");

    let atomSiteTypes = [];
    let atoms = [];

    let elements = [];
    let restypes = [];
    let models = [];
    let altlocs = [];
    let id = 0;
    for(let il=0;il<atomSiteLines.length;il++){
        if(atomSiteLines[il].substring(0,1) === "_"){
            atomSiteTypes.push(atomSiteLines[il]);
        } else if(splitQuotedCIFString(atomSiteLines[il]).length===atomSiteTypes.length){
            let atom = new Atom();
            let split = splitQuotedCIFString(atomSiteLines[il]);
            if(split[0]==="TER") continue;
            for(let iprop=0;iprop<split.length;iprop++){
                if(FLOAT_PROPS.indexOf(atomSiteTypes[iprop])>-1){
                    try{
                        if(atomSiteTypes[iprop]==="_chem_comp_atom.x"){
                            atom["_atom_site.Cartn_x"] = parseFloat(split[iprop]);
                        } else if(atomSiteTypes[iprop]==="_chem_comp_atom.y"){
                            atom["_atom_site.Cartn_y"] = parseFloat(split[iprop]);
                        } else if(atomSiteTypes[iprop]==="_chem_comp_atom.z"){
                            atom["_atom_site.Cartn_z"] = parseFloat(split[iprop]);
                        } else {
                            atom[atomSiteTypes[iprop].replace("_chem_comp_atom","_atom_site")] = parseFloat(split[iprop]);
                        }
                    } catch(e) {
                        atom[atomSiteTypes[iprop].replace("_chem_comp_atom","_atom_site")] = Number.NaN;
                    }
                } else {
                    if(atomSiteTypes[iprop]==="_chem_comp_atom.comp_id"){
                        atom["_atom_site.label_comp_id"] = split[iprop];
                    } else if(atomSiteTypes[iprop]==="_chem_comp_atom.atom_id"){
                        atom["_atom_site.label_atom_id"] = split[iprop];
                    } else {
                        atom[atomSiteTypes[iprop].replace("_chem_comp_atom","_atom_site")] = split[iprop];
                    }
                }
                if(atomSiteTypes[iprop]==="_chem_comp_atom.type_symbol"){
                    if(elements.indexOf(split[iprop])===-1){
                        elements.push(split[iprop]);
                    }
                }
                if(atomSiteTypes[iprop]==="_chem_comp_atom.comp_id"){
                    if(restypes.indexOf(split[iprop])===-1){
                        restypes.push(split[iprop]);
                    }
                }
            }
            atom["_atom_site.id"] = id++;
            atom["_atom_site.label_seq_id"] = "1";
            atom["_atom_site.pdbx_PDB_ins_code"] = ".";
            atoms.push(atom);
        } else {
            //console.log(atomSiteLines[il].match(/\S+/g).length+" "+atomSiteTypes.length+" "+atomSiteLines[il]);
            //console.log(atomSiteLines[il]);
        }
    }

    for(let iloc=0;iloc<altlocs.length;iloc++){
        if(altlocs[iloc] === "."){
            altlocs[iloc] = "";
        }
    }

    let anisou = parseLoop(getLoop(lines,"_atom_site_anisotrop"),["_atom_site_anisotrop.U[1][1]","_atom_site_anisotrop.U[2][2]","_atom_site_anisotrop.U[3][3]","_atom_site_anisotrop.U[1][2]","_atom_site_anisotrop.U[1][3]","_atom_site_anisotrop.U[2][3]","_atom_site_anisotrop.U[1][1]_esd","_atom_site_anisotrop.U[2][2]_esd","_atom_site_anisotrop.U[3][3]_esd","_atom_site_anisotrop.U[1][2]_esd","_atom_site_anisotrop.U[1][3]_esd","_atom_site_anisotrop.U[2][3]_esd"]);
    //console.log(anisou);

    insertAnisou(atoms,anisou);

    atoms = atomsToHierarchy(atoms);

    let res = {};
    res["atoms"] = atoms;
    res["elements"] = elements;
    res["restypes"] = restypes;
    res["models"] = models;
    res["altlocs"] = altlocs;

    return res;
    
}

function analyzeSequenceType(thisSeq) {
    // We need to try to determine saccharide chains as well.
    let theType = "unknown";
    let nposs_nuc = (thisSeq.match(/A/g)|| []).length + (thisSeq.match(/G/g)|| []).length + (thisSeq.match(/C/g)|| []).length + (thisSeq.match(/T/g)|| []).length + (thisSeq.match(/U/g)|| []).length + (thisSeq.match(/N/g)|| []).length;
    if(nposs_nuc/thisSeq.length>0.9){
        //Probably nucleic
        if((thisSeq.match(/U/g)|| []).length > 0){
            //Probably RNA
            theType = "polyribonucleotide";
        } else {
            //Probably DNA
            theType = "polydeoxyribonucleotide";
        }
    } else {
        //Possibly/probably peptide
        theType = "polypeptide(L)";
    }

    return theType;

}

function parseMMCIF(lines,structureName) {

    let start = new Date().getTime();
    console.log(lines.length);

    const FLOAT_PROPS = ["_atom_site.cartn_x", "_atom_site.cartn_y", "_atom_site.cartn_z","_atom_site.cartn_x_esd", "_atom_site.cartn_y_esd", "_atom_site.cartn_z_esd","_atom_site.Cartn_x", "_atom_site.Cartn_y", "_atom_site.Cartn_z", "_atom_site.B_iso_or_equiv", "_atom_site.occupancy", "_atom_site.pdbx_formal_charge","_atom_site.Cartn_x_esd", "_atom_site.Cartn_y_esd", "_atom_site.Cartn_z_esd", "_atom_site.B_iso_or_equiv_esd", "_atom_site.occupancy_esd", "_atom_site.pdbx_formal_charge_esd"];

    let atomSiteandHeaderLines = [];
    if(lines.length>100000){
        console.log("Doing CA filter "+lines.length+" "+100000);
        atomSiteandHeaderLines = getLoopPreSplit(lines,"_atom_site","_atom_site.label_atom_id","CA");
    }else {
        console.log("Not doing CA filter");
        atomSiteandHeaderLines = getLoopPreSplit(lines,"_atom_site");
    }

    let atomSiteTypes = atomSiteandHeaderLines[0];
    let atomSiteLines = atomSiteandHeaderLines[1];
    console.log("Time to end of getLoopPreSplit: "+(new Date().getTime()-start));

    let entityAndHeaderLines = getLoopPreSplit(lines,"_entity_poly");
    if(entityAndHeaderLines[0].length===0){
        entityAndHeaderLines = getNonLoopPreSplit(lines,"_entity_poly");
    }

    let sequences = [];
    if(entityAndHeaderLines.length>0){
        let seqIdx = entityAndHeaderLines[0].indexOf("_entity_poly.pdbx_seq_one_letter_code_can");
        let seqChainIdx = entityAndHeaderLines[0].indexOf("_entity_poly.pdbx_strand_id");
        let seqTypeIdx = entityAndHeaderLines[0].indexOf("_entity_poly.type");
        if(entityAndHeaderLines.length>1){
            for(let iseq=0;iseq<entityAndHeaderLines[1].length;iseq++){
                let thisEntry = entityAndHeaderLines[1][iseq];
                //let thisSeq = thisEntry[seqIdx].replaceAll('"',"").replaceAll(" ","");
                let thisSeq = thisEntry[seqIdx].replace(/"/g,"").replace(/\s/g,"");
                let thisChains = thisEntry[seqChainIdx].split(",");
                let theType = "unknown";
                if(seqTypeIdx===-1){ // I do not think this should happen for a proper mmCIF file.
                    theType = analyzeSequenceType(thisSeq);
                } else {
                    //theType = thisEntry[seqTypeIdx].replaceAll("'","").replaceAll('"','');
                    theType = thisEntry[seqTypeIdx].replace(/'/g,"").replace(/"/g,'');
                }
                for(let ich=0;ich<thisChains.length;ich++){
                    sequences.push({name:structureName+"_"+thisChains[ich],id:guid(),type:theType,"sequence":thisSeq,"chain":thisChains[ich]});
                }
            }
        }
    }

    let atoms = [];

    let elements = [];
    let restypes = [];
    let models = [];
    let altlocs = [];
    let modamino = [];

    let spllen = 0;
    let atomSiteLinesLength = atomSiteLines.length;

    let nameIdx = atomSiteTypes.indexOf("_atom_site.label_atom_id");
    let atomSiteTypesLength = atomSiteTypes.length;
    console.log(nameIdx);

    let floatIndices = [];
    let strIndices = [];
    for(let iprop=0;iprop<atomSiteTypesLength;iprop++){
        if(FLOAT_PROPS.indexOf(atomSiteTypes[iprop])>-1){
            floatIndices.push(iprop);
        } else {
            strIndices.push(iprop);
        }
    }
    let floatIndicesLength = floatIndices.length;
    let strIndicesLength = strIndices.length;

    for(let il=0;il<atomSiteLinesLength;il++){
        let split = atomSiteLines[il];
        let splitlength = split.length;
        spllen += splitlength;
        if(split.length===atomSiteTypesLength){
            let atom = new Atom();
            if(split[0]==="TER") continue;
            // This is all slow (e.g. 3j3q, and I do not know how to avoid problem.)
            for(let ipropFloat=0;ipropFloat<floatIndicesLength;ipropFloat++){
                let iprop = floatIndices[ipropFloat];
                if(split[iprop] !== "?"){
                    atom[atomSiteTypes[iprop]] = parseFloat(split[iprop]);
                } else {
                    atom[atomSiteTypes[iprop]] = Number.NaN;
                }
            }
            for(let ipropStr=0;ipropStr<strIndicesLength;ipropStr++){
                let iprop = strIndices[ipropStr];
                atom[atomSiteTypes[iprop]] = split[iprop];
            }
            atoms.push(atom);
        } else {
            //console.log(atomSiteLines[il].match(/\S+/g).length+" "+atomSiteTypes.length+" "+atomSiteLines[il]);
            //console.log(atomSiteLines[il]);
        }
    }
    console.log(spllen);
    console.log("Time to end of atom accumulation loop: "+(new Date().getTime()-start));

    let atomLength = atoms.length;
    for(let iat=0;iat<atomLength;iat++){
        let atom = atoms[iat];
        if(elements.indexOf(atom["_atom_site.type_symbol"])===-1){
            elements.push(atom["_atom_site.type_symbol"]);
        }
        if(restypes.indexOf(atom["_atom_site.label_comp_id"])===-1){
            restypes.push(atom["_atom_site.label_comp_id"]);
        }
        if(models.indexOf(atom["_atom_site.pdbx_PDB_model_num"])===-1){
            models.push(atom["_atom_site.pdbx_PDB_model_num"]);
        }
        if(altlocs.indexOf(atom["_atom_site.label_alt_id"])===-1){
            altlocs.push(atom["_atom_site.label_alt_id"]);
        }
        if(atom["_atom_site.group_PDB"]==="ATOM"){
            if(modamino.indexOf(atom["_atom_site.label_comp_id"])===-1){
                modamino.push(atom["_atom_site.label_comp_id"]);
            }
        }
    }
    console.log("Time to end of property set loop: "+(new Date().getTime()-start));

    for(let iloc=0;iloc<altlocs.length;iloc++){
        if(altlocs[iloc] === "."){
            altlocs[iloc] = "";
        }
    }

    let anisou = parseLoop(getLoop(lines,"_atom_site_anisotrop"),["_atom_site_anisotrop.U[1][1]","_atom_site_anisotrop.U[2][2]","_atom_site_anisotrop.U[3][3]","_atom_site_anisotrop.U[1][2]","_atom_site_anisotrop.U[1][3]","_atom_site_anisotrop.U[2][3]","_atom_site_anisotrop.U[1][1]_esd","_atom_site_anisotrop.U[2][2]_esd","_atom_site_anisotrop.U[3][3]_esd","_atom_site_anisotrop.U[1][2]_esd","_atom_site_anisotrop.U[1][3]_esd","_atom_site_anisotrop.U[2][3]_esd"]);
    //console.log(anisou);

    insertAnisou(atoms,anisou);

    atoms = atomsToHierarchy(atoms);

    let res = {};
    res["atoms"] = atoms;
    res["elements"] = elements;
    res["restypes"] = restypes;
    res["models"] = models;
    res["altlocs"] = altlocs;
    res["modamino"] = modamino;
    res["sequences"] = sequences;
    res["structureName"] = structureName;

    console.log(res["sequences"]);

    return res;
}

Model.prototype.mainAtoms = ["N","CA","C","O"];
Model.prototype.aminoResidues = ["GLY","ALA","VAL","PRO","SER","THR","LEU","ILE","CYS","ASP","GLU","ASN","GLN","ARG","LYS","MET","MSE","HIS","PHE","TYR","TRP","HCS","ALO","PDD","UNK"];
Model.prototype.waterResidues = ["HOH","H2O","WAT","SOL","DOD","D2O"];
Model.prototype.metalElements = ["LI", "BE", "NA", "MG", "AL", "K", "CA", "SC", "TI", "V", "MN", "FE", "CO", "NI", "CU", "ZN", "GA", "RB", "SR", "Y", "ZR", "NB", "MO", "TC", "RU", "RH", "PD", "AG", "CD", "IN", "SN", "SB", "CS", "BA", "LA", "CE", "PR", "ND", "PM", "SM", "EU", "GD", "TB", "DY", "HO", "ER", "TM", "YB", "LU", "HF", "TA", "W", "RE", "OS", "IR", "PT", "AU", "HG", "TL", "PB", "BI", "PO", "FR", "RA", "AC", "TH", "PA", "U", "NP", "PU", "AM", "CM", "BK", "CF", "ES", "FM", "MD", "NO", "LR", "RF", "DB", "SG", "BH", "HS", "MT", "UN", "UU", "UB", "UQ", "UH", "UO"];
Model.prototype.saccharideResidues = ["BMA","MAN","NAG","GLC","BGC","GCS","GAL","NGA","MGC","NG1","NG6","A2G","6MN","GLP","GP4","BEM","KDN","XLS","CXY","RBY","TDX","XYL","XYS","XYP","FCA","FCB","FUC","GTR","ADA","DGU","SI3","NCC","NGF","NGE","NGC","GC4","GCD","GCU","GCV","GCW","IDS","REL","IDR","SIA"];

function isAminoAcidType(restype) {
    return (Model.prototype.aminoResidues.indexOf(restype)>-1);
}

function isWaterType(restype) {
    return (Model.prototype.waterResidues.indexOf(restype)>-1);
}

export {EnerLib, Model, Chain, Residue, Atom, parseMMCIF,parseCIFFromDict,parsePDB,addSymmetry,isAminoAcidType,isWaterType};
