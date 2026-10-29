import { useDispatch, useSelector } from "react-redux";
import { useRef, useState } from "react";
import { MoorhenIcon } from "@/components/icons";
import { MoorhenButton, MoorhenPopoverButton, MoorhenTextInput } from "@/components/inputs";
import { useMoorhenInstance } from "@/hooks";
import { RootState, setSceneSelectorOpen, setShownSidePanel } from "@/store";
import { MOVIE_SCENE_ID, UserScene, isBuiltInScene } from "@/store/userScenesSlice";
import { MoorhenInfoCard, MoorhenMenuItem, MoorhenPopover, MoorhenStack, MoorhenTooltip } from "../../interface-base";
import { CopySceneButton } from "./CopySceneButton";
import { SaveSceneButton } from "./SaveSceneButton";
import "./scene-selector.css";

const scenesInfo = (
    <span>
        <b>Scenes</b>
        <br />A scene is a whole look of the view: the representations of every molecule and the scene settings (lighting, background,
        effects, fog and clipping). Switching scene swaps all of it, the camera stays where it is. A scene keeps its changes while you work
        in another one.
        <br />
        <br />
        <b>Default and Model Building</b>
        <br />
        Built in. Save their settings to start Moorhen with them; restore brings back the saved or the default settings, with the default
        representations.
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
    const hasMovieKeyframes = useSelector((state: RootState) => state.movie.document.path.keyframes.length > 0);
    // Switching scene deletes the representations a movie fades, and a snapshot moves its camera
    const isLocked = isSceneChanging || isMoviePlaying;
    // In the store so the View menu can open it too
    const isShown = useSelector((state: RootState) => state.globalUI.isSceneSelectorOpen);
    const [renameInputValue, setRenameInputValue] = useState<string>("");
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    // A snapshot taken from anywhere (e.g. with a screenshot) plays an animation on the button. Only
    // for one added snapshot: loading a session replaces the whole list
    const [snapshotCount, setSnapshotCount] = useState<number>(userSnapshots.length);
    const [snapshotAnimationKey, setSnapshotAnimationKey] = useState<number>(0);
    if (userSnapshots.length !== snapshotCount) {
        if (userSnapshots.length === snapshotCount + 1) setSnapshotAnimationKey(snapshotAnimationKey + 1);
        setSnapshotCount(userSnapshots.length);
    }
    const buttonRef = useRef<HTMLButtonElement>(null);
    const moorhenInstance = useMoorhenInstance();
    const dispatch = useDispatch();
    const setIsShown = (value: boolean) => dispatch(setSceneSelectorOpen(value));

    const handleClick = () => {
        setIsShown(!isShown);
    };

    const handleNewScene = () => {
        moorhenInstance.userScene.create();
        setIsShown(false);
    };

    const isMovieScene = (id: string) => id === MOVIE_SCENE_ID;
    const isSnapshotShown = selectedScene.startsWith("snapshot-");
    const sceneName = [...userScenes, ...userSnapshots].find(userScene => userScene.id === selectedScene)?.name ?? selectedScene;
    const sceneCustomNumber = selectedScene.startsWith("custom-") || isSnapshotShown ? parseInt(selectedScene.split("-")[1]) : null;

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
                aria-label={`Scene selector, showing ${sceneName}`}
                aria-haspopup="dialog"
                aria-expanded={isShown}
            >
                <MoorhenIcon moorhenSVG={sceneIcon} alt="Scenes" size="medium" />
                <div className="moorhen__scene-selector-number">{sceneCustomNumber}</div>
                {selectedScene === "Model Building" && <MoorhenIcon moorhenSVG="MatSymBuild" size="small" />}
                {/* Keyed: a new snapshot mounts a new element, which restarts the animation */}
                {snapshotAnimationKey > 0 && (
                    <span key={snapshotAnimationKey} className="moorhen__scene-selector-snapshot-added" aria-hidden="true">
                        <MoorhenIcon moorhenSVG="MatSymPhotoCam" size="small" />
                    </span>
                )}
            </button>
        </MoorhenTooltip>
    );

    // Which row popover is open ("rename:<id>", "restore:<id>"...), so its own buttons can close it
    const popoverProps = (key: string) => ({
        isShown: openPopover === key,
        setIsShown: (isShown: boolean) => setOpenPopover(isShown ? key : null),
    });

    const applyRename = (id: string) => {
        const name = renameInputValue.trim();
        if (name === "") return;
        moorhenInstance.userScene.rename(id, name);
        setOpenPopover(null);
    };

    const extraControls = (id: string) => {
        if (!isBuiltInScene(id)) {
            const kind = id.startsWith("snapshot-") ? "Snapshot" : "Scene";
            const name = [...userScenes, ...userSnapshots].find(userScene => userScene.id === id)?.name ?? id;
            return (
                <>
                    {/* The movie plays in its scene: it cannot be deleted while the movie has keyframes */}
                    {!(isMovieScene(id) && hasMovieKeyframes) && (
                        <MoorhenPopoverButton
                            type="icon-only"
                            icon="MatSymDelete"
                            tooltip={`Delete this ${kind.toLowerCase()}`}
                            ariaLabel={`Delete ${kind.toLowerCase()} "${name}"`}
                            disabled={isLocked}
                            {...popoverProps(`delete:${id}`)}
                        >
                            <MoorhenButton
                                variant="danger"
                                disabled={isLocked}
                                onClick={() => {
                                    moorhenInstance.userScene.delete(id);
                                    setOpenPopover(null);
                                }}
                            >
                                Delete This {kind}
                            </MoorhenButton>
                        </MoorhenPopoverButton>
                    )}
                    {/* One rename popover is open at a time, so they share one input */}
                    <MoorhenPopoverButton
                        type="icon-only"
                        icon="MatSymEdit"
                        extraOnClick={() => setRenameInputValue(name)}
                        tooltip={`Rename this ${kind.toLowerCase()}`}
                        ariaLabel={`Rename ${kind.toLowerCase()} "${name}"`}
                        {...popoverProps(`rename:${id}`)}
                    >
                        <MoorhenTextInput text={renameInputValue} setText={setRenameInputValue} onSubmit={() => applyRename(id)} />
                        <MoorhenButton disabled={renameInputValue.trim() === ""} onClick={() => applyRename(id)}>
                            Apply
                        </MoorhenButton>
                    </MoorhenPopoverButton>
                    {kind === "Scene" && <CopySceneButton sceneId={id} />}
                </>
            );
        } else {
            const restore = (to: "saved" | "default") => {
                moorhenInstance.userScene.reset(id, to, true);
                setOpenPopover(null);
            };
            return (
                <>
                    <SaveSceneButton sceneId={id} iconOnly={true} />
                    <CopySceneButton sceneId={id} />
                    <MoorhenPopoverButton
                        type="icon-only"
                        icon="MatSymReplay"
                        tooltip="Restore this scene: its settings and representations"
                        ariaLabel={`Restore scene "${userScenes.find(scene => scene.id === id)?.name ?? id}"`}
                        disabled={isLocked}
                        {...popoverProps(`restore:${id}`)}
                    >
                        <MoorhenStack>
                            <MoorhenButton disabled={isLocked} onClick={() => restore("saved")}>
                                Revert to Saved Settings and Default Representations
                            </MoorhenButton>
                            <MoorhenButton variant="danger" disabled={isLocked} onClick={() => restore("default")}>
                                Reset to Default Settings and Representations
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
                ariaCurrent={userScene.id === selectedScene}
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
            {/* A dialog, not a menu: its rows hold several controls each, reached with Tab. Escape
                closes it, the usual dialog behaviour, which the rule below does not know about */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <div
                role="dialog"
                aria-label="Scenes"
                onKeyDown={event => {
                    if (event.key !== "Escape") return;
                    setIsShown(false);
                    buttonRef.current?.focus();
                }}
            >
                <MoorhenStack className="moorhen__scene-selector-menu" style={{ maxHeight: "80vh", overflowY: "auto" }}>
                    <MoorhenStack direction="line" align="center">
                        <div className="moorhen__submenu-title" style={{ flex: 1 }}>
                            Scenes
                        </div>
                        <MoorhenInfoCard infoText={scenesInfo} popoverPlacement="right" width="25rem" />
                        <MoorhenButton
                            type="icon-only"
                            icon="MatSymSettings"
                            tooltip="Scene settings"
                            ariaLabel="Scene settings"
                            onClick={() => {
                                dispatch(setShownSidePanel("sceneSettings"));
                                setIsShown(false);
                            }}
                        />
                    </MoorhenStack>
                    {userScenes.filter(userScene => !isMovieScene(userScene.id)).map(sceneItem)}
                    <MoorhenButton
                        tooltip="New Custom Scene"
                        ariaLabel="New custom scene"
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
                        ariaLabel="Take a snapshot of the current view"
                        disabled={isLocked}
                        onClick={() => moorhenInstance.userScene.takeSnapshot()}
                        type="icon-only"
                        icon="MatSymPhotoCam"
                    />
                </MoorhenStack>
            </div>
        </MoorhenPopover>
    );
};
