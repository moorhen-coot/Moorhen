import * as vec3 from 'gl-matrix/vec3';
import * as vec4 from 'gl-matrix/vec4';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
//import {vec3} from 'gl-matrix/esm';
// C++ from which this is derived written by Liz Potterton, University of York.

function NormalizeVec3(v){
    let vin = vec3Create(v);
    vec3.normalize(v,vin);
}

function vec3Cross(v1,v2,out){
    vec3.cross(out,v1,v2);
}

function vec3Subtract(v1,v2,out){
    vec3.subtract(out,v1,v2);
}

function vec3Create(v){
    var theVec = vec3.create();
    vec3.set(theVec,v[0],v[1],v[2],v[3]);
    return theVec;
}

function isMainchainHBond ( res1, res2 ) {
    //  Test if there is main chain Hbond between PCRes1 (donor) and
    //  PCRes2 (acceptor).
    //  As defined Kabsch & Sanders
    //  This probably needs the option of supporting alternative criteria

    let NOmaxdist2 = 12.25;

    var NAtom,OAtom,Atom;
    var abx,aby,abz;
    var acx,acy,acz;
    var bcx,bcy,bcz;
    var absq,acsq,bcsq;

    NAtom = res1.getAtomTrimmed( "N" );
    OAtom = res2.getAtomTrimmed( "O" );
    Atom  = res2.getAtomTrimmed( "C" );

    if (NAtom && OAtom && Atom)  {

        abx = OAtom["_atom_site.Cartn_x"] - NAtom["_atom_site.Cartn_x"];
        aby = OAtom["_atom_site.Cartn_y"] - NAtom["_atom_site.Cartn_y"];
        abz = OAtom["_atom_site.Cartn_z"] - NAtom["_atom_site.Cartn_z"];
        absq = abx*abx + aby*aby + abz*abz;

        if (absq<=NOmaxdist2)  {

            acx = NAtom["_atom_site.Cartn_x"] - Atom["_atom_site.Cartn_x"];
            acy = NAtom["_atom_site.Cartn_y"] - Atom["_atom_site.Cartn_y"];
            acz = NAtom["_atom_site.Cartn_z"] - Atom["_atom_site.Cartn_z"];

            bcx = Atom["_atom_site.Cartn_x"] - OAtom["_atom_site.Cartn_x"];
            bcy = Atom["_atom_site.Cartn_y"] - OAtom["_atom_site.Cartn_y"];
            bcz = Atom["_atom_site.Cartn_z"] - OAtom["_atom_site.Cartn_z"];

            acsq = acx*acx + acy*acy + acz*acz;
            bcsq = bcx*bcx + bcy*bcy + bcz*bcz;

            return (Math.acos((bcsq+absq-acsq)/(2.0*Math.sqrt(bcsq*absq)))>=Math.PI/2.0);

        }

    }

    return false;

}

function  PrintSecStructure ( hier )  {
    for(let im=0;im<hier.length;im++){
        let chains = hier[im].chains;
        for(let ic=0;ic<chains.length;ic++){
            let residues = chains[ic].residues;
            for (let i=0;i<residues.length;i++) {
                if(residues[i].getAtomTrimmed( "CA" )){
                    console.log(residues[i].getSeqID()+" "+residues[i].getName()+" "+residues[i]["SSE"]);
                }
            }
        }
    }
}

