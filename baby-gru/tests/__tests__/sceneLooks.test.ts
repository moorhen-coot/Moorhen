/*
 * Ready-made looks for a scene (src/store/sceneLooks.ts): a look changes the lighting and effects,
 * and nothing else.
 */
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import { SCENE_LOOKS, currentLook, withLook } from "@/store/sceneLooks";
import { applySceneSettingsSnapshot, setBackgroundColor, setClipStart, setResetClippingFogging, setDoSSAO } from "@/store/sceneSettingsSlice";

const look = (id: string) => SCENE_LOOKS.find(item => item.id === id);

describe("scene looks", () => {
    test("a new scene has the Classic look", () => {
        const store = createMoorhenStore();
        expect(currentLook(store.getState().sceneSettings)?.id).toBe("classic");
    });

    test("applying one changes the lighting and effects only, and is recognised", () => {
        const store = createMoorhenStore();
        store.dispatch(setBackgroundColor([0.1, 0.2, 0.3, 1]));
        store.dispatch(setResetClippingFogging(false));
        store.dispatch(setClipStart(12));

        for (const item of SCENE_LOOKS) {
            store.dispatch(applySceneSettingsSnapshot(withLook(store.getState().sceneSettings, item)));
            const settings = store.getState().sceneSettings;
            expect(currentLook(settings)?.id).toBe(item.id);
            // Left alone
            expect(settings.backgroundColor).toEqual([0.1, 0.2, 0.3, 1]);
            expect(settings.resetClippingFogging).toBe(false);
            expect(settings.clipStart).toBe(12);
        }
    });

    test("each look sets everything a look decides, so one undoes the last", () => {
        const store = createMoorhenStore();
        store.dispatch(applySceneSettingsSnapshot(withLook(store.getState().sceneSettings, look("studio"))));
        expect(store.getState().sceneSettings.doSSAO).toBe(true);
        store.dispatch(applySceneSettingsSnapshot(withLook(store.getState().sceneSettings, look("goodsell"))));
        expect(store.getState().sceneSettings.doSSAO).toBe(false);
        expect(store.getState().sceneSettings.doShadow).toBe(false);
        expect(store.getState().sceneSettings.doEdgeDetect).toBe(true);
    });

    test("a setting changed by hand afterwards means no look is shown as current", () => {
        const store = createMoorhenStore();
        store.dispatch(applySceneSettingsSnapshot(withLook(store.getState().sceneSettings, look("cartoon"))));
        store.dispatch(setDoSSAO(true));
        expect(currentLook(store.getState().sceneSettings)).toBeUndefined();
    });

    test("the looks are all different", () => {
        const settings = SCENE_LOOKS.map(item => JSON.stringify(item.settings));
        expect(new Set(settings).size).toBe(SCENE_LOOKS.length);
    });
});
