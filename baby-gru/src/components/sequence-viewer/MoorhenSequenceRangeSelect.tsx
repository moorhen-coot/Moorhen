import { useState, forwardRef, useImperativeHandle } from "react"
import { MoorhenSequenceViewer } from "./MoorhenSequenceViewer"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { clickedResidueType } from "../card/MoorhenMoleculeCard";

type MoorhenSequenceRangeSelectPropsType = {
    ref: React.RefObject<void>;
    molecule: moorhen.Molecule;
    sequence: moorhen.Sequence;
    glRef: React.RefObject<webGL.MGWebGL>;
}

type MoorhenSequenceRangeSelectType = {
    getSelectedResidues: () => [number, number]
}

export const MoorhenSequenceRangeSelect = forwardRef<MoorhenSequenceRangeSelectType, MoorhenSequenceRangeSelectPropsType>((props, ref) => {
    const [selectedResidues, setSelectedResidues] = useState<[number, number] | null>(null);
    const [clickedResidue, setClickedResidue] = useState<clickedResidueType | null>(null);

    useImperativeHandle(ref, () => ({
        getSelectedResidues: () => {return selectedResidues}
    }), 
    [selectedResidues])

    return <MoorhenSequenceViewer
                key={`${props.molecule.molNo}-${props.sequence.chain}`}
                sequences={[{ sequence: props.sequence, molName: props.molecule.name, molNo: props.molecule.molNo }]}
                clickedResidue={clickedResidue}
            />   
})
