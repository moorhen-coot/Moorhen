import { useDispatch } from "react-redux";
import { useRef, useState } from "react";
import { useMoorhenInstance } from "@/InstanceManager";
import { MoorhenButton, MoorhenSelect, MoorhenTextInput } from "@/components/inputs";
import { MoorhenStack } from "@/components/interface-base";
import { setShownControl } from "@/store";
import type { VideoQuality } from "@/utils/MoorhenScreenRecorder";
import "./VideoRecording.css";

export const VideoRecording = () => {
    const [time, setTime] = useState<string>("0:00:00");

    const startDate = useRef<number | null>(null);
    const moorhenInstance = useMoorhenInstance();
    const videoRecorderRef = moorhenInstance.getVideoRecorderRef();

    // Seeded from the recorder rather than repeated here. The two used to disagree - the box said
    // "moorhen_video" while the recorder's own default was "moorhen", and setVideoName only ran if
    // the user edited the field - so a recording nobody renamed arrived under a different name
    // from the one on screen.
    const [name, setName] = useState<string>(() => moorhenInstance.getVideoRecorder()?.getVideoName() ?? "moorhen_video");
    const [quality, setQuality] = useState<VideoQuality>(() => moorhenInstance.getVideoRecorder()?.getVideoQuality() ?? "medium");
    const dispatch = useDispatch();
    const [isRecording, setIsRecording] = useState<boolean>(false);

    const increaseTimeCounter = () => {
        setTimeout(() => {
            const currentDuration = (Date.now() - startDate.current) / 1000;
            const date = new Date(null);
            date.setSeconds(currentDuration);
            setTime(date.toISOString().slice(12, 19));
            if (videoRecorderRef.current.isRecording()) {
                increaseTimeCounter();
            }
        }, 1000);
    };

    const handleRecording = () => {
        if (videoRecorderRef.current.isRecording()) {
            videoRecorderRef.current.stopRecording();
            setIsRecording(false);
            return;
        }
        if (!videoRecorderRef.current) {
            console.warn("Attempted to record screen before webGL is initated...");
            return;
        } else if (videoRecorderRef.current.isRecording()) {
            console.warn("Screen recoder already recording!");
            return;
        } else {
            videoRecorderRef.current.startRecording();
            startDate.current = Date.now();
            increaseTimeCounter();
            setIsRecording(true);
        }
    };

    return (
        <MoorhenStack align="center" gap={"0.2rem"}>
            <MoorhenStack direction="row" align="center" gap={"0.5rem"}>
                <MoorhenButton
                    type="icon-only"
                    icon="MatSymAlbum"
                    className={isRecording ? "pulse-icon" : ""}
                    style={isRecording ? { color: "red" } : {}}
                    onClick={handleRecording}
                    tooltip={isRecording ? "Stop Recording" : "Start Recording"}
                />
                <span>{time}</span>

                <MoorhenButton
                    type="icon-only"
                    icon="MatSymClose"
                    style={{ paddingBottom: 0, paddingTop: 0 }}
                    onClick={() => {
                        if (videoRecorderRef.current.isRecording()) {
                            videoRecorderRef.current.stopRecording();
                        }
                        dispatch(setShownControl(null));
                    }}
                    tooltip="Close"
                />
            </MoorhenStack>
            {!isRecording && <>
            <MoorhenTextInput
                label="Name:"
                text={name}
                setText={name => {
                    setName(name);
                    videoRecorderRef.current.setVideoName(name);
                }}
            />
            <MoorhenSelect
                label="Quality:"
                value={quality}
                disabled={isRecording}
                setValue={value => {
                    setQuality(value as VideoQuality);
                    videoRecorderRef.current.setVideoQuality(value as VideoQuality);
                }}
            >
                <option value="low">Low (smaller file)</option>
                <option value="medium">Medium</option>
                <option value="high">High (larger file)</option>
            </MoorhenSelect></>}
        </MoorhenStack>
    );
};
