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
                "_nef_distance_restraint.residue_name_2": "name2"}
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
        console.log(noeVectors)
        dispatch(removeVectors(noeVectors))
        dispatch(addVectors(noeVectors))

    }
, [noeVectors])

    const loadNEF = async (files: FileList) => {
        // let cootModule: libcootApi.CootModule;
        // console.log(cootModule)
           
        for (const file of files) {
            if (file.name.endsWith(".gz"))
            {
                const binFileContents = await file.arrayBuffer()
                // console.log(binFileContents)
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

                console.log(allConvertedData)
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
                // console.log(fileContents)
                // parseNEF_NOEs(fileContents)
                
                // window.cootModule.get_nef_restraints(fileContents)
                // var restraintData = parseNEF_NOEs(fileContents)
                // var restraintData = window.cootModule.get_noe_restraints(fileContents)

                // const headedData = convertDataHeaders(restraintData)

                // const convertedData = convertDataframe(headedData)
                let allConvertedData: any[] = [];

                if (selectedTypes.noe) {
                    const data = window.cootModule.get_noe_restraints(fileContents);
                    console.log(data)
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
                console.log(allConvertedData)
                
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
                    }
                    newVectors.push(newNOEVector)
                })
                setNOEVectors(newVectors)
            }
        // const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
//         const molecule = useSelector((state: moorhen.State) => state.molecules.moleculeList);
// // use MoorhenMolecule to get atoms lookup 
//         const atomsTotal = MoorhenMolecule[atomCount]

// this should pick first molecule in list of molecules
            // const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
            // const mol: MoorhenMolecule | undefined = molecules.find(
            // m => m.molNo === 0
            // )

            // now we just need to access the atoms in that molecule - how does vector slcie do it?
        // restraintData.forEach(pair => {
            // const cidFrom = `${chain1}/${res1}/${atom1}`
            // this is residue to residue - we need to do atom lookup from the rest 
            // const cidFrom = pair["res1"]
            // const cidTo = pair["res2"]

            // addAtomVector(dispatch, molNo, cidFrom, cidTo)

        // })
                    // const json = JSON.parse(fileContents);
                    // dispatch(setValidationJson(json));   
                }
            };

    // const footerContent = (
    //     <MoorhenStack
    //         gap={2}
    //         direction="horizontal"
    //         style={{
    //             paddingTop: "0.5rem",
    //             alignItems: "space-between",
    //             alignContent: "space-between",
    //             justifyContent: "space-between",
    //             width: "100%",
    //         }}
    //     >
    //         <MoorhenStack gap={2} direction="horizontal" style={{ alignItems: "center", alignContent: "center", justifyContent: "center" }}>
    //             <Form.Group style={{ width: "20rem", margin: "0.5rem", padding: "0rem" }} controlId="uploadMrParse" className="mb-3">
    //                 <Form.Control
    //                     type="file"
    //                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
    //                         loadNEF(e.target.files);
    //                     }}
    //                 />
    //             </Form.Group>
    //         </MoorhenStack>
    //     </MoorhenStack>
    // );
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


