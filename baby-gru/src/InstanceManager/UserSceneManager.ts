import {
    addUserScene,
    addUserSnapshot,
    applySceneSettingsSnapshot,
    enqueueSnackbar,
    removeUserScene,
    renameUserScene,
    saveSceneSettings,
    setOrigin,
    setQuat,
    setSceneChanging,
    setSelectedScene,
    setUserSceneState,
    setZoom,
} from "../store";
import type { RootState } from "../store";
import {
    type PerSceneSettings,
    type SceneSettingsSnapshot,
    getPerSceneSettings,
    getSceneSettingsSnapshot,
    isSamePerSceneSettings,
} from "../store/sceneSettingsSlice";
import {
    BUILT_IN_SCENE_IDS,
    type BuiltInSceneId,
    type UserScene,
    MOVIE_SCENE_ID,
    builtInSceneDefaults,
    bumpBackupsRevision,
    isBuiltInScene,
} from "../store/userScenesSlice";
import type { RepresentationBackup } from "../utils/Representation/RepresentationBuilder";
// Type only: MoorhenInstance imports this module, a value import would be undefined while it loads
import type { MoorhenInstance } from "./MoorhenInstance";

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
    /** Snapshots only: the camera when the snapshot was taken */
    camera?: { origin: [number, number, number]; zoom: number; quat: number[] };
    /** Not for built-in scenes: the built-in scene this one was made from, whose default style new molecules get */
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
        molecules: Object.fromEntries(Object.entries(molecules).filter(([, name]) => typeof name === "string")) as {
            [uid: string]: string;
        },
        sceneSettings: isObject(sceneSettings) ? sceneSettings : {},
    };
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
        ? entries.filter(
              (entry): entry is UserSceneFileEntry =>
                  isObject(entry) && typeof entry.id === "string" && typeof entry.name === "string" && keep(entry.id)
          )
        : [];

const isSnapshot = (sceneId: string) => sceneId.startsWith("snapshot-");

/** Next free number for ids like "custom-N" or "snapshot-N" (highest existing + 1, so ids never collide) */
const nextNumber = (scenes: UserScene[], prefix: string) =>
    Math.max(0, ...scenes.filter(scene => scene.id.startsWith(prefix)).map(scene => parseInt(scene.id.slice(prefix.length)))) + 1;

/** `name`, or `name (2)`, `name (3)`... if it is already used, so entries in the scene menu can be told apart */
const uniqueName = (scenes: UserScene[], name: string) => {
    const names = new Set(scenes.map(scene => scene.name));
    let candidate = name;
    for (let n = 2; names.has(candidate); n++) candidate = `${name} (${n})`;
    return candidate;
};

/** The style of molecules in the "Default" scene, which MoorhenInstance starts with */
export const DEFAULT_REPRESENTATION_STYLE = "ribbons-and-ligands";

type DefaultStyle = MoorhenInstance["representation"]["defaultStyle"];

/**
 * How each built-in scene, and every scene or snapshot made from it, draws molecules it has not
 * seen: `defaultStyle` for molecules loaded while it is shown, `wizard` for molecules loaded since
 * it was last shown.
 */
const BUILT_IN_SCENE_STYLES: Record<BuiltInSceneId, { defaultStyle: DefaultStyle; wizard: "bonds" | typeof DEFAULT_REPRESENTATION_STYLE }> = {
    Default: { defaultStyle: DEFAULT_REPRESENTATION_STYLE, wizard: DEFAULT_REPRESENTATION_STYLE },
    "Model Building": { defaultStyle: "CBs", wizard: "bonds" },
};

/**
 * A built-in scene with no saved representations: every molecule gets the scene's default style
 * when shown.
 * @param sceneSettings - Its saved or default settings: they cover every scene setting.
 */
const builtInSceneBackup = (sceneId: BuiltInSceneId, sceneSettings: PerSceneSettings): SceneBackupEntry => ({
    name: sceneId,
    representation: [],
    molecules: {},
    sceneSettings,
});

