import { Form, Row, Stack } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { setValidationJson } from "../../store/jsonValidation";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
// import { MoorhenJsonValidation } from "../validation-tools/MoorhenJsonValidation";
import pako from "pako";
// import { parseNEF_NOEs } from "../../utils/MoorhenNEFParser_tk";
import { MoorhenVectorsModal } from "./MoorhenVectorsModal"
import { v4 as uuidv4 } from "uuid"
import { addAtomVector } from "./MoorhenNOEVectors"
import { MoorhenMolecule } from "@/utils";
import { MoorhenVector, addVectors, removeVectors, removeVectorsMatchingIDString } from "../../store/vectorsSlice"
import { useEffect, useState, useRef } from "react"; 
import { libcootApi} from "../../types/libcoot"
import { MoorhenButton, MoorhenToggle } from "../inputs";
import { setNMRMode } from "@/store";

function convertChemShiftDataframe(df){
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
    if (resName === 'VAL' && base === 'HG') {
      results.add('QQH');
    }
    if (resName === 'LEU' && base === 'HD') {
      results.add('QQD');
    }

    // General Q rule reversal (H% -> Q)
    if (base.includes('H')) {
      results.add(base.replace(/H/g, 'Q'));
    }

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
    if (resName === 'ALA' && base === 'HB') {
      results.add('HB');
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

function loopReplaceProtons(rows, atomN = "atom1", nameN = "name1") {
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
                newRow.ambiguityFlag = true;
            newDF.push(newRow)
            })
            
        }
        else{                
            row.ambiguityFlag = false;
            newDF.push(row)}
    }
)
return(newDF)
}

function convertDataframe(df, pdbAtoms = null) {

//   const newDF = [];
// atom1 and atom2 are not named correctly now the fn is done in c++
// need to change header names etc
 const atom1Replaced = loopReplaceProtons(df, "atom1")
 const atom2Replaced = loopReplaceProtons(atom1Replaced, "atom2")

  return atom2Replaced;
}


const newVector = () => {
    const aVector: MoorhenVector = {
        coordsMode: "atoms",
        labelMode: "none",
        labelText: "vector label",
        drawMode: "cylinder",
        arrowMode: "none",
        xFrom: 0.0,
        yFrom: 0.0,
        zFrom: 0.0,
        xTo: 0.0,
        yTo: 0.0,
        zTo: 0.0,
        cidFrom: "",
        cidTo: "",
        molNoFrom: 0,
        molNoTo: 0,
        uniqueId: uuidv4(),
        vectorColour: { r: 0, g: 0, b: 0 },
        textColour: { r: 0, g: 0, b: 0 },
    };
    return aVector;
}

