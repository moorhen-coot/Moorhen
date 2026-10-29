import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { MoorhenButton, MoorhenPopoverButton, MoorhenSelect } from "@/components/inputs";
import { MoorhenStack } from "@/components/interface-base";
import { useMoorhenInstance } from "@/hooks";
import { RootState, enqueueSnackbar } from "@/store";
import { MOVIE_SCENE_ID } from "@/store/userScenesSlice";

/**
 * Give a scene the settings, and optionally the representations, of another scene or snapshot.
 * Not for snapshots, which cannot be changed.
 * @param sceneId - The scene that changes.
 * @param withLabel - A labelled button (scene settings) instead of an icon (scene selector).
 */
export const CopySceneButton = (props: { sceneId: string; withLabel?: boolean }) => {
    const moorhenInstance = useMoorhenInstance();
    const dispatch = useDispatch();
    const scenes = useSelector((state: RootState) => state.userScenes.scenes);
    const snapshots = useSelector((state: RootState) => state.userScenes.snapshots);
    const isLocked = useSelector((state: RootState) => state.userScenes.isSceneChanging || state.movie.isPlaying);
    const [source, setSource] = useState<string>("");

    const sources = [...scenes, ...snapshots].filter(scene => scene.id !== props.sceneId);
    const targetName = scenes.find(scene => scene.id === props.sceneId)?.name ?? props.sceneId;

    const copy = async (withRepresentations: boolean) => {
        const sourceName = sources.find(scene => scene.id === source)?.name ?? source;
        if (await moorhenInstance.userScene.copyFrom(props.sceneId, source, withRepresentations)) {
            dispatch(
                enqueueSnackbar({
                    message: `"${targetName}" now has the ${withRepresentations ? "settings and representations" : "settings"} of "${sourceName}"`,
                    variant: "info",
                })
            );
        }
    };

    return (
        <MoorhenPopoverButton
            type={props.withLabel ? "default" : "icon-only"}
            label={props.withLabel ? "Copy From..." : undefined}
            icon="MatSymCopyAll"
            extraOnClick={() => setSource(sources[0]?.id ?? "")}
            tooltip="Copy the parameters of another scene into this one"
            disabled={isLocked}
        >
            <MoorhenStack>
                <MoorhenSelect label="Copy from" value={source} onChange={event => setSource(event.target.value)}>
                    {sources.map(scene => (
                        <option key={scene.id} value={scene.id}>
                            {scene.name}
                        </option>
                    ))}
                </MoorhenSelect>
                <MoorhenButton disabled={!source || isLocked} onClick={() => copy(false)}>
                    Copy Settings
                </MoorhenButton>
                <MoorhenButton disabled={!source || isLocked} onClick={() => copy(true)}>
                    Copy Settings and Representations
                </MoorhenButton>
                {props.sceneId === MOVIE_SCENE_ID && (
                    <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                        Copying representations replaces the ones this movie fades: their fades stop working.
                    </div>
                )}
            </MoorhenStack>
        </MoorhenPopoverButton>
    );
};
