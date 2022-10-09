import { ButtonGroup, Button } from "react-bootstrap"
import { postCootMessage } from "../BabyGruUtils"

export const BabyGruButtonBar = (props) => {
    return <div class="border" style={{
        overflow: "auto",
        float: "left",
        width: "5rem",
        backgroundColor: "white",
        height: "calc(100vh - 7rem)"
    }}>
        <ButtonGroup size="sm" vertical>
            <Button variant='light' onClick={() => {
                props.setConsoleOutput('Select atom in residue for which to flip peptide')
                props.setCursorStyle("crosshair")
                document.addEventListener('atomClicked', (event) => {
                    props.setConsoleOutput(`Selected atom ${event.detail}`)
                    //Currrently don't know which molecule has been edited...appply flip to all
                    props.molecules.forEach(molecule => {
                        props.setCursorStyle("default")
                        postCootMessage(props.cootWorker, {
                            message: 'flipPeptide',
                            coordMolNo: molecule.coordMolNo,
                            cid: event.detail
                        }).then(_ => {
                            molecule.setAtomsDirty(true)
                            molecule.redraw(props.glRef)
                        })
                    })
                }, { once: true })
            }}>
                <img src="pixmaps/flip-peptide.svg" />
            </Button>
        </ButtonGroup>
    </div>
}