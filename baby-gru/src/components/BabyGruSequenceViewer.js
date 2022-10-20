import { Fragment, useEffect, useRef, useState } from "react"
import { SequenceViewer } from "../WebGL/SequenceViewer"

export const BabyGruSequenceViewer = (props) => {
    const sequenceViewer = useRef()
    const [message, setMessage] = useState("")
    const [clickedResidue, setClickedResidue] = useState(null)

    useEffect(() => {
        props.molecules.forEach((molecule) => {
            console.log(molecule.cachedAtoms)
        })
        sequenceViewer.current.handleResize()
        sequenceViewer.current.draw()
    }, [])

    useEffect(() => {
        props.molecules.forEach((molecule) => {
            console.log(molecule.cachedAtoms)
            sequenceViewer.current.addSequences(molecule.cachedAtoms.sequences)
        })
        sequenceViewer.current.handleResize()
        sequenceViewer.current.draw()
    }, [props.molecules.length])


    useEffect(() => {
        if (!clickedResidue) {
            return
        }

        let selectedMoleculeIndex = props.molecules.findIndex(molecule => molecule.name === clickedResidue.molName);
        if (selectedMoleculeIndex === -1) {
            console.log(`Cannot find molecule ${clickedResidue.molName}`)
            return
        }

        props.molecules[selectedMoleculeIndex].centreOn(props.glRef, clickedResidue)

    }, [clickedResidue])



    return <Fragment>
        <span>{message}</span>
        <SequenceViewer
            ref={sequenceViewer}
            selectionChanged={(result) => { }}
            onDoubleClick={(result) => { setClickedResidue(result)}}
            messageChanged={(result) => { setMessage(result.message) }} />
    </Fragment>

}
