import { Slider } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MoleculeRepresentation } from "@/moorhen";
import { MoorhenMolecule } from "@/utils";
import { setRequestDrawScene } from "../../../store/glRefSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenSelect, MoorhenSlider, MoorhenToggle } from "../../inputs";
import { MoorhenStack } from "../../interface-base";
import { addVector, removeVector, MoorhenVector} from "../../../store/vectorsSlice"

// __TAG_NEF_NOE_RESTRAINTS
type MoleculeSettingPanelProps =
    | { molecule: MoorhenMolecule; representation?: never }
    | { molecule?: never; representation: MoleculeRepresentation };


export const NEFRestraintsSettingsPanel = (props: MoleculeSettingPanelProps) => {
    const { molecule, representation } = props;
    const dispatch = useDispatch()
    const vectorsList = useSelector((state: moorhen.State) => state.vectors.vectorsList).filter(v => 
        v.uniqueId.includes("__TAG_NEF"))

    console.log(vectorsList)
    let doShowNOE = false 
    let doShowHBond = false 
    let doShowUndefined = false 

    vectorsList.forEach(v => {
        if (v.visible !== false){
            if (v.uniqueId.includes("NOE")){
                doShowNOE = true 
            }
            if (v.uniqueId.includes("HBOND")){
                doShowHBond = true 
            }            
            if (v.uniqueId.includes("UNDEFINED")){
                doShowUndefined = true 
            }        
        }
    })
    const [showNOE, setShowNOE] = useState<boolean>(
        doShowNOE
    );
    const [showHBondsNEF, setShowHBondsNEF] = useState<boolean>(
        doShowHBond    
    );
    const [showUndefined, setShowUndefined] = useState<boolean>(
        doShowUndefined
    );


    const newVisibilityChangedVector = (theVector,vis) => {
            const newVector: MoorhenVector = {
                coordsMode: theVector.coordsMode,
                labelMode: theVector.labelMode,
                labelText: theVector.labelText,
                drawMode: theVector.drawMode,
                arrowMode: theVector.arrowMode,
                xFrom: theVector.xFrom,
                yFrom: theVector.yFrom,
                zFrom: theVector.zFrom,
                xTo: theVector.xTo,
                yTo: theVector.yTo,
                zTo: theVector.zTo,
                cidFrom: theVector.cidFrom,
                cidTo: theVector.cidTo,
                molNoFrom: theVector.molNoFrom,
                molNoTo: theVector.molNoTo,
                uniqueId: theVector.uniqueId,
                vectorColour: theVector.vectorColour,
                textColour: theVector.textColour,
                radius: theVector.radius,
                visible: vis,
            };
            return newVector
        }

    const changeVectorVisibility = (type) => {
        console.log(showNOE)
        if (type === "NOE"){
            vectorsList.forEach(v => {
                if (v.uniqueId.includes("NOE")){
                    const newVector = newVisibilityChangedVector(v, !showNOE)
                    dispatch(removeVector(v))
                    dispatch(addVector(newVector))
                console.log("Dispatched vectors (NOE)")
                }
            }
        )
        }
        if (type === "HBonds"){
            vectorsList.forEach(v => {
                if (v.uniqueId.includes("HBOND")){
                    const newVector = newVisibilityChangedVector(v, !showHBondsNEF)
                    dispatch(removeVector(v))
                    dispatch(addVector(newVector))
                }
            }
        )
        }
        if (type === "Undefined"){
            vectorsList.forEach(v => {
                if (v.uniqueId.includes("UNDEFINED")){
                    const newVector = newVisibilityChangedVector(v, !showUndefined)
                    dispatch(removeVector(v))
                    dispatch(addVector(newVector))
                }
            }
        )
        }
    }

    return (
        <MoorhenStack>
            <MoorhenToggle type="switch" checked={showNOE} onChange={() => {setShowNOE(prev => !prev)
                changeVectorVisibility("NOE")
            }} label="Show NOE" />
            <MoorhenToggle type="switch" checked={showHBondsNEF} onChange={() => {setShowHBondsNEF(prev => !prev)
                changeVectorVisibility("HBonds")

            }} label="Show H bonds" />
            <MoorhenToggle type="switch" checked={showUndefined} onChange={() => {setShowUndefined(prev => !prev)
                changeVectorVisibility("Undefined")

            }} label="Show Undefined" />
        </MoorhenStack>
    );
};

export const MoorhenMoleculeRepresentationSettingsCard = (props: { molecule: moorhen.Molecule }) => {
    return (
        <MoorhenStack direction="vertical" style={{ overflowY: "auto", maxHeight: "80vh" }}>
            <NEFRestraintsSettingsPanel molecule={props.molecule} />
        </MoorhenStack>
    );
};
