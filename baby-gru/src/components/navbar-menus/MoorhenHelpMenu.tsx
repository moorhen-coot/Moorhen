import { useState } from "react";
import { MoorhenAboutMenuItem } from "../menu-item/MoorhenAboutMenuItem";
import { MoorhenContactMenuItem } from "../menu-item/MoorhenContactMenuItem";
import { MoorhenControlsModal } from "../modal/MoorhenControlsModal";
import { MenuItem } from "@mui/material";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";

export const MoorhenHelpMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    const [showControlsModal, setShowControlsModal] = useState<boolean>(false)
    const menuItemProps = {setPopoverIsShown, ...props}
    
    return <>
        <MenuItem onClick={() => window.open('https://moorhen-coot.github.io/wiki/')}>Go to Moorhen wiki...</MenuItem>
        <MenuItem onClick={() => setShowControlsModal(true)}>Show controls...</MenuItem>
        <MoorhenContactMenuItem {...menuItemProps} />
        <MoorhenAboutMenuItem {...menuItemProps} />
        <MoorhenControlsModal {...props} showControlsModal={showControlsModal} setShowControlsModal={setShowControlsModal} />
    </>
}
