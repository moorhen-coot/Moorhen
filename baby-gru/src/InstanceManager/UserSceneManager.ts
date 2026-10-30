import {
    addCustomRepresentation,
    addObject,
    addUserScene,
    addUserSnapshot,
    addVectors,
    emptyObjects,
    emptyVectors,
    applySceneSettingsSnapshot,
    enqueueSnackbar,
    removeCustomRepresentation,
    removeUserScene,
    renameUserScene,
    saveSceneSettings,
    setOrigin,
    setQuat,
    setSceneChanging,
    setSelectedScene,
    setSelectedThreeDObject,
    setUserSceneState,
    setZoom,
} from "../store";
import type { RootState } from "../store";
import { type SceneSettingsSnapshot, getPerSceneSettings, getSceneSettingsSnapshot, isSamePerSceneSettings } from "../store/sceneSettingsSlice";
import {
    type MoleculeDefaults,
    type SceneContent,
    type SceneSections,
    USER_SCENE_FORMAT_VERSION,
    type UserSceneState,
    emptyContent,
    readSceneList,
    toFileEntry,
} from "../store/userSceneFormat";
import {
    BUILT_IN_SCENE_IDS,
    type BuiltInSceneId,
    type UserScene,
    MOVIE_SCENE_ID,
    builtInSceneDefaults,
    isBuiltInScene,
    sceneShown,
    setSceneContent,
} from "../store/userScenesSlice";
import { ColourRule, type ColourRuleData } from "../utils/MoorhenColourRule";
import type { MoorhenMolecule } from "../utils/MoorhenMolecule";
import type { MoleculeRepresentation } from "../utils/Representation/MoorhenMoleculeRepresentation";
import type { RepresentationBackup } from "../utils/Representation/RepresentationBuilder";
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

const findScene = (state: RootState, sceneId: string): UserScene | undefined =>
    [...state.userScenes.scenes, ...state.userScenes.snapshots].find(scene => scene.id === sceneId);

/** `content` with other scene settings and, if given, other representations */
const replaceContent = (
    content: SceneContent,
    sceneSettings: SceneSettingsSnapshot,
    representations?: {
        representations: SceneSections["representations"];
        molecules: SceneContent["objects"]["molecules"];
        /** The molecules' default colour rules go with the representations that use them */
        moleculeDefaults: MoleculeDefaults | undefined;
    }
): SceneContent => ({
    ...content,
    objects: representations ? { ...content.objects, molecules: representations.molecules } : content.objects,
    sections: {
        ...content.sections,
        sceneSettings,
        ...(representations && { representations: representations.representations, moleculeDefaults: representations.moleculeDefaults }),
    },
});

/** Fields of a representation backup or colour rule that identify it or say whether it is shown, rather than what it draws */
const NOT_DRAWN_FIELDS = ["uniqueId", "parentRepresentationUniqueId", "parentMoleculeMolNo", "visible", "interfaceVisible"];

const drawnJson = (value: unknown) => JSON.stringify(value, (key, item) => (NOT_DRAWN_FIELDS.includes(key) ? undefined : item));

/**
 * What a representation draws: two representations with the same key are identical except for
 * their ids and visibility, so one can stand in for the other without being rebuilt.
 * @param defaultColourRules - The molecule's default colour rules, which a representation using
 * them is drawn with.
 */
const drawnKey = (moleculeUniqueId: string, params: RepresentationBackup, defaultColourRules: ColourRuleData[] | null): string =>
    `${moleculeUniqueId} ${drawnJson(params)} ${params.useDefaultColours ? drawnJson(defaultColourRules) : ""}`;

const colourRulesData = (molecule: MoorhenMolecule): ColourRuleData[] | null =>
    molecule.defaultColourRules?.map(rule => rule.objectify()) ?? null;

/** The style of molecules in the "Overview" scene, which MoorhenInstance starts with */
export const DEFAULT_REPRESENTATION_STYLE = "ribbons-and-ligands";

type DefaultStyle = MoorhenInstance["representation"]["defaultStyle"];

type SceneStyle = { defaultStyle: DefaultStyle; wizard: "bonds" | typeof DEFAULT_REPRESENTATION_STYLE };

