import { MoorhenLinearProgress } from "../icons";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCommandCentre } from "@/InstanceManager/hooks";
import { RootState } from "@/store/MoorhenReduxStore";
import { sleep } from "@/utils/utils";
import { MoorhenStack } from "../interface-base";
import "./long-job.css";

export const LongJobSnackNotification = () => {
    const glWidth = useSelector((state: RootState) => state.sceneSettings.GlViewportWidth);
    const glHeight = useSelector((state: RootState) => state.sceneSettings.GlViewportHeight);
    const newCommandStart = useSelector((state: RootState) => state.generalStates.newCootCommandStart);
    const newCommandExit = useSelector((state: RootState) => state.generalStates.newCootCommandExit);

    const isAnimatingTrajectory = useSelector((state: RootState) => state.generalStates.isAnimatingTrajectory);
    const isShowingTomograms = useSelector((state: RootState) => state.generalStates.isShowingTomograms);
    const jobProgress = useSelector((state: RootState) => state.generalStates.jobProgress);
    const commandCentreRef = useCommandCentre();
    const [isLongJob, setIsLongJob] = useState(false);

    const checkJobInQueueTooLong = useCallback(
        (messages: string[]) => {
            if (
                messages.length > 0 &&
                commandCentreRef.current.activeMessages.length > 0 &&
                commandCentreRef.current.activeMessages.some(item => messages.includes(item?.messageId)) &&
                !isLongJob &&
                !isAnimatingTrajectory &&
                !isShowingTomograms &&
                !jobProgress
            ) {
                setIsLongJob(true);
            }
        },
        [isLongJob, jobProgress]
    );

    const checkWorkerBusy = useCallback(async () => {
        for (let i = 0; i < 30; i++) {
            await sleep(100);
            if (commandCentreRef.current?.activeMessages.length === 0) {
                break;
            }
            if (i === 29 && !isLongJob && !isAnimatingTrajectory && !isShowingTomograms && !jobProgress) {
                setIsLongJob(true);
            }
        }
        // A task reporting its progress shows that instead (and its commands do not start this one)
    }, [isAnimatingTrajectory, isShowingTomograms, jobProgress]);

    const debouncedClearBusy = useCallback(() => {
        if (commandCentreRef.current?.activeMessages.length === 0 && isLongJob) {
            setIsLongJob(false);
        }
    }, [isLongJob]);

    useEffect(() => {
        const messages = commandCentreRef.current?.activeMessages.map(item => item?.messageId);
        if (commandCentreRef.current?.activeMessages.length > 0) {
            // Check if any of the jobs in the list spends more than 3 seconds in the queue
            const timeoutId = setTimeout(() => {
                checkJobInQueueTooLong(messages);
            }, 3000);
            // Check if the worker has at least one job running for the last 3 seconds
            checkWorkerBusy();
            // Clear timeout
            return () => {
                clearTimeout(timeoutId);
            };
        }
    }, [newCommandStart, checkWorkerBusy, checkJobInQueueTooLong]);

    useEffect(() => {
        if (commandCentreRef.current?.activeMessages.length === 0) {
            // If in 500 ms the queue is still empty then the worker is not busy anymore
            const timeoutId = setTimeout(debouncedClearBusy, 500);
            return () => {
                clearTimeout(timeoutId);
            };
        }
    }, [newCommandExit]);

    // A task that reports its progress is shown at once, with how far it has got
    if (jobProgress) {
        const percent = jobProgress.total > 0 ? (100 * jobProgress.done) / jobProgress.total : 0;
        return (
            <div className="moorhen__long-job-notification" style={{ left: glWidth / 2, top: glHeight }}>
                <MoorhenStack direction="vertical">
                    <span>{jobProgress.label}</span>
                    <span>
                        {jobProgress.done} / {jobProgress.total}
                    </span>
                    <MoorhenLinearProgress value={percent} />
                </MoorhenStack>
            </div>
        );
    }

    return (
        isLongJob && (
            <div className="moorhen__long-job-notification" style={{ left: glWidth / 2, top: glHeight }}>
                <MoorhenStack direction="vertical">
                    <span>Please wait...</span>
                    <MoorhenLinearProgress />
                </MoorhenStack>
            </div>
        )
    );
};