/**
 * Scene presets: named sets of representations the user can switch between.
 *
 * Snapshots are scenes that also restore the camera (origin, zoom, rotation) and are immutable:
 * changes made while a snapshot is shown are not saved when leaving it, and selecting the shown
 * snapshot again re-applies it.
 *
 * Switching scene saves the current custom representations of every molecule, deletes them,
 * then restores the representations saved for the new scene. A scene visited for the first
 * time starts as a copy of the current one. Every scene and snapshot is made from a built-in
 * scene ("base scene", itself for a built-in one), which decides how molecules it has not seen are
 * drawn (BUILT_IN_SCENE_STYLES): bonds for "Model Building", ribbons and ligands for "Default".
 * Access it through `moorhenInstance.userScene`.
 *
 * The scene and snapshot lists, the selected scene and whether a switch is running live in the
 * `userScenes` store slice so the UI can follow them.
 */
export class MoorhenUserSceneManager {
    private instance: MoorhenInstance;
    // Until preferences are restored (applySavedScenes), the built-in scenes start from their defaults
    private backups: { [sceneId: string]: SceneBackupEntry } = Object.fromEntries(
        BUILT_IN_SCENE_IDS.map(sceneId => [sceneId, builtInSceneBackup(sceneId, builtInSceneDefaults(sceneId))])
    );
    // Not read from the store: two calls in the same tick must already see each other
    private isChanging: boolean = false;
    // hasUnsavedChanges runs in selectors, so on every dispatch: recompute only when its inputs change
    private unsavedChangesCache = new Map<string, { inputs: unknown[]; result: boolean }>();

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
     * Start the built-in scenes from their saved settings (user preferences), keeping their
     * representations, and show them if a built-in scene is selected.
     *
     * **Internal use only.** Called after preferences are restored: at start-up and after an import.
     * @private
     */
    public applySavedScenes(): void {
        const { savedSceneSettings } = this.instance.store.getState().userScenes;
        for (const sceneId of BUILT_IN_SCENE_IDS) {
            const backup = this.backups[sceneId] ?? builtInSceneBackup(sceneId, savedSceneSettings[sceneId]);
            this.backups[sceneId] = { ...backup, sceneSettings: savedSceneSettings[sceneId] };
        }
        this.backupsChanged();
        if (isBuiltInScene(this.selected)) this.applySceneSettings(this.backups[this.selected]);
    }

    /**
     * Save the current settings of a built-in scene as user preferences, used the next time Moorhen
     * starts. What is shown does not change.
     * @param sceneId - "Default" or "Model Building".
     * @returns True if the scene was saved, false if it is not built-in.
     * @example
     * moorhenInstance.userScene.saveScene("Model Building");
     */
    public saveScene(sceneId: string): boolean {
        if (!isBuiltInScene(sceneId)) return false;
        const state = this.instance.store.getState();
        const settings = getPerSceneSettings(this.sceneSettingsOf(sceneId, state), builtInSceneDefaults(sceneId));
        this.instance.dispatch(saveSceneSettings({ sceneId, settings }));
        return true;
    }

    /**
     * Whether the current settings of a built-in scene differ from its saved ones. False for other scenes.
     * @param sceneId - The id of the scene.
     * @param state - The store state to read (the current one by default), e.g. in a `useSelector` selector.
     */
    public hasUnsavedChanges(sceneId: string, state: RootState = this.instance.store.getState()): boolean {
        if (!isBuiltInScene(sceneId)) return false;
        const { userScenes } = state;
        // What the answer depends on: the live settings only matter for the shown scene, the
        // backups are tracked by backupsRevision
        const inputs = [
            userScenes.selectedScene === sceneId ? state.sceneSettings : null,
            userScenes.selectedScene === sceneId,
            userScenes.backupsRevision,
            userScenes.savedSceneSettings[sceneId],
        ];
        const cached = this.unsavedChangesCache.get(sceneId);
        if (cached && cached.inputs.every((input, i) => input === inputs[i])) return cached.result;
        const current = getPerSceneSettings(this.sceneSettingsOf(sceneId, state), builtInSceneDefaults(sceneId));
        const result = !isSamePerSceneSettings(current, userScenes.savedSceneSettings[sceneId]);
        this.unsavedChangesCache.set(sceneId, { inputs, result });
        return result;
    }

