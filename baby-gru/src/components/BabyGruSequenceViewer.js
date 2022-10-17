import { Fragment, useEffect, useRef, useState } from "react"
import { SequenceViewer } from "../WebGL/SequenceViewer"

export const BabyGruSequenceViewer = (props) => {
    const sequenceViewer = useRef()
    const [viewerTitle, setViewerTitle] = useState("Viewer title")
    const [message, setMessage] = useState("")

    useEffect(() => {
        props.molecules.forEach((molecule) => {
            console.log(molecule.cachedAtoms)
            //            sequenceViewer.current.addSequence(molecule.cachedAtoms.)
        })
        sequenceViewer.current.handleResize()
        sequenceViewer.current.draw()
        setViewerTitle("banana")
    }, [])

    useEffect(() => {
        setViewerTitle(`${props.molecules.length} sequences`)
        props.molecules.forEach((molecule) => {
            console.log(molecule.cachedAtoms)
            sequenceViewer.current.addSequences(molecule.cachedAtoms.sequences)
        })
        sequenceViewer.current.handleResize()
        sequenceViewer.current.draw()
    }, [props.molecules.length])

    return <Fragment>
        <span>{viewerTitle}: {message}</span>
        <SequenceViewer
            ref={sequenceViewer}
            selectionChanged={(result) => { }}
            messageChanged={(result) => { setMessage(result.message) }} />
    </Fragment>

}
