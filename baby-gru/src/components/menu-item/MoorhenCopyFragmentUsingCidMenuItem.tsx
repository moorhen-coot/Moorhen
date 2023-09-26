import { useRef, useState } from "react"
import { Form } from "react-bootstrap"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenCopyFragmentUsingCidMenuItem = (props: {
    molecules: moorhen.Molecule[];
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    monomerLibraryPath: string;
    changeMolecules: (arg0: moorhen.MolChange<moorhen.Molecule>) => void;
}) => {

    const fromRef = useRef<null | HTMLSelectElement>(null)
    const cidRef = useRef<null |HTMLInputElement>(null)
    const [cid, setCid] = useState<string>("")

    const panelContent = <>
        <MoorhenMoleculeSelect {...props} label="From molecule" allowAny={false} ref={fromRef} />
        <Form.Group className='moorhen-form-group' controlId="cid">
            <Form.Label>Selection to copy</Form.Label>
            <Form.Control ref={cidRef} type="text" value={cid} onChange={(e) => {
                setCid(e.target.value)
            }} />
        </Form.Group>

    </>

    const onCompleted = async () => {
        const fromMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(fromRef.current.value))
        const cidToCopy = cidRef.current.value

        if (!fromMolecule || !cidToCopy) {
            return
        }

        const newMolecule = await fromMolecule.copyFragmentUsingCid(cidToCopy, true)
        props.changeMolecules({ action: "Add", item: newMolecule })
        props.setPopoverIsShown(false)
    }

    return <MoorhenBaseMenuItem
        id='copy-fragment-menu-item'
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText="Copy fragment..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
