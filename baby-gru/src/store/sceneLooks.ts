import { type SceneSettingsSnapshot, type SceneSettingsState, getSceneSettingsSnapshot, initialState } from "./sceneSettingsSlice";

/**
 * A ready-made look for a scene: lighting and screen effects (ambient occlusion, edge outlines,
 * shadows, depth blur). Applying one changes only these settings; background, fog, clipping and
 * the rest of the scene are left as they are.
 */
export type SceneLook = {
    id: string;
    label: string;
    description: string;
    settings: Required<Pick<SceneSettingsSnapshot, LookKey>>;
};

/** The settings a look decides. Every look sets all of them, so applying one undoes the last */
const LOOK_KEYS = [
    "lightPosition",
    "ambient",
    "diffuse",
    "specular",
    "specularPower",
    "doSSAO",
    "ssaoRadius",
    "ssaoBias",
    "doEdgeDetect",
    "edgeDetectDepthThreshold",
    "edgeDetectNormalThreshold",
    "edgeDetectDepthScale",
    "edgeDetectNormalScale",
    "doShadow",
    "useOffScreenBuffers",
    "depthBlurRadius",
    "depthBlurDepth",
] as const satisfies readonly (keyof SceneSettingsState)[];

type LookKey = (typeof LOOK_KEYS)[number];

const grey = (value: number): [number, number, number, number] => [value, value, value, 1];

/** Moorhen's own look: every look starts from it and changes what it is about */
const CLASSIC = Object.fromEntries(LOOK_KEYS.map(key => [key, initialState[key]])) as SceneLook["settings"];

export const SCENE_LOOKS: SceneLook[] = [
    {
        id: "classic",
        label: "Classic",
        description: "Moorhen's default lighting, no effects",
        settings: CLASSIC,
    },
    {
        id: "goodsell",
        label: "Goodsell",
        description: "Flat colours with dark outlines, in the style of David Goodsell's illustrations",
        settings: {
            ...CLASSIC,
            ambient: grey(0.9),
            diffuse: grey(0.15),
            specular: grey(0),
            // Thick silhouette lines only: a depth step of 1 A, sampled 4 pixels apart
            doEdgeDetect: true,
            edgeDetectDepthThreshold: 1.0,
            edgeDetectDepthScale: 4,
            edgeDetectNormalScale: 0,
        },
    },
    {
        id: "cartoon",
        label: "Cartoon",
        description: "Soft flat shading with outlines and cast shadows",
        settings: {
            ...CLASSIC,
            ambient: grey(0.55),
            diffuse: grey(0.55),
            specular: grey(0.1),
            specularPower: 16,
            // Medium lines on silhouettes and on creases (normal edges)
            doEdgeDetect: true,
            edgeDetectDepthScale: 3,
            edgeDetectNormalScale: 1,
            doShadow: true,
        },
    },
    {
        id: "studio",
        label: "Studio",
        description: "Soft light with ambient occlusion and shadows, no outlines",
        settings: {
            ...CLASSIC,
            ambient: grey(0.35),
            diffuse: grey(0.8),
            specular: grey(0.3),
            specularPower: 32,
            doSSAO: true,
            doShadow: true,
        },
    },
    {
        id: "glossy",
        label: "Glossy",
        description: "Strong highlights, no effects",
        settings: {
            ...CLASSIC,
            // Broad, strong highlights over darker shading
            ambient: grey(0.1),
            diffuse: grey(0.7),
            specular: grey(1),
            specularPower: 12,
        },
    },
    {
        id: "depth-of-field",
        label: "Depth of field",
        description: "Moorhen's default lighting, blurring what is far from the centre of the view",
        settings: {
            ...CLASSIC,
            useOffScreenBuffers: true,
        },
    },
];

/**
 * The scene settings with a look applied: the look's settings over the current ones, as a snapshot
 * for applySceneSettingsSnapshot.
 * @param sceneSettings - The current `sceneSettings` state.
 */
export const withLook = (sceneSettings: SceneSettingsState, look: SceneLook): SceneSettingsSnapshot => ({
    ...getSceneSettingsSnapshot(sceneSettings),
    ...structuredClone(look.settings),
});

/** The look the settings currently have, if any: to show it as selected */
export const currentLook = (sceneSettings: SceneSettingsState): SceneLook | undefined =>
    SCENE_LOOKS.find(look =>
        LOOK_KEYS.every(key => JSON.stringify(sceneSettings[key]) === JSON.stringify(look.settings[key]))
    );
