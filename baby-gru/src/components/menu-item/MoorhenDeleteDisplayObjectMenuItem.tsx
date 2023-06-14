import { Form } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { MoorhenMapInterface } from "../../utils/MoorhenMap";
import { MoorhenMoleculeInterface } from "../../utils/MoorhenMolecule";
import { MolChange } from "../MoorhenApp";

export const MoorhenDeleteDisplayObjectMenuItem = (props: {
    changeItemList: (arg0: MolChange<(MoorhenMoleculeInterface | MoorhenMapInterface)>) => void;
    item: MoorhenMapInterface | MoorhenMoleculeInterface;
    glRef: React.RefObject<mgWebGLType>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    activeMap?: MoorhenMapInterface;
    setActiveMap?: React.Dispatch<React.SetStateAction<MoorhenMapInterface>>; 
}) => {

    const panelContent = <>
        <Form.Group style={{ width: '10rem', margin: '0.5rem' }} controlId="MoorhenGetDeleteMenuItem" className="mb-3">
            <span style={{ fontWeight: 'bold' }}>Are you sure?</span>
        </Form.Group>
    </>

    const onCompleted = () => {
        props.changeItemList({ action: 'Remove', item: props.item })
        props.item.delete(props.glRef);
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