function  CalcSecStructure ( hier, flagBulge )  {
    // FIXME - Should be over *close* residues (CA distance) not all.

    // FIXME - do this with AssignHBTypes too
    if(hier.length>0&&typeof(hier[0].hasSecStr)!=="undefined"&&hier[0].hasSecStr&&typeof(hier[0].secStrFlagBulge)!=="undefined"&&hier[0].secStrFlagBulge===flagBulge){
        return;
    }
    if(hier.length>0){
        hier[0].hasSecStr = true;
        hier[0].secStrFlagBulge = flagBulge;
    }

    // FIXME - getAtomTrimmed is slow! Trimming is slow.
    let hbonds = [];
    let hbond_atoms = [];

    var j,k;
    for(let im=0;im<hier.length;im++){
        let chains = hier[im].chains;
        for(let ic=0;ic<chains.length;ic++){
            let residues = chains[ic].residues;
            for(let ir=0;ir<residues.length;ir++){
                residues[ir]["SSE"] = "";
                hbonds.push([]);
                hbond_atoms.push([]);
                for (j=0;j<6;j++) hbond_atoms[ir][j] = null;
                for (j=0;j<3;j++) hbonds[ir][j] = 0;
            }
            // FIXME - Should be over *close* residues (CA distance) not all.
            for(let irp1=0;irp1<residues.length;irp1++){
                for(let irp2=0;irp2<residues.length;irp2++){
                    let ir1 = irp2;
                    let ir2 = irp1;
                    // FIXME - Not good enough!!!!! Ligands, solute, etc. Need to select properly ...
                    if(residues[ir1].getAtomTrimmed( "CA" )&&residues[ir2].getAtomTrimmed( "CA" )){
                        let irdif = ir1 - ir2;
                        if(irdif>2){
                            let isHbond = isMainchainHBond(residues[ir1],residues[ir2]);
                            if(isHbond){
                                k = 0;
                                while ((hbonds[ir1][k]!==0) && (k<2))  k++;
                                hbonds[ir1][k]   = -irdif;
                                hbond_atoms[ir1][k]   = residues[ir1].getAtomTrimmed( "N" );
                                hbond_atoms[ir1][k+3] = residues[ir2].getAtomTrimmed( "O" );
                                //console.log("HBOND 1st case: "+residues[ir1].getSeqID()+" "+residues[ir2].getSeqID());
                            }
                            isHbond = isMainchainHBond(residues[ir2],residues[ir1]);
                            if(isHbond){
                                k = 0;
                                while ((hbonds[ir2][k]!==0) && (k<2))  k++;
                                hbonds[ir2][k]   = irdif;
                                hbond_atoms[ir2][k]   = residues[ir2].getAtomTrimmed( "N" );
                                hbond_atoms[ir2][k+3] = residues[ir1].getAtomTrimmed( "O" );
                                //console.log("HBOND 2nd case: "+residues[ir2].getSeqID()+" "+residues[ir1].getSeqID());
                            }
                        }
                    }
                }
            }
            //  6. Assign the turns - if there is bifurcated bond then the 4-turn
            //     takes precedence - read the paper to make sense of this
            for (let i=0;i<residues.length;i++)  {
                if(residues[i].getAtomTrimmed( "CA" )){
                    k = 0;
                    while ((k<=2) && (hbonds[i][k]!==0))  {
                        if (hbonds[i][k]===-5)  {
                            residues[i-1]["SSE"] = "SSE_5Turn";
                            residues[i-2]["SSE"] = "SSE_5Turn";
                            residues[i-3]["SSE"] = "SSE_5Turn";
                            residues[i-4]["SSE"] = "SSE_5Turn";
                        }
                        if (hbonds[i][k]===-3)  {
                            residues[i-1]["SSE"] = "SSE_3Turn";
                            residues[i-2]["SSE"] = "SSE_3Turn";
                        }
                        k++;
                    }
                }
            }
            for (let i=0;i<residues.length;i++)  {
                if(residues[i].getAtomTrimmed( "CA" )){
                    k = 0;
                    while ((k<=2) && (hbonds[i][k]!==0))  {
                        if (hbonds[i][k]===-4)  {
                            residues[i-1]["SSE"] = "SSE_4Turn";
                            residues[i-2]["SSE"] = "SSE_4Turn";
                            residues[i-3]["SSE"] = "SSE_4Turn";
                        }
                        k++;
                    }
                }
            }
            //  7. Look for consecutive 4-turns which make alpha helix
            for (let i=1;i<residues.length-3;i++) {
                if(residues[i].getAtomTrimmed( "CA" )){
                    if (((residues[i]["SSE"]==="SSE_Helix") || (residues[i]["SSE"]==="SSE_4Turn")) &&
                            ((residues[i+1]["SSE"]==="SSE_Helix") || (residues[i+1]["SSE"]==="SSE_4Turn")) &&
                            ((residues[i+2]["SSE"]==="SSE_Helix") || (residues[i+2]["SSE"]==="SSE_4Turn")) &&
                            ((residues[i+3]["SSE"]==="SSE_Helix") || (residues[i+3]["SSE"]==="SSE_4Turn"))){
                        for (let j=i;j<=i+3;j++)  residues[j]["SSE"] = "SSE_Helix";
                    }
                }
            }


            for (let i=0;i<residues.length;i++)  {

                k = 0;
                while ((k<=2) && (hbonds[i][k]!==0))  {

                    let irdif = hbonds[i][k];
                    // Test for 'close' hbond
                    j = i + irdif;
                    let l = 0;
                    while ((l<=2) && (hbonds[j][l]!==0))  {
                        // Antiparallel strands
                        if (hbonds[j][l]===-irdif)  {
                            residues[i]["SSE"] = "SSE_Strand";
                            residues[j]["SSE"] = "SSE_Strand";
                        }
                        // Parallel strand
                        if (hbonds[j][l]===-irdif-2)  {
                            residues[i-1]["SSE"] = "SSE_Strand";
                            residues[j  ]["SSE"] = "SSE_Strand";
                        }
                        // Parallel beta bulge
                        if (hbonds[j][l]===-irdif-3)  {
                            if (flagBulge) {
                                if (residues[i-1]["SSE"]==="")  residues[i-1]["SSE"] = "SSE_Bulge";
                                if (residues[i-2]["SSE"]==="")  residues[i-2]["SSE"] = "SSE_Bulge";
                                if (residues[j  ]["SSE"]==="")  residues[j  ]["SSE"] = "SSE_Bulge";
                            } else  {
                                if (residues[i-1]["SSE"]==="")  residues[i-1]["SSE"] = "SSE_Strand";
                                if (residues[i-2]["SSE"]==="")  residues[i-2]["SSE"] = "SSE_Strand";
                                if (residues[j  ]["SSE"]==="")  residues[j  ]["SSE"] = "SSE_Strand";
                            }
                        }
                        l++;
                    }
                    // Test for 'wide' hbond
                    j = i + hbonds[i][k] + 2;
                    if (j<residues.length)  {
                        l = 0;
                        while ((l<=2) && (hbonds[j][l]!==0))  {
                            // Antiaprallel strands
                            if (hbonds[j][l]===-irdif-4)  {
                                residues[i-1]["SSE"] = "SSE_Strand";
                                residues[j-1]["SSE"] = "SSE_Strand";
                            }
                            // Parallel strands
                            if (hbonds[j][l]===-irdif-2)  {
                                residues[i  ]["SSE"] = "SSE_Strand";
                                residues[j-1]["SSE"] = "SSE_Strand";
                            }
                            l++;
                        }
                    }

                    // test for anti-parallel B-bulge between 'close' hbonds
                    j = i + hbonds[i][k] - 1;
                    if (j>=0)  {
                        l = 0;
                        while ((l<=2) && (hbonds[j][l]!==0))  {
                            if (hbonds[j][l]===-irdif+1)  {
                                if (flagBulge)  {
                                    if (residues[i  ]["SSE"]==="")  residues[i  ]["SSE"] = "SSE_Bulge";
                                    if (residues[j+1]["SSE"]==="")  residues[j+1]["SSE"] = "SSE_Bulge";
                                    if (residues[j  ]["SSE"]==="")  residues[j  ]["SSE"] = "SSE_Bulge";
                                } else  {
                                    if (residues[i  ]["SSE"]==="")  residues[i  ]["SSE"] = "SSE_Strand";
                                    if (residues[j+1]["SSE"]==="")  residues[j+1]["SSE"] = "SSE_Strand";
                                    if (residues[j  ]["SSE"]==="")  residues[j  ]["SSE"] = "SSE_Strand";
                                }
                            }
                            l++;
                        }
                    }

                    // test for anti-parallel B-bulge between 'wide' hbonds
                    j = i + hbonds[i][k] + 3;
                    if (j<residues.length)  {
                        l = 0;
                        while ((l<=2) && (hbonds[j][l]!==0))  {
                            if ((hbonds[j][l]===-irdif+5) && (i>0))  {
                                if (flagBulge)  {
                                    if (residues[i-1]["SSE"]==="")  residues[i-1]["SSE"] = "SSE_Bulge";
                                    if (residues[j-1]["SSE"]==="")  residues[j-1]["SSE"] = "SSE_Bulge";
                                    if (residues[j-2]["SSE"]==="")  residues[j-2]["SSE"] = "SSE_Bulge";
                                } else  {
                                    if (residues[i-1]["SSE"]==="")  residues[i-1]["SSE"] = "SSE_Strand";
                                    if (residues[j-1]["SSE"]==="")  residues[j-1]["SSE"] = "SSE_Strand";
                                    if (residues[j-2]["SSE"]==="")  residues[j-2]["SSE"] = "SSE_Strand";
                                }
                            } else if (hbonds[j][l]===-irdif-3)  {
                                // and bulge in parallel strand
                                if (flagBulge)  {
                                    if (residues[i  ]["SSE"]==="")  residues[i  ]["SSE"] = "SSE_Bulge";
                                    if (residues[j-1]["SSE"]==="")  residues[j-1]["SSE"] = "SSE_Bulge";
                                    if (residues[j-2]["SSE"]==="")  residues[j-2]["SSE"] = "SSE_Bulge";
                                }
                                else {
                                    if (residues[i  ]["SSE"]==="")  residues[i  ]["SSE"] = "SSE_Strand";
                                    if (residues[j-1]["SSE"]==="")  residues[j-1]["SSE"] = "SSE_Strand";
                                    if (residues[j-2]["SSE"]==="")  residues[j-2]["SSE"] = "SSE_Strand";
                                }
                            }
                            l++;
                        }
                    }
                    k++;

                } // Finish looping over Hbonds for residue (k loop)

            }  // Finish looping over residues ( i loop)

        }
    }
}

