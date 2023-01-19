export const gemmiAtomsToCirclesSpheresInfo = (atoms,size,primType,colourScheme) => {

    let sphere_sizes = [];
    let sphere_col_tri = [];
    let sphere_vert_tri = [];
    let sphere_idx_tri = [];
    let sphere_atoms = [];

    for(let iat=0;iat<atoms.length;iat++){
        sphere_idx_tri.push(iat);
        sphere_vert_tri.push(atoms[iat].pos[0]);
        sphere_vert_tri.push(atoms[iat].pos[1]);
        sphere_vert_tri.push(atoms[iat].pos[2]);
        for(let ip=0;ip<colourScheme[`${atoms[iat].serial}`].length;ip++) sphere_col_tri.push(colourScheme[`${atoms[iat].serial}`][ip]);
        sphere_sizes.push(size);
        let atom = {};
        atom["x"] = atoms[iat].pos[0];
        atom["y"] = atoms[iat].pos[1];
        atom["z"] = atoms[iat].pos[2];
        atom["tempFactor"] = atoms[iat].b_iso;//atoms[iat]["_atom_site.B_iso_or_equiv"];
        atom["charge"] = atoms[iat].charge;//atoms[iat]["_atom_site.pdbx_formal_charge"];
        atom["symbol"] = atoms[iat].element;//atoms[iat]["_atom_site.type_symbol"];
        atom["label"] =  "AnAtom"//atoms[iat].getAtomID();
        sphere_atoms.push(atom);
    }

    const spherePrimitiveInfo = {
        atoms:[[sphere_atoms]],
        sizes: [[sphere_sizes]], 
        col_tri:[[sphere_col_tri]], 
        norm_tri:[[[]]], 
        vert_tri:[[sphere_vert_tri]], 
        idx_tri:[[sphere_idx_tri]] , 
        prim_types:[[primType]] 
    }
    return spherePrimitiveInfo;
}