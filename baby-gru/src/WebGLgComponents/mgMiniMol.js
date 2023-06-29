import { guid } from '../utils/MoorhenUtils';
import * as vec3 from 'gl-matrix/vec3';
import * as vec4 from 'gl-matrix/vec4';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
//import {vec3,mat4} from 'gl-matrix/esm';
import pako from 'pako';
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

class Model{
constructor() {
    this.chains = [];
    this.hasBonds = false;
    this.hbonds = [];
    this.selection_cache = {};
    this.glycan_cache = {};
}
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

export {Model, isAminoAcidType,isWaterType};
