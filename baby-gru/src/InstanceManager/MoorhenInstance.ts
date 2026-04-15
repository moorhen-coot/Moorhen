import localforage from "localforage";
import { Dispatch, Store, UnknownAction } from "redux";
import React from "react";
import { MoorhenWebComponent } from "@/Wrappers/MoorhenWebComponent";
import { Preferences } from "@/components/managers/preferences/MoorhenPreferences";
import { MoorhenMenuSystem } from "@/components/menu-system/MenuSystem";
import { setOrigin } from "@/store";
import { setCootInitialized, toggleCootCommandExit, toggleCootCommandStart } from "@/store/generalStatesSlice";
import { setBusy, setGlobalInstanceReady } from "@/store/globalUISlice";
import { MoorhenMap, MoorhenMolecule } from "@/utils";
import { autoOpenFiles } from "@/utils/MoorhenFileLoading";
import { ScreenRecorder } from "@/utils/MoorhenScreenRecorder";
import { MoorhenTimeCapsule } from "@/utils/MoorhenTimeCapsule";
import { moorhen } from "../types/moorhen";
import { CommandCentre } from "./CommandCentre";
import { CootCommandWrapper } from "./CommandCentre/CootCommandWrapper";
import { StoreExtension } from "./StoreExtension";

export class MoorhenInstance extends StoreExtension {
    private commandCentre: CommandCentre;
    private commandCentreRef: React.RefObject<CommandCentre | null>;
    private timeCapsule: MoorhenTimeCapsule;
    private timeCapsuleRef: React.RefObject<MoorhenTimeCapsule | null>;
    private videoRecorder: ScreenRecorder;
    private videoRecorderRef: React.RefObject<ScreenRecorder | null>;
    private aceDRGInstance: moorhen.AceDRGInstance | null = null;
    private containerRef: React.RefObject<HTMLDivElement> = null;
    private preferences: Preferences;
    private moleculesRef: React.RefObject<MoorhenMolecule[] | null>;
    private mapsRef: React.RefObject<MoorhenMap[] | null>;
    private _cootCommand: CootCommandWrapper;
    private _menuSystem: MoorhenMenuSystem;
    private ready: boolean = false;
    private _webComponent: MoorhenWebComponent | null = null;
    private readyCallbacks: Array<() => void | Promise<void>> = [];

    constructor(containerRef: React.RefObject<HTMLDivElement>) {
        super();
        this.commandCentreRef = React.createRef<CommandCentre>();
        this.timeCapsuleRef = React.createRef<MoorhenTimeCapsule>();
        this.videoRecorderRef = React.createRef<ScreenRecorder>();
        this.moleculesRef = React.createRef<MoorhenMolecule[]>();
        this.mapsRef = React.createRef<MoorhenMap[]>();
        this.preferences = new Preferences();
        this._menuSystem = new MoorhenMenuSystem();
        this.containerRef = containerRef;
    }

    public paths: {
        urlPrefix: string;
        monomerLibraryPath: string;
    } = {
        urlPrefix: "",
        monomerLibraryPath: "",
    };

    /** Method to execute a callback when the instance is ready, or immediately if it already is. This is useful to avoid having to check for readiness in every method that needs to interact with the coot command or other instance attributes that might not be available immediately on instance creation. */
    public execWhenReady<T>(callback: () => T | Promise<T>): Promise<T> {
        if (this.isReady()) {
            return Promise.resolve(callback());
        } else {
            return new Promise(resolve => {
                this.readyCallbacks.push(async () => {
                    const result = await callback();
                    resolve(result);
                });
            });
        }
    }

