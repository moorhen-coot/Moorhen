import {
    addUserScene,
    addUserSnapshot,
    applySceneSettingsSnapshot,
    enqueueSnackbar,
    getSceneSettingsSnapshot,
    removeUserScene,
    renameUserScene,
    setOrigin,
    setQuat,
    setSceneChanging,
    setSelectedScene,
    setUserSceneState,
    setZoom,
} from "../store";
import type { SceneSettingsSnapshot, UserScene } from "../store";
import { initialState as sceneSettingsInitialState } from "../store/sceneSettingsSlice";
import type { RepresentationBackup } from "../utils/Representation/RepresentationBuilder";
import { DEFAULT_REPRESENTATION_STYLE, type MoorhenInstance } from "./MoorhenInstance";

type SceneBackupEntry = {
    representation: { moleculeUniqueId: string; params: RepresentationBackup }[];
    /**
     * Molecules present when the scene was saved (uid: name), so molecules loaded later can be told
     * apart, and missing ones can be reported by name
     */
    molecules: { [uniqueId: string]: string };
    /** Scene settings that differ from the defaults (lighting, background, effects...) */
    sceneSettings: SceneSettingsSnapshot;
    name: string;
    /**
     * A built-in preset that was never saved: its sceneSettings only override some settings on
     * top of the current ones, so user preferences (SSAO, outline...) are kept.
     */
    isPreset?: boolean;
    /** Snapshots only: the camera when the snapshot was taken */
    camera?: { origin: [number, number, number]; zoom: number; quat: number[] };
    /** Snapshots only: the scene the snapshot was taken from, whose default style new molecules get */
    baseScene?: string;
    /** Sections read from a file that this version does not know: kept so they are saved back unchanged */
    extraSections?: { [section: string]: unknown };
};

/** Version of the scene data format saved in session files ({@link UserSceneState}) */
export const USER_SCENE_FORMAT_VERSION = 1;

/**
 * A scene or snapshot as saved in a session file. The content lives in named sections so new kinds
 * of data (maps, colour rules, vectors...) can be added without changing the format: a section that
 * is missing (older file) falls back to its default, and an unknown one (newer file) is kept as is.
 */
export type UserSceneFileEntry = {
    id: string;
    name: string;
    isPreset?: boolean;
    baseScene?: string;
    camera?: { origin: [number, number, number]; zoom: number; quat: number[] };
    /** The objects the entry refers to (uid: name), to report the ones that are not loaded */
    objects?: { molecules?: { [uniqueId: string]: string } };
    /** Absent for a scene that was never shown, which starts as a copy of the current scene */
    sections?: {
        representations?: { moleculeUniqueId: string; params: RepresentationBackup }[];
        sceneSettings?: SceneSettingsSnapshot;
        [section: string]: unknown;
    };
};

/** All the scenes and snapshots, as saved in session files (`sceneData`) */
export type UserSceneState = {
    formatVersion: number;
    selectedScene: string;
    scenes: UserSceneFileEntry[];
    snapshots: UserSceneFileEntry[];
};

const KNOWN_SECTIONS = ["representations", "sceneSettings"];

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const isNumberArray = (value: unknown, length: number): value is number[] =>
    Array.isArray(value) && value.length === length && value.every(item => typeof item === "number");

const toFileEntry = (scene: UserScene, backup: SceneBackupEntry | undefined): UserSceneFileEntry => {
    const entry: UserSceneFileEntry = { id: scene.id, name: scene.name };
    if (!backup) return entry;
    if (backup.isPreset) entry.isPreset = true;
    if (backup.baseScene) entry.baseScene = backup.baseScene;
    if (backup.camera) entry.camera = backup.camera;
    entry.objects = { molecules: backup.molecules };
    entry.sections = { ...backup.extraSections, representations: backup.representation, sceneSettings: backup.sceneSettings };
    return entry;
};

