import { PauseCircleOutlined, PlayCircleOutlined, StopCircleOutlined } from "@mui/icons-material";
import { IconButton, LinearProgress } from "@mui/material";
import { SnackbarContent, useSnackbar } from "notistack";
import { Stack } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useTimeCapsule } from "../../InstanceManager";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { moorhen } from "../../types/moorhen";
import { sleep } from "../../utils/utils";
import { MoorhenStack } from "../interface-base";

export const MoorhenResidueStepsSnackBar = forwardRef<
    HTMLDivElement,
    {
        id: string;
        residueList: { cid: string }[];
        onStep: (stepInput: any) => Promise<void>;
        onStart?: () => Promise<void> | void;
        onStop?: () => void;
        onPause?: () => void;
        onResume?: () => void;
        disableTimeCapsule?: boolean;
        sleepTime?: number;
    }
>((props, ref) => {
    const timeCapsuleRef = useTimeCapsule();

    const defaultProps = {
        disableTimeCapsule: true,
        sleepTime: 600,
    };

    const { sleepTime, disableTimeCapsule } = { ...defaultProps, ...props };

    const dispatch = useDispatch();

    const timeCapsuleIsEnabled = useSelector((state: moorhen.State) => state.backupSettings.enableTimeCapsule);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [buffer, setBuffer] = useState<number>(1);
    const [cid, setCid] = useState<string | null>("Refining...");

    const isClosedRef = useRef<boolean>(false);
    const isRunningRef = useRef<boolean>(false);

    const { closeSnackbar } = useSnackbar();

    const exit = useCallback(async () => {
        props.onStop?.();
        if (disableTimeCapsule) timeCapsuleRef.current.disableBackups = !timeCapsuleIsEnabled;
        await timeCapsuleRef.current.addModification();
        closeSnackbar(props.id);
    }, [timeCapsuleIsEnabled]);

    const init = async () => {
        await props.onStart?.();
        dispatch(setHoveredAtom({ molecule: null, cid: null }));
        if (disableTimeCapsule) timeCapsuleRef.current.disableBackups = true;
    };

    const steppedRefine = async () => {
        await init();
        const nSteps = props.residueList.length;
        const stepPercent = nSteps / 100;
        const singleStepPercent = 1 / stepPercent;
        for (const residue of props.residueList) {
            setBuffer(prev => prev + singleStepPercent);
            if (isClosedRef.current) {
                await exit();
                return;
            }
            while (!isRunningRef.current) {
                if (isClosedRef.current) {
                    exit();
                    return;
                } else {
                    await sleep(500);
                }
            }
            setCid(residue.cid);
            await props.onStep(residue.cid);
            setProgress(prev => prev + singleStepPercent);
            await sleep(sleepTime);
        }
        await exit();
    };

    useEffect(() => {
        if (!isRunningRef.current) {
            setIsRunning(true);
            isRunningRef.current = true;
            steppedRefine();
        }
    }, []);

    return (
        <SnackbarContent
            ref={ref}
            className="moorhen-notification-div"
            style={{ backgroundColor: isDark ? "grey" : "white", color: isDark ? "white" : "grey" }}
        >
            <MoorhenStack gap={2} direction="horizontal" style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                <MoorhenStack gap={2} direction="vertical" style={{ width: "100%" }}>
                    <span>{cid}</span>
                    <LinearProgress
                        variant={isRunning ? "buffer" : "determinate"}
                        value={progress}
                        valueBuffer={buffer}
                        style={{ width: "100%", display: "flex", justifyContent: "start" }}
                    />
                </MoorhenStack>
                <div style={{ display: "flex", justifyContent: "end" }}>
                    <IconButton
                        style={{ padding: "0.1rem" }}
                        onClick={() => {
                            if (isRunningRef.current) {
                                props.onPause?.();
                            } else {
                                props.onResume?.();
                            }
                            isRunningRef.current = !isRunningRef.current;
                            setIsRunning(isRunningRef.current);
                        }}
                    >
                        {isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    </IconButton>
                    <IconButton
                        style={{ padding: "0.1rem" }}
                        onClick={() => {
                            isClosedRef.current = true;
                        }}
                    >
                        <StopCircleOutlined />
                    </IconButton>
                </div>
            </MoorhenStack>
        </SnackbarContent>
    );
});

MoorhenResidueStepsSnackBar.displayName = "MoorhenResidueStepsSnackBar";
