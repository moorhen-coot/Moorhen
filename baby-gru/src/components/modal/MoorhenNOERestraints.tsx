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
// let cootModule: libcootApi.CootModule;
// import { MoorhenReduxStore } from "moorhen"

// ^ this returns MoorhenDraggableModalBase - what is this?
// no idea what this does at all
// so what happens when this is normally called?
// called by ModalsContainer.tsx, supplies vectors there into modalsMap
// modalsMap called by MoorhenModalsContainer
// MoorhenModalsContainer imported into MainContainer
// MainContainer seems to be menu related

// we need to:
// define vector template
// pass relevant info from NOE to template copy
// use info in copy to lookup atoms via gemmi
// draw cylinder between looked up atoms 
// push/ append list of vectors
// repeat for every line in NOE
// pass to renderer as full list 

// option one use existing vector rendering
// option two do it yourself
// option one should be fewer lines of code
// need to go through vectorsDraw, vectorsSlice, MoorhenVectorsModal


// can we build dictionary from every atom's AtomInfo vector to lookup that way?
// so we want to get list of all atoms 
// and do atom lookup for every elemtn in list
// and append to dict
// so how do we access atom list? 
// what fn uses atom list? presumably loading it in?
// where is MoorhenMolecule called? If we can use same MoorhenMolecule from state then we can access its atom list etc
function convertNEFHydrogen(nefName) {
  if ((nefName.includes("x") || nefName.includes("y")) && nefName.includes("%")) {
    return []
    // this is a placeholder - not sure what to do with e.g. HDx%
    // there are a reasonably large amount of ambiguous dihedrals
    // seek advice from NMR
  }

  // x → 2
  if (nefName.includes("x")) {
    return [nefName.replace("x", "1")];
  }

  // y → 3
  if (nefName.includes("y")) {
    return [nefName.replace("y", "2")];
  }

  // wildcard %
  if (nefName.endsWith("%")) {
    const base = nefName.slice(0, -1);
    return [
      base + "1",
      base + "2",
      base + "3"
    ];
  }

  // default
  return [nefName];
}


function loopReplaceProtons(rows, atomN = "atom1") {
    // loops through rows
    // runs convertNEFhydrogen
    // pushes to dataframe
    // returns dataframe
    const newDF = [];
    rows.forEach(row => { 
        if(row[atomN].includes("%") || row[atomN].includes("x") || row[atomN].includes("y"))
            {
            const ConvertedName = convertNEFHydrogen(row[atomN])
            ConvertedName.forEach(convertedRow => {
                let newRow = {...row}
                newRow[atomN] = convertedRow
            newDF.push(newRow)
            })
            
        }
        else{newDF.push(row)}
    }
)
return(newDF)
}

function convertDataframe(df, pdbAtoms = null) {

//   const newDF = [];

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


export const MoorhenNOERestraints = () => {
    const dispatch = useDispatch();

    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    const [noeVectors, setNOEVectors] = useState<MoorhenVector[]>([])

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
                var restraintData = window.cootModule.get_nef_restraints(fileContents)
                const convertedData = convertDataframe(restraintData)
                console.log(convertedData)

            }
            else {  
                const fileContents = await file.text()
                // console.log(fileContents)
                // parseNEF_NOEs(fileContents)
                
                // window.cootModule.get_nef_restraints(fileContents)
                // var restraintData = parseNEF_NOEs(fileContents)
                var restraintData = window.cootModule.get_nef_restraints(fileContents)
                const convertedData = convertDataframe(restraintData)
                console.log(convertedData)
                
                const newVectors = []
                convertedData.forEach(row => {
                    
                    const newNOEVector = newVector()
                    newNOEVector.cidFrom = row.chain1 + "/" + row.res1 + "/" + row.atom1
                    newNOEVector.cidTo = row.chain2 + "/" + row.res2 + "/" + row.atom2
                    newNOEVector.uniqueId += "__TAG_NOE_RESTRAINTS"
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

    const footerContent = (
        <MoorhenStack
            gap={2}
            direction="horizontal"
            style={{
                paddingTop: "0.5rem",
                alignItems: "space-between",
                alignContent: "space-between",
                justifyContent: "space-between",
                width: "100%",
            }}
        >
            <MoorhenStack gap={2} direction="horizontal" style={{ alignItems: "center", alignContent: "center", justifyContent: "center" }}>
                <Form.Group style={{ width: "20rem", margin: "0.5rem", padding: "0rem" }} controlId="uploadMrParse" className="mb-3">
                    <Form.Control
                        type="file"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            loadNEF(e.target.files);
                        }}
                    />
                </Form.Group>
            </MoorhenStack>
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
            headerTitle="NOE Restraints"
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


