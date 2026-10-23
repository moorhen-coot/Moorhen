import type { SceneSettingsSnapshot } from "../store/sceneSettingsSlice";
import type { UserScene } from "../store/userScenesSlice";
import type { RepresentationBackup } from "../utils/Representation/RepresentationBuilder";

/** Version of the scene data format saved in session files ({@link UserSceneState}) */
export const USER_SCENE_FORMAT_VERSION = 1;

export type SceneCamera = { origin: [number, number, number]; zoom: number; quat: number[] };

export type SceneSections = {
    representations: { moleculeUniqueId: string; params: RepresentationBackup }[];
    /** Scene settings that differ from the defaults (lighting, background, effects...) */
    sceneSettings: SceneSettingsSnapshot;
    /** Sections this version does not know (read from a newer file): saved back unchanged */
    [section: string]: unknown;
};

/**
 * The content of a scene or snapshot, laid out as in session files. The content lives in named
 * sections so new kinds of data (maps, colour rules, vectors...) can be added without changing the
 * format: a section that is missing (older file) falls back to its default, and an unknown one
 * (newer file) is kept as is.
 */
export type SceneBackup = {
    /** Not for built-in scenes: the built-in scene this one was made from, whose default style new molecules get */
    baseScene?: string;
    /** Snapshots only: the camera when the snapshot was taken */
    camera?: SceneCamera;
    /**
     * The molecules present when the scene was saved (uid: name), so molecules loaded later can be
     * told apart, and missing ones can be reported by name
     */
    objects: { molecules: { [uniqueId: string]: string } };
    sections: SceneSections;
};

/** A scene or snapshot as saved in a session file */
export type UserSceneFileEntry = {
    id: string;
    name: string;
    baseScene?: string;
    camera?: SceneCamera;
    objects?: { molecules?: { [uniqueId: string]: string } };
    /** Absent for a scene that was never shown, which starts as a copy of the current scene */
    sections?: Partial<SceneSections>;
};

/** All the scenes and snapshots, as saved in session files (`sceneData`) */
export type UserSceneState = {
    formatVersion: number;
    selectedScene: string;
    scenes: UserSceneFileEntry[];
    snapshots: UserSceneFileEntry[];
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const isNumberArray = (value: unknown, length: number): value is number[] =>
    Array.isArray(value) && value.length === length && value.every(item => typeof item === "number");

export const emptyBackup = (sceneSettings: SceneSettingsSnapshot): SceneBackup => ({
    objects: { molecules: {} },
    sections: { representations: [], sceneSettings },
});

export const toFileEntry = (scene: UserScene, backup: SceneBackup | undefined): UserSceneFileEntry => ({
    id: scene.id,
    name: scene.name,
    ...backup,
});

/** Read a saved entry, dropping anything malformed. Returns undefined when it has no saved content */
export const fromFileEntry = (entry: UserSceneFileEntry): SceneBackup | undefined => {
    if (!isObject(entry.sections)) return undefined;
    const { representations, sceneSettings } = entry.sections;
    const molecules = isObject(entry.objects?.molecules) ? entry.objects.molecules : {};
    const backup: SceneBackup = {
        objects: {
            molecules: Object.fromEntries(Object.entries(molecules).filter(([, name]) => typeof name === "string")),
        },
        sections: {
            ...entry.sections,
            representations: Array.isArray(representations)
                ? representations.filter(item => isObject(item) && typeof item.moleculeUniqueId === "string" && isObject(item.params))
                : [],
            sceneSettings: isObject(sceneSettings) ? sceneSettings : {},
        },
    };
    if (typeof entry.baseScene === "string") backup.baseScene = entry.baseScene;
    const camera = entry.camera;
    if (isObject(camera) && isNumberArray(camera.origin, 3) && typeof camera.zoom === "number" && isNumberArray(camera.quat, 4)) {
        backup.camera = { origin: [...camera.origin] as [number, number, number], zoom: camera.zoom, quat: [...camera.quat] };
    }
    return backup;
};

/** Keep the entries with a usable id and name */
export const readSceneList = (entries: unknown, keep: (id: string) => boolean): UserSceneFileEntry[] =>
    Array.isArray(entries)
        ? entries.filter(
              (entry): entry is UserSceneFileEntry =>
                  isObject(entry) && typeof entry.id === "string" && typeof entry.name === "string" && keep(entry.id)
          )
        : [];