/**
 * How a scene draws molecules it has not seen: `defaultStyle` for molecules loaded while it is
 * shown, `wizard` for molecules loaded since it was last shown. Bonds in "Model Building", ribbons
 * and ligands in every other scene, including the custom scenes and snapshots made from it.
 */
const sceneStyle = (sceneId: string): SceneStyle =>
    sceneId === "Model Building"
        ? { defaultStyle: "CBs", wizard: "bonds" }
        : { defaultStyle: DEFAULT_REPRESENTATION_STYLE, wizard: DEFAULT_REPRESENTATION_STYLE };

/**
 * Scene presets: named sets of representations the user can switch between.
 *
 * Snapshots are scenes that also restore the camera (origin, zoom, rotation) and are immutable:
 * changes made while a snapshot is shown are not saved when leaving it, and selecting the shown
 * snapshot again re-applies it.
 *
 * Switching scene saves the current custom representations of every molecule, deletes them,
 * then restores the representations saved for the new scene. A scene visited for the first
 * time starts as a copy of the current one. Molecules a scene has not seen are drawn as bonds in
 * "Model Building" and as ribbons and ligands in every other scene (sceneStyle).
 * Access it through `moorhenInstance.userScene`.
 *
 * The scenes and snapshots, with what each shows (`content`), the selected scene and whether a
 * switch is running live in the `userScenes` store slice.
 */
export class MoorhenUserSceneManager {
    private instance: MoorhenInstance;
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
     * Run a task during which no scene may change (a session load, which deletes every molecule):
     * waits for a running switch first, then refuses switches until the task ends.
     *
     * **Internal use only.** Called by the session loader.
     * @private
     */
    public async whileLocked<T>(task: () => Promise<T>): Promise<T> {
        await this.waitUntilIdle();
        this.setChanging(true);
        try {
            return await task();
        } finally {
            this.setChanging(false);
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
            const content = this.contentOf(sceneId) ?? emptyContent(savedSceneSettings[sceneId]);
            this.setContent(sceneId, replaceContent(content, savedSceneSettings[sceneId]));
        }
        if (isBuiltInScene(this.selected)) this.applySceneSettings(this.contentOf(this.selected));
    }

