import { PayloadAction, createSlice } from "@reduxjs/toolkit";

/** A scene or snapshot listed in the scene selector (see MoorhenInstance.userScene) */
export type UserScene = { id: string; name: string };

/**
 * Scene presets and snapshots, driven by MoorhenInstance.userScene, which also saves and restores
 * what each scene shows.
 */
const initialState: {
    scenes: UserScene[];
    /** Immutable snapshots of a scene, including the camera (listed under the scenes) */
    snapshots: UserScene[];
    /** The id of the scene or snapshot currently shown */
    selectedScene: string;
    isSceneChanging: boolean;
} = {
    scenes: [
        { id: "Default", name: "Default" },
        { id: "Model Building", name: "Model Building" },
    ],
    snapshots: [],
    selectedScene: "Default",
    isSceneChanging: false,
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
        /* Replace the scene and snapshot lists and the selection at once (e.g. when loading a session) */
        setUserSceneState: (state, action: PayloadAction<{ scenes: UserScene[]; snapshots: UserScene[]; selectedScene: string }>) => {
            state.scenes = action.payload.scenes;
            state.snapshots = action.payload.snapshots;
            state.selectedScene = action.payload.selectedScene;
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
    setUserSceneState,
} = userScenesSlice.actions;

export default userScenesSlice.reducer;
