import { Form } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector, useDispatch } from 'react-redux';
import { emptyMolecules } from "../../store/moleculesSlice";

export const MoorhenDeleteEverythingMenuItem = (props: {
    maps: moorhen.Map[];
    glRef: React.RefObject<webGL.MGWebGL>;
    changeMaps: (arg0: moorhen.MolChange<moorhen.Map>) => void;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> 
}) => {

    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const panelContent = <>
        <Form.Group style={{ width: '18rem', margin: '0.5rem' }} controlId="MoorhenGetDeleteEverythingMenuItem" className="mb-3">
            <span style={{ fontWeight: 'bold' }}>Warning: this action cannot be reversed.</span>
        </Form.Group>
    </>

    const onCompleted = () => {
        props.maps.forEach(map => {
            map.delete()
        })
        molecules.forEach(molecule => {
            molecule.delete()
        })
        props.changeMaps({ action: 'Empty' })
        dispatch( emptyMolecules() )
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

