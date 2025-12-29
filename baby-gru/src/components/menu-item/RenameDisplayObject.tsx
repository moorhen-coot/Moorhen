import { useRef } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton, MoorhenTextInput } from "../inputs";

export const RenameDisplayObject = (props: {
    item: moorhen.Molecule | moorhen.Map;
    setCurrentName: React.Dispatch<React.SetStateAction<string>>;
}) => {
    const newNameInputRef = useRef<HTMLInputElement | null>(null);

    const menuItemText = props.item.type === "molecule" ? "Rename molecule" : "Rename map";

    const onCompleted = () => {
        const newName = newNameInputRef.current.value;
        if (newName === "") {
            return;
        }
        props.item.name ? (props.item.name = newName) : (props.item.name = newName);
        props.setCurrentName(newName);
    };

    return (
        <>
            <MoorhenTextInput ref={newNameInputRef} placeholder="New name" />
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
