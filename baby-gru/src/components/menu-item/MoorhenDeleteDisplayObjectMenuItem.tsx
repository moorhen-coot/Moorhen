import { Form } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector, useDispatch } from 'react-redux';
import { setActiveMap } from "../../store/generalStatesSlice";
import { removeMap } from "../../store/mapsSlice";
import { removeMolecule } from "../../store/moleculesSlice";

export const MoorhenDeleteDisplayObjectMenuItem = (props: {
    item: moorhen.Map | moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const dispatch = useDispatch()

    const panelContent = <>
        <Form.Group style={{ width: '10rem', margin: '0.5rem' }} controlId="MoorhenGetDeleteMenuItem" className="mb-3">
            <span style={{ fontWeight: 'bold' }}>Are you sure?</span>
        </Form.Group>
    </>

    const onCompleted = () => {
        props.item.delete()
        props.setPopoverIsShown(false)
        if (props.item.type === "map") {
            dispatch( removeMap(props.item as moorhen.Map) )
            if (activeMap?.molNo === props.item.molNo) {
                dispatch( setActiveMap(null) )
            }
        } else if(props.item.type === "molecule") {
            dispatch( removeMolecule(props.item as moorhen.Molecule) )
        } else {
            console.warn('Attempted to delete item of unknown type ', props.item.type)
        }
    }

    return <MoorhenBaseMenuItem
        textClassName="text-danger"
        buttonVariant="danger"
        buttonText="Delete"
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={props.item.type === 'molecule' ? "Delete molecule" : "Delete map"}
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
