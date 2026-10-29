import { expect, test, type Page } from "@playwright/test";
import { startAndGetInstance } from "./helpers";

/**
 * Scenes in session files (sceneData, see src/.roadmap/sessions-to-scenes.md).
 *
 * tests/test_data/session/1.0.1.pb was saved by Moorhen 1.0.1, before scenes existed: one molecule
 * (custom CBs + CRs), two maps (one difference map), two vectors. Old sessions must keep loading,
 * into the "Default" scene.
 */

const PRE_SCENE_SESSION = { url: "/tests/test_data/session/1.0.1.pb", filename: "1.0.1.pb" };
const SESSION_MOLECULE_UID = "d2216c9c-ef0d-48f7-9b71-e38b92349348";

type SceneSummary = {
    selectedScene: string;
    scenes: string[];
    snapshots: string[];
    moleculeUids: string[];
    mapCount: number;
    vectorCount: number;
    customRepresentations: string[];
    zoom: number;
};

const getSceneSummary = (page: Page): Promise<SceneSummary> =>
    page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const state = instance.store.getState();
        return {
            selectedScene: state.userScenes.selectedScene,
            scenes: state.userScenes.scenes.map((scene: { name: string }) => scene.name),
            snapshots: state.userScenes.snapshots.map((scene: { name: string }) => scene.name),
            moleculeUids: state.molecules.moleculeList.map((molecule: { uniqueId: string }) => molecule.uniqueId),
            mapCount: state.maps.length,
            vectorCount: state.vectors.vectorsList.length,
            customRepresentations: state.molecules.customRepresentations.map((rep: { style: string }) => rep.style).sort(),
            zoom: state.sceneSettings.zoom,
        };
    });

const loadPreSceneSession = async (page: Page) => {
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([PRE_SCENE_SESSION]);
    await expect
        .poll(async () => {
            const counts = await moorhen.getObjectCounts();
            return counts.moleculeCount === 1 && counts.mapCount === 2;
        }, { timeout: 120_000 })
        .toBe(true);
    // The session restores representations and scenes after the objects. Wait for the whole load:
    // scene switches are refused while it runs (isSceneChanging), and it rebuilds the scenes last
    await expect
        .poll(
            () =>
                page.evaluate(async () => {
                    const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
                    const state = instance.store.getState();
                    return state.molecules.customRepresentations.length === 2 && !state.userScenes.isSceneChanging;
                }),
            { timeout: 60_000 }
        )
        .toBe(true);
    return moorhen;
};

test.describe("Scenes in session files", () => {
    test.beforeEach(({ browserName }) => {
        test.skip(browserName !== "chromium", "Session loading is browser independent; run once");
    });

    test("a session saved before scenes loads into the Default scene", async ({ page }) => {
        test.setTimeout(180_000);
        await loadPreSceneSession(page);

        const summary = await getSceneSummary(page);
        expect(summary.selectedScene).toBe("Default");
        expect(summary.scenes).toEqual(["Default", "Model Building"]);
        expect(summary.snapshots).toEqual([]);
        expect(summary.moleculeUids).toEqual([SESSION_MOLECULE_UID]);
        expect(summary.mapCount).toBe(2);
        expect(summary.vectorCount).toBe(2);
        expect(summary.customRepresentations).toEqual(["CBs", "CRs"]);
        // The session's own view is kept, not replaced by the Default preset
        expect(summary.zoom).toBeCloseTo(0.2661, 3);
    });

    test("scenes and snapshots survive a protobuf save and reload", async ({ page }) => {
        test.setTimeout(240_000);
        await loadPreSceneSession(page);

        const result = await page.evaluate(async () => {
            const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
            const { setZoom } = await import("/src/store/index.ts");
            const { moorhensession } = await import("/src/protobuf/MoorhenSession.js");
            const { MoorhenTimeCapsule } = await import("/src/utils/MoorhenTimeCapsule.ts");

            // A custom scene with an extra representation, a snapshot of it at zoom 0.5, then Model Building
            const customId = await instance.userScene.create("Figure");
            const molecule = instance.getMoleculeList()[0];
            await instance.representation.create(molecule.uniqueId, { representationStyle: "CAs" });
            instance.dispatch(setZoom(0.5));
            const snapshotId = instance.userScene.takeSnapshot("Close-up");
            instance.userScene.rename("Model Building", "Building");
            await instance.userScene.select("Model Building");

            const session = await instance.getTimeCapsuleRef().current.fetchSession(true);
            const bytes = moorhensession.Session.encode(moorhensession.Session.fromObject(session)).finish();
            const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

            // Forget the scenes, then reload the saved session
            instance.userScene.resetForLegacySession();
            const status = await MoorhenTimeCapsule.loadSessionFromArrayBuffer(buffer, instance);
            const state = () => instance.store.getState();
            const afterLoad = {
                status,
                selectedScene: state().userScenes.selectedScene,
                scenes: state().userScenes.scenes.map((scene: { name: string }) => scene.name),
                snapshots: state().userScenes.snapshots.map((scene: { name: string }) => scene.name),
                representations: state().molecules.customRepresentations.map((rep: { style: string }) => rep.style).sort(),
            };
            await instance.userScene.select(customId);
            const customRepresentations = state().molecules.customRepresentations.map((rep: { style: string }) => rep.style).sort();
            await instance.userScene.select(snapshotId);
            return { afterLoad, customRepresentations, snapshotZoom: state().sceneSettings.zoom };
        });

        expect(result.afterLoad.status).toBe(0);
        expect(result.afterLoad.selectedScene).toBe("Model Building");
        expect(result.afterLoad.scenes).toEqual(["Default", "Building", "Figure"]);
        expect(result.afterLoad.snapshots).toEqual(["Close-up"]);
        expect(result.afterLoad.representations).toEqual(["CBs"]);
        expect(result.customRepresentations).toEqual(["CAs", "CBs", "CRs"]);
        expect(result.snapshotZoom).toBeCloseTo(0.5, 5);
    });

    test("sessions from a more recent Moorhen are refused", async ({ page }) => {
        test.setTimeout(180_000);
        await loadPreSceneSession(page);

        const statuses = await page.evaluate(async () => {
            const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
            const { MoorhenTimeCapsule } = await import("/src/utils/MoorhenTimeCapsule.ts");
            const session = await instance.getTimeCapsuleRef().current.fetchSession(false);
            const newerVersion = await MoorhenTimeCapsule.loadSessionFromJsonString(JSON.stringify({ ...session, version: "v99" }), instance);
            const sceneData = JSON.stringify({ ...JSON.parse(session.sceneData), formatVersion: 99 });
            const newerScenes = await MoorhenTimeCapsule.loadSessionFromJsonString(JSON.stringify({ ...session, sceneData }), instance);
            return { newerVersion, newerScenes, expected: MoorhenTimeCapsule.NEWER_VERSION_STATUS };
        });

        expect(statuses.newerVersion).toBe(statuses.expected);
        expect(statuses.newerScenes).toBe(statuses.expected);
        // Refused before touching anything: the loaded session is still there
        expect((await getSceneSummary(page)).moleculeUids).toEqual([SESSION_MOLECULE_UID]);
    });
});
