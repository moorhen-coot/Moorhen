function addSymmetry(pdbatoms){
    var hier = pdbatoms["atoms"];
    console.log(pdbatoms["cryst"]);
    console.log(pdbatoms["cryst"]["sg"]);

    var symops = getSymOpsFromSpGrpName(pdbatoms["cryst"]["sg"]);
    console.log(symops);

    var symmats = [];
    var invmats = [];
    for(var i=0;i<symops.length;i++){
        var mat = getMatrixFromSymOp(symops[i]);
        var invMat = mat4.create();
        mat4.inverse(mat,invMat);
        symmats.push(mat);
        invmats.push(invMat);
    }

    var cell = pdbatoms["cryst"]["cell"];
    console.log(cell);
    var RF = cell.matrix_frac;
    var RO = cell.matrix_orth;

    var centre = [-hier[0].centre()[0],-hier[0].centre()[1],-hier[0].centre()[2]];
    pdbatoms["symmetry"] = {"RO":RO,"RF":RF,"symmats":symmats,"radius":150.0,"centre":centre};
}

function insertAnisou(atoms,anisou){
    for(var j=0;j<anisou.length;j++){
        for(var i=0;i<atoms.length;i++){
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
//MN I have added expoer of this function since it is useful when generating a file containing a selection from an existing object
export function atomsToHierarchy(atoms){
    var atomsNew = atoms;
    if(atoms.length>0){
        var models = [];
        var model = new Model();
        var chain = new Chain();
        var residue = new Residue();
        residue.addAtom(atoms[0]);
        chain.addResidue(residue);
        model.addChain(chain);
        models.push(model);

        for(var i=1;i<atoms.length;i++){
            if(atoms[i]["_atom_site.pdbx_PDB_model_num"]!=model.getModelNum()){
                model = new Model();
                chain = new Chain();
                residue = new Residue();
                residue.addAtom(atoms[i]);
                chain.addResidue(residue);
                model.addChain(chain);
                models.push(model);
            } else if(atoms[i]["_atom_site.label_asym_id"]!=chain.getChainID()){
                chain = new Chain();
                residue = new Residue();
                residue.addAtom(atoms[i]);
                chain.addResidue(residue);
                model.addChain(chain);
            } else if(atoms[i].getSeqID()!=residue.getSeqID()||atoms[i].getSeqIDAuth()!=residue.getSeqIDAuth()){
                residue = new Residue();
                residue.addAtom(atoms[i]);
                chain.addResidue(residue);
            } else {
                residue.addAtom(atoms[i]);
            }
        }

    }

    //This helps us with spline colouring.
    for(var imod=0;imod<models.length;imod++){
        models[imod].hierarchy = models;
    }

    return models;
}

function EnerLib() {
    var ener_lib_lines = ener_lib_cif.split("\n");
    var LIBATOM_FLOAT_PROPS = ["_lib_atom.weight","_lib_atom.vdw_radius","_lib_atom.vdwh_radius","_lib_atom.ion_radius","_lib_atom.surface_potential_charge"];
    var LIBATOM_INT_PROPS = ["_lib_atom.valency","_lib_atom.sp"];
    var libAtomTypes = [];
    var libAtomLines = getLoop(ener_lib_lines,"_lib_atom");
    this.enerLibAtoms = {};
    this.monLibBonds = {};
    this.monLibAtoms = {};
    for(var il=0;il<libAtomLines.length;il++){
        if(libAtomLines[il].substr(0,1)==="#"||libAtomLines[il].trim()===""){
            continue;
        } else if(libAtomLines[il].substr(0,1)==="_"){
            libAtomTypes.push(libAtomLines[il]);
        } else {
            var split = splitQuotedCIFString(libAtomLines[il]);
            if(split[0]!=="."){
                var atom = {};
                for(var iprop=0;iprop<split.length;iprop++){
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

EnerLib.prototype.addCIFBondTypes = function (resname,cif) {
    var ener_lib_lines = cif.split("\n");
    var LIBATOM_FLOAT_PROPS = [];
    var LIBATOM_INT_PROPS = [];
    var libAtomTypes = [];
    var libAtomLines = getLoop(ener_lib_lines,"_chem_comp_bond");
    this.monLibBonds[resname] = [];
    for(var il=0;il<libAtomLines.length;il++){
        // We are only interested in bond_id, atom_id and type, so we do not worry about float and int types.
        if(libAtomLines[il].substr(0,1)==="#"||libAtomLines[il].trim()===""){
            continue;
        } else if(libAtomLines[il].substr(0,1)==="_"){
            libAtomTypes.push(libAtomLines[il]);
        } else {
            //var split = splitQuotedCIFString(libAtomLines[il]);
            var split = libAtomLines[il].match(/(?:[^\s"]+|"[^"]*")+/g);
            if(split[0]!=="."){
                var bond = {};
                for(var iprop=0;iprop<split.length;iprop++){
                    bond[libAtomTypes[iprop]] = split[iprop];
                }
                if(typeof(bond["_chem_comp_bond.type"])!=="undefined"&&bond["_chem_comp_bond.type"].length>0&&typeof(bond["_chem_comp_bond.comp_id"])!=="undefined"&&bond["_chem_comp_bond.comp_id"].length>0&&typeof(bond["_chem_comp_bond.atom_id_1"])!=="undefined"&&bond["_chem_comp_bond.atom_id_1"].length>0&&typeof(bond["_chem_comp_bond.atom_id_2"])!=="undefined"&&bond["_chem_comp_bond.atom_id_2"].length>0){
                    this.monLibBonds[resname].push(bond);
                } else if(typeof(bond["_chem_comp_bond.value_order"])!=="undefined"&&bond["_chem_comp_bond.value_order"].length>0&&typeof(bond["_chem_comp_bond.comp_id"])!=="undefined"&&bond["_chem_comp_bond.comp_id"].length>0&&typeof(bond["_chem_comp_bond.atom_id_1"])!=="undefined"&&bond["_chem_comp_bond.atom_id_1"].length>0&&typeof(bond["_chem_comp_bond.atom_id_2"])!=="undefined"&&bond["_chem_comp_bond.atom_id_2"].length>0){
                    if(bond["_chem_comp_bond.pdbx_aromatic_flag"]==="Y"){
                        bond["_chem_comp_bond.type"] = "aromatic";
                    } else if(bond["_chem_comp_bond.value_order"]==="SING"){
                        bond["_chem_comp_bond.type"] = "single";
                    } else if(bond["_chem_comp_bond.value_order"]==="DOUB"){
                        bond["_chem_comp_bond.type"] = "double";
                    } else if(bond["_chem_comp_bond.value_order"]==="TRIP"){
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
    
EnerLib.prototype.getMonIDFromCIF = function (cif) {
    var ener_lib_lines = cif.split("\n");
    var libIDTypes = [];
    var libIDLines = getLoop(ener_lib_lines,"_chem_comp");
    for(var il=0;il<libIDLines.length;il++){
        if(libIDLines[il].substr(0,1)==="#"||libIDLines[il].trim()===""){
            continue;
        } else if(libIDLines[il].substr(0,1)==="_"){
            libIDTypes.push(libIDLines[il]);
        } else {
            //var split = splitQuotedCIFString(libIDLines[il]);
            var split = [];
            if(libIDLines[il].indexOf("'")>-1&&((libIDLines[il].indexOf("'")<libIDLines[il].indexOf('"'))||libIDLines[il].indexOf('"')==-1)){
                split = libIDLines[il].match(/(?:[^\s']+|'[^']*')+/g);
            } else {
                split = libIDLines[il].match(/(?:[^\s"]+|"[^"]*")+/g);
            }
            if(split.length===libIDTypes.length){
                for(var i=0;i<split.length;i++){
                    if(libIDTypes[i]==="_chem_comp.id"){
                        return split[i];
                    }
                }
            }
        }
    }

    for(il=0;il<ener_lib_lines.length;il++){
        if(ener_lib_lines[il].substring(0,13)==="_chem_comp.id"){
            var split = splitQuotedCIFString(ener_lib_lines[il]);
            return split[1];
        }
    }

    return null;
}

EnerLib.prototype.addCIFAtomTypes = function (resname,cif) {

    var ener_lib_lines = cif.split("\n");
    var LIBATOM_FLOAT_PROPS = [];
    var LIBATOM_INT_PROPS = [];
    var libAtomTypes = [];
    var libAtomLines = getLoop(ener_lib_lines,"_chem_comp_atom");
    this.monLibAtoms[resname] = {};
    for(var il=0;il<libAtomLines.length;il++){
        // We are only interested in atom_id and type_energy, so we do not worry about float and int types.
        if(libAtomLines[il].substr(0,1)==="#"||libAtomLines[il].trim()===""){
            continue;
        } else if(libAtomLines[il].substr(0,1)==="_"){
            libAtomTypes.push(libAtomLines[il]);
        } else {
            var split = splitQuotedCIFString(libAtomLines[il]);
            if(split[0]!=="."){
                var atom = {};
                for(var iprop=0;iprop<split.length;iprop++){
                    atom[libAtomTypes[iprop]] = split[iprop];
                }
                if(typeof(atom["_chem_comp_atom.atom_id"])!=="undefined"&&atom["_chem_comp_atom.atom_id"].length>0&&typeof(atom["_chem_comp_atom.type_energy"])!=="undefined"&&atom["_chem_comp_atom.type_energy"].length>0){
                    this.monLibAtoms[resname][atom["_chem_comp_atom.atom_id"]] = atom["_chem_comp_atom.type_energy"];
                }
            }
        }
    }
}

EnerLib.prototype.loadAminoAcidAtomTypes = function () {
    var aminoAcids = Model.prototype.aminoResidues;
    for(var ia=0;ia<aminoAcids.length;ia++){
        var ener_lib_lines = monomers[aminoAcids[ia]].split("\n");
        var LIBATOM_FLOAT_PROPS = [];
        var LIBATOM_INT_PROPS = [];
        var libAtomTypes = [];
        var libAtomLines = getLoop(ener_lib_lines,"_chem_comp_atom");
        this.monLibAtoms[aminoAcids[ia]] = {};
        for(var il=0;il<libAtomLines.length;il++){
            // We are only interested in atom_id and type_energy, so we do not worry about float and int types.
            if(libAtomLines[il].substr(0,1)==="#"||libAtomLines[il].trim()===""){
                continue;
            } else if(libAtomLines[il].substr(0,1)==="_"){
                libAtomTypes.push(libAtomLines[il]);
            } else {
                var split = splitQuotedCIFString(libAtomLines[il]);
                if(split[0]!=="."){
                    var atom = {};
                    for(var iprop=0;iprop<split.length;iprop++){
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

EnerLib.prototype.AssignHBTypes = function (atoms,bruteForce){
    if(typeof(atoms.assignedHBTypes)!=="undefined"&&atoms.assignedHBTypes){
        return;
    }
    atoms.assignedHBTypes = true;
    for(var i=0;i<atoms.atoms.length;i++){
        var modelAtoms = atoms.atoms[i].getAllAtoms();
        for(iat=0;iat<modelAtoms.length;iat++){
            var atType = modelAtoms[iat]["_atom_site.label_atom_id"];
            if(bruteForce){
                if(modelAtoms[iat].element()==="N"||modelAtoms[iat].element()==="O"||modelAtoms[iat].element()==="S"||modelAtoms[iat].element()==="F") {
                    modelAtoms[iat]["_ccp4mg_hb_type"] = "B";
                }
            } else if(typeof(this.monLibAtoms[modelAtoms[iat].residue.getName()])!=="undefined") {
                if(typeof(this.monLibAtoms[modelAtoms[iat].residue.getName()][atType])!=="undefined"){
                    var aliasType = this.monLibAtoms[modelAtoms[iat].residue.getName()][atType];
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

EnerLib.prototype.AssignVDWRadii = function (atoms){
    if(typeof(atoms.assignedVDWRadii)!=="undefined"&&atoms.assignedVDWRadii){
        return;
    }
    atoms.assignedVDWRadii = true;
    for(var i=0;i<atoms.atoms.length;i++){
        var modelAtoms = atoms.atoms[i].getAllAtoms();
        for(iat=0;iat<modelAtoms.length;iat++){
            var atSymbol = modelAtoms[iat]["_atom_site.type_symbol"];
            //FIXME - Eugh! Can have C atoms named CM1, etc. and be confused with Cm. Sigh, use element if we have it.
            var atType = modelAtoms[iat]["_atom_site.label_atom_id"];
            if(typeof(this.monLibAtoms[modelAtoms[iat].residue.getName()])!=="undefined") {
                if(typeof(this.monLibAtoms[modelAtoms[iat].residue.getName()][atType])!=="undefined"){
                    var aliasType = this.monLibAtoms[modelAtoms[iat].residue.getName()][atType];
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
                var firstDigit = atType.match(/\d/);
                var firstDigitPos = atType.indexOf(firstDigit);
                if(firstDigitPos>0){
                    var elName = atType.substr(0,firstDigitPos);
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


function Model() {
    this.chains = [];
    this.hasBonds = false;
    this.hbonds = [];
    this.selection_cache = {};
    this.glycan_cache = {};
}

Model.prototype.SeekContactsNew = function (atoms,atoms2,mindist,maxdist) {

    //var junk = this.SeekContactsSimple(atoms,atoms2,mindist,maxdist);

    var minsq = mindist * mindist;
    var maxsq = maxdist * maxdist;
    var contacts = [];

    //FIXME - We should be able to cope with 1 by non-bricking method.
    if(atoms.length===1||atoms2.length===1) return contacts;

    var abs = Math.abs;
    var sqrt = Math.sqrt;

    var minsq = mindist * mindist;
    var maxsq = maxdist * maxdist;

    var len = atoms.length;
    var len2 = atoms2.length;

    if(maxdist<mindist||len===0||len2===0) return contacts;

    var start = new Date().getTime();
    var minx = 1e+6;
    var miny = 1e+6;
    var minz = 1e+6;
    var maxx = -1e+6;
    var maxy = -1e+6;
    var maxz = -1e+6;
    for(var iat1=0;iat1<len;iat1++){
        var at1 = atoms[iat1];
        var at1x = at1["_atom_site.Cartn_x"];
        var at1y = at1["_atom_site.Cartn_y"];
        var at1z = at1["_atom_site.Cartn_z"];
        if(at1x>maxx) maxx = at1x;
        if(at1x<minx) minx = at1x;
        if(at1y>maxy) maxy = at1y;
        if(at1y<miny) miny = at1y;
        if(at1z>maxz) maxz = at1z;
        if(at1z<minz) minz = at1z;

    }
    for(var iat2=0;iat2<len2;iat2++){
        var at2 = atoms2[iat2];
        var at2x = at2["_atom_site.Cartn_x"];
        var at2y = at2["_atom_site.Cartn_y"];
        var at2z = at2["_atom_site.Cartn_z"];
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

    var brickSize = 6.0;

    var nbricks_x = parseInt((maxx - minx)/brickSize) + 1;
    var nbricks_y = parseInt((maxy - miny)/brickSize) + 1;
    var nbricks_z = parseInt((maxz - minz)/brickSize) + 1;
    var x_brick = (maxx - minx)/nbricks_x;
    var y_brick = (maxy - miny)/nbricks_y;
    var z_brick = (maxz - minz)/nbricks_z;

    //console.log(nbricks_x);
    //console.log(nbricks_y);
    //console.log(nbricks_z);

    var bricks = [];
    var bricks2 = [];

    for(var zidx=0;zidx<nbricks_z;zidx++){
        for(var yidx=0;yidx<nbricks_y;yidx++){
            for(var xidx=0;xidx<nbricks_x;xidx++){
                var idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                bricks[idx] = [];
                bricks2[idx] = [];
            }
        }
    }

    var nbonds = 0;
    for(var iat1=0;iat1<len;iat1++){
        var at1 = atoms[iat1];
        var at1x = at1["_atom_site.Cartn_x"];
        var at1y = at1["_atom_site.Cartn_y"];
        var at1z = at1["_atom_site.Cartn_z"];
        var xdiff = at1x - minx;
        var ydiff = at1y - miny;
        var zdiff = at1z - minz;
        var xidx = parseInt(xdiff/x_brick);
        var yidx = parseInt(ydiff/y_brick);
        var zidx = parseInt(zdiff/z_brick);
        if(xidx>=nbricks_x) xidx = nbricks_x - 1;
        if(yidx>=nbricks_y) yidx = nbricks_y - 1;
        if(zidx>=nbricks_z) zidx = nbricks_z - 1;
        var idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
        bricks[idx].push(at1);
    }
    for(var iat2=0;iat2<len2;iat2++){
        var at2 = atoms2[iat2];
        var at2x = at2["_atom_site.Cartn_x"];
        var at2y = at2["_atom_site.Cartn_y"];
        var at2z = at2["_atom_site.Cartn_z"];
        var xdiff = at2x - minx;
        var ydiff = at2y - miny;
        var zdiff = at2z - minz;
        var xidx = parseInt(xdiff/x_brick);
        var yidx = parseInt(ydiff/y_brick);
        var zidx = parseInt(zdiff/z_brick);
        if(xidx>=nbricks_x) xidx = nbricks_x - 1;
        if(yidx>=nbricks_y) yidx = nbricks_y - 1;
        if(zidx>=nbricks_z) zidx = nbricks_z - 1;
        var idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
        bricks2[idx].push(at2);
    }

    for(var zidx=0;zidx<nbricks_z;zidx++){
        for(var yidx=0;yidx<nbricks_y;yidx++){
            for(var xidx=0;xidx<nbricks_x;xidx++){

                var idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                var lenBrick = bricks[idx].length;

                function GetBrickContacts(idx2){
                    var lenBrick2 = bricks2[idx2].length;
                    //console.log(lenBrick+" "+lenBrick2);
                    //console.log(len+" "+len2);
                    for(var iat1=0;iat1<lenBrick;iat1++){
                        var at1 = bricks[idx][iat1];
                        var at1x = at1["_atom_site.Cartn_x"];
                        var at1y = at1["_atom_site.Cartn_y"];
                        var at1z = at1["_atom_site.Cartn_z"];
                        for(var iat2=0;iat2<lenBrick2;iat2++){
                            var at2  = bricks2[idx2][iat2];
                            var at2x = at2["_atom_site.Cartn_x"];
                            var at1at2x = abs(at1x-at2x);
                            if(at1at2x<=maxdist){
                                var at2y = at2["_atom_site.Cartn_y"];
                                var at1at2y = abs(at1y-at2y);
                                if(at1at2y<=maxdist){
                                    var at2z = at2["_atom_site.Cartn_z"];
                                    var at1at2z = abs(at1z-at2z);
                                    if(at1at2z<=maxdist){
                                        var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                                        if (distsq >= minsq && distsq <= maxsq){
                                            nbonds++;
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
                GetBrickContacts(idx);
                // -z
                if(zidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                    GetBrickContacts(idx2);
                }
                // +z
                if(zidx<nbricks_z-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                    GetBrickContacts(idx2);
                }
                // -y
                if(yidx>0){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickContacts(idx2);
                }
                // +y
                if(yidx<nbricks_y-1){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickContacts(idx2);
                }
                // -x
                if(xidx>0){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx-1;
                    GetBrickContacts(idx2);
                }
                // +x
                if(xidx<nbricks_x-1){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx+1;
                    GetBrickContacts(idx2);
                }
                // -z-y
                if(zidx>0&&yidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickContacts(idx2);
                }
                // -z+y
                if(zidx>0&&yidx<nbricks_y-1){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickContacts(idx2);
                }
                // +z-y
                if(zidx<nbricks_z-1&&yidx>0){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickContacts(idx2);
                }
                // +z+y
                if(zidx<nbricks_z-1&&yidx<nbricks_y-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickContacts(idx2);
                }
                // -z-x
                if(zidx>0&&xidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2);
                }
                // -z+x
                if(zidx>0&&xidx<nbricks_x-1){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2);
                }
                // +z-x
                if(zidx<nbricks_z-1&&xidx>0){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2);
                }
                // +z+x
                if(zidx<nbricks_z-1&&xidx<nbricks_x-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2);
                }
                // -y-x
                if(yidx>0&&xidx>0){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2);
                }
                // -y+x
                if(yidx>0&&xidx<nbricks_x-1){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2);
                }
                // +y-x
                if(yidx<nbricks_y-1&&xidx>0){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2);
                }
                // +y+x
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2);
                }
                // -y-x+z
                if(yidx>0&&xidx>0&&zidx<nbricks_z-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2);
                }
                // -y+x+z
                if(yidx>0&&xidx<nbricks_x-1&&zidx<nbricks_z-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2);
                }
                // +y-x+z
                if(yidx<nbricks_y-1&&xidx>0&&zidx<nbricks_z-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2);
                }
                // +y+x+z
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1&&zidx<nbricks_z-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2);
                }
                // -y-x-z
                if(yidx>0&&xidx>0&&zidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2);
                }
                // -y+x-z
                if(yidx>0&&xidx<nbricks_x-1&&zidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2);
                }
                // +y-x-z
                if(yidx<nbricks_y-1&&xidx>0&&zidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickContacts(idx2);
                }
                // +y+x-z
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1&&zidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickContacts(idx2);
                }
            }
        }
    }

    function fixAltLocs(acontact){
        var at1 = acontact[1];
        var altLoc = at1["_atom_site.label_alt_id"];
        if(altLoc!=="*"&&altLoc!=="?"&&altLoc!==" "&&altLoc!=="."){
            var at2  = acontact[2];
            var altLoc2 = at2["_atom_site.label_alt_id"];
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
    console.log("Added "+nbonds+" contacts");

    //console.log(bricks);

    return contacts;
    
}

Model.prototype.getBondsContactsAndSingletons = function (atomsIn) {
    this.calculateBondsNew();

    var contacts = [];
    var singletons = [];

    var atoms;
    if(typeof(atomsIn)==="undefined"){
        atoms = this.getAllAtoms();
    } else {
        atoms = atomsIn;
    }

    var len = atoms.length;
    for(var iat1=0;iat1<len;iat1++){
        var at1 = atoms[iat1];
        var bonds = at1.bonds;
        var lenbonds = bonds.length;
        for(var j=0;j<lenbonds;j++){
            var at2 = bonds[j];
            contacts.push([1.0,at1,at2]);
        }
        if(lenbonds===0){
            singletons.push(at1);
        }
    }
    var ret = {};
    ret["contacts"] = contacts;
    ret["singletons"] = singletons;
    return ret;
}

Model.prototype.calculateBondsNew = function () {

    if(this.hasBonds){
        return;
    }

    var abs = Math.abs;

    var mindist = 0.6;
    var maxdist = 1.8;
    var minsq = mindist * mindist;
    var maxsq = maxdist * maxdist;

    var atoms = this.getAllAtoms();
    var len = atoms.length;

    var start = new Date().getTime();
    var minx = 1e+6;
    var miny = 1e+6;
    var minz = 1e+6;
    var maxx = -1e+6;
    var maxy = -1e+6;
    var maxz = -1e+6;
    for(var iat1=0;iat1<len;iat1++){
        var at1 = atoms[iat1];
        var at1x = at1["_atom_site.Cartn_x"];
        var at1y = at1["_atom_site.Cartn_y"];
        var at1z = at1["_atom_site.Cartn_z"];
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

    var brickSize = 6.0;

    var nbricks_x = parseInt((maxx - minx)/brickSize) + 1;
    var nbricks_y = parseInt((maxy - miny)/brickSize) + 1;
    var nbricks_z = parseInt((maxz - minz)/brickSize) + 1;
    var x_brick = (maxx - minx)/nbricks_x;
    var y_brick = (maxy - miny)/nbricks_y;
    var z_brick = (maxz - minz)/nbricks_z;

    //console.log(nbricks_x);
    //console.log(nbricks_y);
    //console.log(nbricks_z);

    var bricks = [];

    for(var zidx=0;zidx<nbricks_z;zidx++){
        for(var yidx=0;yidx<nbricks_y;yidx++){
            for(var xidx=0;xidx<nbricks_x;xidx++){
                var idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                bricks[idx] = [];
            }
        }
    }

    var nbonds = 0;
    for(var iat1=0;iat1<len;iat1++){
        var at1 = atoms[iat1];
        var at1x = at1["_atom_site.Cartn_x"];
        var at1y = at1["_atom_site.Cartn_y"];
        var at1z = at1["_atom_site.Cartn_z"];
        var xdiff = at1x - minx;
        var ydiff = at1y - miny;
        var zdiff = at1z - minz;
        var xidx = parseInt(xdiff/x_brick);
        var yidx = parseInt(ydiff/y_brick);
        var zidx = parseInt(zdiff/z_brick);
        if(xidx>=nbricks_x) xidx = nbricks_x - 1;
        if(yidx>=nbricks_y) yidx = nbricks_y - 1;
        if(zidx>=nbricks_z) zidx = nbricks_z - 1;
        var idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
        bricks[idx].push(at1);
    }

    for(var zidx=0;zidx<nbricks_z;zidx++){
        for(var yidx=0;yidx<nbricks_y;yidx++){
            for(var xidx=0;xidx<nbricks_x;xidx++){

                var idx = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx; // FIXME ??? SHOULD THIS NOT BE nbricks_x*nbricks_y ??? And 2 cases above.
                var lenBrick = bricks[idx].length;
                for(var iat1=0;iat1<lenBrick;iat1++){
                    var at1 = bricks[idx][iat1];
                    var at1x = at1["_atom_site.Cartn_x"];
                    var at1y = at1["_atom_site.Cartn_y"];
                    var at1z = at1["_atom_site.Cartn_z"];
                    for(var iat2=iat1+1;iat2<lenBrick;iat2++){
                        var at2  = bricks[idx][iat2];
                        var at2x = at2["_atom_site.Cartn_x"];
                        var at1at2x = abs(at1x-at2x);
                        if(at1at2x<=maxdist){
                            var at2y = at2["_atom_site.Cartn_y"];
                            var at1at2y = abs(at1y-at2y);
                            if(at1at2y<=maxdist){
                                var at2z = at2["_atom_site.Cartn_z"];
                                var at1at2z = abs(at1z-at2z);
                                if(at1at2z<=maxdist){
                                    var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                                    if (distsq >= minsq && distsq <= maxsq){
                                        var aLoc1 = at1["_atom_site.label_alt_id"];
                                        var aLoc2 = at2["_atom_site.label_alt_id"];
                                        if((aLoc1==="*"||aLoc1==="?"||aLoc1===" "||aLoc1===".")||(aLoc2==="*"||aLoc2==="?"||aLoc2===" "||aLoc2===".")||(aLoc2===aLoc1)){
                                            nbonds++;
                                            at1.bonds.push(at2);
                                            at2.bonds.push(at1);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                function GetBrickBonds(idx2){
                    var lenBrick2 = bricks[idx2].length;
                    for(var iat1=0;iat1<lenBrick;iat1++){
                        var at1 = bricks[idx][iat1];
                        var at1x = at1["_atom_site.Cartn_x"];
                        var at1y = at1["_atom_site.Cartn_y"];
                        var at1z = at1["_atom_site.Cartn_z"];
                        for(var iat2=0;iat2<lenBrick2;iat2++){
                            var at2  = bricks[idx2][iat2];
                            var at2x = at2["_atom_site.Cartn_x"];
                            var at1at2x = abs(at1x-at2x);
                            if(at1at2x<=maxdist){
                                var at2y = at2["_atom_site.Cartn_y"];
                                var at1at2y = abs(at1y-at2y);
                                if(at1at2y<=maxdist){
                                    var at2z = at2["_atom_site.Cartn_z"];
                                    var at1at2z = abs(at1z-at2z);
                                    if(at1at2z<=maxdist){
                                        var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                                        if (distsq >= minsq && distsq <= maxsq){
                                            var aLoc1 = at1["_atom_site.label_alt_id"];
                                            var aLoc2 = at2["_atom_site.label_alt_id"];
                                            if((aLoc1==="*"||aLoc1==="?"||aLoc1===" "||aLoc1===".")||(aLoc2==="*"||aLoc2==="?"||aLoc2===" "||aLoc2===".")||(aLoc2===aLoc1)){
                                                nbonds++;
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
                // -z
                if(zidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // +z
                if(zidx<nbricks_z-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // -y
                if(yidx>0){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // +y
                if(yidx<nbricks_y-1){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // -x
                if(xidx>0){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx-1;
                    GetBrickBonds(idx2);
                }
                // +x
                if(xidx<nbricks_x-1){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx+1;
                    GetBrickBonds(idx2);
                }
                // -z-y
                if(zidx>0&&yidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // -z+y
                if(zidx>0&&yidx<nbricks_y-1){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // +z-y
                if(zidx<nbricks_z-1&&yidx>0){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // +z+y
                if(zidx<nbricks_z-1&&yidx<nbricks_y-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx;
                    GetBrickBonds(idx2);
                }
                // -z-x
                if(zidx>0&&xidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // -z+x
                if(zidx>0&&xidx<nbricks_x-1){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // +z-x
                if(zidx<nbricks_z-1&&xidx>0){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // +z+x
                if(zidx<nbricks_z-1&&xidx<nbricks_x-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + yidx*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // -y-x
                if(yidx>0&&xidx>0){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // -y+x
                if(yidx>0&&xidx<nbricks_x-1){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // +y-x
                if(yidx<nbricks_y-1&&xidx>0){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // +y+x
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1){
                    var idx2 = zidx*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // -y-x+z
                if(yidx>0&&xidx>0&&zidx<nbricks_z-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // -y+x+z
                if(yidx>0&&xidx<nbricks_x-1&&zidx<nbricks_z-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // +y-x+z
                if(yidx<nbricks_y-1&&xidx>0&&zidx<nbricks_z-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // +y+x+z
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1&&zidx<nbricks_z-1){
                    var idx2 = (zidx+1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // -y-x-z
                if(yidx>0&&xidx>0&&zidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // -y+x-z
                if(yidx>0&&xidx<nbricks_x-1&&zidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx-1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
                // +y-x-z
                if(yidx<nbricks_y-1&&xidx>0&&zidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx - 1;
                    GetBrickBonds(idx2);
                }
                // +y+x-z
                if(yidx<nbricks_y-1&&xidx<nbricks_x-1&&zidx>0){
                    var idx2 = (zidx-1)*(nbricks_x*nbricks_x) + (yidx+1)*nbricks_x + xidx + 1;
                    GetBrickBonds(idx2);
                }
            }
        }
    }
    console.log("Time to make bricks: "+(new Date().getTime()-start));
    console.log("Added "+nbonds+" bonds");

    var nbonds2 = 0;
    //console.log(bricks);

    this.hasBonds = true;
    return;
}

Model.prototype.calculateBondsOld = function () {

    if(this.hasBonds){
        return;
    }
    var mindist = 0.6;
    var maxdist = 1.8;
    var minsq = mindist * mindist;
    var maxsq = maxdist * maxdist;

    var atoms = this.getAllAtoms();
    var len = atoms.length;

    var start = new Date().getTime();

    var abs = Math.abs;
    
    //var ic = 0;
    //var icp = 0;
    var nbonds2 = 0;
    for(var iat1=0;iat1<len;iat1++){
        var at1 = atoms[iat1];
        var at1x = at1["_atom_site.Cartn_x"];
        var at1y = at1["_atom_site.Cartn_y"];
        var at1z = at1["_atom_site.Cartn_z"];
        for(var iat2=iat1+1;iat2<len;iat2++){
            //icp += 1;
            var at2  = atoms[iat2];
            var at2x = at2["_atom_site.Cartn_x"];
            var at1at2x = abs(at1x-at2x);
            if(at1at2x<=maxdist){
                var at2y = at2["_atom_site.Cartn_y"];
                var at1at2y = abs(at1y-at2y);
                if(at1at2y<=maxdist){
                    var at2z = at2["_atom_site.Cartn_z"];
                    var at1at2z = abs(at1z-at2z);
                    //ic += 1;
                    if(at1at2z<=maxdist){
                        var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                        if (distsq >= minsq && distsq <= maxsq){
                            //console.log(at1.getAtomID()+" "+at2.getAtomID());
                            nbonds2++;
                            at1.bonds.push(at2);
                            at2.bonds.push(at1);
                            //console.log(at1.bonds.length+" "+at2.bonds.length);
                        }
                    }
                }
            }
        }
    }

    //console.log("Tested "+ic+" bonds, of "+icp);

    this.hasBonds = true;
    console.log("Added "+nbonds2+" bonds again");

}

Model.prototype.bondLength = function (at1,at2) {
    var A = vec3.create([at1.x(),at1.y(),at1.z()]);
    var B = vec3.create([at2.x(),at2.y(),at2.z()]);
    var BA = vec3.create();
    vec3.subtract(B,A,BA);
    var ab = vec3.length(BA);
    return ab;
}

Model.prototype.bondAngle = function (at1,at2,at3) {

    var A = vec3.create([at1.x(),at1.y(),at1.z()]);
    var B = vec3.create([at2.x(),at2.y(),at2.z()]);
    var C = vec3.create([at3.x(),at3.y(),at3.z()]);

    var BA = vec3.create();
    var CA = vec3.create();
    var CB = vec3.create();

    vec3.subtract(B,A,BA);
    vec3.subtract(C,A,CA);
    vec3.subtract(C,B,CB);

    var ab = vec3.length(BA);
    var ac = vec3.length(CA);
    var bc = vec3.length(CB);

    var absq = ab*ab;
    var acsq = ac*ac;
    var bcsq = bc*bc;

    return  Math.acos((bcsq + absq - acsq)/(2*bc*ab));
}

Model.prototype.calculateHBonds = function () {

    var start = new Date().getTime();
    this.hbonds = [];

    var min_D_A = 2.0;
    var max_D_A = 3.1;
    var max_D_A_S = 3.9;
    var max_H_A = 2.5;
    var min_DD_D_A = 90 * Math.PI/180.0;
    var min_D_A_AA = 90 * Math.PI/180.0;
    var min_H_A_AA = 90 * Math.PI/180.0;
    var min_D_H_A = 90 * Math.PI/180.0;
    var donor_angles_OK;

    this.calculateBonds();
    console.log("Time to calculateBonds: "+(new Date().getTime()-start));

    var donors = this.getAtoms("D == STRINGPROP__ccp4mg_hb_type or B == STRINGPROP__ccp4mg_hb_type");
    //console.log(donors);
    var acceptors = this.getAtoms("A == STRINGPROP__ccp4mg_hb_type or B == STRINGPROP__ccp4mg_hb_type");
    //console.log(acceptors);
    var hydrogens = this.getAtoms("H == STRINGPROP___atom_site.label_asym_id");
    //console.log(hydrogens);
    console.log("Time to get selections: "+(new Date().getTime()-start));

    if(donors.length>0&&acceptors.length>0){
        var max_D = max_D_A;
        if(max_D_A_S>max_D){
            max_D = max_D_A_S;
        }
        var contacts = this.SeekContacts(donors,acceptors,min_D_A,max_D);
        console.log("Time to SeekContacts: "+(new Date().getTime()-start));
        //console.log(contacts.length);
        var clen = contacts.length;
        for(var ic=0;ic<clen;ic++){
            // FIXME - Check both in "matching" altLoc's.

            var donorBonds    = contacts[ic][1].getBonds();
            var acceptorBonds = contacts[ic][2].getBonds();
            var donorLen = donorBonds.length;
            var acceptorLen = acceptorBonds.length;
            //console.log(donorBonds.length);
            //console.log(acceptorBonds.length);
            var contactAt1 = contacts[ic][1];
            var contactAt2 = contacts[ic][2];
            var contactAt1Symbol = contactAt1["_atom_site.type_symbol"];
            var contactAt2Symbol = contactAt2["_atom_site.type_symbol"];
            var haveH = false;

            // If there is a hydrogen then test geometry
            for ( var i = 0; i < donorLen; i++ ) {
                if (hydrogens.indexOf(donorBonds[i])>-1){
                    haveH = true;
                    var H_A = this.bondLength(donorBonds[i],contacts[ic][2]);
                    var D_H_A = this.bondAngle(contacts[ic][1],donorBonds[i],contacts[ic][2]);
                    if ( H_A < max_H_A && D_H_A > min_D_H_A ) {
                        if ( acceptorLen == 0 || this.bondAngle( donorBonds[i], contacts[ic][2],acceptorBonds[0] ) > min_H_A_AA ) {
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
                    for(var idb=0;idb<donorLen;idb++){
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

Model.prototype.getHBonds = function (atoms1,atoms2) {
    // Now seem to be getting odd (rather random) slowdowns on Safari (or was it Chrome) with this. Don't understand.
    console.log("getHBonds "+this.hbonds.length);
    var hbonds = [];

    var uuid = guid();
    var uuid2 = guid();
    var len1 = atoms1.length;
    var len2 = atoms2.length;
    console.log("getHBonds: "+len1+", "+len2);

    console.log("this.hbonds.length: "+this.hbonds.length);
    for(var ih=0;ih<this.hbonds.length;ih++){
        this.hbonds[ih][1][uuid] = 0;
        this.hbonds[ih][2][uuid] = 0;
        this.hbonds[ih][1][uuid2] = 0;
        this.hbonds[ih][2][uuid2] = 0;
    }

    for(var iat=0;iat<len1;iat++){
        atoms1[iat][uuid] = 1;
    }
    for(var iat=0;iat<len2;iat++){
         atoms2[iat][uuid2] = 2;
    }

    for(var ih=0;ih<this.hbonds.length;ih++){
        if((this.hbonds[ih][1][uuid]===1&&this.hbonds[ih][2][uuid2]===2)||(this.hbonds[ih][2][uuid]===1&&this.hbonds[ih][1][uuid2]===2)){
            hbonds.push(this.hbonds[ih]);
        }
    }

    /*
    for(var ih=0;ih<this.hbonds.length;ih++){
        if((atoms1.indexOf(this.hbonds[ih][1])>-1&&atoms2.indexOf(this.hbonds[ih][2])>-1)||
                (atoms2.indexOf(this.hbonds[ih][1])>-1&&atoms1.indexOf(this.hbonds[ih][2])>-1)){
            hbonds.push(this.hbonds[ih]);
        }
    }
    */

    return hbonds;
}

Model.prototype.centreOnAtoms = function (atoms) {
    var xtot = 0.0;
    var ytot = 0.0;
    var ztot = 0.0;
    for(var ia=0;ia<atoms.length;ia++){
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

Model.prototype.centre = function () {
    var chains = this.chains;
    var xtot = 0.0;
    var ytot = 0.0;
    var ztot = 0.0;
    var natoms = 0;
    for(var ic=0;ic<chains.length;ic++){
        var residues = chains[ic].residues;
        for(var ir=0;ir<residues.length;ir++){
            var atoms = residues[ir].atoms;
            for(var ia=0;ia<atoms.length;ia++){
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

Model.prototype.getLigandsList = function () {
    var ligands_list = [];
    var ligand_atoms = this.getAtoms("ligands");

    var ligands_dict = {};
    for(var iat=0;iat<ligand_atoms.length;iat++){
        ligands_dict["/1/"+ligand_atoms[iat].getChainID()+"/"+ligand_atoms[iat].getResidueID()] = "/1/"+ligand_atoms[iat].getChainID()+"/"+ligand_atoms[iat].getResidueID();
    }
    ligands_list = Object.keys(ligands_dict).map(function (key) {return ligands_dict[key]});

    return ligands_list;
}

Model.prototype.mainAtoms = ["N","CA","C","O"];
Model.prototype.aminoResidues = ["GLY","ALA","VAL","PRO","SER","THR","LEU","ILE","CYS","ASP","GLU","ASN","GLN","ARG","LYS","MET","MSE","HIS","PHE","TYR","TRP","HCS","ALO","PDD","UNK"];
Model.prototype.metalElements = ["LI", "BE", "NA", "MG", "AL", "K", "CA", "SC", "TI", "V", "MN", "FE", "CO", "NI", "CU", "ZN", "GA", "RB", "SR", "Y", "ZR", "NB", "MO", "TC", "RU", "RH", "PD", "AG", "CD", "IN", "SN", "SB", "CS", "BA", "LA", "CE", "PR", "ND", "PM", "SM", "EU", "GD", "TB", "DY", "HO", "ER", "TM", "YB", "LU", "HF", "TA", "W", "RE", "OS", "IR", "PT", "AU", "HG", "TL", "PB", "BI", "PO", "FR", "RA", "AC", "TH", "PA", "U", "NP", "PU", "AM", "CM", "BK", "CF", "ES", "FM", "MD", "NO", "LR", "RF", "DB", "SG", "BH", "HS", "MT", "UN", "UU", "UB", "UQ", "UH", "UO"];
Model.prototype.saccharideResidues = ["BMA","MAN","NAG","GLC","BGC","GCS","GAL","NGA","MGC","NG1","NG6","A2G","6MN","GLP","GP4","BEM","KDN","XLS","CXY","RBY","TDX","XYL","XYS","XYP","FCA","FCB","FUC","GTR","ADA","DGU","SI3","NCC","NGF","NGE","NGC","GC4","GCD","GCU","GCV","GCW","IDS","REL","IDR","SIA"];

Model.prototype.getPeptideLibraryEntry = function(monid,enerLib){
    if(typeof(peptideMonomers[monid])!=="undefined"){
        try {
            var b64Data = peptideMonomers[monid];
            var strData;
            if(window.atob&&window.btoa){
                strData = atob(b64Data.replace(/\s/g, ''));
            } else {
                strData = base64decode(b64Data.replace(/\s/g, ''));
            }
            var binData     = new Uint8Array(strData.length);
            for(j=0;j<strData.length;j++){
                binData[j] = strData[j].charCodeAt(0);
            }
            var data  = pako.inflate(binData);
            if(window.TextDecoder){
                // THIS'LL only work in Firefox 19+, Opera 25+ and Chrome 38+.
                var decoder = new TextDecoder('utf-8');
                strData = decoder.decode(data);
            }else {
                var unpackBufferLength = 60000;
                var theSlice = new Uint8Array(60000);
                for(j=0;j<data.length/unpackBufferLength;j++){
                    var lower = j*unpackBufferLength;
                    var upper = (j+1)*unpackBufferLength;
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

Model.prototype.metalCoordDistance = function(element_in){
    var element = element_in.toUpperCase();
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

Model.prototype.filterConnectionsByAtoms1 = function (conn,atoms) {
    var filterConn = [];
    var atLength = atoms.length;
    var connLength = conn.length;
    for(var iconn=0;iconn<connLength;iconn++){
        for(var iat=0;iat<atLength;iat++){
            var atom = atoms[iat];
            if(atom.getResidueID()==conn[iconn][1].getResidueID()){
                filterConn.push(conn[iconn]);
                break;
            }
        }
    }
    return filterConn;
}

Model.prototype.filterConnectionsByAtoms2 = function (conn,atoms) {
    var filterConn = [];
    var atLength = atoms.length;
    var connLength = conn.length;
    for(var iconn=0;iconn<connLength;iconn++){
        for(var iat=0;iat<atLength;iat++){
            var atom = atoms[iat];
            if(atom.getResidueID()==conn[iconn][2].getResidueID()){
                filterConn.push(conn[iconn]);
                break;
            }
        }
    }
    return filterConn;
}

Model.prototype.filterGlycanConnectionsByAtoms = function (glycConn,atoms) {
    var filterGlycConn = [];
    var atLength = atoms.length;
    var connLength = glycConn.length;
    for(var iconn=0;iconn<connLength;iconn++){
        for(var iat=0;iat<atLength;iat++){
            var atom = atoms[iat];
            if(atom.getResidueID()==glycConn[iconn][1].getResidueID()){
                filterGlycConn.push(glycConn[iconn]);
                break;
            }
        }
    }
    return filterGlycConn;
}

Model.prototype.filterResiduesByAtoms = function (residues,atoms) {
    var filteredResidues = [];
    var atLength = atoms.length;
    var resLength = residues.length;
    for(var ires=0;ires<resLength;ires++){
        for(var iat=0;iat<atLength;iat++){
            var atom = atoms[iat];
            if(atom.getResidueID()==residues[ires].getResidueID()){
                filteredResidues.push(residues[ires]);
                break;
            }
        }
    }
    return filteredResidues;
}

Model.prototype.getGlycanResidues = function () {
    if(typeof(this.glycan_cache["glycans"])!=="undefined"){
        return this.glycan_cache["glycans"];
    }
    this.calculateBonds();
    // FIXME - Misnaming, doing O-glycos to THR and SER too
    var asnND2Atoms = this.getAtoms("/*/*/(ASN)/ND2 or /*/*/(THR)/OG1 or /*/*/(SER)/OG");
    var saccharideAtoms = this.getAtoms("saccharide");
    var glycosContacts = this.SeekContacts(asnND2Atoms,saccharideAtoms,0.6,1.7);

    // These are all the "roots"

    var glycanResidues = [];
    var glycanGlycanConnections = [];
    for(var ig=0;ig<glycosContacts.length;ig++){
        glycanResidues.push(glycosContacts[ig][2].residue);
    }

    var newGlycans = [];
    function getGlycanConnections(glycan){
        for(var iat=0;iat<glycan.atoms.length;iat++){
            var atom = glycan.atoms[iat];
            for(var ib=0;ib<atom.bonds.length;ib++){
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

    for(var ig=0;ig<glycanResidues.length;ig++){
        newGlycans.push(glycanResidues[ig]);
    }

    for(var ig=0;ig<glycanResidues.length;ig++){
        getGlycanConnections(glycanResidues[ig]);
    }

    for(var ig=0;ig<glycosContacts.length;ig++){
        glycosContacts[ig][1] =  glycosContacts[ig][1].residue.getAtom("CA");
    }

    this.glycan_cache["glycans"] = newGlycans;
    this.glycan_cache["rootGlycans"] = glycosContacts;
    this.glycan_cache["glycanGlycanConnections"] = glycanGlycanConnections;
    return newGlycans;
    
}

Model.prototype.getAtoms = function (selin) {

    var atoms = [];
    //console.log("selin: "+selin);

    if(selin==="water"||selin==="solvent"){
        if(typeof(this.selection_cache["water"])==="undefined"){
            this.selection_cache["water"] = this.getAtoms("/*/*/(HOH,H2O,WAT,SOL,DOD,D2O)/*");
        }
        return this.selection_cache["water"];
    } else if(selin==="nglycosylation"){
        var glycanResidues = this.getGlycanResidues();
        var glycanAtoms = [];
        for(var ig=0;ig<glycanResidues.length;ig++){
            for(var iat=0;iat<glycanResidues[ig].atoms.length;iat++){
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
        var model = ''
        var selobj_alias='';
        var selobj_model='';
        var hbonded=0;
        var sym_mates=0;
        // Also sellist=None, nsellist=0, selhnd=None !??
         */
        var cidStart = selin.indexOf(" cid=\"");
        if(cidStart===-1){
            return atoms;
        } else {
            cidSel = selin.substring(cidStart+6);
            var cidEnd = cidSel.indexOf("\"");
            if(cidEnd===-1){
                return atoms;
            } else {
                var cid = cidSel.substring(0,cidEnd);
                var postCid = selin.substring(cidStart+cid.length+7).trim();
                //console.log(cid);
                //console.log(postCid);
                var cidAtoms = this.getAtoms(cid);
                var ligandAtoms = [];
                if(selin.indexOf("ligands")>-1){
                    if(cid==="ligands"){
                        ligandAtoms = cidAtoms;
                    } else {
                        ligandAtoms = this.getAtoms("ligands");
                    }
                }
                //console.log(cidAtoms);
                var maxd = 10.0;
                var mind = 0.0;
                var excl = [""];
                var group = "residue";
                var maxStart = selin.indexOf(" maxd=");
                var hbond = "";
                if(maxStart>-1){
                    var maxEnd = selin.indexOf(" ",maxStart+1);
                    if(maxEnd===-1) maxEnd = selin.length;
                    maxd = parseFloat(selin.substring(maxStart+6,maxEnd));
                }
                var minStart = selin.indexOf(" mind=");
                if(minStart>-1){
                    var minEnd = selin.indexOf(" ",minStart+1);
                    if(minEnd===-1) minEnd = selin.length;
                    mind = parseFloat(selin.substring(minStart+6,minEnd));
                }
                var groupStart = selin.indexOf(" group=");
                if(groupStart>-1){
                    var groupEnd = selin.indexOf(" ",groupStart+1);
                    if(groupEnd===-1) groupEnd = selin.length;
                    group = selin.substring(groupStart+7,groupEnd);
                }
                var hbondStart = selin.indexOf(" hbonded=");
                if(hbondStart>-1){
                    var hbondEnd = selin.indexOf(" ",hbondStart+1);
                    if(hbondEnd===-1) hbondEnd = selin.length;
                    hbond = selin.substring(hbondStart+9,hbondEnd);
                }
                var exclStart = selin.indexOf(" excl=");
                if(exclStart>-1){
                    var exclEnd = selin.indexOf(" ",exclStart+1);
                    if(exclEnd===-1) exclEnd = selin.length;
                    excl = selin.substring(exclStart+6,exclEnd).split(",");
                }
                var allAtoms = this.getAllAtoms();
                var maxdsq = maxd*maxd;
                var mindsq = mind*mind;
                // FIXME, not considered excl or group at all.
                if(allAtoms.length>0&&cidAtoms.length>0){
                    if(group==="atom"||group==="all"){
                        for(var iat1=0;iat1<allAtoms.length;iat1++){
                            var at1 = allAtoms[iat1];
                            for(var iat2=0;iat2<cidAtoms.length;iat2++){
                                var at2  = cidAtoms[iat2];
                                var distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    atoms.push(at1);
                                    break;
                                }
                            }
                        }
                    }
                    if(group==="water"||group==="solvent"||(excl.indexOf("water")===-1&&excl.indexOf("solvent")===-1)){
                        var waterAtoms = this.getAtoms("water");
                        for(var iat1=0;iat1<waterAtoms.length;iat1++){
                            var at1 = waterAtoms[iat1];
                            for(var iat2=0;iat2<cidAtoms.length;iat2++){
                                var at2  = cidAtoms[iat2];
                                var distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    atoms.push(at1);
                                    break;
                                }
                            }
                        }
                    }
                    if(group==="catrace"){
                        var traceAtoms = this.getAtoms("catrace");
                        for(var iat1=0;iat1<traceAtoms.length;iat1++){
                            var at1 = traceAtoms[iat1];
                            for(var iat2=0;iat2<cidAtoms.length;iat2++){
                                var at2  = cidAtoms[iat2];
                                var distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    atoms.push(at1);
                                    break;
                                }
                            }
                        }
                    }
                    if(group==="water_ligands"||group==="solvent_monomers"){
                        var waterLigandAtoms = this.getAtoms("water or ligands");
                        for(var iat1=0;iat1<waterLigandAtoms.length;iat1++){
                            var at1 = waterLigandAtoms[iat1];
                            for(var iat2=0;iat2<cidAtoms.length;iat2++){
                                var at2  = cidAtoms[iat2];
                                var distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    atoms.push(at1);
                                    break;
                                }
                            }
                        }
                    }
                    if(group==="ligands"){
                        for(var iat1=0;iat1<ligandAtoms.length;iat1++){
                            var at1 = ligandAtoms[iat1];
                            for(var iat2=0;iat2<cidAtoms.length;iat2++){
                                var at2  = cidAtoms[iat2];
                                var distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    atoms.push(at1);
                                    break;
                                }
                            }
                        }
                    }
                    //FIXMEm these should be different, I think
                    if(group==="side"||group==="main_side"||group==="CA+side"){
                        var sideAtoms = this.getAtoms("side");
                        var prevId = "";
                        var doneThisResidue = false;
                        for(var iat1=0;iat1<sideAtoms.length;iat1++){
                            var at1 = sideAtoms[iat1];
                            if(at1.getResidueID()!==prevId){
                                doneThisResidue = false;
                            }
                            if(at1.getResidueID()===prevId&&doneThisResidue){
                                continue;
                            }
                            for(var iat2=0;iat2<cidAtoms.length;iat2++){
                                var at2  = cidAtoms[iat2];
                                var distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    var side_atoms = at1.residue.getCASideAtoms();
                                    for(ip=0;ip<side_atoms.length;ip++) atoms.push(side_atoms[ip]);
                                    doneThisResidue = true;
                                    break;
                                }
                            }
                            prevId = at1.getResidueID();
                        }
                    }
                    if(group==="main"||group==="main_side"){
                        var mainAtoms = this.getAtoms("main");
                        var prevId = "";
                        var doneThisResidue = false;

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
                            var filteredHbonds = this.hbonds.filter(hBondsToCidAndThese);
                            for(ihb=0;ihb<filteredHbonds.length;ihb++){
                                if(cidAtoms.indexOf(filteredHbonds[ihb][1])>-1){
                                    var main_atoms = filteredHbonds[ihb][2].residue.getMainAtoms();
                                    for(ip=0;ip<main_atoms.length;ip++) atoms.push(main_atoms[ip]);
                                } else {
                                    var main_atoms = filteredHbonds[ihb][1].residue.getMainAtoms();
                                    for(ip=0;ip<main_atoms.length;ip++) atoms.push(main_atoms[ip]);
                                }
                            }
                        } else {
                            for(var iat1=0;iat1<mainAtoms.length;iat1++){
                                var at1 = mainAtoms[iat1];
                                if(at1.getResidueID()!==prevId){
                                    doneThisResidue = false;
                                }
                                if(at1.getResidueID()===prevId&&doneThisResidue){
                                    continue;
                                }
                                for(var iat2=0;iat2<cidAtoms.length;iat2++){
                                    var at2  = cidAtoms[iat2];
                                    var distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                    if (distsq >= mindsq && distsq <= maxdsq){
                                        var main_atoms = at1.residue.getMainAtoms();
                                        for(ip=0;ip<main_atoms.length;ip++) atoms.push(main_atoms[ip]);
                                        doneThisResidue = true;
                                        break;
                                    }
                                }
                                prevId = at1.getResidueID();
                            }
                        }
                    }
                    if(group==="residue"){
                        var sideAtoms = this.getAtoms("side");
                        var prevId = "";
                        var doneThisResidue = false;
                        for(var iat1=0;iat1<sideAtoms.length;iat1++){
                            var at1 = sideAtoms[iat1];
                            if(at1.getResidueID()!==prevId){
                                doneThisResidue = false;
                            }
                            if(at1.getResidueID()===prevId&&doneThisResidue){
                                continue;
                            }
                            for(var iat2=0;iat2<cidAtoms.length;iat2++){
                                var at2  = cidAtoms[iat2];
                                var distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    var res_atoms = at1.residue.atoms;
                                    for(ip=0;ip<res_atoms.length;ip++) atoms.push(res_atoms[ip]);
                                    doneThisResidue = true;
                                    break;
                                }
                            }
                            prevId = at1.getResidueID();
                        }
                    }
                    if(group==="chain"){
                        var prevId = "";
                        var doneThisChain = false;
                        for(var iat1=0;iat1<allAtoms.length;iat1++){
                            var at1 = allAtoms[iat1];
                            if(at1.residue.chain.getChainID()!==prevId){
                                doneThisChain = false;
                            }
                            if(at1.residue.chain.getChainID()===prevId&&doneThisChain){
                                continue;
                            }
                            for(var iat2=0;iat2<cidAtoms.length;iat2++){
                                var at2  = cidAtoms[iat2];
                                var distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    var chain_atoms = at1.residue.chain.getAtoms();
                                    for(ip=0;ip<chain_atoms.length;ip++) atoms.push(chain_atoms[ip]);
                                    doneThisChain = true;
                                    break;
                                }
                            }
                            prevId = at1.residue.chain.getChainID();
                        }
                    }
                    if(group==="model"){
                        var prevModel = null;
                        var doneThisModel = false;
                        for(var iat1=0;iat1<allAtoms.length;iat1++){
                            var at1 = allAtoms[iat1];
                            if(at1.residue.chain.model!==prevModel){
                                doneThisModel = false;
                            }
                            if(at1.residue.chain.model===prevModel&&doneThisModel){
                                continue;
                            }
                            for(var iat2=0;iat2<cidAtoms.length;iat2++){
                                var at2  = cidAtoms[iat2];
                                var distsq = (at1.x()-at2.x())*(at1.x()-at2.x()) + (at1.y()-at2.y())*(at1.y()-at2.y()) + (at1.z()-at2.z())*(at1.z()-at2.z());
                                if (distsq >= mindsq && distsq <= maxdsq){
                                    var model_atoms = at1.residue.chain.model.getAllAtoms();
                                    for(ip=0;ip<model_atoms.length;ip++) atoms.push(model_atoms[ip]);
                                    doneThisModel = true;
                                    break;
                                }
                            }
                            prevModel = at1.residue.chain.model;
                        }
                    }
                    if(excl.indexOf("central")===-1){
                        // Don't exclude central, i.e. do include it.
                        for(var ic=0;ic<cidAtoms.length;ic++){
                            if(atoms.indexOf(cidAtoms[ic])===-1){
                                atoms.push(cidAtoms[ic]);
                            }
                        }
                    } else {
                        // Exclude central
                        for(var iat = atoms.length - 1; iat >= 0; iat--) {
                            if(cidAtoms.indexOf(atoms[iat])!==-1) {
                                atoms.splice(iat, 1);
                            }
                        }
                    }
                    if(excl.indexOf("water")!==-1||excl.indexOf("solvent")!==-1){
                        // Exclude water
                        var waterAtoms = this.getAtoms("water");
                        for(var iat = atoms.length - 1; iat >= 0; iat--) {
                            if(waterAtoms.indexOf(atoms[iat])!==-1) {
                                atoms.splice(iat, 1);
                            }
                        }
                    }
                    if(excl.indexOf("solute")!==-1){
                        // Exclude solute
                        var excludeAtoms = this.getAtoms("solute");
                        for(var iat = atoms.length - 1; iat >= 0; iat--) {
                            if(excludeAtoms.indexOf(atoms[iat])!==-1) {
                                atoms.splice(iat, 1);
                            }
                        }
                    }
                    if(excl.indexOf("ligands")!==-1){
                        // Exclude ligands
                        var excludeAtoms = ligandAtoms;
                        for(var iat = atoms.length - 1; iat >= 0; iat--) {
                            if(excludeAtoms.indexOf(atoms[iat])!==-1) {
                                atoms.splice(iat, 1);
                            }
                        }
                    }
                }
                if(postCid.indexOf(" and ")>-1){
                    var sel2 = postCid.substring(postCid.indexOf(" and ")+5).trim();
                    var atoms1 = atoms;// THE NEIGHBOURS
                    var atoms2 = this.getAtoms(sel2);
                    var andAtoms = [];
                    for(var iat=0;iat<atoms1.length;iat++){
                        if(atoms2.indexOf(atoms1[iat])!=-1){
                            andAtoms.push(atoms1[iat]);
                        }
                    }
                    return andAtoms;
                }
                if(postCid.indexOf(" or ")>-1){
                    var sel2 = postCid.substring(postCid.indexOf(" or ")+4).trim();
                    var atoms1 = atoms;// THE NEIGHBOURS
                    var atoms2 = this.getAtoms(sel2);
                    for(ip=0;ip<atoms1.length;ip++) atoms.push(atoms1[ip]);
                    for(ip=0;ip<atoms2.length;ip++) atoms.push(atoms2[ip]);
                    return atoms;
                }
            }
        }
        return atoms;

    } else if(selin.indexOf("{")==0){
        // Now it gets tricky, we want proper recursive parsing with brackets {}. I think this all works.
        var lhb = 0;
        var rhb = 0;
        for(var ib=0;ib<selin.length;ib++){
            if(selin.substring(ib,ib+1)==="{") lhb++;
            if(selin.substring(ib,ib+1)==="}") rhb++;
            if(lhb===rhb){
                //console.log("Brackets: "+lhb+" "+rhb+" "+ib);
                var sel1 = selin.substring(1,ib);
                if(ib===selin.length-1){
                    return this.getAtoms(sel1);
                }
                var sel2 = selin.substring(ib+1).trim();
                if(sel2.substring(0,4)==="and "){
                    var atoms1 = this.getAtoms(sel1);
                    var atoms2 = this.getAtoms(sel2.substring(4));
                    var andAtoms = [];
                    for(var iat=0;iat<atoms1.length;iat++){
                        if(atoms2.indexOf(atoms1[iat])!=-1){
                            andAtoms.push(atoms1[iat]);
                        }
                    }
                    return andAtoms;
                } else if(sel2.substring(0,3)==="or "){
                    var atoms1 = this.getAtoms(sel1);
                    var atoms2 = this.getAtoms(sel2.substring(3));
                    for(ip=0;ip<atoms1.length;ip++) atoms.push(atoms1[ip]);
                    for(ip=0;ip<atoms2.length;ip++) atoms.push(atoms2[ip]);
                    return atoms;
                }
                //console.log(sel1);
                //console.log(sel2);
                break;
            }
        }
        return atoms;
    } else if(selin.indexOf(" and ")>-1){
        var sel1 = selin.substring(0,selin.indexOf(" and ")).trim();
        var sel2 = selin.substring(selin.indexOf(" and ")+5).trim();
        var atoms1 = this.getAtoms(sel1);
        var atoms2 = this.getAtoms(sel2);
        var andAtoms = [];
        /*
        for(var iat=0;iat<atoms1.length;iat++){
            if(atoms2.indexOf(atoms1[iat])!=-1){
                andAtoms.push(atoms1[iat]);
            }
        }
        */
        var allAtoms = this.getAllAtoms();
        var allLen = allAtoms.length;
        var len1 = atoms1.length;
        var len2 = atoms2.length;
        var uuid = guid();
        var uuid2 = guid();
        for(var iat=0;iat<allLen;iat++){
            allAtoms[iat][uuid] = 0;
            allAtoms[iat][uuid2] = 0;
        }
        for(var iat=0;iat<len1;iat++){
            atoms1[iat][uuid] = 1;
        }
        for(var iat=0;iat<len2;iat++){
            atoms2[iat][uuid2] = 1;
        }
        andAtoms = allAtoms.filter(function(x) { return x[uuid] === 1 && x[uuid2] === 1 });
        for(var iat=0;iat<allLen;iat++){
            delete allAtoms[iat][uuid];
            delete allAtoms[iat][uuid2];
        }
        return andAtoms;
    } else if(selin.indexOf(" or ")>-1){
        if(selin.indexOf("{")>-1&&selin.indexOf("{")<selin.indexOf(" or ")){
            if(selin.substring(0,selin.indexOf("{")).trim()==="not"){
                var atoms1 = this.getAtoms(selin.substring(selin.indexOf("{")));
                var allAtoms = this.getAllAtoms();
                var notAtoms = [];
                var allLen = allAtoms.length;
                var len = atoms1.length;
                // FIXME *THIS* takes 8s for 1aon!
                /*
                for(var iat=0;iat<allLen;iat++){
                    if(atoms1.indexOf(allAtoms[iat])==-1){
                        notAtoms.push(allAtoms[iat]);
                    }
                }
                */
                // this is *fast*
                var uuid = guid();
                for(var iat=0;iat<allLen;iat++){
                    allAtoms[iat][uuid] = 0;
                }
                for(var iat=0;iat<len;iat++){
                    atoms1[iat][uuid] = 1;
                }
                notAtoms = allAtoms.filter(function(x) { return x[uuid] === 0 });
                for(var iat=0;iat<allLen;iat++){
                    delete allAtoms[iat][uuid];
                }
                return notAtoms;
            }
        }
        var sel1 = selin.substring(0,selin.indexOf(" or ")).trim();
        var sel2 = selin.substring(selin.indexOf(" or ")+4).trim();
        var atoms1 = this.getAtoms(sel1);
        var atoms2 = this.getAtoms(sel2);
        for(ip=0;ip<atoms1.length;ip++) atoms.push(atoms1[ip]);
        for(ip=0;ip<atoms2.length;ip++) atoms.push(atoms2[ip]);
        return atoms;
    } else if(selin.indexOf(" not ")>-1 || selin.substring(0,4)==="not "){
        var sel1;
        if(selin.substring(0,4)==="not "){
            sel1 = selin.substring(4).trim();
        } else {
            sel1 = selin.substring(selin.indexOf(" not ")+5).trim();
        }
        var atoms1 = this.getAtoms(sel1);
        var allAtoms = this.getAllAtoms();
        var notAtoms = [];
        var allLen = allAtoms.length;
        var len = atoms1.length;
        /*
        for(var iat=0;iat<allAtoms.length;iat++){
            if(atoms1.indexOf(allAtoms[iat])==-1){
                notAtoms.push(allAtoms[iat]);
            }
        }
         */
        var uuid = guid();
        for(var iat=0;iat<allLen;iat++){
            allAtoms[iat][uuid] = 0;
        }
        for(var iat=0;iat<len;iat++){
            atoms1[iat][uuid] = 1;
        }
        notAtoms = allAtoms.filter(function(x) { return x[uuid] === 0 });
        for(var iat=0;iat<allLen;iat++){
            delete allAtoms[iat][uuid];
        }
        return notAtoms;
    } else if(selin.indexOf("<")>-1||selin.indexOf("==")>-1){
        var allAtoms = this.getAllAtoms();
        //console.log("A property?: "+selin);
        var op1 = "";
        var op2 = "";
        var propVal1;
        var propVal2;
        var property;
        var isString = false;
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
                var indexOfFirstLessThan          = selin.indexOf("<");
                var indexOfFirstLessThanOrEqualTo = selin.indexOf("<=");
                //console.log(indexOfFirstLessThan+" "+indexOfFirstLessThanOrEqualTo);
                if(indexOfFirstLessThan>-1){
                    if(indexOfFirstLessThan==indexOfFirstLessThanOrEqualTo){
                        op1 = "<=";
                        property = selin.split("<=")[1].split("<")[0].trim();
                    } else {
                        op1 = "<";
                        property = selin.split("<")[1].split("<")[0].trim();
                    }
                    var indexOfSecondLessThan          = selin.indexOf("<",indexOfFirstLessThan+1);
                    var indexOfSecondLessThanOrEqualTo = selin.indexOf("<=",indexOfFirstLessThan+1);
                    //console.log(indexOfFirstLessThan+" "+indexOfFirstLessThanOrEqualTo+" "+indexOfSecondLessThan+" "+indexOfSecondLessThanOrEqualTo);
                    //console.log("foo");
                    if(indexOfSecondLessThan==indexOfSecondLessThanOrEqualTo){
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
        var propAliases = {"B":"_atom_site.B_iso_or_equiv","OCC":"_atom_site.occupancy","X":"_atom_site.Cartn_x","Y":"_atom_site.Cartn_y","Z":"_atom_site.Cartn_z","SERIAL":"_atom_site.id"};

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
    var selSplit = sel.split("/");

    var modelRange   = selSplit[0];
    var chainRange   = selSplit[1];
    var residueRange = selSplit[2];

    if(selSplit.length<3){
        modelRange   = "1";
        chainRange   = selSplit[0];
        residueRange = selSplit[1];
    } else {
        modelRange   = selSplit[0];
        chainRange   = selSplit[1];
        residueRange = selSplit[2];
    }

    var atomsRange;
    var altLocsRange   = "";
    var elementsRange   = "";

    if(selSplit.length<4){
        atomsRange   = "*";
    } else {
        atomsRange   = selSplit[3];
    }

    if(atomsRange.indexOf(":")>-1){
        var atomsAltlocs = atomsRange.split(":");
        atomsRange = atomsAltlocs[0];
        altLocsRange = atomsAltlocs[1].split(",");
        if(altLocsRange.length===1&&altLocsRange[0]==="*"){
            altLocsRange   = "";
        }
    }

    if(atomsRange.indexOf("[")>-1){
        var atomsElements = atomsRange.split("[");
        atomsRange = atomsElements[0];
        elementsRange = atomsElements[1].split("]")[0].split(",");
        // FIXME - LOOKS DODGY ?????????
        if(elementsRange.length===1&&elementsRange==="*"){
            elementsRange   = "";
        }
    }

    var selChains = [];
    var chainRanges = chainRange.split(",");
    for(var ic=0;ic<chainRanges.length;ic++){
        var thisRange = chainRanges[ic].split("-");
        if(thisRange.length===1){
            if(thisRange[0]=="*"){
                for(var jc=0;jc<this.chains.length;jc++){
                    selChains.push(this.chains[jc].getChainID());
                }
            } else {
                selChains.push(thisRange[0]);
            }
        } else {
            var selStart = thisRange[0];
            var selEnd   = thisRange[1];
            var inRange = false;
            for(var jc=0;jc<this.chains.length;jc++){
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

    getChainResidues = function(theChain){
        var selRes = [];
        if(residueRange.indexOf("(")>-1&&residueRange.split("(")[0].length===0){
            var residueRanges = residueRange.split("(");
            residueRanges = residueRanges[1].split(")")[0];
            residueRanges = residueRanges.split(",");
            for(var jr=0;jr<theChain.residues.length;jr++){
                if(residueRanges.indexOf(theChain.residues[jr].getName())>-1){
                    var seqId = theChain.residues[jr].getSeqID();
                    selRes.push(seqId);
                }
            }
        } else {
            var residueRanges;
            if(residueRange.indexOf("(")>-1){
                residueRanges = residueRange.split("(")[0].split(",");
            } else {
                residueRanges = residueRange.split(",");
            }
            for(var ir=0;ir<residueRanges.length;ir++){
                var thisRange = residueRanges[ir].split("-");
                if(thisRange.length===1){
                    if(thisRange[0]=="*"){
                        for(var jr=0;jr<theChain.residues.length;jr++){
                            var seqId = theChain.residues[jr].getSeqID();
                            selRes.push(seqId);
                        }
                    } else {
                        selRes.push(thisRange[0]);
                    }
                } else {
                    var selStart = thisRange[0];
                    var selEnd   = thisRange[1];
                    var insStart = "?";
                    var insEnd   = "?";
                    if(selStart.indexOf(".")>-1){
                        var selInsStart = selStart.split(".");
                        selStart = selInsStart[0];
                        insStart = selInsStart[1];
                    }
                    if(selEnd.indexOf(".")>-1){
                        var selInsEnd = selEnd.split(".");
                        selEnd = selInsEnd[0];
                        insEnd = selInsEnd[1];
                    }
                    var inRange = false;
                    for(var jr=0;jr<theChain.residues.length;jr++){
                        var seqId = theChain.residues[jr].getSeqID();
                        var seqIns = theChain.residues[jr].getInsCode();
                        if(seqId === selStart && seqIns == insStart){
                            inRange = true;
                        }
                        if(inRange){
                            selRes.push(seqId);
                        }
                        if(seqId === selEnd && seqIns == insEnd){
                            inRange = false;
                        }
                    }
                }
            }
        }
        return selRes;
    }

    getResidueAtoms = function(theResidue){
        var theSelAtoms = [];
        if(atomsRange==="*"){
            if(altLocsRange.length==0&&elementsRange.length==0){
                for(ip=0;ip<theResidue.atoms.length;ip++) theSelAtoms.push(theResidue.atoms[ip]);
            } else if(altLocsRange.length==0) {
                for(var ja=0;ja<theResidue.atoms.length;ja++){
                    if(elementsRange.indexOf(theResidue.atoms[ja]["_atom_site.type_symbol"])>-1){
                        theSelAtoms.push(theResidue.atoms[ja]);
                    }
                }
            } else if(elementsRange.length==0) {
                for(var ja=0;ja<theResidue.atoms.length;ja++){
                    if(altLocsRange.indexOf(theResidue.atoms[ja]["_atom_site.label_alt_id"])>-1){
                        theSelAtoms.push(theResidue.atoms[ja]);
                    }
                }
            } else {
                for(var ja=0;ja<theResidue.atoms.length;ja++){
                    if(elementsRange.indexOf(theResidue.atoms[ja]["_atom_site.type_symbol"])>-1){
                        if(altLocsRange.indexOf(theResidue.atoms[ja]["_atom_site.label_alt_id"])>-1){
                            theSelAtoms.push(theResidue.atoms[ja]);
                        }
                    }
                }
            }
        } else {
            var atomSels = atomsRange.split(",");
            if(altLocsRange.length==0&&elementsRange.length==0){
                for(var ja=0;ja<theResidue.atoms.length;ja++){
                    if(atomSels.indexOf(theResidue.atoms[ja]["_atom_site.label_atom_id"])>-1){
                        theSelAtoms.push(theResidue.atoms[ja]);
                    }
                }
            } else if(altLocsRange.length==0) {
                for(var ja=0;ja<theResidue.atoms.length;ja++){
                    if(atomSels.indexOf(theResidue.atoms[ja]["_atom_site.label_atom_id"])>-1){
                        if(elementsRange.indexOf(theResidue.atoms[ja]["_atom_site.type_symbol"])>-1){
                            theSelAtoms.push(theResidue.atoms[ja]);
                        }
                    }
                }
            } else if(elementsRange.length==0) {
                for(var ja=0;ja<theResidue.atoms.length;ja++){
                    if(atomSels.indexOf(theResidue.atoms[ja]["_atom_site.label_atom_id"])>-1){
                        if(altLocsRange.indexOf(theResidue.atoms[ja]["_atom_site.label_alt_id"])>-1){
                            theSelAtoms.push(theResidue.atoms[ja]);
                        }
                    }
                }
            } else {
                for(var ja=0;ja<theResidue.atoms.length;ja++){
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

    for(var ic=0;ic<this.chains.length;ic++){
        if(selChains.indexOf(this.chains[ic].getChainID())>-1){
            var residues = this.chains[ic].residues;
            var selResidues = getChainResidues(this.chains[ic]);
            for(var ir=0;ir<residues.length;ir++){
                var res = residues[ir];
                if(selResidues.indexOf(res.atoms[0].getSeqID())>-1){
                    var resAtoms = getResidueAtoms(residues[ir]);
                    for(ip=0;ip<resAtoms.length;ip++) atoms.push(resAtoms[ip]);
                }
            }
        }
    }
    return atoms;
}

Model.prototype.getAllAtoms = function () {
    var atoms = [];
    for(var ic=0;ic<this.chains.length;ic++){
        var residues = this.chains[ic].residues;
        for(var ir=0;ir<residues.length;ir++){
            var res = residues[ir];
            var resAtoms = res.atoms;
            for(ip=0;ip<resAtoms.length;ip++) atoms.push(resAtoms[ip]);
        }
    }
    return atoms;
}

Model.prototype.getTraceBFactor = function () {
    // FIXME - Nucleic acid?
    var trace = [];
    var chains = this.chains;
    var maxcadistsq = 23.0;
    var maxc5distsq = 66.0;
    var bFacScale = 0.05; // Why 0.05 ???
    for(var ic=0;ic<chains.length;ic++){
        var thisTrace = [];
        var thisTraceAt = [];
        var residues = chains[ic].residues;
        for(var ir=0;ir<residues.length;ir++){
            var ca = residues[ir].getAtomTrimmed( "CA" );
            if(ca&&ca.element()==="C"){
                if(thisTraceAt.length>0){
                    var caprev = thisTraceAt[thisTraceAt.length-1];
                    var at1x = ca["_atom_site.Cartn_x"];
                    var at1y = ca["_atom_site.Cartn_y"];
                    var at1z = ca["_atom_site.Cartn_z"];
                    var at2x = caprev["_atom_site.Cartn_x"];
                    var at2y = caprev["_atom_site.Cartn_y"];
                    var at2z = caprev["_atom_site.Cartn_z"];
                    var at1at2x = at1x-at2x;
                    var at1at2y = at1y-at2y;
                    var at1at2z = at1z-at2z;
                    var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
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
                var c5 = residues[ir].getAtomTrimmed( "C5*" );
                if(!c5){
                    c5 = residues[ir].getAtomTrimmed( "C5'" );
                }
                if(c5){
                    if(thisTraceAt.length>0){
                        var caprev = thisTraceAt[thisTraceAt.length-1];
                        var at1x = c5["_atom_site.Cartn_x"];
                        var at1y = c5["_atom_site.Cartn_y"];
                        var at1z = c5["_atom_site.Cartn_z"];
                        var at2x = caprev["_atom_site.Cartn_x"];
                        var at2y = caprev["_atom_site.Cartn_y"];
                        var at2z = caprev["_atom_site.Cartn_z"];
                        var at1at2x = at1x-at2x;
                        var at1at2y = at1y-at2y;
                        var at1at2z = at1z-at2z;
                        var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
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
                    var c3 = residues[ir].getAtomTrimmed( "C3*" );
                    if(!c3){
                        c3 = residues[ir].getAtomTrimmed( "C3'" );
                    }
                    if(c3){
                        if(thisTraceAt.length>0){
                            var caprev = thisTraceAt[thisTraceAt.length-1];
                            var at1x = c3["_atom_site.Cartn_x"];
                            var at1y = c3["_atom_site.Cartn_y"];
                            var at1z = c3["_atom_site.Cartn_z"];
                            var at2x = caprev["_atom_site.Cartn_x"];
                            var at2y = caprev["_atom_site.Cartn_y"];
                            var at2z = caprev["_atom_site.Cartn_z"];
                            var at1at2x = at1x-at2x;
                            var at1at2y = at1y-at2y;
                            var at1at2z = at1z-at2z;
                            var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
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

Model.prototype.getTraceSecStr = function () {
    // FIXME - Nucleic acid?
    var trace = [];
    var chains = this.chains;
    var maxcadistsq = 23.0;
    var maxc5distsq = 66.0;
    for(var ic=0;ic<chains.length;ic++){
        var thisTrace = [];
        var thisTraceAt = [];
        var residues = chains[ic].residues;
        for(var ir=0;ir<residues.length;ir++){
            var ca = residues[ir].getAtomTrimmed( "CA" );
            if(ca&&ca.element()==="C"){
                if(thisTraceAt.length>0){
                    var caprev = thisTraceAt[thisTraceAt.length-1];
                    var at1x = ca["_atom_site.Cartn_x"];
                    var at1y = ca["_atom_site.Cartn_y"];
                    var at1z = ca["_atom_site.Cartn_z"];
                    var at2x = caprev["_atom_site.Cartn_x"];
                    var at2y = caprev["_atom_site.Cartn_y"];
                    var at2z = caprev["_atom_site.Cartn_z"];
                    var at1at2x = at1x-at2x;
                    var at1at2y = at1y-at2y;
                    var at1at2z = at1z-at2z;
                    var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                    if(distsq>maxcadistsq){
                        trace.push(thisTrace);
                        thisTrace = [];
                        thisTraceAt = [];
                    }
                }
                thisTraceAt.push(ca);
                thisTrace.push(residues[ir]["SSE"]);
            } else {
                var c5 = residues[ir].getAtomTrimmed( "C5*" );
                if(!c5){
                    c5 = residues[ir].getAtomTrimmed( "C5'" );
                }
                if(c5){
                    if(thisTraceAt.length>0){
                        var caprev = thisTraceAt[thisTraceAt.length-1];
                        var at1x = c5["_atom_site.Cartn_x"];
                        var at1y = c5["_atom_site.Cartn_y"];
                        var at1z = c5["_atom_site.Cartn_z"];
                        var at2x = caprev["_atom_site.Cartn_x"];
                        var at2y = caprev["_atom_site.Cartn_y"];
                        var at2z = caprev["_atom_site.Cartn_z"];
                        var at1at2x = at1x-at2x;
                        var at1at2y = at1y-at2y;
                        var at1at2z = at1z-at2z;
                        var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                        if(distsq>maxc5distsq){
                            trace.push(thisTrace);
                            thisTrace = [];
                            thisTraceAt = [];
                        }
                    }
                    thisTraceAt.push(c5);
                    thisTrace.push("SSE_Nucleic");
                } else {
                    var c3 = residues[ir].getAtomTrimmed( "C3*" );
                    if(!c3){
                        c3 = residues[ir].getAtomTrimmed( "C3'" );
                    }
                    if(c3){
                        if(thisTraceAt.length>0){
                            var caprev = thisTraceAt[thisTraceAt.length-1];
                            var at1x = c3["_atom_site.Cartn_x"];
                            var at1y = c3["_atom_site.Cartn_y"];
                            var at1z = c3["_atom_site.Cartn_z"];
                            var at2x = caprev["_atom_site.Cartn_x"];
                            var at2y = caprev["_atom_site.Cartn_y"];
                            var at2z = caprev["_atom_site.Cartn_z"];
                            var at1at2x = at1x-at2x;
                            var at1at2y = at1y-at2y;
                            var at1at2z = at1z-at2z;
                            var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
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

Model.prototype.getTraceSecStrAtoms = function () {
    // FIXME - Nucleic acid?
    var trace = [];
    var chains = this.chains;
    var maxcadistsq = 23.0;
    var maxc5distsq = 66.0;
    for(var ic=0;ic<chains.length;ic++){
        var thisTrace = [];
        var thisTraceAt = [];
        var residues = chains[ic].residues;
        for(var ir=0;ir<residues.length;ir++){
            var ca = residues[ir].getAtomTrimmed( "CA" );
            if(ca&&ca.element()==="C"){
                if(thisTraceAt.length>0){
                    var caprev = thisTraceAt[thisTraceAt.length-1];
                    var at1x = ca["_atom_site.Cartn_x"];
                    var at1y = ca["_atom_site.Cartn_y"];
                    var at1z = ca["_atom_site.Cartn_z"];
                    var at2x = caprev["_atom_site.Cartn_x"];
                    var at2y = caprev["_atom_site.Cartn_y"];
                    var at2z = caprev["_atom_site.Cartn_z"];
                    var at1at2x = at1x-at2x;
                    var at1at2y = at1y-at2y;
                    var at1at2z = at1z-at2z;
                    var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                    if(distsq>maxcadistsq){
                        trace.push(thisTrace);
                        thisTrace = [];
                        thisTraceAt = [];
                    }
                }
                thisTraceAt.push(ca);
                thisTrace.push(ca);
            } else {
                var c5 = residues[ir].getAtomTrimmed( "C5*" );
                if(!c5){
                    c5 = residues[ir].getAtomTrimmed( "C5'" );
                }
                if(c5){
                    if(thisTraceAt.length>0){
                        var caprev = thisTraceAt[thisTraceAt.length-1];
                        var at1x = c5["_atom_site.Cartn_x"];
                        var at1y = c5["_atom_site.Cartn_y"];
                        var at1z = c5["_atom_site.Cartn_z"];
                        var at2x = caprev["_atom_site.Cartn_x"];
                        var at2y = caprev["_atom_site.Cartn_y"];
                        var at2z = caprev["_atom_site.Cartn_z"];
                        var at1at2x = at1x-at2x;
                        var at1at2y = at1y-at2y;
                        var at1at2z = at1z-at2z;
                        var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                        if(distsq>maxc5distsq){
                            trace.push(thisTrace);
                            thisTrace = [];
                            thisTraceAt = [];
                        }
                    }
                    thisTraceAt.push(c5);
                    thisTrace.push(c5);
                } else {
                    var c3 = residues[ir].getAtomTrimmed( "C3*" );
                    if(!c3){
                        c3 = residues[ir].getAtomTrimmed( "C3'" );
                    }
                    if(c3){
                        if(thisTraceAt.length>0){
                            var caprev = thisTraceAt[thisTraceAt.length-1];
                            var at1x = c3["_atom_site.Cartn_x"];
                            var at1y = c3["_atom_site.Cartn_y"];
                            var at1z = c3["_atom_site.Cartn_z"];
                            var at2x = caprev["_atom_site.Cartn_x"];
                            var at2y = caprev["_atom_site.Cartn_y"];
                            var at2z = caprev["_atom_site.Cartn_z"];
                            var at1at2x = at1x-at2x;
                            var at1at2y = at1y-at2y;
                            var at1at2z = at1z-at2z;
                            var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
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

Model.prototype.getTraceColours = function (atomColours) {
    // FIXME - Nucleic acid?
    //FIXME - We need to get colours for the ca["_atom_site.id"] for MODEL 1, not this model.
    console.log(this);
    var trace = [];
    var chains = this.chains;
    var maxcadistsq = 23.0;
    var maxc5distsq = 66.0;
    for(var ic=0;ic<chains.length;ic++){
        var thisTrace = [];
        var thisTraceAt = [];
        var residues = chains[ic].residues;
        for(var ir=0;ir<residues.length;ir++){
            var ca = residues[ir].getAtomTrimmed( "CA" );
            var ca1 = this.hierarchy[0].chains[ic].residues[ir].getAtomTrimmed( "CA" );
            if(ca&&ca.element()==="C"){
                if(thisTraceAt.length>0){
                    var caprev = thisTraceAt[thisTraceAt.length-1];
                    var at1x = ca["_atom_site.Cartn_x"];
                    var at1y = ca["_atom_site.Cartn_y"];
                    var at1z = ca["_atom_site.Cartn_z"];
                    var at2x = caprev["_atom_site.Cartn_x"];
                    var at2y = caprev["_atom_site.Cartn_y"];
                    var at2z = caprev["_atom_site.Cartn_z"];
                    var at1at2x = at1x-at2x;
                    var at1at2y = at1y-at2y;
                    var at1at2z = at1z-at2z;
                    var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                    if(distsq>maxcadistsq){
                        trace.push(thisTrace);
                        thisTrace = [];
                        thisTraceAt = [];
                    }
                }
                thisTraceAt.push(ca);
                thisTrace.push(atomColours[ca1["_atom_site.id"]]);
            } else {
                var c5 = residues[ir].getAtomTrimmed( "C5*" );
                var c51 = this.hierarchy[0].chains[ic].residues[ir].getAtomTrimmed( "C5*" );
                if(!c5){
                    c5 = residues[ir].getAtomTrimmed( "C5'" );
                    c51 = this.hierarchy[0].chains[ic].residues[ir].getAtomTrimmed( "C5'" );
                }
                if(c5){
                    if(thisTraceAt.length>0){
                        var caprev = thisTraceAt[thisTraceAt.length-1];
                        var at1x = c5["_atom_site.Cartn_x"];
                        var at1y = c5["_atom_site.Cartn_y"];
                        var at1z = c5["_atom_site.Cartn_z"];
                        var at2x = caprev["_atom_site.Cartn_x"];
                        var at2y = caprev["_atom_site.Cartn_y"];
                        var at2z = caprev["_atom_site.Cartn_z"];
                        var at1at2x = at1x-at2x;
                        var at1at2y = at1y-at2y;
                        var at1at2z = at1z-at2z;
                        var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                        if(distsq>maxc5distsq){
                            trace.push(thisTrace);
                            thisTrace = [];
                            thisTraceAt = [];
                        }
                    }
                    thisTraceAt.push(c5);
                    thisTrace.push(atomColours[c51["_atom_site.id"]]);
                } else {
                    var c3 = residues[ir].getAtomTrimmed( "C3*" );
                    var c31 = this.hierarchy[0].chains[ic].residues[ir].getAtomTrimmed( "C3*" );
                    if(!c3){
                        c3 = residues[ir].getAtomTrimmed( "C3'" );
                        c31 = this.hierarchy[0].chains[ic].residues[ir].getAtomTrimmed( "C3'" );
                    }
                    if(c3){
                        if(thisTraceAt.length>0){
                            var caprev = thisTraceAt[thisTraceAt.length-1];
                            var at1x = c3["_atom_site.Cartn_x"];
                            var at1y = c3["_atom_site.Cartn_y"];
                            var at1z = c3["_atom_site.Cartn_z"];
                            var at2x = caprev["_atom_site.Cartn_x"];
                            var at2y = caprev["_atom_site.Cartn_y"];
                            var at2z = caprev["_atom_site.Cartn_z"];
                            var at1at2x = at1x-at2x;
                            var at1at2y = at1y-at2y;
                            var at1at2z = at1z-at2z;
                            var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
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

Model.prototype.getTrace = function () {
    // FIXME - Nucleic acid?
    var trace = [];
    var chains = this.chains;
    var maxcadistsq = 23.0;
    var maxc5distsq = 66.0;
    for(var ic=0;ic<chains.length;ic++){
        var thisTrace = [];
        var thisTraceAt = [];
        var residues = chains[ic].residues;
        for(var ir=0;ir<residues.length;ir++){
            var ca = residues[ir].getAtomTrimmed( "CA" );
            if(ca&&ca.element()==="C"){
                if(thisTraceAt.length>0){
                    var caprev = thisTraceAt[thisTraceAt.length-1];
                    var at1x = ca["_atom_site.Cartn_x"];
                    var at1y = ca["_atom_site.Cartn_y"];
                    var at1z = ca["_atom_site.Cartn_z"];
                    var at2x = caprev["_atom_site.Cartn_x"];
                    var at2y = caprev["_atom_site.Cartn_y"];
                    var at2z = caprev["_atom_site.Cartn_z"];
                    var at1at2x = at1x-at2x;
                    var at1at2y = at1y-at2y;
                    var at1at2z = at1z-at2z;
                    var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
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
                var c5 = residues[ir].getAtomTrimmed( "C5*" );
                if(!c5){
                    c5 = residues[ir].getAtomTrimmed( "C5'" );
                }
                if(c5){
                    if(thisTraceAt.length>0){
                        var caprev = thisTraceAt[thisTraceAt.length-1];
                        var at1x = c5["_atom_site.Cartn_x"];
                        var at1y = c5["_atom_site.Cartn_y"];
                        var at1z = c5["_atom_site.Cartn_z"];
                        var at2x = caprev["_atom_site.Cartn_x"];
                        var at2y = caprev["_atom_site.Cartn_y"];
                        var at2z = caprev["_atom_site.Cartn_z"];
                        var at1at2x = at1x-at2x;
                        var at1at2y = at1y-at2y;
                        var at1at2z = at1z-at2z;
                        var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
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
                    var c3 = residues[ir].getAtomTrimmed( "C3*" );
                    if(!c3){
                        c3 = residues[ir].getAtomTrimmed( "C3'" );
                    }
                    if(c3){
                        if(thisTraceAt.length>0){
                            var caprev = thisTraceAt[thisTraceAt.length-1];
                            var at1x = c3["_atom_site.Cartn_x"];
                            var at1y = c3["_atom_site.Cartn_y"];
                            var at1z = c3["_atom_site.Cartn_z"];
                            var at2x = caprev["_atom_site.Cartn_x"];
                            var at2y = caprev["_atom_site.Cartn_y"];
                            var at2z = caprev["_atom_site.Cartn_z"];
                            var at1at2x = at1x-at2x;
                            var at1at2y = at1y-at2y;
                            var at1at2z = at1z-at2z;
                            var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
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

Model.prototype.getModelNum = function () {
    return this.chains[0].residues[0].atoms[0]["_atom_site.pdbx_PDB_model_num"];
}

Model.prototype.addChain = function (chain) {
    this.chains.push(chain);
    chain.model = this;
}

function Chain() {
    this.residues = [];
}

Atom.prototype.isMetal = function () {
    if(Model.prototype.metalElements.indexOf(this.element().toUpperCase())>-1){
        return true;
    }
    return false;
}

Atom.prototype.getBonds = function () {
    return this.bonds;
}

Atom.prototype.getChainID = function () {
    return this["_atom_site.label_asym_id"];
}

Chain.prototype.getAtoms = function () {
    var chainAtoms = [];
    for(var ir=0;ir<this.residues.length;ir++){
        for(ip=0;ip<this.residues[ir].atoms.length;ip++) chainAtoms.push(this.residues[ir].atoms[ip]);
    }
    return chainAtoms;
}

Chain.prototype.getChainID = function () {
    return this.residues[0].atoms[0]["_atom_site.label_asym_id"];
}

Chain.prototype.addResidue = function (res) {
    this.residues.push(res);
    res.chain = this;
}

Chain.prototype.getResidue = function (i) {
    return this.residues[i];
}

function Residue() {
    this.atoms = [];
}

Residue.prototype.isAminoAcid = function () {
    return (Model.prototype.aminoResidues.indexOf(this.atoms[0]["_atom_site.label_comp_id"])>-1);
}

Residue.prototype.getCASideAtoms = function (atname) {
    var sideAtoms = [];

    for(var iat=0;iat<this.atoms.length;iat++){
        if((Model.prototype.mainAtoms.indexOf(this.atoms[iat]["_atom_site.label_atom_id"])===-1)||this.atoms[iat]["_atom_site.label_atom_id"]==="CA"){
            sideAtoms.push(this.atoms[iat]);
        }
    }

    return sideAtoms;
}

Residue.prototype.getMainAtoms = function (atname) {
    var mainAtoms = [];

    for(var iat=0;iat<this.atoms.length;iat++){
        if(Model.prototype.mainAtoms.indexOf(this.atoms[iat]["_atom_site.label_atom_id"])!==-1){
            mainAtoms.push(this.atoms[iat]);
        }
    }

    return mainAtoms;
}

Residue.prototype.getSideAtoms = function (atname) {
    var sideAtoms = [];

    for(var iat=0;iat<this.atoms.length;iat++){
        if(Model.prototype.mainAtoms.indexOf(this.atoms[iat]["_atom_site.label_atom_id"])===-1){
            sideAtoms.push(this.atoms[iat]);
        }
    }

    return sideAtoms;
}

Residue.prototype.getAtom = function (atname) {
    for(var iat=0;iat<this.atoms.length;iat++){
        if(atname===this.atoms[iat]["_atom_site.label_atom_id"]){
            return this.atoms[iat];
        }
    }
    return false;
}

function trim27(str) {
  var c;
  for (var i = 0; i < str.length; i++) {
    if (str[i] == ' ')
    continue; else break;
  }
  for (var j = str.length - 1; j >= i; j--) {
    if (str[j] == ' ')
    continue; else break;
  }
  return str.substring(i, j + 1);
}

Residue.prototype.getAtomTrimmed = function (atname) {
    return this.getAtom(atname);
    var len = this.atoms.length;
    var trimmed = trim27(atname);
    for(var iat=0;iat<len;iat++){
        var thisName = trim27(this.atoms[iat]["_atom_site.label_atom_id"]);
        if(trimmed===thisName){
            return this.atoms[iat];
        }
    }
    return false;
}

Residue.prototype.getResidueID = function () {
    var resId = "";
    var seqId = this.getSeqID();
    resId += seqId;
    var insCode = this.getInsCode();
    if(insCode!=="?"&&insCode!=="."){
        resId += "."+insCode;
    }
    return resId;
}

Atom.prototype.getAtomID = function () {
    // FIXME, doesn't do altLocs.
    var altLoc = this["_atom_site.label_alt_id"];
    var modelNum = this.residue.chain.model.getModelNum();
    var chainID = this.getChainID();
    var residueID = this.getResidueID();
    var thisAtomID = ""+this["_atom_site.label_atom_id"];
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
    var atomId = "/"+modelNum+"/"+chainID+"/"+residueID+"("+this.residue.getName()+")/"+thisAtomID;
    if(typeof(altLoc)!=="undefined"&&altLoc!=="."&&altLoc!=="?"&&altLoc!==""&&altLoc!==" "){
        atomId += ":"+altLoc;
    }
    return atomId;
}

Atom.prototype.getResidueID = function () {
    var resId = "";
    var seqId = this.getSeqID();
    resId += seqId;
    var insCode = this.getInsCode();
    if(insCode!=="?"&&insCode!=="."){
        resId += "."+insCode;
    }
    return resId;
}

Atom.prototype.getSeqIDAuth = function () {
    return this["_atom_site.auth_seq_id"];
}

Atom.prototype.getSeqID = function () {
    // FIXME - I need to preferentially choose auth or label for everything! I am currently in a mess, see A/545|564 and (A|N)/933 of 4iib
    /*
    if(this["_atom_site.auth_seq_id"]!=="."&&this["_atom_site.auth_seq_id"]!==""&&this["_atom_site.auth_seq_id"]!=="?"){
        return this["_atom_site.auth_seq_id"];
    }
    */
    return this["_atom_site.label_seq_id"];
}

Residue.prototype.getSeqID = function () {
    return this.atoms[0].getSeqID();
}

Residue.prototype.getSeqIDAuth = function () {
    return this.atoms[0].getSeqIDAuth();
}

Residue.prototype.getInsCode = function () {
    return this.atoms[0]["_atom_site.pdbx_PDB_ins_code"];
}

Atom.prototype.getInsCode = function () {
    return this["_atom_site.pdbx_PDB_ins_code"];
}

Residue.prototype.getName = function () {
    return this.atoms[0]["_atom_site.label_comp_id"];
}

Residue.prototype.addAtom = function (atom) {
    this.atoms.push(atom);
    atom.residue = this;
}

function Atom(oldAtom) {
    this.bonds = [];
    if(typeof(oldAtom)!=="undefined"&&oldAtom){
        for (var prop in oldAtom) {
            if (oldAtom.hasOwnProperty(prop)) {
                this[prop] = oldAtom[prop];
            }
        }
    }
}

Atom.prototype.element = function () {
    return this["_atom_site.type_symbol"];
}

Atom.prototype.x = function () {
    return this["_atom_site.Cartn_x"];
}

Atom.prototype.y = function () {
    return this["_atom_site.Cartn_y"];
}

Atom.prototype.z = function () {
    return this["_atom_site.Cartn_z"];
}

function parsePDB(lines) {

/*
MODEL, MDLNUM
_atom_site.label_entity_id : "1"
*/
    var atoms = [];
    var elements = [];
    var restypes = [];
    var models = [];
    var altlocs = [];
    var current_model = "?";
    var modamino = [];
    var cryst = {};
    for(var il=0;il<lines.length;il++){
        if(lines[il].substr(0,6)==="MODEL "){
            current_model = parseInt(lines[il].substr(10,4).trim());
            if(models.indexOf(current_model)===-1){
                models.push(current_model);
            }
        }
        if(lines[il].substr(0,6)==="CRYST1"){
            var a = parseFloat(lines[il].substring(6,15));
            var b = parseFloat(lines[il].substring(15,24));
            var c = parseFloat(lines[il].substring(24,33));
            var alpha = parseFloat(lines[il].substring(33,40));
            var beta  = parseFloat(lines[il].substring(40,47));
            var gamma = parseFloat(lines[il].substring(47,54));
            var sg = lines[il].substring(55,66).trim();
            var cell = new Cell();
            cell.init(a,b,c,alpha,beta,gamma);
            cryst["cell"] = cell;
            cryst["sg"] = sg;
        }
        if(lines[il].substr(0,6)==="ATOM  "||lines[il].substr(0,6)==="HETATM"){
            var atom = new Atom();
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
            atom["_atom_site.pdbx_PDB_ins_code"] = "?";
            atom["_atom_site.type_symbol"] = "?";
            atom["_atom_site.pdbx_PDB_model_num"] = current_model;
            var id = lines[il].substr(6,5).trim();
            // This next line is arguably "wrong" but makes PDB parsing same as MMCIF and means we do not have to trim atom names repeatedly.
            var label_atom_id = lines[il].substr(12,4).trim(); 
            var label_alt_id = lines[il].substr(16,1).trim();
            var label_comp_id = lines[il].substr(17,3).trim();
            var label_asym_id = lines[il].substr(21,1).trim();
            var label_seq_id = lines[il].substr(22,4).trim();
            var pdbx_PDB_ins_code = lines[il].substr(26,1).trim();
            var type_symbol = lines[il].substr(76,2).trim();
            var Cartn_x = lines[il].substr(30,8).trim();
            var Cartn_y = lines[il].substr(38,8).trim();
            var Cartn_z = lines[il].substr(46,8).trim();
            var B_iso_or_equiv = lines[il].substr(60,6).trim();
            var occupancy = lines[il].substr(54,6).trim();
            var pdbx_formal_charge = lines[il].substr(78,2).trim();
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
    var res = {};
    res["atoms"] = atoms;
    res["elements"] = elements;
    res["restypes"] = restypes;
    res["altlocs"] = altlocs;
    res["models"] = models;
    res["modamino"] = modamino;
    res["cryst"] = cryst;

    return res;
}

function getLoopPreSplit(lines,loopName_in,filterName,filterValue){
    // This is faster, but still quite slow ...
    var start = new Date().getTime();
    var loopName = loopName_in+".";
    var inWantedLoop = false;
    var loopLines = [];
    var headerLines = [];
    var len = lines.length;
    var il=0;
    for(;il<len;il++){
        var l = lines[il].replace(/(^\s+|\s+$)/g,'').trim();
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
        for(;il<len;il++){
            //var l = lines[il].replace(/(^\s+|\s+$)/g,'');
            var l = trim27(lines[il]);
            if(l === "loop_"||(l.substring(0,1)==="_"&&l.substring(0,loopName.length)!==loopName)){
                console.log(loopName_in+" "+loopLines.length+" "+il);
                break;
            }else{
                var split = l.match(/(?:[^\s"]+|"[^"]*")+/g);
                loopLines.push(split);
            }
        }
    } else {
        var nameIdx = headerLines.indexOf(filterName);
        for(;il<len;il++){
            //var l = lines[il].replace(/(^\s+|\s+$)/g,'');
            var l = trim27(lines[il]);
            if(l === "loop_"||(l.substring(0,1)==="_"&&l.substring(0,loopName.length)!==loopName)){
                console.log(loopName_in+" "+loopLines.length+" "+il);
                break;
            }else{
                if(l.indexOf(filterValue)!==-1){
                    // This line is the killer .....
                    var split = l.match(/(?:[^\s"]+|"[^"]*")+/g);
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
    var loopName = loopName_in+".";
    var inWantedLoop = false;
    var loopLines = [];
    var len = lines.length;
    for(var il=0;il<len;il++){
        var l = lines[il].replace(/(^\s+|\s+$)/g,'');
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
    var inQuote = false;
    var currentString = '';
    if(stringToSplit.length===0) return [];
    return stringToSplit.match(/(?:[^\s"]+|"[^"]*")+/g);
    var theStrings = [];

    for(var ic=0;ic<stringToSplit.length;ic++){
        var c = stringToSplit.charAt(ic);
        if(c=='"'){
            if(inQuote){
                inQuote = false;
                if(currentString&&currentString.trim()!==""){
                    theStrings.push(currentString);
                }
                currentString = '';
            } else {
                inQuote = true;
                if(currentString&&currentString.trim()!==""){
                    theStrings = theStrings.concat(currentString.match(/\S+/g));
                }
                currentString = '';
            }
        } else {
            currentString += c;
        }

    }

    if(currentString){
        theStrings = theStrings.concat(currentString.match(/\S+/g))
    }

    return theStrings;

}

function parseLoop(loopLines,FLOAT_PROPS){
    var loopItems = [];
    var loopLinesTypes = [];
    for(var il=0;il<loopLines.length;il++){
        if(loopLines[il].substring(0,1) === "_"){
            loopLinesTypes.push(loopLines[il]);
        } else if(splitQuotedCIFString(loopLines[il]).length===loopLinesTypes.length){
            var atom = {};
            var split = splitQuotedCIFString(loopLines[il]);
            if(split[0]==="TER") continue; // FIXME - Hmm. In general, do these pop-up.
            for(var iprop=0;iprop<split.length;iprop++){
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

    var FLOAT_PROPS = ["_chem_comp_atom.partial_charge", "_chem_comp_atom.x", "_chem_comp_atom.y","_chem_comp_atom.z" ];

    var atomSiteLines = getLoop(lines,"_chem_comp_atom");

    var atomSiteTypes = [];
    var atoms = [];

    var elements = [];
    var restypes = [];
    var models = [];
    var altlocs = [];
    var id = 0;
    for(var il=0;il<atomSiteLines.length;il++){
        if(atomSiteLines[il].substring(0,1) === "_"){
            atomSiteTypes.push(atomSiteLines[il]);
        } else if(splitQuotedCIFString(atomSiteLines[il]).length===atomSiteTypes.length){
            var atom = new Atom();
            var split = splitQuotedCIFString(atomSiteLines[il]);
            if(split[0]==="TER") continue;
            for(var iprop=0;iprop<split.length;iprop++){
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

    for(var iloc=0;iloc<altlocs.length;iloc++){
        if(altlocs[iloc] === "."){
            altlocs[iloc] = "";
        }
    }

    var anisou = parseLoop(getLoop(lines,"_atom_site_anisotrop"),["_atom_site_anisotrop.U[1][1]","_atom_site_anisotrop.U[2][2]","_atom_site_anisotrop.U[3][3]","_atom_site_anisotrop.U[1][2]","_atom_site_anisotrop.U[1][3]","_atom_site_anisotrop.U[2][3]","_atom_site_anisotrop.U[1][1]_esd","_atom_site_anisotrop.U[2][2]_esd","_atom_site_anisotrop.U[3][3]_esd","_atom_site_anisotrop.U[1][2]_esd","_atom_site_anisotrop.U[1][3]_esd","_atom_site_anisotrop.U[2][3]_esd"]);
    //console.log(anisou);

    insertAnisou(atoms,anisou);

    atoms = atomsToHierarchy(atoms);

    var res = {};
    res["atoms"] = atoms;
    res["elements"] = elements;
    res["restypes"] = restypes;
    res["models"] = models;
    res["altlocs"] = altlocs;

    return res;
    
}

function parseMMCIF(lines) {

    var start = new Date().getTime();
    console.log(lines.length);

    var FLOAT_PROPS = ["_atom_site.cartn_x", "_atom_site.cartn_y", "_atom_site.cartn_z","_atom_site.cartn_x_esd", "_atom_site.cartn_y_esd", "_atom_site.cartn_z_esd","_atom_site.Cartn_x", "_atom_site.Cartn_y", "_atom_site.Cartn_z", "_atom_site.B_iso_or_equiv", "_atom_site.occupancy", "_atom_site.pdbx_formal_charge","_atom_site.Cartn_x_esd", "_atom_site.Cartn_y_esd", "_atom_site.Cartn_z_esd", "_atom_site.B_iso_or_equiv_esd", "_atom_site.occupancy_esd", "_atom_site.pdbx_formal_charge_esd"];

    var atomSiteandHeaderLines = [];
    if(lines.length>100000){
        console.log("Doing CA filter "+lines.length+" "+100000);
        atomSiteandHeaderLines = getLoopPreSplit(lines,"_atom_site","_atom_site.label_atom_id","CA");
    }else {
        console.log("Not doing CA filter");
        atomSiteandHeaderLines = getLoopPreSplit(lines,"_atom_site");
    }

    var atomSiteTypes = atomSiteandHeaderLines[0];
    var atomSiteLines = atomSiteandHeaderLines[1];
    console.log("Time to end of getLoopPreSplit: "+(new Date().getTime()-start));

    var atoms = [];

    var elements = [];
    var restypes = [];
    var models = [];
    var altlocs = [];
    var modamino = [];

    var spllen = 0;
    var atomSiteLinesLength = atomSiteLines.length;

    var nameIdx = atomSiteTypes.indexOf("_atom_site.label_atom_id");
    var atomSiteTypesLength = atomSiteTypes.length;
    console.log(nameIdx);

    var floatIndices = [];
    var strIndices = [];
    for(var iprop=0;iprop<atomSiteTypesLength;iprop++){
        if(FLOAT_PROPS.indexOf(atomSiteTypes[iprop])>-1){
            floatIndices.push(iprop);
        } else {
            strIndices.push(iprop);
        }
    }
    var floatIndicesLength = floatIndices.length;
    var strIndicesLength = strIndices.length;

    for(var il=0;il<atomSiteLinesLength;il++){
        var split = atomSiteLines[il];
        var splitlength = split.length;
        spllen += splitlength;
        if(split.length===atomSiteTypesLength){
            var atom = new Atom();
            if(split[0]==="TER") continue;
            // This is all slow (e.g. 3j3q, and I do not know how to avoid problem.)
            for(var ipropFloat=0;ipropFloat<floatIndicesLength;ipropFloat++){
                var iprop = floatIndices[ipropFloat];
                if(split[iprop] !== "?"){
                //try{
                    atom[atomSiteTypes[iprop]] = parseFloat(split[iprop]);
                } else {
                //} catch(e) {
                    atom[atomSiteTypes[iprop]] = Number.NaN;
                }
            }
            for(var ipropStr=0;ipropStr<strIndicesLength;ipropStr++){
                var iprop = strIndices[ipropStr];
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

    var atomLength = atoms.length;
    for(var iat=0;iat<atomLength;iat++){
        var atom = atoms[iat];
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

    for(var iloc=0;iloc<altlocs.length;iloc++){
        if(altlocs[iloc] === "."){
            altlocs[iloc] = "";
        }
    }

    var anisou = parseLoop(getLoop(lines,"_atom_site_anisotrop"),["_atom_site_anisotrop.U[1][1]","_atom_site_anisotrop.U[2][2]","_atom_site_anisotrop.U[3][3]","_atom_site_anisotrop.U[1][2]","_atom_site_anisotrop.U[1][3]","_atom_site_anisotrop.U[2][3]","_atom_site_anisotrop.U[1][1]_esd","_atom_site_anisotrop.U[2][2]_esd","_atom_site_anisotrop.U[3][3]_esd","_atom_site_anisotrop.U[1][2]_esd","_atom_site_anisotrop.U[1][3]_esd","_atom_site_anisotrop.U[2][3]_esd"]);
    //console.log(anisou);

    insertAnisou(atoms,anisou);

    atoms = atomsToHierarchy(atoms);

    var res = {};
    res["atoms"] = atoms;
    res["elements"] = elements;
    res["restypes"] = restypes;
    res["models"] = models;
    res["altlocs"] = altlocs;
    res["modamino"] = modamino;

    return res;
}

Model.prototype.CloseContacts = function (atoms,atoms2,mindist,maxdist,checkMetalDistance) {
    var self = this;
    var contacts = this.SeekContacts(atoms,atoms2,mindist,maxdist);
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

Model.prototype.SeekContactsSimple = function (atoms,atoms2,mindist,maxdist) {
    var minsq = mindist * mindist;
    var maxsq = maxdist * maxdist;
    var contacts = [];

    console.log("SeekContactsSimple");
    console.log(atoms === atoms2);

    var same = false;
    if(atoms === atoms2){
        same = true;
    }

    var abs=Math.abs; 
    var sqrt=Math.sqrt; 

    var len = atoms.length;
    for(var iat1=0;iat1<len;iat1++){
        var at1 = atoms[iat1];
        var at1x = at1["_atom_site.Cartn_x"];
        var at1y = at1["_atom_site.Cartn_y"];
        var at1z = at1["_atom_site.Cartn_z"];
        var altLoc = at1["_atom_site.label_alt_id"];
        var s2 = 0;
        var e2 = atoms2.length;
        //if(same) s2 = iat1+1;
        if(same) e2 = iat1;
        for(var iat2=s2;iat2<e2;iat2++){
            var at2  = atoms2[iat2];
            var at2x = at2["_atom_site.Cartn_x"];
            var at1at2x = abs(at1x-at2x);
            if(at1at2x<=maxdist){
                var at2y = at2["_atom_site.Cartn_y"];
                var at1at2y = abs(at1y-at2y);
                if(at1at2y<=maxdist){
                    var at2z = at2["_atom_site.Cartn_z"];
                    var at1at2z = abs(at1z-at2z);
                    if(at1at2z<=maxdist){
                        var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                        //console.log("("+maxdist+") "+at1at2x+" "+at1at2y+" "+at1at2z+" "+Math.sqrt(distsq));
                        if (distsq >= minsq && distsq <= maxsq){
                            //if(atoms.indexOf(at2)==-1||at1["_atom_site.id"]>at2["_atom_site.id"]){
                            contacts.push([sqrt(distsq), at1, at2]);
                            //console.log("Add simple "+at1.getAtomID()+" "+at2.getAtomID());
                            //}
                        }
                    }
                }
            }
        }
    }
    return contacts;
}
    
Model.prototype.SeekContactsOld = function (atoms,atoms2,mindist,maxdist) {
    var minsq = mindist * mindist;
    var maxsq = maxdist * maxdist;
    var contacts = [];

    console.log("SeekContacts");
    console.log(atoms === atoms2);

    var same = false;
    if(atoms === atoms2){
        same = true;
    }

    var abs=Math.abs; 
    var sqrt=Math.sqrt; 

    var len = atoms.length;
    for(var iat1=0;iat1<len;iat1++){
        var at1 = atoms[iat1];
        var at1x = at1["_atom_site.Cartn_x"];
        var at1y = at1["_atom_site.Cartn_y"];
        var at1z = at1["_atom_site.Cartn_z"];
        var altLoc = at1["_atom_site.label_alt_id"];
        var s2 = 0;
        var e2 = atoms2.length;
        //if(same) s2 = iat1+1;
        if(same) e2 = iat1;
        if(altLoc!=="*"&&altLoc!=="?"&&altLoc!==" "&&altLoc!=="."){
            for(var iat2=s2;iat2<e2;iat2++){
                var at2  = atoms2[iat2];
                var at2x = at2["_atom_site.Cartn_x"];
                var at1at2x = abs(at1x-at2x);
                var altLoc2 = at2["_atom_site.label_alt_id"];
                if(at1at2x<=maxdist&&(altLoc2==="*"||altLoc2==="?"||altLoc2===" "||altLoc2==="."||altLoc2===altLoc)){
                    var at2y = at2["_atom_site.Cartn_y"];
                    var at1at2y = abs(at1y-at2y);
                    if(at1at2y<=maxdist){
                        var at2z = at2["_atom_site.Cartn_z"];
                        var at1at2z = abs(at1z-at2z);
                        if(at1at2z<=maxdist){
                            var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                            if (distsq >= minsq && distsq <= maxsq){
                                //if(atoms.indexOf(at2)==-1||at1["_atom_site.id"]>at2["_atom_site.id"]){
                                    contacts.push([sqrt(distsq), at1, at2]);
                                //}
                            }
                        }
                    }
                }
            }
        } else {
            for(var iat2=s2;iat2<e2;iat2++){
                var at2  = atoms2[iat2];
                var at2x = at2["_atom_site.Cartn_x"];
                var at1at2x = abs(at1x-at2x);
                if(at1at2x<=maxdist){
                    var at2y = at2["_atom_site.Cartn_y"];
                    var at1at2y = abs(at1y-at2y);
                    if(at1at2y<=maxdist){
                        var at2z = at2["_atom_site.Cartn_z"];
                        var at1at2z = abs(at1z-at2z);
                        if(at1at2z<=maxdist){
                            var distsq = (at1at2x)*(at1at2x) + (at1at2y)*(at1at2y) + (at1at2z)*(at1at2z);
                            //console.log("("+maxdist+") "+at1at2x+" "+at1at2y+" "+at1at2z+" "+Math.sqrt(distsq));
                            if (distsq >= minsq && distsq <= maxsq){
                                //if(atoms.indexOf(at2)==-1||at1["_atom_site.id"]>at2["_atom_site.id"]){
                                    contacts.push([sqrt(distsq), at1, at2]);
                                //}
                            }
                        }
                    }
                }
            }
        }
    }
    return contacts
}

Model.prototype.calculateBonds = Model.prototype.calculateBondsNew;
Model.prototype.SeekContacts = Model.prototype.SeekContactsNew;