function GetSSE(hier){
    // FIXME - Ignores models.
    let sse = {};

    let thisHelices = [];
    let thisBulges = [];
    let chains = hier[0].chains;
    for(let ic=0;ic<chains.length;ic++){
        let thisTrace = [];
        let residues = chains[ic].residues;
        for(let ir=0;ir<residues.length;ir++){
            let ca = residues[ir].getAtomTrimmed( "CA" );
            if(ca&&ca.element().trim()==="C"){
                thisTrace.push([ca.x(),ca.y(),ca.z(),ca.residue["SSE"],ca.getSeqID()]);
            }
        }
        let helixStart = -1;
        let bulgeStart = -1;
        for(let ir=1;ir<thisTrace.length-1;ir++){
            let isHelix   = thisTrace[ir][3]==="SSE_Helix";
            let isHelixP1 = thisTrace[ir+1][3]==="SSE_Helix";
            let isHelixM1 = thisTrace[ir-1][3]==="SSE_Helix";
            let isBulge   = thisTrace[ir][3]==="SSE_Bulge" || thisTrace[ir][3]==="SSE_Strand";
            let isBulgeP1 = thisTrace[ir+1][3]==="SSE_Bulge" || thisTrace[ir+1][3]==="SSE_Strand";
            let isBulgeM1 = thisTrace[ir-1][3]==="SSE_Bulge" || thisTrace[ir-1][3]==="SSE_Strand";
            if(isHelix&&!isHelixM1){
                helixStart = thisTrace[ir][4];
            }
            if(isHelix&&isHelixM1&&ir===thisTrace.length-2){
                if(isHelixP1){
                    let endSel = ""+(parseInt(thisTrace[ir][4])+1);
                    let theSel = "/1"+"/"+chains[ic].getChainID()+"/"+helixStart+"-"+endSel;
                    thisHelices.push(theSel);
                } else {
                    let endSel = ""+(parseInt(thisTrace[ir][4]));
                    let theSel = "/1"+"/"+chains[ic].getChainID()+"/"+helixStart+"-"+endSel;
                    thisHelices.push(theSel);
                }
            }
            if(!isHelix&&isHelixM1){
                let endSel = ""+(parseInt(thisTrace[ir][4])-1);
                let theSel = "/1"+"/"+chains[ic].getChainID()+"/"+helixStart+"-"+endSel;
                thisHelices.push(theSel);
            }
            if(isBulge&&!isBulgeM1){
                bulgeStart = thisTrace[ir][4];
            }
            if(isBulge&&isBulgeM1&&ir===thisTrace.length-2){
                if(isBulgeP1){
                    let endSel = ""+(parseInt(thisTrace[ir][4])+1);
                    let theSel = "/1"+"/"+chains[ic].getChainID()+"/"+bulgeStart+"-"+endSel;
                    thisBulges.push(theSel);
                } else {
                    let endSel = ""+(parseInt(thisTrace[ir][4]));
                    let theSel = "/1"+"/"+chains[ic].getChainID()+"/"+bulgeStart+"-"+endSel;
                    thisBulges.push(theSel);
                }
            }
            if(!isBulge&&isBulgeM1){
                let endSel = ""+(parseInt(thisTrace[ir][4])-1);
                let theSel = "/1"+"/"+chains[ic].getChainID()+"/"+bulgeStart+"-"+endSel;
                thisBulges.push(theSel);
            }
        }
    }
    sse["helices"] = thisHelices;
    sse["strands"] = thisBulges;
    return sse;
}

