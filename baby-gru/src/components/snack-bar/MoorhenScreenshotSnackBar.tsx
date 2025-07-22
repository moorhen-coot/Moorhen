import { SnackbarContent, useSnackbar } from "notistack"
import { forwardRef, useCallback, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { IconButton, Tooltip } from "@mui/material"
import { CameraAlt, CloseOutlined, Photo, PhotoOutlined } from "@mui/icons-material"
import { moorhen } from "../../types/moorhen"
import { setHoveredAtom } from "../../store/hoveringStatesSlice"
import { webGL } from "../../types/mgWebGL"

export const MoorhenScreenshotSnackBar = forwardRef<
    HTMLDivElement,
    { 
        id: string;
        videoRecorderRef: React.RefObject<moorhen.ScreenRecorder>;
        glRef: React.RefObject<webGL.MGWebGL>;
    }
>((props, ref) => {
    
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const [doTransparentBackground, setDoTransparentBackground] = useState<boolean>(false)

    const doTransparentBackgroundRef = useRef<boolean>(false)

    const dispatch = useDispatch()

    const { closeSnackbar } = useSnackbar()

    const handleScreenShot = useCallback(() => {
        dispatch(setHoveredAtom({ molecule: null, cid: null }))
        molecules.forEach(molecule => molecule.clearBuffersOfStyle('hover'))
        props.videoRecorderRef.current?.takeScreenShot("moorhen.png", doTransparentBackgroundRef.current)
        closeSnackbar(props.id)
    }, [molecules, props.id])

    return <SnackbarContent ref={ref} className="moorhen-notification-div" style={{ justifyContent: 'space-between', backgroundColor: isDark ? 'grey' : 'white', color: isDark ? 'white' : 'grey' }}>
            <Tooltip title={'Take screenshot'}>
                <IconButton onClick={handleScreenShot} style={{ borderStyle: 'solid', borderWidth: '1px', borderColor: isDark ? 'black' : 'black' }}>
                    <CameraAlt style={{ color: isDark ? 'black' : 'black', paddingTop: 0, paddingBottom: 0}}/>
                </IconButton>
            </Tooltip>
            <Tooltip title={doTransparentBackground ? 'Use opaque background' : 'Use transparent background'}>
                <IconButton onClick={() => {
                    doTransparentBackgroundRef.current = !doTransparentBackgroundRef.current
                    setDoTransparentBackground((prev) => !prev)
                }}>
                    {doTransparentBackground ? 
                    <PhotoOutlined/>
                    :
                    <Photo/>
                }
                </IconButton>
            </Tooltip>
            <Tooltip title={'Do transparent background'}>
                <IconButton onClick={() => closeSnackbar(props.id)}>
                    <CloseOutlined/>
                </IconButton>
            </Tooltip>
    </SnackbarContent>
})