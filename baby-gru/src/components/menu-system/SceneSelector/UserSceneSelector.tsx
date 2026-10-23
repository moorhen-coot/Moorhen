import { useDispatch, useSelector } from "react-redux";
import { useRef, useState } from "react";
import { MoorhenIcon } from "@/components/icons";
import { MoorhenButton, MoorhenPopoverButton, MoorhenTextInput } from "@/components/inputs";
import { useMoorhenInstance } from "@/hooks";
import { RootState, setMainMenuOpen, setShownSidePanel } from "@/store";
import { isBuiltInScene, UserScene } from "@/store/userScenesSlice";
import { MoorhenInfoCard, MoorhenMenuItem, MoorhenPopover, MoorhenStack, MoorhenTooltip } from "../../interface-base";
import { CopySceneButton } from "./CopySceneButton";
import { SaveSceneButton } from "./SaveSceneButton";
import "./scene-selector.css";

const scenesInfo = (
    <span>
        <b>Scenes</b>
        <br />A scene is a whole look of the view: the representations of every molecule and the scene settings (lighting,
        background, effects, fog and clipping). Switching scene swaps all of it, the camera stays where it is. A scene keeps
        its changes while you work in another one.
        <br />
        <br />
        <b>Default and Model Building</b>
        <br />
        Built in. Save their settings to start Moorhen with them; restore brings back the saved or the default settings.
        <br />
        <br />
        <b>Custom scenes</b>
        <br />
        Start as a copy of the current scene. Kept in session files.
        <br />
        <br />
        <b>Movie</b>
        <br />
        The scene the movie plays in: its settings are the movie&apos;s.
        <br />
        <br />
        <b>Snapshots</b>
        <br />
        A scene with its camera, that cannot be changed: changes made while it is shown are not kept.
        <br />
        <br />
        The copy button gives a scene the settings (and representations) of another one, the gear opens the scene settings.
    </span>
);