    /** Whether a scene switch is in progress (switching again is ignored until it ends) */
    public get isBusy(): boolean {
        return this.isChanging;
    }

    /** Whether a scene is the one the movie plays in */
    public isMovieScene(sceneId: string): boolean {
        return sceneId === MOVIE_SCENE_ID;
    }

    /** The movie scene holds the look of the movie's keyframes: it is kept while there are some */
    private get isMovieSceneInUse(): boolean {
        return this.instance.store.getState().movie.document.path.keyframes.length > 0;
    }

    /** A movie is playing or being rendered: the scene must not change under it */
    private get isMoviePlaying(): boolean {
        return this.instance.store.getState().movie.isPlaying;
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
        BUILT_IN_SCENE_IDS.slice()
            .reverse()
            .forEach(sceneId => {
                if (!scenes.some(scene => scene.id === sceneId)) scenes.unshift({ id: sceneId, name: sceneId });
            });
        const snapshots = readSceneList(state.snapshots, isSnapshot);

        this.backups = this.savedBuiltInSceneBackups();
        for (const entry of [...scenes, ...snapshots]) {
            const backup = fromFileEntry(entry);
            if (backup) this.backups[entry.id] = backup;
        }
        this.backupsChanged();
        const allIds = [...scenes, ...snapshots].map(scene => scene.id);
        const selectedScene = allIds.includes(state.selectedScene) ? state.selectedScene : "Default";

        this.instance.dispatch(
            setUserSceneState({
                scenes: scenes.map(({ id, name }) => ({ id, name })),
                snapshots: snapshots.map(({ id, name }) => ({ id, name })),
                selectedScene,
            })
        );
        this.applyDefaultStyle(selectedScene);
        const selectedBackup = this.backups[selectedScene];
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
        this.backups = this.savedBuiltInSceneBackups();
        this.backupsChanged();
        this.instance.dispatch(
            setUserSceneState({
                scenes: BUILT_IN_SCENE_IDS.map(sceneId => ({ id: sceneId, name: sceneId })),
                snapshots: [],
                selectedScene: "Default",
            })
        );
        this.applyDefaultStyle("Default");
    }

    /**
     * Switch to another scene.
     * @param sceneId - The id of the scene or snapshot to show.
     * @param saveCurrentScene - Save the current representations as the scene being left (default true).
     * Snapshots are never saved.
     * @returns True if the switch ran, false if it was ignored (same scene, a switch already running,
     * or a movie playing).
     * @example
     * await moorhenInstance.userScene.select("Model Building");
     */
    public async select(sceneId: string, saveCurrentScene: boolean = true): Promise<boolean> {
        // Selecting the shown snapshot again re-applies it, undoing any change made since
        if ((sceneId === this.selected && !isSnapshot(sceneId)) || this.isChanging || this.isMoviePlaying) return false;
        this.setChanging(true);
        try {
            await this.changeScene(sceneId, saveCurrentScene);
        } catch (error) {
            console.error("Error changing scene:", error);
        } finally {
            this.instance.dispatch(setSelectedScene(sceneId));
            this.setChanging(false);
            if (isSnapshot(sceneId)) {
                this.instance.dispatch(
                    enqueueSnackbar({
                        message: `${this.backups[sceneId]?.name ?? sceneId} Loaded
                        Snapshots are immutable: representation changes made while it is shown are not saved unless you create a new scene or a new snapshot`,
                        variant: "info",
                    })
                );
            }
        }
        this.recordInHistory();
        return true;
    }

    /**
     * Add a custom scene and switch to it. It starts as a copy of the current scene.
     * @param name - Display name (defaults to "Custom N"), numbered "Name (2)"... if already used.
     * @returns The id of the new scene, or null if it could not be shown (a switch running or a
     * movie playing): the scene is then not added.
     */
    public async create(name?: string): Promise<string | null> {
        // Use the highest existing number + 1 so a new id never collides with an existing scene
        const customNumber = nextNumber(this.list, "custom-");
        return this.addAndSelect(`custom-${customNumber}`, name ?? `Custom ${customNumber}`);
    }

