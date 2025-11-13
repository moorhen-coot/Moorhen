import { useDispatch } from "react-redux";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { MoorhenMenuItem } from "../interface-base/MenuItem";
import { MoorhenLayoutSettings } from "../menu-item/MoorhenLayoutSettings";
import { MoorhenOtherSceneSettings } from "../menu-item/MoorhenOtherSceneSettings";
import { MoorhenScenePresetMenuItem } from "../menu-item/MoorhenScenePresetMenuItem";

export const MoorhenViewMenu = () => {
    const dispatch = useDispatch();

    return (
        <>
            <MoorhenScenePresetMenuItem />
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.SCENE_SETTINGS));
                    document.body.click();
                }}
            >
                Scene settings...
            </MoorhenMenuItem>
            <MoorhenOtherSceneSettings />
            <MoorhenLayoutSettings />
        </>
    );
};