export const UserSceneSelector = () => {
    const userScenes = useSelector((state: RootState) => state.userScenes.scenes);
    const userSnapshots = useSelector((state: RootState) => state.userScenes.snapshots);
    const selectedScene = useSelector((state: RootState) => state.userScenes.selectedScene);
    const isSceneChanging = useSelector((state: RootState) => state.userScenes.isSceneChanging);
    const isMoviePlaying = useSelector((state: RootState) => state.movie.isPlaying);
    const movieSceneId = useSelector((state: RootState) => state.movie.document.sceneId);
    // Switching scene deletes the representations a movie fades, and a snapshot moves its camera
    const isLocked = isSceneChanging || isMoviePlaying;
    const [isShown, setIsShown] = useState<boolean>(false);
    const [renameInputValue, setRenameInputValue] = useState<string>("");
    const buttonRef = useRef<HTMLButtonElement>(null);
    const moorhenInstance = useMoorhenInstance();
    const dispatch = useDispatch();

    const handleClick = () => {
        setIsShown(!isShown);
        dispatch(setMainMenuOpen(false));
    };

    const handleNewScene = () => {
        moorhenInstance.userScene.create();
        document.body.click();
    };

    const isMovieScene = (id: string) => id.startsWith("movie-");
    const isSnapshotShown = selectedScene.startsWith("snapshot-");
    const sceneName = [...userScenes, ...userSnapshots].find(userScene => userScene.id === selectedScene)?.name ?? selectedScene;
    const sceneCustomNumber =
        selectedScene.startsWith("custom-") || isSnapshotShown ? parseInt(selectedScene.split("-")[1]) : null;

    let sceneIcon: "MatSymPhotoCam" | "MatSymWallpaperSlideshow" | "clapperboard" = "MatSymWallpaperSlideshow";
    if (isSnapshotShown) sceneIcon = "MatSymPhotoCam";
    if (isMovieScene(selectedScene)) sceneIcon = "clapperboard";

    const link = (
        <MoorhenTooltip
            tooltip={isMoviePlaying ? `Scene selector: ${sceneName} (locked while a movie plays)` : `Scene selector: ${sceneName}`}
            placement="bottom"
        >
            <button
                ref={buttonRef}
                disabled={isMoviePlaying}
                className={`moorhen__main-menu-button moorhen__scene-selector${isShown ? " open" : ""}`}
                onClick={handleClick}
                aria-haspopup="menu"
                aria-expanded={isShown}
            >
                <MoorhenIcon moorhenSVG={sceneIcon} alt="Scene Presets" size="medium" />
                <div className="moorhen__scene-selector-number">{sceneCustomNumber}</div>
                {(selectedScene === "Model Building") && <MoorhenIcon moorhenSVG="MatSymBuild" size="small" />} 
            </button>
        </MoorhenTooltip>
    );

    const extraControls = (id: string) => {
        if (!isBuiltInScene(id)) {
            const kind = id.startsWith("snapshot-") ? "Snapshot" : "Scene";
            const name = [...userScenes, ...userSnapshots].find(userScene => userScene.id === id)?.name ?? id;
            return (
                <>
                    {/* The movie plays in its scene: it cannot be deleted while the movie uses it */}
                    {id !== movieSceneId && (
                        <MoorhenPopoverButton type="icon-only" icon="MatSymDelete" tooltip={`Delete this ${kind.toLowerCase()}`}>
                            <MoorhenButton variant="danger" onClick={() => moorhenInstance.userScene.delete(id)}>
                                Delete This {kind}
                            </MoorhenButton>
                        </MoorhenPopoverButton>
                    )}
                    <MoorhenPopoverButton type="icon-only" icon="MatSymEdit" extraOnClick={() => setRenameInputValue(name)} tooltip={`Rename this ${kind.toLowerCase()}`}>
                        <MoorhenTextInput text={renameInputValue} setText={setRenameInputValue} />
                        <MoorhenButton onClick={() => moorhenInstance.userScene.rename(id, renameInputValue)}>Apply</MoorhenButton>
                    </MoorhenPopoverButton>
                    {kind === "Scene" && <CopySceneButton sceneId={id} />}
                </>
            );
        } else {
            return (
                <>
                    <SaveSceneButton sceneId={id} iconOnly={true} />
                    <CopySceneButton sceneId={id} />
                    <MoorhenPopoverButton type="icon-only" icon="MatSymReplay" tooltip="Restore this scene">
                        <MoorhenStack>
                            <MoorhenButton onClick={() => moorhenInstance.userScene.restoreDefault(id, "saved")}>
                                Restore Saved Settings
                            </MoorhenButton>
                            <MoorhenButton variant="danger" onClick={() => moorhenInstance.userScene.restoreDefault(id, "default")}>
                                Restore Default Settings
                            </MoorhenButton>
                        </MoorhenStack>
                    </MoorhenPopoverButton>
                </>
            );
        }
    };

    const sceneItem = (userScene: UserScene) => (
        <MoorhenStack direction="line" key={userScene.id}>
            <MoorhenMenuItem
                disabled={isLocked}
                selected={userScene.id === selectedScene}
                style={{ flex: 1 }}
                onClick={() => {
                    moorhenInstance.userScene.select(userScene.id);
                    setIsShown(false);
                }}
            >
                {userScene.name}
            </MoorhenMenuItem>
            {extraControls(userScene.id)}
        </MoorhenStack>
    );

    return (
        <MoorhenPopover
            link={link}
            linkRef={buttonRef}
            isShown={isShown}
            setIsShown={setIsShown}
            popoverPlacement="bottom-left"
            type="custom"
        >
            <MoorhenStack className="moorhen__scene-selector-menu" role="menu" style={{ maxHeight: "80vh", overflowY: "auto" }}>
                <MoorhenStack direction="line" align="center">
                    <div className="moorhen__submenu-title" style={{ flex: 1 }}>
                        Scenes
                    </div>
                    <MoorhenInfoCard infoText={scenesInfo} popoverPlacement="right" width="25rem" />
                    <MoorhenButton
                        type="icon-only"
                        icon="MatSymSettings"
                        tooltip="Scene settings"
                        onClick={() => {
                            dispatch(setShownSidePanel("sceneSettings"));
                            setIsShown(false);
                        }}
                    />
                </MoorhenStack>
                {userScenes.filter(userScene => !isMovieScene(userScene.id)).map(sceneItem)}
                <MoorhenButton
                    tooltip="New Custom Scene"
                    disabled={isLocked}
                    onClick={handleNewScene}
                    type="icon-only"
                    icon="MatSymAdd"
                />
                {userScenes.some(userScene => isMovieScene(userScene.id)) && (
                    <>
                        <div className="moorhen__submenu-title">Movie</div>
                        {userScenes.filter(userScene => isMovieScene(userScene.id)).map(sceneItem)}
                    </>
                )}
                <div className="moorhen__submenu-title">Snapshots</div>
                {userSnapshots.map(sceneItem)}
                <MoorhenButton
                    tooltip="Take a snapshot of the current view"
                    disabled={isLocked}
                    onClick={() => moorhenInstance.userScene.takeSnapshot()}
                    type="icon-only"
                    icon="MatSymPhotoCam"
                />
            </MoorhenStack>
        </MoorhenPopover>
    );
};
