import { Form } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenDeleteDisplayObjectMenuItem = (props: {
    changeItemList: (arg0: moorhen.MolChange<(moorhen.Molecule | moorhen.Map)>) => void;
    item: moorhen.Map | moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    activeMap?: moorhen.Map;
    setActiveMap?: React.Dispatch<React.SetStateAction<moorhen.Map>>; 
}) => {

    const panelContent = <>
        <Form.Group style={{ width: '10rem', margin: '0.5rem' }} controlId="MoorhenGetDeleteMenuItem" className="mb-3">
            <span style={{ fontWeight: 'bold' }}>Are you sure?</span>
        </Form.Group>
    </>

    const onCompleted = () => {
        props.changeItemList({ action: 'Remove', item: props.item })
        props.item.delete();
        props.setPopoverIsShown(false)
        if (props.item.type === "map" && props.activeMap?.molNo === props.item.molNo) {
            props.setActiveMap(null)
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
