import { useDispatch, useSelector } from "react-redux";
import { useRef, useState } from "react";
import { MoorhenIcon } from "@/components/icons";
import { MoorhenButton, MoorhenPopoverButton, MoorhenTextInput } from "@/components/inputs";
import { useMoorhenInstance } from "@/hooks";
import { RootState, setMainMenuOpen } from "@/store";
import { MoorhenMenuItem, MoorhenPopover, MoorhenStack, MoorhenTooltip } from "../../interface-base";
import "./scene-selector.css";

export const UserSceneSelector = () => {
    const userScenes = useSelector((state: RootState) => state.globalUI.userScenes);
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

    const sceneName = userScenes.find(userScene => userScene.id === selectedScene)?.name ?? selectedScene;
    const sceneCustomNumber = selectedScene.startsWith("custom-") ? parseInt(selectedScene.split("-")[1]) : null;

    const link = (
        <MoorhenTooltip tooltip={`Scene selector: ${sceneName}`} placement="bottom">
            <button
                ref={buttonRef}
                className={`moorhen__main-menu-button moorhen__scene-selector${isShown ? " open" : ""}`}
                onClick={handleClick}
                aria-haspopup="menu"
                aria-expanded={isShown}
            >
                <MoorhenIcon moorhenSVG={`MatSymWallpaperSlideshow`} alt="Scene Presets" size="medium" />
                <div className="moorhen__scene-selector-number">{sceneCustomNumber}</div>
            </button>
        </MoorhenTooltip>
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
            <MoorhenStack className="moorhen__scene-selector-menu" role="menu">
                <div className="moorhen__submenu-title">Change Scene Preset</div>
                {userScenes.map(userScene => (
                    <MoorhenStack direction="line" key={userScene.id}>
                        <MoorhenMenuItem
                            disabled={isSceneChanging}
                            selected={userScene.id === selectedScene}
                            onClick={() => {
                                moorhenInstance.userScene.select(userScene.id);
                                setIsShown(false);
                            }}
                        >
                            {userScene.name}
                        </MoorhenMenuItem>
                        {userScene.id.startsWith("custom-") && (
                            <>
                                <MoorhenPopoverButton type="icon-only" icon="MatSymDelete" tooltip="Delete this scene">
                                    <MoorhenButton variant="danger" onClick={() => moorhenInstance.userScene.delete(userScene.id)}>
                                        Delete This Scene
                                    </MoorhenButton>
                                </MoorhenPopoverButton>
                                <MoorhenPopoverButton type="icon-only" icon="MatSymEdit">
                                    <MoorhenTextInput 
                                    text={renameInputValue} setText={setRenameInputValue}/>
                                    <MoorhenButton onClick={() => moorhenInstance.userScene.rename(userScene.id, renameInputValue)}>
                                        Apply
                                    </MoorhenButton>

                                </MoorhenPopoverButton>
                            </>
                        )}
                    </MoorhenStack>
                ))}
                <MoorhenButton tooltip="New Custom Scene" disabled={isSceneChanging} onClick={handleNewScene} type="icon-only" icon="MatSymAdd" />
            </MoorhenStack>
        </MoorhenPopover>
    );
};
