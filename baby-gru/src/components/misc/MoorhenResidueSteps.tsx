import { useCallback, useEffect, useRef, useState } from "react";
import { Stack } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { useDispatch } from 'react-redux';
import { MoorhenNotification } from "./MoorhenNotification";
import { IconButton, LinearProgress } from "@mui/material";
import { PauseCircleOutlined, PlayCircleOutlined, StopCircleOutlined } from "@mui/icons-material";
import { setNotificationContent } from '../../store/generalStatesSlice';
import { setHoveredAtom } from '../../store/hoveringStatesSlice';
import { sleep } from "../../utils/MoorhenUtils";

export const MoorhenResidueSteps = (props: { 
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>
    residueList: { cid: string }[];
    onStep: (stepInput: any) => Promise<void>;
    onStart?: () => Promise<void>;
    onStop?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onProgress?: (progress: number) => void;
    disableTimeCapsule?: boolean
    sleepTime?: number;
 }) => {
    const dispatch = useDispatch()
    
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [progress, setProgress] = useState<number>(0)
    const [buffer, setBuffer] = useState<number>(1)
    const [cid, setCid] = useState<string | null>('Refining...')
    
    const isClosedRef = useRef<boolean>(false)
    const isRunningRef = useRef<boolean>(false)

    const exit = async () => {
        props.onStop()
        if (props.disableTimeCapsule) props.timeCapsuleRef.current.toggleSkipTracking()
        await props.timeCapsuleRef.current.addModification()
        dispatch( setNotificationContent(null) )
    }

    const init = async () => {
        await props.onStart()
        dispatch( setHoveredAtom({molecule: null, cid: null}) )
        if (props.disableTimeCapsule) props.timeCapsuleRef.current.toggleSkipTracking()
    }

    const steppedRefine = async () => {
        await init()
        const nSteps = props.residueList.length
        const stepPercent = nSteps / 100
        const singleStepPercent = 1 / stepPercent
        for (let residue of props.residueList) {
            setBuffer((prev) => prev + singleStepPercent)
            if (isClosedRef.current) {
                    await exit()
                    return
            }
            while (!isRunningRef.current) {
                    if (isClosedRef.current) {
                        exit()
                        return
                    } else {
                        await sleep(500)    
                    }    
            }
            setCid(residue.cid)
            await props.onStep(residue.cid)
            setProgress((prev) => prev + singleStepPercent)
            await sleep(props.sleepTime)
        }
        await exit()
    }

    useEffect(() => {
        if(!isRunningRef.current) {
            setIsRunning(true)
            isRunningRef.current = true
            steppedRefine()
        }
    }, [])

    return <MoorhenNotification key={'stepped-refinement-controller'} width={15}>
                <Stack gap={2} direction='horizontal' style={{width: '100%', display:'flex', justifyContent: 'space-between'}}>
                    <Stack gap={2} direction='vertical' style={{width: '100%'}}>
                        <span>{cid}</span>
                        <LinearProgress variant={isRunning ? 'buffer' : 'determinate'} value={progress} valueBuffer={buffer} style={{width: '100%', display: 'flex', justifyContent: 'start'}}/>
                    </Stack>
                    <div style={{display: 'flex', justifyContent: 'end'}}>
                        <IconButton style={{padding: '0.1rem'}} onClick={() => {
                            if (isRunningRef.current) {
                                props.onPause()
                            } else {
                                props.onResume()
                            }
                            isRunningRef.current = !isRunningRef.current
                            setIsRunning(isRunningRef.current)
                        }}>
                            {isRunning ? <PauseCircleOutlined/> : <PlayCircleOutlined/>}
                        </IconButton>
                        <IconButton style={{padding: '0.1rem'}} onClick={() => {
                            isClosedRef.current = true
                        }}>
                            <StopCircleOutlined/>
                        </IconButton>
                    </div>
                </Stack>
    </MoorhenNotification>   
}

MoorhenResidueSteps.defaultProps = {
    disableTimeCapsule: true, sleepTime: 600, onStart: () => {}, onStop: () => {}, 
    onPause: () => {}, onResume: () => {}, onProgress: () => {}
}