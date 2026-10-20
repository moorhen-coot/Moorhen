import { expect, test, type Page } from "@playwright/test";
import { startAndGetInstance, waitForWebGLRenderSettle } from "./helpers";

/**
 * Map display through session files: safety net before map display becomes one record per map
 * (see .roadmaps/map-display.md, Phase 0).
 *
 * tests/test_data/session/1.0.1.pb was saved by Moorhen 1.0.1 (session v23, data embedded): one molecule,
 * two visible maps from the same MTZ, "map-1 " and "map-1 - diff" (difference map). Both at radius 15,
 * "lines", no colour or alpha set (the defaults are used).
 */

const PRE_SCENE_SESSION = { url: "/tests/test_data/session/1.0.1.pb", filename: "1.0.1.pb" };

type MapDisplaySummary = {
    uniqueId: string;
    name: string;
    isDifference: boolean;
    visible: boolean;
    contourLevel: number;
    radius: number;
    style: string;
    alpha: number;
    colour: { r: number; g: number; b: number };
    positiveColour: { r: number; g: number; b: number };
    negativeColour: { r: number; g: number; b: number };
};

/** What each loaded map displays, by uid: store values as `MoorhenMap.getMapContourParams()` resolves them */
const getMapDisplays = (page: Page): Promise<MapDisplaySummary[]> =>
    page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const state = instance.store.getState();
        return state.maps
            .map((map: any) => {
                const params = map.getMapContourParams();
                return {
                    uniqueId: map.uniqueId,
                    name: map.name,
                    isDifference: map.isDifference,
                    visible: state.mapContourSettings.visibleMaps.includes(map.molNo),
                    contourLevel: params.contourLevel,
                    radius: params.mapRadius,
                    style: params.mapStyle,
                    alpha: params.mapAlpha,
                    colour: params.mapColour,
                    positiveColour: params.positiveMapColour,
                    negativeColour: params.negativeMapColour,
                };
            })
            .sort((a: MapDisplaySummary, b: MapDisplaySummary) => a.name.localeCompare(b.name));
    });

/** The maps as stored in the fixture */
const getStoredMaps = (page: Page) =>
    page.evaluate(async url => {
        const { moorhensession } = await import("/src/protobuf/MoorhenSession.js");
        const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
        const session = moorhensession.Session.toObject(moorhensession.Session.decode(bytes));
        return session.mapData
            .map((map: any) => ({
                uniqueId: map.uniqueId as string,
                name: map.name as string,
                isDifference: Boolean(map.isDifference),
                visible: Boolean(map.showOnLoad),
                contourLevel: map.contourLevel as number,
                radius: map.radius as number,
                style: map.style as string,
            }))
            .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
    }, PRE_SCENE_SESSION.url);

/** Map managers set the initial display when they mount, after the maps reach the store: wait until drawn */
const waitForMapsDrawn = async (page: Page, uniqueIds: string[]) => {
    await expect
        .poll(async () => (await getMapDisplays(page)).map(map => map.uniqueId).sort(), { timeout: 120_000 })
        .toEqual([...uniqueIds].sort());
    await waitForWebGLRenderSettle(page, { timeoutMs: 60_000 });
};