function convertDataHeaders(restraintDict){

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



export const MoorhenNOERestraints = () => {
    const dispatch = useDispatch();

    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);  

    const [noeVectors, setNOEVectors] = useState<MoorhenVector[]>([])
    // added to try  to make modular more retraints work 
    const [isActiveButton, setIsActiveButton] = useState(true);
    const isNOERef = useRef<undefined | HTMLInputElement>(null);
    const [isNOE, setIsNOE] = useState<boolean>(false);

    const isHBondRef = useRef<undefined | HTMLInputElement>(null);
    const [isHBond, setIsHBond] = useState<boolean>(false);

    const isUndefinedRef = useRef<undefined | HTMLInputElement>(null);
    const [isUndefined, setIsUndefined] = useState<boolean>(false);
    
    const [selectedTypes, setSelectedTypes] = useState({
            noe: false,
            hbond: false,
            undefined: false
        });

    useEffect(()=> {
        dispatch(removeVectors(noeVectors))
        dispatch(addVectors(noeVectors))

    }
, [noeVectors])

    const loadNEF = async (files: FileList) => {
        // let cootModule: libcootApi.CootModule;
           
        for (const file of files) {
            if (file.name.endsWith(".gz"))
            {
                const binFileContents = await file.arrayBuffer()
                const fileContents =  pako.inflate(binFileContents, { to: "string" })
                // var restraintData = parseNEF_NOEs(fileContents)
                // var restraintData = window.cootModule.get_noe_restraints(fileContents)

                // const headedData = convertDataHeaders(restraintData)

                // const convertedData = convertDataframe(headedData)
                let allConvertedData: any[] = [];

                if (selectedTypes.noe) {
                    const data = window.cootModule.get_noe_restraints(fileContents);
                    const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                        ...row,
                        restraintType: "NOE"
                    }));
                    allConvertedData.push(...converted);
                }

                if (selectedTypes.hbond) {
                    const data = window.cootModule.get_hbond_restraints(fileContents);
                    const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                        ...row,
                        restraintType: "HBOND"
                    }));
                    allConvertedData.push(...converted);
                }

                if (selectedTypes.undefined) {
                    const data = window.cootModule.get_undefined_restraints(fileContents);
                    const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                        ...row,
                        restraintType: "UNDEFINED"
                    }));
                    allConvertedData.push(...converted);
                }

                const newVectors = []
                allConvertedData.forEach(row => {
                    
                    const newNOEVector = newVector()
                    newNOEVector.cidFrom = row.chain1 + "/" + row.res1 + "/" + row.atom1
                    newNOEVector.cidTo = row.chain2 + "/" + row.res2 + "/" + row.atom2
                    newNOEVector.uniqueId += "__TAG_NOE_RESTRAINTS"
                    if (row.ambiguityFlag) {
                        newNOEVector.vectorColour = { r: 185, g: 255, b: 255 };
                    }
                    newVectors.push(newNOEVector)
                })
                setNOEVectors(newVectors)
            }
            else {  
                const fileContents = await file.text()
                // parseNEF_NOEs(fileContents)
                
                // window.cootModule.get_nef_restraints(fileContents)
                // var restraintData = parseNEF_NOEs(fileContents)
                // var restraintData = window.cootModule.get_noe_restraints(fileContents)

                // const headedData = convertDataHeaders(restraintData)

                // const convertedData = convertDataframe(headedData)
                let allConvertedData: any[] = [];
                    const chemShifts = window.cootModule.get_chem_shift_info(fileContents);
                    const chemShiftsConverted = convertChemShiftDataframe(chemShifts)
                    const chemShiftsEnum = loopReplaceProtons(chemShiftsConverted, "atom", "resname")
                    // dispatch(setChemShifts(chemShiftsConverted));
                    dispatch(setNMRMode(true))
                if (molecules.length > 0){
                    molecules[0].chemShifts = chemShiftsEnum
                }

                    
                if (selectedTypes.noe) {
                    const data = window.cootModule.get_noe_restraints(fileContents);
                    const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                        ...row,
                        restraintType: "noe"
                    }));
                    allConvertedData.push(...converted);
                }

                if (selectedTypes.hbond) {
                    const data = window.cootModule.get_hbond_restraints(fileContents);
                    const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                        ...row,
                        restraintType: "hbond"
                    }));
                    allConvertedData.push(...converted);
                }

                if (selectedTypes.undefined) {
                    const data = window.cootModule.get_undefined_restraints(fileContents);
                    const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                        ...row,
                        restraintType: "undefined"
                    }));
                    allConvertedData.push(...converted);
                }

                const newVectors = []
                allConvertedData.forEach(row => {
                    
                    const newNOEVector = newVector()
                    newNOEVector.cidFrom = row.chain1 + "/" + row.res1 + "/" + row.atom1
                    newNOEVector.cidTo = row.chain2 + "/" + row.res2 + "/" + row.atom2
                    if (row.restraintType === "noe"){
                        newNOEVector.uniqueId += "__TAG_NEF_NOE_RESTRAINTS"
                        newNOEVector.vectorColour = { r: 0, g: 0, b: 0 };
                    }

                    if (row.restraintType === "hbond"){
                        newNOEVector.uniqueId += "__TAG_NEF_HBOND_RESTRAINTS"
                        newNOEVector.vectorColour = { r: 255, g: 255, b: 0 };
                    }

                    if (row.restraintType === "undefined"){
                        newNOEVector.uniqueId += "__TAG_NEF_UNDEFINED_RESTRAINTS"
                        newNOEVector.vectorColour = { r: 130, g: 22, b: 184 };
                    }
                    if (row.ambiguityFlag) {
                        newNOEVector.vectorColour = { r: 185, g: 255, b: 255 };
                        newNOEVector.ambiguous = true 
                    }
                    newVectors.push(newNOEVector)
                })
                setNOEVectors(newVectors)
            }
                }
            };


    const footerContent = (
        <MoorhenStack
            gap={2}
            direction="horizontal"
            style={{
                paddingTop: "0.5rem",
                justifyContent: "space-between",
                width: "100%",
            }}
        >
            {/* LEFT: Checkboxes */}
            <MoorhenStack gap={2} direction="horizontal">
                <MoorhenToggle
                    label={"NOEs"}
                    name={`NOERestraints`}
                    type="checkbox"
                    ref={isNOERef}
                    checked={selectedTypes.noe}
                    onChange={e => setSelectedTypes(prev => ({
                        ...prev,
                        noe: e.target.checked
                    }))}
                />
                <MoorhenToggle
                    label={"H bonds"}
                    name={`HBondRestraints`}
                    type="checkbox"
                    ref={isHBondRef}
                    checked={selectedTypes.hbond}
                    onChange={e => setSelectedTypes(prev => ({
                        ...prev,
                        hbond: e.target.checked
                    }))}
                />
                <MoorhenToggle
                    label={"Undefined restraints"}
                    name={`isUndefinedRestraints`}
                    type="checkbox"
                    ref={isUndefinedRef}
                    checked={selectedTypes.undefined}
                    onChange={e => setSelectedTypes(prev => ({
                        ...prev,
                        undefined: e.target.checked
                    }))}
                />
            </MoorhenStack>

            {/* RIGHT: File input */}
            <Form.Group style={{ width: "20rem", margin: "0.5rem" }} controlId="uploadMrParse">
                <Form.Control
                    type="file"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        loadNEF(e.target.files);
                    }}
                />
            </Form.Group>
        </MoorhenStack>
    );
    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.NOE}
            left={width / 6}
            top={height / 3}
            minHeight={convertViewtoPx(30, height)}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(50, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="NEF Restraints"
            resizeNodeRef={resizeNodeRef}
            footer={footerContent}
            body={
                <div style={{ height: "100%" }}>
                    {/* <Row className={"small-validation-tool-container-row"}>
                        <MoorhenJsonValidation />
                    </Row> */}
                </div>
            }
        />
    );
};