    /**
     * Save the current settings of a built-in scene as user preferences, used the next time Moorhen
     * starts. What is shown does not change.
     * @param sceneId - "Overview" or "Model Building".
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
        const saved = state.userScenes.savedSceneSettings[sceneId];
        const inputs = [state.userScenes.selectedScene === sceneId ? state.sceneSettings : findScene(state, sceneId)?.content, saved];
        const cached = this.unsavedChangesCache.get(sceneId);
        if (cached && cached.inputs.every((input, i) => input === inputs[i])) return cached.result;
        const result = !isSamePerSceneSettings(getPerSceneSettings(this.sceneSettingsOf(sceneId, state), builtInSceneDefaults(sceneId)), saved);
        this.unsavedChangesCache.set(sceneId, { inputs, result });
        return result;
    }

    /**
     * All the scenes and snapshots, to save in a session file. The shown scene is recorded first,
     * since a scene is otherwise only recorded when leaving it.
     */
    public exportState(): UserSceneState {
        // Mid-switch, what is shown is half built: keep the last recorded version instead
        if (!this.isChanging) this.recordScene(this.selected);
        return {
            formatVersion: USER_SCENE_FORMAT_VERSION,
            selectedScene: this.selected,
            scenes: this.list.map(toFileEntry),
            snapshots: this.snapshots.map(toFileEntry),
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
        // Built-in scenes are always available, in their usual place if the file lost them, and
        // start from their saved settings if the file has none
        const scenes = readSceneList(state.scenes, id => !isSnapshot(id)).map(scene =>
            isBuiltInScene(scene.id) && !scene.content ? this.savedBuiltInScene(scene.id, scene.name) : scene
        );
        const missingBuiltIns = BUILT_IN_SCENE_IDS.filter(sceneId => !scenes.some(scene => scene.id === sceneId));
        scenes.unshift(...missingBuiltIns.map(sceneId => this.savedBuiltInScene(sceneId)));
        const snapshots = readSceneList(state.snapshots, isSnapshot);
        const isListed = [...scenes, ...snapshots].some(scene => scene.id === state.selectedScene);
        const selectedScene = isListed ? state.selectedScene : "Overview";

        this.instance.dispatch(setUserSceneState({ scenes, snapshots, selectedScene }));
        this.applyDefaultStyle(selectedScene);
        const content = this.contentOf(selectedScene);
        if (content) this.applySceneSettings(content);
    }

    /**
     * Start from the built-in scenes after loading a session saved without scenes: what the session
     * shows becomes the "Overview" scene (its own view settings are kept, not the Overview preset).
     *
     * **Internal use only.** Called by the session loader.
     * @private
     */
    public resetForLegacySession(): void {
        this.instance.dispatch(
            setUserSceneState({
                scenes: BUILT_IN_SCENE_IDS.map(sceneId => this.savedBuiltInScene(sceneId)),
                snapshots: [],
                selectedScene: "Overview",
            })
        );
        this.applyDefaultStyle("Overview");
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
        this.instance.dispatch(
            addUserSnapshot({
                id,
                name: uniqueName(this.allScenes, name ?? `Snapshot ${snapshotNumber}`),
                content: {
                    ...this.capture(),
                    camera: { origin: [...sceneSettings.origin], zoom: sceneSettings.zoom, quat: [...glRef.quat] },
                },
            })
        );
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
     * await moorhenInstance.userScene.copyFrom("movie", "Overview");
     */
    public async copyFrom(targetId: string, sourceId: string, withRepresentations: boolean = false): Promise<boolean> {
        if (!this.canChange || isSnapshot(targetId) || targetId === sourceId || !this.find(targetId) || !this.find(sourceId)) return false;
        const source = this.workingContent(sourceId);
        const representations = withRepresentations
            ? {
                  representations: source.sections.representations,
                  molecules: source.objects.molecules,
                  moleculeDefaults: source.sections.moleculeDefaults,
              }
            : undefined;
        const content = replaceContent(this.workingContent(targetId), source.sections.sceneSettings, representations);
        await this.replaceScene(targetId, content, withRepresentations);
        return true;
    }

    /**
     * Reset a scene's settings to its defaults (a built-in scene's original settings, the default
     * settings for other scenes) or, for a built-in scene, to its saved ones; optionally also give
     * every molecule the scene's default representations (bonds for "Model Building", ribbons and
     * ligands otherwise). The settings saved as preferences and the camera are
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
        // Default representations, in Coot's default colours
        const cootColours = Object.fromEntries(this.instance.getMoleculeList().map(molecule => [molecule.uniqueId, { colourRules: null }]));
        const representations = withRepresentations ? { representations: [], molecules: {}, moleculeDefaults: cootColours } : undefined;
        await this.replaceScene(sceneId, replaceContent(this.workingContent(sceneId), sceneSettings, representations), withRepresentations);
        return true;
    }

    /**
     * Delete a custom scene or a snapshot, with its saved representations. Deleting the current
     * one switches back to "Overview" first. Built-in scenes, and the movie scene while the movie has
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
        if (this.selected === sceneId) await this.select("Overview", false);
        this.instance.dispatch(removeUserScene(sceneId));
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
        return findScene(this.instance.store.getState(), sceneId);
    }

    private nameOf(sceneId: string): string {
        return this.find(sceneId)?.name ?? sceneId;
    }

    /** What a scene shows when selected (for the shown one, when last recorded); undefined if never shown */
    private contentOf(sceneId: string): SceneContent | undefined {
        return this.find(sceneId)?.content;
    }

    private setContent(sceneId: string, content: SceneContent) {
        this.instance.dispatch(setSceneContent({ id: sceneId, content }));
    }

    /** A built-in scene with no saved representations, from its saved settings */
    private savedBuiltInScene(sceneId: BuiltInSceneId, name: string = sceneId): UserScene {
        const { savedSceneSettings } = this.instance.store.getState().userScenes;
        return { id: sceneId, name, content: emptyContent(savedSceneSettings[sceneId]) };
    }

    /** Add a scene and switch to it, or leave the list unchanged if the switch is refused */
    private async addAndSelect(id: string, name: string): Promise<string | null> {
        if (!this.canChange) return null;
        this.instance.dispatch(addUserScene({ id, name: uniqueName(this.allScenes, name) }));
        if (await this.select(id)) return id;
        this.instance.dispatch(removeUserScene(id));
        return null;
    }

    private setChanging(value: boolean) {
        this.isChanging = value;
        this.instance.dispatch(setSceneChanging(value));
    }

    /**
     * Run a change of what is shown: other switches are refused until it ends. An error is logged
     * and reported to the user: what is shown may then be incomplete.
     */
    private async runSwitch(change: () => Promise<void>) {
        this.setChanging(true);
        try {
            await change();
        } catch (error) {
            console.error("Error changing scene:", error);
            this.instance.dispatch(
                enqueueSnackbar({
                    message:
                        "Something went wrong while changing scene: the view may be incomplete. " +
                        "Please report it at https://github.com/moorhen-coot/Moorhen/issues",
                    variant: "error",
                    autoHideDuration: 15000,
                })
            );
        } finally {
            this.setChanging(false);
        }
    }

    /** Count a scene change towards the next time capsule backup, like other modifications */
    private recordInHistory() {
        this.instance
            .getTimeCapsuleRef()
            .current?.addModification()
            .catch(error => console.error("Error backing up scenes:", error));
    }

    /** The settings a scene shows if it is selected, otherwise the ones it shows when selected again */
    private sceneSettingsOf(sceneId: string, state: RootState = this.instance.store.getState()): SceneSettingsSnapshot {
        const content = findScene(state, sceneId)?.content;
        // A scene never visited starts as a copy of the current one
        if (sceneId === state.userScenes.selectedScene || !content) return getSceneSettingsSnapshot(state.sceneSettings);
        return content.sections.sceneSettings;
    }

    /** What a scene shows if it is selected or never visited (it starts as a copy of the shown one), otherwise its content */
    private workingContent(sceneId: string): SceneContent {
        const content = this.contentOf(sceneId);
        return sceneId === this.selected || !content ? this.capture() : content;
    }

    /**
     * Store a scene's new content (not a snapshot), and show it if the scene is shown
     * @param rebuild - The representations changed: rebuild them, not only the scene settings.
     */
    private async replaceScene(sceneId: string, content: SceneContent, rebuild: boolean) {
        this.setContent(sceneId, content);
        if (sceneId === this.selected) {
            if (rebuild) await this.runSwitch(() => this.showScene(sceneId, content));
            else this.applySceneSettings(content);
        }
        this.recordInHistory();
    }

    private applySceneSettings(content: SceneContent) {
        this.instance.dispatch(applySceneSettingsSnapshot(content.sections.sceneSettings));
    }

    /** Molecules loaded from now on get the scene's style */
    private applyDefaultStyle(sceneId: string) {
        this.instance.representation.defaultStyle = sceneStyle(sceneId).defaultStyle;
    }

    /**
     * Record what is shown now, as the content of a scene: the shown one, or one never visited (which
     * starts as a copy of the shown one).
     */
    private capture(): SceneContent {
        const content = emptyContent(getSceneSettingsSnapshot(this.instance.store.getState().sceneSettings));
        const { vectors, threeDObjects } = this.instance.store.getState();
        // Copies: the store freezes what it holds, and the shown lists keep changing
        content.sections.vectors = structuredClone(vectors.vectorsList);
        content.sections.threeDObjects = structuredClone(threeDObjects.objects);
        content.sections.moleculeDefaults = {};
        for (const molecule of this.instance.getMoleculeList()) {
            content.objects.molecules[molecule.uniqueId] = molecule.name;
            content.sections.moleculeDefaults[molecule.uniqueId] = { colourRules: colourRulesData(molecule) };
            for (const representation of this.instance.representation.getList(molecule.uniqueId)) {
                // A copy: the store freezes what it holds, and the backup may share objects with the live representation
                const params = structuredClone(representation.backup());
                content.sections.representations.push({ moleculeUniqueId: molecule.uniqueId, params });
            }
        }
        return content;
    }

    /** Store what is shown now as the scene's content (snapshots are immutable) */
    private recordScene(sceneId: string) {
        if (!isSnapshot(sceneId)) this.setContent(sceneId, this.capture());
    }

    /** Replace what is shown by a scene's content: its settings and representations */
    private async showScene(sceneId: string, content: SceneContent) {
        this.applyDefaultStyle(sceneId);
        // Default colour rules: the shown ones, and the scene's (a molecule it does not mention keeps its own)
        const shownRules = new Map(this.instance.getMoleculeList().map(molecule => [molecule.uniqueId, colourRulesData(molecule)]));
        const sceneRules = (moleculeUniqueId: string) => {
            const defaults = content.sections.moleculeDefaults?.[moleculeUniqueId];
            return defaults ? defaults.colourRules : shownRules.get(moleculeUniqueId);
        };
        // A shown representation identical to one of the scene's (e.g. switching between snapshots
        // of the same scene) is kept and given the scene's one id, instead of being rebuilt
        const shown = new Map<string, MoleculeRepresentation[]>();
        for (const molecule of this.instance.getMoleculeList()) {
            for (const representation of this.instance.representation.getList(molecule.uniqueId)) {
                const key = drawnKey(molecule.uniqueId, representation.backup(), shownRules.get(molecule.uniqueId));
                shown.set(key, [...(shown.get(key) ?? []), representation]);
            }
        }
        // The molecule may have been closed since the scene was saved
        const wanted = content.sections.representations
            .filter(({ moleculeUniqueId }) => this.instance.getMolecule(moleculeUniqueId))
            .map(({ moleculeUniqueId, params }) => ({
                moleculeUniqueId,
                params,
                kept: shown.get(drawnKey(moleculeUniqueId, params, sceneRules(moleculeUniqueId)))?.shift(),
            }));
        // Deleted by id: before the kept ones take theirs, which a deleted one may still hold
        for (const representation of [...shown.values()].flat()) {
            await this.instance.representation.delete(representation.uniqueId);
        }
        // Give the kept ones their new ids at once, with no await in between: a representation left
        // out of the store if something failed would stay drawn, but never be captured or deleted
        // again. All out first, since ids can swap between kept representations.
        const kept = wanted.filter(item => item.kept);
        kept.forEach(({ kept }) => this.instance.dispatch(removeCustomRepresentation(kept)));
        kept.forEach(({ kept, params }) => (kept.uniqueId = params.uniqueId));
        kept.forEach(({ kept }) => this.instance.dispatch(addCustomRepresentation(kept)));
        // Before rebuilding: new representations are drawn with them
        for (const molecule of this.instance.getMoleculeList()) {
            const rules = sceneRules(molecule.uniqueId);
            if (drawnJson(rules) !== drawnJson(shownRules.get(molecule.uniqueId))) await this.setDefaultColourRules(molecule, rules);
        }
        if (content.camera) {
            // Before the scene settings: automatic fog and clipping follow the zoom
            this.instance.dispatch(setOrigin([...content.camera.origin]));
            this.instance.dispatch(setZoom(content.camera.zoom));
            this.instance.dispatch(setQuat([...content.camera.quat]));
        }
        this.applySceneSettings(content);
        this.showAnnotations(content);
        for (const { moleculeUniqueId, params, kept } of wanted) {
            if (kept) {
                // As a rebuilt one: unfaded (a movie fade is not part of the scene), shown or hidden
                // as create() does (both default to shown)
                kept.resetFade();
                const visible = params.visible ?? true;
                kept.interfaceOption.visible = params.interfaceVisible ?? true;
                if (visible && !kept.visible) await kept.show();
                else if (!visible && kept.visible) kept.hide();
            } else {
                // A copy: the stored params are frozen, the representation keeps (and may change) them
                const copy = structuredClone(params) as Parameters<typeof this.instance.representation.create>[1];
                await this.instance.representation.create(moleculeUniqueId, copy);
            }
        }
        this.putInSceneOrder(wanted.map(({ params }) => params.uniqueId));
        // Molecules loaded since the scene was saved get the scene's default style
        const { wizard } = sceneStyle(sceneId);
        for (const molecule of this.instance.getMoleculeList()) {
            if (!Object.hasOwn(content.objects.molecules, molecule.uniqueId)) {
                await this.instance.representation.wizard(molecule.uniqueId, wizard, false);
            }
        }
        this.reportMissingMolecules(sceneId, content);
        this.instance.dispatch(sceneShown());
    }

    /**
     * Show the scene's vectors and 3D shapes, if it has them (an older scene keeps the shown ones).
     * A list already shown is left alone, so it is not redrawn.
     */
    private showAnnotations(content: SceneContent) {
        const { vectors, threeDObjects, generalStates } = this.instance.store.getState();
        const { vectors: sceneVectors, threeDObjects: sceneObjects } = content.sections;
        if (sceneVectors && JSON.stringify(sceneVectors) !== JSON.stringify(vectors.vectorsList)) {
            this.instance.dispatch(emptyVectors());
            // Copies: the scene's are frozen in the store, the shown ones can be edited
            this.instance.dispatch(addVectors(structuredClone(sceneVectors)));
        }
        if (sceneObjects && JSON.stringify(sceneObjects) !== JSON.stringify(threeDObjects.objects)) {
            this.instance.dispatch(emptyObjects());
            structuredClone(sceneObjects).forEach(object => this.instance.dispatch(addObject(object)));
            // The selected shape (its handles) may not be in this scene
            const selected = generalStates.selectedThreeDObjectId;
            if (selected && !sceneObjects.some(object => object.uniqueId === selected)) this.instance.dispatch(setSelectedThreeDObject(null));
        }
    }

    /**
     * Order the custom representations (in the store and in each molecule's own list) as the scene
     * lists them, as if they were all rebuilt: kept ones would otherwise stay where they were.
     * @param uniqueIds - The scene's representations, in its order.
     */
    private putInSceneOrder(uniqueIds: string[]) {
        const rank = new Map(uniqueIds.map((uniqueId, index) => [uniqueId, index]));
        const inScene = (representation: MoleculeRepresentation) => representation.isCustom && rank.has(representation.uniqueId);
        const byRank = (a: MoleculeRepresentation, b: MoleculeRepresentation) => rank.get(a.uniqueId) - rank.get(b.uniqueId);
        const custom: MoleculeRepresentation[] = this.instance.store.getState().molecules.customRepresentations;
        const ordered = [...custom.filter(rep => !inScene(rep)), ...custom.filter(inScene).sort(byRank)];
        if (ordered.some((rep, index) => rep !== custom[index])) {
            ordered.forEach(rep => this.instance.dispatch(removeCustomRepresentation(rep)));
            ordered.forEach(rep => this.instance.dispatch(addCustomRepresentation(rep)));
        }
        for (const molecule of this.instance.getMoleculeList()) {
            const others = molecule.representations.filter(rep => !inScene(rep));
            molecule.representations = [...others, ...molecule.representations.filter(inScene).sort(byRank)];
        }
    }

    /**
     * Give a molecule other default colour rules (null: Coot's), and redraw its own (not custom)
     * representations that use them, as the colour rules card does. Custom ones are rebuilt by the
     * scene switch, since their drawn key includes these rules.
     */
    private async setDefaultColourRules(molecule: MoorhenMolecule, rules: ColourRuleData[] | null) {
        if (rules === null) {
            molecule.defaultColourRules = null;
            await molecule.fetchDefaultColourRules();
        } else {
            molecule.defaultColourRules = rules.map(rule => ColourRule.initFromDataObject(rule, this.instance.commandCentre, molecule));
        }
        for (const representation of molecule.representations.filter(rep => !rep.isCustom && rep.useDefaultColourRules)) {
            if (representation.visible) await representation.redraw();
            else representation.deleteBuffers();
        }
    }

    /** Warn about molecules the scene was saved with that are not loaded any more */
    private reportMissingMolecules(sceneId: string, content: SceneContent) {
        const missing = Object.entries(content.objects.molecules)
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
        if (saveCurrentScene) this.recordScene(this.selected);
        const content = this.contentOf(sceneId);
        if (content) {
            await this.showScene(sceneId, content);
        } else {
            // A scene visited for the first time (e.g. Custom) starts as a copy of the current one,
            // but draws new molecules in its own style
            this.setContent(sceneId, this.capture());
            this.applyDefaultStyle(sceneId);
        }
    }
}