function GetBfactorSplinesColoured(pdbatoms,atomColours){
    return GetSplinesColoured(pdbatoms,atomColours,true);
}

function GetWormColoured(pdbatoms,atomColours,useBFactor,modnum_in){

    // FIXME - models
    // FIXME - colouring
    let tri_info = [];

    let hier = pdbatoms["atoms"];
    let modnum = 0;

    if(typeof(modnum_in)!=="undefined"){
        modnum = modnum_in-1;
    }

    let splineInfo = hier[modnum].getTrace();

    //PrintSecStructure ( hier );

    let secStrInfo = hier[modnum].getTraceSecStr();
    let secStrAtoms = hier[modnum].getTraceSecStrAtoms();
    let secStrColours = hier[modnum].getTraceColours(atomColours);

    // Having nucleic acid makes things more tricky. The rules for drawing nice ribbons for CA traces
    // are easy: normal is cross product of vectors between current and previous, and current and next spline
    // points. That can all be done in mgWebGL. 
    // However, nucleic acids are more complicated, we get nice results by calculating normals based on
    // base planes. That we can only do here, then we have to send a set of custom normals to mgWebGL.
    // We can probably just send normals for the nucleic acid parts.
    let haveNucleic = false;
    for(let isp=0;isp<splineInfo.length&&!haveNucleic;isp++){
        for(let icol=0;icol<splineInfo[isp].length/3;icol++){
            let isNucleic = secStrInfo[isp][icol]==="SSE_Nucleic";
            if(isNucleic){
                haveNucleic = true;
                break;
            }
        }
    }

    let v1 = vec3.create();
    let v2 = vec3.create();
    let norm1 = vec3.create();
    let pmm = vec3.create();
    let n2_temp = vec3.create();

    let splineAccu = 8;
    let accuStep = 20;
    let splineLengthTot = 0;
    for(let isp=0;isp<splineInfo.length;isp++){
        splineLengthTot += splineInfo[isp].length;
    }
    if(splineLengthTot>6000){
        splineAccu = 8;
        accuStep = 30;
    }
    if(splineLengthTot>8000){
        splineAccu = 4;
        accuStep = 30;
    }
    if(splineLengthTot>30000){
        splineAccu = 2;
        accuStep = 60;
    }
    if(splineLengthTot>50000){
        splineAccu = 1;
        accuStep = 120;
    }

    for(let isp=0;isp<splineInfo.length;isp++){
        //console.log(splineInfo[isp].length);
        let col_tri_spl = [];
        for(let icol=0;icol<splineInfo[isp].length/3;icol++){
            for(let ip=0;ip<secStrColours[isp][icol].length;ip++) col_tri_spl.push(secStrColours[isp][icol][ip]);
        }
        let sizes_spl = [];

        let betaStart = -1;
        let betaStrands = [];
        let customNormals = [];

        for(let icol=0;icol<splineInfo[isp].length/3;icol++){
                    sizes_spl.push(0.2);
        }
        let spl_data = {};
        spl_data["vert_tri"] = [[splineInfo[isp]]];
        spl_data["arrow"] = [[betaStrands]];
        spl_data["col_tri"] = [[col_tri_spl]];
        spl_data["sizes"] = [[sizes_spl]];
        spl_data["prim_types"] = [["WORM"]];
        spl_data["norm_tri"] = [[[]]];
        spl_data["idx_tri"] = [[[]]];
        spl_data["customSplineNormals"] = [[customNormals]];

        spl_data["spline_accu"] = [[[splineAccu]]];
        spl_data["accu"] = [[[accuStep]]];

        //console.log(spl_data);

        tri_info.push(spl_data);

        if(typeof(useBFactor)!=="undefined"&&useBFactor){
            let bFacSizes = hier[0].getTraceBFactor();
            spl_data["sizes"] = [bFacSizes];
            spl_data["arrow"] = [[[]]];
            spl_data["prim_types"] = [["WORM"]];
        }
    }

    return tri_info;
}

