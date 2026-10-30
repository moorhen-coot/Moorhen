import type { RootState } from "@/store";
import { PER_SCENE_PREFERENCE_KEYS, type PerSceneKey } from "@/store/sceneSettingsSlice";
import { BUILT_IN_SCENE_IDS, builtInSceneDefaults, setSavedSceneSetting, type BuiltInSceneId } from "@/store/userScenesSlice";
import type { PreferenceEntry } from "./PreferencesList";

/** The preference label of a built-in scene's setting, e.g. "Overview.doSSAO" */
export const sceneKey = (sceneId: BuiltInSceneId, key: PerSceneKey): string => `${sceneId}.${key}`;

/**
 * Versions of the per-scene preferences (1 when not listed). Bump a scene's version of a setting
 * when changing its default in that scene: values saved under an older version are reset.
 */
const SCENE_PREFERENCE_VERSIONS: Partial<Record<BuiltInSceneId, Partial<Record<PerSceneKey, number>>>> = {};

const sceneVersion = (sceneId: BuiltInSceneId, key: PerSceneKey) => SCENE_PREFERENCE_VERSIONS[sceneId]?.[key] ?? 1;

/** The saved settings of the built-in scenes, as preferences ("Overview.doSSAO", "Model Building.doSSAO"...) */
export const SCENE_PREFERENCES: PreferenceEntry[] = BUILT_IN_SCENE_IDS.flatMap(sceneId => {
    const defaults = builtInSceneDefaults(sceneId);
    return PER_SCENE_PREFERENCE_KEYS.map(
        (key): PreferenceEntry => ({
            label: sceneKey(sceneId, key),
            valueSetter: value => setSavedSceneSetting({ sceneId, key, value }),
            selector: (state: RootState) => state.userScenes.savedSceneSettings[sceneId][key],
            defaultValue: defaults[key],
            version: sceneVersion(sceneId, key),
        })
    );
});
