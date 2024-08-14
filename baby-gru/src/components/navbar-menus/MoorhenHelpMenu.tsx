import { useState } from "react";
import { MoorhenAboutMenuItem } from "../menu-item/MoorhenAboutMenuItem";
import { MoorhenContactMenuItem } from "../menu-item/MoorhenContactMenuItem";
import { MenuItem } from "@mui/material";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { useDispatch, useSelector } from "react-redux";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { convertViewtoPx } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";

export const MoorhenHelpMenu = (props: MoorhenNavBarExtendedControlsInterface) => {

    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const dispatch = useDispatch()

    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    
    const menuItemProps = {setPopoverIsShown, ...props}
    
    return <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
        <MenuItem onClick={() => window.open('https://moorhen-coot.github.io/wiki/')}>Go to Moorhen wiki...</MenuItem>
        <MenuItem onClick={() => {
            dispatch(showModal(modalKeys.SHOW_CONTROLS))
            document.body.click()
        }}>Show controls...</MenuItem>
        <MoorhenContactMenuItem {...menuItemProps} />
        <MoorhenAboutMenuItem {...menuItemProps} />
    </div>
}