function GetSplinesColoured(pdbatoms,atomColours,useBFactor,modnum_in){

    // FIXME - models
    // FIXME - colouring
    let tri_info = [];

    let hier = pdbatoms["atoms"];
    let modnum = 0;

    if(typeof(modnum_in)!=="undefined"){
        modnum = modnum_in-1;
    }

    let splineInfo = hier[modnum].getTrace();

    //PrintSecStructure ( hier );

    let secStrInfo = hier[modnum].getTraceSecStr();
    let secStrAtoms = hier[modnum].getTraceSecStrAtoms();
    let secStrColours = hier[modnum].getTraceColours(atomColours);

    // Having nucleic acid makes things more tricky. The rules for drawing nice ribbons for CA traces
    // are easy: normal is cross product of vectors between current and previous, and current and next spline
    // points. That can all be done in mgWebGL. 
    // However, nucleic acids are more complicated, we get nice results by calculating normals based on
    // base planes. That we can only do here, then we have to send a set of custom normals to mgWebGL.
    // We can probably just send normals for the nucleic acid parts.
    let haveNucleic = false;
    for(let isp=0;isp<splineInfo.length&&!haveNucleic;isp++){
        for(let icol=0;icol<splineInfo[isp].length/3;icol++){
            let isNucleic = secStrInfo[isp][icol]==="SSE_Nucleic";
            if(isNucleic){
                haveNucleic = true;
                break;
            }
        }
    }

    let v1 = vec3.create();
    let v2 = vec3.create();
    let norm1 = vec3.create();
    let pmm = vec3.create();
    let n2_temp = vec3.create();

    let splineAccu = 8;
    let accuStep = 20;
    let splineLengthTot = 0;
    for(let isp=0;isp<splineInfo.length;isp++){
        splineLengthTot += splineInfo[isp].length;
    }
    if(splineLengthTot>6000){
        splineAccu = 8;
        accuStep = 30;
    }
    if(splineLengthTot>8000){
        splineAccu = 4;
        accuStep = 30;
    }
    if(splineLengthTot>30000){
        splineAccu = 2;
        accuStep = 60;
    }
    if(splineLengthTot>50000){
        splineAccu = 1;
        accuStep = 120;
    }
    
    for(let isp=0;isp<splineInfo.length;isp++){
        let col_tri_spl = [];
        for(let icol=0;icol<splineInfo[isp].length/3;icol++){
            for(let ip=0;ip<secStrColours[isp][icol].length;ip++) col_tri_spl.push(secStrColours[isp][icol][ip]);
        }
        let sizes_spl = [];

        let betaStart = -1;
        let betaStrands = [];
        let customNormals = [];

        for(let icol=0;icol<splineInfo[isp].length/3;icol++){
            if((secStrInfo[isp][icol]==="SSE_Bulge"||secStrInfo[isp][icol]==="SSE_Strand")&&betaStart===-1){
                if(icol===0||(secStrInfo[isp][icol-1]!=="SSE_Bulge"&&secStrInfo[isp][icol-1]!=="SSE_Strand")){
                    betaStart = icol;
                }
            } else if((secStrInfo[isp][icol]!=="SSE_Bulge"&&secStrInfo[isp][icol]!=="SSE_Strand")) {
                if(betaStart>-1){
                    if(icol-betaStart>2){
                        betaStrands.push([betaStart,icol-1]);
                    }
                    betaStart = -1;
                }
            }
            if(icol===splineInfo[isp].length/3-1&&betaStart>-1) {
                betaStrands.push([betaStart,icol]);
            }
        }

        for(let icol=0;icol<splineInfo[isp].length/3;icol++){
            let isNucleic = secStrInfo[isp][icol]==="SSE_Nucleic";
            let isNucleicP1 = secStrInfo[isp][icol+1]==="SSE_Nucleic";
            let isNucleicP2 = secStrInfo[isp][icol+2]==="SSE_Nucleic";
            let isNucleicM1 = secStrInfo[isp][icol-1]==="SSE_Nucleic";
            let isNucleicM2 = secStrInfo[isp][icol-2]==="SSE_Nucleic";
            let isHelix = secStrInfo[isp][icol]==="SSE_Helix";
            let isHelixP1 = secStrInfo[isp][icol+1]==="SSE_Helix";
            let isHelixP2 = secStrInfo[isp][icol+2]==="SSE_Helix";
            let isHelixM1 = secStrInfo[isp][icol-1]==="SSE_Helix";
            let isHelixM2 = secStrInfo[isp][icol-2]==="SSE_Helix";
            let isBulge = secStrInfo[isp][icol]==="SSE_Bulge"||secStrInfo[isp][icol]==="SSE_Strand";
            let isBulgeP1 = secStrInfo[isp][icol+1]==="SSE_Bulge"||secStrInfo[isp][icol+1]==="SSE_Strand";
            let isBulgeP2 = secStrInfo[isp][icol+2]==="SSE_Bulge"||secStrInfo[isp][icol+2]==="SSE_Strand";
            let isBulgeM1 = secStrInfo[isp][icol-1]==="SSE_Bulge"||secStrInfo[isp][icol-1]==="SSE_Strand";
            let isBulgeM2 = secStrInfo[isp][icol-2]==="SSE_Bulge"||secStrInfo[isp][icol-2]==="SSE_Strand";
            if(isHelix||isBulge||isNucleic){
                if(((isHelixP1||isBulgeP1)&&(isHelixP2||isBulgeP2))||((isHelixM1||isBulgeM1)&&(isHelixP1||isBulgeP1))||((isHelixM1||isBulgeM1)&&(isHelixM2||isBulgeM2))){
                    sizes_spl.push(1.2);
                }else if((isNucleicP1&&isNucleicP2)||(isNucleicM1&&isNucleicP1)||(isNucleicM1&&isNucleicM2)){
                    sizes_spl.push(2.0);
                    if(haveNucleic){
                        let n1 = secStrAtoms[isp][icol].residue.getAtomTrimmed("N1");
                        let c2 = secStrAtoms[isp][icol].residue.getAtomTrimmed("C2");
                        let c4 = secStrAtoms[isp][icol].residue.getAtomTrimmed("C4");
                        let n9 = secStrAtoms[isp][icol].residue.getAtomTrimmed("N9");
                        let reverse = false;
                        if(n9&&secStrAtoms[isp][icol].residue.getName()==="EDA"){
                            reverse = true;
                        }
                        if(n1&&c2&&c4){
                            let n1_cart = vec3Create([n1.x(),n1.y(),n1.z()]);
                            let c2_cart = vec3Create([c2.x(),c2.y(),c2.z()]);
                            let c4_cart = vec3Create([c4.x(),c4.y(),c4.z()]);
                            vec3Subtract(n1_cart,c2_cart,v1);
                            vec3Subtract(n1_cart,c4_cart,v2);
                            NormalizeVec3(v1);
                            NormalizeVec3(v2);
                            vec3Cross(v1,v2,norm1);
                            if(secStrAtoms[isp][icol].residue.getName()==="PSU"){
                                let c1p = secStrAtoms[isp][icol].residue.getAtomTrimmed("C1*");
                                if(!c1p) c1p = secStrAtoms[isp][icol].residue.getAtomTrimmed("C1'");
                                let c2p = secStrAtoms[isp][icol].residue.getAtomTrimmed("C2*");
                                if(!c2p) c2p = secStrAtoms[isp][icol].residue.getAtomTrimmed("C2'");
                                if(c1p&&c2p){
                                    let c1c2 = vec3Create([c1p.x()-c2p.x(),c1p.y()-c2p.y(),c1p.z()-c2p.z()]);
                                    if(vec3.dot(c1c2,norm1)>0.0){
                                        reverse = true;
                                    }
                                }
                            }
                            if(reverse){
                                vec3.negate(norm1,norm1);
                            }
                            if((icol<splineInfo[isp].length/3-1)&&icol>0){
                                let atp1 = secStrAtoms[isp][icol+1];
                                let atm1 = secStrAtoms[isp][icol-1];
                                let posp1 = vec3Create([atp1.x(),atp1.y(),atp1.z()]);
                                let posm1 = vec3Create([atm1.x(),atm1.y(),atm1.z()]);
                                vec3Subtract(posp1,posm1,pmm);
                                NormalizeVec3(pmm);
                                vec3Cross(pmm,norm1,n2_temp);
                                vec3Cross(pmm,n2_temp,norm1);
                                if(vec3.dot(norm1,customNormals[customNormals.length-1])<0.0){
                                    vec3.negate(norm1,norm1);
                                }
                            } else if((icol<splineInfo[isp].length/3-1)&&icol===0) {
                                let atp = secStrAtoms[isp][icol];
                                let atp1 = secStrAtoms[isp][icol+1];
                                let pos = vec3Create([atp.x(),atp.y(),atp.z()]);
                                let posp1 = vec3Create([atp1.x(),atp1.y(),atp1.z()]);
                                vec3Subtract(posp1,pos,pmm);
                                NormalizeVec3(pmm);
                                vec3Cross(pmm,norm1,n2_temp);
                                vec3Cross(pmm,n2_temp,norm1);
                            } else if((icol===splineInfo[isp].length/3-1)&&icol>0){
                                let atp = secStrAtoms[isp][icol];
                                let atm1 = secStrAtoms[isp][icol-1];
                                let pos = vec3Create([atp.x(),atp.y(),atp.z()]);
                                let posm1 = vec3Create([atm1.x(),atm1.y(),atm1.z()]);
                                vec3Subtract(pos,posm1,pmm);
                                NormalizeVec3(pmm);
                                vec3Cross(pmm,norm1,n2_temp);
                                vec3Cross(pmm,n2_temp,norm1);
                                if(vec3.dot(norm1,customNormals[customNormals.length-1])<0.0){
                                    vec3.negate(norm1,norm1);
                                }
                            }
                            customNormals.push([norm1[0],norm1[1],norm1[2]]);
                        } else {
                            // This is a problem case!
                            customNormals.push([0.0,1.0,1.0]);
                        }
                    }
                }else{
                    sizes_spl.push(0.2);
                }
            }else{
                sizes_spl.push(0.2);
            }
        }
        let spl_data = {};
        spl_data["vert_tri"] = [[splineInfo[isp]]];
        spl_data["arrow"] = [[betaStrands]];
        spl_data["col_tri"] = [[col_tri_spl]];
        spl_data["sizes"] = [[sizes_spl]];
        spl_data["prim_types"] = [["SPLINE"]];
        spl_data["norm_tri"] = [[[]]];
        spl_data["idx_tri"] = [[[]]];
        spl_data["customSplineNormals"] = [[customNormals]];

        spl_data["spline_accu"] = [[[splineAccu]]];
        spl_data["accu"] = [[[accuStep]]];
        //console.log(spl_data);

        if(typeof(useBFactor)!=="undefined"&&useBFactor){
            let bFacSizes = hier[0].getTraceBFactor();
            spl_data["sizes"] = [bFacSizes];
            spl_data["arrow"] = [[[]]];
            spl_data["prim_types"] = [["WORM"]];
        }

        tri_info.push(spl_data);
    }

    return tri_info;
}

export {isMainchainHBond,PrintSecStructure,CalcSecStructure,GetSSE,GetBfactorSplinesColoured,GetWormColoured,GetSplinesColoured};
