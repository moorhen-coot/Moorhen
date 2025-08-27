import React from "react";
import localforage from "localforage";
import { Dispatch, Store, UnknownAction } from "redux";
import { moorhen } from "../types/moorhen";
import { setGlobalInstanceReady } from "../store/globalUISlice";
import { CommandCentre } from "../utils/MoorhenCommandCentre";
import { MoorhenTimeCapsule } from "../utils/MoorhenTimeCapsule";
import { setCootInitialized, toggleCootCommandExit, toggleCootCommandStart } from "../store/generalStatesSlice";
import { Preferences } from "../components/managers/preferences/MoorhenPreferences";
import { ScreenRecorder } from "../utils/MoorhenScreenRecorder";
import { MoorhenMap, MoorhenMolecule } from "../moorhen";

/**
 * MoorhenGlobalInstance is a singleton class that manages global instances
 * of CommandCentre, TimeCapsule, and ScreenRecorder.
 * It provides methods to set and get these instances, as well as cleanup functionality.
 *
 */

export class MoorhenGlobalInstance {
    private commandCentre: CommandCentre;
    private commandCentreRef: React.RefObject<CommandCentre>;
    private timeCapsule: MoorhenTimeCapsule;
    private timeCapsuleRef: React.RefObject<MoorhenTimeCapsule>;
    private videoRecorder: ScreenRecorder;
    private videoRecorderRef: React.RefObject<ScreenRecorder>;
    private aceDRGInstance: moorhen.AceDRGInstance | null = null;
    private dispatch: Dispatch<UnknownAction>;
    private store: Store;
    private preferences: Preferences;
    private maps: MoorhenMap[];
    private molecules: MoorhenMolecule[];
    private moleculesRef: React.RefObject<MoorhenMolecule[] | null>;
    private mapsRef: React.RefObject<MoorhenMap[] | null>;

    constructor() {
        this.timeCapsuleRef = React.createRef<MoorhenTimeCapsule>();
        this.commandCentreRef = React.createRef<CommandCentre>();
        this.videoRecorderRef = React.createRef<ScreenRecorder>();
        this.preferences = new Preferences();
    }

    public paths: {
        urlPrefix: string;
        monomerLibraryPath: string;
    } = {
        urlPrefix: "",
        monomerLibraryPath: "",
    };

    public setCommandCentre(commandCentre: CommandCentre): void {
        this.commandCentre = commandCentre;
        this.commandCentreRef = React.createRef<CommandCentre>();
        this.commandCentreRef.current = commandCentre;
    }

    public getCommandCentre(): CommandCentre {
        return this.commandCentre;
    }

    public getCommandCentreRef(): React.RefObject<CommandCentre> {
        return this.commandCentreRef;
    }

    public setTimeCapsule(timeCapsule: MoorhenTimeCapsule): void {
        this.timeCapsule = timeCapsule;
        this.timeCapsuleRef.current = timeCapsule;
    }

    public getTimeCapsule(): MoorhenTimeCapsule {
        return this.timeCapsule;
    }

    public getTimeCapsuleRef(): React.RefObject<MoorhenTimeCapsule> {
        return this.timeCapsuleRef;
    }

    public setVideoRecorder(videoRecorder: ScreenRecorder): void {
        this.videoRecorder = videoRecorder;
        this.videoRecorderRef.current = videoRecorder;
    }

    public getVideoRecorder(): ScreenRecorder {
        return this.videoRecorder;
    }

    public getVideoRecorderRef(): React.RefObject<ScreenRecorder> {
        return this.videoRecorderRef;
    }

    public getPreferences(): Preferences {
        return this.preferences;
    }

    public setPaths(urlPrefix: string, monomerLibrary: string): void {
        this.paths.urlPrefix = urlPrefix;
        this.paths.monomerLibraryPath = monomerLibrary;
    }

    public setAceDRGInstance(aceDRGInstance: moorhen.AceDRGInstance): void {
        this.aceDRGInstance = aceDRGInstance;
    }

    public getAceDRGInstance(): moorhen.AceDRGInstance | null {
        return this.aceDRGInstance;
    }

    public setMoleculesAndMapsRefs(
        moleculesRef: React.RefObject<moorhen.Molecule[] | null>,
        mapsRef: React.RefObject<moorhen.Map[] | null>
    ): void {
        this.moleculesRef = moleculesRef;
        this.mapsRef = mapsRef;
    }

    static createLocalStorageInstance = (name: string, empty: boolean = false): LocalForage => {
        const instance = localforage.createInstance({
            driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
            name: name,
            storeName: name,
        });
        if (empty) {
            instance.clear();
        }
        return instance;
    };

    public async startInstance(
        dispatch: Dispatch<UnknownAction>,
        store: Store,
        externalCommandCentreRef?: React.RefObject<CommandCentre | null>,
        externalTimeCapsuleRef?: React.RefObject<MoorhenTimeCapsule | null>,
        timeCapsuleConfig?: {
            providedBackupStorageInstance?: LocalForage | null;
            maxBackupCount: number;
            modificationCountBackupThreshold: number;
        }
    ): Promise<void> {
        this.dispatch = dispatch;
        this.store = store;

        // == Init Time capsule ==
        const activeMapRef = React.createRef<moorhen.Map | null>();
        const newTimeCapsule = new MoorhenTimeCapsule(this.moleculesRef, this.mapsRef, activeMapRef, this.store);
        const backupStorageInstance = timeCapsuleConfig?.providedBackupStorageInstance
            ? timeCapsuleConfig.providedBackupStorageInstance
            : MoorhenGlobalInstance.createLocalStorageInstance("Moorhen-TimeCapsule");
        newTimeCapsule.storageInstance = backupStorageInstance;
        newTimeCapsule.maxBackupCount = timeCapsuleConfig?.maxBackupCount;
        newTimeCapsule.modificationCountBackupThreshold = timeCapsuleConfig?.modificationCountBackupThreshold;
        await newTimeCapsule.init();
        this.setTimeCapsule(newTimeCapsule);
        if (externalTimeCapsuleRef) {
            externalTimeCapsuleRef.current = this.timeCapsule;
        }

        // == Init Command Centre ==
        const newCommandCentre = new CommandCentre(this.paths.urlPrefix, null, this.timeCapsuleRef, {
            onCootInitialized: () => {
                this.dispatch(setCootInitialized(true));
            },
            onCommandExit: () => {
                this.dispatch(toggleCootCommandExit());
            },
            onCommandStart: () => {
                this.dispatch(toggleCootCommandStart());
            },
        });
        this.setCommandCentre(newCommandCentre);
        if (externalCommandCentreRef) {
            externalCommandCentreRef.current = this.commandCentre;
        }

        await newCommandCentre.init();

        console.log("Global instance is ready CommandCentre:", this.getCommandCentreRef().current);
        dispatch(setGlobalInstanceReady(true));
    }

    public cleanup(): void {}
}

// Export a singleton instance
export const moorhenGlobalInstance = new MoorhenGlobalInstance();
