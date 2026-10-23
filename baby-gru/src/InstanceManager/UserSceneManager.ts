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
import { type SceneSettingsSnapshot, getPerSceneSettings, getSceneSettingsSnapshot, isSamePerSceneSettings } from "../store/sceneSettingsSlice";
import {
    BUILT_IN_SCENE_IDS,
    type BuiltInSceneId,
    type UserScene,
    MOVIE_SCENE_ID,
    builtInSceneDefaults,
    bumpBackupsRevision,
    isBuiltInScene,
} from "../store/userScenesSlice";
import {
    type SceneBackup,
    type SceneSections,
    USER_SCENE_FORMAT_VERSION,
    type UserSceneState,
    emptyBackup,
    fromFileEntry,
    readSceneList,
    toFileEntry,
} from "./userSceneFormat";
// Type only: MoorhenInstance imports this module, a value import would be undefined while it loads
import type { MoorhenInstance } from "./MoorhenInstance";

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

/** The built-in scenes with no saved representations: every molecule gets the scene's default style when shown */
const builtInBackups = (settingsOf: (sceneId: BuiltInSceneId) => SceneSettingsSnapshot) =>
    Object.fromEntries(BUILT_IN_SCENE_IDS.map(sceneId => [sceneId, emptyBackup(settingsOf(sceneId))]));