    /**
     * Give a scene the parameters of another scene or snapshot: its scene settings (lighting,
     * background, effects, fog and clipping...) and, optionally, its representations. The camera is
     * never copied. Snapshots cannot be changed. The scene is rebuilt now if it is shown, otherwise
     * the copy is used on its next visit. A built-in scene's saved preferences are not changed.
     * @param targetId - The scene that changes.
     * @param sourceId - The scene or snapshot to copy from.
     * @param withRepresentations - Also replace the scene's representations with copies of the source's
     * (a movie's fades on the replaced ones stop working).
     * @returns True if the scene changed, false if one of them does not exist, the target is a
     * snapshot or the source itself, a switch is running or a movie is playing.
     * @example
     * await moorhenInstance.userScene.copyFrom("movie", "Default");
     */
    public async copyFrom(targetId: string, sourceId: string, withRepresentations: boolean = false): Promise<boolean> {
        const exists = (id: string) => [...this.list, ...this.snapshots].some(scene => scene.id === id);
        if (this.isChanging || this.isMoviePlaying || isSnapshot(targetId) || targetId === sourceId) return false;
        if (!exists(targetId) || !exists(sourceId)) return false;

        const target = targetId === this.selected || !this.backups[targetId] ? this.captureSceneAs(targetId) : this.backups[targetId];
        const backup: SceneBackupEntry = {
            ...target,
            sceneSettings: this.sceneSettingsOf(sourceId, this.instance.store.getState()),
            ...(withRepresentations ? this.representationsOf(sourceId) : {}),
        };
        this.backups[targetId] = backup;
        this.backupsChanged();

        if (targetId === this.selected) {
            if (withRepresentations) {
                this.setChanging(true);
                try {
                    await this.showScene(targetId, backup);
                } catch (error) {
                    console.error("Error copying scene:", error);
                } finally {
                    this.setChanging(false);
                }
            } else {
                this.applySceneSettings(backup);
            }
        }
        this.recordInHistory();
        return true;
    }

    /**
     * Add the scene a movie plays in and switch to it. Like a custom scene it starts as a copy of
     * the current one. There is only one (id "movie"): if it already exists it is shown, unchanged. It
     * cannot be deleted while the movie has keyframes.
     *
     * **Internal use only.** Called by the movie panel when the first keyframe is captured.
     * @private
     * @param name - Display name, numbered "Name (2)"... if already used.
     * @returns The id of the new scene, or null if it could not be shown (the scene is then not added).
     */
    public async createMovieScene(name: string): Promise<string | null> {
        if (this.list.some(scene => scene.id === MOVIE_SCENE_ID)) {
            return this.selected === MOVIE_SCENE_ID || (await this.select(MOVIE_SCENE_ID)) ? MOVIE_SCENE_ID : null;
        }
        return this.addAndSelect(MOVIE_SCENE_ID, name);
    }

    /**
     * Snapshot what is shown now: representations, scene settings and camera. The snapshot is
     * added to the snapshot list; the current scene stays selected.
     * @param name - Display name (defaults to "Snapshot N"), numbered "Name (2)"... if already used.
     * @returns The id of the new snapshot, or null while a scene switch is running.
     * @example
     * const id = moorhenInstance.userScene.takeSnapshot("Active site");
     * await moorhenInstance.userScene.select(id);
     */
    public takeSnapshot(name?: string): string | null {
        if (this.isChanging) return null;
        const snapshotNumber = nextNumber(this.snapshots, "snapshot-");
        const id = `snapshot-${snapshotNumber}`;
        const backup = this.captureScene(uniqueName([...this.list, ...this.snapshots], name ?? `Snapshot ${snapshotNumber}`));
        const { sceneSettings, glRef } = this.instance.store.getState();
        backup.camera = { origin: [...sceneSettings.origin], zoom: sceneSettings.zoom, quat: [...glRef.quat] };
        backup.baseScene = this.baseSceneOf(this.selected);
        this.backups[id] = backup;
        this.backupsChanged();
        this.instance.dispatch(addUserSnapshot({ id, name: backup.name }));
        this.recordInHistory();
        return id;
    }

