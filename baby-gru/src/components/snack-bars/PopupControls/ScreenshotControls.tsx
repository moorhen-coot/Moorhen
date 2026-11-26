
import { useDispatch, useSelector } from "react-redux";
import {  useState } from "react";
import { useMoorhenInstance, usePersistentState } from "@/hooks";
import { RootState, setDrawCrosshairs, setShownControl } from "@/store";
import { MoorhenButton, MoorhenTextInput } from "../../inputs";
import { MoorhenStack } from "../../interface-base";
import "./popup-controls.css";

export const Screenshot = () => {
    const moorhenInstance = useMoorhenInstance();
    const videoRecorderRef = moorhenInstance.getVideoRecorderRef();
    const showCrosshairs = useSelector((state: RootState) => state.sceneSettings.drawCrosshairs);
    const [pictureName, setPictureName] = usePersistentState("screenshot", "pictureName", "moorhen_screenshot", true);
    const [screenShotHovered, setScreenShotHovered] = useState<boolean>(false);
    const [doTransparentBackground, setDoTransparentBackground] = usePersistentState("screenshot", "doTransparentBackground", false, true);
    const dispatch = useDispatch();

    const handleScreenShot = async () => {
        const _pictureName = pictureName !== "" ? pictureName : "moorhen_screenshot";
        // Keep the view behind the picture as a scene snapshot, before the crosshairs are hidden for the capture
        moorhenInstance.userScene.takeSnapshot(_pictureName);
        dispatch(setDrawCrosshairs(false));

        // The hover is not cleared here any more. It used to be - the hovered atom, and the
        // "hover" style buffers - but that left out the renderer's own hover state, which is what
        // lights a ribbon section or a surface, so the highlight came out in the picture anyway
        // whenever a redraw landed between the clear and the capture. takeScreenShot suppresses
        // all of it for the duration of the draw instead, which cannot race and does not throw
        // away what the user was pointing at. See MGWebGL.withoutHover.
        await videoRecorderRef.current?.takeScreenShot(`${_pictureName}.png`, doTransparentBackground);
        dispatch(setShownControl(null));
        dispatch(setDrawCrosshairs(showCrosshairs));
    };

    return (
        <MoorhenStack direction="column" align="normal" gap="0.5rem">
            <div className="moorhen_snackbar_screenshot-buttons">
                <MoorhenButton
                    onClick={handleScreenShot}
                    onMouseEnter={() => setScreenShotHovered(true)}
                    onMouseLeave={() => setScreenShotHovered(false)}
                    type="icon-only"
                    icon={screenShotHovered ? "MatSymShutter" : "MatSymPhotoCam"}
                    tooltip={"Take screenshot"}
                ></MoorhenButton>

                <MoorhenButton
                    type="icon-only"
                    icon={doTransparentBackground ? "MatSymBackgroudDots" : "MatSymBackgroudNoDots"}
                    onClick={() => {
                        setDoTransparentBackground(!doTransparentBackground);
                    }}
                    tooltip={doTransparentBackground ? "Use opaque background" : "Use transparent background"}
                />

                <MoorhenButton onClick={() => dispatch(setShownControl(null))} type="icon-only" icon="MatSymClose" tooltip={"Close"} />
            </div>
            <MoorhenTextInput label="Name: " text={pictureName} setText={setPictureName} style={{ width: "40%" }} />
        </MoorhenStack>
    );
};
