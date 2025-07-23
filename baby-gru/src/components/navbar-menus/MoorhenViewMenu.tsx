import { useSelector, useDispatch } from "react-redux";
import { MenuItem } from "@mui/material";
import { MoorhenScenePresetMenuItem } from "../menu-item/MoorhenScenePresetMenuItem"
import { moorhen } from "../../types/moorhen";
import { convertViewtoPx } from "../../utils/utils";
import { showModal } from "../../store/modalsSlice";
import { MoorhenOtherSceneSettings } from "../menu-item/MoorhenOtherSceneSettings";
import { MoorhenLayoutSettings } from "../menu-item/MoorhenLayoutSettings";
import { modalKeys } from "../../utils/enums";

export const MoorhenViewMenu = (props: {dropdownId:string}) => {


    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const dispatch = useDispatch()

    return <>
        <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
                <MoorhenScenePresetMenuItem />
                <MenuItem onClick={() => {
                    dispatch(showModal(modalKeys.SCENE_SETTINGS))
                    document.body.click()
                }}>Scene settings...</MenuItem>
                <MoorhenOtherSceneSettings />
                <MoorhenLayoutSettings />
        </div>
    </>
}