/** Read a saved entry, dropping anything malformed. Returns undefined when it has no saved content */
const fromFileEntry = (entry: UserSceneFileEntry): SceneBackupEntry | undefined => {
    if (!isObject(entry.sections)) return undefined;
    const { representations, sceneSettings, ...otherSections } = entry.sections;
    const molecules = isObject(entry.objects?.molecules) ? entry.objects.molecules : {};
    const backup: SceneBackupEntry = {
        name: entry.name,
        representation: Array.isArray(representations)
            ? representations.filter(item => isObject(item) && typeof item.moleculeUniqueId === "string" && isObject(item.params))
            : [],
        molecules: Object.fromEntries(Object.entries(molecules).filter(([, name]) => typeof name === "string")) as { [uid: string]: string },
        sceneSettings: isObject(sceneSettings) ? sceneSettings : {},
    };
    if (entry.isPreset === true) backup.isPreset = true;
    if (typeof entry.baseScene === "string") backup.baseScene = entry.baseScene;
    const camera = entry.camera;
    if (isObject(camera) && isNumberArray(camera.origin, 3) && typeof camera.zoom === "number" && isNumberArray(camera.quat, 4)) {
        backup.camera = { origin: [...camera.origin] as [number, number, number], zoom: camera.zoom, quat: [...camera.quat] };
    }
    const extraSections = Object.fromEntries(Object.entries(otherSections).filter(([key]) => !KNOWN_SECTIONS.includes(key)));
    if (Object.keys(extraSections).length > 0) backup.extraSections = extraSections;
    return backup;
};

/** Keep the entries with a usable id and name */
const readSceneList = (entries: unknown, keep: (id: string) => boolean): UserSceneFileEntry[] =>
    Array.isArray(entries)
        ? entries.filter((entry): entry is UserSceneFileEntry => isObject(entry) && typeof entry.id === "string" && typeof entry.name === "string" && keep(entry.id))
        : [];

const isSnapshot = (sceneId: string) => sceneId.startsWith("snapshot-");

/** Next free number for ids like "custom-N" or "snapshot-N" (highest existing + 1, so ids never collide) */
const nextNumber = (scenes: UserScene[], prefix: string) =>
    Math.max(0, ...scenes.filter(scene => scene.id.startsWith(prefix)).map(scene => parseInt(scene.id.slice(prefix.length)))) + 1;

/** Scenes that ship with Moorhen and cannot be deleted */
const BUILT_IN_SCENES = ["Default", "Model Building"];

const { fogClipOffset } = sceneSettingsInitialState;

const DEFAULT_SCENE_SETTINGS: SceneSettingsSnapshot = {
    resetClippingFogging: false,
    clipStart: 40,
    clipEnd: 40,
    fogStart: fogClipOffset - 2,
    fogEnd: fogClipOffset + 120,
};

const MODEL_BUILDING_SCENE_SETTINGS: SceneSettingsSnapshot = {
    resetClippingFogging: true,
};

/**
 * The original backup of a built-in scene, matching the "Activate scene preset" menu (ScenePreset.tsx):
 * "Default" is figure making (fixed clipping and fog), "Model Building" has clipping and fog following
 * the zoom. With no saved representations, every molecule gets the scene's default style when shown.
 * @param isPreset - Layer the settings on top of the current ones (true) instead of the absolute defaults.
 */
const builtInSceneBackup = (sceneId: string, isPreset: boolean): SceneBackupEntry => ({
    name: sceneId,
    representation: [],
    molecules: {},
    sceneSettings: sceneId === "Model Building" ? MODEL_BUILDING_SCENE_SETTINGS : DEFAULT_SCENE_SETTINGS,
    isPreset,
});

const builtInSceneBackups = (): { [sceneId: string]: SceneBackupEntry } =>
    Object.fromEntries(BUILT_IN_SCENES.map(sceneId => [sceneId, builtInSceneBackup(sceneId, true)]));

/**
 * Scene presets: named sets of representations the user can switch between.
 *
 * Snapshots are scenes that also restore the camera (origin, zoom, rotation) and are immutable:
 * changes made while a snapshot is shown are not saved when leaving it, and selecting the shown
 * snapshot again re-applies it.
 *
 * Switching scene saves the current custom representations of every molecule, deletes them,
 * then restores the representations saved for the new scene. A scene visited for the first
 * time starts as a copy of the current one, except "Model Building" which shows every molecule
 * as bonds. Access it through `moorhenInstance.userScene`.
 *
 * The scene and snapshot lists, the selected scene and whether a switch is running live in the
 * `userScenes` store slice so the UI can follow them.
 */
export class MoorhenUserSceneManager {
    private instance: MoorhenInstance;
    private backups: { [sceneId: string]: SceneBackupEntry } = builtInSceneBackups();
    // Not read from the store: two calls in the same tick must already see each other
    private isChanging: boolean = false;

    constructor(instance: MoorhenInstance) {
        this.instance = instance;
    }

    /** The available scenes, in menu order */
    public get list(): UserScene[] {
        return this.instance.store.getState().userScenes.scenes;
    }

    /** The available snapshots, in menu order */
    public get snapshots(): UserScene[] {
        return this.instance.store.getState().userScenes.snapshots;
    }

    /** The id of the scene or snapshot currently shown */
    public get selected(): string {
        return this.instance.store.getState().userScenes.selectedScene;
    }

