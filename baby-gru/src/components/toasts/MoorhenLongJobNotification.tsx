import { useCallback, useEffect, useState } from "react"
import { LinearProgress } from "@mui/material"
import { MoorhenNotification } from "../misc/MoorhenNotification"
import { Stack } from "react-bootstrap"
import { moorhen } from "../../types/moorhen"
import { useSelector } from "react-redux"
import { sleep } from "../../utils/MoorhenUtils"

export const MoorhenLongJobNotification = (props: { commandCentre: React.RefObject<moorhen.CommandCentre> }) => {
    
    const [busy, setBusy] = useState<boolean>(false)

    const newCommandStart = useSelector((state: moorhen.State) => state.generalStates.newCootCommandStart)
    const newCommandExit = useSelector((state: moorhen.State) => state.generalStates.newCootCommandExit)
    const isAnimatingTrajectory = useSelector((state: moorhen.State) => state.generalStates.isAnimatingTrajectory)
    const isShowingTomograms = useSelector((state: moorhen.State) => state.generalStates.isShowingTomograms)

    const checkJobInQueueTooLong = useCallback((messages: string[]) => {
        if (
            messages.length > 0
            && props.commandCentre.current.activeMessages.length > 0 
            && props.commandCentre.current.activeMessages.some(item => messages.includes(item?.messageId))
        ) {
            setBusy(true)
        }
    }, [])

    const checkWorkerBusy = useCallback(async () => {
        for (let i = 0; i < 30; i++) {
            await sleep(100)
            if (props.commandCentre.current?.activeMessages.length === 0) {
                break
            }
            if (i === 29) {
                setBusy(true)
            }
        }
    }, [])

    const debouncedClearBusy = useCallback(() => {
        if (props.commandCentre.current?.activeMessages.length === 0) {
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        const messages = props.commandCentre.current?.activeMessages.map(item => item?.messageId)
        if (props.commandCentre.current?.activeMessages.length > 0) {
            // Check if any of the jobs in the list spends more than 3 seconds in the queue
            const timeoutId = setTimeout(() => {
                checkJobInQueueTooLong(messages)
            }, 3000)
            // Check if the worker has at least one job running for the last 3 seconds
            checkWorkerBusy()
            // Clear timeout
            return () => {
                clearTimeout(timeoutId)
            }
        } 
    }, [newCommandStart, checkWorkerBusy, checkJobInQueueTooLong])

    useEffect(() => {
        if (props.commandCentre.current?.activeMessages.length === 0) {
            // If in 500 ms the queue is still empty then the worker is not busy anymore
            const timeoutId = setTimeout(debouncedClearBusy, 500)
            return () => {
                clearTimeout(timeoutId)
            }
        }
    }, [newCommandExit])

    return  busy && !isAnimatingTrajectory && !isShowingTomograms && <MoorhenNotification placeOnTop={false} width={25}>
                <Stack gap={1} direction='vertical'>
                    <span>Please wait...</span>
                    <LinearProgress/>
                </Stack>
            </MoorhenNotification>
}