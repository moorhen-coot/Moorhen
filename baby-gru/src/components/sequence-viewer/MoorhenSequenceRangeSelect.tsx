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
    const [hoveredAtom, setHoveredAtom] = useState<moorhen.HoveredAtom>({ molecule: null, cid: null })

    useImperativeHandle(ref, () => ({
        getSelectedResidues: () => {return selectedResidues}
    }), 
    [selectedResidues])

    return <MoorhenSequenceViewer
                key={`${props.molecule.molNo}-${props.sequence.chain}`}
                sequence={props.sequence}
                molecule={props.molecule}
                glRef={props.glRef}
                clickedResidue={clickedResidue}
                setClickedResidue={setClickedResidue}
                selectedResidues={selectedResidues}
                setSelectedResidues={setSelectedResidues}
                hoveredAtom={hoveredAtom}
                setHoveredAtom={setHoveredAtom}
            />   
})
