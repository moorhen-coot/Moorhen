import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
    initialState as sceneSettingsInitialState,
    PER_SCENE_PREFERENCE_KEYS,
    type PerSceneKey,
    type PerSceneSettings,
    type SceneSettingsSnapshot,
    isSameSceneSettingValue,
    isValidSceneSettingValue,
} from "./sceneSettingsSlice";
import { type SceneContent, emptyContent } from "./userSceneFormat";

/** A scene or snapshot listed in the scene selector (see MoorhenInstance.userScene) */
export type UserScene = {
    id: string;
    name: string;
    /**
     * What the scene shows when selected (for the shown scene: what it showed when last recorded,
     * on leaving it or saving the session). Absent for a scene never shown, which starts as a copy
     * of the shown one.
     */
    content?: SceneContent;
};

/** Scenes that ship with Moorhen: they cannot be deleted and their settings are user preferences */
export const BUILT_IN_SCENE_IDS = ["Default", "Model Building"] as const;

export type BuiltInSceneId = (typeof BUILT_IN_SCENE_IDS)[number];

/**
 * The scene the movie plays in. There is only one movie at a time, so only one movie scene: it is
 * created as a copy of the scene shown when the first keyframe is captured, and any later movie
 * plays in it too.
 */
export const MOVIE_SCENE_ID = "movie";

export const isBuiltInScene = (sceneId: string): sceneId is BuiltInSceneId => (BUILT_IN_SCENE_IDS as readonly string[]).includes(sceneId);

const { fogClipOffset } = sceneSettingsInitialState;

/**
 * What each built-in scene changes from the default scene settings: "Default" is figure making
 * (fixed clipping and fog), "Model Building" has clipping and fog following the zoom.
 */
const BUILT_IN_SCENE_PRESETS: Record<BuiltInSceneId, SceneSettingsSnapshot> = {
    Default: {
        resetClippingFogging: false,
        clipStart: 40,
        clipEnd: 40,
        fogStart: fogClipOffset - 2,
        fogEnd: fogClipOffset + 120,
    },
    "Model Building": {
        resetClippingFogging: true,
    },
};

/** The default values of a built-in scene's per-scene preferences */
export const builtInSceneDefaults = (sceneId: BuiltInSceneId): PerSceneSettings => {
    const preset = BUILT_IN_SCENE_PRESETS[sceneId];
    const settings: Record<string, unknown> = {};
    for (const key of PER_SCENE_PREFERENCE_KEYS) {
        const value = Object.hasOwn(preset, key) ? preset[key] : sceneSettingsInitialState[key];
        settings[key] = Array.isArray(value) ? [...value] : value;
    }
    return settings as PerSceneSettings;
};

/**
 * Scene presets and snapshots, driven by MoorhenInstance.userScene, which also saves and restores
 * what each scene shows.
 */
const initialState: {
    scenes: UserScene[];
    snapshots: UserScene[];
    selectedScene: string;
    isSceneChanging: boolean;
    /**
     * Counts the scenes shown (switches, a shown snapshot selected again, resets): what reads
     * per-scene state once and keeps it (the colour rules card) starts again when it changes
     */
    shownRevision: number;
    /**
     * The saved settings of each built-in scene: user preferences, used when Moorhen starts. Only
     * changed by the scene's save button or by restoring / importing preferences, never by editing
     * what is shown.
     */
    savedSceneSettings: Record<BuiltInSceneId, PerSceneSettings>;
} = {
    // Until preferences are restored (userScene.applySavedScenes), built-in scenes start from their defaults
    scenes: BUILT_IN_SCENE_IDS.map(id => ({ id, name: id, content: emptyContent(builtInSceneDefaults(id)) })),
    snapshots: [],
    selectedScene: "Default",
    isSceneChanging: false,
    shownRevision: 0,
    savedSceneSettings: {
        Default: builtInSceneDefaults("Default"),
        "Model Building": builtInSceneDefaults("Model Building"),
    },
};

const userScenesSlice = createSlice({
    name: "userScenes",
    initialState,
    reducers: {
        addUserScene: (state, action: PayloadAction<UserScene>) => {
            state.scenes.push(action.payload);
        },
        addUserSnapshot: (state, action: PayloadAction<UserScene>) => {
            state.snapshots.push(action.payload);
        },
        /* Remove a scene or a snapshot */
        removeUserScene: (state, action: PayloadAction<string>) => {
            state.scenes = state.scenes.filter(scene => scene.id !== action.payload);
            state.snapshots = state.snapshots.filter(snapshot => snapshot.id !== action.payload);
        },
        /* Rename a scene or a snapshot */
        renameUserScene: (state, action: PayloadAction<{ id: string; name: string }>) => {
            const scene = [...state.scenes, ...state.snapshots].find(scene => scene.id === action.payload.id);
            if (scene) scene.name = action.payload.name;
        },
        setSelectedScene: (state, action: PayloadAction<string>) => {
            state.selectedScene = action.payload;
        },
        setSceneChanging: (state, action: PayloadAction<boolean>) => {
            state.isSceneChanging = action.payload;
        },
        sceneShown: state => {
            state.shownRevision += 1;
        },
        /* Set what a scene or snapshot shows when selected */
        setSceneContent: (state, action: PayloadAction<{ id: string; content: SceneContent }>) => {
            const scene = [...state.scenes, ...state.snapshots].find(scene => scene.id === action.payload.id);
            if (scene) scene.content = action.payload.content;
        },
        /* Replace the scene and snapshot lists and the selection at once (e.g. when loading a session) */
        setUserSceneState: (state, action: PayloadAction<{ scenes: UserScene[]; snapshots: UserScene[]; selectedScene: string }>) => {
            state.scenes = action.payload.scenes;
            state.snapshots = action.payload.snapshots;
            state.selectedScene = action.payload.selectedScene;
        },
        /* Set one saved setting of a built-in scene (restoring a preference). A value of the wrong
        type (corrupted storage, a bad import) is replaced by the scene's default */
        setSavedSceneSetting: (state, action: PayloadAction<{ sceneId: BuiltInSceneId; key: PerSceneKey; value: unknown }>) => {
            const { sceneId, key, value } = action.payload;
            const saved = state.savedSceneSettings[sceneId] as Record<PerSceneKey, unknown>;
            saved[key] = isValidSceneSettingValue(key, value) ? value : builtInSceneDefaults(sceneId)[key];
        },
        /* Replace the saved settings of a built-in scene at once (the scene's save button). Values
        that did not change keep their reference: preference persistence compares by reference, and
        would otherwise report every array setting as changed */
        saveSceneSettings: (state, action: PayloadAction<{ sceneId: BuiltInSceneId; settings: PerSceneSettings }>) => {
            const { sceneId, settings } = action.payload;
            const saved = state.savedSceneSettings[sceneId] as Record<PerSceneKey, unknown>;
            for (const key of PER_SCENE_PREFERENCE_KEYS) {
                if (!isSameSceneSettingValue(saved[key], settings[key])) saved[key] = settings[key];
            }
        },
    },
});

export const {
    addUserScene,
    addUserSnapshot,
    removeUserScene,
    renameUserScene,
    setSelectedScene,
    setSceneChanging,
    sceneShown,
    setSceneContent,
    setUserSceneState,
    setSavedSceneSetting,
    saveSceneSettings,
} = userScenesSlice.actions;

export default userScenesSlice.reducer;