    /**
     * Delete a custom scene or a snapshot, with its saved representations. Deleting the current
     * one switches back to "Default" first. Built-in scenes, and the movie scene while the movie has
     * keyframes, cannot be deleted.
     * @param sceneId - The id of the scene or snapshot to delete.
     * @returns True if the scene was deleted.
     */
    public async delete(sceneId: string): Promise<boolean> {
        if (this.isChanging || this.isMoviePlaying || isBuiltInScene(sceneId)) return false;
        if (this.isMovieScene(sceneId) && this.isMovieSceneInUse) return false;
        if (this.selected === sceneId) {
            // Leaving the deleted scene must not save it again
            await this.select("Default", false);
        }
        this.instance.dispatch(removeUserScene(sceneId));
        delete this.backups[sceneId];
        this.backupsChanged();
        this.recordInHistory();
        return true;
    }

    /**
     * Reset a built-in scene: its settings go back to its saved ones or to its defaults, and
     * every molecule gets the default representations (bonds for "Model Building", ribbons and
     * ligands otherwise). The saved settings are not changed. The scene is rebuilt now if it is shown,
     * otherwise the reset is used on its next visit. The camera (zoom, origin) is not changed.
     * @param sceneId - "Default" or "Model Building".
     * @param to - "default" (the default) for the scene's original settings, "saved" for its saved ones.
     * @returns True if the scene was reset, false if it is not built-in, a switch is running or a movie is playing.
     */
    public async restoreDefault(sceneId: string, to: "default" | "saved" = "default"): Promise<boolean> {
        if (this.isChanging || this.isMoviePlaying || !isBuiltInScene(sceneId)) return false;
        const settings =
            to === "saved" ? this.instance.store.getState().userScenes.savedSceneSettings[sceneId] : builtInSceneDefaults(sceneId);
        const backup = builtInSceneBackup(sceneId, settings);
        // Keep the name if the user renamed the scene
        backup.name = this.list.find(scene => scene.id === sceneId)?.name ?? sceneId;
        this.backups[sceneId] = backup;
        this.backupsChanged();
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
     * Reset the settings of a scene, leaving its representations alone: to its defaults (a built-in
     * scene's original settings, the default settings for other scenes) or, for a built-in scene, to
     * its saved ones. The settings saved as preferences are not changed. Applied now if the scene is
     * shown, otherwise on its next visit. Snapshots cannot be changed.
     * @param sceneId - The id of the scene.
     * @param to - "default" or "saved".
     * @returns True if the settings were reset, false for a snapshot, a missing scene, "saved" on a
     * scene that is not built-in, a switch running or a movie playing.
     */
    public resetSettings(sceneId: string, to: "default" | "saved" = "default"): boolean {
        if (this.isChanging || this.isMoviePlaying || isSnapshot(sceneId)) return false;
        const name = this.list.find(scene => scene.id === sceneId)?.name;
        if (name === undefined) return false;
        let sceneSettings: SceneSettingsSnapshot = {};
        if (isBuiltInScene(sceneId)) {
            sceneSettings = to === "saved" ? this.instance.store.getState().userScenes.savedSceneSettings[sceneId] : builtInSceneDefaults(sceneId);
        } else if (to === "saved") {
            return false;
        }
        const target = sceneId === this.selected || !this.backups[sceneId] ? this.captureSceneAs(sceneId) : this.backups[sceneId];
        const backup: SceneBackupEntry = { ...target, sceneSettings};
        this.backups[sceneId] = backup;
        this.backupsChanged();
        if (sceneId === this.selected) this.applySceneSettings(backup);
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

    /** Add a scene and switch to it, or leave the list unchanged if the switch is refused */
    private async addAndSelect(id: string, name: string): Promise<string | null> {
        if (this.isChanging || this.isMoviePlaying) return null;
        this.instance.dispatch(addUserScene({ id, name: uniqueName([...this.list, ...this.snapshots], name) }));
        if (await this.select(id)) return id;
        this.instance.dispatch(removeUserScene(id));
        return null;
    }

    /** Count a scene change towards the next time capsule backup, like other modifications */
    private recordInHistory() {
        this.instance
            .getTimeCapsuleRef()
            .current?.addModification()
            .catch(error => console.error("Error backing up scenes:", error));
    }

    /** The built-in scenes as they start, from their saved settings */
    private savedBuiltInSceneBackups(): { [sceneId: string]: SceneBackupEntry } {
        const { savedSceneSettings } = this.instance.store.getState().userScenes;
        return Object.fromEntries(
            BUILT_IN_SCENE_IDS.map(sceneId => [sceneId, builtInSceneBackup(sceneId, savedSceneSettings[sceneId])])
        );
    }

    /** The settings a scene shows if it is selected, otherwise the ones it shows when selected again */
    private sceneSettingsOf(sceneId: string, state: RootState): SceneSettingsSnapshot {
        const backup = this.backups[sceneId];
        // A scene never visited starts as a copy of the current one
        if (sceneId === state.userScenes.selectedScene || !backup) return getSceneSettingsSnapshot(state.sceneSettings);
        return { ...backup.sceneSettings };
    }

    /** The representations a scene shows if it is selected, otherwise the ones it shows when selected again */
    private representationsOf(sceneId: string): Pick<SceneBackupEntry, "representation" | "molecules"> {
        const backup = this.backups[sceneId];
        const { representation, molecules } = sceneId === this.selected || !backup ? this.captureSceneAs(sceneId) : backup;
        return structuredClone({ representation, molecules });
    }

    private applySceneSettings(backup: SceneBackupEntry) {
        this.instance.dispatch(applySceneSettingsSnapshot(backup.sceneSettings));
    }

    /**
     * The built-in scene a scene or snapshot was made from (itself for a built-in one), which decides
     * how molecules it has not seen are drawn. "Default" when unknown (e.g. a session without it).
     */
    private baseSceneOf(sceneId: string): BuiltInSceneId {
        if (isBuiltInScene(sceneId)) return sceneId;
        const baseScene = this.backups[sceneId]?.baseScene;
        return baseScene !== undefined && isBuiltInScene(baseScene) ? baseScene : "Default";
    }

    /** Molecules loaded from now on get the style of the scene's base scene */
    private applyDefaultStyle(sceneId: string) {
        this.instance.representation.defaultStyle = BUILT_IN_SCENE_STYLES[this.baseSceneOf(sceneId)].defaultStyle;
    }

    /** Call after changing `backups`: lets selectors that read them (hasUnsavedChanges) re-run */
    private backupsChanged() {
        this.instance.dispatch(bumpBackupsRevision());
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

    /**
     * Record what is shown now as the content of a scene: the shown one, or one never visited (which
     * starts as a copy of the shown one). Keeps the scene's base scene; a new scene takes the shown one's.
     */
    private captureSceneAs(sceneId: string): SceneBackupEntry {
        const backup = this.captureScene(this.list.find(scene => scene.id === sceneId)?.name ?? sceneId);
        if (!isBuiltInScene(sceneId)) backup.baseScene = this.backups[sceneId]?.baseScene ?? this.baseSceneOf(this.selected);
        return backup;
    }

    private backupScene(sceneId: string) {
        // Snapshots are immutable
        if (isSnapshot(sceneId)) return;
        this.backups[sceneId] = this.captureSceneAs(sceneId);
        this.backupsChanged();
    }

    private async restoreScene(backup: SceneBackupEntry, wizardType: (typeof BUILT_IN_SCENE_STYLES)[BuiltInSceneId]["wizard"]) {
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

    /** Replace what is shown by a scene's backup (already stored in `backups`): its settings and representations */
    private async showScene(sceneId: string, backup: SceneBackupEntry) {
        this.applyDefaultStyle(sceneId);
        await this.deleteCustomRepresentations();
        if (backup.camera) {
            // Before the scene settings: automatic fog and clipping follow the zoom
            this.instance.dispatch(setOrigin([...backup.camera.origin]));
            this.instance.dispatch(setZoom(backup.camera.zoom));
            this.instance.dispatch(setQuat([...backup.camera.quat]));
        }
        this.applySceneSettings(backup);
        await this.restoreScene(backup, BUILT_IN_SCENE_STYLES[this.baseSceneOf(sceneId)].wizard);
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
            // and is made from the same built-in scene
            this.backups[sceneId] = this.captureSceneAs(sceneId);
            this.backupsChanged();
            this.applyDefaultStyle(sceneId);
        }
    }
}
