import { useSelector } from "react-redux";
import { MoorhenButton } from "@/components/inputs";
import { useMoorhenInstance } from "@/hooks";
import { RootState } from "@/store";

/**
 * Save a built-in scene's settings for the next time Moorhen starts. Disabled while they are
 * already saved, so it doubles as the unsaved-changes indicator.
 * @param sceneId - "Overview" or "Model Building".
 * @param iconOnly - An icon button (scene selector) instead of a labelled one (scene settings).
 */
export const SaveSceneButton = (props: { sceneId: string; iconOnly?: boolean }) => {
    const moorhenInstance = useMoorhenInstance();
    const isSceneChanging = useSelector((state: RootState) => state.userScenes.isSceneChanging);
    const hasUnsavedChanges = useSelector((state: RootState) => moorhenInstance.userScene.hasUnsavedChanges(props.sceneId, state));
    const sceneName = useSelector(
        (state: RootState) => state.userScenes.scenes.find(scene => scene.id === props.sceneId)?.name ?? props.sceneId
    );

    const buttonProps = {
        disabled: !hasUnsavedChanges || isSceneChanging,
        tooltip: hasUnsavedChanges ? `Save the settings of "${sceneName}"` : `"${sceneName}" settings are saved`,
        onClick: () => moorhenInstance.userScene.saveScene(props.sceneId),
        icon: "MatSymSave" as const,
    };
    return props.iconOnly ? (
        <MoorhenButton type="icon-only" {...buttonProps} ariaLabel={`Save the settings of "${sceneName}"`} />
    ) : (
        <MoorhenButton {...buttonProps} label={`Save "${sceneName}" settings`} />
    );
};
