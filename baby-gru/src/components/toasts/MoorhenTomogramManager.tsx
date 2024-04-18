import { ArrowBackIos, ArrowForwardIos, KeyboardArrowLeftOutlined, KeyboardArrowRightOutlined, KeyboardDoubleArrowDownOutlined, KeyboardDoubleArrowLeftOutlined, KeyboardDoubleArrowRightOutlined } from "@mui/icons-material"
import { IconButton, LinearProgress, Slider } from "@mui/material"
import { useCallback, useEffect, useRef, useState } from "react"
import { Stack } from "react-bootstrap"
import { MoorhenNotification } from "../misc/MoorhenNotification"
import { moorhen } from '../../types/moorhen'
import { setIsShowingTomograms } from "../../store/generalStatesSlice"
import { useDispatch, useSelector } from "react-redux"
import { webGL } from "../../types/mgWebGL"

const greyScaleColourRamp = [
    [0.0, 0.0, 1.0, 1.0],
    [1.0, 0.0, 0.0, 1.0],
    [0.0, 1.0, 0.0, 1.0],
    [1.0, 1.0, 0.0, 1.0],
    [1.0, 1.0, 1.0, 1.0]
]

export const MoorhenTomogramManager = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const dispatch = useDispatch()
    
    const mapMolNo = useSelector((state: moorhen.State) => state.activePopUps.tomogramPopUp.mapMolNo)

    const framesRef = useRef<null | moorhen.DisplayObject[][]>([])
    const iFrameRef = useRef<number>(0)

    const [busyComputingFrames, setBusyComputingFrames] = useState<boolean>(false)
    const [nFrames, setNFrames] = useState<number>(0)
    const [progress, setProgress] = useState<number>(0)
    const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0)


    useEffect(() => {
        const loadNFrames = async () => {
            dispatch(setIsShowingTomograms(true))
            setBusyComputingFrames(true)

            const nFrames = await props.commandCentre.current.cootCommand({
                returnType: "number",
                command: 'get_number_of_map_sections',
                commandArgs: [mapMolNo, 0],
            }, false) as moorhen.WorkerResponse<number>
            
            framesRef.current = Array(nFrames.data.result.result)
            setNFrames(nFrames.data.result.result)           
            setBusyComputingFrames(false)
        }
        loadNFrames()
    }, [])

    const showFrame = useCallback(async () => {
        let frameData: any
        if (framesRef.current[iFrameRef.current]) {
            console.log('CACHED!!!!')
            frameData = framesRef.current[iFrameRef.current]
        } else {
            console.log('NOT CACHED!!!!')
            const frame = await props.commandCentre.current.cootCommand({
                returnType: "texture_as_floats_t",
                command: "get_map_section_texture",
                commandArgs: [mapMolNo, iFrameRef.current, 0],
            }, false) as moorhen.WorkerResponse<any>
            frameData = frame.data.result.result
            framesRef.current[iFrameRef.current] = frameData
        }
        
        const obj = props.glRef.current.appendOtherData(frameData, true)
        const shape = obj[0].texturedShapes
        shape.setColourRamp(greyScaleColourRamp, true)
        
        props.glRef.current.setOrigin(shape.getOrigin())
        props.glRef.current.setZoom(300, true)
    }, [mapMolNo])

    return <MoorhenNotification width={18} placeOnTop={false}>
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
    </MoorhenNotification>
}