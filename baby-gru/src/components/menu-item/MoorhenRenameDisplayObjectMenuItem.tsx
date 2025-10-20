import { Form } from "react-bootstrap";
import { useRef } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenRenameDisplayObjectMenuItem = (props: {
    item: moorhen.Molecule | moorhen.Map;
    setCurrentName: React.Dispatch<React.SetStateAction<string>>;
}) => {
    const newNameInputRef = useRef<HTMLInputElement | null>(null);

    const panelContent = (
        <>
            <Form.Group style={{ width: "10rem", margin: "0" }} controlId="MoorhenGetRenameMenuItem" className="mb-3">
                <Form.Control ref={newNameInputRef} type="text" name="newItemName" placeholder="New name" />
            </Form.Group>
        </>
    );

    const onCompleted = () => {
        const newName = newNameInputRef.current.value;
        if (newName === "") {
            return;
        }
        props.item.name ? (props.item.name = newName) : (props.item.name = newName);
        props.setCurrentName(newName);
    };

    return (
        <MoorhenBaseMenuItem
            popoverPlacement="left"
            popoverContent={panelContent}
            menuItemText={props.item.type === "molecule" ? "Rename molecule" : "Rename map"}
            onCompleted={onCompleted}
        />
    );
};
