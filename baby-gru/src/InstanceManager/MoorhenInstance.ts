import localforage from "localforage";
import { Dispatch, Store, UnknownAction } from "redux";
import React from "react";
import { Preferences } from "../components/managers/preferences/MoorhenPreferences";
import { MoorhenMap, MoorhenMolecule } from "../moorhen";
import { MoorhenReduxStoreType } from "../store/MoorhenReduxStore";
import { setCootInitialized, toggleCootCommandExit, toggleCootCommandStart } from "../store/generalStatesSlice";
import { setBusy, setGlobalInstanceReady } from "../store/globalUISlice";
import { moorhen } from "../types/moorhen";
import { ScreenRecorder } from "../utils/MoorhenScreenRecorder";
import { MoorhenTimeCapsule } from "../utils/MoorhenTimeCapsule";
import { CommandCentre } from "./CommandCentre";
import { CootCommandWrapper } from "./CommandCentre/CootCommandWrapper";

//import { CommandCentre } from './CommandCentre/MoorhenCommandCentre';

export class MoorhenInstance {
    private dispatch!: Dispatch<UnknownAction>;
    private commandCentre!: CommandCentre;
    private commandCentreRef: React.RefObject<CommandCentre | null>;
    private timeCapsule: MoorhenTimeCapsule;
    private timeCapsuleRef: React.RefObject<MoorhenTimeCapsule | null>;
    private videoRecorder: ScreenRecorder;
    private videoRecorderRef: React.RefObject<ScreenRecorder | null>;
    private aceDRGInstance: moorhen.AceDRGInstance | null = null;
    private store: Store;
    private preferences: Preferences;
    private maps: MoorhenMap[] = [];
    private molecules: MoorhenMolecule[] = [];
    private moleculesRef: React.RefObject<MoorhenMolecule[] | null>;
    private mapsRef: React.RefObject<MoorhenMap[] | null>;
    public cootCommand!: CootCommandWrapper;

    constructor() {
        this.commandCentreRef = React.createRef<CommandCentre>();
        this.timeCapsuleRef = React.createRef<MoorhenTimeCapsule>();
        this.videoRecorderRef = React.createRef<ScreenRecorder>();
        this.moleculesRef = React.createRef<MoorhenMolecule[]>();
        this.mapsRef = React.createRef<MoorhenMap[]>();
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
        this.commandCentreRef.current = commandCentre;
        this.cootCommand = new CootCommandWrapper(this.commandCentre.cootCommand.bind(this.commandCentre));
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

    public getStore(): MoorhenReduxStoreType {
        return this.store;
    }

    public getDispatch(): Dispatch<UnknownAction> {
        return this.dispatch;
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
        moleculesRef: React.RefObject<moorhen.Molecule[]>,
        mapsRef: React.RefObject<moorhen.Map[]>,
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
        this.moleculesRef = moleculesRef;
        this.mapsRef = mapsRef;

        // == Init Time capsule ==
        const activeMapRef = React.createRef<moorhen.Map>();
        const newTimeCapsule = new MoorhenTimeCapsule(this.moleculesRef, this.mapsRef, activeMapRef, this.store);
        const backupStorageInstance = timeCapsuleConfig?.providedBackupStorageInstance
            ? timeCapsuleConfig.providedBackupStorageInstance
            : MoorhenInstance.createLocalStorageInstance("Moorhen-TimeCapsule");
        newTimeCapsule.storageInstance = backupStorageInstance;
        if (timeCapsuleConfig?.maxBackupCount) {
            newTimeCapsule.maxBackupCount = timeCapsuleConfig?.maxBackupCount;
        }

        if (timeCapsuleConfig?.modificationCountBackupThreshold) {
            newTimeCapsule.modificationCountBackupThreshold = timeCapsuleConfig?.modificationCountBackupThreshold;
        }
        await newTimeCapsule.init();
        this.setTimeCapsule(newTimeCapsule);
        if (externalTimeCapsuleRef) {
            externalTimeCapsuleRef.current = this.timeCapsule;
        }

        // == Init Command Centre ==
        const newCommandCentre = new CommandCentre(this.paths.urlPrefix, this.timeCapsuleRef, {
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
        newCommandCentre.onActiveMessagesChanged = newActiveMessages => this.dispatch(setBusy(newActiveMessages.length !== 0));
        this.setCommandCentre(newCommandCentre);
        if (externalCommandCentreRef) {
            externalCommandCentreRef.current = this.commandCentre;
        }

        await newCommandCentre.init();
        this.cootCommand.set_max_number_of_simple_mesh_vertices(10000000);
        this.dispatch(setGlobalInstanceReady(true));
    }

    public cleanup(): void {
        if (this.commandCentre) {
            this.commandCentre.close();
            this.commandCentre = undefined;
            this.timeCapsule = undefined;
            this.videoRecorder = undefined;
        }
    }
}
