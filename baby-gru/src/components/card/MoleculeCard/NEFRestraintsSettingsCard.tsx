import { Slider } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MoleculeRepresentation } from "@/moorhen";
import { MoorhenMolecule } from "@/utils";
import { setRequestDrawScene } from "../../../store/glRefSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenSelect, MoorhenSlider, MoorhenToggle, MoorhenColourPicker } from "../../inputs";
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

    const getColourForType = (type: string) => {
        const found = vectorsList.find(v => v.uniqueId.includes(type));
        return found?.vectorColour ?? { r: 0, g: 0, b: 0 };
    };
    console.log(vectorsList)
    let doShowNOE = false 
    let doShowHBond = false 
    let doShowUndefined = false 
    let doShowAmbiguous = false 
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
            if (v.ambiguous){
                doShowAmbiguous = true 
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
    const [showAmbiguous, setShowAmbiguous] = useState<boolean>(
        doShowAmbiguous
    );


    const newVisibilityChangedVector = (theVector,vis, newRGB?) => {
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
                // vectorColour: theVector.vectorColour,
                vectorColour: newRGB ?? theVector.vectorColour,
                textColour: theVector.textColour,
                radius: theVector.radius,
                visible: vis,
                ambiguous: theVector.ambiguous,
            };
            return newVector
        }

    const changeVectorVisibility = (type, newRGB?) => {


        if (type === "NOE"){
            vectorsList.forEach(v => {
                if (v.uniqueId.includes("NOE")){
                    const newVector = newVisibilityChangedVector(v,
                    newRGB ? v.visible : !showNOE,
                    newRGB
                )

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
                    const newVector = newVisibilityChangedVector(
                    v,
                    newRGB ? v.visible : !showNOE,
                    newRGB
                )
                    dispatch(removeVector(v))
                    dispatch(addVector(newVector))
                }
            }
        )
        }
        if (type === "Undefined"){
            vectorsList.forEach(v => {
                if (v.uniqueId.includes("UNDEFINED")){
                    const newVector = newVisibilityChangedVector(
                    v,
                    newRGB ? v.visible : !showNOE,
                    newRGB
                )

                    dispatch(removeVector(v))
                    dispatch(addVector(newVector))
                }
            }
        )
        } 
        
        if (type === "Ambiguous"){
            vectorsList.forEach(v => {
                if (v.ambiguous){
                    const newVector = newVisibilityChangedVector(
                    v,
                    newRGB ? v.visible : !showAmbiguous,
                    newRGB
                )

                    dispatch(removeVector(v))
                    dispatch(addVector(newVector))
                }
            }
        )
        }
        if (type === "Colour"){
            vectorsList.forEach(v => {
                    const newVector = newVisibilityChangedVector(v, true, newRGB)
                    dispatch(removeVector(v))
                    dispatch(addVector(newVector))
                
            }
        )
        }

    }
    const noeVector = vectorsList.find(v => v.uniqueId.includes("NOE"));
    const hbondVector = vectorsList.find(v => v.uniqueId.includes("HBOND"));
    const undefinedVector = vectorsList.find(v => v.uniqueId.includes("UNDEFINED"));
    const ambiguousVector = vectorsList.find(v => v.ambiguous);

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

            <MoorhenToggle type="switch" checked={showAmbiguous} onChange={() => {setShowAmbiguous(prev => !prev)
                changeVectorVisibility("Ambiguous")

            }} label="Show Ambiguous" />
            <label>NOE vector colour</label>
                <MoorhenColourPicker
                    colour={[
                        // getColourForType("NOE").r,
                        // getColourForType("NOE").g,
                        // getColourForType("NOE").b
                    noeVector?.vectorColour.r ?? 0,
                    noeVector?.vectorColour.g ?? 0,
                    noeVector?.vectorColour.b ?? 0
                    ]}
                    setColour={color => {
                        changeVectorVisibility("NOE", { r: color[0], g: color[1], b: color[2] });
                    }}
                    tooltip="Change vector colour"
                />      
            <label>HBond vector colour</label>

                <MoorhenColourPicker
                  colour={[
                        hbondVector?.vectorColour.r ?? 0,
                        hbondVector?.vectorColour.g ?? 0,
                        hbondVector?.vectorColour.b ?? 0
                        // getColourForType("HBonds").r,
                        // getColourForType("HBonds").g,
                        // getColourForType("HBonds").b
                    ]}
                    setColour={color => {
                        changeVectorVisibility("HBonds", { r: color[0], g: color[1], b: color[2] });
                    }}
                    tooltip="Change vector colour"
                />   
            <label>Undefined vector colour</label>
                <MoorhenColourPicker
                  colour={[
                            undefinedVector?.vectorColour.r ?? 0,
                            undefinedVector?.vectorColour.g ?? 0,
                            undefinedVector?.vectorColour.b ?? 0
                    ]}
                    setColour={color => {
                        changeVectorVisibility("Undefined", { r: color[0], g: color[1], b: color[2] });
                    }}
                    tooltip="Change vector colour"
                />            
            <label>Ambiguous vector colour</label>
                <MoorhenColourPicker
                  colour={[
                            ambiguousVector?.vectorColour.r ?? 0,
                            ambiguousVector?.vectorColour.g ?? 0,
                            ambiguousVector?.vectorColour.b ?? 0
                    ]}
                    setColour={color => {
                        changeVectorVisibility("Ambiguous", { r: color[0], g: color[1], b: color[2] });
                    }}
                    tooltip="Change vector colour"
                />        
        </MoorhenStack>
    );
};

export const MoorhenNEFRepresentationSettingsCard = (props: { molecule: moorhen.Molecule }) => {
    return (
        <MoorhenStack direction="vertical" style={{ overflowY: "auto", maxHeight: "80vh" }}>
            <NEFRestraintsSettingsPanel molecule={props.molecule} />
        </MoorhenStack>
    );
};


