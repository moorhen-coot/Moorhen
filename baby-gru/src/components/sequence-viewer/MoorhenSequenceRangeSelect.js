import { useState, forwardRef, useImperativeHandle } from "react"
import { MoorhenSequenceViewer } from "./MoorhenSequenceViewer"

export const MoorhenSequenceRangeSelect = forwardRef((props, ref) => {
    const [selectedResidues, setSelectedResidues] = useState(null);
    const [clickedResidue, setClickedResidue] = useState(null);
    const [hoveredAtom, setHoveredAtom] = useState({ molecule: null, cid: null })

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