    public setCommandCentre(commandCentre: CommandCentre): void {
        this.commandCentre = commandCentre;
        this.commandCentreRef.current = commandCentre;
        this._cootCommand = new CootCommandWrapper(this.commandCentre.cootCommand.bind(this.commandCentre));
    }
    public get cootCommand(): CootCommandWrapper {
        return this._cootCommand;
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

    public getContainerRef() {
        return this.containerRef;
    }

    get menuSystem(): MoorhenMenuSystem {
        return this._menuSystem;
    }

    public isReady(): boolean {
        return this.ready;
    }

    //========================================
    // Files loading and saving methods

    public setDefaultRepresentation() {
        return null;
    }

    public async loadFiles(
        files: File[] | File | FileList | string | string[] | URL | URL[]
    ): Promise<{ type: "molecule" | "map"; uniqueID: string; molNo: number; fileName: string }[]> {
        let filesArray: File[] = [];
        const getFileFromURL = async (url: string | URL): Promise<File> => {
            const urlString = url instanceof URL ? url.toString() : url;
            const response = await fetch(urlString);
            const blob = await response.blob();
            const filename = urlString.split("/").pop() || "downloaded_file";
            return new File([blob], filename, { type: blob.type });
        };
        const defaultBondSmoothness = this.store.getState().sceneSettings.defaultBondSmoothness;
        const backgroundColor = this.store.getState().sceneSettings.backgroundColor;

        if (files instanceof File) {
            filesArray = [files];
        } else if (files instanceof FileList) {
            filesArray = Array.from(files);
        } else if (typeof files === "string") {
            filesArray = [await getFileFromURL(files)];
        } else if (Array.isArray(files)) {
            if (typeof files[0] === "string" || files[0] instanceof URL) {
                filesArray = await Promise.all((files as (string | URL)[]).map(file => getFileFromURL(file)));
            } else if (files[0] instanceof File) {
                filesArray = files as File[];
            } else {
                throw new Error("Invalid file input type");
            }
        }

        const createdObjects = await this.execWhenReady(() =>
            autoOpenFiles(
                filesArray,
                this.commandCentreRef,
                this.store,
                this.paths.monomerLibraryPath,
                backgroundColor,
                defaultBondSmoothness,
                this.timeCapsuleRef,
                this.dispatch
            )
        );

        return createdObjects;
    }

    //========================================
    // General basics methods

    /* Return the MoorhenMolecule Object corresponding to the given unique ID */
    public getMolecule(uid: string): MoorhenMolecule {
        const state = this.store.getState();
        return state.molecules.moleculeList.filter(molecule => molecule.uniqueId === uid)[0];
    }

    /** Return the MoorhenMap Object corresponding to the given unique ID */
    public getMap(uid: string): MoorhenMap {
        const state = this.store.getState();
        return state.maps.filter(map => map.uniqueId === uid)[0];
    }

    /* Center the view on the given x,y,z coordinates */
    public centerOnCoordinate(x: number, y: number, z: number): void {
        this.dispatch(setOrigin([x, y, z]));
    }

    /* Center the view on the given residue, if no moleculeUID is provided, use the first molecule (works if only one molecule is loaded) */
    public centerOnResidue(chain: string, residueNumber: number, moleculeUID?: string): void {
        const state = this.store.getState();
        let molecule: MoorhenMolecule;
        if (!moleculeUID) {
            molecule = state.molecules.moleculeList[0];
        } else {
            molecule = this.getMolecule(moleculeUID);
        }
        molecule.centreOn(`/*/${chain}/${residueNumber}/*:*`);
    }

    /* Center the view on the given atom, if no moleculeUID is provided, use the first molecule (works if only one molecule is loaded) */
    public centerOnAtom(chain: string, residueNumber: number, atomName: string, moleculeUID?: string): void {
        const state = this.store.getState();
        let molecule: MoorhenMolecule;
        if (!moleculeUID) {
            molecule = state.molecules.moleculeList[0];
        } else {
            molecule = this.getMolecule(moleculeUID);
        }
        molecule.centreOn(`/*/${chain}/${residueNumber}/${atomName}:*`);
    }

    //========================================
    // methods with callbacks

    /**
     * Executes a callback when a new atom is hovered.
     *
     * The callback receives the hovered atom molecule unique id, residue number, and atom name.
     * Returns a function to unsubscribe from the hovered atom changes.
     * Example:
     * instance.newAtomHoveredCallback((moleculeID, residueNumber, atomName) => {
     *     console.log(`New hovered atom: ${atomName} in residue ${residueNumber} of molecule ${moleculeID}`);
     * });
     */
    public newAtomHoveredCallback(callback: (moleculeID: string, residueNumber: string, atomName: string) => void): () => void {
        const unsubscribe = this.subscribeToStore(
            state => state.hoveringStates.hoveredAtom,
            hoveredAtom => {
                if (hoveredAtom && hoveredAtom.molecule && hoveredAtom.atomInfo) {
                    callback(hoveredAtom.molecule.uniqueId, hoveredAtom.atomInfo.res_no, hoveredAtom.atomInfo.name);
                }
            }
        );

        return unsubscribe;
    }

    //========================================
    // Methods to set attributes on the web component from the instance, which will trigger re-render of the react tree when they change
    set width(value: number | string | null) {
        if (this._webComponent) {
            this._webComponent.width = value;
        }
    }

    set height(value: number | string | null) {
        if (this._webComponent) {
            this._webComponent.height = value;
        }
    }

    set urlPrefix(value: string) {
        if (this._webComponent) {
            this._webComponent.urlPrefix = value;
        }
    }

    set disableFileUploads(value: boolean) {
        if (this._webComponent) {
            this._webComponent.disableFileUploads = value;
        }
    }

    set viewOnly(value: boolean) {
        if (this._webComponent) {
            this._webComponent.viewOnly = value;
        }
    }

    set webComponent(webComponent: MoorhenWebComponent) {
        this._webComponent = webComponent;
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
        this.ready = true;
        await Promise.all(this.readyCallbacks.map(callback => callback()));
        this.readyCallbacks = [];
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
