import { useDispatch } from "react-redux";
import { MoorhenScenePresetMenuItem } from "../menu-item/MoorhenScenePresetMenuItem";
import { MoorhenMenuItem } from "../menu-item/MenuItem";
import { showModal } from "../../store/modalsSlice";
import { MoorhenOtherSceneSettings } from "../menu-item/MoorhenOtherSceneSettings";
import { MoorhenLayoutSettings } from "../menu-item/MoorhenLayoutSettings";
import { modalKeys } from "../../utils/enums";

export const MoorhenViewMenu = (props: { dropdownId: string }) => {
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
