import localforage from "localforage";
import { Dispatch, Store, UnknownAction } from "redux";
import React from "react";
import { MoorhenWebComponent } from "@/WebComponent/MoorhenWebComponent";
import { Preferences } from "./Preferences/MoorhenPreferences";
import type { MoorhenMenuSystem } from "@/components/menu-system/MenuSystem";
import { addCustomRepresentation, removeCustomRepresentation, setOrigin } from "@/store";
import { setCootInitialized, toggleCootCommandExit, toggleCootCommandStart } from "@/store/generalStatesSlice";
import { setBusy, setGlobalInstanceReady } from "@/store/globalUISlice";
import { MoorhenMap, MoorhenMolecule } from "@/utils";
import { autoOpenFiles } from "@/utils/FileLoading";
import { MoleculeRepresentation } from "@/utils/Representation/MoorhenMoleculeRepresentation";
import { runPictureWizard } from "@/utils/Representation/PictureWizard";
import type { PictureWizardType } from "@/utils/Representation/PictureWizard";
import { ScreenRecorder } from "@/utils/MoorhenScreenRecorder";
import { MoorhenTimeCapsule, backupSession } from "@/utils/MoorhenTimeCapsule";
import { INTERNAL_REPRESENTATION_STYLES } from "@/utils/Representation/RepresentationBuilder";
import type { CreateRepresentationParams, PublicRepresentationStyles } from "@/utils/Representation/RepresentationBuilder";
import { guid } from "@/utils/utils";
import { moorhen } from "../types/moorhen";
import { CommandCentre } from "./CommandCentre";
import { CootCommandWrapper } from "./CommandCentre/CootCommandWrapper";
import { StoreExtension } from "./StoreExtension";
import { initPreferencePersistence } from "./Preferences/PreferencePersistence";
import type { AppDispatch, MoorhenReduxStoreType } from "@/store/MoorhenReduxStore";


/**
 * Result of a file-loading operation: one entry per successfully loaded file,
 * describing the kind of object created and how to refer to it afterwards.
 * @property {string} type - "molecule" when a model was loaded, "map" when a map was loaded
 * @property {string} uniqueID - Unique ID of the created {@link MoorhenMolecule} or {@link MoorhenMap}
 * @property {number} molNo - Molecule/map number used by the Coot worker
 * @property {string} fileName - Name of the source file that was loaded
 */
export type LoadFilesResult = {
    type: "molecule" | "map";
    uniqueID: string;
    molNo: number;
    fileName: string;
}[];

type moleculeChangeAction = "new" | "add" | "delete" | "modify" | "refine";

/**
 * MoorhenInstance is the key public API entry point for the whole application.
 * It ties together the Redux store, the {@link CommandCentre} (which wraps the Coot
 * worker), the session {@link MoorhenTimeCapsule}, the user {@link Preferences},
 * the container ref that hosts the WebGL component and all high-level actions such
 * as loading files, restoring sessions and managing representations.
 *
 * High-level operations are grouped behind getters that each return an object of
 * related methods:
 * - `files` - loading molecules and maps (from files, URLs, strings or SMILES)
 * - `session` - restoring data from a saved session
 * - `representation` - creating, editing, deleting and styling representations
 *
 * The instance is constructed and initialised (via the `@private` constructor and
 * `startInstance`) by the application shell. Code that holds a reference to the
 * instance - for example through the `useMoorhenInstance` hook - should use
 * `execWhenReady` to run anything that depends on Coot being initialised.
 *
 * @extends StoreExtension
 */
export class MoorhenInstance extends StoreExtension {
    private _defaultStyle:
        | "CAs"
        | "CBs"
        | "CRs"
        | "ribbons-and-ligands"
        | "ribbons-and-side-chains"
        | "site-and-ribbons" = "ribbons-and-ligands";
    private _filesLoadedCallbacks: { [callbackUID: string]: { callback: (filesLoaded: LoadFilesResult, origin: string) => void } } = {};
    private _commandCentre: CommandCentre;
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
    private preferencesUnsubscribe: (() => void) | null = null;

    /**
     * Create a new Moorhen instance.
     *
     * **Internal use only.** The application shell constructs and wires up the
     * instance; consumers should obtain an already-initialised instance from the
     * application rather than constructing one (and calling `startInstance`) themselves.
     *
     * @private
     * @param containerRef - Ref to the HTML container that hosts the WebGL component.
     * @param menuSystem - Optional menu system that drives the application UI.
     * @param externalCommandCentre - Optional {@link CommandCentre} to use instead of
     * creating one internally during `startInstance`.
     * @param externalTimeCapsuleRef - Optional ref that is populated with the
     * {@link MoorhenTimeCapsule} once it is created, so the caller can access it externally.
     */
    constructor(
        containerRef: React.RefObject<HTMLDivElement>,
        menuSystem?: MoorhenMenuSystem,
        externalCommandCentre?: CommandCentre,
        externalTimeCapsuleRef?: React.RefObject<MoorhenTimeCapsule | null>
    ) {
        super();
        this.commandCentreRef = React.createRef<CommandCentre>();
        this.timeCapsuleRef = React.createRef<MoorhenTimeCapsule>();
        this.videoRecorderRef = React.createRef<ScreenRecorder>();
        this.moleculesRef = React.createRef<MoorhenMolecule[]>();
        this.mapsRef = React.createRef<MoorhenMap[]>();
        if (externalCommandCentre) {
            this.setCommandCentre(externalCommandCentre);
        }
        this.preferences = new Preferences();
        this._menuSystem = menuSystem || null;
        this.containerRef = containerRef;
    }

