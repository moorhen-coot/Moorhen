import { Form } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenDeleteEverythingMenuItem = (props: {
    maps: moorhen.Map[];
    glRef: React.RefObject<webGL.MGWebGL>;
    molecules: moorhen.Molecule[];
    changeMaps: (arg0: moorhen.MolChange<moorhen.Map>) => void;
    changeMolecules: (arg0: moorhen.MolChange<moorhen.Molecule>) => void;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> 
}) => {

    const panelContent = <>
        <Form.Group style={{ width: '18rem', margin: '0.5rem' }} controlId="MoorhenGetDeleteEverythingMenuItem" className="mb-3">
            <span style={{ fontWeight: 'bold' }}>Warning: this action cannot be reversed.</span>
        </Form.Group>
    </>

    const onCompleted = () => {
        props.maps.forEach(map => {
            map.delete()
        })
        props.molecules.forEach(molecule => {
            molecule.delete()
        })
        props.changeMaps({ action: 'Empty' })
        props.changeMolecules({ action: "Empty" })
    }

    return <MoorhenBaseMenuItem
        id='delete-everything-menu-item'
        textClassName="text-danger"
        buttonVariant="danger"
        buttonText="I understand, delete"
        popoverContent={panelContent}
        menuItemText="Delete everything"
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

