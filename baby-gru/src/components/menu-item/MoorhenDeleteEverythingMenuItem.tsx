import { Form } from "react-bootstrap"
import { useSelector, useDispatch, batch } from 'react-redux';
import { moorhen } from "../../types/moorhen";
import { emptyMolecules } from "../../store/moleculesSlice";
import { emptyMaps } from "../../store/mapsSlice";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenDeleteEverythingMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> 
}) => {

    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const panelContent = <>
        <Form.Group style={{ width: '18rem', margin: '0.5rem' }} controlId="MoorhenGetDeleteEverythingMenuItem" className="mb-3">
            <span style={{ fontWeight: 'bold' }}>Warning: this action cannot be reversed.</span>
        </Form.Group>
    </>

    const onCompleted = () => {
        maps.forEach(map => {
            map.delete()
        })
        molecules.forEach(molecule => {
            molecule.delete()
        })
        batch(() => {
            dispatch( emptyMolecules() )
            dispatch( emptyMaps() )
        })
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

