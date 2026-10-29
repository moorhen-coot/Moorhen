import type { RepresentationBackup } from "../utils/Representation/RepresentationBuilder";
import type { SceneSettingsSnapshot } from "./sceneSettingsSlice";
import type { UserScene } from "./userScenesSlice";

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
 * What a scene or snapshot shows, laid out as in session files. The content lives in named
 * sections so new kinds of data (maps, colour rules, vectors...) can be added without changing the
 * format: a section that is missing (older file) falls back to its default, and an unknown one
 * (newer file) is kept as is.
 */
export type SceneContent = {
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

/** No saved representations (every molecule gets the scene's default style when shown) */
export const emptyContent = (sceneSettings: SceneSettingsSnapshot): SceneContent => ({
    objects: { molecules: {} },
    sections: { representations: [], sceneSettings },
});

export const toFileEntry = ({ id, name, content }: UserScene): UserSceneFileEntry => ({ id, name, ...content });

/** Read a saved entry, dropping anything malformed. Its content is undefined when it has none saved */
export const fromFileEntry = (entry: UserSceneFileEntry): UserScene => {
    const scene: UserScene = { id: entry.id, name: entry.name };
    if (!isObject(entry.sections)) return scene;
    const { representations, sceneSettings } = entry.sections;
    const molecules = isObject(entry.objects?.molecules) ? entry.objects.molecules : {};
    const content: SceneContent = {
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
    const camera = entry.camera;
    if (isObject(camera) && isNumberArray(camera.origin, 3) && typeof camera.zoom === "number" && isNumberArray(camera.quat, 4)) {
        content.camera = { origin: [...camera.origin] as [number, number, number], zoom: camera.zoom, quat: [...camera.quat] };
    }
    return { ...scene, content };
};

/** Read the entries with a usable id and name */
export const readSceneList = (entries: unknown, keep: (id: string) => boolean): UserScene[] =>
    Array.isArray(entries)
        ? entries
              .filter(
                  (entry): entry is UserSceneFileEntry =>
                      isObject(entry) && typeof entry.id === "string" && typeof entry.name === "string" && keep(entry.id)
              )
              .map(fromFileEntry)
        : [];