test.describe("Map display in session files", () => {
    test.beforeEach(({ browserName }) => {
        test.skip(browserName !== "chromium", "Session loading is browser independent; run once");
    });

    test("a session restores each map's uid and display", async ({ page }) => {
        test.setTimeout(180_000);
        const moorhen = await startAndGetInstance(page);
        const stored = await getStoredMaps(page);
        expect(stored.map(map => map.name)).toEqual(["map-1 ", "map-1 - diff"]);

        await moorhen.loadFiles([PRE_SCENE_SESSION]);
        await waitForMapsDrawn(page, stored.map(map => map.uniqueId));

        const displays = await getMapDisplays(page);
        displays.forEach((display, index) => {
            const expected = stored[index];
            expect(display.uniqueId).toBe(expected.uniqueId);
            expect(display.isDifference).toBe(expected.isDifference);
            expect(display.visible).toBe(expected.visible);
            expect(display.contourLevel).toBeCloseTo(expected.contourLevel, 5);
            expect(display.style).toBe(expected.style);
            // No alpha or colour in the file: defaults
            expect(display.alpha).toBe(1);
        });
    });

    test("map display survives a protobuf save and reload", async ({ page }) => {
        test.setTimeout(240_000);
        const moorhen = await startAndGetInstance(page);
        await moorhen.loadFiles([PRE_SCENE_SESSION]);
        const stored = await getStoredMaps(page);
        await waitForMapsDrawn(page, stored.map(map => map.uniqueId));

        // Change every setting of the difference map, so the round trip carries non-default values
        const diffMapUid = stored.find(map => map.isDifference).uniqueId;
        await page.evaluate(async uniqueId => {
            const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
            const { setContourLevel, setMapRadius, setMapStyle, setMapAlpha, setPositiveMapColours, setNegativeMapColours } =
                await import("/src/store/index.ts");
            const map = instance.store.getState().maps.find((item: any) => item.uniqueId === uniqueId);
            instance.dispatch(setContourLevel({ molNo: map.molNo, contourLevel: 0.6 }));
            instance.dispatch(setMapRadius({ molNo: map.molNo, radius: 21 }));
            instance.dispatch(setMapStyle({ molNo: map.molNo, style: "lit-lines" }));
            instance.dispatch(setMapAlpha({ molNo: map.molNo, alpha: 0.5 }));
            instance.dispatch(setPositiveMapColours({ molNo: map.molNo, rgb: { r: 0, g: 255, b: 0 } }));
            instance.dispatch(setNegativeMapColours({ molNo: map.molNo, rgb: { r: 255, g: 0, b: 255 } }));
        }, diffMapUid);
        await waitForWebGLRenderSettle(page, { timeoutMs: 60_000 });
        const before = await getMapDisplays(page);

        const status = await page.evaluate(async () => {
            const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
            const { moorhensession } = await import("/src/protobuf/MoorhenSession.js");
            const { MoorhenTimeCapsule } = await import("/src/utils/MoorhenTimeCapsule.ts");
            const session = await instance.getTimeCapsuleRef().current.fetchSession(true);
            const bytes = moorhensession.Session.encode(moorhensession.Session.fromObject(session)).finish();
            const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
            return MoorhenTimeCapsule.loadSessionFromArrayBuffer(buffer, instance);
        });
        expect(status).toBe(0);
        await waitForMapsDrawn(page, stored.map(map => map.uniqueId));

        const after = await getMapDisplays(page);
        expect(after.map(map => map.uniqueId)).toEqual(before.map(map => map.uniqueId));
        after.forEach((display, index) => {
            const expected = before[index];
            expect(display.visible).toBe(expected.visible);
            expect(display.contourLevel).toBeCloseTo(expected.contourLevel, 5);
            expect(display.style).toBe(expected.style);
            expect(display.alpha).toBeCloseTo(expected.alpha, 5);
            expect(display.colour).toEqual(expected.colour);
            expect(display.positiveColour).toEqual(expected.positiveColour);
            expect(display.negativeColour).toEqual(expected.negativeColour);
        });
        const diffMap = after.find(map => map.uniqueId === diffMapUid);
        expect(diffMap.contourLevel).toBeCloseTo(0.6, 5);
        expect(diffMap.style).toBe("lit-lines");
        expect(diffMap.alpha).toBeCloseTo(0.5, 5);
    });

    test("map radius survives a session load and a save and reload", async ({ page }) => {
        // Known bug: the MoorhenMapManager mount effect sets the radius to suggestedRadius * 1.2, and session
        // load sets suggestedRadius to the saved radius, so every load grows it by 20% (15 -> 18 -> 21.6).
        // Goes away with map display defaults computed at map load (.roadmaps/map-display.md); drop test.fail() then.
        test.fail();
        test.setTimeout(240_000);
        const moorhen = await startAndGetInstance(page);
        await moorhen.loadFiles([PRE_SCENE_SESSION]);
        const stored = await getStoredMaps(page);
        await waitForMapsDrawn(page, stored.map(map => map.uniqueId));
        expect((await getMapDisplays(page)).map(map => map.radius)).toEqual(stored.map(map => map.radius));

        await page.evaluate(async () => {
            const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
            const { moorhensession } = await import("/src/protobuf/MoorhenSession.js");
            const { MoorhenTimeCapsule } = await import("/src/utils/MoorhenTimeCapsule.ts");
            const session = await instance.getTimeCapsuleRef().current.fetchSession(true);
            const bytes = moorhensession.Session.encode(moorhensession.Session.fromObject(session)).finish();
            const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
            return MoorhenTimeCapsule.loadSessionFromArrayBuffer(buffer, instance);
        });
        await waitForMapsDrawn(page, stored.map(map => map.uniqueId));
        expect((await getMapDisplays(page)).map(map => map.radius)).toEqual(stored.map(map => map.radius));
    });
});
