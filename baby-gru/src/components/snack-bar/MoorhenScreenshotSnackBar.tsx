import { CameraAlt, CloseOutlined, Photo, PhotoOutlined } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { SnackbarContent, useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { forwardRef, useCallback, useRef, useState } from "react";
import { useMoorhenInstance } from "../../InstanceManager";
import { setDrawCrosshairs } from "../../moorhen";
import { RootState } from "../../store/MoorhenReduxStore";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenStack } from "../interface-base";

export const MoorhenScreenshotSnackBar = forwardRef<
    HTMLDivElement,
    {
        id: string;
        videoRecorderRef?: React.RefObject<moorhen.ScreenRecorder>;
    }
>((props, ref) => {
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const moorhenInstance = useMoorhenInstance();
    const videoRecorderRef = moorhenInstance.getVideoRecorderRef();
    const showCrosshairs = useSelector((state: RootState) => state.sceneSettings.drawCrosshairs);
    const pictureNameRef = useRef(null);

    const [doTransparentBackground, setDoTransparentBackground] = useState<boolean>(false);

    const doTransparentBackgroundRef = useRef<boolean>(false);

    const dispatch = useDispatch();

    const { closeSnackbar } = useSnackbar();

    const handleScreenShot = async () => {
        dispatch(setHoveredAtom({ molecule: null, cid: null }));
        dispatch(setDrawCrosshairs(false));
        molecules.forEach(molecule => molecule.clearBuffersOfStyle("hover"));
        await videoRecorderRef.current?.takeScreenShot(`${pictureNameRef.current.value}.png`, doTransparentBackgroundRef.current);
        closeSnackbar(props.id);
        dispatch(setDrawCrosshairs(showCrosshairs));
    };

    return (
        <SnackbarContent
            ref={ref}
            className="moorhen-notification-div"
            style={{ justifyContent: "space-between", backgroundColor: isDark ? "grey" : "white", color: isDark ? "white" : "grey" }}
        >
            <MoorhenStack direction="column">
                <MoorhenStack direction="line">
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
                    <Tooltip title={"Do transparent background"}>
                        <IconButton onClick={() => closeSnackbar(props.id)}>
                            <CloseOutlined />
                        </IconButton>
                    </Tooltip>
                </MoorhenStack>
                <input type="text" ref={pictureNameRef} defaultValue={"moorhen"}></input>
            </MoorhenStack>
        </SnackbarContent>
    );
});

MoorhenScreenshotSnackBar.displayName = "MoorhenScreenshotSnackBar";