    /**
     * Paths used to locate the Coot worker assets and the monomer library.
     * `urlPrefix` prefixes asset URLs; `monomerLibraryPath` points at the directory
     * holding the monomer (ligand) restraints. Populated via `setPaths`.
     */
    public paths: {
        urlPrefix: string;
        monomerLibraryPath: string;
    } = {
        urlPrefix: "",
        monomerLibraryPath: "",
    };

    /**
     * Execute a callback once the instance is fully initialised (i.e. after
     * `startInstance` has completed), or immediately if it is already ready.
     *
     * This avoids having to check `isReady()` in every method that needs to
     * interact with the Coot command or other attributes that might not be
     * available as soon as the instance is created.
     *
     * @param callback - Function to run once the instance is ready. It may be
     * synchronous or return a promise; its resolved value is forwarded to the caller.
     * @returns A promise that resolves with the return value of `callback`.
     * @example
     * instance.execWhenReady(() => {
     *     // Coot is initialised and safe to call here.
     *     console.log("Moorhen instance ready");
     * });
     */
    public execWhenReady<T>(callback: () => T | Promise<T>): Promise<T> {
        if (this.ready) {
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

    /**
     * Attach a {@link CommandCentre} to this instance and (re)build the wrapper
     * used to send commands to the Coot worker.
     *
     * **Internal use only.** Called by the application wiring during startup.
     * @private
     * @param commandCentre - The command centre to attach.
     */
    public setCommandCentre(commandCentre: CommandCentre): void {
        this._commandCentre = commandCentre;
        this.commandCentreRef.current = commandCentre;
        this._cootCommand = new CootCommandWrapper(this.commandCentre.cootCommand.bind(this.commandCentre));
    }
    /**
     * The low-level wrapper used to send commands to the Coot worker.
     */
    public get cootCommand(): CootCommandWrapper {
        return this._cootCommand;
    }

    /**
     * The {@link CommandCentre} attached to this instance.
     */
    public get commandCentre(): CommandCentre {
        return this._commandCentre;
    }

    /**
     * Get the React ref holding the {@link CommandCentre}, for callers that need
     * the raw ref object rather than the centre itself.
     *
     * @returns The command centre React ref.
     */
    public getCommandCentreRef(): React.RefObject<CommandCentre> {
        return this.commandCentreRef;
    }

    /**
     * Attach a {@link MoorhenTimeCapsule} to this instance.
     *
     * **Internal use only.** Called by the application wiring during startup.
     * @private
     * @param timeCapsule - The time capsule to attach.
     */
    public setTimeCapsule(timeCapsule: MoorhenTimeCapsule): void {
        this.timeCapsule = timeCapsule;
        this.timeCapsuleRef.current = timeCapsule;
    }

    /**
     * The session {@link MoorhenTimeCapsule} attached to this instance.
     *
     */
    public getTimeCapsule(): MoorhenTimeCapsule {
        return this.timeCapsule;
    }

    /**
     * Get the React ref holding the session {@link MoorhenTimeCapsule}.
     *
     * @returns The time capsule React ref.
     */
    public getTimeCapsuleRef(): React.RefObject<MoorhenTimeCapsule> {
        return this.timeCapsuleRef;
    }

    /**
     * Attach a screen recorder to this instance (used to capture the GL canvas).
     *
     * **Internal use only.** Called by the application wiring during startup.
     * @private
     * @param videoRecorder - The screen recorder to attach.
     */
    public setVideoRecorder(videoRecorder: ScreenRecorder): void {
        this.videoRecorder = videoRecorder;
        this.videoRecorderRef.current = videoRecorder;
    }

    /**
     * The screen recorder attached to this instance.
     *
     */
    public getVideoRecorder(): ScreenRecorder {
        return this.videoRecorder;
    }

    /**
     * Get the React ref holding the screen recorder.
     *
     * @returns The screen recorder React ref.
     */
    public getVideoRecorderRef(): React.RefObject<ScreenRecorder> {
        return this.videoRecorderRef;
    }

    /**
     * The user {@link Preferences} object for this instance.
     */
    public getPreferences(): Preferences {
        return this.preferences;
    }

    /**
     * Initialise preference persistence (restore from local storage + subscribe
     * to the store).
     *
     * **Internal use only.** Called by the application wiring during startup.
     *
     * @private
     * @param store - The Redux store that drives this instance.
     * @param dispatch - Redux dispatch function used to apply preference changes.
     * @param onUserPreferencesChange - Optional callback invoked whenever a user
     * preference changes; receives the preference key and its new value.
     * @returns An unsubscribe function; call it to stop subscribing to the store
     * (e.g. during cleanup).
     */
    public initPreferences(
        store: MoorhenReduxStoreType,
        dispatch: AppDispatch,
        onUserPreferencesChange?: (key: string, value: unknown) => void
    ): (() => void) {
        if (this.preferencesUnsubscribe) {
            this.preferencesUnsubscribe();
        }
        this.preferencesUnsubscribe = initPreferencePersistence({
            store,
            dispatch,
            localStorageInstance: this.preferences,
            onUserPreferencesChange,
        });
        return this.preferencesUnsubscribe;
    }

    /**
     * Set the paths used to locate the Coot worker assets and the monomer library.
     *
     * **Internal use only.** Called by the application wiring during startup.
     * @private
     * @param urlPrefix - Prefix prepended to asset URLs.
     * @param monomerLibrary - Path to the directory of monomer (ligand) restraints.
     */
    public setPaths(urlPrefix: string, monomerLibrary: string): void {
        this.paths.urlPrefix = urlPrefix;
        this.paths.monomerLibraryPath = monomerLibrary;
    }

    /**
     * Attach the AceDRG instance used to generate ligand restraints.
     *
     * **Internal use only.** Called by the application wiring during startup.
     * @private
     * @param aceDRGInstance - The AceDRG instance to attach.
     */
    public setAceDRGInstance(aceDRGInstance: moorhen.AceDRGInstance): void {
        this.aceDRGInstance = aceDRGInstance;
    }

    /**
     * The AceDRG instance used to generate ligand restraints.
     *
     * **Internal use only.**
     * @private
     * @returns The AceDRG instance, or null if none has been attached.
     */
    public getAceDRGInstance(): moorhen.AceDRGInstance | null {
        return this.aceDRGInstance;
    }

    /**
     * Get the React ref of the HTML container that hosts the WebGL component.
     *
     * **Internal use only.**
     * @private
     * @returns The container ref.
     */
    public getContainerRef() {
        return this.containerRef;
    }

    /**
     * The menu system driving the application UI, if one was provided.
     *
     * **Internal use only.** Exposed for the bundled application UI.
     * @private
     */
    public get menuSystem(): MoorhenMenuSystem | null {
        return this._menuSystem;
    }

    /**
     * Whether the instance has completed `startInstance` initialisation.
     * @returns True once the instance is ready to interact with Coot.
     */
    public isReady(): boolean {
        return this.ready;
    }

    //========================================
    // Files loading and saving methods

    /**
     * File-loading API for this instance.
     *
     * All methods return a {@link LoadFilesResult}: one entry per successfully
     * loaded file. Loaded objects are automatically added to the store and drawn.
     */
    public get files() {
        const moorhenInstance = this;
        const store = this.store;
        const cootCommand = this.cootCommand;
        const dispatch = this.dispatch;
        const commandCentreRef = this.commandCentreRef;
        const paths = this.paths;
        const timeCapsuleRef = this.timeCapsuleRef;
        const execWhenReady = this.execWhenReady.bind(this);
        const filesLoadedCallbacks = this._filesLoadedCallbacks;

        return {
            /**
             * Load one or more structure/map files into Moorhen.
             *
             * Files can be supplied in several forms:
             * - a `File`, `File[]` or `FileList` (e.g. from an `<input type="file">`)
             * - a `string`/`string[]` or `URL`/`URL[]` pointing at a file to fetch
             *   (`http(s)://`, `blob:`, `file://` or, in a Node context, a local path)
             * - an object `{ url, filename }` (or an array of them) to fetch a URL and
             *   give the downloaded file a specific name
             *
             * The kind of object created is detected from the file name extension:
             * - `.pdb`, `.ent`, `.cif`, `.mmcif` are read as structures (a `.cif` that
             *   is not a structure is attempted as a ligand dictionary)
             * - `.mtz` reflection data are read into one or more maps
             * - `.mrc`, `.map`, `.ccp4` (optionally `.gz`) are read as maps; names
             *   containing `_fofc.mrc`/`_diff.ccp4` are treated as difference maps and
             *   `_locres.mrc` as local-resolution maps
             *
             * @param files - The file(s), URL(s) or file-like object(s) to load. A
             * single value and an array of the same value type are both accepted.
             * @param origin - Optional label describing where the load came from; it is
             * forwarded to subscribers registered via `newFilesLoadedCallback`.
             * @returns A promise resolving to a {@link LoadFilesResult}.
             * @example
             * await instance.files.loadFiles([
             *   "https://example.com/model.pdb",
             *   { url: "https://example.com/emd.map", filename: "my-map.map" }
             * ]);
             */
            async loadFiles(
                files:
                    | File[]
                    | File
                    | FileList
                    | string
                    | string[]
                    | URL
                    | URL[]
                    | { url: string | URL; filename: string }[]
                    | { url: string | URL; filename: string },
                origin?: string
            ): Promise<LoadFilesResult> {
                let filesArray: File[] = [];
                const getFileFromURL = async (url: string | URL, filename?: string): Promise<File> => {
                    const urlString = url instanceof URL ? url.toString() : url;

                    // Handle Node.js file system paths or it bugs in testing
                    if (
                        typeof urlString === "string" &&
                        !urlString.startsWith("http") &&
                        !urlString.startsWith("blob:") &&
                        !urlString.startsWith("file://")
                    ) {
                        try {
                            // Try to import fs (will work in Node.js)
                            const fs = await import("fs");
                            const fsPromises = fs.promises;
                            const fileBuffer = await fsPromises.readFile(urlString);
                            const blob = new Blob([fileBuffer]);
                            const finalFilename = filename || urlString.split("/").pop() || "downloaded_file";
                            return new File([blob], finalFilename, { type: blob.type });
                        } catch (err) {
                            // fs not available or file not found, fall back to fetch
                            console.log("Could not read file from filesystem, trying fetch...", err);
                        }
                    }
                    const response = await fetch(urlString);
                    const blob = await response.blob();
                    const finalFilename = filename || urlString.split("/").pop() || "downloaded_file";
                    return new File([blob], finalFilename, { type: blob.type });
                };
                const defaultBondSmoothness = store.getState().sceneSettings.defaultBondSmoothness;
                const backgroundColor = store.getState().sceneSettings.backgroundColor;

                if (files instanceof File) {
                    filesArray = [files];
                } else if (typeof FileList !== "undefined" && files instanceof FileList) {
                    filesArray = Array.from(files);
                } else if (typeof files === "string") {
                    filesArray = [await getFileFromURL(files)];
                } else if (typeof files === "object" && "url" in files) {
                    filesArray = [
                        await getFileFromURL(
                            (files as { url: string | URL; filename: string }).url,
                            (files as { url: string | URL; filename: string }).filename
                        ),
                    ];
                } else if (Array.isArray(files)) {
                    if (typeof files[0] === "string" || files[0] instanceof URL) {
                        filesArray = await Promise.all((files as (string | URL)[]).map(file => getFileFromURL(file)));
                    } else if (files[0] instanceof File) {
                        filesArray = files as File[];
                    } else if (typeof files[0] === "object" && "url" in files[0]) {
                        filesArray = await Promise.all(
                            (files as { url: string | URL; filename: string }[]).map(file => getFileFromURL(file.url, file.filename))
                        );
                    } else {
                        console.warn(
                            "Unrecognized file input format, expected array of strings, URLs, Files, or objects with url and filename properties."
                        );
                    }
                }

                console.log("Files to load: ", filesArray);

                const createdObjects = await execWhenReady(() =>
                    autoOpenFiles(filesArray, moorhenInstance, backgroundColor, defaultBondSmoothness)
                );

                for (const callbacks of Object.values(filesLoadedCallbacks)) {
                    callbacks.callback(createdObjects as LoadFilesResult, origin ?? "unknown");
                }
                return createdObjects as LoadFilesResult;
            },

            /**
             * Generate a ligand from a SMILES string (via Coot/AceDRG) and load the
             * resulting restraints dictionary as a new molecule.
             * @param smiles - The SMILES string describing the ligand.
             * @param ligname - Name to give the generated ligand/molecule (defaults to "LIG").
             * @returns A promise resolving to a {@link LoadFilesResult}.
             */
            async ligandFromSmiles(smiles: string, ligname: string): Promise<LoadFilesResult> {
                const pdbString = await cootCommand.get_pdb_from_smiles(smiles, ligname ?? "LIG", 10, 100);
                return this.loadCifString(pdbString, ligname);
            },

            /**
             * Load a model from a raw PDB-format string.
             * @param pdbString - The PDB file contents.
             * @param name - Base name used for the resulting file/molecule.
             * @returns A promise resolving to a {@link LoadFilesResult}.
             */
            loadPDBString(pdbString: string, name: string): Promise<LoadFilesResult> {
                const blob = new Blob([pdbString], { type: "text/plain" });
                const file = new File([blob], name + ".pdb", { type: "text/plain" });
                return this.loadFiles(file);
            },

            /**
             * Load a model (or ligand dictionary) from a raw mmCIF-format string.
             * @param cifString - The mmCIF file contents.
             * @param name - Base name used for the resulting file/molecule.
             * @returns A promise resolving to a {@link LoadFilesResult}.
             */
            async loadCifString(cifString: string, name: string): Promise<LoadFilesResult> {
                const blob = new Blob([cifString], { type: "text/plain" });
                const file = new File([blob], name + ".cif", { type: "text/plain" });
                return this.loadFiles(file);
            },

            /**
             * Register a callback that is invoked whenever files are loaded through
             * `loadFiles` (or helpers built on top of it).
             * @param callback - Function called with the {@link LoadFilesResult} of the
             * load and the `origin` label that was passed to `loadFiles`.
             * @returns A function that unregisters the callback.
             */
            newFilesLoadedCallback(callback: (filesLoaded: LoadFilesResult, origin: string) => void): () => void {
                const callbackUID = guid();
                filesLoadedCallbacks[callbackUID] = { callback: callback };
                return () => {
                    delete filesLoadedCallbacks[callbackUID];
                };
            },
        };
    }

    /**
     * Session-restore API for this instance.
     */
    public get session() {
        const moorhenInstance = this;

        return {
            /**
             * Restore a previously saved Moorhen session into this instance.
             *
             * The `backupSession` object is produced by the time capsule and can contain
             * molecule data (coordinates, representations, colour rules, ligand
             * dictionaries), map data (optionally including additional/reflection data),
             * the view state (origin, lighting, zoom...), the active map index and any
             * vector/2D-overlay annotations.
             *
             * @param sessionData - The session data to restore.
             * @param fetchExternalUrl - Optional callback that returns the URL of a file
             * by its unique ID; used to fetch external data that was not embedded in the
             * session blob.
             * @returns A promise resolving to the number of molecules that were restored.
             */
            loadSessionData(sessionData: backupSession, fetchExternalUrl?: (uniqueId: string) => Promise<string>): Promise<number> {
                const result = MoorhenTimeCapsule.loadSessionData(sessionData, moorhenInstance, fetchExternalUrl);
                return result;
            },
        };
    }

    //========================================
    // General basics methods

    /**
     * Get the {@link MoorhenMolecule} whose unique ID matches `uid`.
     * @param uid - The unique ID of the molecule to look up.
     * @returns The matching molecule, or undefined if no loaded molecule has that ID.
     */
    public getMolecule(uid: string): MoorhenMolecule {
        const state = this.store.getState();
        return state.molecules.moleculeList.filter(molecule => molecule.uniqueId === uid)[0];
    }

    /**
     * Get all currently loaded molecules.
     * @returns The list of loaded {@link MoorhenMolecule}s.
     */
    public getMoleculeList(): MoorhenMolecule[] {
        const state = this.store.getState();
        return state.molecules.moleculeList;
    }

    /**
     * Get all currently loaded maps.
     * @returns The list of loaded {@link MoorhenMap}s.
     */
    public getMapList(): MoorhenMap[] {
        const state = this.store.getState();
        return state.maps;
    }

    /**
     * Representation API for this instance.
     *
     * Lets you get, create, edit, delete and style the molecular representations
     * (cartoons, spheres, surfaces...) shown in the 3D view, plus configure the
     * default style applied to newly loaded molecules.
     */
    public get representation() {
        const moorhenInstance = this;
        return {
            /**
             * Set the default representation style applied to molecules when they are
             * loaded. Accepts plain styles ("CAs", "CBs", "CRs") or picture-wizard style
             * names ("ribbons-and-ligands", "ribbons-and-side-chains", "site-and-ribbons").
             * @param style - The default style to apply.
             */
            set defaultStyle(
                style: "CAs" | "CBs" | "CRs" | "ribbons-and-ligands" | "ribbons-and-side-chains" | "site-and-ribbons"
            ) {
                moorhenInstance._defaultStyle = style;
            },
            /**
             * The current default representation style applied to newly loaded molecules.
             */
            get defaultStyle() {
                return moorhenInstance._defaultStyle;
            },
            
            /**
             * Get a representation by its unique ID, searching across all molecules.
             * @param uniqueID - The unique identifier of the representation.
             * @returns The matching representation, or undefined if not found.
             * @example
             * const rep = instance.representation.get("representation-abc");
             */
            get(uniqueID: string): MoleculeRepresentation | null {
                let representation: MoleculeRepresentation | null = null;
                for (const molecule of moorhenInstance.getMoleculeList()) {
                    representation = molecule.representations.find(rep => rep.uniqueId === uniqueID);
                    if (representation) {
                        break;
                    }
                }
                return representation;
            },
            /**
             * Create a new representation on the given molecule via the public API and
             * (optionally) add it to the interface.
             *
             * `params.representationStyle` must be a public style; internal-only styles
             * (hover highlights, validation/analysis tools, etc.) are rejected with a
             * warning and a `null` return.
             *
             * @param moleculeUid - Unique ID of the molecule the representation is added to.
             * @param params - Creation options. `representationStyle` is the only required
             * field and must be a public style. All other fields are optional and are
             * described below.
             * @param params.representationStyle - The visual style of the representation.
             * Public styles are: VdwSpheres, ligands, CAs, CBs, CDs, gaussian, allHBonds,
             * CRs, MolecularSurface, DishyBases, VdWSurface, Calpha, unitCell,
             * ligand_environment, contact_dots, restraints, MetaBalls, StickBases,
             * residue_environment, NEFRestraints and RMSD. Internal-only styles (hover,
             * environment, residueSelection, transformation, rama, rotamer,
             * chemical_features, ligand_validation, glycoBlocks, adaptativeBonds) are
             * rejected.
             * @param params.ruleType - How the represented selection is built: "ligands",
             * "cid", "molecule", "chain", "residue-range" or "neighbourhood". When omitted
             * it is inferred from `cid`/`sequenceResidueRange`/`chainName` (default "molecule").
             * @param params.chainName - Chain identifier (e.g. "A") used by the "chain" and
             * "residue-range" selection types.
             * @param params.sequenceResidueRange - A `[start, end]` residue-number range used
             * by the "residue-range" selection type (e.g. `[12, 45]`).
             * @param params.cid - A full selection CID (e.g. "//A/12-20/*:*") used directly by
             * the "cid" selection type.
             * @param params.notHOH - Exclude water molecules from the selection (default false).
             * @param params.notH - Exclude hydrogen atoms from the selection (default false).
             * @param params.sideChainOnly - Only represent side-chain atoms (default false).
             * @param params.restrictToNeighbours - Only represent atoms lying within
             * `neighboursDistance` of the (optional) `neighboursCid` selection (default false).
             * @param params.excludeNeighbours - Invert `restrictToNeighbours` so the
             * neighbourhood is excluded instead of restricted to (default false).
             * @param params.neighboursCid - Additional CID defining the centre of the
             * neighbourhood selection.
             * @param params.neighboursDistance - Radius (in Angstrom) around the neighbourhood
             * selection (default 6.0).
             * @param params.useDefaultColours - Use the molecule's default colour scheme
             * (default true when no explicit `colour` is given).
             * @param params.colourMode - Colour mode: "custom" for a single colour, or a
             * multi-colour mode such as "b-factor", "secondary-structure" or "mol-symm".
             * @param params.colour - Hex colour (e.g. "#FF8800") used when `colourMode` is
             * "custom". Providing a colour disables `useDefaultColours`.
             * @param params.applyColourToNonCarbonAtoms - Whether the colour also applies to
             * non-carbon atoms (default false).
             * @param params.ncsColourRule - Colour rule used by the "mol-symm" colour mode.
             * @param params.isCustom - Mark the representation as custom (user-created);
             * internal representations set this to false.
             * @param params.bondOptions - Overrides for bond rendering (thickness, colour...).
             * @param params.m2tParams - Overrides for mesh-to-triangle rendering.
             * @param params.residueEnvironmentOptions - Options for residue-environment
             * (neighbourhood) rendering.
             * @param params.nonCustomOpacity - Opacity applied when a non-custom (multi-colour)
             * mode is in use.
             * @param params.hbondedTo - Only represent atoms hydrogen-bonded to the
             * `neighboursCid` selection (default false).
             * @param hideFromInterface - If true the representation is created and drawn but
             * not added to the interface (molecule card) list.
             * @returns The unique ID of the new representation, or null if creation failed.
             * @example
             * const repUid = await instance.representation.create(molecule.uniqueId, {
             *     representationStyle: "CAs",
             *     colourMode: "b-factor"
             * });
             */
            async create(
                moleculeUid: string,
                params: Omit<CreateRepresentationParams, "molecule" | "representationStyle" | "existingRepresentation"> & {
                    representationStyle: PublicRepresentationStyles;
                },
                hideFromInterface: boolean = false
            ): Promise<string | null> {
                if ((INTERNAL_REPRESENTATION_STYLES as readonly string[]).includes(params.representationStyle)) {
                    console.warn(
                        `Representation style "${params.representationStyle}" is internal-only and not allowed via the public API.`
                    );
                    return null;
                }
                const molecule = moorhenInstance.getMolecule(moleculeUid);
                const representation = await MoleculeRepresentation.create({ ...params, molecule: molecule });
                if (representation) {
                    if (!hideFromInterface) {
                        await moorhenInstance.dispatch(addCustomRepresentation(representation));
                    }
                    return representation.uniqueId;
                } else {
                    return null;
                }
            },

            /**
             * Delete an existing representation via the public API.
             *
             * The representation is removed from its parent molecule and from the
             * interface (molecule card) list, and redrawn away.
             *
             * @param representationUid - Unique ID of the representation to delete.
             * @returns True if the representation was found and deleted, otherwise false.
             * @example
             * const deleted = await instance.representation.delete(repUid);
             */
            async delete(representationUid: string): Promise<boolean> {
                const representation: MoleculeRepresentation | null = this.get(representationUid);
                if (representation) {
                    representation.parentMolecule.removeRepresentation(representationUid); //it's a bit roundabout way but it works
                    moorhenInstance.dispatch(removeCustomRepresentation(representation));
                    return true;

                }
                return false;
            },

            /**
             * Edit an existing representation in place via the public API.
             *
             * The representation is looked up by its unique ID and updated in place
             * (no new representation is created). `representationStyle` is the only
             * required field; any other field that is omitted keeps the representation's
             * current value, so partial updates are supported. Internal-only styles
             * (hover, validation/analysis tools, etc.) are rejected with a warning.
             *
             * @param representationUid - Unique ID of the representation to edit.
             * @param params - The fields to change. `representationStyle` is required; all
             * other fields are optional and keep the representation's existing value when omitted.
             * @param params.representationStyle - The new visual style. Must be one of the
             * public styles (VdwSpheres, ligands, CAs, CBs, CDs, gaussian, allHBonds, CRs,
             * MolecularSurface, DishyBases, VdWSurface, Calpha, unitCell, ligand_environment,
             * contact_dots, restraints, MetaBalls, StickBases, residue_environment,
             * NEFRestraints, RMSD). Internal-only styles (hover, environment,
             * residueSelection, transformation, rama, rotamer, chemical_features,
             * ligand_validation, glycoBlocks, adaptativeBonds) are rejected.
             * @param params.ruleType - How the represented selection is built: "ligands",
             * "cid", "molecule", "chain", "residue-range" or "neighbourhood".
             * @param params.chainName - Chain identifier used by the "chain"/"residue-range"
             * selection types.
             * @param params.sequenceResidueRange - A `[start, end]` residue-number range used
             * by the "residue-range" selection type.
             * @param params.cid - A full selection CID used directly by the "cid" selection type.
             * @param params.notHOH - Exclude water molecules from the selection.
             * @param params.notH - Exclude hydrogen atoms from the selection.
             * @param params.sideChainOnly - Only represent side-chain atoms.
             * @param params.restrictToNeighbours - Only represent atoms within
             * `neighboursDistance` of the `neighboursCid` selection.
             * @param params.excludeNeighbours - Invert `restrictToNeighbours` to exclude the
             * neighbourhood instead of restricting to it.
             * @param params.neighboursCid - Additional CID defining the neighbourhood centre.
             * @param params.neighboursDistance - Radius (in Angstrom) of the neighbourhood.
             * @param params.useDefaultColours - Use the molecule's default colour scheme.
             * @param params.colourMode - Colour mode: "custom" or a multi-colour mode
             * (e.g. "b-factor", "secondary-structure", "mol-symm").
             * @param params.colour - Hex colour (e.g. "#FF8800") used when `colourMode` is "custom".
             * @param params.applyColourToNonCarbonAtoms - Whether the colour also applies to
             * non-carbon atoms.
             * @param params.ncsColourRule - Colour rule used by the "mol-symm" colour mode.
             * @param params.isCustom - Whether the representation is marked as custom.
             * @param params.bondOptions - Overrides for bond rendering (thickness, colour...).
             * @param params.m2tParams - Overrides for mesh-to-triangle rendering.
             * @param params.residueEnvironmentOptions - Options for residue-environment
             * (neighbourhood) rendering.
             * @param params.nonCustomOpacity - Opacity used with non-custom colour modes.
             * @param params.hbondedTo - Only represent atoms hydrogen-bonded to the
             * `neighboursCid` selection.
             * @returns The unique ID of the updated representation, or null if the style was
             * rejected or the representation was not found.
             * @example
             * await instance.representation.edit(repUid, { colourMode: "secondary-structure" });
             */
            async edit(
                representationUid: string,
                params: Omit<CreateRepresentationParams, "molecule" | "representationStyle" | "existingRepresentation"> & {
                    representationStyle: PublicRepresentationStyles;
                }
            ) {
                if ((INTERNAL_REPRESENTATION_STYLES as readonly string[]).includes(params.representationStyle)) {
                    console.warn(
                        `Representation style "${params.representationStyle}" is internal-only and not allowed via the public API.`
                    );
                    return null;
                }
                const representation = this.get(representationUid);

                representation?.edit(params);
                return representation ? representation.uniqueId : null;
            },

            /**
             * Run the picture wizard on the given molecule via the public API.
             *
             * Optionally deletes the molecule's existing representations first, then
             * creates the set of representations implied by the wizard type. The created
             * representations are added to the interface.
             *
             * @param molecule - The target molecule unique ID, or a {@link MoorhenMolecule}
             * object. Passing the object avoids a store lookup, which is needed when the
             * molecule has not yet been added to the store.
             * @param wizardType - The wizard type to run: "site-and-ribbons" (binding site
             * and ribbons), "ribbons-and-ligands" (ribbons and ligands),
             * "ribbons-and-side-chains" (ribbons and side chains), "catrace" (CA trace and
             * ligands), or "bonds" (bonds).
             * @param deleteExisting - If true, delete existing representations before creating
             * new ones (defaults to true).
             * @returns The unique IDs of the created representations.
             * @example
             * const createdUids = await instance.representation.wizard("mol-1", "ribbons-and-ligands");
             */
            async wizard(
                molecule: string | MoorhenMolecule,
                wizardType: PictureWizardType,
                deleteExisting: boolean = true
            ): Promise<string[]> {
                const targetMolecule = typeof molecule === "string" ? moorhenInstance.getMolecule(molecule) : molecule;
                const representations = await runPictureWizard({
                    molecule: targetMolecule,
                    wizardType,
                    deleteExisting,
                    dispatch: moorhenInstance.dispatch,
                });
                for (const representation of representations) {
                    await moorhenInstance.dispatch(addCustomRepresentation(representation));
                }
                return representations.map(representation => representation.uniqueId);
            },
        };
    }

    /**
     * Get the {@link MoorhenMap} whose unique ID matches `uid`.
     * @param uid - The unique ID of the map to look up.
     * @returns The matching map, or undefined if no loaded map has that ID.
     */
    public getMap(uid: string): MoorhenMap {
        const state = this.store.getState();
        return state.maps.filter(map => map.uniqueId === uid)[0];
    }

    /**
     * Center the view on the given world-space coordinate.
     * @param x - X coordinate to centre on.
     * @param y - Y coordinate to centre on.
     * @param z - Z coordinate to centre on.
     */
    public centerOnCoordinate(x: number, y: number, z: number): void {
        this.dispatch(setOrigin([x, y, z]));
    }

    /**
     * Center the view on a given residue.
     *
     * If no `moleculeUID` is given the first loaded molecule is used (only
     * meaningful when a single molecule is loaded).
     *
     * @param chain - Chain identifier of the residue (e.g. "A").
     * @param residueNumber - Number of the residue to centre on.
     * @param moleculeUID - Optional unique ID of the molecule containing the residue.
     */
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

    /**
     * Center the view on a given atom.
     *
     * If no `moleculeUID` is given the first loaded molecule is used (only
     * meaningful when a single molecule is loaded).
     *
     * @param chain - Chain identifier of the atom (e.g. "A").
     * @param residueNumber - Number of the residue containing the atom.
     * @param atomName - Name of the atom (e.g. "CA").
     * @param moleculeUID - Optional unique ID of the molecule containing the atom.
     */
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
     * Register a callback that fires whenever a new atom is hovered in the 3D view.
     *
     * The callback only fires once the hovered-atom store state carries a real atom
     * (i.e. a molecule and atom info are available).
     *
     * @param callback - Function invoked with the unique ID of the hovered atom's
     * molecule, the residue number and the atom name.
     * @returns A function that unsubscribes the callback.
     * @example
     * const unsubscribe = instance.newAtomHoveredCallback((moleculeID, residueNumber, atomName) => {
     *     console.log(`Hovered atom: ${atomName} in residue ${residueNumber} of molecule ${moleculeID}`);
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

    // ================= Molecules changed callbacks =================

    

    private _moleculeChangedCallbacks: { [callbackUID: string]: { applyTo: string; callback: (moleculeUID: string, action?: moleculeChangeAction, cid?: string) => void } } = {};

    /**
     * Register a callback that fires whenever a molecule changes (new, added,
     * deleted, modified or refined).
     *
     * If `moleculeUID` is provided the callback only runs for that molecule;
     * otherwise it runs for any molecule change.
     *
     * @param callback - Function invoked with the unique ID of the changed molecule,
     * the change `action` ("new", "add", "delete", "modify" or "refine") and, when
     * relevant, the CID of the modified region.
     * @param moleculeUID - Optional unique ID restricting the callback to a single molecule.
     * @returns A function that unsubscribes the callback.
     * @example
     * const unsubscribe = instance.newMoleculeChangedCallback((uid, action, cid) => {
     *     console.log(`Molecule ${uid} changed (${action})`);
     * });
     */
    public newMoleculeChangedCallback(callback: (moleculeUID: string, action?: moleculeChangeAction, cid?: string) => void, moleculeUID?: string): () => void {
        const callbackUID = guid();
        this._moleculeChangedCallbacks[callbackUID] = { applyTo: moleculeUID ?? "any", callback: callback };

        return () => {
            delete this._moleculeChangedCallbacks[callbackUID];
        };
    }

    /**
     * Notify all registered molecule-change callbacks that a molecule changed.
     *
     * `UIDorMolNo` can be either a molecule unique ID or a molecule number. When a
     * number is provided it is resolved to the current molecule unique ID before
     * invoking the matching callbacks.
     *
     * @param UIDorMolNo - The unique ID (string) or molecule number (number) of the
     * molecule that changed.
     * @param action - Optional change action ("new", "add", "delete", "modify", "refine").
     * @param cid - Optional CID of the region that changed.
     */
    public triggerMoleculeChanged(UIDorMolNo: string | number, action?: moleculeChangeAction, cid?: string): void {
        const state = this.store.getState();
        const molecule =
            typeof UIDorMolNo === "number" ? state.molecules.moleculeList.filter(mol => mol.molNo === UIDorMolNo)[0] : undefined;
        const resolvedMoleculeUID = typeof UIDorMolNo === "string" ? UIDorMolNo : molecule?.uniqueId;

        Object.values(this._moleculeChangedCallbacks).forEach(callbackInfo => {
            if (callbackInfo.applyTo === "any" || callbackInfo.applyTo === resolvedMoleculeUID) {
                callbackInfo.callback(resolvedMoleculeUID, action, cid);
            }
        });
    }

    //========================================
    // Methods to set attributes on the web component from the instance, which will trigger re-render of the react tree when they change
    /**
     * Set the width of the web component hosting the application. Accepts a CSS
     * size string, a number of pixels or null. Forwarded to the attached web
     * component, triggering a re-render of the React tree.
     *
     * @param value - The new width.
     */
    set width(value: number | string | null) {
        if (this._webComponent) {
            this._webComponent.width = value;
        }
    }

    /**
     * Set the height of the web component hosting the application. Accepts a CSS
     * size string, a number of pixels or null. Forwarded to the attached web
     * component, triggering a re-render of the React tree.
     *
     * @param value - The new height.
     */
    set height(value: number | string | null) {
        if (this._webComponent) {
            this._webComponent.height = value;
        }
    }

    /**
     * Set the URL prefix used to locate Moorhen assets. Forwarded to the attached
     * web component.
     *
     * @param value - The new URL prefix.
     */
    set urlPrefix(value: string) {
        if (this._webComponent) {
            this._webComponent.urlPrefix = value;
        }
    }

    /**
     * Enable/disable the file-upload controls of the web component. Forwarded to
     * the attached web component.
     * @param value - True to disable file uploads.
     */
    set disableFileUploads(value: boolean) {
        if (this._webComponent) {
            this._webComponent.disableFileUploads = value;
        }
    }

    /**
     * Put the web component into read-only (view-only) mode. Forwarded to the
     * attached web component.
     *
     * @param value - True to enable view-only mode.
     */
    set viewOnly(value: boolean) {
        if (this._webComponent) {
            this._webComponent.viewOnly = value;
        }
    }

    /**
     * Attach the web component that hosts the application UI.
     *
     * **Internal use only.** Set by the application wiring when the component mounts.
     * @private
     * @param webComponent - The web component to attach.
     */
    set webComponent(webComponent: MoorhenWebComponent) {
        this._webComponent = webComponent;
    }

    /**
     * Create (or reuse) a local storage instance used to persist data such as
     * time-capsule backups and preferences.
     *
     * **Internal use only.** Low-level helper used to back the time capsule.
     * @private
     * @param name - Name of the storage instance; also used as the store name.
     * @param empty - If true, clear any existing data in the instance first.
     * @returns A localforage instance ready for read/write access.
     */
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

    /**
     * Initialise the instance and mark it ready.
     *
     * **Internal use only.** The application shell calls this once after constructing
     * the instance; consumers of a running instance should not call it.
     *
     * Wires up the Redux store/dispatch and the molecule/map refs, then initialises
     * the session {@link MoorhenTimeCapsule} (backed by a local-storage instance that
     * can be overridden via `timeCapsuleConfig`) and the {@link CommandCentre} if one
     * was not already provided. Finally it flags the instance as ready and flushes
     * all callbacks that were registered with `execWhenReady`.
     *
     * @private
     * @param dispatch - Redux dispatch function used to update the store.
     * @param moleculesRef - React ref that will hold the list of loaded molecules.
     * @param mapsRef - React ref that will hold the list of loaded maps.
     * @param store - The Redux store driving the instance.
     * @param externalCommandCentreRef - Optional ref that is populated with the created
     * {@link CommandCentre}, so the caller can access it externally.
     * @param externalTimeCapsuleRef - Optional ref that is populated with the created
     * {@link MoorhenTimeCapsule}.
     * @param timeCapsuleConfig - Optional configuration for the session time capsule.
     * @param timeCapsuleConfig.providedBackupStorageInstance - A localforage instance to
     * use for backups; if omitted a default "Moorhen-TimeCapsule" instance is created.
     * @param timeCapsuleConfig.maxBackupCount - Maximum number of backups to keep.
     * @param timeCapsuleConfig.modificationCountBackupThreshold - Number of molecule
     * modifications that trigger a new backup.
     */
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

        if (!this.commandCentre) {
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
                // onMoleculeChanged: (cootMolNo: number) => {
                //     this.triggerMoleculeChanged(cootMolNo);
                // },
            });
            newCommandCentre.onActiveMessagesChanged = newActiveMessages => this.dispatch(setBusy(newActiveMessages.length !== 0));
            this.setCommandCentre(newCommandCentre);
            if (externalCommandCentreRef) {
                externalCommandCentreRef.current = this.commandCentre;
            }

            await newCommandCentre.init();
        }

        this.cootCommand.set_max_number_of_simple_mesh_vertices(10000000);
        this.dispatch(setGlobalInstanceReady(true));
        this.ready = true;
        await Promise.all(this.readyCallbacks.map(callback => callback()));
        this.readyCallbacks = [];
    }

    /**
     * Tear the instance down: unsubscribe from preferences and close the command
     * centre, clearing the attached time capsule and video recorder.
     *
     * **Internal use only.** Called by the application shell when the instance is no
     * longer needed (e.g. on unmount).
     * @private
     */
    public cleanup(): void {
        if (this.preferencesUnsubscribe) {
            this.preferencesUnsubscribe();
            this.preferencesUnsubscribe = null;
        }
        if (this._commandCentre) {
            this.commandCentre.close();
            this._commandCentre = undefined;
            this.timeCapsule = undefined;
            this.videoRecorder = undefined;
        }
    }
}
