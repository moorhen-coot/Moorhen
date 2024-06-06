import { useState } from "react";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MoorhenScenePresetMenuItem } from "../menu-item/MoorhenScenePresetMenuItem"
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch } from "react-redux";
import { convertViewtoPx } from "../../utils/utils";
import { MenuItem } from "@mui/material";
import { showModal } from "../../store/modalsSlice";
import { MoorhenOtherSceneSettings } from "../menu-item/MoorhenOtherSceneSettings";
import { modalKeys } from "../../utils/enums";

export const MoorhenViewMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)

    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const dispatch = useDispatch()

    const menuItemProps = {setPopoverIsShown, ...props}

    return <>
        <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
                <MoorhenScenePresetMenuItem {...menuItemProps} />
                <MenuItem onClick={() => {
                    dispatch(showModal(modalKeys.SCENE_SETTINGS))
                    document.body.click()
                }}>Scene settings...</MenuItem>
                <MoorhenOtherSceneSettings {...menuItemProps} />
        </div>
    </>
}
