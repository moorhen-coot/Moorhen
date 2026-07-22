// import { Form, Row, Stack } from "react-bootstrap";
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
import { convertDataframe, convertDataHeaders, convertChemShiftDataframe, loopReplaceProtons } from "@/utils/NEFFileAutoLoader"

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
        molFromUniqueId: "",
        molToUniqueId: "",
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
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);  

    const [noeVectors, setNOEVectors] = useState<MoorhenVector[]>([])
    // added to try  to make modular more retraints work 
    const [isActiveButton, setIsActiveButton] = useState(true);
    const isNOERef = useRef<undefined | HTMLInputElement>(null);
    // const [isNOE, setIsNOE] = useState<boolean>(false);
    const [isNOE, setIsNOE] = useState<boolean>(true);

    const isHBondRef = useRef<undefined | HTMLInputElement>(null);
    // const [isHBond, setIsHBond] = useState<boolean>(false);
    const [isHBond, setIsHBond] = useState<boolean>(true);

    const isUndefinedRef = useRef<undefined | HTMLInputElement>(null);
    // const [isUndefined, setIsUndefined] = useState<boolean>(false);
    const [isUndefined, setIsUndefined] = useState<boolean>(true);
 
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
                // var restraintData = window.gemmiModule.get_noe_restraints(fileContents)

                // const headedData = convertDataHeaders(restraintData)

                // const convertedData = convertDataframe(headedData)
                let allConvertedData: any[] = [];

                if (selectedTypes.noe) {
                    const data = window.gemmiModule.get_noe_restraints(fileContents);
                    const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                        ...row,
                        restraintType: "NOE"
                    }));
                    allConvertedData.push(...converted);
                }

                if (selectedTypes.hbond) {
                    const data = window.gemmiModule.get_hbond_restraints(fileContents);
                    const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                        ...row,
                        restraintType: "HBOND"
                    }));
                    allConvertedData.push(...converted);
                }

                if (selectedTypes.undefined) {
                    const data = window.gemmiModule.get_undefined_restraints(fileContents);
                    const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                        ...row,
                        restraintType: "UNDEFINED"
                    }));
                    allConvertedData.push(...converted);
                }

                const newVectors = []
                allConvertedData.forEach(row => {
                    
                    const newNOEVector = newVector()
                    newNOEVector.molFromUniqueId = molecules[0].uniqueId
                    newNOEVector.molToUniqueId = molecules[0].uniqueId
                    newNOEVector.cidFrom = row.chain1 + "/" + row.res1 + "/" + row.atom1
                    newNOEVector.cidTo = row.chain2 + "/" + row.res2 + "/" + row.atom2
                    newNOEVector.uniqueId += "__TAG_NOE_RESTRAINTS"
                    if (row.ambiguityFlag) {
                        newNOEVector.vectorColour = { r: 185, g: 255, b: 255 };
                    }
                    newVectors.push(newNOEVector)
                })
                setNOEVectors(newVectors)
                dispatch(addVectors(newVectors))

            }
            else {  
                const fileContents = await file.text()
                // parseNEF_NOEs(fileContents)
                
                // window.gemmiModule.get_nef_restraints(fileContents)
                // var restraintData = parseNEF_NOEs(fileContents)
                // var restraintData = window.gemmiModule.get_noe_restraints(fileContents)

                // const headedData = convertDataHeaders(restraintData)

                // const convertedData = convertDataframe(headedData)
                let allConvertedData: any[] = [];
                    const chemShifts = window.gemmiModule.get_chem_shift_info(fileContents);
                    const chemShiftsConverted = convertChemShiftDataframe(chemShifts)
                    const chemShiftsEnum = loopReplaceProtons(chemShiftsConverted, "atom", "resname")
                    // dispatch(setChemShifts(chemShiftsConverted));
                    dispatch(setNMRMode(true))
                if (molecules.length > 0){
                    molecules[0].chemShifts = chemShiftsEnum
                }

                    
                // if (selectedTypes.noe) {
                if (true) {

                    const data = window.gemmiModule.get_noe_restraints(fileContents);
                    const converted = convertDataframe(data).map(row => ({
                    
                    // const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                        ...row//,
                        // restraintType: "noe"
                    }));
                    allConvertedData.push(...converted);
                if (molecules.length > 0){
                    molecules[0].NEFRestraints = allConvertedData
                }
                }

                // // if (selectedTypes.hbond) {
                // if (true) {

                //     const data = window.gemmiModule.get_hbond_restraints(fileContents);
                //     const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                //         ...row,
                //         restraintType: "hbond"
                //     }));
                //     allConvertedData.push(...converted);
                // }

                // // if (selectedTypes.undefined) {
                // if (true) {

                //     const data = window.gemmiModule.get_undefined_restraints(fileContents);
                //     const converted = convertDataframe(convertDataHeaders(data)).map(row => ({
                //         ...row,
                //         restraintType: "undefined"
                //     }));
                //     allConvertedData.push(...converted);
                // }
                console.log(allConvertedData)
                const newVectors = []
                allConvertedData.forEach(row => {
                    
                    const newNOEVector = newVector()
                    newNOEVector.molFromUniqueId = molecules[0].uniqueId
                    newNOEVector.molToUniqueId = molecules[0].uniqueId

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
                    // console.log(newNOEVector)
                })
                // commented out for testing
                // setNOEVectors(newVectors)
                // dispatch(addVectors(newVectors))
                console.log(newVectors)
                
            }
                }
            };

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
