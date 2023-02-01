/*
TODO
vec3.subtract, vec3.add, create, normalize, cross
*/

import * as vec3 from 'gl-matrix/vec3';
import * as vec4 from 'gl-matrix/vec4';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
//import {vec3,mat4} from 'gl-matrix/esm';
import PCA from 'pca-js';
import {Model, Atom} from './mgMiniMol.js';
import {DistanceBetweenPointAndLine, DistanceBetweenTwoLines, DihedralAngle} from './mgMaths.js';
import {CalcSecStructure,GetBfactorSplinesColoured,GetWormColoured,GetSplinesColoured} from './mgSecStr.js';
import {icosaIndices2, icosaVertices2} from './mgWebGL.js';

function NormalizeVec3(v){
    let vin = vec3Create(v);
    vec3.normalize(v,vin);
}

function vec3Add(v1,v2,out){
    if(!out){
        vec3.add(v1,v1,v2);
    }else{
        vec3.add(out,v1,v2);
    }
}

function vec3Subtract(v1,v2,out){
    if(!out){
        vec3.subtract(v1,v1,v2);
    }else{
        vec3.subtract(out,v1,v2);
    }
}

function vec3Cross(v1,v2,out){
    vec3.cross(out,v1,v2);
}

function vec3Create(v){
    var theVec = vec3.create();
    if(v){
        vec3.set(theVec,v[0],v[1],v[2],v[3]);
    }
    return theVec;
}

function getSugarAtomNames(){

    let ribAtomNames = [];
    let nagAtomNames = [];
    let ffcAtomNames = [];
    let latAtomNames = [];
    let lmtAtomNames = [];
    let treAtomNames = [];
    let dmuAtomNames = [];
    let siaAtomNames = [];
    let a2gAtomNames = [];

    let ribR1AtomNames = [];
    let nagR1AtomNames = [];
    let ffcR1AtomNames = [];
    let latR1AtomNames = [];
    let lmtR1AtomNames = [];
    let treR1AtomNames = [];
    let dmuR1AtomNames = [];
    let ffcR2AtomNames = [];
    let latR2AtomNames = [];
    let lmtR2AtomNames = [];
    let treR2AtomNames = [];
    let dmuR2AtomNames = [];
    let siaR1AtomNames = [];
    let a2gR1AtomNames = [];

    let sugarAtomNames = [];

    ffcR1AtomNames.push("C1A");
    ffcR1AtomNames.push("C2A");
    ffcR1AtomNames.push("C3A");
    ffcR1AtomNames.push("C4A");
    ffcR1AtomNames.push("C5A");
    ffcR1AtomNames.push("O5A");
    ffcR2AtomNames.push("C1B");
    ffcR2AtomNames.push("C2B");
    ffcR2AtomNames.push("C3B");
    ffcR2AtomNames.push("C4B");
    ffcR2AtomNames.push("C5B");
    ffcR2AtomNames.push("O5B");

    ffcAtomNames.push(ffcR1AtomNames);
    ffcAtomNames.push(ffcR2AtomNames);
    sugarAtomNames.push(ffcAtomNames);

    latR1AtomNames.push("C1");
    latR1AtomNames.push("C2");
    latR1AtomNames.push("C3");
    latR1AtomNames.push("C4");
    latR1AtomNames.push("C5");
    latR1AtomNames.push("O5");
    latR2AtomNames.push("C1'");
    latR2AtomNames.push("C2'");
    latR2AtomNames.push("C3'");
    latR2AtomNames.push("C4'");
    latR2AtomNames.push("C5'");
    latR2AtomNames.push("O5'");

    latAtomNames.push(latR1AtomNames);
    latAtomNames.push(latR2AtomNames);
    sugarAtomNames.push(latAtomNames);

    lmtR1AtomNames.push("C1'");
    lmtR1AtomNames.push("C2'");
    lmtR1AtomNames.push("C3'");
    lmtR1AtomNames.push("C4'");
    lmtR1AtomNames.push("C5'");
    lmtR1AtomNames.push("O5'");
    lmtR2AtomNames.push("C1B");
    lmtR2AtomNames.push("C2B");
    lmtR2AtomNames.push("C3B");
    lmtR2AtomNames.push("C4B");
    lmtR2AtomNames.push("C5B");
    lmtR2AtomNames.push("O5B");

    lmtAtomNames.push(lmtR1AtomNames);
    lmtAtomNames.push(lmtR2AtomNames);
    sugarAtomNames.push(lmtAtomNames);

    treR1AtomNames.push("C1P");
    treR1AtomNames.push("C2P");
    treR1AtomNames.push("C3P");
    treR1AtomNames.push("C4P");
    treR1AtomNames.push("C5P");
    treR1AtomNames.push("O5P");
    treR2AtomNames.push("C1B");
    treR2AtomNames.push("C2B");
    treR2AtomNames.push("C3B");
    treR2AtomNames.push("C4B");
    treR2AtomNames.push("C5B");
    treR2AtomNames.push("O5B");

    treAtomNames.push(treR1AtomNames);
    treAtomNames.push(treR2AtomNames);
    sugarAtomNames.push(treAtomNames);

    ribR1AtomNames.push("C1'");
    ribR1AtomNames.push("C2'");
    ribR1AtomNames.push("C3'");
    ribR1AtomNames.push("C4'");
    ribR1AtomNames.push("O4'");

    ribAtomNames.push(ribR1AtomNames);
    sugarAtomNames.push(ribAtomNames);

    nagR1AtomNames.push("C1");
    nagR1AtomNames.push("C2");
    nagR1AtomNames.push("C3");
    nagR1AtomNames.push("C4");
    nagR1AtomNames.push("C5");
    nagR1AtomNames.push("O5");

    nagAtomNames.push(nagR1AtomNames);
    sugarAtomNames.push(nagAtomNames);

    siaR1AtomNames.push("C2");
    siaR1AtomNames.push("C3");
    siaR1AtomNames.push("C4");
    siaR1AtomNames.push("C5");
    siaR1AtomNames.push("C6");
    siaR1AtomNames.push("O6");

    siaAtomNames.push(siaR1AtomNames);
    sugarAtomNames.push(siaAtomNames);

    a2gR1AtomNames.push("C1");
    a2gR1AtomNames.push("C2");
    a2gR1AtomNames.push("C3");
    a2gR1AtomNames.push("C4");
    a2gR1AtomNames.push("C5");
    a2gR1AtomNames.push("O");

    a2gAtomNames.push(a2gR1AtomNames);
    sugarAtomNames.push(a2gAtomNames);

    return sugarAtomNames;
}

function singletonsToLinesInfo(singletons,size,colourScheme){
    let cylinder_sizes = [];
    let cylinder_col_tri = [];
    let cylinder_vert_tri = [];
    let cylinder_idx_tri = [];
    let sphere_atoms = [];

    for(let ic=0;ic<singletons.length;ic++){
        let at1 = singletons[ic];
        let atom = {};
        atom["x"] = at1.x();
        atom["y"] = at1.y();
        atom["z"] = at1.z();
        atom["tempFactor"] = at1["_atom_site.B_iso_or_equiv"];
        atom["charge"] = at1["_atom_site.pdbx_formal_charge"];
        atom["symbol"] = at1["_atom_site.type_symbol"];
        atom["label"] =  at1.getAtomID();
        sphere_atoms.push(atom);

        cylinder_idx_tri.push(2*ic);
        cylinder_vert_tri.push(at1.x()-.1);
        cylinder_vert_tri.push(at1.y());
        cylinder_vert_tri.push(at1.z());
        cylinder_vert_tri.push(at1.x()+.1);
        cylinder_vert_tri.push(at1.y());
        cylinder_vert_tri.push(at1.z());
        for(let ip=0;ip<colourScheme[at1["_atom_site.id"]].length;ip++) cylinder_col_tri.push(colourScheme[at1["_atom_site.id"]][ip]);
        for(let ip=0;ip<colourScheme[at1["_atom_site.id"]].length;ip++) cylinder_col_tri.push(colourScheme[at1["_atom_site.id"]][ip]);
        cylinder_sizes.push(size);

        cylinder_idx_tri.push(2*ic+1);
        cylinder_vert_tri.push(at1.x());
        cylinder_vert_tri.push(at1.y()-.1);
        cylinder_vert_tri.push(at1.z());
        cylinder_vert_tri.push(at1.x());
        cylinder_vert_tri.push(at1.y()+.1);
        cylinder_vert_tri.push(at1.z());
        for(let ip=0;ip<colourScheme[at1["_atom_site.id"]].length;ip++) cylinder_col_tri.push(colourScheme[at1["_atom_site.id"]][ip]);
        for(let ip=0;ip<colourScheme[at1["_atom_site.id"]].length;ip++) cylinder_col_tri.push(colourScheme[at1["_atom_site.id"]][ip]);
        cylinder_sizes.push(size);

        cylinder_idx_tri.push(2*ic+1);
        cylinder_vert_tri.push(at1.x());
        cylinder_vert_tri.push(at1.y());
        cylinder_vert_tri.push(at1.z()-.1);
        cylinder_vert_tri.push(at1.x());
        cylinder_vert_tri.push(at1.y());
        cylinder_vert_tri.push(at1.z()+.1);
        for(let ip=0;ip<colourScheme[at1["_atom_site.id"]].length;ip++) cylinder_col_tri.push(colourScheme[at1["_atom_site.id"]][ip]);
        for(let ip=0;ip<colourScheme[at1["_atom_site.id"]].length;ip++) cylinder_col_tri.push(colourScheme[at1["_atom_site.id"]][ip]);
        cylinder_sizes.push(size);
 
    }

    let cylinderPrimitiveInfo = {"atoms":[[sphere_atoms]],"sizes": [[cylinder_sizes]], "col_tri":[[cylinder_col_tri]], "norm_tri":[[[]]], "vert_tri":[[cylinder_vert_tri]], "idx_tri":[[cylinder_idx_tri]] , "prim_types":[["LINES"]] };
    return cylinderPrimitiveInfo;
}

function contactsToCylindersLinesInfo(contacts,size,linetype,colourScheme,dashed){
    //console.log(contacts.length);
    //console.log(contacts);
    let cylinder_sizes = [];
    let cylinder_col_tri = [];
    let cylinder_vert_tri = [];
    let cylinder_idx_tri = [];
    let sphere_atoms = [];
    if(typeof(dashed)!=="undefined" && dashed){
        let dashLength = 0.2;
        let idx = 0;
        for(let ic=0;ic<contacts.length;ic++){
            let at1 = contacts[ic][1];
            let at2 = contacts[ic][2];
            if(typeof(at1.residue)!=="undefined"&&typeof(at2.residue)!=="undefined"){
                let atom = {};
                atom["x"] = at1.x();
                atom["y"] = at1.y();
                atom["z"] = at1.z();
                atom["tempFactor"] = at1["_atom_site.B_iso_or_equiv"];
                atom["charge"] = at1["_atom_site.pdbx_formal_charge"];
                atom["symbol"] = at1["_atom_site.type_symbol"];
                atom["label"] =  at1.getAtomID();
                sphere_atoms.push(atom);
                let atom2 = {};
                atom2["x"] = at2.x();
                atom2["y"] = at2.y();
                atom2["z"] = at2.z();
                atom2["tempFactor"] = at2["_atom_site.B_iso_or_equiv"];
                atom2["charge"] = at2["_atom_site.pdbx_formal_charge"];
                atom2["symbol"] = at2["_atom_site.type_symbol"];
                atom2["label"] =  at2.getAtomID();
                sphere_atoms.push(atom2);
            }
            let midpoint = [.5*(at1.x()+at2.x()),.5*(at1.y()+at2.y()),.5*(at1.z()+at2.z())];
            let thisLength = Model.prototype.bondLength(at1,at2);
            let nDashes = parseInt(0.5*thisLength/dashLength);
            let thisDashLength = thisLength/nDashes;
            let fracAdd = thisDashLength/thisLength;
            let frac = 1.0-.5*fracAdd;
            let ifrac = 0;
            while(frac>0.0){
                let frac2 = frac+fracAdd;
                if(frac2>1.0) frac2 = 1.0;
                if(frac>frac2) frac = frac2;
                cylinder_vert_tri.push((1.0-frac)*at1.x()+frac*midpoint[0]);
                cylinder_vert_tri.push((1.0-frac)*at1.y()+frac*midpoint[1]);
                cylinder_vert_tri.push((1.0-frac)*at1.z()+frac*midpoint[2]);
                cylinder_vert_tri.push((1.0-frac2)*at1.x()+frac2*midpoint[0]);
                cylinder_vert_tri.push((1.0-frac2)*at1.y()+frac2*midpoint[1]);
                cylinder_vert_tri.push((1.0-frac2)*at1.z()+frac2*midpoint[2]);
                Array.prototype.push.apply(cylinder_col_tri,colourScheme[at1["_atom_site.id"]]);
                Array.prototype.push.apply(cylinder_col_tri,colourScheme[at1["_atom_site.id"]]);
                cylinder_sizes.push(size);
                cylinder_idx_tri.push(idx++);
                cylinder_idx_tri.push(idx++);
                frac -= 2.0*fracAdd;
                ifrac += 1;
            }
            fracAdd = thisDashLength/thisLength;
            frac = 1.0-.5*fracAdd;
            ifrac = 0;
            while(frac>0.0){
                let frac2 = frac+fracAdd;
                if(frac2>1.0) frac2 = 1.0;
                if(frac>frac2) frac = frac2;
                cylinder_vert_tri.push((1.0-frac)*at2.x()+frac*midpoint[0]);
                cylinder_vert_tri.push((1.0-frac)*at2.y()+frac*midpoint[1]);
                cylinder_vert_tri.push((1.0-frac)*at2.z()+frac*midpoint[2]);
                cylinder_vert_tri.push((1.0-frac2)*at2.x()+frac2*midpoint[0]);
                cylinder_vert_tri.push((1.0-frac2)*at2.y()+frac2*midpoint[1]);
                cylinder_vert_tri.push((1.0-frac2)*at2.z()+frac2*midpoint[2]);
                Array.prototype.push.apply(cylinder_col_tri,colourScheme[at2["_atom_site.id"]]);
                Array.prototype.push.apply(cylinder_col_tri,colourScheme[at2["_atom_site.id"]]);
                cylinder_sizes.push(size);
                cylinder_idx_tri.push(idx++);
                cylinder_idx_tri.push(idx++);
                frac -= 2.0*fracAdd;
                ifrac += 1;
            }
        }
    } else {
        for(let ic=0;ic<contacts.length;ic++){
            let at1 = contacts[ic][1];
            let at2 = contacts[ic][2];
            if(typeof(at1.residue)!=="undefined"&&typeof(at2.residue)!=="undefined"){
                let atom = {};
                atom["x"] = at1.x();
                atom["y"] = at1.y();
                atom["z"] = at1.z();
                atom["tempFactor"] = at1["_atom_site.B_iso_or_equiv"];
                atom["charge"] = at1["_atom_site.pdbx_formal_charge"];
                atom["symbol"] = at1["_atom_site.type_symbol"];
                atom["label"] =  at1.getAtomID();
                sphere_atoms.push(atom);
                let atom2 = {};
                atom2["x"] = at2.x();
                atom2["y"] = at2.y();
                atom2["z"] = at2.z();
                atom2["tempFactor"] = at2["_atom_site.B_iso_or_equiv"];
                atom2["charge"] = at2["_atom_site.pdbx_formal_charge"];
                atom2["symbol"] = at2["_atom_site.type_symbol"];
                atom2["label"] =  at2.getAtomID();
                sphere_atoms.push(atom2);
            }
            cylinder_idx_tri.push(2*ic);
            cylinder_idx_tri.push(2*ic+1);
            cylinder_vert_tri.push(at2.x());
            cylinder_vert_tri.push(at2.y());
            cylinder_vert_tri.push(at2.z());
            let midpoint = [.5*(at1.x()+at2.x()),.5*(at1.y()+at2.y()),.5*(at1.z()+at2.z())];
            cylinder_vert_tri.push(midpoint[0]);
            cylinder_vert_tri.push(midpoint[1]);
            cylinder_vert_tri.push(midpoint[2]);
            for(let ip=0;ip<colourScheme[at2["_atom_site.id"]].length;ip++) cylinder_col_tri.push(colourScheme[at2["_atom_site.id"]][ip]);
            for(let ip=0;ip<colourScheme[at2["_atom_site.id"]].length;ip++) cylinder_col_tri.push(colourScheme[at2["_atom_site.id"]][ip]);
            cylinder_sizes.push(size);
            cylinder_vert_tri.push(at1.x());
            cylinder_vert_tri.push(at1.y());
            cylinder_vert_tri.push(at1.z());
            let midpoint2 = [.5*(at1.x()+at2.x()),.5*(at1.y()+at2.y()),.5*(at1.z()+at2.z())];
            cylinder_vert_tri.push(midpoint2[0]);
            cylinder_vert_tri.push(midpoint2[1]);
            cylinder_vert_tri.push(midpoint2[2]);
            for(let ip=0;ip<colourScheme[at1["_atom_site.id"]].length;ip++) cylinder_col_tri.push(colourScheme[at1["_atom_site.id"]][ip]);
            for(let ip=0;ip<colourScheme[at1["_atom_site.id"]].length;ip++) cylinder_col_tri.push(colourScheme[at1["_atom_site.id"]][ip]);
            cylinder_sizes.push(size);
        }
    }

    let cylinderPrimitiveInfo = {"atoms":[[sphere_atoms]],"sizes": [[cylinder_sizes]], "col_tri":[[cylinder_col_tri]], "norm_tri":[[[]]], "vert_tri":[[cylinder_vert_tri]], "idx_tri":[[cylinder_idx_tri]] , "prim_types":[[linetype]] };
    return cylinderPrimitiveInfo;
}

function contactsToLinesInfo(contacts,size,colourScheme,dashed){
    return contactsToCylindersLinesInfo(contacts,size,"LINES",colourScheme,dashed);
}

function contactsToCylindersInfo(contacts,size,colourScheme,dashed){
    return contactsToCylindersLinesInfo(contacts,size,"CYLINDERS",colourScheme,dashed);
}

function contactsToCappedCylindersInfo(contacts,size,colourScheme,dashed){
    return contactsToCylindersLinesInfo(contacts,size,"CAPCYLINDERS",colourScheme,dashed);
}

