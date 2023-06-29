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

export {atomsToSpheresInfo };