    /**
     * Apply the scene settings of the starting scene ("Default": figure making), under the user's
     * saved preferences: settings the user has saved keep their saved value.
     *
     * **Internal use only.** Called once user preferences are restored.
     * @private
     * @param savedPreferences - Labels of the preferences restored from storage (they match the
     * scene settings field names).
     */
    public applyStartupScene(savedPreferences: string[] = []): void {
        const backup = this.backups[this.selected];
        if (!backup) return;
        const sceneSettings = Object.fromEntries(
            Object.entries(backup.sceneSettings).filter(([key]) => !savedPreferences.includes(key))
        ) as SceneSettingsSnapshot;
        this.applySceneSettings({ ...backup, sceneSettings });
    }

    /** Whether a scene switch is in progress (switching again is ignored until it ends) */
    public get isBusy(): boolean {
        return this.isChanging;
    }

    /** Resolve once no scene switch is running (e.g. before loading a session, which deletes every molecule) */
    public async waitUntilIdle(): Promise<void> {
        while (this.isChanging) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * All the scenes and snapshots, to save in a session file. The shown scene is recorded first,
     * since a scene is otherwise only recorded when leaving it.
     */
    public exportState(): UserSceneState {
        // Mid-switch, what is shown is half built: keep the last recorded version instead
        if (!this.isChanging) this.backupScene(this.selected);
        return {
            formatVersion: USER_SCENE_FORMAT_VERSION,
            selectedScene: this.selected,
            scenes: this.list.map(scene => toFileEntry(scene, this.backups[scene.id])),
            snapshots: this.snapshots.map(snapshot => toFileEntry(snapshot, this.backups[snapshot.id])),
        };
    }

    /**
     * Replace all the scenes and snapshots with the ones from a session file. The session loader has
     * already put the selected scene's molecules and representations on screen, so only its scene
     * settings are applied here; malformed entries are dropped.
     *
     * **Internal use only.** Called by the session loader.
     * @private
     */
    public importState(state: UserSceneState): void {
        const scenes = readSceneList(state.scenes, id => !isSnapshot(id));
        // Built-in scenes are always available, in their usual place if the file lost them
        BUILT_IN_SCENES.slice()
            .reverse()
            .forEach(sceneId => {
                if (!scenes.some(scene => scene.id === sceneId)) scenes.unshift({ id: sceneId, name: sceneId });
            });
        const snapshots = readSceneList(state.snapshots, isSnapshot);

        this.backups = builtInSceneBackups();
        for (const entry of [...scenes, ...snapshots]) {
            const backup = fromFileEntry(entry);
            if (backup) this.backups[entry.id] = backup;
        }
        const allIds = [...scenes, ...snapshots].map(scene => scene.id);
        const selectedScene = allIds.includes(state.selectedScene) ? state.selectedScene : "Default";

        this.instance.dispatch(
            setUserSceneState({
                scenes: scenes.map(({ id, name }) => ({ id, name })),
                snapshots: snapshots.map(({ id, name }) => ({ id, name })),
                selectedScene,
            })
        );
        const selectedBackup = this.backups[selectedScene];
        const isModelBuilding = (selectedBackup?.baseScene ?? selectedScene) === "Model Building";
        this.instance.representation.defaultStyle = isModelBuilding ? "CBs" : DEFAULT_REPRESENTATION_STYLE;
        if (selectedBackup) this.applySceneSettings(selectedBackup);
    }

    /**
     * Start from the built-in scenes after loading a session saved without scenes: what the session
     * shows becomes the "Default" scene (its own view settings are kept, not the Default preset).
     *
     * **Internal use only.** Called by the session loader.
     * @private
     */
    public resetForLegacySession(): void {
        this.backups = builtInSceneBackups();
        this.instance.dispatch(
            setUserSceneState({
                scenes: BUILT_IN_SCENES.map(sceneId => ({ id: sceneId, name: sceneId })),
                snapshots: [],
                selectedScene: "Default",
            })
        );
        this.instance.representation.defaultStyle = DEFAULT_REPRESENTATION_STYLE;
    }

    /**
     * Switch to another scene.
     * @param sceneId - The id of the scene or snapshot to show.
     * @param saveCurrentScene - Save the current representations as the scene being left (default true).
     * Snapshots are never saved.
     * @returns True if the switch ran, false if it was ignored (same scene, or a switch already running).
     * @example
     * await moorhenInstance.userScene.select("Model Building");
     */
    public async select(sceneId: string, saveCurrentScene: boolean = true): Promise<boolean> {
        // Selecting the shown snapshot again re-applies it, undoing any change made since
        if ((sceneId === this.selected && !isSnapshot(sceneId)) || this.isChanging) return false;
        this.setChanging(true);
        try {
            await this.changeScene(sceneId, saveCurrentScene);
        } catch (error) {
            console.error("Error changing scene:", error);
        } finally {
            this.instance.dispatch(setSelectedScene(sceneId));
            this.setChanging(false);
        }
        this.recordInHistory();
        return true;
    }

    /**
     * Add a custom scene and switch to it. It starts as a copy of the current scene.
     * @param name - Display name (defaults to "Custom N").
     * @returns The id of the new scene.
     */
    public async create(name?: string): Promise<string> {
        // Use the highest existing number + 1 so a new id never collides with an existing scene
        const customNumber = nextNumber(this.list, "custom-");
        const id = `custom-${customNumber}`;
        this.instance.dispatch(addUserScene({ id, name: name ?? `Custom ${customNumber}` }));
        await this.select(id);
        return id;
    }

    /**
     * Snapshot what is shown now: representations, scene settings and camera. The snapshot is
     * added to the snapshot list; the current scene stays selected.
     * @param name - Display name (defaults to "Snapshot N").
     * @returns The id of the new snapshot, or null while a scene switch is running.
     * @example
     * const id = moorhenInstance.userScene.takeSnapshot("Active site");
     * await moorhenInstance.userScene.select(id);
     */
    public takeSnapshot(name?: string): string | null {
        if (this.isChanging) return null;
        const snapshotNumber = nextNumber(this.snapshots, "snapshot-");
        const id = `snapshot-${snapshotNumber}`;
        const backup = this.captureScene(name ?? `Snapshot ${snapshotNumber}`);
        const { sceneSettings, glRef } = this.instance.store.getState();
        backup.camera = { origin: [...sceneSettings.origin], zoom: sceneSettings.zoom, quat: [...glRef.quat] };
        // A snapshot of a snapshot keeps the original scene
        backup.baseScene = isSnapshot(this.selected) ? this.backups[this.selected]?.baseScene : this.selected;
        this.backups[id] = backup;
        this.instance.dispatch(addUserSnapshot({ id, name: backup.name }));
        this.recordInHistory();
        return id;
    }

    /**
     * Delete a custom scene or a snapshot, with its saved representations. Deleting the current
     * one switches back to "Default" first. Built-in scenes cannot be deleted.
     * @param sceneId - The id of the scene or snapshot to delete.
     * @returns True if the scene was deleted.
     */
    public async delete(sceneId: string): Promise<boolean> {
        if (this.isChanging || BUILT_IN_SCENES.includes(sceneId)) return false;
        if (this.selected === sceneId) {
            // Leaving the deleted scene must not save it again
            await this.select("Default", false);
        }
        this.instance.dispatch(removeUserScene(sceneId));
        delete this.backups[sceneId];
        this.recordInHistory();
        return true;
    }

    /**
     * Reset a built-in scene to its original state: its preset on top of the absolute default scene
     * settings (settings saved as user preferences, such as SSAO, are reset too), and the default
     * representations for every molecule (bonds for "Model Building", ribbons and ligands otherwise).
     * The scene is rebuilt now if it is shown, otherwise the reset is used on its next visit. The
     * camera (zoom, origin) is not changed.
     * @param sceneId - "Default" or "Model Building".
     * @returns True if the scene was reset, false if it is not built-in or a switch is running.
     */
    public async restoreDefault(sceneId: string): Promise<boolean> {
        if (this.isChanging || !BUILT_IN_SCENES.includes(sceneId)) return false;
        const backup = builtInSceneBackup(sceneId, false);
        // Keep the name if the user renamed the scene
        backup.name = this.list.find(scene => scene.id === sceneId)?.name ?? sceneId;
        this.backups[sceneId] = backup;
        if (this.selected === sceneId) {
            this.setChanging(true);
            try {
                await this.showScene(sceneId, backup);
            } catch (error) {
                console.error("Error restoring scene:", error);
            } finally {
                this.setChanging(false);
            }
        }
        this.recordInHistory();
        return true;
    }

    /**
     * Change the display name of a scene or snapshot.
     * @param sceneId - The id of the scene or snapshot to rename.
     * @param name - The new display name.
     */
    public rename(sceneId: string, name: string): void {
        this.instance.dispatch(renameUserScene({ id: sceneId, name }));
        if (this.backups[sceneId]) this.backups[sceneId].name = name;
        this.recordInHistory();
    }

    /** Count a scene change towards the next time capsule backup, like other modifications */
    private recordInHistory() {
        this.instance
            .getTimeCapsuleRef()
            .current?.addModification()
            .catch(error => console.error("Error backing up scenes:", error));
    }

    private applySceneSettings(backup: SceneBackupEntry) {
        const sceneSettings = backup.isPreset
            ? { ...getSceneSettingsSnapshot(this.instance.store.getState().sceneSettings), ...backup.sceneSettings }
            : backup.sceneSettings;
        this.instance.dispatch(applySceneSettingsSnapshot(sceneSettings));
    }

    private setChanging(value: boolean) {
        this.isChanging = value;
        this.instance.dispatch(setSceneChanging(value));
    }

    private async deleteCustomRepresentations() {
        for (const molecule of this.instance.getMoleculeList()) {
            for (const representation of this.instance.representation.getList(molecule.uniqueId)) {
                await this.instance.representation.delete(representation.uniqueId);
            }
        }
    }

    /** Record what is shown now: the custom representations of every molecule and the scene settings */
    private captureScene(name: string): SceneBackupEntry {
        const backup: SceneBackupEntry = {
            representation: [],
            molecules: {},
            sceneSettings: getSceneSettingsSnapshot(this.instance.store.getState().sceneSettings),
            name,
        };
        for (const molecule of this.instance.getMoleculeList()) {
            backup.molecules[molecule.uniqueId] = molecule.name;
            for (const representation of this.instance.representation.getList(molecule.uniqueId)) {
                backup.representation.push({ moleculeUniqueId: molecule.uniqueId, params: representation.backup() });
            }
        }
        return backup;
    }

    private backupScene(sceneId: string) {
        // Snapshots are immutable
        if (isSnapshot(sceneId)) return;
        this.backups[sceneId] = this.captureScene(this.list.find(scene => scene.id === sceneId)?.name ?? sceneId);
    }

    private async restoreScene(backup: SceneBackupEntry, wizardType: "bonds" | typeof DEFAULT_REPRESENTATION_STYLE) {
        for (const { moleculeUniqueId, params } of backup.representation) {
            // The molecule may have been closed since the scene was saved
            if (!this.instance.getMolecule(moleculeUniqueId)) continue;
            await this.instance.representation.create(
                moleculeUniqueId,
                params as Parameters<typeof this.instance.representation.create>[1]
            );
        }
        // Molecules loaded since the scene was saved get the scene's default style
        for (const molecule of this.instance.getMoleculeList()) {
            if (!Object.hasOwn(backup.molecules, molecule.uniqueId)) {
                await this.instance.representation.wizard(molecule.uniqueId, wizardType, false);
            }
        }
    }

    /** Replace what is shown by a saved scene: its settings and representations */
    private async showScene(sceneId: string, backup: SceneBackupEntry) {
        const isModelBuilding = (backup.baseScene ?? sceneId) === "Model Building";
        const wizardType = isModelBuilding ? "bonds" : DEFAULT_REPRESENTATION_STYLE;
        this.instance.representation.defaultStyle = isModelBuilding ? "CBs" : DEFAULT_REPRESENTATION_STYLE;
        await this.deleteCustomRepresentations();
        if (backup.camera) {
            // Before the scene settings: automatic fog and clipping follow the zoom
            this.instance.dispatch(setOrigin([...backup.camera.origin]));
            this.instance.dispatch(setZoom(backup.camera.zoom));
            this.instance.dispatch(setQuat([...backup.camera.quat]));
        }
        this.applySceneSettings(backup);
        await this.restoreScene(backup, wizardType);
        this.reportMissingMolecules(backup);
    }

    /** Warn about molecules the scene was saved with that are not loaded any more */
    private reportMissingMolecules(backup: SceneBackupEntry) {
        const missing = Object.entries(backup.molecules)
            .filter(([uniqueId]) => !this.instance.getMolecule(uniqueId))
            .map(([, name]) => name);
        if (missing.length === 0) return;
        this.instance.dispatch(
            enqueueSnackbar({
                message: `"${backup.name}" uses molecules that are not loaded: ${missing.join(", ")}`,
                variant: "warning",
            })
        );
    }

    private async changeScene(sceneId: string, saveCurrentScene: boolean) {
        if (saveCurrentScene) this.backupScene(this.selected);
        const savedScene = this.backups[sceneId];
        if (savedScene) {
            await this.showScene(sceneId, savedScene);
        } else {
            // A scene visited for the first time (e.g. Custom) starts as a copy of the current one,
            // but still takes the default style for molecules loaded from now on
            this.instance.representation.defaultStyle = DEFAULT_REPRESENTATION_STYLE;
        }
    }
}
