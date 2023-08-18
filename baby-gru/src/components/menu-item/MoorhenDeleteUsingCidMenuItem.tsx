import { useRef, useState } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { Form } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenDeleteUsingCidMenuItem = (props: {
    molecules: moorhen.Molecule[];
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const fromRef = useRef<null | HTMLSelectElement>(null)
    const cidRef = useRef<null |HTMLInputElement>(null)
    const [cid, setCid] = useState<string>("")

    const panelContent = <>
        <MoorhenMoleculeSelect {...props} label="From molecule" allowAny={false} ref={fromRef} />
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="cid" className="mb-3">
            <Form.Label>Selection to delete</Form.Label>
            <Form.Control ref={cidRef} type="text" value={cid} onChange={(e) => {
                setCid(e.target.value)
            }} />
        </Form.Group>

    </>

    const onCompleted = async () => {
        const fromMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(fromRef.current.value))
        const cidToDelete = cidRef.current.value

        if (!fromMolecule || !cidToDelete) {
            return
        }

        const commandArgs = [
            parseInt(fromRef.current.value),
            `${cidToDelete}`,
            "LITERAL"
        ]

        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "delete_using_cid",
            commandArgs: commandArgs,
            changesMolecules: [parseInt(fromRef.current.value)]
        }, true)
            
        fromMolecule.setAtomsDirty(true)
        fromMolecule.redraw()
        
        props.setPopoverIsShown(false)
    }

    return <MoorhenBaseMenuItem
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText="Delete atom selection..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
