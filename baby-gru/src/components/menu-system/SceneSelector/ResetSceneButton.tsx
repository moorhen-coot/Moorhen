import { useSelector } from "react-redux";
import { useState } from "react";
import { MoorhenButton, MoorhenPopoverButton, MoorhenToggle } from "@/components/inputs";
import { MoorhenStack } from "@/components/interface-base";
import { useMoorhenInstance } from "@/hooks";
import { RootState } from "@/store";

/**
 * Reset a built-in scene to its saved or its default settings, and its representations too if the
 * box is ticked (off by default). The settings saved as preferences are not changed.
 * @param sceneId - The id of the built-in scene.
 */
export const ResetSceneButton = (props: { sceneId: string }) => {
    const moorhenInstance = useMoorhenInstance();
    const isLocked = useSelector((state: RootState) => state.userScenes.isSceneChanging || state.movie.isPlaying);
    const sceneName = useSelector(
        (state: RootState) => state.userScenes.scenes.find(scene => scene.id === props.sceneId)?.name ?? props.sceneId
    );
    const [isShown, setIsShown] = useState<boolean>(false);
    const [withRepresentations, setWithRepresentations] = useState<boolean>(false);

    const reset = (to: "saved" | "default") => {
        moorhenInstance.userScene.reset(props.sceneId, to, withRepresentations);
        setIsShown(false);
    };

    return (
        <MoorhenPopoverButton
            type="icon-only"
            icon="MatSymReplay"
            tooltip="Reset this scene"
            ariaLabel={`Reset scene "${sceneName}"`}
            disabled={isLocked}
            isShown={isShown}
            setIsShown={setIsShown}
        >
            <MoorhenStack align="center" gap="0.1rem">
                <MoorhenToggle                 
                    label="Reload default representations"
                    checked={withRepresentations}
                    onChange={() => setWithRepresentations(!withRepresentations)}
                />
                <MoorhenButton disabled={isLocked} onClick={() => reset("saved")}>
                    Load <strong>Saved</strong> parameters
                </MoorhenButton>
                <MoorhenButton  disabled={isLocked} onClick={() => reset("default")}>
                    Load <strong>Default</strong> parameters
                </MoorhenButton>
            </MoorhenStack>
        </MoorhenPopoverButton>
    );
};
