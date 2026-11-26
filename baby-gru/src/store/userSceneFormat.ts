import type { ColourRuleData } from "../utils/MoorhenColourRule";
import type { MapRepresentationData } from "../utils/Representation/mapRepresentationData";
import type { RepresentationBackup } from "../utils/Representation/RepresentationBuilder";
import type { SceneSettingsSnapshot } from "./sceneSettingsSlice";
import type { ThreeDObject } from "./threeDObjectsSlice";
import type { UserScene } from "./userScenesSlice";
import type { MoorhenVector } from "./vectorsSlice";

/** Version of the scene data format saved in session files ({@link UserSceneState}) */
export const USER_SCENE_FORMAT_VERSION = 1;

export type SceneCamera = { origin: [number, number, number]; zoom: number; quat: number[] };

/**
 * What a scene sets on each molecule (by uid) for all its representations that use the molecule's
 * defaults. `colourRules` null: Coot's default colours. A molecule missing from the section (loaded
 * after the scene was saved, or an older file) keeps its current defaults.
 */
export type MoleculeDefaults = { [moleculeUniqueId: string]: { colourRules: ColourRuleData[] | null } };

export type SceneSections = {
    representations: { moleculeUniqueId: string; params: RepresentationBackup }[];
    /** Scene settings that differ from the defaults (lighting, background, effects...) */
    sceneSettings: SceneSettingsSnapshot;
    /** Absent in scenes saved before it existed */
    moleculeDefaults?: MoleculeDefaults;
    /** The vectors (arrows, distances...) the scene shows. Absent (older scene): the shown ones are kept */
    vectors?: MoorhenVector[];
    /** The 3D shapes the scene shows. Absent (older scene): the shown ones are kept */
    threeDObjects?: ThreeDObject[];
    /**
     * How the scene shows each map: the map representation records (map-display.md) of the maps in `objects.maps`.
     * Absent (older scene): the shown ones are kept. A map loaded after the scene was saved keeps its own.
     */
    maps?: MapRepresentationData[];
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
    objects: {
        molecules: { [uniqueId: string]: string };
        /** The maps present when the scene was saved (uid: name). Absent in scenes saved before maps were in scenes */
        maps?: { [uniqueId: string]: string };
    };
    sections: SceneSections;
};

/** A scene or snapshot as saved in a session file */
export type UserSceneFileEntry = {
    id: string;
    name: string;
    camera?: SceneCamera;
    objects?: { molecules?: { [uniqueId: string]: string }; maps?: { [uniqueId: string]: string } };
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

/** Keep the objects of a list that have a unique id (vectors, 3D shapes) */
const readIdentified = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value) ? value.filter(item => isObject(item) && typeof item.uniqueId === "string") : [];

/** Whether a value has what ColourRule.initFromDataObject reads, so applying it cannot fail mid-switch */
const isColourRuleData = (rule: unknown): boolean =>
    isObject(rule) &&
    typeof rule.ruleType === "string" &&
    typeof rule.cid === "string" &&
    typeof rule.color === "string" &&
    (rule.isMultiColourRule !== true || (Array.isArray(rule.args) && typeof rule.args[0] === "string"));

/** Keep the molecules whose colour rules are a list of valid rules, or null */
const readMoleculeDefaults = (value: unknown): MoleculeDefaults =>
    isObject(value)
        ? (Object.fromEntries(
              Object.entries(value).filter(
                  ([, defaults]) =>
                      isObject(defaults) &&
                      (defaults.colourRules === null ||
                          (Array.isArray(defaults.colourRules) && defaults.colourRules.every(isColourRuleData)))
              )
          ) as MoleculeDefaults)
        : {};

const isNumberRecord = (value: unknown): value is Record<string, number> =>
    isObject(value) && Object.values(value).every(item => typeof item === "number");

const isColour = (value: unknown) => value === null || (isObject(value) && ["r", "g", "b"].every(key => typeof value[key] === "number"));

/**
 * Keep the map records that can be drawn: an id, a map uid, a level, radii and opacities as numbers. Fields added
 * after the file was written (or missing, or malformed) get their defaults: no colours of their own, no colouring
 * map, unlocked, no slice.
 */
const readMapRecords = (value: unknown): MapRepresentationData[] =>
    Array.isArray(value)
        ? value
              .filter(
                  item =>
                      isObject(item) &&
                      typeof item.id === "string" &&
                      typeof item.mapUid === "string" &&
                      typeof item.contourLevel === "number" &&
                      typeof item.style === "string" &&
                      isNumberRecord(item.radius) &&
                      isNumberRecord(item.alpha)
              )
              .map(item => ({
                  ...(item as unknown as MapRepresentationData),
                  visible: item.visible !== false,
                  colour: isColour(item.colour) ? (item.colour as MapRepresentationData["colour"]) : null,
                  positiveColour: isColour(item.positiveColour) ? (item.positiveColour as MapRepresentationData["colour"]) : null,
                  negativeColour: isColour(item.negativeColour) ? (item.negativeColour as MapRepresentationData["colour"]) : null,
                  colourByMap:
                      isObject(item.colourByMap) && typeof item.colourByMap.mapUid === "string" && Array.isArray(item.colourByMap.gradient)
                          ? (item.colourByMap as MapRepresentationData["colourByMap"])
                          : null,
                  originLock:
                      isObject(item.originLock) && isNumberArray(item.originLock.centre, 3)
                          ? (item.originLock as MapRepresentationData["originLock"])
                          : null,
                  slice:
                      isObject(item.slice) && isNumberArray(item.slice.origin, 3) && isNumberArray(item.slice.orientation, 16)
                          ? (item.slice as MapRepresentationData["slice"])
                          : null,
              }))
        : [];

const readNames = (value: unknown): { [uniqueId: string]: string } =>
    isObject(value) ? Object.fromEntries(Object.entries(value).filter(([, name]) => typeof name === "string")) as { [uniqueId: string]: string } : {};

/** Read a saved entry, dropping anything malformed. Its content is undefined when it has none saved */
export const fromFileEntry = (entry: UserSceneFileEntry): UserScene => {
    const scene: UserScene = { id: entry.id, name: entry.name };
    if (!isObject(entry.sections)) return scene;
    const { representations, sceneSettings, moleculeDefaults, vectors, threeDObjects, maps } = entry.sections;
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
    if (moleculeDefaults !== undefined) content.sections.moleculeDefaults = readMoleculeDefaults(moleculeDefaults);
    if (maps !== undefined) {
        content.sections.maps = readMapRecords(maps);
        content.objects.maps = readNames(entry.objects?.maps);
    }
    if (vectors !== undefined) content.sections.vectors = readIdentified(vectors) as unknown as MoorhenVector[];
    if (threeDObjects !== undefined)
        content.sections.threeDObjects = readIdentified(threeDObjects).filter(
            item => typeof item.type === "string"
        ) as unknown as ThreeDObject[];
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
