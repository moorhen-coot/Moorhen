import { useSnackbar } from "notistack";
import React, { useCallback } from "react";
import { useMoorhenInstance } from "../../InstanceManager";
import { MoorhenMenuItem } from "../interface-base";

export const RecordVideo = () => {
    const { enqueueSnackbar } = useSnackbar();
    const moorhenInstance = useMoorhenInstance();

    const videoRecorderRef = moorhenInstance.getVideoRecorderRef();
    const handleRecording = () => {
        if (!videoRecorderRef.current) {
            console.warn("Attempted to record screen before webGL is initated...");
            return;
        } else if (videoRecorderRef.current.isRecording()) {
            console.warn("Screen recoder already recording!");
            return;
        } else {
            document.body.click();
            videoRecorderRef.current.startRecording();
            enqueueSnackbar("screen-recoder", {
                variant: "screenRecorder",
                videoRecorderRef: videoRecorderRef,
                persist: true,
            });
        }
    };

    return (
        <MoorhenMenuItem id="recording-menu-item" onClick={handleRecording}>
            Record a video
        </MoorhenMenuItem>
    );
};