function DrawSugarBlockInt(res, col1, at1,at2,at3,at4,at5,at6, two_colour_in, sugar_block_thickness, sugar_block_scale, block_vert_tri,block_norm_tri,block_col_tri,block_idx_tri ){
    let retval = [];
    if(at1&&at2&&at3&&at4&&at5){
        //console.log("DrawSugarBlockInt have at least 5 atoms");
        let xaxis = vec3Create([1.0,0.0,0.0]);
        let yaxis = vec3Create([0.0,1.0,0.0]);
        let zaxis = vec3Create([0.0,0.0,1.0]);
        let norm_vec = [];
        let mid_vec = [];
        let cat1 = vec3Create([at1.x(),at1.y(),at1.z()]);
        let cat2 = vec3Create([at2.x(),at2.y(),at2.z()]);
        let cat3 = vec3Create([at3.x(),at3.y(),at3.z()]);
        let cat4 = vec3Create([at4.x(),at4.y(),at4.z()]);
        let cat5 = vec3Create([at5.x(),at5.y(),at5.z()]);
        //console.log(cat1);
        //console.log(cat2);
        //console.log(cat3);
        let cat2cat1 = vec3Create();
        let cat3cat2 = vec3Create();
        let cat4cat3 = vec3Create();
        let cat5cat4 = vec3Create();
        vec3Subtract(cat2,cat1,cat2cat1);
        vec3Subtract(cat3,cat2,cat3cat2);
        vec3Subtract(cat4,cat3,cat4cat3);
        vec3Subtract(cat5,cat4,cat5cat4);
        //console.log(cat2cat1);
        //console.log(cat3cat2);
        let d12 = vec3.length(cat2cat1);
        let d23 = vec3.length(cat3cat2);
        let d34 = vec3.length(cat4cat3);
        let d45 = vec3.length(cat5cat4);
        //console.log(d12);
        //console.log(d23);
        //console.log(d34);
        //console.log(d45);
        let c123 = vec3Create();
        let c234 = vec3Create();
        let c345 = vec3Create();
        vec3Cross(cat2cat1,cat3cat2,c123);
        vec3Cross(cat3cat2,cat4cat3,c234);
        vec3Cross(cat4cat3,cat5cat4,c345);
        if((d12>1.0&&d12<3.2)&&(d23>1.0&&d23<3.2)&&(d34>1.0&&d34<3.2)&&(d45>1.0&&d45<3.2)){
            if(at6){
                //console.log("Six membered test.");
                let cat6 = vec3Create([at6.x(),at6.y(),at6.z()]);
                let cat6cat5 = vec3Create();
                let cat1cat6 = vec3Create();
                vec3Subtract(cat6,cat5,cat6cat5);
                vec3Subtract(cat6,cat1,cat1cat6);
                let d56 = vec3.length(cat6cat5);
                let d61 = vec3.length(cat1cat6);
                if((d61>1.0&&d61<3.2)&&(d56>1.0&&d56<3.2)){
                    norm_vec.push(c123);
                    norm_vec.push(c234);
                    norm_vec.push(c345);
                    mid_vec.push(cat1);
                    mid_vec.push(cat2);
                    mid_vec.push(cat3);
                    mid_vec.push(cat4);
                    mid_vec.push(cat5);
                    let c456 = vec3Create();
                    let c561 = vec3Create();
                    vec3Cross(cat5cat4,cat6cat5,c456);
                    vec3Cross(cat6cat5,cat1cat6,c561);
                    norm_vec.push(c456);
                    norm_vec.push(c561);
                    mid_vec.push(cat6);
                    //console.log("We have 6 membered ring");
                } else if(d61>4.0&&d61<7.0&&res.getName()==="XLS") {
                    norm_vec.push(c123);
                    norm_vec.push(c234);
                    norm_vec.push(c345);
                    mid_vec.push(cat1);
                    mid_vec.push(cat2);
                    mid_vec.push(cat3);
                    mid_vec.push(cat4);
                    mid_vec.push(cat5);
                    let c456 = vec3Create();
                    let c561 = vec3Create();
                    vec3Cross(cat5cat4,cat6cat5,c456);
                    vec3Cross(cat6cat5,cat1cat6,c561);
                    norm_vec.push(c456);
                    norm_vec.push(c561);
                    mid_vec.push(cat6);
                    //console.log("Linear?");
                }
            } else {
                //console.log("Five membered test.");
                let cat5cat1 = vec3Create();
                vec3Subtract(cat5,cat1,cat5cat1);
                let d51 = vec3.length(cat5cat1);
                if((d51>1.0&&d51<3.2)){
                    norm_vec.push(c123);
                    norm_vec.push(c234);
                    norm_vec.push(c345);
                    mid_vec.push(cat1);
                    mid_vec.push(cat2);
                    mid_vec.push(cat3);
                    mid_vec.push(cat4);
                    mid_vec.push(cat5);
                    let c451 = vec3Create();
                    vec3Cross(cat5cat4,cat5cat1,c451);
                    norm_vec.push(c451);
                    //console.log("We have 5 membered ring");
                }
            }
        } else {
            console.log("Fail first test");
        }

        let nsectors = 20;
        let sugar_block_radius = 1.4 * sugar_block_scale;

        if(norm_vec.length>0&&mid_vec.length>0){

            let normal = vec3Create([0.0,0.0,0.0]);
            for(let i=0;i<norm_vec.length;i++){
                vec3Add(normal,norm_vec[i]);
            }
            NormalizeVec3(normal);

            let centre = vec3Create([0.0,0.0,0.0]);
            for(let i=0;i<mid_vec.length;i++){
                vec3Add(centre,mid_vec[i]);
            }
            centre[0] /= mid_vec.length;
            centre[1] /= mid_vec.length;
            centre[2] /= mid_vec.length;

            retval.push(centre);
            retval.push(normal);
            res["GLYCO_BLOCK_CENTRE"] = [centre[0],centre[1],centre[2]];

            let p = vec3Create([normal[0],normal[1],normal[2]]);
            let up = vec3Create();
            let right = vec3Create();
            if(Math.abs(vec3.dot(xaxis,p))<0.95){
                vec3Cross(xaxis,p,up);
                NormalizeVec3(up);
            }else if(Math.abs(vec3.dot(yaxis,p))<0.95){
                vec3Cross(yaxis,p,up);
                NormalizeVec3(up);
            } else {
                vec3Cross(zaxis,p,up);
                NormalizeVec3(up);
            }
            vec3Cross(up,p,right);

            NormalizeVec3(up);
            NormalizeVec3(right);

            right[0] *= sugar_block_radius;
            right[1] *= sugar_block_radius;
            right[2] *= sugar_block_radius;
            // Why??
            up[0] *= sugar_block_radius;
            up[1] *= sugar_block_radius;
            up[2] *= sugar_block_radius;

            function setGlycoBlockUDDCircle(udd,atom){
                let cp = vec3Create();
                let cpx = vec3Create();
                let cpp = vec3Create();
                let pp = vec3Create();

                vec3Subtract(centre,atom,cp);
                NormalizeVec3(cp);
                vec3Cross(cp,normal,cpx);
                NormalizeVec3(cpx);
                vec3Cross(normal,cpx,cpp);
                NormalizeVec3(cpp);
                cpp[0] *= vec3.length(right);
                cpp[1] *= vec3.length(right);
                cpp[2] *= vec3.length(right);
                vec3Subtract(centre,cpp,pp);
                res[udd] = [pp[0],pp[1],pp[2]];
                
            }

            let white = [1.0,1.0,1.0,col1[3]];

            if(res.getName()==="NAG"||res.getName()==="NBG"||res.getName()==="NGA"||res.getName()==="NG1"||res.getName()==="NG6"||res.getName()==="GCS"||res.getName()==="6MN"||res.getName()==="GLP"||res.getName()==="GP4"||res.getName()==="A2G"){
                /* Draw a square */
                let diagonal = false;
                if(res.getName()==="GCS") {
                    diagonal = true;
                }
                console.log("Draw a square!");
                let two_colour = two_colour_in && diagonal;

                let c1c4 = vec3Create();
                vec3Subtract(cat1,cat4,c1c4);
                NormalizeVec3(c1c4);

                let c1c4Perp = vec3Create();
                vec3Cross(normal,c1c4,c1c4Perp);
                NormalizeVec3(c1c4Perp);

                let norm2 = vec3Create();
                vec3Cross(c1c4,c1c4Perp,norm2);

                c1c4[0] *= sugar_block_radius;
                c1c4[1] *= sugar_block_radius;
                c1c4[2] *= sugar_block_radius;
                c1c4Perp[0] *= sugar_block_radius;
                c1c4Perp[1] *= sugar_block_radius;
                c1c4Perp[2] *= sugar_block_radius;

                let ls = vec3Create();
                let le = vec3Create();
                vec3Add(centre,c1c4,ls);
                vec3Add(ls,c1c4Perp);
                vec3Add(centre,c1c4,le);
                vec3Subtract(le,c1c4Perp);

                let t = DistanceBetweenPointAndLine(ls,le,cat1)[1];
                let pp = vec3Create();
                let lels = vec3Create();
                vec3Subtract(le,ls,lels);
                lels[0] *= t;
                lels[1] *= t;
                lels[2] *= t;
                vec3Add(ls,lels,pp);
                res["GLYCO_BLOCK_C1"] = [pp[0],pp[1],pp[2]];

                let ls3 = vec3Create();
                let le3 = vec3Create();
                vec3Add(centre,c1c4,ls3);
                vec3Add(ls3,c1c4Perp);
                vec3Subtract(centre,c1c4,le3);
                vec3Add(le3,c1c4Perp);

                let t3 = DistanceBetweenPointAndLine(ls3,le3,cat3)[1];
                let pp3 = vec3Create();
                let lels3 = vec3Create();
                vec3Subtract(le3,ls3,lels3);
                lels3[0] *= t;
                lels3[1] *= t;
                lels3[2] *= t;
                vec3Add(ls3,lels3,pp3);
                res["GLYCO_BLOCK_C3"] = [pp3[0],pp3[1],pp3[2]];
 
                let ls4 = vec3Create();
                let le4 = vec3Create();
                vec3Subtract(centre,c1c4,ls4);
                vec3Add(ls4,c1c4Perp);
                vec3Subtract(centre,c1c4,le4);
                vec3Subtract(le4,c1c4Perp);

                let t4 = DistanceBetweenPointAndLine(ls4,le4,cat4)[1];
                let pp4 = vec3Create();
                let lels4 = vec3Create();
                vec3Subtract(le4,ls4,lels4);
                lels4[0] *= t;
                lels4[1] *= t;
                lels4[2] *= t;
                vec3Add(ls4,lels4,pp4);
                res["GLYCO_BLOCK_C4"] = [pp4[0],pp4[1],pp4[2]];

                let ls5 = vec3Create();
                let le5 = vec3Create();
                vec3Add(centre,c1c4,ls5);
                vec3Subtract(ls5,c1c4Perp);
                vec3Subtract(centre,c1c4,le5);
                vec3Subtract(le5,c1c4Perp);

                let t5 = DistanceBetweenPointAndLine(ls5,le5,cat5)[1];
                let pp5 = vec3Create();
                let lels5 = vec3Create();
                vec3Subtract(le5,ls5,lels5);
                lels5[0] *= t;
                lels5[1] *= t;
                lels5[2] *= t;
                vec3Add(ls5,lels5,pp5);
                res["GLYCO_BLOCK_C5"] = [pp5[0],pp5[1],pp5[2]];
                
                block_vert_tri.push(centre[0] - c1c4[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                if(two_colour){
                    block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                }else{
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                }

                block_vert_tri.push(centre[0] - c1c4[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                if(two_colour){
                    block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                }else{
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                }

                block_vert_tri.push(centre[0] - c1c4[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] - c1c4[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] - c1c4[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] - c1c4[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] - c1c4[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] - c1c4[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_norm_tri.push(-c1c4[0]); block_norm_tri.push(-c1c4[1]); block_norm_tri.push(-c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

            } else if(res.getName()==="BMA"||res.getName()==="MAN"||res.getName()==="GAL"||res.getName()==="GLC"||res.getName()==="BGC"){
                console.log("CIRCLE!!!!!!!!!!!");

                setGlycoBlockUDDCircle("GLYCO_BLOCK_C1",cat1);
                setGlycoBlockUDDCircle("GLYCO_BLOCK_C3",cat3);
                setGlycoBlockUDDCircle("GLYCO_BLOCK_C4",cat4);
                setGlycoBlockUDDCircle("GLYCO_BLOCK_C5",cat5);
                setGlycoBlockUDDCircle("GLYCO_BLOCK_C2",cat2);

                for(let j=0;j<360;j=j+360/nsectors){
                    let theta = (1.0*j)/360.0 * Math.PI*2;
                    let theta2 = 1.0*(j+360/nsectors)/360.0 * Math.PI*2;
                    let x1 = Math.cos(theta);
                    let y1 = Math.sin(theta);
                    let x2 = Math.cos(theta2);
                    let y2 = Math.sin(theta2);

                    // "Cylinder" Normals
                    let n1x = x1*up[0] + y1*right[0];
                    let n1y = x1*up[1] + y1*right[1];
                    let n1z = x1*up[2] + y1*right[2];
                    let n2x = x2*up[0] + y2*right[0];
                    let n2y = x2*up[1] + y2*right[1];
                    let n2z = x2*up[2] + y2*right[2];

                    //block_vert_tri,block_norm_tri,block_col_tri,block_idx_tri

                    block_vert_tri.push(centre[0]+n1x - sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1]+n1y - sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2]+n1z - sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0]+n2x + sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1]+n2y + sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2]+n2z + sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0]+n2x - sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1]+n2y - sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2]+n2z - sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_norm_tri.push(n1x); block_norm_tri.push(n1y); block_norm_tri.push(n1z);
                    block_norm_tri.push(n2x); block_norm_tri.push(n2y); block_norm_tri.push(n2z);
                    block_norm_tri.push(n2x); block_norm_tri.push(n2y); block_norm_tri.push(n2z);

                    block_vert_tri.push(centre[0]+n1x - sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1]+n1y - sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2]+n1z - sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0]+n1x + sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1]+n1y + sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2]+n1z + sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0]+n2x + sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1]+n2y + sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2]+n2z + sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_norm_tri.push(n1x); block_norm_tri.push(n1y); block_norm_tri.push(n1z);
                    block_norm_tri.push(n1x); block_norm_tri.push(n1y); block_norm_tri.push(n1z);
                    block_norm_tri.push(n2x); block_norm_tri.push(n2y); block_norm_tri.push(n2z);

                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                    block_vert_tri.push(centre[0] - sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1] - sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2] - sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0]+n1x - sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1]+n1y - sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2]+n1z - sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0]+n2x - sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1]+n2y - sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2]+n2z - sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);

                    block_vert_tri.push(centre[0] + sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1] + sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2] + sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0]+n1x + sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1]+n1y + sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2]+n1z + sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0]+n2x + sugar_block_thickness*normal[0]);
                    block_vert_tri.push(centre[1]+n2y + sugar_block_thickness*normal[1]);
                    block_vert_tri.push(centre[2]+n2z + sugar_block_thickness*normal[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);

                    block_norm_tri.push(-normal[0]); block_norm_tri.push(-normal[1]); block_norm_tri.push(-normal[2]);
                    block_norm_tri.push(-normal[0]); block_norm_tri.push(-normal[1]); block_norm_tri.push(-normal[2]);
                    block_norm_tri.push(-normal[0]); block_norm_tri.push(-normal[1]); block_norm_tri.push(-normal[2]);
                    block_norm_tri.push(-normal[0]); block_norm_tri.push(-normal[1]); block_norm_tri.push(-normal[2]);
                    block_norm_tri.push(-normal[0]); block_norm_tri.push(-normal[1]); block_norm_tri.push(-normal[2]);
                    block_norm_tri.push(-normal[0]); block_norm_tri.push(-normal[1]); block_norm_tri.push(-normal[2]);

                    // FIXME - real colour
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                }

            } else if(res.getName()==="FCA"||res.getName()==="FCA"||res.getName()==="FUC"){
                /* Draw a triangle */
                console.log("Draw a triangle!");
                // Try 4byh

                let c1c4 = vec3Create();
                vec3Subtract(cat1,cat4,c1c4);
                NormalizeVec3(c1c4);

                let c1c4Perp = vec3Create();
                vec3Cross(normal,c1c4,c1c4Perp);
                NormalizeVec3(c1c4Perp);

                let norm2 = vec3Create();
                vec3Cross(c1c4,c1c4Perp,norm2);

                c1c4[0] *= sugar_block_radius;
                c1c4[1] *= sugar_block_radius;
                c1c4[2] *= sugar_block_radius;
                c1c4Perp[0] *= sugar_block_radius;
                c1c4Perp[1] *= sugar_block_radius;
                c1c4Perp[2] *= sugar_block_radius;

                let ytri = -0.5;
                let xtri = -0.8660254037844387;

                let ptri = vec3Create();
                let mtri = vec3Create();

                ptri[0] = ytri*c1c4Perp[0] + xtri*c1c4[0];
                ptri[1] = ytri*c1c4Perp[1] + xtri*c1c4[1];
                ptri[2] = ytri*c1c4Perp[2] + xtri*c1c4[2];

                mtri[0] = ytri*c1c4Perp[0] - xtri*c1c4[0];
                mtri[1] = ytri*c1c4Perp[1] - xtri*c1c4[1];
                mtri[2] = ytri*c1c4Perp[2] - xtri*c1c4[2];

                let normp = vec3Create();
                let normm = vec3Create();
                normp[0] = 0.5 * c1c4Perp[0] + 0.5 * ptri[0];
                normp[1] = 0.5 * c1c4Perp[1] + 0.5 * ptri[1];
                normp[2] = 0.5 * c1c4Perp[2] + 0.5 * ptri[2];
                normm[0] = 0.5 * c1c4Perp[0] + 0.5 * mtri[0];
                normm[1] = 0.5 * c1c4Perp[1] + 0.5 * mtri[1];
                normm[2] = 0.5 * c1c4Perp[2] + 0.5 * mtri[2];

                let ls = vec3Create();
                let le = vec3Create();

                vec3Add(centre,mtri,ls);
                vec3Add(centre,c1c4Perp,le);

                let t = DistanceBetweenPointAndLine(ls,le,cat1)[1];
                let pp = vec3Create();
                let lels = vec3Create();
                vec3Subtract(le,ls,lels);
                lels[0] *= t;
                lels[1] *= t;
                lels[2] *= t;
                vec3Add(ls,lels,pp);
                res["GLYCO_BLOCK_C1"] = [pp[0],pp[1],pp[2]];

                let t2 = DistanceBetweenPointAndLine(ls,le,cat2)[1];
                let pp2 = vec3Create();
                let lels2 = vec3Create();
                vec3Subtract(le,ls,lels2);
                lels2[0] *= t2;
                lels2[1] *= t2;
                lels2[2] *= t2;
                vec3Add(ls,lels2,pp2);
                res["GLYCO_BLOCK_C2"] = [pp2[0],pp2[1],pp2[2]];

                vec3Add(centre,ptri,ls);
                vec3Add(centre,c1c4Perp,le);

                let t3 = DistanceBetweenPointAndLine(ls,le,cat3)[1];
                let pp3 = vec3Create();
                let lels3 = vec3Create();
                vec3Subtract(le,ls,lels3);
                lels3[0] *= t3;
                lels3[1] *= t3;
                lels3[2] *= t3;
                vec3Add(ls,lels3,pp3);
                res["GLYCO_BLOCK_C3"] = [pp3[0],pp3[1],pp3[2]];

                let t4 = DistanceBetweenPointAndLine(ls,le,cat4)[1];
                let pp4 = vec3Create();
                let lels4 = vec3Create();
                vec3Subtract(le,ls,lels4);
                lels4[0] *= t4;
                lels4[1] *= t4;
                lels4[3] *= t4;
                vec3Add(ls,lels4,pp4);
                res["GLYCO_BLOCK_C4"] = [pp4[0],pp4[1],pp4[2]];
                
                vec3Add(centre,ptri,ls);
                vec3Add(centre,mtri,le);

                let t5 = DistanceBetweenPointAndLine(ls,le,cat5)[1];
                let pp5 = vec3Create();
                let lels5 = vec3Create();
                vec3Subtract(le,ls,lels5);
                lels5[0] *= t5;
                lels5[1] *= t5;
                lels5[3] *= t5;
                vec3Add(ls,lels5,pp5);
                res["GLYCO_BLOCK_C5"] = [pp5[0],pp5[1],pp5[2]];

                block_vert_tri.push(centre[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + mtri[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + mtri[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + mtri[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + ptri[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + ptri[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + ptri[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + mtri[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + mtri[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + mtri[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + ptri[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + ptri[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + ptri[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + mtri[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + mtri[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + mtri[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + mtri[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + mtri[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + mtri[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + ptri[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + ptri[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + ptri[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(c1c4Perp[0]); block_norm_tri.push(c1c4Perp[1]); block_norm_tri.push(c1c4Perp[2]);
                block_norm_tri.push(c1c4Perp[0]); block_norm_tri.push(c1c4Perp[1]); block_norm_tri.push(c1c4Perp[2]);
                block_norm_tri.push(c1c4Perp[0]); block_norm_tri.push(c1c4Perp[1]); block_norm_tri.push(c1c4Perp[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                
                block_vert_tri.push(centre[0] + mtri[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + mtri[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + mtri[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + ptri[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + ptri[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + ptri[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + ptri[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + ptri[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + ptri[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_norm_tri.push(-c1c4Perp[0]); block_norm_tri.push(-c1c4Perp[1]); block_norm_tri.push(-c1c4Perp[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + ptri[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + ptri[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + ptri[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + ptri[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + ptri[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + ptri[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-normp[0]); block_norm_tri.push(-normp[1]); block_norm_tri.push(-normp[2]);
                block_norm_tri.push(-normp[0]); block_norm_tri.push(-normp[1]); block_norm_tri.push(-normp[2]);
                block_norm_tri.push(-normp[0]); block_norm_tri.push(-normp[1]); block_norm_tri.push(-normp[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + ptri[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + ptri[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + ptri[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(normp[0]); block_norm_tri.push(normp[1]); block_norm_tri.push(normp[2]);
                block_norm_tri.push(normp[0]); block_norm_tri.push(normp[1]); block_norm_tri.push(normp[2]);
                block_norm_tri.push(normp[0]); block_norm_tri.push(normp[1]); block_norm_tri.push(normp[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + mtri[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + mtri[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + mtri[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + mtri[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + mtri[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + mtri[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(normm[0]); block_norm_tri.push(normm[1]); block_norm_tri.push(normm[2]);
                block_norm_tri.push(normm[0]); block_norm_tri.push(normm[1]); block_norm_tri.push(normm[2]);
                block_norm_tri.push(normm[0]); block_norm_tri.push(normm[1]); block_norm_tri.push(normm[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + mtri[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + mtri[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + mtri[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-normm[0]); block_norm_tri.push(-normm[1]); block_norm_tri.push(-normm[2]);
                block_norm_tri.push(-normm[0]); block_norm_tri.push(-normm[1]); block_norm_tri.push(-normm[2]);
                block_norm_tri.push(-normm[0]); block_norm_tri.push(-normm[1]); block_norm_tri.push(-normm[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                
            } else if(res.getName()==="BEM"||res.getName()==="GTR"||res.getName()==="ADA"||res.getName()==="DGU"||res.getName()==="KDN"||res.getName()==="SI3"||res.getName()==="NCC"||res.getName()==="IDR"||res.getName()==="GC4"||res.getName()==="GCD"||res.getName()==="GCU"||res.getName()==="GCV"||res.getName()==="GCW"||res.getName()==="IDS"||res.getName()==="REL"||res.getName()==="SIA"){
                /* Draw a diamond */
                // Try 4byh
                let horizontal = false;
                let vertical = false;
                let invert_colour = false;
                if(res.getName()==="IDR"||res.getName()==="GC4"||res.getName()==="GCD"||res.getName()==="GCU"||res.getName()==="GCV"||res.getName()==="GCW"||res.getName()==="IDS"||res.getName()==="REL"){
                    horizontal = true;
                }
                if(res.getName()==="GTR"||res.getName()==="ADA"||res.getName()==="DGU"||res.getName()==="BEM"){
                    vertical = true;
                }
                if(res.getName()==="IDR"||res.getName()==="BEM"){
                    invert_colour = true;
                }
                console.log("Draw a diamond!");
                let two_colour = two_colour_in && (horizontal||vertical);

                let c1c4 = vec3Create();
                vec3Subtract(cat1,cat4,c1c4);
                NormalizeVec3(c1c4);

                let c1c4Perp = vec3Create();
                vec3Cross(normal,c1c4,c1c4Perp);
                NormalizeVec3(c1c4Perp);

                let norm2 = vec3Create();
                vec3Cross(c1c4,c1c4Perp,norm2);

                c1c4[0] *= sugar_block_radius;
                c1c4[1] *= sugar_block_radius;
                c1c4[2] *= sugar_block_radius;
                c1c4Perp[0] *= sugar_block_radius;
                c1c4Perp[1] *= sugar_block_radius;
                c1c4Perp[2] *= sugar_block_radius;

                let ls = vec3Create();
                let le = vec3Create();
                vec3Add(centre,c1c4,ls);
                vec3Subtract(centre,c1c4Perp,le);

                let t = DistanceBetweenPointAndLine(ls,le,cat1)[1];
                let pp = vec3Create();
                let lels = vec3Create();
                vec3Subtract(le,ls,lels);
                lels[0] *= t;
                lels[1] *= t;
                lels[2] *= t;
                vec3Add(ls,lels,pp);
                res["GLYCO_BLOCK_C1"] = [pp[0],pp[1],pp[2]];
                
                let t2 = DistanceBetweenPointAndLine(ls,le,cat2)[1];
                let pp2 = vec3Create();
                let lels2 = vec3Create();
                vec3Subtract(le,ls,lels2);
                lels2[0] *= t2;
                lels2[1] *= t2;
                lels2[2] *= t2;
                vec3Add(ls,lels2,pp2);
                res["GLYCO_BLOCK_C2"] = [pp2[0],pp2[1],pp2[2]];

                vec3Subtract(centre,c1c4,ls);
                vec3Subtract(centre,c1c4Perp,le);

                let t3 = DistanceBetweenPointAndLine(ls,le,cat3)[1];
                let pp3 = vec3Create();
                let lels3 = vec3Create();
                vec3Subtract(le,ls,lels3);
                lels3[0] *= t3;
                lels3[1] *= t3;
                lels3[2] *= t3;
                vec3Add(ls,lels3,pp3);
                res["GLYCO_BLOCK_C3"] = [pp3[0],pp3[1],pp3[2]];

                let t4 = DistanceBetweenPointAndLine(ls,le,cat4)[1];
                let pp4 = vec3Create();
                let lels4 = vec3Create();
                vec3Subtract(le,ls,lels4);
                lels4[0] *= t4;
                lels4[1] *= t4;
                lels4[2] *= t4;
                vec3Add(ls,lels4,pp4);
                res["GLYCO_BLOCK_C4"] = [pp4[0],pp4[1],pp4[2]];
                
                vec3Subtract(centre,c1c4,ls);
                vec3Add(centre,c1c4Perp,le);
                
                let t5 = DistanceBetweenPointAndLine(ls,le,cat5)[1];
                let pp5 = vec3Create();
                let lels5 = vec3Create();
                vec3Subtract(le,ls,lels5);
                lels5[0] *= t5;
                lels5[1] *= t5;
                lels5[2] *= t5;
                vec3Add(ls,lels5,pp5);
                res["GLYCO_BLOCK_C5"] = [pp5[0],pp5[1],pp5[2]];

                console.log("horizontal");
                console.log(horizontal);
                if(horizontal){
                    block_vert_tri.push(centre[0] - c1c4[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] + c1c4[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    if(two_colour&&invert_colour) {
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    } else {
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    }

                    block_vert_tri.push(centre[0] + c1c4[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] - c1c4[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    if(two_colour&&invert_colour) {
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    } else {
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    }
                    
                    block_vert_tri.push(centre[0] - c1c4[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] + c1c4[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    if(two_colour&&invert_colour) {
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    } else {
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    }

                    block_vert_tri.push(centre[0] + c1c4[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] - c1c4[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    if(two_colour&&invert_colour) {
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    } else {
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    }
                } else {
                    block_vert_tri.push(centre[0] - c1c4[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    if(two_colour&&!invert_colour) {
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    } else {
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    }

                    block_vert_tri.push(centre[0] + c1c4[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    if(two_colour&&!invert_colour) {
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    } else {
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    }

                    block_vert_tri.push(centre[0] - c1c4[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    if(two_colour&&!invert_colour) {
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    } else {
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    }

                    block_vert_tri.push(centre[0] + c1c4[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_vert_tri.push(centre[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                    block_vert_tri.push(centre[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                    block_vert_tri.push(centre[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                    block_idx_tri.push(block_vert_tri.length/3-1);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                    if(two_colour&&!invert_colour) {
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                        block_col_tri.push(white[0]); block_col_tri.push(white[1]); block_col_tri.push(white[2]); block_col_tri.push(white[3]);
                    } else {
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                        block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                    }

                }

                block_vert_tri.push(centre[0] + c1c4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(c1c4Perp[0]-c1c4[0]); block_norm_tri.push(c1c4Perp[1]-c1c4[1]); block_norm_tri.push(c1c4Perp[2]-c1c4[2]);
                block_norm_tri.push(c1c4Perp[0]-c1c4[0]); block_norm_tri.push(c1c4Perp[1]-c1c4[1]); block_norm_tri.push(c1c4Perp[2]-c1c4[2]);
                block_norm_tri.push(c1c4Perp[0]-c1c4[0]); block_norm_tri.push(c1c4Perp[1]-c1c4[1]); block_norm_tri.push(c1c4Perp[2]-c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4Perp[0]+c1c4[0]); block_norm_tri.push(-c1c4Perp[1]+c1c4[1]); block_norm_tri.push(-c1c4Perp[2]+c1c4[2]);
                block_norm_tri.push(-c1c4Perp[0]+c1c4[0]); block_norm_tri.push(-c1c4Perp[1]+c1c4[1]); block_norm_tri.push(-c1c4Perp[2]+c1c4[2]);
                block_norm_tri.push(-c1c4Perp[0]+c1c4[0]); block_norm_tri.push(-c1c4Perp[1]+c1c4[1]); block_norm_tri.push(-c1c4Perp[2]+c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] - c1c4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4Perp[0]+c1c4[0]); block_norm_tri.push(-c1c4Perp[1]+c1c4[1]); block_norm_tri.push(-c1c4Perp[2]+c1c4[2]);
                block_norm_tri.push(-c1c4Perp[0]+c1c4[0]); block_norm_tri.push(-c1c4Perp[1]+c1c4[1]); block_norm_tri.push(-c1c4Perp[2]+c1c4[2]);
                block_norm_tri.push(-c1c4Perp[0]+c1c4[0]); block_norm_tri.push(-c1c4Perp[1]+c1c4[1]); block_norm_tri.push(-c1c4Perp[2]+c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] - c1c4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(c1c4Perp[0]-c1c4[0]); block_norm_tri.push(c1c4Perp[1]-c1c4[1]); block_norm_tri.push(c1c4Perp[2]-c1c4[2]);
                block_norm_tri.push(c1c4Perp[0]-c1c4[0]); block_norm_tri.push(c1c4Perp[1]-c1c4[1]); block_norm_tri.push(c1c4Perp[2]-c1c4[2]);
                block_norm_tri.push(c1c4Perp[0]-c1c4[0]); block_norm_tri.push(c1c4Perp[1]-c1c4[1]); block_norm_tri.push(c1c4Perp[2]-c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] - c1c4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4Perp[0]-c1c4[0]); block_norm_tri.push(-c1c4Perp[1]-c1c4[1]); block_norm_tri.push(-c1c4Perp[2]-c1c4[2]);
                block_norm_tri.push(-c1c4Perp[0]-c1c4[0]); block_norm_tri.push(-c1c4Perp[1]-c1c4[1]); block_norm_tri.push(-c1c4Perp[2]-c1c4[2]);
                block_norm_tri.push(-c1c4Perp[0]-c1c4[0]); block_norm_tri.push(-c1c4Perp[1]-c1c4[1]); block_norm_tri.push(-c1c4Perp[2]-c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] - c1c4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(c1c4Perp[0]+c1c4[0]); block_norm_tri.push(c1c4Perp[1]+c1c4[1]); block_norm_tri.push(c1c4Perp[2]+c1c4[2]);
                block_norm_tri.push(c1c4Perp[0]+c1c4[0]); block_norm_tri.push(c1c4Perp[1]+c1c4[1]); block_norm_tri.push(c1c4Perp[2]+c1c4[2]);
                block_norm_tri.push(c1c4Perp[0]+c1c4[0]); block_norm_tri.push(c1c4Perp[1]+c1c4[1]); block_norm_tri.push(c1c4Perp[2]+c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(c1c4Perp[0]+c1c4[0]); block_norm_tri.push(c1c4Perp[1]+c1c4[1]); block_norm_tri.push(c1c4Perp[2]+c1c4[2]);
                block_norm_tri.push(c1c4Perp[0]+c1c4[0]); block_norm_tri.push(c1c4Perp[1]+c1c4[1]); block_norm_tri.push(c1c4Perp[2]+c1c4[2]);
                block_norm_tri.push(c1c4Perp[0]+c1c4[0]); block_norm_tri.push(c1c4Perp[1]+c1c4[1]); block_norm_tri.push(c1c4Perp[2]+c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + c1c4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4Perp[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + c1c4Perp[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + c1c4Perp[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + c1c4Perp[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-c1c4Perp[0]-c1c4[0]); block_norm_tri.push(-c1c4Perp[1]-c1c4[1]); block_norm_tri.push(-c1c4Perp[2]-c1c4[2]);
                block_norm_tri.push(-c1c4Perp[0]-c1c4[0]); block_norm_tri.push(-c1c4Perp[1]-c1c4[1]); block_norm_tri.push(-c1c4Perp[2]-c1c4[2]);
                block_norm_tri.push(-c1c4Perp[0]-c1c4[0]); block_norm_tri.push(-c1c4Perp[1]-c1c4[1]); block_norm_tri.push(-c1c4Perp[2]-c1c4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                
            } else if(res.getName()==="XLS"||res.getName()==="CXY"||res.getName()==="RBY"||res.getName()==="TDX"||res.getName()==="XYL"||res.getName()==="XYS"||res.getName()==="XYP"){
                /* Draw a star! */
                console.log("Draw a star!");
                // Try 4cuo

                let c1c4 = vec3Create();
                vec3Subtract(cat1,cat4,c1c4);
                NormalizeVec3(c1c4);

                let c1c4Perp = vec3Create();
                vec3Cross(normal,c1c4,c1c4Perp);
                NormalizeVec3(c1c4Perp);

                let norm2 = vec3Create();
                vec3Cross(c1c4,c1c4Perp,norm2);

                c1c4[0] *= sugar_block_radius;
                c1c4[1] *= sugar_block_radius;
                c1c4[2] *= sugar_block_radius;
                c1c4Perp[0] *= sugar_block_radius;
                c1c4Perp[1] *= sugar_block_radius;
                c1c4Perp[2] *= sugar_block_radius;

                // http://mathworld.wolfram.com/Pentagon.html
                let c1 = Math.cos(2.0*Math.PI/5.);
                let c2 = Math.cos(Math.PI/5.);
                let s1 = Math.sin(2.0*Math.PI/5.);
                let s2 = Math.sin(4.0*Math.PI/5.);

                let p1 = vec3Create([c1c4Perp[0],c1c4Perp[1],c1c4Perp[2]]);
                let p2 = vec3Create([s1 * c1c4[0] + c1 * c1c4Perp[0], s1 * c1c4[1] + c1 * c1c4Perp[1], s1 * c1c4[2] + c1 * c1c4Perp[2]]);
                let p3 = vec3Create([s2 * c1c4[0] - c2 * c1c4Perp[0], s2 * c1c4[1] - c2 * c1c4Perp[1], s2 * c1c4[2] - c2 * c1c4Perp[2]]);
                let p4 = vec3Create([-s2 * c1c4[0] - c2 * c1c4Perp[0], -s2 * c1c4[1] - c2 * c1c4Perp[1], -s2 * c1c4[2] - c2 * c1c4Perp[2]]);
                let p5 = vec3Create([-s1 * c1c4[0] + c1 * c1c4Perp[0], -s1 * c1c4[1] + c1 * c1c4Perp[1], -s1 * c1c4[2] + c1 * c1c4Perp[2]]);

                let t6 = DistanceBetweenTwoLines(p1,p3,p5,p2)[1];
                let t7 = DistanceBetweenTwoLines(p1,p3,p2,p4)[1];
                let t8 = DistanceBetweenTwoLines(p2,p4,p3,p5)[1];
                let t9 = DistanceBetweenTwoLines(p4,p1,p3,p5)[1];
                let t10 = DistanceBetweenTwoLines(p5,p2,p4,p1)[1];

                function AddFractionToLine(pp1,pp2,frac){
                    let ret = vec3Create();
                    let diff = vec3Create();
                    vec3Subtract(pp2,pp1,diff);
                    diff[0] *= frac;
                    diff[1] *= frac;
                    diff[2] *= frac;
                    vec3Add(pp1,diff,ret);
                    return ret;
                }

                let p6  = AddFractionToLine(p1,p3,t6);
                let p7  = AddFractionToLine(p1,p3,t7);
                let p8  = AddFractionToLine(p2,p4,t8);
                let p9  = AddFractionToLine(p4,p1,t9);
                let p10 = AddFractionToLine(p5,p2,t10);
                res["GLYCO_BLOCK_C1"] = [centre[0]+p2[0],centre[1]+p2[1],centre[2]+p2[2]];
                res["GLYCO_BLOCK_C2"] = [centre[0]+p10[0],centre[1]+p10[1],centre[2]+p10[2]];
                res["GLYCO_BLOCK_C3"] = [centre[0]+p6[0],centre[1]+p6[1],centre[2]+p6[2]];
                res["GLYCO_BLOCK_C4"] = [centre[0]+p5[0],centre[1]+p5[1],centre[2]+p5[2]];
                res["GLYCO_BLOCK_C5"] = [centre[0]+p3[0],centre[1]+p3[1],centre[2]+p3[2]];

                block_vert_tri.push(centre[0] + p6[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p7[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p7[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p8[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p8[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p9[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p9[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p10[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p10[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p6[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p1[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p1[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p1[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p10[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p6[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p2[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p2[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p2[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p6[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p7[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p3[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p3[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p3[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p7[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p8[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p8[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p9[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p5[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p5[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p5[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p9[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p10[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p6[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p7[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p7[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p8[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p8[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p9[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p9[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p10[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p10[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p6[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_norm_tri.push(-norm2[0]); block_norm_tri.push(-norm2[1]); block_norm_tri.push(-norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p1[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p1[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p1[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p10[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p6[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p2[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p2[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p2[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p6[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p7[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p3[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p3[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p3[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p7[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p8[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p4[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p4[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p4[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p8[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p9[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p5[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p5[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p5[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p9[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p10[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_norm_tri.push(norm2[0]); block_norm_tri.push(norm2[1]); block_norm_tri.push(norm2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p1[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p1[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p1[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p1[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p1[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p1[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p6[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p1[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p1[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p1[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p6[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p6[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p6[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p6[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p2[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p2[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p2[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p6[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p6[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p6[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p2[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p2[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p2[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p2[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p2[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p2[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p2[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p2[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p2[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p2[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p2[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p2[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p7[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p2[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p2[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p2[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p7[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p7[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p7[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p7[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p3[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p3[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p3[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p7[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p7[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p7[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p3[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p3[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p3[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p3[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p3[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p3[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_norm_tri.push(p2[0]); block_norm_tri.push(p2[1]); block_norm_tri.push(p2[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p3[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p3[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p3[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p3[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p3[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p3[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p8[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p3[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p3[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p3[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p8[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p8[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p8[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p8[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p8[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p8[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p8[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p4[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p4[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p4[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_norm_tri.push(p3[0]); block_norm_tri.push(p3[1]); block_norm_tri.push(p3[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p4[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p4[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p4[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p4[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p4[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p4[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p9[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p4[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p4[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p4[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p9[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p9[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p9[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p9[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p5[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p5[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p5[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p9[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p9[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p9[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p5[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p5[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p5[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p5[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p5[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p5[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_norm_tri.push(p4[0]); block_norm_tri.push(p4[1]); block_norm_tri.push(p4[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p5[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p5[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p5[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p5[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p5[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p5[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p10[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p5[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p5[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p5[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p10[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p10[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_norm_tri.push(p1[0]); block_norm_tri.push(p1[1]); block_norm_tri.push(p1[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p10[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p10[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p1[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p1[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p1[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

                block_vert_tri.push(centre[0] + p10[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p10[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p10[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p1[0] + sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p1[1] + sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p1[2] + sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_vert_tri.push(centre[0] + p1[0] - sugar_block_thickness*norm2[0]);
                block_vert_tri.push(centre[1] + p1[1] - sugar_block_thickness*norm2[1]);
                block_vert_tri.push(centre[2] + p1[2] - sugar_block_thickness*norm2[2]);
                block_idx_tri.push(block_vert_tri.length/3-1);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_norm_tri.push(p5[0]); block_norm_tri.push(p5[1]); block_norm_tri.push(p5[2]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);
                block_col_tri.push(col1[0]); block_col_tri.push(col1[1]); block_col_tri.push(col1[2]); block_col_tri.push(col1[3]);

            } else {
                console.log("I don't know what to draw for "+res.getName());
            }
        }
    }

}

function DrawSugarBlock(res1,sugar_block_thickness,sugarAtomNames, block_vert_tri,block_norm_tri,block_col_tri,block_idx_tri,col1){
    //console.log("Consider glyco block "+res1.getName());
    for(let isugartype=0;isugartype<sugarAtomNames.length;isugartype++){
        for(let iring=0;iring<sugarAtomNames[isugartype].length;iring++){
            if(sugarAtomNames[isugartype][iring].length>4){
                let c1name = sugarAtomNames[isugartype][iring][0];
                let c2name = sugarAtomNames[isugartype][iring][1];
                let c3name = sugarAtomNames[isugartype][iring][2];
                let c4name = sugarAtomNames[isugartype][iring][3];
                let c5name = sugarAtomNames[isugartype][iring][4];
                let o5name = null;
                let c1 = res1.getAtom(c1name);
                let c2 = res1.getAtom(c2name);
                let c3 = res1.getAtom(c3name);
                let c4 = res1.getAtom(c4name);
                let c5 = res1.getAtom(c5name);
                let o5 = null;
                if(sugarAtomNames[isugartype][iring].length===6){
                    o5name = sugarAtomNames[isugartype][iring][5];
                    o5 = res1.getAtom(o5name);
                    //std::cout << "Looking for " << c1name << " " << c2name << " " << c3name << " " << c4name << " " << c5name << " " << o5name << "\n";
                } else {
                    //std::cout << "Looking for " << c1name << " " << c2name << " " << c3name << " " << c4name << " " << c5name << "\n";
                }
                if(c1&&c2&&c3&&c4&&c5&&(o5||sugarAtomNames[isugartype][iring].length!==6)){
                    //console.log("Have them all");
                    // FIXME - col1 is colour of this atom. two_colour depends on whether colour by restype or not.
                    let sugar_block_scale = 1.0;
                    let two_colour = true;
                    DrawSugarBlockInt(res1, col1, c1,c2,c3,c4,c5,o5, two_colour, sugar_block_thickness, sugar_block_scale, block_vert_tri,block_norm_tri,block_col_tri,block_idx_tri );
                    //std::vector<Cartesian> res = DrawSugarBlockInt(tris, cyls, res1, col1, params, global_params, selHnd, c1,c2,c3,c4,c5,o5,res1, molHnd, two_colour, sugar_block_thickness, sugar_block_scale );
                    //if(iring==sugarAtomNames[isugartype].length-1&&res.length==2) return res;
                    return;
                }

            }
        }
    }
    //std::vector<Cartesian> retval;
    //return retval;

}

function residuesToGlycoBlocksInfo(glycanResidues,size,colourScheme){
    let block_col_tri = [];
    let block_norm_tri = [];
    let block_vert_tri = [];
    let block_idx_tri = [];
    let glycanAtoms = [];

    let sugarAtomNames = getSugarAtomNames();

    for(let ig=0;ig<glycanResidues.length;ig++){
        for(let iat=0;iat<glycanResidues[ig].atoms.length;iat++){
            glycanAtoms.push(glycanResidues[ig].atoms[iat]);
        }
    }

    for(let ig=0;ig<glycanResidues.length;ig++){
        let col1 = colourScheme[glycanResidues[ig].atoms[0]["_atom_site.id"]];
        let sugarBlockPrims = DrawSugarBlock(glycanResidues[ig],size,sugarAtomNames,block_vert_tri,block_norm_tri,block_col_tri,block_idx_tri,col1);
    }

    let blockPrimitiveInfo = {"atoms":[[glycanAtoms]], "col_tri":[[block_col_tri]], "norm_tri":[[block_norm_tri]], "vert_tri":[[block_vert_tri]], "idx_tri":[[block_idx_tri]] , "prim_types":[["TRIANGLES"]] };
    return blockPrimitiveInfo;
}

function atomsToSpheresInfo(atoms,size,colourScheme){
    // FIXME - PERFECT_SPHERES, POINTS_SPHERES option?
    return atomsToCirclesSpheresInfo(atoms,size,"POINTS_SPHERES",colourScheme);
    //return atomsToCirclesSpheresInfo(atoms,size,"PERFECT_SPHERES",colourScheme);
}

function atomsToCirclesInfo(atoms,size,colourScheme){
    return atomsToCirclesSpheresInfo(atoms,size,"CIRCLES2",colourScheme);
}

class  ColourScheme{
constructor(pdbatoms){
    this.pdbatoms = pdbatoms;
    this.hier = this.pdbatoms["atoms"];
    this.colours = {};
    this.ice_blue     = [0.61,0.69,1.00,1.0]; this.colours["ice_blue"] = this.ice_blue;
    this.gold         = [0.70,0.69,0.24,1.0]; this.colours["gold"] = this.gold;
    this.coral        = [1.00,0.50,0.31,1.0]; this.colours["coral"] = this.coral;
    this.grey         = [0.50,0.50,0.50,1.0]; this.colours["grey"] = this.grey;
    this.pink         = [1.00,0.57,1.00,1.0]; this.colours["pink"] = this.pink;
    this.sea_green    = [0.50,0.73,0.71,1.0]; this.colours["sea_green"] = this.sea_green;
    this.pale_brown   = [0.66,0.49,0.37,1.0]; this.colours["pale_brown"] = this.pale_brown;
    this.lilac        = [0.68,0.53,0.73,1.0]; this.colours["lilac"] = this.lilac;
    this.lemon        = [1.00,1.00,0.50,1.0]; this.colours["lemon"] = this.lemon;
    this.lawn_green   = [0.27,0.61,0.31,1.0]; this.colours["lawn_green"] = this.lawn_green;
    this.pale_crimson = [0.82,0.24,0.24,1.0]; this.colours["pale_crimson"] = this.pale_crimson;
    this.light_blue   = [0.25,0.60,0.88,1.0]; this.colours["light_blue"] = this.light_blue;
    this.tan          = [0.47,0.00,0.00,1.0]; this.colours["tan"] = this.tan;
    this.light_green  = [0.60,1.00,0.60,1.0]; this.colours["light_green"] = this.light_green;
    this.yellow       = [1.00,1.00,0.00,1.0]; this.colours["yellow"] = this.yellow;
    this.white        = [1.00,1.00,1.00,1.0]; this.colours["white"] = this.white;
    this.blue         = [0.00,0.00,1.00,1.0]; this.colours["blue"] = this.blue;
    this.red          = [1.00,0.00,0.00,1.0]; this.colours["red"] = this.red;
    this.green        = [0.00,1.00,0.00,1.0]; this.colours["green"] = this.green;
    this.magenta      = [1.00,0.00,1.00,1.0]; this.colours["magenta"] = this.magenta;
    this.cyan         = [0.00,1.00,0.88,1.0]; this.colours["cyan"] = this.cyan;
    this.purple       = [0.58,0.00,1.00,1.0]; this.colours["purple"] = this.purple;
    this.dark_purple  = [0.57,0.13,0.34,1.0]; this.colours["dark_purple"] = this.dark_purple;
    this.dark_cyan    = [0.10,0.60,0.70,1.0]; this.colours["dark_cyan"] = this.dark_cyan;
    this.black        = [0.00,0.00,0.00,1.0]; this.colours["black"] = this.black;
    this.orange       = [1.00,0.64,0.00,1.0]; this.colours["orange"] = this.orange;
    this.indigo       = [0.29,0.00,0.51,1.0]; this.colours["indigo"] = this.indigo;
    this.violet       = [0.49,0.00,1.00,1.0]; this.colours["violet"] = this.violet;
    this.residueColours = {"PHE":this.magenta,"TRP":this.magenta,"TYR":this.magenta,"PRO":this.coral,"VAL":this.coral,"ALA":this.coral,"ILE":this.coral,"LEU":this.coral,"SER":this.cyan,"THR":this.cyan,"ASN":this.cyan,"GLN":this.cyan,"ARG":this.blue,"LYS":this.blue,"ASP":this.red,"GLU":this.red,"CYS":this.yellow,"MET":this.yellow,"GLY":this.white,"HIS":this.light_blue,"A":this.red,"T":this.yellow,"G":this.green,"C":this.blue,"U":this.magenta,"DA":this.red,"DT":this.yellow,"DG":this.green,"DC":this.blue,"ADE":this.red,"THY":this.yellow,"GUA":this.green,"CYT":this.blue,"URA":this.magenta,"BMA":this.green,"MAN":this.green,"NAG":this.blue,"GLC":this.blue,"BGC":this.blue,"GCS":this.blue,"GAL":this.yellow,"NGA":this.yellow,"MGC":this.yellow,"NG1":this.yellow,"NG6":this.yellow,"A2G":this.yellow,"6MN":this.blue,"GLP":this.blue,"GP4":this.blue,"BEM":this.green,"KDN":this.light_green,"XLS":this.coral,"CXY":this.coral,"RBY":this.coral,"TDX":this.coral,"XYL":this.coral,"XYS":this.coral,"XYP":this.coral,"FCA":this.red,"FCB":this.red,"FUC":this.red,"GTR":this.yellow,"ADA":this.yellow,"DGU":this.yellow,"SI3":this.purple,"NCC":this.purple,"NGF":this.light_blue,"NGE":this.light_blue,"NGC":this.light_blue,"GC4":this.blue,"GCD":this.blue,"GCU":this.blue,"GCV":this.blue,"GCW":this.blue,"IDS":this.blue,"REL":this.blue,"IDR":this.pale_brown,"SIA":this.purple};
    this.order_colours = [this.ice_blue,this.gold,this.coral,this.grey,this.pink,this.sea_green,this.pale_brown,this.lilac,this.lemon,this.lawn_green,this.pale_crimson,this.light_blue,this.tan,this.light_green,this.yellow,this.blue,this.red,this.green,this.magenta,this.cyan,this.purple,this.dark_purple,this.dark_cyan];
}

colourByAtomType(params){
    //FIXME - Need to consider models.
    let colarray = {};
    let model = this.hier[0];
    let atoms = model.getAllAtoms();
    for(let iat=0;iat<atoms.length;iat++){
        let element = atoms[iat].element();
        let serNum = atoms[iat]["_atom_site.id"];
        if(typeof(params)!=="undefined"&&element in params){
            colarray[serNum] = params[element];
        } else if(element==="O"){
            colarray[serNum] = [1.0,0.0,0.0,1.0];
        }else if(element==="C"){
            colarray[serNum] = [0.0,1.0,0.0,1.0];
        }else if(element==="N"){
            colarray[serNum] = [0.0,0.0,1.0,1.0];
        }else if(element==="S"){
            colarray[serNum] = [1.0,1.0,0.0,1.0];
        }else if(element==="P"){
            colarray[serNum] = [1.0,0.0,1.0,1.0];
        }else{
            colarray[serNum] = [0.5,0.5,0.5,1.0];
        }
    }
    return colarray;
}

colourBySecondaryStructure(params){
    let colarray = {};
    let chains = this.hier[0].chains;
    for(let ic=0;ic<chains.length;ic++){
        let residues = chains[ic].residues;
        for(let ir=0;ir<residues.length;ir++){
            let ca = residues[ir].getAtomTrimmed( "CA" );
            if(ca&&typeof(ca.residue["SSE"])!=="undefined"){
                if(ca.residue["SSE"]==="SSE_Strand"||ca.residue["SSE"]==="SSE_Bulge"){
                    for(let iat=0;iat<residues[ir].atoms.length;iat++){
                        let serNum = residues[ir].atoms[iat]["_atom_site.id"];
                        colarray[serNum] = params["strand"];
                    }
                } else if(ca.residue["SSE"]==="SSE_Helix"){
                    for(let iat=0;iat<residues[ir].atoms.length;iat++){
                        let serNum = residues[ir].atoms[iat]["_atom_site.id"];
                        colarray[serNum] = params["helix"];
                    }
                } else {
                    for(let iat=0;iat<residues[ir].atoms.length;iat++){
                        let serNum = residues[ir].atoms[iat]["_atom_site.id"];
                        colarray[serNum] = [0.5,0.5,0.5,1.0];
                    }
                }
            } else {
                for(let iat=0;iat<residues[ir].atoms.length;iat++){
                    let serNum = residues[ir].atoms[iat]["_atom_site.id"];
                    colarray[serNum] = [0.5,0.5,0.5,1.0];
                }
            }
        }
    }
    return colarray;
}


colourByResidueType(params){
    //FIXME - Need to consider models.
    let colarray = {};
    let model = this.hier[0];
    let atoms = model.getAllAtoms();
    for(let iat=0;iat<atoms.length;iat++){
        let resName = atoms[iat].residue.getName();
        let serNum = atoms[iat]["_atom_site.id"];
        if(typeof(params)!=="undefined"&&resName in params){
            colarray[serNum] = params[resName];
        } else if(resName in this.residueColours){
            colarray[serNum] = this.residueColours[resName];
        }else{
            colarray[serNum] = [0.5,0.5,0.5,1.0];
        }
    }
    return colarray;
}

colourByEntity(params){
}

colourByModel(params){
    let colarray = {};
    for(let im=0;im<this.hier.length;im++){
        let chains = this.hier[im].chains;
        for(let ic=0;ic<chains.length;ic++){
            let residues = chains[ic].residues;
            for(let ir=0;ir<residues.length;ir++){
                for(let iat=0;iat<residues[ir].atoms.length;iat++){
                    let serNum = residues[ir].atoms[iat]["_atom_site.id"];
                    colarray[serNum] = this.order_colours[im%this.order_colours.length];
                    if(typeof(params)!=="undefined"&&typeof(params["nonCByAtomType"]!=="undefined")&&params["nonCByAtomType"]){
                        let element = residues[ir].atoms[iat].element();
                        if(element in params){
                            colarray[serNum] = params[element];
                        } else if(element==="O"){
                            colarray[serNum] = [1.0,0.0,0.0,1.0];
                        }else if(element==="N"){
                            colarray[serNum] = [0.0,0.0,1.0,1.0];
                        }else if(element==="S"){
                            colarray[serNum] = [1.0,1.0,0.0,1.0];
                        }
                    }
                }
            }
        }
    }
    return colarray;
}

colourByChain(params){
    let colarray = {};
    for(let im=0;im<this.hier.length;im++){
        let chains = this.hier[im].chains;
        for(let ic=0;ic<chains.length;ic++){
            let residues = chains[ic].residues;
            for(let ir=0;ir<residues.length;ir++){
                for(let iat=0;iat<residues[ir].atoms.length;iat++){
                    let serNum = residues[ir].atoms[iat]["_atom_site.id"];
                    colarray[serNum] = this.order_colours[ic%this.order_colours.length];
                    if(typeof(params)!=="undefined"&&typeof(params["nonCByAtomType"]!=="undefined")&&params["nonCByAtomType"]){
                        let element = residues[ir].atoms[iat].element();
                        if(element in params){
                            colarray[serNum] = params[element];
                        } else if(element==="O"){
                            colarray[serNum] = [1.0,0.0,0.0,1.0];
                        }else if(element==="N"){
                            colarray[serNum] = [0.0,0.0,1.0,1.0];
                        }else if(element==="S"){
                            colarray[serNum] = [1.0,1.0,0.0,1.0];
                        }
                    }
                }
            }
        }
    }
    return colarray;
}

colourByMainSide(params){
    let colarray = {};
    for(let im=0;im<this.hier.length;im++){
        let allAtoms = this.hier[im].getAllAtoms();
        let sideAtoms = this.hier[im].getAtoms("side");
        let mainAtoms = this.hier[im].getAtoms("main");
        for(let iat=0;iat<allAtoms.length;iat++){
            let serNum = allAtoms[iat]["_atom_site.id"];
            if(mainAtoms.indexOf(allAtoms[iat])!==-1){
                colarray[serNum] = this.lemon;
            } else if(sideAtoms.indexOf(allAtoms[iat])!==-1){
                colarray[serNum] = this.ice_blue;
            } else {
                colarray[serNum] = [0.5,0.5,0.5,1.0];
            }
        }
    }
    return colarray;
}

colourByProperty(params,prop){
    //FIXME - Need to consider models.
    //FIXME - Below bottom and above top ranges need to be done.
    let colarray = {};
    let model = this.hier[0];
    let atoms = model.getAllAtoms();

    for(let ip=0;ip<params.length;ip++){
        for(let iat=0;iat<atoms.length;iat++){
            let Prop = atoms[iat][prop];
            let serNum = atoms[iat]["_atom_site.id"];
            if(isNaN(Prop)){
                    colarray[serNum] = [0.5,0.5,0.5,1.0];
            } else {
                if(Prop<params[0].min){ // FIXME see above
                    colarray[serNum] = params[0].mincolour;
                } else if(Prop>params[params.length-1].max){ // FIXME see above
                    colarray[serNum] = params[params.length-1].maxcolour;
                } else if(Prop>=params[ip].min&&Prop<=params[ip].max){
                    let frac = 1.0*(Prop - params[ip].min) / (params[ip].max- params[ip].min);
                    let r = frac*params[ip].maxcolour[0] + (1.0-frac)*params[ip].mincolour[0];
                    let g = frac*params[ip].maxcolour[1] + (1.0-frac)*params[ip].mincolour[1];
                    let b = frac*params[ip].maxcolour[2] + (1.0-frac)*params[ip].mincolour[2];
                    let a = frac*params[ip].maxcolour[3] + (1.0-frac)*params[ip].mincolour[3];
                    colarray[serNum] = [r,g,b,a];
                }
            }
        }
    }

    return colarray;
}

colourByBFactor(params){
    return this.colourByProperty(params,"_atom_site.B_iso_or_equiv");
}

colourByOccupancy(params){
    return this.colourByProperty(params,"_atom_site.occupancy");
}

colourByCharge(params){
    return this.colourByProperty(params,"_atom_site.pdbx_formal_charge");
}

colourRainbow(params){
    let colarray = {};
    let start_colour = [0.0,0.0,1.0,1.0];
    let end_colour   = [1.0,0.0,0.0,1.0];
    for(let im=0;im<this.hier.length;im++){
        let chains = this.hier[im].chains;
        for(let ic=0;ic<chains.length;ic++){
            let residues = chains[ic].residues;
            let nPeptide = 0;
            for(let ir=0;ir<residues.length;ir++){
                if(residues[ir].isAminoAcid()){
                    nPeptide++;
                }
            }
            let iPeptide = 0;
            for(let ir=0;ir<residues.length;ir++){
                if(residues[ir].isAminoAcid()){
                    let frac = 1.0 * iPeptide / nPeptide;
                    //frac = 0.9;
                    let theColour = colourRamp(start_colour,end_colour,frac,"hsv");
                    for(let iat=0;iat<residues[ir].atoms.length;iat++){
                        let serNum = residues[ir].atoms[iat]["_atom_site.id"];
                        colarray[serNum] = theColour;
                    }
                    iPeptide++;
                } else {
                    for(let iat=0;iat<residues[ir].atoms.length;iat++){
                        let serNum = residues[ir].atoms[iat]["_atom_site.id"];
                        colarray[serNum] = [0.5,0.5,0.5,1.0];
                    }
                }
            }
        }
    }
    return colarray;
}

colourOneColour(params){
    //FIXME - Need to consider models.
    let colarray = {};
    let model = this.hier[0];
    let atoms = model.getAllAtoms();
    for(let iat=0;iat<atoms.length;iat++){
        let element = atoms[iat].element();
        let serNum = atoms[iat]["_atom_site.id"];
        colarray[serNum] = [params[0],params[1],params[2],params[3]];
    }
    return colarray;
}

colourByHydrophobicity(params){
}

colourByAtomSAS(params){
}

colourByResideSAS(params){
}

colourBySequenceConservation(params){
}
}

function hsvtorgb (hsv) {
    let r,g,b;
    let rgb = [];


    rgb[3] = hsv[3];


    if ( Math.abs(hsv[0]) < 1e-6 && Math.abs(hsv[1]) < 1e-6 && Math.abs(hsv[2]) < 1e-6 ) {
        rgb[0] = 1.0; 
        rgb[1] = 1.0; 
        rgb[2] = 1.0; 
        return rgb;
    }
    if ( Math.abs(hsv[1]) < 1e-6 ) {
        rgb[0] = rgb[1] = rgb[2] = hsv[2];
        return rgb;
    }

    let h = hsv[0] / 60.0;
    let i = parseInt(Math.floor(hsv[0]/60.0)); // Need to round up
    let f = h - i;
    let p = hsv[2] * (1.0 - hsv[1]);
    let q = hsv[2] * (1.0 - hsv[1] * f);
    let t = hsv[2] * (1.0 - hsv[1] * (1.0 - f));
    let v = hsv[2];

    switch (i) {
        case 0 :
            r = v;
            g  = t;
            b  = p;
            break;
        case  1 : 
            r  = q;
            g  = v;
            b  = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3 :
            r  = p;
            g = q;
            b = v;
            break;
        case 4 :
            r = t;
            g = p;
            b = v;
            break;
        default :
            r = v;
            g = p;
            b = q;
            break;
    }
    rgb[0] = r;
    rgb[1] = g;
    rgb[2] = b;

    return rgb;
}

function rgbtohsv (rgb) {
    let s,h,v;
    let hsv = [];

    hsv[3] = rgb[3];

    let maxrgb = Math.max(rgb[0],rgb[1]);
    maxrgb = Math.max(maxrgb,rgb[2]);
    let minrgb = Math.min(rgb[0],rgb[1]);
    minrgb = Math.min(minrgb,rgb[2]);

    v = maxrgb;
    let delta = maxrgb - minrgb;

    if (Math.abs(delta)<1e-6) {
        hsv[0] = 0;
        hsv[1] = 0;
        hsv[2] = v;
        return hsv;
    }

    if ( Math.abs(maxrgb) > 1e-6 ) {
        s = delta / maxrgb;
    } else {
        hsv[0] = 0;
        hsv[1] = -1;
        hsv[2] = v;
        return hsv;
    }

    if ( Math.abs(rgb[0]-maxrgb) < 1e-6 ) {
        h = 1.0*(rgb[1] - rgb[2]) /delta;
    } else if (Math.abs(rgb[1] - maxrgb)< 1e-6 ) {
        h= 2 + (1.0*( rgb[2] - rgb[0] )/delta);
    } else {
        h = 4 + (1.0*( rgb[0] - rgb[1] )  / delta);
    }

    h= h * 60;
    if (h < 0 ) h = h + 360;

    hsv[0] = h;
    hsv[1] = s;
    hsv[2] = v;
    return hsv;

}

function colourRamp(start_colour_in,end_colour_in,frac,mode){
    if(mode==="hsv"){
        /* 
           Now this ought to be more complicated: wheel direction is important. But this simple way works for rainbow.
           We can do the wheel the other way by splitting interpolation into two ranges, one which goes to hue of 359 and other from 0.
           Or other way round depending in which initial colour has highest hue. We'll do this in due course.
         */
        let start_colour = rgbtohsv([start_colour_in[0],start_colour_in[1],start_colour_in[2],start_colour_in[3]]);
        let end_colour = rgbtohsv([end_colour_in[0],end_colour_in[1],end_colour_in[2],end_colour_in[3]]);

        let r = frac*end_colour[0] + (1.0-frac)*start_colour[0];
        let g = frac*end_colour[1] + (1.0-frac)*start_colour[1];
        let b = frac*end_colour[2] + (1.0-frac)*start_colour[2];
        let a = frac*end_colour[3] + (1.0-frac)*start_colour[3];
        return hsvtorgb([r,g,b,a]);
    } else {
        let start_colour = [start_colour_in[0],start_colour_in[1],start_colour_in[2],start_colour_in[3]];
        let end_colour = [end_colour_in[0],end_colour_in[1],end_colour_in[2],end_colour_in[3]];

        let r = frac*end_colour[0] + (1.0-frac)*start_colour[0];
        let g = frac*end_colour[1] + (1.0-frac)*start_colour[1];
        let b = frac*end_colour[2] + (1.0-frac)*start_colour[2];
        let a = frac*end_colour[3] + (1.0-frac)*start_colour[3];
        return [r,g,b,a];
    }
}

function atomsToCirclesSpheresInfo(atoms,size,primType,colourScheme){
    let sphere_sizes = [];
    let sphere_col_tri = [];
    let sphere_vert_tri = [];
    let sphere_idx_tri = [];
    let sphere_atoms = [];
    for(let iat=0;iat<atoms.length;iat++){
        sphere_idx_tri.push(iat);
        sphere_vert_tri.push(atoms[iat].x());
        sphere_vert_tri.push(atoms[iat].y());
        sphere_vert_tri.push(atoms[iat].z());
        for(let ip=0;ip<colourScheme[atoms[iat]["_atom_site.id"]].length;ip++) sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][ip]);
        sphere_sizes.push(size);
        let atom = {};
        atom["x"] = atoms[iat].x();
        atom["y"] = atoms[iat].y();
        atom["z"] = atoms[iat].z();
        atom["tempFactor"] = atoms[iat]["_atom_site.B_iso_or_equiv"];
        atom["charge"] = atoms[iat]["_atom_site.pdbx_formal_charge"];
        atom["symbol"] = atoms[iat]["_atom_site.type_symbol"];
        atom["label"] =  atoms[iat].getAtomID();
        sphere_atoms.push(atom);
    }

    let spherePrimitiveInfo = {"atoms":[[sphere_atoms]],"sizes": [[sphere_sizes]], "col_tri":[[sphere_col_tri]], "norm_tri":[[[]]], "vert_tri":[[sphere_vert_tri]], "idx_tri":[[sphere_idx_tri]] , "prim_types":[[primType]] };
    return spherePrimitiveInfo;
}

function atomsToEllipsoidsInfo(atoms,size,colourScheme){
    let sphere_sizes = [];
    let sphere_col_tri = [];
    let sphere_vert_tri = [];
    let sphere_idx_tri = [];
    let scale_matrices = [];
    let sphere_atoms = [];
    let kBA = 1.3806503e-03;
    let TEMP = 298.155;
    let prefactor=8.0*Math.PI*Math.PI*kBA*TEMP;
    for(let iat=0;iat<atoms.length;iat++){
        sphere_idx_tri.push(iat);
        sphere_vert_tri.push(atoms[iat].x());
        sphere_vert_tri.push(atoms[iat].y());
        sphere_vert_tri.push(atoms[iat].z());
        if(typeof(atoms[iat]["_atom_site_anisotrop.U[1][1]"]) !== "undefined"){
            let anisoU = [];
            anisoU.push(atoms[iat]["_atom_site_anisotrop.U[1][1]"]);
            anisoU.push(atoms[iat]["_atom_site_anisotrop.U[1][2]"]);
            anisoU.push(atoms[iat]["_atom_site_anisotrop.U[1][3]"]);
            anisoU.push(atoms[iat]["_atom_site_anisotrop.U[1][2]"]);
            anisoU.push(atoms[iat]["_atom_site_anisotrop.U[2][2]"]);
            anisoU.push(atoms[iat]["_atom_site_anisotrop.U[2][3]"]);
            anisoU.push(atoms[iat]["_atom_site_anisotrop.U[1][3]"]);
            anisoU.push(atoms[iat]["_atom_site_anisotrop.U[2][3]"]);
            anisoU.push(atoms[iat]["_atom_site_anisotrop.U[3][3]"]);
            scale_matrices.push(anisoU);
        } else {
            // FIXME - We should be using B-factor (if that exists).
            let iso = [];
            iso.push(atoms[iat]["_atom_site.B_iso_or_equiv"]/prefactor);
            iso.push(0.0);
            iso.push(0.0);
            iso.push(0.0);
            iso.push(atoms[iat]["_atom_site.B_iso_or_equiv"]/prefactor);
            iso.push(0.0);
            iso.push(0.0);
            iso.push(0.0);
            iso.push(atoms[iat]["_atom_site.B_iso_or_equiv"]/prefactor);
            scale_matrices.push(iso);
        }
        for(let ip=0;ip<colourScheme[atoms[iat]["_atom_site.id"]].length;ip++) sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][ip]);
        sphere_sizes.push(size);
        let atom = {};
        atom["x"] = atoms[iat].x();
        atom["y"] = atoms[iat].y();
        atom["z"] = atoms[iat].z();
        atom["tempFactor"] = atoms[iat]["_atom_site.B_iso_or_equiv"];
        atom["charge"] = atoms[iat]["_atom_site.pdbx_formal_charge"];
        atom["symbol"] = atoms[iat]["_atom_site.type_symbol"];
        atom["label"] =  atoms[iat].getAtomID();
        sphere_atoms.push(atom);
    }

    let spherePrimitiveInfo = {"atoms":[[sphere_atoms]],"scale_matrices": [[scale_matrices]], "sizes": [[sphere_sizes]], "col_tri":[[sphere_col_tri]], "norm_tri":[[[]]], "vert_tri":[[sphere_vert_tri]], "idx_tri":[[sphere_idx_tri]] , "prim_types":[["SPHEROIDS"]] };
    return spherePrimitiveInfo;
}

function ringsToToruses(rings,size,radius,linetype,colourScheme){
    let toruses = [];

    let cylinder_sizes = [];
    let cylinder_col_tri = [];
    let cylinder_vert_tri = [];
    let cylinder_norm_tri = [];
    let cylinder_idx_tri = [];
    let radii = [];
    for(let i=0;i<rings.length;i++){
        let theRing = rings[i];
        let col = colourScheme[theRing[0][0]["_atom_site.id"]];
        // Always try to colour ring by colour of first C atom in the ring.
        for(let j=1;j<theRing[0].length;j++){
            if(theRing[0][1].element()==="C"){
                col = colourScheme[theRing[0][j]["_atom_site.id"]];
                break;
            }
        }
        cylinder_sizes.push(size);
        Array.prototype.push.apply(cylinder_col_tri,col);
        Array.prototype.push.apply(cylinder_vert_tri,theRing[2]);
        Array.prototype.push.apply(cylinder_norm_tri,theRing[3]);
        cylinder_idx_tri.push(i);
        if(theRing[0].length===6){
            radii.push(radius);
        } else {
            radii.push(radius*5.0/6.0);
        }
    }
    let cylinderPrimitiveInfo = {"radii": [[radii]], "sizes": [[cylinder_sizes]], "col_tri":[[cylinder_col_tri]], "norm_tri":[[cylinder_norm_tri]], "vert_tri":[[cylinder_vert_tri]], "idx_tri":[[cylinder_idx_tri]] , "prim_types":[[linetype]] };
    //console.log(cylinderPrimitiveInfo);
    return cylinderPrimitiveInfo;
}

function getMultipleBondsLines(atoms,enerLib,size,colourScheme){
    return getMultipleBonds(atoms,enerLib,size,colourScheme,"LINES");
}

function getMultipleBondsCylinders(atoms,enerLib,size,colourScheme){
    return getMultipleBonds(atoms,enerLib,size,colourScheme,"CYLINDERS");
}

function getMultipleBonds(atoms,enerLib,size,colourScheme,style){

    let thisResId = "";
    let thisChainId = "";
    let thisResAtoms = [];
    let contacts = [];
    let dashedContacts = [];
    let singleContacts = [];
    let tripleContacts = [];
    let drawRings = [];

    let xaxis = vec3Create([1.0,0.0,0.0]);
    let yaxis = vec3Create([0.0,1.0,0.0]);
    let zaxis = vec3Create([0.0,0.0,1.0]);

    // FIXME - This is for CYLINDERS, need different for balls, bonds, etc. And I am making numbers up.
    //let dbOffset = size*.5;

    let tbOffset = size*2./3.;
    let dbOffset = size*.675;
    let tbSize = size*.3;
    let dbSize = size*.4;
    let radius = 0.65;

    if(typeof(style)!=="undefined"&&style==="LINES"){
        tbOffset = size*0.02;
        dbOffset = size*0.02;
        tbSize = size;
        dbSize = size;
        radius = 0.65;
    }

    function GetFuncGroupBonds(name1,name2,bonds) {
        function getAdj(thisBond){
            return ((thisBond["_chem_comp_bond.atom_id_1"]===name1 && thisBond["_chem_comp_bond.atom_id_2"]!==name2) || (thisBond["_chem_comp_bond.atom_id_2"]===name1 && thisBond["_chem_comp_bond.atom_id_1"]!==name2));
        }
        let adjacent_bonds = bonds.filter(getAdj);
        let adjacent_children = [];
        for(let i=0;i<adjacent_bonds.length;i++){
            if(adjacent_bonds[i]["_chem_comp_bond.atom_id_1"]===name1){
                adjacent_children.push([adjacent_bonds[i]["_chem_comp_bond.atom_id_2"],adjacent_bonds[i]["_chem_comp_bond.type"].trim().toLowerCase()]);
            } else {
                adjacent_children.push([adjacent_bonds[i]["_chem_comp_bond.atom_id_1"],adjacent_bonds[i]["_chem_comp_bond.type"].trim().toLowerCase()]);
            }
        }
        return adjacent_children;
    }

    function GetFuncGroups(name1,name2,bonds) {
        function getAdj(thisBond){
            return ((thisBond["_chem_comp_bond.atom_id_1"]===name1 && thisBond["_chem_comp_bond.atom_id_2"]!==name2) || (thisBond["_chem_comp_bond.atom_id_2"]===name1 && thisBond["_chem_comp_bond.atom_id_1"]!==name2));
        }
        let adjacent_bonds = bonds.filter(getAdj);
        let adjacent_children = [];
        for(let i=0;i<adjacent_bonds.length;i++){
            if(adjacent_bonds[i]["_chem_comp_bond.atom_id_1"]===name1){
                adjacent_children.push(adjacent_bonds[i]["_chem_comp_bond.atom_id_2"]);
            } else {
                adjacent_children.push(adjacent_bonds[i]["_chem_comp_bond.atom_id_1"]);
            }
        }
        return adjacent_children;
    }

    function assignResidueBonding(resatoms){
        let resname = resatoms[0].residue.getName();
        if(resname in enerLib.monLibBonds){
            function bondAtomsInAtoms(thisBond){
                let name1 = thisBond["_chem_comp_bond.atom_id_1"].trim();
                let name2 = thisBond["_chem_comp_bond.atom_id_2"].trim();
                let at1 = null;
                let at2 = null;
                for(let iat=0;iat<resatoms.length;iat++){
                    if(resatoms[iat]["_atom_site.label_atom_id"].trim()===name1){
                        at1 = resatoms[iat];
                    }else if(resatoms[iat]["_atom_site.label_atom_id"].trim()===name2){
                        at2 = resatoms[iat];
                    }
                }
                if(at1&&at2){
                    return true;
                }
                return false;
            }
            let bonds = enerLib.monLibBonds[resname].filter(bondAtomsInAtoms);
            let all_ring_centres = [];

            for(let ib=0;ib<bonds.length;ib++){
                let name1 = bonds[ib]["_chem_comp_bond.atom_id_1"].trim();
                let name2 = bonds[ib]["_chem_comp_bond.atom_id_2"].trim();
                let type = bonds[ib]["_chem_comp_bond.type"].trim().toLowerCase();
                if(type!=="metal"){
                    let at1 = null;
                    let at2 = null;
                    let iat1 = -1;
                    let iat2 = -1;
                    for(let iat=0;iat<resatoms.length;iat++){
                        if(resatoms[iat]["_atom_site.label_atom_id"].trim()===name1){
                            at1 = resatoms[iat];
                            iat1 = iat;
                        }else if(resatoms[iat]["_atom_site.label_atom_id"].trim()===name2){
                            at2 = resatoms[iat];
                            iat2 = iat;
                        }
                    }
                    if(at1&&at2){
                        if(type==="triple"){
                            //console.log("triple");
                            //console.log(name1+" "+name2);
                            let thisFuncGroups = GetFuncGroups(name1,name2,bonds);
                            let otherFuncGroups = GetFuncGroups(name2,name1,bonds);
                            let adjFuncGroups = [];
                            let planeAtoms = [];
                            //console.log("thisFuncGroups");
                            //console.log(thisFuncGroups);
                            //console.log("otherFuncGroups");
                            //console.log(otherFuncGroups);
                            if(thisFuncGroups.length>0&&otherFuncGroups.length>0){
                                if(iat1>iat2){
                                    //console.log("Look for(adj) func groups on: "+name1+" "+thisFuncGroups[0]);
                                    adjFuncGroups = GetFuncGroups(thisFuncGroups[0],name1,bonds);
                                    planeAtoms.push(name1);
                                    planeAtoms.push(thisFuncGroups[0]);
                                } else {
                                    adjFuncGroups = GetFuncGroups(otherFuncGroups[0],name2,bonds);
                                    //console.log("Look for(adj) func groups on: "+name2+" "+otherFuncGroups[0]);
                                    planeAtoms.push(name2);
                                    planeAtoms.push(otherFuncGroups[0]);
                                }
                                //console.log("adjFuncGroups (case 1)");
                                //console.log(adjFuncGroups);
                            } else if(thisFuncGroups.length>0){
                                adjFuncGroups = GetFuncGroups(thisFuncGroups[0],name1,bonds);
                                planeAtoms.push(name1);
                                planeAtoms.push(thisFuncGroups[0]);
                            } else if(otherFuncGroups.length>0){
                                adjFuncGroups = GetFuncGroups(otherFuncGroups[0],name2,bonds);
                                planeAtoms.push(name2);
                                planeAtoms.push(otherFuncGroups[0]);
                            }
                            for(let iadj=0;iadj<adjFuncGroups.length;iadj++){
                                planeAtoms.push(adjFuncGroups[iadj]);
                            }
                            //console.log("planeAtoms");
                            //console.log(planeAtoms);

                            let atmp = vec3Create();
                            let carts0 = vec3Create([at1.x(),at1.y(),at1.z()]);
                            let carts1 = vec3Create([at2.x(),at2.y(),at2.z()]);
                            let l = vec3Create();
                            vec3Subtract(carts0,carts1,l);
                            NormalizeVec3(l);

                            if(planeAtoms.length>2){
                                let l1 = vec3Create();
                                let l2 = vec3Create();
                                let planeAtom0at = at1.residue.getAtomTrimmed(planeAtoms[0]);
                                let planeAtom0cart = vec3Create([planeAtom0at.x(),planeAtom0at.y(),planeAtom0at.z()]);
                                let planeAtom1at = at1.residue.getAtomTrimmed(planeAtoms[1]);
                                let planeAtom1cart = vec3Create([planeAtom1at.x(),planeAtom1at.y(),planeAtom1at.z()]);
                                let planeAtom2at = at1.residue.getAtomTrimmed(planeAtoms[2]);
                                let planeAtom2cart = vec3Create([planeAtom2at.x(),planeAtom2at.y(),planeAtom2at.z()]);
                                vec3Subtract(planeAtom1cart,planeAtom0cart,l1);
                                vec3Subtract(planeAtom2cart,planeAtom1cart,l2);
                                NormalizeVec3(l1);
                                NormalizeVec3(l2);
                                let cross1 = vec3Create();
                                vec3Cross(l1,l2,cross1);
                                NormalizeVec3(cross1);
                                vec3Cross(cross1,l,atmp);
                            } else {
                                vec3Cross(l,zaxis,atmp);
                                if(vec3.length(atmp) < 0.000001){
                                    vec3Cross(l,yaxis,atmp);
                                    if(vec3.length(atmp) < 0.000001){
                                        vec3Cross(l,xaxis,atmp);
                                    }
                                }
                            }

                            if(vec3.length(atmp) > 0.000001){
                                NormalizeVec3(atmp);
                                atmp[0] *= tbOffset;
                                atmp[1] *= tbOffset;
                                atmp[2] *= tbOffset;

                                let acontact = [];
                                let thisLength = Model.prototype.bondLength(at1,at2);
                                let newAt1 = new Atom(at1);
                                newAt1["_atom_site.Cartn_x"] = at1.x()+atmp[0];
                                newAt1["_atom_site.Cartn_y"] = at1.y()+atmp[1];
                                newAt1["_atom_site.Cartn_z"] = at1.z()+atmp[2];
                                newAt1["_atom_site.id"] = at1["_atom_site.id"];
                                let newAt2 = new Atom(at2);
                                newAt2["_atom_site.Cartn_x"] = at2.x()+atmp[0];
                                newAt2["_atom_site.Cartn_y"] = at2.y()+atmp[1];
                                newAt2["_atom_site.Cartn_z"] = at2.z()+atmp[2];
                                newAt2["_atom_site.id"] = at2["_atom_site.id"];
                                acontact.push(thisLength);
                                acontact.push(newAt1);
                                acontact.push(newAt2);
                                tripleContacts.push(acontact);

                                let acontact2 = [];
                                let newAt3 = new Atom(at1);
                                newAt3["_atom_site.Cartn_x"] = at1.x()-atmp[0];
                                newAt3["_atom_site.Cartn_y"] = at1.y()-atmp[1];
                                newAt3["_atom_site.Cartn_z"] = at1.z()-atmp[2];
                                newAt3["_atom_site.id"] = at1["_atom_site.id"];
                                let newAt4 = new Atom(at2);
                                newAt4["_atom_site.Cartn_x"] = at2.x()-atmp[0];
                                newAt4["_atom_site.Cartn_y"] = at2.y()-atmp[1];
                                newAt4["_atom_site.Cartn_z"] = at2.z()-atmp[2];
                                newAt4["_atom_site.id"] = at2["_atom_site.id"];
                                acontact2.push(thisLength);
                                acontact2.push(newAt3);
                                acontact2.push(newAt4);
                                tripleContacts.push(acontact2);

                                let acontact3 = [];
                                acontact3.push(thisLength);
                                acontact3.push(at1);
                                acontact3.push(at2);
                                tripleContacts.push(acontact3);
                            }



                        } else if(type==="double"||type==="aromatic"||type==="deloc"||type==="aromat"){
                            function GetDistanceByName(n1,n2){
                                let n1at = at1.residue.getAtomTrimmed(n1);
                                if(!n1at) return 1000.0;
                                let n1cart = vec3Create([n1at.x(),n1at.y(),n1at.z()]);
                                let n2at = at1.residue.getAtomTrimmed(n2);
                                if(!n2at) return 1000.0;
                                let n2cart = vec3Create([n2at.x(),n2at.y(),n2at.z()]);
                                let diff = vec3Create();
                                vec3Subtract(n1cart,n2cart,diff);
                                return vec3.length(diff);
                            }
                            function checkPlanar(planarAtoms){
                                // blah, blah, check normals.
                                if(planarAtoms.length===5) return true; // Really ?!! 8/01/2017 !!
                                let nprev = null;
                                for(let ip=0;ip<planarAtoms.length-2;ip++){
                                    let n1at = at1.residue.getAtomTrimmed(planarAtoms[ip]);
                                    let n2at = at1.residue.getAtomTrimmed(planarAtoms[ip+1]);
                                    let n3at = at1.residue.getAtomTrimmed(planarAtoms[ip+2]);
                                    let b1 = vec3Create([n2at.x()-n1at.x(),n2at.y()-n1at.y(),n2at.z()-n1at.z()]);
                                    let b2 = vec3Create([n3at.x()-n2at.x(),n3at.y()-n2at.y(),n3at.z()-n2at.z()]);
                                    NormalizeVec3(b1);
                                    NormalizeVec3(b2);
                                    let n = vec3Create();
                                    vec3Cross(b1,b2,n);
                                    if(nprev){
                                        if(vec3.dot(n,nprev)<0.62) return false;
                                    }
                                    nprev = n;
                                }
                                return true;
                            }
                            function CheckRing(theName1,theName2,theBonds) {
                                let thisFuncGroups = GetFuncGroups(theName1,theName2,theBonds);
                                let otherFuncGroups = GetFuncGroups(theName2,theName1,theBonds);
                                let rings = [];

                                //console.log(thisFuncGroups);
                                //console.log(otherFuncGroups);

                                //console.log("other: "+theName2);
                                //console.log("start: "+theName1);
                                for(let it=0;it<thisFuncGroups.length;it++){
                                    let adjFuncGroups = GetFuncGroups(thisFuncGroups[it],theName1,bonds);
                                    //console.log("    neighb0: "+thisFuncGroups[it]);
                                    for(let nb1=0;nb1<adjFuncGroups.length;nb1++){
                                        if(GetDistanceByName(theName1,adjFuncGroups[nb1])<2.6){
                                            //console.log("        neighb1: "+adjFuncGroups[nb1]);
                                            //console.log("        "+adjFuncGroups[nb1]+" "+GetDistanceByName(theName1,adjFuncGroups[nb1]));
                                            let adjFuncGroups2 = GetFuncGroups(adjFuncGroups[nb1],thisFuncGroups[it],bonds);
                                            for(let nb2=0;nb2<adjFuncGroups2.length;nb2++){
                                                if(GetDistanceByName(theName1,adjFuncGroups2[nb2])<3.0){
                                                    //console.log("            neighb2: "+adjFuncGroups2[nb2]);
                                                    //console.log("            "+adjFuncGroups2[nb2]+" "+GetDistanceByName(theName1,adjFuncGroups2[nb2]));
                                                    let adjFuncGroups3 = GetFuncGroups(adjFuncGroups2[nb2],adjFuncGroups[nb1],bonds);
                                                    for(let nb3=0;nb3<adjFuncGroups3.length;nb3++){
                                                        if(GetDistanceByName(theName1,adjFuncGroups3[nb3])<2.6){
                                                            //console.log("                neighb3: "+adjFuncGroups3[nb3]);
                                                            //console.log("                "+adjFuncGroups3[nb3]+" "+GetDistanceByName(theName1,adjFuncGroups3[nb3]));
                                                            if(adjFuncGroups3[nb3]===theName2){
                                                                // 5-membered ring.
                                                                //console.log("                5-membered ring");
                                                                //console.log("                "+theName1+" "+thisFuncGroups[it]+" "+adjFuncGroups[nb1]+" "+adjFuncGroups2[nb2]+" "+theName2);
                                                                if(checkPlanar([theName1,thisFuncGroups[it],adjFuncGroups[nb1],adjFuncGroups2[nb2],adjFuncGroups3[nb3]])){
                                                                    rings.push([theName1,thisFuncGroups[it],adjFuncGroups[nb1],adjFuncGroups2[nb2],adjFuncGroups3[nb3]]);
                                                                }
                                                            } else {
                                                                let adjFuncGroups4 = GetFuncGroups(adjFuncGroups3[nb3],adjFuncGroups2[nb2],bonds);
                                                                for(let nb4=0;nb4<adjFuncGroups4.length;nb4++){
                                                                    if(adjFuncGroups4[nb4]===theName2&&checkPlanar([theName1,thisFuncGroups[it],adjFuncGroups[nb1],adjFuncGroups2[nb2],adjFuncGroups3[nb3],theName2])){
                                                                        //console.log("                    6-membered ring");
                                                                        //console.log("                    "+theName1+" "+thisFuncGroups[it]+" "+adjFuncGroups[nb1]+" "+adjFuncGroups2[nb2]+" "+adjFuncGroups3[nb3]+" "+theName2);
                                                                        rings.push([theName1,thisFuncGroups[it],adjFuncGroups[nb1],adjFuncGroups2[nb2],adjFuncGroups3[nb3],theName2]);
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                return rings;
                            }
                            let skipBond = false;
                            let rings = CheckRing(name1,name2,bonds);
                            if(rings.length>0&&rings[0].length>4){
                                for(let ir=0;ir<rings.length;ir++){
                                    let ring_centre = vec3Create([0.0, 0.0, 0.0]);
                                    for(let ir2=0;ir2<rings[ir].length;ir2++){
                                        let n1at = at1.residue.getAtomTrimmed(rings[ir][ir2]);
                                        ring_centre[0] += n1at.x();
                                        ring_centre[1] += n1at.y();
                                        ring_centre[2] += n1at.z();
                                    }
                                    ring_centre[0] /= rings[ir].length;
                                    ring_centre[1] /= rings[ir].length;
                                    ring_centre[2] /= rings[ir].length;
                                    let doneThisRing = false;
                                    for(let iar=0;iar<all_ring_centres.length;iar++){
                                        let diff = vec3Create();
                                        vec3Subtract(ring_centre,all_ring_centres[iar],diff);
                                        let dist = vec3.length(diff);
                                        if(dist<1e-4){
                                            doneThisRing = true;
                                        }
                                    }
                                    // We now have to do the "single bond" around edge of ring.

                                    let acontact = [];
                                    let thisLength = Model.prototype.bondLength(at1,at2);
                                    acontact.push(thisLength);
                                    acontact.push(at1);
                                    acontact.push(at2);
                                    singleContacts.push(acontact);
                                    
                                    if(!doneThisRing){
                                        all_ring_centres.push(ring_centre);
                                        //console.log("DRAW RING: "+name1+" "+name2);
                                        let drawRing = [];
                                        let drawAt = [];
                                        let ringNorm = vec3Create([0.0,0.0,0.0]);
                                        let nn = 0;
                                        for(let ir2=0;ir2<rings[ir].length;ir2++){
                                            let atDraw = at1.residue.getAtomTrimmed(rings[ir][ir2]);
                                            let cartDraw = vec3Create([atDraw.x(),atDraw.y(),atDraw.z()]);
                                            drawRing.push(cartDraw);
                                            drawAt.push(atDraw);
                                            if(ir2>1){
                                                let d1 = vec3Create();
                                                let d2 = vec3Create();
                                                vec3Subtract(drawRing[drawRing.length-1],drawRing[drawRing.length-2],d1);
                                                vec3Subtract(drawRing[drawRing.length-2],drawRing[drawRing.length-3],d2);
                                                //console.log(d1);
                                                //console.log(d2);
                                                let ncross = vec3Create();
                                                vec3Cross(d1,d2,ncross);
                                                //console.log(ncross);
                                                //console.log();
                                                vec3Add(ringNorm,ncross,ringNorm);
                                                nn += 1;
                                            }
                                        }
                                        NormalizeVec3(ringNorm);
                                        drawRings.push([drawAt,drawRing,ring_centre,ringNorm]);
                                    }
                                }
                            } else {
                                let thisFuncGroups = GetFuncGroups(name1,name2,bonds);
                                let otherFuncGroups = GetFuncGroups(name2,name1,bonds);
                                if(thisFuncGroups.length===3||otherFuncGroups.length===3){
                                    console.log("DRAW DOUBLE CASE 1: "+name1+" "+name2);

                                    let planeCarts = [];
                                    let doublePlaneCarts = [];
                                    let singlePlaneCarts = [];
                                    let nDouble = 0;

                                    let conn_lists = [];
                                    if(thisFuncGroups.length===3){
                                        conn_lists = GetFuncGroupBonds(name1,name2,bonds);
                                    } else {
                                        conn_lists = GetFuncGroupBonds(name2,name1,bonds);
                                    }
                                    for(let k=0;k<conn_lists.length;k++){
                                        let planeAtom0at = at1.residue.getAtomTrimmed(conn_lists[k][0]);
                                        let planeAtom0cart = vec3Create([planeAtom0at.x(),planeAtom0at.y(),planeAtom0at.z()]);
                                        if(conn_lists[k][1]==="double"||conn_lists[k][1]==="deloc"||conn_lists[k][1]==="aromatic"||conn_lists[k][1]==="aromat"){
                                            doublePlaneCarts.push(planeAtom0cart);
                                            nDouble++;
                                        } else {
                                            singlePlaneCarts.push(planeAtom0cart);
                                        }
                                    }
                                    if(nDouble===0||nDouble===1){

                                        let mc = vec3Create();
                                        vec3Subtract(singlePlaneCarts[0],singlePlaneCarts[1],mc);
                                        NormalizeVec3(mc);
                                        mc[0] *= dbOffset; mc[1] *= dbOffset; mc[2] *= dbOffset;

                                        let acontact2 = [];
                                        let thisLength = Model.prototype.bondLength(at1,at2);
                                        let newAt3 = new Atom(at1);
                                        newAt3["_atom_site.Cartn_x"] = at1.x()+mc[0];
                                        newAt3["_atom_site.Cartn_y"] = at1.y()+mc[1];
                                        newAt3["_atom_site.Cartn_z"] = at1.z()+mc[2];
                                        newAt3["_atom_site.id"] = at1["_atom_site.id"];
                                        let newAt4 = new Atom(at2);
                                        newAt4["_atom_site.Cartn_x"] = at2.x()+mc[0];
                                        newAt4["_atom_site.Cartn_y"] = at2.y()+mc[1];
                                        newAt4["_atom_site.Cartn_z"] = at2.z()+mc[2];
                                        newAt4["_atom_site.id"] = at2["_atom_site.id"];
                                        acontact2.push(thisLength);
                                        acontact2.push(newAt3);
                                        acontact2.push(newAt4);
                                        contacts.push(acontact2);

                                        let acontact = [];
                                        let thisLength2 = Model.prototype.bondLength(at1,at2);
                                        let newAt1 = new Atom(at1);
                                        newAt1["_atom_site.Cartn_x"] = at1.x()-mc[0];
                                        newAt1["_atom_site.Cartn_y"] = at1.y()-mc[1];
                                        newAt1["_atom_site.Cartn_z"] = at1.z()-mc[2];
                                        newAt1["_atom_site.id"] = at1["_atom_site.id"];
                                        let newAt2 = new Atom(at2);
                                        newAt2["_atom_site.Cartn_x"] = at2.x()-mc[0];
                                        newAt2["_atom_site.Cartn_y"] = at2.y()-mc[1];
                                        newAt2["_atom_site.Cartn_z"] = at2.z()-mc[2];
                                        newAt2["_atom_site.id"] = at2["_atom_site.id"];
                                        acontact.push(thisLength2);
                                        acontact.push(newAt1);
                                        acontact.push(newAt2);
                                        if(type==="double"){
                                            contacts.push(acontact);
                                        } else {
                                            dashedContacts.push(acontact);
                                        }
                                    }
                                    if(nDouble===2){
                                        // FIXME - There should be length adjustments.
                                        let cross1 = vec3Create();
                                        let cross2 = vec3Create()
                                        let carts0 = vec3Create([at1.x(),at1.y(),at1.z()]);
                                        let carts1 = vec3Create([at2.x(),at2.y(),at2.z()]);
                                        if(thisFuncGroups.length===3){
                                            vec3Subtract(singlePlaneCarts[0],carts0,cross1);
                                            vec3Subtract(carts1,carts0,cross2);
                                        } else {
                                            vec3Subtract(singlePlaneCarts[0],carts1,cross1);
                                            vec3Subtract(carts0,carts1,cross2);
                                        }
                                        NormalizeVec3(cross1);
                                        NormalizeVec3(cross2);
                                        let mc = vec3Create();
                                        vec3Cross(cross1,cross2,mc);
                                        NormalizeVec3(mc);
                                        mc[0] *= dbOffset; mc[1] *= dbOffset; mc[2] *= dbOffset;

                                        let acontact2 = [];
                                        let thisLength = Model.prototype.bondLength(at1,at2);
                                        let newAt3 = new Atom(at1);
                                        newAt3["_atom_site.Cartn_x"] = at1.x()+mc[0];
                                        newAt3["_atom_site.Cartn_y"] = at1.y()+mc[1];
                                        newAt3["_atom_site.Cartn_z"] = at1.z()+mc[2];
                                        newAt3["_atom_site.id"] = at1["_atom_site.id"];
                                        let newAt4 = new Atom(at2);
                                        newAt4["_atom_site.Cartn_x"] = at2.x()+mc[0];
                                        newAt4["_atom_site.Cartn_y"] = at2.y()+mc[1];
                                        newAt4["_atom_site.Cartn_z"] = at2.z()+mc[2];
                                        newAt4["_atom_site.id"] = at2["_atom_site.id"];
                                        acontact2.push(thisLength);
                                        acontact2.push(newAt3);
                                        acontact2.push(newAt4);
                                        contacts.push(acontact2);

                                        let acontact = [];
                                        let thisLength2 = Model.prototype.bondLength(at1,at2);
                                        let newAt1 = new Atom(at1);
                                        newAt1["_atom_site.Cartn_x"] = at1.x()-mc[0];
                                        newAt1["_atom_site.Cartn_y"] = at1.y()-mc[1];
                                        newAt1["_atom_site.Cartn_z"] = at1.z()-mc[2];
                                        newAt1["_atom_site.id"] = at1["_atom_site.id"];
                                        let newAt2 = new Atom(at2);
                                        newAt2["_atom_site.Cartn_x"] = at2.x()-mc[0];
                                        newAt2["_atom_site.Cartn_y"] = at2.y()-mc[1];
                                        newAt2["_atom_site.Cartn_z"] = at2.z()-mc[2];
                                        newAt2["_atom_site.id"] = at2["_atom_site.id"];
                                        acontact.push(thisLength2);
                                        acontact.push(newAt1);
                                        acontact.push(newAt2);
                                        if(type==="double"){
                                            contacts.push(acontact);
                                        } else {
                                            dashedContacts.push(acontact);
                                        }
                                    }

                                    if(nDouble===3){
                                        // FIXME - There should be length adjustments.
                                        let carts0 = vec3Create([at1.x(),at1.y(),at1.z()]);
                                        let carts1 = vec3Create([at2.x(),at2.y(),at2.z()]);
                                        let cross1 = vec3Create();
                                        let cross2 = vec3Create();
                                        if(thisFuncGroups.length===3){
                                            // FIXME if(j<2), ??!! see build_tree_primitives.
                                            vec3Subtract(doublePlaneCarts[1],doublePlaneCarts[2],cross1);
                                            vec3Subtract(carts1,carts0,cross2);
                                        } else {
                                            // FIXME if(i<conn_lists[conn_lists[i][j]][2]), ??!! see build_tree_primitives.
                                            vec3Subtract(doublePlaneCarts[1],doublePlaneCarts[2],cross1);
                                            vec3Subtract(carts0,carts1,cross2);
                                        }

                                        NormalizeVec3(cross1);
                                        NormalizeVec3(cross2);
                                        let mc = vec3Create();
                                        vec3Cross(cross1,cross2,mc);
                                        NormalizeVec3(mc);
                                        mc[0] *= dbOffset; mc[1] *= dbOffset; mc[2] *= dbOffset;
                                        
                                        let acontact2 = [];
                                        let thisLength = Model.prototype.bondLength(at1,at2);
                                        let newAt3 = new Atom(at1);
                                        newAt3["_atom_site.Cartn_x"] = at1.x()+mc[0];
                                        newAt3["_atom_site.Cartn_y"] = at1.y()+mc[1];
                                        newAt3["_atom_site.Cartn_z"] = at1.z()+mc[2];
                                        newAt3["_atom_site.id"] = at1["_atom_site.id"];
                                        let newAt4 = new Atom(at2);
                                        newAt4["_atom_site.Cartn_x"] = at2.x()+mc[0];
                                        newAt4["_atom_site.Cartn_y"] = at2.y()+mc[1];
                                        newAt4["_atom_site.Cartn_z"] = at2.z()+mc[2];
                                        newAt4["_atom_site.id"] = at2["_atom_site.id"];
                                        acontact2.push(thisLength);
                                        acontact2.push(newAt3);
                                        acontact2.push(newAt4);
                                        contacts.push(acontact2);

                                        let acontact = [];
                                        let thisLength2 = Model.prototype.bondLength(at1,at2);
                                        let newAt1 = new Atom(at1);
                                        newAt1["_atom_site.Cartn_x"] = at1.x()-mc[0];
                                        newAt1["_atom_site.Cartn_y"] = at1.y()-mc[1];
                                        newAt1["_atom_site.Cartn_z"] = at1.z()-mc[2];
                                        newAt1["_atom_site.id"] = at1["_atom_site.id"];
                                        let newAt2 = new Atom(at2);
                                        newAt2["_atom_site.Cartn_x"] = at2.x()-mc[0];
                                        newAt2["_atom_site.Cartn_y"] = at2.y()-mc[1];
                                        newAt2["_atom_site.Cartn_z"] = at2.z()-mc[2];
                                        newAt2["_atom_site.id"] = at2["_atom_site.id"];
                                        acontact.push(thisLength2);
                                        acontact.push(newAt1);
                                        acontact.push(newAt2);
                                        if(type==="double"){
                                            contacts.push(acontact);
                                        } else {
                                            dashedContacts.push(acontact);
                                        }
                                    }
                                }
                                if(thisFuncGroups.length===2&&(otherFuncGroups.length<2||(otherFuncGroups.length===2&&(iat1<iat2)))){
                                    console.log("DRAW DOUBLE CASE 2: "+name1+" "+name2);
                                    // FIXME - "other double" adjustments

                                    let mc = vec3Create();
                                    let thisAt0 = at1.residue.getAtomTrimmed(thisFuncGroups[0]);
                                    let cart0 = vec3Create([thisAt0.x(),thisAt0.y(),thisAt0.z()]);
                                    let thisAt1 = at1.residue.getAtomTrimmed(thisFuncGroups[1]);
                                    let cart1 = vec3Create([thisAt1.x(),thisAt1.y(),thisAt1.z()]);
                                    vec3Subtract(cart0,cart1,mc);
                                    NormalizeVec3(mc);
                                    mc[0] *= dbOffset; mc[1] *= dbOffset; mc[2] *= dbOffset;

                                    let acontact2 = [];
                                    let thisLength = Model.prototype.bondLength(at1,at2);
                                    let newAt3 = new Atom(at1);
                                    newAt3["_atom_site.Cartn_x"] = at1.x()+mc[0];
                                    newAt3["_atom_site.Cartn_y"] = at1.y()+mc[1];
                                    newAt3["_atom_site.Cartn_z"] = at1.z()+mc[2];
                                    newAt3["_atom_site.id"] = at1["_atom_site.id"];
                                    let newAt4 = new Atom(at2);
                                    newAt4["_atom_site.Cartn_x"] = at2.x()+mc[0];
                                    newAt4["_atom_site.Cartn_y"] = at2.y()+mc[1];
                                    newAt4["_atom_site.Cartn_z"] = at2.z()+mc[2];
                                    newAt4["_atom_site.id"] = at2["_atom_site.id"];
                                    acontact2.push(thisLength);
                                    acontact2.push(newAt3);
                                    acontact2.push(newAt4);
                                    contacts.push(acontact2);

                                    let acontact = [];
                                    let thisLength2 = Model.prototype.bondLength(at1,at2);
                                    let newAt1 = new Atom(at1);
                                    newAt1["_atom_site.Cartn_x"] = at1.x()-mc[0];
                                    newAt1["_atom_site.Cartn_y"] = at1.y()-mc[1];
                                    newAt1["_atom_site.Cartn_z"] = at1.z()-mc[2];
                                    newAt1["_atom_site.id"] = at1["_atom_site.id"];
                                    let newAt2 = new Atom(at2);
                                    newAt2["_atom_site.Cartn_x"] = at2.x()-mc[0];
                                    newAt2["_atom_site.Cartn_y"] = at2.y()-mc[1];
                                    newAt2["_atom_site.Cartn_z"] = at2.z()-mc[2];
                                    newAt2["_atom_site.id"] = at2["_atom_site.id"];
                                    acontact.push(thisLength2);
                                    acontact.push(newAt1);
                                    acontact.push(newAt2);
                                    if(type==="double"){
                                        contacts.push(acontact);
                                    } else {
                                        dashedContacts.push(acontact);
                                    }
                                }
                                if((thisFuncGroups.length<2||(thisFuncGroups.length===2&&(iat1>iat2)))&&otherFuncGroups.length===2){
                                    console.log("DRAW DOUBLE CASE 3: "+name1+" "+name2);
                                    // FIXME - "other double" adjustments

                                    //console.log(thisFuncGroups);
                                    //console.log(otherFuncGroups);

                                    let mc = vec3Create();
                                    let otherAt0 = at1.residue.getAtomTrimmed(otherFuncGroups[0]);
                                    let cart0 = vec3Create([otherAt0.x(),otherAt0.y(),otherAt0.z()]);
                                    let otherAt1 = at1.residue.getAtomTrimmed(otherFuncGroups[1]);
                                    let cart1 = vec3Create([otherAt1.x(),otherAt1.y(),otherAt1.z()]);
                                    vec3Subtract(cart0,cart1,mc);
                                    NormalizeVec3(mc);
                                    mc[0] *= dbOffset; mc[1] *= dbOffset; mc[2] *= dbOffset;

                                    let acontact2 = [];
                                    let thisLength = Model.prototype.bondLength(at1,at2);
                                    let newAt3 = new Atom(at1);
                                    newAt3["_atom_site.Cartn_x"] = at1.x()+mc[0];
                                    newAt3["_atom_site.Cartn_y"] = at1.y()+mc[1];
                                    newAt3["_atom_site.Cartn_z"] = at1.z()+mc[2];
                                    newAt3["_atom_site.id"] = at1["_atom_site.id"];
                                    let newAt4 = new Atom(at2);
                                    newAt4["_atom_site.Cartn_x"] = at2.x()+mc[0];
                                    newAt4["_atom_site.Cartn_y"] = at2.y()+mc[1];
                                    newAt4["_atom_site.Cartn_z"] = at2.z()+mc[2];
                                    newAt4["_atom_site.id"] = at2["_atom_site.id"];
                                    acontact2.push(thisLength);
                                    acontact2.push(newAt3);
                                    acontact2.push(newAt4);
                                    contacts.push(acontact2);

                                    let acontact = [];
                                    let thisLength2 = Model.prototype.bondLength(at1,at2);
                                    let newAt1 = new Atom(at1);
                                    newAt1["_atom_site.Cartn_x"] = at1.x()-mc[0];
                                    newAt1["_atom_site.Cartn_y"] = at1.y()-mc[1];
                                    newAt1["_atom_site.Cartn_z"] = at1.z()-mc[2];
                                    newAt1["_atom_site.id"] = at1["_atom_site.id"];
                                    let newAt2 = new Atom(at2);
                                    newAt2["_atom_site.Cartn_x"] = at2.x()-mc[0];
                                    newAt2["_atom_site.Cartn_y"] = at2.y()-mc[1];
                                    newAt2["_atom_site.Cartn_z"] = at2.z()-mc[2];
                                    newAt2["_atom_site.id"] = at2["_atom_site.id"];
                                    acontact.push(thisLength2);
                                    acontact.push(newAt1);
                                    acontact.push(newAt2);
                                    if(type==="double"){
                                        contacts.push(acontact);
                                    } else {
                                        dashedContacts.push(acontact);
                                    }
                                }
                                if(thisFuncGroups.length===1&&otherFuncGroups.length===1){
                                    let otherAt0 = at1.residue.getAtomTrimmed(otherFuncGroups[0]);
                                    let thisAt0 = at1.residue.getAtomTrimmed(thisFuncGroups[0]);
                                    if(!otherAt0){
                                    }
                                    let c1 = vec3Create([otherAt0.x(),otherAt0.y(),otherAt0.z()]);
                                    let c2 = vec3Create([at1.x(),at1.y(),at1.z()]);
                                    let c3 = vec3Create([at2.x(),at2.y(),at2.z()]);
                                    let c4 = vec3Create([thisAt0.x(),thisAt0.y(),thisAt0.z()]);
                                    if(Math.abs(DihedralAngle(c1,c2,c3,c4))>Math.PI/2.0){
                                        // TRANS
                                        let c4c1 = vec3Create();
                                        let c2c3 = vec3Create();
                                        vec3Subtract(c4,c1,c4c1);
                                        vec3Subtract(c2,c3,c2c3);
                                        let cross1 = vec3Create();
                                        vec3Cross(c4c1,c2c3,cross1);
                                        NormalizeVec3(cross1);
                                        let mc = vec3Create();
                                        NormalizeVec3(c2c3);
                                        vec3Cross(cross1,c2c3,mc);
                                        NormalizeVec3(mc);
                                        mc[0] *= dbOffset; mc[1] *= dbOffset; mc[2] *= dbOffset;
                                        let acontact2 = [];
                                        let thisLength = Model.prototype.bondLength(at1,at2);
                                        let newAt3 = new Atom(at1);
                                        newAt3["_atom_site.Cartn_x"] = at1.x()+mc[0];
                                        newAt3["_atom_site.Cartn_y"] = at1.y()+mc[1];
                                        newAt3["_atom_site.Cartn_z"] = at1.z()+mc[2];
                                        newAt3["_atom_site.id"] = at1["_atom_site.id"];
                                        let newAt4 = new Atom(at2);
                                        newAt4["_atom_site.Cartn_x"] = at2.x()+mc[0];
                                        newAt4["_atom_site.Cartn_y"] = at2.y()+mc[1];
                                        newAt4["_atom_site.Cartn_z"] = at2.z()+mc[2];
                                        newAt4["_atom_site.id"] = at2["_atom_site.id"];
                                        acontact2.push(thisLength);
                                        acontact2.push(newAt3);
                                        acontact2.push(newAt4);
                                        contacts.push(acontact2);

                                        let acontact = [];
                                        let thisLength2 = Model.prototype.bondLength(at1,at2);
                                        let newAt1 = new Atom(at1);
                                        newAt1["_atom_site.Cartn_x"] = at1.x()-mc[0];
                                        newAt1["_atom_site.Cartn_y"] = at1.y()-mc[1];
                                        newAt1["_atom_site.Cartn_z"] = at1.z()-mc[2];
                                        newAt1["_atom_site.id"] = at1["_atom_site.id"];
                                        let newAt2 = new Atom(at2);
                                        newAt2["_atom_site.Cartn_x"] = at2.x()-mc[0];
                                        newAt2["_atom_site.Cartn_y"] = at2.y()-mc[1];
                                        newAt2["_atom_site.Cartn_z"] = at2.z()-mc[2];
                                        newAt2["_atom_site.id"] = at2["_atom_site.id"];
                                        acontact.push(thisLength2);
                                        acontact.push(newAt1);
                                        acontact.push(newAt2);
                                        if(type==="double"){
                                            contacts.push(acontact);
                                        } else {
                                            dashedContacts.push(acontact);
                                        }
                                    } else {
                                        // CIS
                                        // FIXME - There should be length adjustments.
                                        let midpoint1 = vec3Create([.5*(c4[0]+c1[0]),.5*(c4[1]+c1[1]),.5*(c4[2]+c1[2])]);
                                        let midpoint2 = vec3Create([.5*(c2[0]+c3[0]),.5*(c2[1]+c3[1]),.5*(c2[2]+c3[2])]);
                                        let mc = vec3Create();
                                        vec3Subtract(midpoint1,midpoint2,mc);
                                        NormalizeVec3(mc);
                                        mc[0] *= dbOffset; mc[1] *= dbOffset; mc[2] *= dbOffset;
                                        let acontact2 = [];
                                        let thisLength = Model.prototype.bondLength(at1,at2);
                                        let newAt3 = new Atom(at1);
                                        newAt3["_atom_site.Cartn_x"] = at1.x()+2.0*mc[0];
                                        newAt3["_atom_site.Cartn_y"] = at1.y()+2.0*mc[1];
                                        newAt3["_atom_site.Cartn_z"] = at1.z()+2.0*mc[2];
                                        newAt3["_atom_site.id"] = at1["_atom_site.id"];
                                        let newAt4 = new Atom(at2);
                                        newAt4["_atom_site.Cartn_x"] = at2.x()+2.0*mc[0];
                                        newAt4["_atom_site.Cartn_y"] = at2.y()+2.0*mc[1];
                                        newAt4["_atom_site.Cartn_z"] = at2.z()+2.0*mc[2];
                                        newAt4["_atom_site.id"] = at2["_atom_site.id"];
                                        acontact2.push(thisLength);
                                        acontact2.push(newAt3);
                                        acontact2.push(newAt4);
                                        contacts.push(acontact2);

                                        let acontact = [];
                                        let thisLength2 = Model.prototype.bondLength(at1,at2);
                                        acontact.push(thisLength2);
                                        acontact.push(at1);
                                        acontact.push(at2);
                                        if(type==="double"){
                                            contacts.push(acontact);
                                        } else {
                                            dashedContacts.push(acontact);
                                        }
                                    }
                                }
                                if((thisFuncGroups.length===1&&otherFuncGroups.length===0)||(thisFuncGroups.length===0&&otherFuncGroups.length===1)){
                                    console.log("DRAW DOUBLE CASE 5: "+name1+" "+name2);
                                    let c2 = vec3Create([at1.x(),at1.y(),at1.z()]);
                                    let c3 = vec3Create([at2.x(),at2.y(),at2.z()]);
                                    let l = vec3Create();

                                    if((thisFuncGroups.length===1&&otherFuncGroups.length===0)){
                                        vec3Subtract(c2,c3,l);
                                    } else {
                                        vec3Subtract(c3,c2,l);
                                    }
                                    NormalizeVec3(l);

                                    let mc = vec3Create();
                                    vec3Cross(l,zaxis,mc);
                                    if(vec3.length(mc) < 0.000001){
                                        vec3Cross(l,yaxis,mc);
                                        if(vec3.length(mc) < 0.000001){
                                            vec3Cross(l,xaxis,mc);
                                        }
                                    }
                                    NormalizeVec3(mc);
                                    mc[0] *= dbOffset; mc[1] *= dbOffset; mc[2] *= dbOffset;
                                    let acontact2 = [];
                                    let thisLength = Model.prototype.bondLength(at1,at2);
                                    let newAt3 = new Atom(at1);
                                    newAt3["_atom_site.Cartn_x"] = at1.x()+mc[0];
                                    newAt3["_atom_site.Cartn_y"] = at1.y()+mc[1];
                                    newAt3["_atom_site.Cartn_z"] = at1.z()+mc[2];
                                    newAt3["_atom_site.id"] = at1["_atom_site.id"];
                                    let newAt4 = new Atom(at2);
                                    newAt4["_atom_site.Cartn_x"] = at2.x()+mc[0];
                                    newAt4["_atom_site.Cartn_y"] = at2.y()+mc[1];
                                    newAt4["_atom_site.Cartn_z"] = at2.z()+mc[2];
                                    newAt4["_atom_site.id"] = at2["_atom_site.id"];
                                    acontact2.push(thisLength);
                                    acontact2.push(newAt3);
                                    acontact2.push(newAt4);
                                    contacts.push(acontact2);

                                    let acontact = [];
                                    let thisLength2 = Model.prototype.bondLength(at1,at2);
                                    let newAt1 = new Atom(at1);
                                    newAt1["_atom_site.Cartn_x"] = at1.x()-mc[0];
                                    newAt1["_atom_site.Cartn_y"] = at1.y()-mc[1];
                                    newAt1["_atom_site.Cartn_z"] = at1.z()-mc[2];
                                    newAt1["_atom_site.id"] = at1["_atom_site.id"];
                                    let newAt2 = new Atom(at2);
                                    newAt2["_atom_site.Cartn_x"] = at2.x()-mc[0];
                                    newAt2["_atom_site.Cartn_y"] = at2.y()-mc[1];
                                    newAt2["_atom_site.Cartn_z"] = at2.z()-mc[2];
                                    newAt2["_atom_site.id"] = at2["_atom_site.id"];
                                    acontact.push(thisLength2);
                                    acontact.push(newAt1);
                                    acontact.push(newAt2);
                                    if(type==="double"){
                                        contacts.push(acontact);
                                    } else {
                                        dashedContacts.push(acontact);
                                    }
                                }
                                if((thisFuncGroups.length===0&&otherFuncGroups.length===0)) {
                                    console.log("DRAW DOUBLE CASE 6: "+name1+" "+name2);
                                    let c2 = vec3Create([at1.x(),at1.y(),at1.z()]);
                                    let c3 = vec3Create([at2.x(),at2.y(),at2.z()]);
                                    let l = vec3Create();

                                    vec3Subtract(c2,c3,l);
                                    NormalizeVec3(l);

                                    let mc = vec3Create();
                                    vec3Cross(l,zaxis,mc);
                                    if(vec3.length(mc) < 0.000001){
                                        vec3Cross(l,yaxis,mc);
                                        if(vec3.length(mc) < 0.000001){
                                            vec3Cross(l,xaxis,mc);
                                        }
                                    }
                                    NormalizeVec3(mc);
                                    mc[0] *= dbOffset; mc[1] *= dbOffset; mc[2] *= dbOffset;
                                    let acontact2 = [];
                                    let thisLength = Model.prototype.bondLength(at1,at2);
                                    let newAt3 = new Atom(at1);
                                    newAt3["_atom_site.Cartn_x"] = at1.x()+mc[0];
                                    newAt3["_atom_site.Cartn_y"] = at1.y()+mc[1];
                                    newAt3["_atom_site.Cartn_z"] = at1.z()+mc[2];
                                    newAt3["_atom_site.id"] = at1["_atom_site.id"];
                                    let newAt4 = new Atom(at2);
                                    newAt4["_atom_site.Cartn_x"] = at2.x()+mc[0];
                                    newAt4["_atom_site.Cartn_y"] = at2.y()+mc[1];
                                    newAt4["_atom_site.Cartn_z"] = at2.z()+mc[2];
                                    newAt4["_atom_site.id"] = at2["_atom_site.id"];
                                    acontact2.push(thisLength);
                                    acontact2.push(newAt3);
                                    acontact2.push(newAt4);
                                    contacts.push(acontact2);

                                    let acontact = [];
                                    let thisLength2 = Model.prototype.bondLength(at1,at2);
                                    let newAt1 = new Atom(at1);
                                    newAt1["_atom_site.Cartn_x"] = at1.x()-mc[0];
                                    newAt1["_atom_site.Cartn_y"] = at1.y()-mc[1];
                                    newAt1["_atom_site.Cartn_z"] = at1.z()-mc[2];
                                    newAt1["_atom_site.id"] = at1["_atom_site.id"];
                                    let newAt2 = new Atom(at2);
                                    newAt2["_atom_site.Cartn_x"] = at2.x()-mc[0];
                                    newAt2["_atom_site.Cartn_y"] = at2.y()-mc[1];
                                    newAt2["_atom_site.Cartn_z"] = at2.z()-mc[2];
                                    newAt2["_atom_site.id"] = at2["_atom_site.id"];
                                    acontact.push(thisLength2);
                                    acontact.push(newAt1);
                                    acontact.push(newAt2);
                                    if(type==="double"){
                                        contacts.push(acontact);
                                    } else {
                                        dashedContacts.push(acontact);
                                    }
                                }
                            }
                        } else {
                            let acontact = [];
                            let thisLength = Model.prototype.bondLength(at1,at2);
                            acontact.push(thisLength);
                            acontact.push(at1);
                            acontact.push(at2);
                            singleContacts.push(acontact);
                        }
                    }
                }
            }
        }
    }

    let ligandResidues = [];
    for(let iat=0;iat<atoms.length;iat++){
        if(atoms[iat].residue.getResidueID()!==thisResId||atoms[iat].getChainID()!==thisChainId){
            thisResId = atoms[iat].residue.getResidueID();
            thisChainId = atoms[iat].getChainID();
            if(thisResAtoms.length>0){
                assignResidueBonding(thisResAtoms);
                ligandResidues.push(thisResAtoms[0].residue);
            }
            thisResAtoms = [];
        }
        thisResAtoms.push(atoms[iat]);
    }

    if(thisResAtoms.length>0){
        assignResidueBonding(thisResAtoms);
        ligandResidues.push(thisResAtoms[0].residue);
    }

    let interResCylinders = {};
    if(ligandResidues.length>0){
        let all_lig_lig_contacts = [];
        let model = ligandResidues[0].chain.model;
        for(let ilig=0;ilig<ligandResidues.length;ilig++){
            for(let jlig=0;jlig<ilig;jlig++){
                let lig_lig_contacts = model.SeekContacts(ligandResidues[ilig].atoms,ligandResidues[jlig].atoms,0.6,1.8);
                console.log(lig_lig_contacts);
                 Array.prototype.push.apply(all_lig_lig_contacts,lig_lig_contacts);
            }
        }
        if(typeof(style)==="undefined"){
            interResCylinders = contactsToCylindersLinesInfo(all_lig_lig_contacts,size,"CYLINDERS",colourScheme,false);
        } else {
            interResCylinders = contactsToCylindersLinesInfo(all_lig_lig_contacts,size,style,colourScheme,false);
        }
    }

    let cylinders = [];
    let dashCylinders = [];
    let tripleCylinders = [];
    let singleCylinders = [];
    let toruses = [];

    if(typeof(style)==="undefined"){
        cylinders = contactsToCylindersLinesInfo(contacts,dbSize,"CYLINDERS",colourScheme,false);
        dashCylinders = contactsToCylindersLinesInfo(dashedContacts,dbSize,"CYLINDERS",colourScheme,true);
        tripleCylinders = contactsToCylindersLinesInfo(tripleContacts,tbSize,"CYLINDERS",colourScheme,false);
        singleCylinders = contactsToCylindersLinesInfo(singleContacts,size,"CYLINDERS",colourScheme,false);
        //console.log(cylinders);
        //console.log(dashCylinders);
        //console.log(tripleCylinders);
        //console.log(singleCylinders);

        toruses = ringsToToruses(drawRings,size,radius,"TORUSES",colourScheme);
    } else {
        cylinders = contactsToCylindersLinesInfo(contacts,dbSize,style,colourScheme,false);
        dashCylinders = contactsToCylindersLinesInfo(dashedContacts,dbSize,style,colourScheme,true);
        tripleCylinders = contactsToCylindersLinesInfo(tripleContacts,tbSize,style,colourScheme,false);
        singleCylinders = contactsToCylindersLinesInfo(singleContacts,size,style,colourScheme,false);
        if(style==="LINES"){
            toruses = ringsToToruses(drawRings,size,radius,"CIRCLES",colourScheme);
        } else {
            toruses = ringsToToruses(drawRings,0.1,radius,"TORUSES",colourScheme);
        }
    }

    let ret = [cylinders,dashCylinders,tripleCylinders,singleCylinders,toruses]; 
    if(typeof(interResCylinders["norm_tri"])!=="undefined"){
        ret.push(interResCylinders);
    }
    return ret;
}

function getBloboids(atoms,model,colourScheme){
    let blob_col_tri = [];
    let blob_vert_tri = [];
    let blob_norm_tri = [];
    let blob_idx_tri = [];
    let idx = 0;

    //Hmm colours...
    //sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);

    //First identify the chains
    let chainIDs = [];
    for(let iat=0;iat<atoms.length;iat++){
        if(chainIDs.indexOf(atoms[iat].getChainID())===-1){
            chainIDs.push(atoms[iat].getChainID());
        }
    }

    let p1p2 = vec3.create();
    let p2p3 = vec3.create();
    let cross_n = vec3.create();

    for(let ich=0;ich<chainIDs.length;ich++){
        let maxX = -9999.0;
        let maxY = -9999.0;
        let maxZ = -9999.0;
        let minX =  9999.0;
        let minY =  9999.0;
        let minZ =  9999.0;
        let chainAtoms = model.getAtoms(chainIDs[ich]+"/");
        var data = [];
        for(let iat=0;iat<chainAtoms.length;iat++){
            if(chainAtoms[iat].x()>maxX) maxX = chainAtoms[iat].x();
            if(chainAtoms[iat].y()>maxY) maxY = chainAtoms[iat].y();
            if(chainAtoms[iat].z()>maxZ) maxZ = chainAtoms[iat].z();
            if(chainAtoms[iat].x()<minX) minX = chainAtoms[iat].x();
            if(chainAtoms[iat].y()<minY) minY = chainAtoms[iat].y();
            if(chainAtoms[iat].z()<minZ) minZ = chainAtoms[iat].z();
            data.push([chainAtoms[iat].x(),chainAtoms[iat].y(),chainAtoms[iat].z()]);
        }
        console.log(minX,maxX,minY,maxY,minZ,maxZ);
        //This is a bit iffy, should be mean, we can do that easily in loop above....
        let midX = (minX+maxX)*.5;
        let midY = (minY+maxY)*.5;
        let midZ = (minZ+maxZ)*.5;
        let midpoint = vec3Create([midX,midY,midZ]);

        //FIXME - isoMat has to be determined by PCA.
        console.log(PCA);
        var vectors = PCA.getEigenVectors(data);
        console.log(vectors);

        let E0 = 0.2*Math.sqrt(vectors[0].eigenvalue);
        let E1 = 0.2*Math.sqrt(vectors[1].eigenvalue);
        let E2 = 0.2*Math.sqrt(vectors[2].eigenvalue);

        let isoMat = mat4.clone([
        E0*vectors[0].vector[0],E0*vectors[0].vector[1],E0*vectors[0].vector[2],0.0,
        E1*vectors[1].vector[0],E1*vectors[1].vector[1],E1*vectors[1].vector[2],0.0,
        E2*vectors[2].vector[0],E2*vectors[2].vector[1],E2*vectors[2].vector[2],0.0,
        0.0,0.0,0.0,1.0]);

        console.log(isoMat);

        let blob_norm_tri_this = new Array(icosaIndices2.length*3).fill(0);
        for(let icosa=0;icosa<icosaIndices2.length;icosa+=3){
            let p1 = vec3Create([icosaVertices2[3*icosaIndices2[icosa]],  icosaVertices2[3*icosaIndices2[icosa]+1],icosaVertices2[3*icosaIndices2[icosa]+2]]);
            let p2 = vec3Create([icosaVertices2[3*icosaIndices2[icosa+1]],icosaVertices2[3*icosaIndices2[icosa+1]+1],icosaVertices2[3*icosaIndices2[icosa+1]+2]]);
            let p3 = vec3Create([icosaVertices2[3*icosaIndices2[icosa+2]],icosaVertices2[3*icosaIndices2[icosa+2]+1],icosaVertices2[3*icosaIndices2[icosa+2]+2]]);
            vec3.transformMat4(p1,p1,isoMat);
            vec3.transformMat4(p2,p2,isoMat);
            vec3.transformMat4(p3,p3,isoMat);
            vec3Subtract(p1,p2,p1p2);
            vec3Subtract(p2,p3,p2p3);
            vec3Cross(p1p2,p2p3,cross_n);
            NormalizeVec3(cross_n);

            //Average over all 6 triangles which share a vertex.
            blob_norm_tri_this[3*icosaIndices2[icosa]]     += cross_n[0] / 6.;
            blob_norm_tri_this[3*icosaIndices2[icosa]+1]   += cross_n[1] / 6.;
            blob_norm_tri_this[3*icosaIndices2[icosa]+2]   += cross_n[2] / 6.;
            blob_norm_tri_this[3*icosaIndices2[icosa+1]]   += cross_n[0] / 6.;
            blob_norm_tri_this[3*icosaIndices2[icosa+1]+1] += cross_n[1] / 6.;
            blob_norm_tri_this[3*icosaIndices2[icosa+1]+2] += cross_n[2] / 6.;
            blob_norm_tri_this[3*icosaIndices2[icosa+2]]   += cross_n[0] / 6.;
            blob_norm_tri_this[3*icosaIndices2[icosa+2]+1] += cross_n[1] / 6.;
            blob_norm_tri_this[3*icosaIndices2[icosa+2]+2] += cross_n[2] / 6.;

            blob_vert_tri.push(midpoint[0]+p1[0]);
            blob_vert_tri.push(midpoint[1]+p1[1]);
            blob_vert_tri.push(midpoint[2]+p1[2]);
            blob_vert_tri.push(midpoint[0]+p2[0]);
            blob_vert_tri.push(midpoint[1]+p2[1]);
            blob_vert_tri.push(midpoint[2]+p2[2]);
            blob_vert_tri.push(midpoint[0]+p3[0]);
            blob_vert_tri.push(midpoint[1]+p3[1]);
            blob_vert_tri.push(midpoint[2]+p3[2]);

            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][0]);
            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][1]);
            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][2]);
            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][3]);
            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][0]);
            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][1]);
            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][2]);
            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][3]);
            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][0]);
            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][1]);
            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][2]);
            blob_col_tri.push(colourScheme[chainAtoms[0]["_atom_site.id"]][3]);

            blob_idx_tri.push(idx++);
            blob_idx_tri.push(idx++);
            blob_idx_tri.push(idx++);
        }
        for(let icosa=0;icosa<icosaIndices2.length;icosa+=3){
            let cross_1 =[blob_norm_tri_this[3*icosaIndices2[icosa]],  blob_norm_tri_this[3*icosaIndices2[icosa]+1],blob_norm_tri_this[3*icosaIndices2[icosa]+2]];
            let cross_2 = [blob_norm_tri_this[3*icosaIndices2[icosa+1]],blob_norm_tri_this[3*icosaIndices2[icosa+1]+1],blob_norm_tri_this[3*icosaIndices2[icosa+1]+2]];
            let cross_3 = [blob_norm_tri_this[3*icosaIndices2[icosa+2]],blob_norm_tri_this[3*icosaIndices2[icosa+2]+1],blob_norm_tri_this[3*icosaIndices2[icosa+2]+2]];
            blob_norm_tri.push(cross_1[0]);
            blob_norm_tri.push(cross_1[1]);
            blob_norm_tri.push(cross_1[2]);
            blob_norm_tri.push(cross_2[0]);
            blob_norm_tri.push(cross_2[1]);
            blob_norm_tri.push(cross_2[2]);
            blob_norm_tri.push(cross_3[0]);
            blob_norm_tri.push(cross_3[1]);
            blob_norm_tri.push(cross_3[2]);
        }

    }

    let blobPrimitiveInfo = {"atoms":[[atoms]], "col_tri":[[blob_col_tri]], "norm_tri":[[blob_norm_tri]], "vert_tri":[[blob_vert_tri]], "idx_tri":[[blob_idx_tri]] , "prim_types":[["TRIANGLES"]] };
    return blobPrimitiveInfo;
}

function getBaseDiscs(atoms,size,colourScheme){
    //Sheroids are not rendered right!!! (And not for thermal ellipsoids either) - the normals are all wrong. We should generate triangles and normals. Done here, thermal ellipsoids need same treatment.
    let sphere_col_tri = [];
    let sphere_vert_tri = [];
    let sphere_norm_tri = [];
    let sphere_idx_tri = [];

    let idx = 0;

    let up = vec3Create();
    let right = vec3Create();
    let n1c2 = vec3Create();
    let c2n3 = vec3Create();
    let n1mid = vec3Create();

    let p1p2 = vec3.create();
    let p2p3 = vec3.create();
    let cross_n = vec3.create();

    for(let iat=0;iat<atoms.length;iat++){
        if(atoms[iat]["_atom_site.label_atom_id"].trim()==="C5*"||atoms[iat]["_atom_site.label_atom_id"].trim()==="C5'"||
                atoms[iat]["_atom_site.label_atom_id"].trim()==="\"C5*\""||atoms[iat]["_atom_site.label_atom_id"].trim()==="\"C5'\""){
            let res1 = atoms[iat].residue;
            let n1 = res1.getAtomTrimmed("N1");
            let c2 = res1.getAtomTrimmed("C2");
            let n3 = res1.getAtomTrimmed("N3");
            let c4 = res1.getAtomTrimmed("C4");
            let c5 = res1.getAtomTrimmed("C5");
            let c6 = res1.getAtomTrimmed("C6");
            let n7 = res1.getAtomTrimmed("N7");
            let c8 = res1.getAtomTrimmed("C8");
            let n9 = res1.getAtomTrimmed("N9");
            if(n1&&c2&&n3&&c4&&c5&&c6){
                let n1cart = vec3Create([n1.x(),n1.y(),n1.z()]);
                let c2cart = vec3Create([c2.x(),c2.y(),c2.z()]);
                let n3cart = vec3Create([n3.x(),n3.y(),n3.z()]);
                let c4cart = vec3Create([c4.x(),c4.y(),c4.z()]);
                let c5cart = vec3Create([c5.x(),c5.y(),c5.z()]);
                let c6cart = vec3Create([c6.x(),c6.y(),c6.z()]);

                vec3Subtract(n1cart,c2cart,n1c2);
                vec3Subtract(c2cart,n3cart,c2n3);
                vec3Cross(n1c2,c2n3,up);

                let midpoint = vec3Create([0.0,0.0,0.0]);
                vec3Add(midpoint,n1cart);
                vec3Add(midpoint,c2cart);
                vec3Add(midpoint,n3cart);
                vec3Add(midpoint,c4cart);
                vec3Add(midpoint,c5cart);
                vec3Add(midpoint,c6cart);
                midpoint[0] /= 6.0;
                midpoint[1] /= 6.0;
                midpoint[2] /= 6.0;

                vec3Subtract(n1cart,midpoint,n1mid);
                NormalizeVec3(up);
                NormalizeVec3(n1mid);
                vec3Cross(up,n1mid,right);

                up[0] *= size;
                up[1] *= size;
                up[2] *= size;

                right[0] *= 1.4;
                right[1] *= 1.4;
                right[2] *= 1.4;

                n1mid[0] *= 1.4;
                n1mid[1] *= 1.4;
                n1mid[2] *= 1.4;

                let iso = [];

                iso.push(up[0]);
                iso.push(up[1]);
                iso.push(up[2]);
                iso.push(0.0);

                iso.push(n1mid[0]);
                iso.push(n1mid[1]);
                iso.push(n1mid[2]);
                iso.push(0.0);

                iso.push(right[0]);
                iso.push(right[1]);
                iso.push(right[2]);
                iso.push(0.0);

                iso.push(0.0);
                iso.push(0.0);
                iso.push(0.0);
                iso.push(1.0);

                let isoMat = mat4.clone(iso);

                let sphere_norm_tri_this = new Array(icosaIndices2.length*3).fill(0);
                for(let icosa=0;icosa<icosaIndices2.length;icosa+=3){
                    let p1 = vec3Create([icosaVertices2[3*icosaIndices2[icosa]],  icosaVertices2[3*icosaIndices2[icosa]+1],icosaVertices2[3*icosaIndices2[icosa]+2]]);
                    let p2 = vec3Create([icosaVertices2[3*icosaIndices2[icosa+1]],icosaVertices2[3*icosaIndices2[icosa+1]+1],icosaVertices2[3*icosaIndices2[icosa+1]+2]]);
                    let p3 = vec3Create([icosaVertices2[3*icosaIndices2[icosa+2]],icosaVertices2[3*icosaIndices2[icosa+2]+1],icosaVertices2[3*icosaIndices2[icosa+2]+2]]);

                    vec3.transformMat4(p1,p1,isoMat);
                    vec3.transformMat4(p2,p2,isoMat);
                    vec3.transformMat4(p3,p3,isoMat);
                    vec3Subtract(p1,p2,p1p2);
                    vec3Subtract(p2,p3,p2p3);
                    vec3Cross(p1p2,p2p3,cross_n);
                    NormalizeVec3(cross_n);

                    //Average over all 6 triangles which share a vertex.
                    sphere_norm_tri_this[3*icosaIndices2[icosa]]     += cross_n[0] / 6.;
                    sphere_norm_tri_this[3*icosaIndices2[icosa]+1]   += cross_n[1] / 6.;
                    sphere_norm_tri_this[3*icosaIndices2[icosa]+2]   += cross_n[2] / 6.;
                    sphere_norm_tri_this[3*icosaIndices2[icosa+1]]   += cross_n[0] / 6.;
                    sphere_norm_tri_this[3*icosaIndices2[icosa+1]+1] += cross_n[1] / 6.;
                    sphere_norm_tri_this[3*icosaIndices2[icosa+1]+2] += cross_n[2] / 6.;
                    sphere_norm_tri_this[3*icosaIndices2[icosa+2]]   += cross_n[0] / 6.;
                    sphere_norm_tri_this[3*icosaIndices2[icosa+2]+1] += cross_n[1] / 6.;
                    sphere_norm_tri_this[3*icosaIndices2[icosa+2]+2] += cross_n[2] / 6.;

                    sphere_vert_tri.push(midpoint[0]+p1[0]);
                    sphere_vert_tri.push(midpoint[1]+p1[1]);
                    sphere_vert_tri.push(midpoint[2]+p1[2]);
                    sphere_vert_tri.push(midpoint[0]+p2[0]);
                    sphere_vert_tri.push(midpoint[1]+p2[1]);
                    sphere_vert_tri.push(midpoint[2]+p2[2]);
                    sphere_vert_tri.push(midpoint[0]+p3[0]);
                    sphere_vert_tri.push(midpoint[1]+p3[1]);
                    sphere_vert_tri.push(midpoint[2]+p3[2]);

                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    sphere_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    sphere_idx_tri.push(idx++);
                    sphere_idx_tri.push(idx++);
                    sphere_idx_tri.push(idx++);
                }
                for(let icosa=0;icosa<icosaIndices2.length;icosa+=3){
                    let cross_1 =[sphere_norm_tri_this[3*icosaIndices2[icosa]],  sphere_norm_tri_this[3*icosaIndices2[icosa]+1],sphere_norm_tri_this[3*icosaIndices2[icosa]+2]];
                    let cross_2 = [sphere_norm_tri_this[3*icosaIndices2[icosa+1]],sphere_norm_tri_this[3*icosaIndices2[icosa+1]+1],sphere_norm_tri_this[3*icosaIndices2[icosa+1]+2]];
                    let cross_3 = [sphere_norm_tri_this[3*icosaIndices2[icosa+2]],sphere_norm_tri_this[3*icosaIndices2[icosa+2]+1],sphere_norm_tri_this[3*icosaIndices2[icosa+2]+2]];
                    sphere_norm_tri.push(cross_1[0]);
                    sphere_norm_tri.push(cross_1[1]);
                    sphere_norm_tri.push(cross_1[2]);
                    sphere_norm_tri.push(cross_2[0]);
                    sphere_norm_tri.push(cross_2[1]);
                    sphere_norm_tri.push(cross_2[2]);
                    sphere_norm_tri.push(cross_3[0]);
                    sphere_norm_tri.push(cross_3[1]);
                    sphere_norm_tri.push(cross_3[2]);
                }
            }
        }
    }

    let spherePrimitiveInfo = {"atoms":[[atoms]], "col_tri":[[sphere_col_tri]], "norm_tri":[[sphere_norm_tri]], "vert_tri":[[sphere_vert_tri]], "idx_tri":[[sphere_idx_tri]] , "prim_types":[["TRIANGLES"]] };
    return spherePrimitiveInfo;
}

function getBaseBlocks(atoms,size,colourScheme){
    let block_col_tri = [];
    let block_norm_tri = [];
    let block_vert_tri = [];
    let block_idx_tri = [];

    let up = vec3Create();
    let n1c2 = vec3Create();
    let c2n3 = vec3Create();

    let n1pcart = vec3Create();
    let c2pcart = vec3Create();
    let n3pcart = vec3Create();
    let c4pcart = vec3Create();
    let c5pcart = vec3Create();
    let c6pcart = vec3Create();
    let n1mcart = vec3Create();
    let c2mcart = vec3Create();
    let n3mcart = vec3Create();
    let c4mcart = vec3Create();
    let c5mcart = vec3Create();
    let c6mcart = vec3Create();

    let n9pcart = vec3Create();
    let c8pcart = vec3Create();
    let n7pcart = vec3Create();
    let n9mcart = vec3Create();
    let c8mcart = vec3Create();
    let n7mcart = vec3Create();

    let midpointp = vec3Create();
    let midpointm = vec3Create();
    let mid1 = vec3Create();
    let mid2 = vec3Create();

    let idx = 0;
    for(let iat=0;iat<atoms.length;iat++){
        if(atoms[iat]["_atom_site.label_atom_id"].trim()==="C5*"||atoms[iat]["_atom_site.label_atom_id"].trim()==="C5'"||
        atoms[iat]["_atom_site.label_atom_id"].trim()==="\"C5*\""||atoms[iat]["_atom_site.label_atom_id"].trim()==="\"C5'\""){
            let res1 = atoms[iat].residue;
            let n1 = res1.getAtomTrimmed("N1");
            let c2 = res1.getAtomTrimmed("C2");
            let n3 = res1.getAtomTrimmed("N3");
            let c4 = res1.getAtomTrimmed("C4");
            let c5 = res1.getAtomTrimmed("C5");
            let c6 = res1.getAtomTrimmed("C6");
            let n7 = res1.getAtomTrimmed("N7");
            let c8 = res1.getAtomTrimmed("C8");
            let n9 = res1.getAtomTrimmed("N9");
            if(n1&&c2&&n3&&c4&&c5&&c6){
                let n1cart = vec3Create([n1.x(),n1.y(),n1.z()]);
                let c2cart = vec3Create([c2.x(),c2.y(),c2.z()]);
                let n3cart = vec3Create([n3.x(),n3.y(),n3.z()]);
                let c4cart = vec3Create([c4.x(),c4.y(),c4.z()]);
                let c5cart = vec3Create([c5.x(),c5.y(),c5.z()]);
                let c6cart = vec3Create([c6.x(),c6.y(),c6.z()]);

                vec3Subtract(n1cart,c2cart,n1c2);
                vec3Subtract(c2cart,n3cart,c2n3);
                vec3Cross(n1c2,c2n3,up);
                up[0] *= size*.5;
                up[1] *= size*.5;
                up[2] *= size*.5;

                vec3Add(n1cart,up,n1pcart);
                vec3Add(c2cart,up,c2pcart);
                vec3Add(n3cart,up,n3pcart);
                vec3Add(c4cart,up,c4pcart);
                vec3Add(c5cart,up,c5pcart);
                vec3Add(c6cart,up,c6pcart);

                vec3Subtract(n1cart,up,n1mcart);
                vec3Subtract(c2cart,up,c2mcart);
                vec3Subtract(n3cart,up,n3mcart);
                vec3Subtract(c4cart,up,c4mcart);
                vec3Subtract(c5cart,up,c5mcart);
                vec3Subtract(c6cart,up,c6mcart);

                let midpoint = vec3Create([0.0,0.0,0.0]);
                vec3Add(midpoint,n1cart);
                vec3Add(midpoint,c2cart);
                vec3Add(midpoint,n3cart);
                vec3Add(midpoint,c4cart);
                vec3Add(midpoint,c5cart);
                vec3Add(midpoint,c6cart);
                midpoint[0] /= 6.0;
                midpoint[1] /= 6.0;
                midpoint[2] /= 6.0;

                vec3Add(midpoint,up,midpointp);
                vec3Subtract(midpoint,up,midpointm);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(n1pcart[0]); block_vert_tri.push(n1pcart[1]); block_vert_tri.push(n1pcart[2]);
                block_vert_tri.push(c2pcart[0]); block_vert_tri.push(c2pcart[1]); block_vert_tri.push(c2pcart[2]);
                block_vert_tri.push(midpointp[0]); block_vert_tri.push(midpointp[1]); block_vert_tri.push(midpointp[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c2pcart[0]); block_vert_tri.push(c2pcart[1]); block_vert_tri.push(c2pcart[2]);
                block_vert_tri.push(n3pcart[0]); block_vert_tri.push(n3pcart[1]); block_vert_tri.push(n3pcart[2]);
                block_vert_tri.push(midpointp[0]); block_vert_tri.push(midpointp[1]); block_vert_tri.push(midpointp[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(n3pcart[0]); block_vert_tri.push(n3pcart[1]); block_vert_tri.push(n3pcart[2]);
                block_vert_tri.push(c4pcart[0]); block_vert_tri.push(c4pcart[1]); block_vert_tri.push(c4pcart[2]);
                block_vert_tri.push(midpointp[0]); block_vert_tri.push(midpointp[1]); block_vert_tri.push(midpointp[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c4pcart[0]); block_vert_tri.push(c4pcart[1]); block_vert_tri.push(c4pcart[2]);
                block_vert_tri.push(c5pcart[0]); block_vert_tri.push(c5pcart[1]); block_vert_tri.push(c5pcart[2]);
                block_vert_tri.push(midpointp[0]); block_vert_tri.push(midpointp[1]); block_vert_tri.push(midpointp[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c5pcart[0]); block_vert_tri.push(c5pcart[1]); block_vert_tri.push(c5pcart[2]);
                block_vert_tri.push(c6pcart[0]); block_vert_tri.push(c6pcart[1]); block_vert_tri.push(c6pcart[2]);
                block_vert_tri.push(midpointp[0]); block_vert_tri.push(midpointp[1]); block_vert_tri.push(midpointp[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c6pcart[0]); block_vert_tri.push(c6pcart[1]); block_vert_tri.push(c6pcart[2]);
                block_vert_tri.push(n1pcart[0]); block_vert_tri.push(n1pcart[1]); block_vert_tri.push(n1pcart[2]);
                block_vert_tri.push(midpointp[0]); block_vert_tri.push(midpointp[1]); block_vert_tri.push(midpointp[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(n1mcart[0]); block_vert_tri.push(n1mcart[1]); block_vert_tri.push(n1mcart[2]);
                block_vert_tri.push(c2mcart[0]); block_vert_tri.push(c2mcart[1]); block_vert_tri.push(c2mcart[2]);
                block_vert_tri.push(midpointm[0]); block_vert_tri.push(midpointm[1]); block_vert_tri.push(midpointm[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c2mcart[0]); block_vert_tri.push(c2mcart[1]); block_vert_tri.push(c2mcart[2]);
                block_vert_tri.push(n3mcart[0]); block_vert_tri.push(n3mcart[1]); block_vert_tri.push(n3mcart[2]);
                block_vert_tri.push(midpointm[0]); block_vert_tri.push(midpointm[1]); block_vert_tri.push(midpointm[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(n3mcart[0]); block_vert_tri.push(n3mcart[1]); block_vert_tri.push(n3mcart[2]);
                block_vert_tri.push(c4mcart[0]); block_vert_tri.push(c4mcart[1]); block_vert_tri.push(c4mcart[2]);
                block_vert_tri.push(midpointm[0]); block_vert_tri.push(midpointm[1]); block_vert_tri.push(midpointm[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c4mcart[0]); block_vert_tri.push(c4mcart[1]); block_vert_tri.push(c4mcart[2]);
                block_vert_tri.push(c5mcart[0]); block_vert_tri.push(c5mcart[1]); block_vert_tri.push(c5mcart[2]);
                block_vert_tri.push(midpointm[0]); block_vert_tri.push(midpointm[1]); block_vert_tri.push(midpointm[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c5mcart[0]); block_vert_tri.push(c5mcart[1]); block_vert_tri.push(c5mcart[2]);
                block_vert_tri.push(c6mcart[0]); block_vert_tri.push(c6mcart[1]); block_vert_tri.push(c6mcart[2]);
                block_vert_tri.push(midpointm[0]); block_vert_tri.push(midpointm[1]); block_vert_tri.push(midpointm[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c6mcart[0]); block_vert_tri.push(c6mcart[1]); block_vert_tri.push(c6mcart[2]);
                block_vert_tri.push(n1mcart[0]); block_vert_tri.push(n1mcart[1]); block_vert_tri.push(n1mcart[2]);
                block_vert_tri.push(midpointm[0]); block_vert_tri.push(midpointm[1]); block_vert_tri.push(midpointm[2]);

                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                // The edges
                vec3Subtract(n1cart,midpoint,mid1);
                vec3Subtract(c2cart,midpoint,mid2);
                vec3Add(mid1,mid2);
                NormalizeVec3(mid1);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(n1mcart[0]); block_vert_tri.push(n1mcart[1]); block_vert_tri.push(n1mcart[2]);
                block_vert_tri.push(c2pcart[0]); block_vert_tri.push(c2pcart[1]); block_vert_tri.push(c2pcart[2]);
                block_vert_tri.push(n1pcart[0]); block_vert_tri.push(n1pcart[1]); block_vert_tri.push(n1pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(n1mcart[0]); block_vert_tri.push(n1mcart[1]); block_vert_tri.push(n1mcart[2]);
                block_vert_tri.push(c2mcart[0]); block_vert_tri.push(c2mcart[1]); block_vert_tri.push(c2mcart[2]);
                block_vert_tri.push(c2pcart[0]); block_vert_tri.push(c2pcart[1]); block_vert_tri.push(c2pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                vec3Subtract(c2cart,midpoint,mid1);
                vec3Subtract(n3cart,midpoint,mid2);
                vec3Add(mid1,mid2);
                NormalizeVec3(mid1);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c2mcart[0]); block_vert_tri.push(c2mcart[1]); block_vert_tri.push(c2mcart[2]);
                block_vert_tri.push(n3pcart[0]); block_vert_tri.push(n3pcart[1]); block_vert_tri.push(n3pcart[2]);
                block_vert_tri.push(c2pcart[0]); block_vert_tri.push(c2pcart[1]); block_vert_tri.push(c2pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c2mcart[0]); block_vert_tri.push(c2mcart[1]); block_vert_tri.push(c2mcart[2]);
                block_vert_tri.push(n3mcart[0]); block_vert_tri.push(n3mcart[1]); block_vert_tri.push(n3mcart[2]);
                block_vert_tri.push(n3pcart[0]); block_vert_tri.push(n3pcart[1]); block_vert_tri.push(n3pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                vec3Subtract(n3cart,midpoint,mid1);
                vec3Subtract(c4cart,midpoint,mid2);
                vec3Add(mid1,mid2);
                NormalizeVec3(mid1);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(n3mcart[0]); block_vert_tri.push(n3mcart[1]); block_vert_tri.push(n3mcart[2]);
                block_vert_tri.push(c4pcart[0]); block_vert_tri.push(c4pcart[1]); block_vert_tri.push(c4pcart[2]);
                block_vert_tri.push(n3pcart[0]); block_vert_tri.push(n3pcart[1]); block_vert_tri.push(n3pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(n3mcart[0]); block_vert_tri.push(n3mcart[1]); block_vert_tri.push(n3mcart[2]);
                block_vert_tri.push(c4mcart[0]); block_vert_tri.push(c4mcart[1]); block_vert_tri.push(c4mcart[2]);
                block_vert_tri.push(c4pcart[0]); block_vert_tri.push(c4pcart[1]); block_vert_tri.push(c4pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                vec3Subtract(c4cart,midpoint,mid1);
                vec3Subtract(c5cart,midpoint,mid2);
                vec3Add(mid1,mid2);
                NormalizeVec3(mid1);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c4mcart[0]); block_vert_tri.push(c4mcart[1]); block_vert_tri.push(c4mcart[2]);
                block_vert_tri.push(c5pcart[0]); block_vert_tri.push(c5pcart[1]); block_vert_tri.push(c5pcart[2]);
                block_vert_tri.push(c4pcart[0]); block_vert_tri.push(c4pcart[1]); block_vert_tri.push(c4pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c4mcart[0]); block_vert_tri.push(c4mcart[1]); block_vert_tri.push(c4mcart[2]);
                block_vert_tri.push(c5mcart[0]); block_vert_tri.push(c5mcart[1]); block_vert_tri.push(c5mcart[2]);
                block_vert_tri.push(c5pcart[0]); block_vert_tri.push(c5pcart[1]); block_vert_tri.push(c5pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                vec3Subtract(c5cart,midpoint,mid1);
                vec3Subtract(c6cart,midpoint,mid2);
                vec3Add(mid1,mid2);
                NormalizeVec3(mid1);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c5mcart[0]); block_vert_tri.push(c5mcart[1]); block_vert_tri.push(c5mcart[2]);
                block_vert_tri.push(c6pcart[0]); block_vert_tri.push(c6pcart[1]); block_vert_tri.push(c6pcart[2]);
                block_vert_tri.push(c5pcart[0]); block_vert_tri.push(c5pcart[1]); block_vert_tri.push(c5pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c5mcart[0]); block_vert_tri.push(c5mcart[1]); block_vert_tri.push(c5mcart[2]);
                block_vert_tri.push(c6mcart[0]); block_vert_tri.push(c6mcart[1]); block_vert_tri.push(c6mcart[2]);
                block_vert_tri.push(c6pcart[0]); block_vert_tri.push(c6pcart[1]); block_vert_tri.push(c6pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                vec3Subtract(c6cart,midpoint,mid1);
                vec3Subtract(n1cart,midpoint,mid2);
                vec3Add(mid1,mid2);
                NormalizeVec3(mid1);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c6mcart[0]); block_vert_tri.push(c6mcart[1]); block_vert_tri.push(c6mcart[2]);
                block_vert_tri.push(n1pcart[0]); block_vert_tri.push(n1pcart[1]); block_vert_tri.push(n1pcart[2]);
                block_vert_tri.push(c6pcart[0]); block_vert_tri.push(c6pcart[1]); block_vert_tri.push(c6pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                block_vert_tri.push(c6mcart[0]); block_vert_tri.push(c6mcart[1]); block_vert_tri.push(c6mcart[2]);
                block_vert_tri.push(n1mcart[0]); block_vert_tri.push(n1mcart[1]); block_vert_tri.push(n1mcart[2]);
                block_vert_tri.push(n1pcart[0]); block_vert_tri.push(n1pcart[1]); block_vert_tri.push(n1pcart[2]);

                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                if(n9&&c8&&n7){
                    let n9cart = vec3Create([n9.x(),n9.y(),n9.z()]);
                    let c8cart = vec3Create([c8.x(),c8.y(),c8.z()]);
                    let n7cart = vec3Create([n7.x(),n7.y(),n7.z()]);
                    vec3Add(n9cart,up,n9pcart);
                    vec3Add(c8cart,up,c8pcart);
                    vec3Add(n7cart,up,n7pcart);
                    vec3Subtract(n9cart,up,n9mcart);
                    vec3Subtract(c8cart,up,c8mcart);
                    vec3Subtract(n7cart,up,n7mcart);
                    let midpoint = vec3Create([0.0,0.0,0.0]);
                    vec3Add(midpoint,c4cart);
                    vec3Add(midpoint,c5cart);
                    vec3Add(midpoint,n7cart);
                    vec3Add(midpoint,c8cart);
                    vec3Add(midpoint,n9cart);
                    midpoint[0] /= 5.0;
                    midpoint[1] /= 5.0;
                    midpoint[2] /= 5.0;
                    vec3Add(midpoint,up,midpointp);
                    vec3Subtract(midpoint,up,midpointm);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(c5pcart[0]); block_vert_tri.push(c5pcart[1]); block_vert_tri.push(c5pcart[2]);
                    block_vert_tri.push(c4pcart[0]); block_vert_tri.push(c4pcart[1]); block_vert_tri.push(c4pcart[2]);
                    block_vert_tri.push(midpointp[0]); block_vert_tri.push(midpointp[1]); block_vert_tri.push(midpointp[2]);

                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(c4pcart[0]); block_vert_tri.push(c4pcart[1]); block_vert_tri.push(c4pcart[2]);
                    block_vert_tri.push(n9pcart[0]); block_vert_tri.push(n9pcart[1]); block_vert_tri.push(n9pcart[2]);
                    block_vert_tri.push(midpointp[0]); block_vert_tri.push(midpointp[1]); block_vert_tri.push(midpointp[2]);

                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(n9pcart[0]); block_vert_tri.push(n9pcart[1]); block_vert_tri.push(n9pcart[2]);
                    block_vert_tri.push(c8pcart[0]); block_vert_tri.push(c8pcart[1]); block_vert_tri.push(c8pcart[2]);
                    block_vert_tri.push(midpointp[0]); block_vert_tri.push(midpointp[1]); block_vert_tri.push(midpointp[2]);

                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(c8pcart[0]); block_vert_tri.push(c8pcart[1]); block_vert_tri.push(c8pcart[2]);
                    block_vert_tri.push(n7pcart[0]); block_vert_tri.push(n7pcart[1]); block_vert_tri.push(n7pcart[2]);
                    block_vert_tri.push(midpointp[0]); block_vert_tri.push(midpointp[1]); block_vert_tri.push(midpointp[2]);

                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(n7pcart[0]); block_vert_tri.push(n7pcart[1]); block_vert_tri.push(n7pcart[2]);
                    block_vert_tri.push(c5pcart[0]); block_vert_tri.push(c5pcart[1]); block_vert_tri.push(c5pcart[2]);
                    block_vert_tri.push(midpointp[0]); block_vert_tri.push(midpointp[1]); block_vert_tri.push(midpointp[2]);

                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(c5mcart[0]); block_vert_tri.push(c5mcart[1]); block_vert_tri.push(c5mcart[2]);
                    block_vert_tri.push(c4mcart[0]); block_vert_tri.push(c4mcart[1]); block_vert_tri.push(c4mcart[2]);
                    block_vert_tri.push(midpointm[0]); block_vert_tri.push(midpointm[1]); block_vert_tri.push(midpointm[2]);

                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(c4mcart[0]); block_vert_tri.push(c4mcart[1]); block_vert_tri.push(c4mcart[2]);
                    block_vert_tri.push(n9mcart[0]); block_vert_tri.push(n9mcart[1]); block_vert_tri.push(n9mcart[2]);
                    block_vert_tri.push(midpointm[0]); block_vert_tri.push(midpointm[1]); block_vert_tri.push(midpointm[2]);

                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(n9mcart[0]); block_vert_tri.push(n9mcart[1]); block_vert_tri.push(n9mcart[2]);
                    block_vert_tri.push(c8mcart[0]); block_vert_tri.push(c8mcart[1]); block_vert_tri.push(c8mcart[2]);
                    block_vert_tri.push(midpointm[0]); block_vert_tri.push(midpointm[1]); block_vert_tri.push(midpointm[2]);

                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(c8mcart[0]); block_vert_tri.push(c8mcart[1]); block_vert_tri.push(c8mcart[2]);
                    block_vert_tri.push(n7mcart[0]); block_vert_tri.push(n7mcart[1]); block_vert_tri.push(n7mcart[2]);
                    block_vert_tri.push(midpointm[0]); block_vert_tri.push(midpointm[1]); block_vert_tri.push(midpointm[2]);

                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(n7mcart[0]); block_vert_tri.push(n7mcart[1]); block_vert_tri.push(n7mcart[2]);
                    block_vert_tri.push(c5mcart[0]); block_vert_tri.push(c5mcart[1]); block_vert_tri.push(c5mcart[2]);
                    block_vert_tri.push(midpointm[0]); block_vert_tri.push(midpointm[1]); block_vert_tri.push(midpointm[2]);

                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);
                    block_norm_tri.push(up[0]); block_norm_tri.push(up[1]); block_norm_tri.push(up[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    // The edges
                    vec3Subtract(c4cart,midpoint,mid1);
                    vec3Subtract(n9cart,midpoint,mid2);
                    vec3Add(mid1,mid2);
                    NormalizeVec3(mid1);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(c4mcart[0]); block_vert_tri.push(c4mcart[1]); block_vert_tri.push(c4mcart[2]);
                    block_vert_tri.push(n9pcart[0]); block_vert_tri.push(n9pcart[1]); block_vert_tri.push(n9pcart[2]);
                    block_vert_tri.push(c4pcart[0]); block_vert_tri.push(c4pcart[1]); block_vert_tri.push(c4pcart[2]);

                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(c4mcart[0]); block_vert_tri.push(c4mcart[1]); block_vert_tri.push(c4mcart[2]);
                    block_vert_tri.push(n9mcart[0]); block_vert_tri.push(n9mcart[1]); block_vert_tri.push(n9mcart[2]);
                    block_vert_tri.push(n9pcart[0]); block_vert_tri.push(n9pcart[1]); block_vert_tri.push(n9pcart[2]);

                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);
                    
                    vec3Subtract(n9cart,midpoint,mid1);
                    vec3Subtract(c8cart,midpoint,mid2);
                    vec3Add(mid1,mid2);
                    NormalizeVec3(mid1);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(n9mcart[0]); block_vert_tri.push(n9mcart[1]); block_vert_tri.push(n9mcart[2]);
                    block_vert_tri.push(c8pcart[0]); block_vert_tri.push(c8pcart[1]); block_vert_tri.push(c8pcart[2]);
                    block_vert_tri.push(n9pcart[0]); block_vert_tri.push(n9pcart[1]); block_vert_tri.push(n9pcart[2]);

                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(n9mcart[0]); block_vert_tri.push(n9mcart[1]); block_vert_tri.push(n9mcart[2]);
                    block_vert_tri.push(c8mcart[0]); block_vert_tri.push(c8mcart[1]); block_vert_tri.push(c8mcart[2]);
                    block_vert_tri.push(c8pcart[0]); block_vert_tri.push(c8pcart[1]); block_vert_tri.push(c8pcart[2]);

                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    vec3Subtract(c8cart,midpoint,mid1);
                    vec3Subtract(n7cart,midpoint,mid2);
                    vec3Add(mid1,mid2);
                    NormalizeVec3(mid1);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(c8mcart[0]); block_vert_tri.push(c8mcart[1]); block_vert_tri.push(c8mcart[2]);
                    block_vert_tri.push(n7pcart[0]); block_vert_tri.push(n7pcart[1]); block_vert_tri.push(n7pcart[2]);
                    block_vert_tri.push(c8pcart[0]); block_vert_tri.push(c8pcart[1]); block_vert_tri.push(c8pcart[2]);

                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(c8mcart[0]); block_vert_tri.push(c8mcart[1]); block_vert_tri.push(c8mcart[2]);
                    block_vert_tri.push(n7mcart[0]); block_vert_tri.push(n7mcart[1]); block_vert_tri.push(n7mcart[2]);
                    block_vert_tri.push(n7pcart[0]); block_vert_tri.push(n7pcart[1]); block_vert_tri.push(n7pcart[2]);

                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    vec3Subtract(n7cart,midpoint,mid1);
                    vec3Subtract(c5cart,midpoint,mid2);
                    vec3Add(mid1,mid2);
                    NormalizeVec3(mid1);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(n7mcart[0]); block_vert_tri.push(n7mcart[1]); block_vert_tri.push(n7mcart[2]);
                    block_vert_tri.push(c5pcart[0]); block_vert_tri.push(c5pcart[1]); block_vert_tri.push(c5pcart[2]);
                    block_vert_tri.push(n7pcart[0]); block_vert_tri.push(n7pcart[1]); block_vert_tri.push(n7pcart[2]);

                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);

                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][0]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][1]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][2]);
                    block_col_tri.push(colourScheme[atoms[iat]["_atom_site.id"]][3]);

                    block_vert_tri.push(n7mcart[0]); block_vert_tri.push(n7mcart[1]); block_vert_tri.push(n7mcart[2]);
                    block_vert_tri.push(c5mcart[0]); block_vert_tri.push(c5mcart[1]); block_vert_tri.push(c5mcart[2]);
                    block_vert_tri.push(c5pcart[0]); block_vert_tri.push(c5pcart[1]); block_vert_tri.push(c5pcart[2]);

                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);
                    block_norm_tri.push(mid1[0]); block_norm_tri.push(mid1[1]); block_norm_tri.push(mid1[2]);

                    block_idx_tri.push(idx++); block_idx_tri.push(idx++); block_idx_tri.push(idx++);
                    
                }
            }
        }
    }

    let blockPrimitiveInfo = {"atoms":[[atoms]], "col_tri":[[block_col_tri]], "norm_tri":[[block_norm_tri]], "vert_tri":[[block_vert_tri]], "idx_tri":[[block_idx_tri]] , "prim_types":[["TRIANGLES"]] };
    return blockPrimitiveInfo;
}

function getGlycoBlocks(model,size,colourScheme){
    let objects = [];

    // Glycoblocks prototyping .... This belongs elsewhere.
    let atomColoursResType = colourScheme.colourByResidueType();
    let blackColours = colourScheme.colourOneColour([0.0,0.0,0.0,1.0]);
    let glycanAtoms = model.getAtoms("nglycosylation");
    if(glycanAtoms.length===0){
        return objects;
    }
    //let glycanSpheres = atomsToSpheresInfo(glycanAtoms,0.4,atomColours);
    //objects.push(glycanSpheres);
    let glycanResidues = model.getGlycanResidues();
    let glycoBlocks = residuesToGlycoBlocksInfo(glycanResidues,size,atomColoursResType);
    objects.push(glycoBlocks);

    let cylinder_sizes = [];
    let cylinder_col_tri = [];
    let cylinder_vert_tri = [];
    let cylinder_idx_tri = [];
    let sphere_atoms = [];
    let glycConn = model.glycan_cache["glycanGlycanConnections"];
    let gg = vec3Create();
    let uddAtoms = ["GLYCO_BLOCK_C1","GLYCO_BLOCK_C2","GLYCO_BLOCK_C3","GLYCO_BLOCK_C4","GLYCO_BLOCK_C5"];
    for(let ig=0;ig<glycConn.length;ig++){
        let mindist = 1e+8;
        let c1 = null;
        let c2 = null;
        let theT1 = null;
        let theT2 = null;
        for(let it1=0;it1<uddAtoms.length;it1++){
            let t1 = uddAtoms[it1];
            for(let it2=0;it2<uddAtoms.length;it2++){
                let t2 = uddAtoms[it2];
                if(typeof(glycConn[ig][0][t1])!=="undefined"&&typeof(glycConn[ig][1][t2])!=="undefined"){
                    let gg1 = vec3Create(glycConn[ig][0][t1]);
                    let gg2 = vec3Create(glycConn[ig][1][t2]);
                    vec3Subtract(gg1,gg2,gg);
                    let dist = vec3.length(gg);
                    if(dist<mindist){
                        mindist = dist;
                        c1 = glycConn[ig][0][t1];
                        c2 = glycConn[ig][1][t2];
                        theT1 = t1;
                        theT2 = t2;
                    }
                }
            }
        }
        cylinder_vert_tri.push(c1[0]);
        cylinder_vert_tri.push(c1[1]);
        cylinder_vert_tri.push(c1[2]);
        cylinder_vert_tri.push(c2[0]);
        cylinder_vert_tri.push(c2[1]);
        cylinder_vert_tri.push(c2[2]);
        cylinder_col_tri.push(0.0);
        cylinder_col_tri.push(0.0);
        cylinder_col_tri.push(0.0);
        cylinder_col_tri.push(1.0);
        cylinder_col_tri.push(0.0);
        cylinder_col_tri.push(0.0);
        cylinder_col_tri.push(0.0);
        cylinder_col_tri.push(1.0);
        cylinder_sizes.push(0.15);
        cylinder_idx_tri.push(2*ig);

        // FIXME - now make dummy atoms here and do contacts to cylinders.
        /*
        let atom = {};
        atom["x"] = theT1[0];
        atom["y"] = theT1[1];
        atom["z"] = theT1[2];
        atom["tempFactor"] = at1["_atom_site.B_iso_or_equiv"];
        atom["charge"] = at1["_atom_site.pdbx_formal_charge"];
        atom["symbol"] = at1["_atom_site.type_symbol"];
        atom["label"] =  at1.getAtomID();
        sphere_atoms.push(atom);
        */
    }
    let cylinderPrimitiveInfo = {"atoms":[[sphere_atoms]],"sizes": [[cylinder_sizes]], "col_tri":[[cylinder_col_tri]], "norm_tri":[[[]]], "vert_tri":[[cylinder_vert_tri]], "idx_tri":[[cylinder_idx_tri]] , "prim_types":[["CYLINDERS"]] };
    console.log(cylinderPrimitiveInfo);
    objects.push(cylinderPrimitiveInfo);

    let rootGlycConn = model.glycan_cache["rootGlycans"];
    let rootGlycConnPrimitiveInfo = contactsToCylindersInfo(rootGlycConn,size,atomColoursResType);
    objects.push(rootGlycConnPrimitiveInfo);

    let peptideAtoms = model.getAtoms("peptide");
    let saccharideAtoms = glycanAtoms;//model.getAtoms("saccharide");
    let glycoPeptideHBonds = model.getHBonds(peptideAtoms,saccharideAtoms);
    for(let ig=0;ig<glycoPeptideHBonds.length;ig++){
        if(glycoPeptideHBonds[ig][1].residue.getAtom("CA")){
            glycoPeptideHBonds[ig][1] =  glycoPeptideHBonds[ig][1].residue.getAtom("CA");
            let atom = new Atom(glycoPeptideHBonds[ig][2]);
            atom["_atom_site.Cartn_x"] = glycoPeptideHBonds[ig][2].residue["GLYCO_BLOCK_CENTRE"][0];
            atom["_atom_site.Cartn_y"] = glycoPeptideHBonds[ig][2].residue["GLYCO_BLOCK_CENTRE"][1];
            atom["_atom_site.Cartn_z"] = glycoPeptideHBonds[ig][2].residue["GLYCO_BLOCK_CENTRE"][2];
            glycoPeptideHBonds[ig][2] = atom;
        } else if(glycoPeptideHBonds[ig][2].residue.getAtom("CA")) {
            glycoPeptideHBonds[ig][2] =  glycoPeptideHBonds[ig][2].residue.getAtom("CA");
            let atom = new Atom(glycoPeptideHBonds[ig][1]);
            atom["_atom_site.Cartn_x"] = glycoPeptideHBonds[ig][1].residue["GLYCO_BLOCK_CENTRE"][0];
            atom["_atom_site.Cartn_y"] = glycoPeptideHBonds[ig][1].residue["GLYCO_BLOCK_CENTRE"][1];
            atom["_atom_site.Cartn_z"] = glycoPeptideHBonds[ig][1].residue["GLYCO_BLOCK_CENTRE"][2];
            glycoPeptideHBonds[ig][1] = atom;
        } else {
            console.log("Confusion in glycan-peptide hbonds ????????????????????????????????");
        }
    }

    let glycoGlycoHBonds = model.getHBonds(saccharideAtoms,saccharideAtoms);
    for(let ig=0;ig<glycoGlycoHBonds.length;ig++){
        let atom = new Atom(glycoGlycoHBonds[ig][2]);
        atom["_atom_site.Cartn_x"] = glycoGlycoHBonds[ig][2].residue["GLYCO_BLOCK_CENTRE"][0];
        atom["_atom_site.Cartn_y"] = glycoGlycoHBonds[ig][2].residue["GLYCO_BLOCK_CENTRE"][1];
        atom["_atom_site.Cartn_z"] = glycoGlycoHBonds[ig][2].residue["GLYCO_BLOCK_CENTRE"][2];
        glycoGlycoHBonds[ig][2] = atom;
        let atom2 = new Atom(glycoGlycoHBonds[ig][1]);
        atom2["_atom_site.Cartn_x"] = glycoGlycoHBonds[ig][1].residue["GLYCO_BLOCK_CENTRE"][0];
        atom2["_atom_site.Cartn_y"] = glycoGlycoHBonds[ig][1].residue["GLYCO_BLOCK_CENTRE"][1];
        atom2["_atom_site.Cartn_z"] = glycoGlycoHBonds[ig][1].residue["GLYCO_BLOCK_CENTRE"][2];
        glycoGlycoHBonds[ig][1] = atom2;
    }

    let glycoPeptideHBondPrimitiveInfo = contactsToCappedCylindersInfo(glycoPeptideHBonds,size*.5,blackColours,true);
    let glycoGlycoHBondPrimitiveInfo = contactsToCappedCylindersInfo(glycoGlycoHBonds,size*.5,blackColours,true);

    objects.push(glycoPeptideHBondPrimitiveInfo);
    objects.push(glycoGlycoHBondPrimitiveInfo);

    return objects;

}

function objectsFromAtomColourStyle(pdbatoms,data){
    let objects = [];
    let hier = pdbatoms.atoms;
    let model = hier[0];
    let selectedAtoms = model.getAtoms(data.selection);
    let colourScheme = new ColourScheme(pdbatoms);
    let atomColours = [];
    if(data.colour==="Atom type"){
        atomColours = colourScheme.colourByAtomType();
    } else if(data.colour==="By Chain") {
        atomColours = colourScheme.colourByChain();
    } else if(data.colour==="Main chain/side chain") {
        atomColours = colourScheme.colourByMainSide();
    } else if(data.colour==="By secondary structure") {
        let flagBulge = true;
        CalcSecStructure(hier,flagBulge);
        atomColours = colourScheme.colourBySecondaryStructure({"strand":[0.0,0.0,1.0,1.0],"helix":[1.0,0.0,0.0,1.0]});
    } else if(data.colour==="Blend through model") {
        atomColours = colourScheme.colourRainbow();
    } else if(data.colour==="Residue type") {
        atomColours = colourScheme.colourByResidueType();
    } else if(data.colour==="Temperature factor") {
        atomColours = colourScheme.colourByBFactor([{"min":0,"max":50,"mincolour":[0,0,1,1],"maxcolour":[1,0,0,1]},{"min":50,"max":100,"mincolour":[1,0,0,1],"maxcolour":[1,1,1,1]}]);
    } else if(data.colour==="Occupancy") {
        atomColours = colourScheme.colourByOccupancy([{"min":0,"max":1,"mincolour":[1,0,0,1],"maxcolour":[1,1,1,1]}]);
    } else if(data.colour==="Charge") {
        atomColours = colourScheme.colourByCharge([{"min":-4,"max":0,"mincolour":[0,0,1,1],"maxcolour":[1,1,1,1]},{"min":0,"max":4,"mincolour":[1,1,1,1],"maxcolour":[1,0,0,1]}]);
    } else if(data.colour==="By NMR model") {
        atomColours = colourScheme.colourByModel();
    } else if(data.colour==="By structure") {
        //FIXME - Not implemented
        atomColours = colourScheme.colourByModel();
    } else if(data.colour==="By PDB entity") {
        //FIXME - Not implemented
        atomColours = colourScheme.colourByModel();
    } else if(data.colour==="Residue solvet accessiblity") {
        //FIXME - Not implemented
        atomColours = colourScheme.colourByModel();
    } else if(data.colour==="Atom solvet accessiblity") {
        //FIXME - Not implemented
        atomColours = colourScheme.colourByModel();
    } else if(data.colour==="Alternate location") {
        //FIXME - Not implemented
        atomColours = colourScheme.colourByModel();
    } else {
        if(data.colour.substr(0,1) === "#" && data.colour.length==7){
            const r = parseInt(data.colour.substr(1,2),16) / 256.0;
            const g = parseInt(data.colour.substr(3,2),16) / 256.0;
            const b = parseInt(data.colour.substr(5,2),16) / 256.0;
            atomColours = colourScheme.colourOneColour([r,g,b,1.0]);
        } else if(data.colour.substr(0,1) === "#" && data.colour.length==4){
            const r = parseInt(data.colour.substr(1,1)+"0",16) / 256.0;
            const g = parseInt(data.colour.substr(2,1)+"0",16) / 256.0;
            const b = parseInt(data.colour.substr(3,1)+"0",16) / 256.0;
        } else if(data.colour in this.colours) {
            atomColours = colourScheme.colourOneColour(this.colours[data.colour]);
        } else {
            console.log("DON'T KNOW WHAT TO DO WITH COLOUR",data.colour);
            atomColours = colourScheme.colourOneColour([1.0,0.0,0.0,1.0]);
        }
    }
    //console.log(selectedAtoms);
    //console.log(colourScheme);
    //console.log(atomColours);
    if(data.style==="Lines") {
        let contactsAndSingletons = model.getBondsContactsAndSingletons();
        let contacts = contactsAndSingletons["contacts"];
        let singletons = contactsAndSingletons["singletons"];
        let linePrimitiveInfo = contactsToLinesInfo(contacts,4,atomColours);
        let singletonPrimitiveInfo = singletonsToLinesInfo(singletons,4,atomColours);
        objects.push(linePrimitiveInfo);
        objects.push(singletonPrimitiveInfo);
    } else if(data.style==="Cylinders") {
        let contactsAndSingletons = model.getBondsContactsAndSingletons();
        let contacts = contactsAndSingletons["contacts"];
        //let contacts = model.SeekContacts(selectedAtoms,selectedAtoms,0.6,1.6);
        let spheres = atomsToSpheresInfo(selectedAtoms,0.2,atomColours);
        let cylinderPrimitiveInfo = contactsToCylindersInfo(contacts,0.2,atomColours);
        objects.push(spheres);
        objects.push(cylinderPrimitiveInfo);
    } else if(data.style==="Ball and stick") {
        let contactsAndSingletons = model.getBondsContactsAndSingletons();
        let contacts = contactsAndSingletons["contacts"];
        //let contacts = model.SeekContacts(selectedAtoms,selectedAtoms,0.6,1.6);
        let spheres = atomsToSpheresInfo(selectedAtoms,0.4,atomColours);
        let cylinderPrimitiveInfo = contactsToCylindersInfo(contacts,0.2,atomColours);
        objects.push(spheres);
        objects.push(cylinderPrimitiveInfo);
    } else if(data.style==="Spheres") {
        let spheres = atomsToSpheresInfo(selectedAtoms,1.0,atomColours);
        objects.push(spheres);
    } else if(data.style==="Ribbons") {
        let flagBulge = true;
        CalcSecStructure(hier,flagBulge);
        let coloured_splines_info = GetSplinesColoured(pdbatoms,atomColours);
        for(let itri=0;itri<coloured_splines_info.length;itri++){
            coloured_splines_info[itri]["display_class"] = "ribbons";
            objects.push(coloured_splines_info[itri]);
        }
    } else if(data.style==="Worms") {
        let coloured_splines_info = GetWormColoured(pdbatoms,atomColours);
        for(let itri=0;itri<coloured_splines_info.length;itri++){
            coloured_splines_info[itri]["display_class"] = "ribbons";
            objects.push(coloured_splines_info[itri]);
        }
    } else if(data.style==="Worms scaled by B-factor") {
        let coloured_splines_info = GetBfactorSplinesColoured(pdbatoms,atomColours);
        for(let itri=0;itri<coloured_splines_info.length;itri++){
            coloured_splines_info[itri]["display_class"] = "ribbons";
            objects.push(coloured_splines_info[itri]);
        }
    } else if(data.style==="Nucleic base discs") {
        //FIXME - Not implemented
        let blockPrimitiveInfo = getBaseDiscs(selectedAtoms,0.2,atomColours);
        objects.push(blockPrimitiveInfo);
    } else if(data.style==="Nucleic base blocks") {
        let blockPrimitiveInfo = getBaseBlocks(selectedAtoms,0.2,atomColours);
        objects.push(blockPrimitiveInfo);
    } else if(data.style==="Glycoblocks") {
        //FIXME - need selection.
        let glycoBlocks = getGlycoBlocks(model,0.2,colourScheme);
        Array.prototype.push.apply(objects,glycoBlocks);
    } else if(data.style==="Thermal ellipsoids") {
        let spherePrimitiveInfo = atomsToEllipsoidsInfo(selectedAtoms,1.0,atomColours);
        objects.push(spherePrimitiveInfo);
    } else if(data.style==="Circles") {
        //FIXME - Not implemented
        let circles = atomsToCirclesInfo(selectedAtoms,1.0,atomColours);
        objects.push(circles);
    } else if(data.style==="Bloboids") {
        let bloboids = getBloboids(selectedAtoms,model,atomColours);
        objects.push(bloboids);
        //FIXME - Not implemented
    } else if(data.style==="Lipid cartoons") {
        //FIXME - Not implemented
    } else {
        console.log("DON'T KNOW WHAT TO DO WITH",data.style);
    }
    //console.log(objects);
    return objects;
}

const displayStyles = {
"Lines":"LINES",
"Cylinders":"CYLINDERS",
"Ball and stick":"BALLANDSTICK",
"Spheres":"POINTS_SPHERES",
"Ribbons":"RIBBONS",
"Worms":"WORMS",
"Worms scaled by B-factor":"BFACWORMS",
"Nucleic base discs":"DISCS",
"Nucleic base blocks":"BLOCKS",
"Glycoblocks":"GLYCOBLOCKS",
"Thermal ellipsoids":"THERMALELLIPSE",
"Circles":"CIRCLES",
"Bloboids":"BLOBOIDS",
"Lipid cartoons":"LIPIDS",
};

const colourStyles = {
"Atom type":"COLOR_MODE_ATOMTYPE",
"By Chain":"COLOR_MODE_CHAIN",
"By Structure":"COLOR_MODE_STRUCTURE",
"Main chain/side chain":"COLOR_MODE_MAINSIDE",
"By PDB entity":"COLOR_MODE_ENTITY",
"By secondary structure":"COLOR_MODE_SECSTR",
"Blend through model":"COLOR_MODE_BLEND",
"Residue type":"COLOR_MODE_RESIDUETYPE",
"Residue solvet accessiblity":"COLOR_MODE_RESIDUESOLVENTACCESS",
"Temperature factor":"COLOR_MODE_TEMPFAC",
"Occupancy":"COLOR_MODE_OCC",
"Charge":"COLOR_MODE_CHARGE",
"Alternate location":"COLOR_MODE_ALTLOC",
"Atom solvet accessiblity":"COLOR_MODE_ATOMSOLVENTACCESS",
"By NMR model":"COLOR_MODE_MODEL",
};
;

export {ColourScheme, contactsToLinesInfo, singletonsToLinesInfo, atomsToSpheresInfo, contactsToCylindersInfo, getMultipleBonds, contactsToCappedCylindersInfo, getBaseBlocks, getGlycoBlocks, getMultipleBondsLines, getMultipleBondsCylinders, displayStyles, colourStyles, objectsFromAtomColourStyle};
