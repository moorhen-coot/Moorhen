import React from "react";
import { moorhen } from "../types/moorhen";


/**
 * MoorhenGlobalInstance is a singleton class that manages global instances
 * of CommandCentre, TimeCapsule, and ScreenRecorder.
 * It provides methods to set and get these instances, as well as cleanup functionality.
 * 
 */

class MoorhenGlobalInstance {

    private commandCentre: moorhen.CommandCentre;
    private commandCentreRef: React.RefObject<moorhen.CommandCentre>;
    private timeCapsule: moorhen.TimeCapsule;
    private timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    private videoRecorder: moorhen.ScreenRecorder
    private videoRecorderRef: React.RefObject<moorhen.ScreenRecorder>;
    private aceDRGInstance: moorhen.AceDRGInstance | null = null;
    
    public paths: {
        urlPrefix: string;
        monomerLibrary: string;
    } = {
        urlPrefix: "",
        monomerLibrary: ""
    };

    public setCommandCentre(commandCentre: moorhen.CommandCentre): void {
        this.commandCentre = commandCentre;
        this.commandCentreRef = React.createRef<moorhen.CommandCentre>();
        this.commandCentreRef.current = commandCentre;
    }

    public getCommandCentre(): moorhen.CommandCentre {
        return this.commandCentre;
    }

    public getCommandCentreRef(): React.RefObject<moorhen.CommandCentre> {
        return this.commandCentreRef;
    }

    public setTimeCapsule(timeCapsule: moorhen.TimeCapsule): void {
        this.timeCapsule = timeCapsule;
        this.timeCapsuleRef = React.createRef<moorhen.TimeCapsule>();
        this.timeCapsuleRef.current = timeCapsule;
    }

    public getTimeCapsule(): moorhen.TimeCapsule {
        return this.timeCapsule;
    }

    public getTimeCapsuleRef(): React.RefObject<moorhen.TimeCapsule> {
        return this.timeCapsuleRef;
    }

    public setVideoRecorder(videoRecorder: moorhen.ScreenRecorder): void {
        this.videoRecorder = videoRecorder;
        this.videoRecorderRef = React.createRef<moorhen.ScreenRecorder>();
        this.videoRecorderRef.current = videoRecorder;
    }

    public getVideoRecorder(): moorhen.ScreenRecorder {
        return this.videoRecorder;
    }

    public getVideoRecorderRef(): React.RefObject<moorhen.ScreenRecorder> {
        return this.videoRecorderRef;
    }

    public setAceDRGInstance(aceDRGInstance: moorhen.AceDRGInstance): void {
        this.aceDRGInstance = aceDRGInstance;
    }

    public getAceDRGInstance(): moorhen.AceDRGInstance | null {
        return this.aceDRGInstance;
    }

    public cleanup(): void {

    }
}

// Export a singleton instance
export const moorhenGlobalInstance = new MoorhenGlobalInstance();