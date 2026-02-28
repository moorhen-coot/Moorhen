import { CameraAlt, CloseOutlined, Photo, PhotoOutlined } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useRef, useState } from "react";
import { useMoorhenInstance, usePersistentState } from "@/hooks";
import { RootState, setDrawCrosshairs, setHoveredAtom, setShownControl } from "@/store";
import { MoorhenTextInput } from "../../inputs";
import { MoorhenStack } from "../../interface-base";
import "./popup-controls.css";

export const Screenshot = () => {
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const moorhenInstance = useMoorhenInstance();
    const videoRecorderRef = moorhenInstance.getVideoRecorderRef();
    const showCrosshairs = useSelector((state: RootState) => state.sceneSettings.drawCrosshairs);
    const [pictureName, setPictureName] = usePersistentState("scrrenshot", "pictureName", "moorhen_screenshot", true);

    const [doTransparentBackground, setDoTransparentBackground] = useState<boolean>(false);

    const doTransparentBackgroundRef = useRef<boolean>(false);

    const dispatch = useDispatch();

    const handleScreenShot = async () => {
        dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
        dispatch(setDrawCrosshairs(false));
        molecules.forEach(molecule => molecule.clearBuffersOfStyle("hover"));
        const _pictureName = pictureName !== "" ? pictureName : "moorhen_screenshot";
        await videoRecorderRef.current?.takeScreenShot(`${_pictureName}.png`, doTransparentBackgroundRef.current);
        dispatch(setShownControl(null));
        dispatch(setDrawCrosshairs(showCrosshairs));
    };

    return (
        <MoorhenStack direction="column" align="normal" gap="0.5rem">
            <div className="moorhen_snackbar_screenshot-buttons">
                <Tooltip title={"Take screenshot"}>
                    <IconButton
                        onClick={handleScreenShot}
                        style={{ borderStyle: "solid", borderWidth: "1px", borderColor: isDark ? "black" : "black" }}
                    >
                        <CameraAlt style={{ color: isDark ? "black" : "black", paddingTop: 0, paddingBottom: 0 }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title={doTransparentBackground ? "Use opaque background" : "Use transparent background"}>
                    <IconButton
                        onClick={() => {
                            doTransparentBackgroundRef.current = !doTransparentBackgroundRef.current;
                            setDoTransparentBackground(prev => !prev);
                        }}
                    >
                        {doTransparentBackground ? <PhotoOutlined /> : <Photo />}
                    </IconButton>
                </Tooltip>
                <Tooltip title={"Close"}>
                    <IconButton onClick={() => dispatch(setShownControl(null))}>
                        <CloseOutlined />
                    </IconButton>
                </Tooltip>
            </div>
            <MoorhenTextInput label="Name: " text={pictureName} setText={setPictureName} style={{ width: "40%" }} />
        </MoorhenStack>
    );
};
