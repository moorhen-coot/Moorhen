import { useDispatch } from 'react-redux';
import { useMoorhenInstance } from '../../InstanceManager';
import { showModal } from '../../store/modalsSlice';
import { modalKeys } from '../../utils/enums';
import { MoorhenMenuItem } from '../menu-item/MenuItem';
import { MoorhenLayoutSettings } from '../menu-item/MoorhenLayoutSettings';
import { MoorhenOtherSceneSettings } from '../menu-item/MoorhenOtherSceneSettings';
import { MoorhenScenePresetMenuItem } from '../menu-item/MoorhenScenePresetMenuItem';

export const MoorhenViewMenu = (props: { dropdownId: string }) => {
    const dispatch = useDispatch();
    const moorhenInstance = useMoorhenInstance();

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
            <MoorhenMenuItem
                onClick={() => {
                    moorhenInstance.actions.showModal(modalKeys.SCENE_SETTINGS);
                    document.body.click();
                }}
            >
                Scene settings with action...
            </MoorhenMenuItem>
        </>
    );
};
