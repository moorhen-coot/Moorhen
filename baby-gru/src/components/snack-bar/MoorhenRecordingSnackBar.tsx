import { RadioButtonCheckedOutlined, StopCircleOutlined } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { SnackbarContent, useSnackbar } from "notistack";
import { Stack } from "react-bootstrap";
import { useSelector } from "react-redux";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenStack } from "../interface-base";

export const MoorhenRecordingSnackBar = forwardRef<
    HTMLDivElement,
    { videoRecorderRef: React.RefObject<moorhen.ScreenRecorder>; id: string }
>((props, ref) => {
    const { closeSnackbar } = useSnackbar();

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

    const [time, setTime] = useState<string>("");

    const startDate = useRef<number | null>(null);

    const increaseTimeCounter = () => {
        setTimeout(() => {
            const currentDuration = (Date.now() - startDate.current) / 1000;
            const date = new Date(null);
            date.setSeconds(currentDuration);
            setTime(date.toISOString().slice(11, 19));
            if (props.videoRecorderRef.current.isRecording()) {
                increaseTimeCounter();
            }
        }, 1000);
    };

    useEffect(() => {
        startDate.current = Date.now();
        increaseTimeCounter();
    }, []);

    return (
        <SnackbarContent
            ref={ref}
            className="moorhen-notification-div"
            style={{ backgroundColor: isDark ? "grey" : "white", color: isDark ? "white" : "grey" }}
        >
            <MoorhenStack gap={2} direction="horizontal" style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                <div style={{ alignItems: "center", display: "flex", justifyContent: "center" }}>
                    <RadioButtonCheckedOutlined
                        style={{ color: "red", borderRadius: "30px", borderWidth: 0, borderStyle: "hidden" }}
                        className="moorhen-recording-icon"
                    />
                    <span>Recording</span>
                </div>
                <span>{time}</span>
                <IconButton
                    style={{ paddingBottom: 0, paddingTop: 0 }}
                    onClick={() => {
                        props.videoRecorderRef.current.stopRecording();
                        closeSnackbar(props.id);
                    }}
                >
                    <StopCircleOutlined />
                </IconButton>
            </MoorhenStack>
        </SnackbarContent>
    );
});

MoorhenRecordingSnackBar.displayName = "MoorhenRecordingSnackBar";
