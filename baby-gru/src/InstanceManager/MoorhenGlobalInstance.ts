import React from "react";
import { Dispatch, Store, UnknownAction } from "redux";
import { moorhen } from "../types/moorhen";
import { setGlobalInstanceReady } from "../store/globalUISlice";
import { MoorhenCommandCentre } from "../utils/MoorhenCommandCentre";
import { MoorhenTimeCapsule } from "../utils/MoorhenTimeCapsule";
import {
    setCootInitialized,
    toggleCootCommandExit,
    toggleCootCommandStart,
} from "../store/generalStatesSlice";
import { createLocalStorageInstance } from "../utils/utils";
import { MoorhenPreferences } from "../components/managers/preferences/MoorhenPreferences";


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
    private dispatch: Dispatch<UnknownAction>;
    private store: Store;
    private preferences: MoorhenPreferences;

    constructor() {
        this.timeCapsuleRef = React.createRef<moorhen.TimeCapsule>();
        this.commandCentreRef = React.createRef<moorhen.CommandCentre>();
        this.videoRecorderRef = React.createRef<moorhen.ScreenRecorder>();
        this.preferences = new MoorhenPreferences();
    }

    
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
        this.videoRecorderRef.current = videoRecorder;
    }

    public getVideoRecorder(): moorhen.ScreenRecorder {
        return this.videoRecorder;
    }

    public getVideoRecorderRef(): React.RefObject<moorhen.ScreenRecorder> {
        return this.videoRecorderRef;
    }

    public getPreferences(): MoorhenPreferences {
        return this.preferences;
    }

    public setAceDRGInstance(aceDRGInstance: moorhen.AceDRGInstance): void {
        this.aceDRGInstance = aceDRGInstance;
    }

    public getAceDRGInstance(): moorhen.AceDRGInstance | null {
        return this.aceDRGInstance;
    }

    public async startInstance(
        dispatch: Dispatch<UnknownAction>,
        store: Store,
        commandCentre?: moorhen.CommandCentre | null,
        timeCapsule?: moorhen.TimeCapsule | null,
        timeCapsuleConfig?: {
            activeMapRef?: React.RefObject<moorhen.Map | null>
            providedBackupStorageInstance?: moorhen.LocalStorageInstance | null
            maxBackupCount: number
            modificationCountBackupThreshold: number
            moleculesRef: React.RefObject<moorhen.Molecule[] | null>,
            mapsRef: React.RefObject<moorhen.Map[] | null>
        },

    ): Promise<void> {
        this.dispatch = dispatch
        this.store = store

        if (timeCapsule) {
            this.setTimeCapsule(timeCapsule)
        } else {
            const activeMapRef = timeCapsuleConfig?.activeMapRef || React.createRef<moorhen.Map | null>()
            const newTimeCapsule = new MoorhenTimeCapsule(timeCapsuleConfig.moleculesRef, timeCapsuleConfig.mapsRef, activeMapRef, this.store)
            const backupStorageInstance = timeCapsuleConfig?.providedBackupStorageInstance
                ? timeCapsuleConfig.providedBackupStorageInstance
                : createLocalStorageInstance("Moorhen-TimeCapsule")
            newTimeCapsule.storageInstance = backupStorageInstance
            newTimeCapsule.maxBackupCount = timeCapsuleConfig?.maxBackupCount
            newTimeCapsule.modificationCountBackupThreshold = timeCapsuleConfig?.modificationCountBackupThreshold
            await newTimeCapsule.init()
            this.setTimeCapsule(newTimeCapsule)
        }

        if (commandCentre) {
            this.setCommandCentre(commandCentre)
        } else {
            const newCommandCentre = new MoorhenCommandCentre(this.paths.urlPrefix, null, this.timeCapsuleRef, {
                onCootInitialized: () => {
                    this.dispatch(setCootInitialized(true))
                },
                onCommandExit: () => {
                    this.dispatch(toggleCootCommandExit())
                },
                onCommandStart: () => {
                    this.dispatch(toggleCootCommandStart())
                },
            })
            this.setCommandCentre(newCommandCentre)
            await newCommandCentre.init()
        }
        console.log("Global instance is ready CommandCentre:", this.getCommandCentreRef().current)
        dispatch(setGlobalInstanceReady(true))
    }

    public cleanup(): void {

    }
}

// Export a singleton instance
export const moorhenGlobalInstance = new MoorhenGlobalInstance();