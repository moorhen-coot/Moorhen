import { useDispatch, useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { v4 as uuidv4 } from "uuid"
import { MoorhenVector, addVectors, removeVectors, removeVectorsMatchingIDString } from "../../store/vectorsSlice"
import { useEffect, useState, useRef } from "react"; 
import { convertDataframe, convertChemShiftDataframe, loopReplaceProtons } from "@/utils/NEFFileAutoLoader"

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

    useEffect(()=> {
        dispatch(removeVectors(noeVectors))
        dispatch(addVectors(noeVectors))

    }
, [noeVectors])

    const loadNEF = async (files: FileList) => {
           
        for (const file of files) {
                const fileContents = await file.text()
                let allConvertedData: any[] = [];
                    const chemShifts = window.gemmiModule.get_chem_shift_info(fileContents);
                    const chemShiftsConverted = convertChemShiftDataframe(chemShifts)
                    const chemShiftsEnum = loopReplaceProtons(chemShiftsConverted, "atom", "resname")
                if (molecules.length > 0){
                    molecules[0].chemShifts = chemShiftsEnum
                }

                    
                if (true) {
                    const data = window.gemmiModule.get_nef_restraints(fileContents);
                    const converted = convertDataframe(data).map(row => ({
                    
                        ...row
                    }));
                    allConvertedData.push(...converted);
                if (molecules.length > 0){
                    molecules[0].NEFRestraints = allConvertedData
                }
                }

                console.log(allConvertedData)
                const newVectors = []
                allConvertedData.forEach(row => {
                    
                    const newNOEVector = newVector()
                    newNOEVector.molFromUniqueId = molecules[0].uniqueId
                    newNOEVector.molToUniqueId = molecules[0].uniqueId

                    newNOEVector.cidFrom = row.chain1 + "/" + row.res1 + "/" + row.atom1
                    newNOEVector.cidTo = row.chain2 + "/" + row.res2 + "/" + row.atom2
                    if (row.ambiguityFlag) {
                        newNOEVector.vectorColour = { r: 185, g: 255, b: 255 };
                        newNOEVector.ambiguous = true 
                    }
                    newVectors.push(newNOEVector)
                })

                console.log(newVectors)
                
            // }
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

                </div>
            }
        />
    );
};
