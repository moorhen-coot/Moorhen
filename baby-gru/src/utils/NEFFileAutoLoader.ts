import pako from "pako";

export function convertChemShiftDataframe(df){
    const keyMap = {
		"_nef_chemical_shift.atom_name" : "atom",
		"_nef_chemical_shift.chain_code" : "chain",
		"_nef_chemical_shift.element" : "element",
		"_nef_chemical_shift.isotope_number" : "isotope",
		"_nef_chemical_shift.residue_name" : "resname",
		"_nef_chemical_shift.sequence_code" : "seq",
		"_nef_chemical_shift.value" : "chemshift",
		"_nef_chemical_shift.value_uncertainty" : "uncertainty"}
    const parsed = JSON.parse(df)
    const transformed = parsed.map(obj =>
        Object.fromEntries(
            Object.entries(keyMap).map(([oldKey, newKey]) => [
            newKey,
            obj[oldKey],
                 ])
             )
     )    
     return(transformed) 
}

function convertNEFHydrogen(nefName, resName) {

  const resiTypes = ['ARG', 'ASN', 'ASP', 'CYS', 'GLN', 'GLU', 'ILE', 'LYS', 'MET', 'PHE', 'PRO', 'SER', 'GLY'];
  const resiTypesVL = ['VAL', 'LEU'];
  const resiTypesNQ = ['ASN', 'GLN'];
  const resiTypesHB = ['HIS', 'TRP', 'TYR', 'LEU'];

  const results = new Set<string>();

  // ----------------------------
  // 1. Handle % (ambiguous groups)
  // ----------------------------
  if (nefName.endsWith('%')) {
    const base = nefName.slice(0, -1); // remove %

    // QQ special cases (VAL/LEU methyls)
    // if (resName === 'VAL' && base === 'HG') {
    //   results.add('QQH');
    // }
    // if (resName === 'LEU' && base === 'HD') {
    //   results.add('QQD');
    // }

    // // General Q rule reversal (H% -> Q)
    // if (base.includes('H')) {
    //   results.add(base.replace(/H/g, 'Q'));
    // }

    // VL methyls (HGx% / HGy%)
    if (resiTypesVL.includes(resName)) {
      if (base.endsWith('x')) {
        const b = base.slice(0, -1);
        results.add(`${b}11`);
        results.add(`${b}12`);
      }
      if (base.endsWith('y')) {
        const b = base.slice(0, -1);
        results.add(`${b}21`);
        results.add(`${b}22`);
      }
    }

    // ILE special methyls
    if (resName === 'ILE') {
      if (base === 'HG2') results.add('HG2');
      if (base === 'HD1') results.add('HD1');
    }

    // ALA / THR special
    // if (resName === 'ALA' && base === 'HB') {
    //   results.add('HB');
    // }
    if (resName === 'ALA' && base === 'HB') {
        results.add('HB1');
        results.add('HB2');
        results.add('HB3');
    }
    if (resName === 'THR' && base === 'HG2') {
      results.add('HG2');
    }
  }

  // ----------------------------
  // 2. Handle x / y (stereospecific)
  // ----------------------------
  if (nefName.endsWith('x') || nefName.endsWith('y')) {
    const suffix = nefName.slice(-1); // x or y
    const base = nefName.slice(0, -1);

    // General resiTypes (H2/H3 ↔ x/y)
    if (resiTypes.includes(resName)) {
      if (suffix === 'x') results.add(base + '2');
      if (suffix === 'y') results.add(base + '3');
    }

    // ILE HG1 special (HG12/HG13)
    if (resName === 'ILE' && base.startsWith('HG1')) {
      if (suffix === 'x') results.add('HG12');
      if (suffix === 'y') results.add('HG13');
    }

    // VL carbons (Cx / Cy)
    if (resiTypesVL.includes(resName) && base.includes('C')) {
      if (suffix === 'x') results.add(base + '1');
      if (suffix === 'y') results.add(base + '2');
    }

    // VL hydrogens (Hx% handled above, but fallback here)
    if (resiTypesVL.includes(resName) && base.includes('H')) {
      if (suffix === 'x') {
        results.add(base + '1');
        results.add(base + '2');
      }
      if (suffix === 'y') {
        results.add(base + '2');
        results.add(base + '3');
      }
    }

    // ASN/GLN amides (H1/H2)
    if (resiTypesNQ.includes(resName) && base.includes('H')) {
      if (suffix === 'x') results.add(base + '1');  
      if (suffix === 'y') results.add(base + '2');
    }

    // HB special residues
    if (resiTypesHB.includes(resName) && base === 'HB') {
      if (suffix === 'x') results.add('HB2');
      if (suffix === 'y') results.add('HB3');
    }
  }

  // ----------------------------
  // 3. Default fallback
  // ----------------------------
  if (results.size === 0) {
    return [nefName];
  }
  return Array.from(results);
}

