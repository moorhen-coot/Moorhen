import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SnackbarContent, useSnackbar } from "notistack";
import { Stack } from "react-bootstrap";
import { IconButton, LinearProgress, Slider } from "@mui/material";
import { KeyboardArrowLeftOutlined, KeyboardArrowRightOutlined, KeyboardDoubleArrowLeftOutlined, KeyboardDoubleArrowRightOutlined } from "@mui/icons-material";
import { webGL } from "../../types/mgWebGL";
import { moorhen } from "../../types/moorhen";
import { setIsShowingTomograms } from "../../store/generalStatesSlice";
import { setOrigin, setZoom, setTexturedShapes } from "../../store/glRefSlice"
import { appendOtherData } from '../../WebGLgComponents/buildBuffers'

export const MoorhenTomogramSnackBar = forwardRef<
    HTMLDivElement,
    {
        commandCentre: React.RefObject<moorhen.CommandCentre>;
        mapMolNo: number
    }
>((props, ref) => {

    const dispatch = useDispatch()
    
    const maps = useSelector((state: moorhen.State) => state.maps)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const frameDataRef = useRef(null)
    const framesRef = useRef([])
    const iFrameRef = useRef<number>(0)

    const [progressBufferedFrames, setProgressBufferedFrames] = useState<{value: number; label: string}[]>([])
    const [busyComputingFrames, setBusyComputingFrames] = useState<boolean>(false)
    const [nFrames, setNFrames] = useState<number>(0)
    const [progress, setProgress] = useState<number>(0)
    const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0)

    const { enqueueSnackbar, closeSnackbar } = useSnackbar()

    const texturedShapes = useSelector((state: moorhen.State) => state.glRef.texturedShapes)

    useEffect(() => {
        const loadNFrames = async () => {
            dispatch(setIsShowingTomograms(true))
            setBusyComputingFrames(true)

            const nFrames = await props.commandCentre.current.cootCommand({
                returnType: "number",
                command: 'get_number_of_map_sections',
                commandArgs: [props.mapMolNo, 2],
            }, false) as moorhen.WorkerResponse<number>

            const selectedMap = maps.find(map => map.molNo === props.mapMolNo)
            if (!selectedMap || !selectedMap.mapRmsd || !selectedMap.mapMean) {
                enqueueSnackbar("Unable to load tomogram frames", { variant: "warning" })
                return
            }

            const topValue = selectedMap.mapMean + 2.5 * selectedMap.mapRmsd
            const bottomValue = selectedMap.mapMean - 1.5 * selectedMap.mapRmsd

            framesRef.current = Array(nFrames.data.result.result)
            setNFrames(nFrames.data.result.result)

            const initNFrames = nFrames.data.result.result < 50 ? nFrames.data.result.result : 50
            const stepPercent = initNFrames / 50
            const singleStepPercent = 1 / stepPercent
            for (let i = 0; i < nFrames.data.result.result; i++) {
                if (!framesRef.current[i]) {
                    const frame = await props.commandCentre.current.cootCommand({
                        returnType: "texture_as_floats_t",
                        command: "get_map_section_texture",
                        commandArgs: [props.mapMolNo, i, 2, bottomValue, topValue],
                    }, false) as moorhen.WorkerResponse<any>
                    framesRef.current[i] = frame.data.result.result
                }
                
                if (i < initNFrames) {
                    setProgress((prev) => prev + singleStepPercent)
                } else if (i === initNFrames) {
                    const percentage = initNFrames / (nFrames.data.result.result / 100)
                    setProgressBufferedFrames([{
                        value: percentage,
                        label: `${percentage.toFixed(0)}%`
                    }])        
                    setBusyComputingFrames(false)
                } else {
                    const percentage = i / (nFrames.data.result.result / 100)
                    setProgressBufferedFrames([{
                        value: percentage,
                        label: `${percentage.toFixed(0)}%`
                    }])
                }
            }
            setProgressBufferedFrames([])
        }
        loadNFrames()
    }, [])

    const showFrame = useCallback(async () => {
        let frameData: any
        if (frameDataRef.current) {
            const newShapes = texturedShapes.splice(0,texturedShapes.length-1)
            dispatch(setTexturedShapes(newShapes))
        }
        if (framesRef.current[iFrameRef.current]) {
            frameData = framesRef.current[iFrameRef.current]
        } else {
            const frame = await props.commandCentre.current.cootCommand({
                returnType: "texture_as_floats_t",
                command: "get_map_section_texture",
                commandArgs: [props.mapMolNo, iFrameRef.current, 0],
            }, false) as moorhen.WorkerResponse<any>
            frameData = frame.data.result.result
            framesRef.current[iFrameRef.current] = frameData
        }
        
        frameDataRef.current = frameData
        const obj = appendOtherData(frameData, true)
        const shape = obj[0].texturedShapes
        
        dispatch(setOrigin(shape.getOrigin()))
        dispatch(setZoom(300))
    }, [props.mapMolNo])

    return <SnackbarContent ref={ref} className="moorhen-notification-div" style={{ backgroundColor: isDark ? 'grey' : 'white', color: isDark ? 'white' : 'grey' }}>
        {busyComputingFrames ?
            <Stack gap={1} direction='vertical'>
            <span>Please wait...</span>
            <LinearProgress variant="determinate" value={progress}/>
        </Stack>
        : nFrames > 0 ?
        <Stack gap={1} direction='vertical'>
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <IconButton onClick={() => {
                    iFrameRef.current -= 10
                    setCurrentFrameIndex((prev) => prev - 10 * (1 / (nFrames / 100)))
                    showFrame()
            }}>
                <KeyboardDoubleArrowLeftOutlined/>
            </IconButton>
            <IconButton onClick={() => {
                    iFrameRef.current -= 1
                    setCurrentFrameIndex((prev) => prev - (1 / (nFrames / 100)))
                    showFrame()
            }}>
                <KeyboardArrowLeftOutlined/>
            </IconButton>
            {iFrameRef.current} / {nFrames}
            <IconButton onClick={() => {
                    iFrameRef.current += 1
                    setCurrentFrameIndex((prev) => prev + (1 / (nFrames / 100)))
                    showFrame()
            }}>
                <KeyboardArrowRightOutlined/>
            </IconButton>
            <IconButton onClick={() => {
                    iFrameRef.current += 10
                    setCurrentFrameIndex((prev) => prev + 10 * (1 / (nFrames / 100)))
                    showFrame()
            }}>
                <KeyboardDoubleArrowRightOutlined/>
            </IconButton>
            </div>
            <Slider
                size="small"
                track={false}
                marks={progressBufferedFrames}
                defaultValue={0}
                value={currentFrameIndex}
                onChange={(evt, newVal) => {
                    iFrameRef.current = Math.floor((newVal as number) * nFrames / 100)
                    if (iFrameRef.current < nFrames) {
                        setCurrentFrameIndex(newVal as number)
                        showFrame()
                    }
                }}
            />
        </Stack>
        :
        <span>Something went wrong...</span>
        }
    </SnackbarContent>
})

MoorhenTomogramSnackBar.displayName = "MoorhenTomogramSnackBar";