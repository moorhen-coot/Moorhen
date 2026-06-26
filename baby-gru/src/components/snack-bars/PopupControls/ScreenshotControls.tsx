import { CameraAlt, CloseOutlined, Photo, PhotoOutlined } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useRef, useState } from "react";
import { useMoorhenInstance, usePersistentState } from "@/hooks";
import { RootState, setDrawCrosshairs, setHoveredAtom, setShownControl } from "@/store";
import { MoorhenButton, MoorhenTextInput } from "../../inputs";
import { MoorhenStack } from "../../interface-base";
import "./popup-controls.css";

export const Screenshot = () => {
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const moorhenInstance = useMoorhenInstance();
    const videoRecorderRef = moorhenInstance.getVideoRecorderRef();
    const showCrosshairs = useSelector((state: RootState) => state.sceneSettings.drawCrosshairs);
    const [pictureName, setPictureName] = usePersistentState("screenshot", "pictureName", "moorhen_screenshot", true);
    const [screenShotHovered, setScreenShotHovered] = useState<boolean>(false);
    const [doTransparentBackground, setDoTransparentBackground] = usePersistentState("screenshot", "doTransparentBackground", false, true);
    const dispatch = useDispatch();

    const handleScreenShot = async () => {
        dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
        dispatch(setDrawCrosshairs(false));
        molecules.forEach(molecule => molecule.clearBuffersOfStyle("hover"));
        const _pictureName = pictureName !== "" ? pictureName : "moorhen_screenshot";

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
