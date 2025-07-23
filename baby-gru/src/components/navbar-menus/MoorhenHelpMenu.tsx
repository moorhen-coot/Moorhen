import { useState } from "react";
import { MenuItem } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { MoorhenContactMenuItem } from "../menu-item/MoorhenContactMenuItem";
import { MoorhenReferencesMenuItem } from "../menu-item/MoorhenReferencesMenuItem";
import { MoorhenAboutMenuItem } from "../menu-item/MoorhenAboutMenuItem";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { convertViewtoPx } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";

export const MoorhenHelpMenu = (props: {dropdownId: string}) => {

    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const dispatch = useDispatch() 
    
    return <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
        <MenuItem onClick={() => window.open('https://moorhen-coot.github.io/wiki/')}>Go to Moorhen wiki...</MenuItem>
        <MenuItem onClick={() => {
            dispatch(showModal(modalKeys.SHOW_CONTROLS))
            document.body.click()
        }}>Show controls...</MenuItem>
        <MoorhenContactMenuItem/>
        <MoorhenAboutMenuItem  />
        <MoorhenReferencesMenuItem />
    </div>
}
