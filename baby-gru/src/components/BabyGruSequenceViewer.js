import { Fragment, useEffect, useRef, useState } from "react"
import { SequenceViewer } from "../WebGL/SequenceViewer"

export const BabyGruSequenceViewer = (props) => {
    const sequenceViewer = useRef()
    const [viewerTitle, setViewerTitle] = useState("Viewer title")

    useEffect(() => {
        sequenceViewer.current.draw()
        props.molecules.forEach((molecule) => {
            //            sequenceViewer.current.addSequence(molecule.cachedAtoms.)
        })
        setViewerTitle("banana")
    }, [])

    useEffect(() => {
        setViewerTitle(`${props.molecules.length}`)
    }, [props.molecules.length])

    return <Fragment>
        <span>{viewerTitle}</span>
        <SequenceViewer
            ref={sequenceViewer}
            onDoubleClick={
                () => {

                }
            } />

    </Fragment>

}
