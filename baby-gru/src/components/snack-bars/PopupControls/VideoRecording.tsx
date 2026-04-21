import { useDispatch } from "react-redux";
import { useRef, useState } from "react";
import { useMoorhenInstance } from "@/InstanceManager";
import { MoorhenButton, MoorhenTextInput } from "@/components/inputs";
import { MoorhenStack } from "@/components/interface-base";
import { setShownControl } from "@/store";
import "./VideoRecording.css";

export const VideoRecording = () => {
    const [time, setTime] = useState<string>("0:00:00");
    const [name, setName] = useState<string>("moorhen_video");

    const startDate = useRef<number | null>(null);
    const videoRecorderRef = useMoorhenInstance().getVideoRecorderRef();
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
            <MoorhenTextInput
                label="Name:"
                text={name}
                setText={name => {
                    setName(name);
                    videoRecorderRef.current.setVideoName(name);
                }}
            />
        </MoorhenStack>
    );
};