/** `backup` with other scene settings and, if given, other representations */
const replaceContent = (
    backup: SceneBackup,
    sceneSettings: SceneSettingsSnapshot,
    representations?: { representations: SceneSections["representations"]; molecules: SceneBackup["objects"]["molecules"] }
): SceneBackup => ({
    ...backup,
    objects: representations ? { ...backup.objects, molecules: representations.molecules } : backup.objects,
    sections: { ...backup.sections, sceneSettings, ...(representations && { representations: representations.representations }) },
});

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
    // What each scene shows when selected (the shown one: what it showed when last recorded).
    // Until preferences are restored (applySavedScenes), the built-in scenes start from their defaults
    private backups: { [sceneId: string]: SceneBackup } = builtInBackups(builtInSceneDefaults);
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
     * Start the built-in scenes from their saved settings (user preferences), keeping their
     * representations, and show them if a built-in scene is selected.
     *
     * **Internal use only.** Called after preferences are restored: at start-up and after an import.
     * @private
     */
    public applySavedScenes(): void {
        const { savedSceneSettings } = this.instance.store.getState().userScenes;
        for (const sceneId of BUILT_IN_SCENE_IDS) {
            this.backups[sceneId] = replaceContent(this.backups[sceneId], savedSceneSettings[sceneId]);
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
        const settings = getPerSceneSettings(this.sceneSettingsOf(sceneId), builtInSceneDefaults(sceneId));
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
        const isShown = userScenes.selectedScene === sceneId;
        const inputs = [isShown ? state.sceneSettings : null, isShown, userScenes.backupsRevision, userScenes.savedSceneSettings[sceneId]];
        const cached = this.unsavedChangesCache.get(sceneId);
        if (cached && cached.inputs.every((input, i) => input === inputs[i])) return cached.result;
        const current = getPerSceneSettings(this.sceneSettingsOf(sceneId, state), builtInSceneDefaults(sceneId));
        const result = !isSamePerSceneSettings(current, userScenes.savedSceneSettings[sceneId]);
        this.unsavedChangesCache.set(sceneId, { inputs, result });
        return result;
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
        const missingBuiltIns = BUILT_IN_SCENE_IDS.filter(sceneId => !scenes.some(scene => scene.id === sceneId));
        scenes.unshift(...missingBuiltIns.map(sceneId => ({ id: sceneId, name: sceneId })));
        const snapshots = readSceneList(state.snapshots, isSnapshot);

        this.backups = this.savedBuiltInBackups();
        for (const entry of [...scenes, ...snapshots]) {
            const backup = fromFileEntry(entry);
            if (backup) this.backups[entry.id] = backup;
        }
        this.backupsChanged();
        const isListed = [...scenes, ...snapshots].some(scene => scene.id === state.selectedScene);
        const selectedScene = isListed ? state.selectedScene : "Default";

        this.instance.dispatch(
            setUserSceneState({
                scenes: scenes.map(({ id, name }) => ({ id, name })),
                snapshots: snapshots.map(({ id, name }) => ({ id, name })),
                selectedScene,
            })
        );
        this.applyDefaultStyle(selectedScene);
        if (this.backups[selectedScene]) this.applySceneSettings(this.backups[selectedScene]);
    }

    /**
     * Start from the built-in scenes after loading a session saved without scenes: what the session
     * shows becomes the "Default" scene (its own view settings are kept, not the Default preset).
     *
     * **Internal use only.** Called by the session loader.
     * @private
     */
    public resetForLegacySession(): void {
        this.backups = this.savedBuiltInBackups();
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
        if ((sceneId === this.selected && !isSnapshot(sceneId)) || !this.canChange) return false;
        await this.runSwitch(async () => {
            try {
                await this.changeScene(sceneId, saveCurrentScene);
            } finally {
                this.instance.dispatch(setSelectedScene(sceneId));
            }
        });
        if (isSnapshot(sceneId)) {
            this.instance.dispatch(
                enqueueSnackbar({
                    message: `${this.nameOf(sceneId)} Loaded
                    Snapshots are immutable: representation changes made while it is shown are not saved unless you create a new scene or a new snapshot`,
                    variant: "info",
                })
            );
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
        const customNumber = nextNumber(this.list, "custom-");
        return this.addAndSelect(`custom-${customNumber}`, name ?? `Custom ${customNumber}`);
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
        if (!this.find(MOVIE_SCENE_ID)) return this.addAndSelect(MOVIE_SCENE_ID, name);
        return this.selected === MOVIE_SCENE_ID || (await this.select(MOVIE_SCENE_ID)) ? MOVIE_SCENE_ID : null;
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
        const { sceneSettings, glRef } = this.instance.store.getState();
        this.setBackup(id, {
            ...this.capture(id),
            camera: { origin: [...sceneSettings.origin], zoom: sceneSettings.zoom, quat: [...glRef.quat] },
        });
        this.instance.dispatch(addUserSnapshot({ id, name: uniqueName(this.allScenes, name ?? `Snapshot ${snapshotNumber}`) }));
        this.recordInHistory();
        return id;
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
        if (!this.canChange || isSnapshot(targetId) || targetId === sourceId || !this.find(targetId) || !this.find(sourceId)) return false;
        const source = this.workingBackup(sourceId);
        const representations = withRepresentations
            ? structuredClone({ representations: source.sections.representations, molecules: source.objects.molecules })
            : undefined;
        await this.replaceScene(targetId, replaceContent(this.workingBackup(targetId), { ...source.sections.sceneSettings }, representations), withRepresentations);
        return true;
    }

    /**
     * Reset a scene's settings to its defaults (a built-in scene's original settings, the default
     * settings for other scenes) or, for a built-in scene, to its saved ones; optionally also give
     * every molecule the default representations of the scene's base scene (bonds for "Model
     * Building", ribbons and ligands otherwise). The settings saved as preferences and the camera are
     * not changed. Applied now if the scene is shown, otherwise on its next visit.
     * @param sceneId - The id of the scene.
     * @param to - "default" (the default) or "saved".
     * @param withRepresentations - Also reset the representations.
     * @returns True if the scene was reset, false for a snapshot, a missing scene, "saved" on a scene
     * that is not built-in, a switch running or a movie playing.
     * @example
     * await moorhenInstance.userScene.reset("Model Building", "saved", true);
     */
    public async reset(sceneId: string, to: "default" | "saved" = "default", withRepresentations: boolean = false): Promise<boolean> {
        if (!this.canChange || isSnapshot(sceneId) || !this.find(sceneId)) return false;
        let sceneSettings: SceneSettingsSnapshot = {};
        if (isBuiltInScene(sceneId)) {
            sceneSettings = to === "saved" ? this.instance.store.getState().userScenes.savedSceneSettings[sceneId] : builtInSceneDefaults(sceneId);
        } else if (to === "saved") {
            return false;
        }
        const representations = withRepresentations ? { representations: [], molecules: {} } : undefined;
        await this.replaceScene(sceneId, replaceContent(this.workingBackup(sceneId), sceneSettings, representations), withRepresentations);
        return true;
    }

    /**
     * Delete a custom scene or a snapshot, with its saved representations. Deleting the current
     * one switches back to "Default" first. Built-in scenes, and the movie scene while the movie has
     * keyframes, cannot be deleted.
     * @param sceneId - The id of the scene or snapshot to delete.
     * @returns True if the scene was deleted.
     */
    public async delete(sceneId: string): Promise<boolean> {
        if (!this.canChange || isBuiltInScene(sceneId)) return false;
        const hasKeyframes = this.instance.store.getState().movie.document.path.keyframes.length > 0;
        // The movie scene holds the look of the movie's keyframes
        if (sceneId === MOVIE_SCENE_ID && hasKeyframes) return false;
        // Leaving the deleted scene must not save it again
        if (this.selected === sceneId) await this.select("Default", false);
        this.instance.dispatch(removeUserScene(sceneId));
        delete this.backups[sceneId];
        this.backupsChanged();
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
        this.recordInHistory();
    }

    /** Neither a scene switch running nor a movie playing (the scene must not change under it) */
    private get canChange(): boolean {
        return !this.isChanging && !this.instance.store.getState().movie.isPlaying;
    }

    private get allScenes(): UserScene[] {
        return [...this.list, ...this.snapshots];
    }

    private find(sceneId: string): UserScene | undefined {
        return this.allScenes.find(scene => scene.id === sceneId);
    }

    private nameOf(sceneId: string): string {
        return this.find(sceneId)?.name ?? sceneId;
    }

    /** Add a scene and switch to it, or leave the list unchanged if the switch is refused */
    private async addAndSelect(id: string, name: string): Promise<string | null> {
        if (!this.canChange) return null;
        this.instance.dispatch(addUserScene({ id, name: uniqueName(this.allScenes, name) }));
        if (await this.select(id)) return id;
        this.instance.dispatch(removeUserScene(id));
        return null;
    }

    /** Run a change of what is shown: other switches are refused until it ends, errors are logged */
    private async runSwitch(change: () => Promise<void>) {
        this.isChanging = true;
        this.instance.dispatch(setSceneChanging(true));
        try {
            await change();
        } catch (error) {
            console.error("Error changing scene:", error);
        } finally {
            this.isChanging = false;
            this.instance.dispatch(setSceneChanging(false));
        }
    }

    /** Count a scene change towards the next time capsule backup, like other modifications */
    private recordInHistory() {
        this.instance
            .getTimeCapsuleRef()
            .current?.addModification()
            .catch(error => console.error("Error backing up scenes:", error));
    }

    /** The built-in scenes as they start, from their saved settings */
    private savedBuiltInBackups() {
        const { savedSceneSettings } = this.instance.store.getState().userScenes;
        return builtInBackups(sceneId => savedSceneSettings[sceneId]);
    }

    /** Call after changing `backups`: lets selectors that read them (hasUnsavedChanges) re-run */
    private backupsChanged() {
        this.instance.dispatch(bumpBackupsRevision());
    }

    private setBackup(sceneId: string, backup: SceneBackup) {
        this.backups[sceneId] = backup;
        this.backupsChanged();
    }

    /** The settings a scene shows if it is selected, otherwise the ones it shows when selected again */
    private sceneSettingsOf(sceneId: string, state: RootState = this.instance.store.getState()): SceneSettingsSnapshot {
        const backup = this.backups[sceneId];
        // A scene never visited starts as a copy of the current one
        if (sceneId === state.userScenes.selectedScene || !backup) return getSceneSettingsSnapshot(state.sceneSettings);
        return { ...backup.sections.sceneSettings };
    }

    /** What a scene shows if it is selected or never visited (it starts as a copy of the shown one), otherwise its backup */
    private workingBackup(sceneId: string): SceneBackup {
        const backup = this.backups[sceneId];
        return sceneId === this.selected || !backup ? this.capture(sceneId) : backup;
    }

    /**
     * Store a scene's new content (not a snapshot), and show it if the scene is shown
     * @param rebuild - The representations changed: rebuild them, not only the scene settings.
     */
    private async replaceScene(sceneId: string, backup: SceneBackup, rebuild: boolean) {
        this.setBackup(sceneId, backup);
        if (sceneId === this.selected) {
            if (rebuild) await this.runSwitch(() => this.showScene(sceneId, backup));
            else this.applySceneSettings(backup);
        }
        this.recordInHistory();
    }

    private applySceneSettings(backup: SceneBackup) {
        this.instance.dispatch(applySceneSettingsSnapshot(backup.sections.sceneSettings));
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

    /**
     * Record what is shown now, as the content of a scene: the shown one, or one never visited (which
     * starts as a copy of the shown one). Keeps the scene's base scene; a new scene takes the shown one's.
     */
    private capture(sceneId: string): SceneBackup {
        const backup = emptyBackup(getSceneSettingsSnapshot(this.instance.store.getState().sceneSettings));
        for (const molecule of this.instance.getMoleculeList()) {
            backup.objects.molecules[molecule.uniqueId] = molecule.name;
            for (const representation of this.instance.representation.getList(molecule.uniqueId)) {
                backup.sections.representations.push({ moleculeUniqueId: molecule.uniqueId, params: representation.backup() });
            }
        }
        if (!isBuiltInScene(sceneId)) backup.baseScene = this.backups[sceneId]?.baseScene ?? this.baseSceneOf(this.selected);
        return backup;
    }

    private backupScene(sceneId: string) {
        // Snapshots are immutable
        if (!isSnapshot(sceneId)) this.setBackup(sceneId, this.capture(sceneId));
    }

    /** Replace what is shown by a scene's backup (already stored in `backups`): its settings and representations */
    private async showScene(sceneId: string, backup: SceneBackup) {
        this.applyDefaultStyle(sceneId);
        for (const molecule of this.instance.getMoleculeList()) {
            for (const representation of this.instance.representation.getList(molecule.uniqueId)) {
                await this.instance.representation.delete(representation.uniqueId);
            }
        }
        if (backup.camera) {
            // Before the scene settings: automatic fog and clipping follow the zoom
            this.instance.dispatch(setOrigin([...backup.camera.origin]));
            this.instance.dispatch(setZoom(backup.camera.zoom));
            this.instance.dispatch(setQuat([...backup.camera.quat]));
        }
        this.applySceneSettings(backup);
        for (const { moleculeUniqueId, params } of backup.sections.representations) {
            // The molecule may have been closed since the scene was saved
            if (!this.instance.getMolecule(moleculeUniqueId)) continue;
            await this.instance.representation.create(moleculeUniqueId, params as Parameters<typeof this.instance.representation.create>[1]);
        }
        // Molecules loaded since the scene was saved get the scene's default style
        const { wizard } = BUILT_IN_SCENE_STYLES[this.baseSceneOf(sceneId)];
        for (const molecule of this.instance.getMoleculeList()) {
            if (!Object.hasOwn(backup.objects.molecules, molecule.uniqueId)) {
                await this.instance.representation.wizard(molecule.uniqueId, wizard, false);
            }
        }
        this.reportMissingMolecules(sceneId, backup);
    }

    /** Warn about molecules the scene was saved with that are not loaded any more */
    private reportMissingMolecules(sceneId: string, backup: SceneBackup) {
        const missing = Object.entries(backup.objects.molecules)
            .filter(([uniqueId]) => !this.instance.getMolecule(uniqueId))
            .map(([, name]) => name);
        if (missing.length === 0) return;
        this.instance.dispatch(
            enqueueSnackbar({
                message: `"${this.nameOf(sceneId)}" uses molecules that are not loaded: ${missing.join(", ")}`,
                variant: "warning",
            })
        );
    }

    private async changeScene(sceneId: string, saveCurrentScene: boolean) {
        if (saveCurrentScene) this.backupScene(this.selected);
        const backup = this.backups[sceneId];
        if (backup) {
            await this.showScene(sceneId, backup);
        } else {
            // A scene visited for the first time (e.g. Custom) starts as a copy of the current one,
            // and is made from the same built-in scene
            this.setBackup(sceneId, this.capture(sceneId));
            this.applyDefaultStyle(sceneId);
        }
    }
}
