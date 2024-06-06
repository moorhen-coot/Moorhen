import { useState } from "react";
import { MoorhenAboutMenuItem } from "../menu-item/MoorhenAboutMenuItem";
import { MoorhenContactMenuItem } from "../menu-item/MoorhenContactMenuItem";
import { MenuItem } from "@mui/material";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { useDispatch } from "react-redux";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";

export const MoorhenHelpMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const dispatch = useDispatch()

    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    
    const menuItemProps = {setPopoverIsShown, ...props}
    
    return <>
        <MenuItem onClick={() => window.open('https://moorhen-coot.github.io/wiki/')}>Go to Moorhen wiki...</MenuItem>
        <MenuItem onClick={() => {
            dispatch(showModal(modalKeys.SHOW_CONTROLS))
            document.body.click()
        }}>Show controls...</MenuItem>
        <MoorhenContactMenuItem {...menuItemProps} />
        <MoorhenAboutMenuItem {...menuItemProps} />
    </>
}
