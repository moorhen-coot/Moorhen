import { useState } from "react";
import { MoorhenMenuItem } from "../interface-base";
import { MoorhenShortcutConfigModal } from "../modal/MoorhenShortcutConfigModal";

export const ShowShortcutModal = () => {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <MoorhenMenuItem id="configure-shortcuts-menu-item" onClick={() => setShowModal(true)}>
                Configure shortcuts...
            </MoorhenMenuItem>
            <MoorhenShortcutConfigModal showModal={showModal} setShowModal={setShowModal} />
        </>
    );
};
