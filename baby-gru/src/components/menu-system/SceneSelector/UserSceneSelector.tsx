import { useDispatch, useSelector } from "react-redux";
import { useRef, useState } from "react";
import { MoorhenIcon } from "@/components/icons";
import { MoorhenButton, MoorhenPopoverButton, MoorhenTextInput } from "@/components/inputs";
import { useMoorhenInstance } from "@/hooks";
import { RootState, UserScene, setMainMenuOpen } from "@/store";
import { MoorhenMenuItem, MoorhenPopover, MoorhenStack, MoorhenTooltip } from "../../interface-base";
import "./scene-selector.css";

export const UserSceneSelector = () => {
    const userScenes = useSelector((state: RootState) => state.globalUI.userScenes);
    const userSnapshots = useSelector((state: RootState) => state.globalUI.userSnapshots);
    const selectedScene = useSelector((state: RootState) => state.globalUI.selectedScene);
    const isSceneChanging = useSelector((state: RootState) => state.globalUI.isSceneChanging);
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

    const isSnapshotShown = selectedScene.startsWith("snapshot-");
    const sceneName = [...userScenes, ...userSnapshots].find(userScene => userScene.id === selectedScene)?.name ?? selectedScene;
    const sceneCustomNumber =
        selectedScene.startsWith("custom-") || isSnapshotShown ? parseInt(selectedScene.split("-")[1]) : null;

    let sceneIcon: "MatSymPhotoCam" | "MatSymWallpaperSlideshow" = "MatSymWallpaperSlideshow";
    if (isSnapshotShown) sceneIcon = "MatSymPhotoCam";

    const link = (
        <MoorhenTooltip tooltip={`Scene selector: ${sceneName}`} placement="bottom">
            <button
                ref={buttonRef}
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
        if (id.startsWith("custom-") || id.startsWith("snapshot-")) {
            const kind = id.startsWith("snapshot-") ? "Snapshot" : "Scene";
            const name = [...userScenes, ...userSnapshots].find(userScene => userScene.id === id)?.name ?? id;
            return (
                <>
                    <MoorhenPopoverButton type="icon-only" icon="MatSymDelete" tooltip={`Delete this ${kind.toLowerCase()}`}>
                        <MoorhenButton variant="danger" onClick={() => moorhenInstance.userScene.delete(id)}>
                            Delete This {kind}
                        </MoorhenButton>
                    </MoorhenPopoverButton>
                    <MoorhenPopoverButton type="icon-only" icon="MatSymEdit" extraOnClick={() => setRenameInputValue(name)} tooltip={`Rename this ${kind.toLowerCase()}`}>
                        <MoorhenTextInput text={renameInputValue} setText={setRenameInputValue} />
                        <MoorhenButton onClick={() => moorhenInstance.userScene.rename(id, renameInputValue)}>Apply</MoorhenButton>
                    </MoorhenPopoverButton>
                </>
            );
        } else {
            return (
                <MoorhenPopoverButton type="icon-only" icon="MatSymReplay" tooltip="Restore this scene to default">
                    <MoorhenButton variant="danger" onClick={() => moorhenInstance.userScene.restoreDefault(id)}>
                        Restore Scene to Default
                    </MoorhenButton>
                </MoorhenPopoverButton>
            );
        }
    };

    const sceneItem = (userScene: UserScene) => (
        <MoorhenStack direction="line" key={userScene.id}>
            <MoorhenMenuItem
                disabled={isSceneChanging}
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
                <div className="moorhen__submenu-title">Scenes</div>
                {userScenes.map(sceneItem)}
                <MoorhenButton
                    tooltip="New Custom Scene"
                    disabled={isSceneChanging}
                    onClick={handleNewScene}
                    type="icon-only"
                    icon="MatSymAdd"
                />
                <div className="moorhen__submenu-title">Snapshots</div>
                {userSnapshots.map(sceneItem)}
                <MoorhenButton
                    tooltip="Take a snapshot of the current view"
                    disabled={isSceneChanging}
                    onClick={() => moorhenInstance.userScene.takeSnapshot()}
                    type="icon-only"
                    icon="MatSymPhotoCam"
                />
            </MoorhenStack>
        </MoorhenPopover>
    );
};