export function loopReplaceProtons(rows, atomN = "atom1", nameN = "name1") {
    // loops through rows
    // runs convertNEFhydrogen
    // pushes to dataframe
    // returns dataframe
    const newDF = []
    rows.forEach(row => { 
        if(row[atomN].includes("%") || row[atomN].includes("x") || row[atomN].includes("y"))
            {
            const ConvertedName = convertNEFHydrogen(row[atomN], row[nameN])
            ConvertedName.forEach(convertedRow => {
                let newRow = {...row}
                newRow[atomN] = convertedRow
                newRow.ambiguityFlag = row._sourceAmbiguity === true;
            newDF.push(newRow)
            })
            
        }
        else{                
            row.ambiguityFlag = row._sourceAmbiguity === true;
            newDF.push(row)}
    }
)
return(newDF)
}

export function convertDataHeaders(restraintDict){

    const keyMap = {
                "_nef_distance_restraint.atom_name_1": "atom1",
                "_nef_distance_restraint.atom_name_2": "atom2",
                "_nef_distance_restraint.chain_code_1": "chain1",
                "_nef_distance_restraint.chain_code_2": "chain2",
                "_nef_distance_restraint.sequence_code_1": "res1",
                "_nef_distance_restraint.sequence_code_2": "res2",
                "_nef_distance_restraint.residue_name_1": "name1",
                "_nef_distance_restraint.residue_name_2": "name2",
                "_nef_distance_restraint.restraint_id": "restraintID"}
    const parsed = JSON.parse(restraintDict)
    const transformed = parsed.map(obj =>
        Object.fromEntries(
            Object.entries(keyMap).map(([oldKey, newKey]) => [
            newKey,
            obj[oldKey],
                 ])
             )
     )    
     return(transformed) 
}

export function convertDataframe(df, pdbAtoms = null) {

//   const newDF = [];
// atom1 and atom2 are not named correctly now the fn is done in c++
// need to change header names etc
    const headersFixed = convertDataHeaders(df);
    const withSourceFlag = headersFixed.map(row => ({
        ...row,
        _sourceAmbiguity:
            row.atom1?.includes("%") ||
            row.atom2?.includes("%") ||
            row.atom1?.includes("x") ||
            row.atom1?.includes("y") ||
            row.atom2?.includes("x") ||
            row.atom2?.includes("y")
    }));
    const atom1Replaced = loopReplaceProtons(withSourceFlag, "atom1")
    const atom2Replaced = loopReplaceProtons(atom1Replaced, "atom2")

  return atom2Replaced;
}

export const processNEFFileAutoLoader = async (
    file: File,
    molecules: any[],
    dispatch: any
) => {
    let fileContents: string;

    if (file.name.endsWith(".gz")) {
        const bin = await file.arrayBuffer();
        fileContents = pako.inflate(bin, { to: "string" });
    } else {
        fileContents = await file.text();
    }

    const data = window.gemmiModule.get_nef_restraints(fileContents);
    const converted = convertDataframe(data);
    const chemShifts = window.gemmiModule.get_chem_shift_info(fileContents);
    const chemShiftsConverted = convertChemShiftDataframe(chemShifts)
    const chemShiftsEnum = loopReplaceProtons(chemShiftsConverted, "atom", "resname")
    if (molecules.length > 0) {
        molecules[0].NEFRestraints = converted;
        molecules[0].chemShifts = chemShiftsEnum

    }

    return converted;
};
