import { expect, test, type Page } from "@playwright/test";
import { startAndGetInstance, waitForWebGLRenderSettle } from "./helpers";

/**
 * Map display through session files: safety net before map display becomes one record per map
 * (see .roadmaps/map-display.md, Phase 0).
 *
 * - tests/test_data/session/1.0.1.pb: saved by Moorhen 1.0.1 (session v23), two visible maps from one MTZ,
 *   no colour or alpha set (defaults).
 * - tests/test_data/session/map-display.pb: session v24, five maps with non-default display: map colour,
 *   positive / negative difference colours, alpha, lit-lines and solid styles, an EM map, a map coloured by
 *   the difference map, a hidden difference map.
 */

const PRE_SCENE_SESSION = { url: "/tests/test_data/session/1.0.1.pb", filename: "1.0.1.pb" };
const MAP_DISPLAY_SESSION = { url: "/tests/test_data/session/map-display.pb", filename: "map-display.pb" };

type SessionFile = { url: string; filename: string };
type RGB = { r: number; g: number; b: number };

type MapDisplaySummary = {
    uniqueId: string;
    name: string;
    isDifference: boolean;
    visible: boolean;
    contourLevel: number;
    radius: number;
    style: string;
    alpha: number;
    colour: RGB;
    positiveColour: RGB;
    negativeColour: RGB;
    colouredByMap: boolean;
};

type StoredMap = {
    uniqueId: string;
    name: string;
    isDifference: boolean;
    visible: boolean;
    contourLevel: number;
    radius: number;
    style: string;
    alpha: number;
    colour: RGB | null;
    positiveColour: RGB | null;
    negativeColour: RGB | null;
};

/** What each loaded map displays: store values as `MoorhenMap.getMapContourParams()` resolves them (colours 0-1) */
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
                    colouredByMap: map.otherMapForColouring !== null,
                };
            })
            .sort((a: MapDisplaySummary, b: MapDisplaySummary) => a.name.localeCompare(b.name));
    });

/** The maps as stored in a session file (colours 0-255, as saved) */
const getStoredMaps = (page: Page, session: SessionFile): Promise<StoredMap[]> =>
    page.evaluate(async url => {
        const { moorhensession } = await import("/src/protobuf/MoorhenSession.js");
        const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
        const session = moorhensession.Session.toObject(moorhensession.Session.decode(bytes));
        return session.mapData
            .map((map: any) => ({
                uniqueId: map.uniqueId,
                name: map.name,
                isDifference: Boolean(map.isDifference),
                visible: Boolean(map.showOnLoad),
                contourLevel: map.contourLevel,
                radius: map.radius,
                style: map.style,
                alpha: map.rgba?.a ?? 0,
                colour: map.rgba?.mapColour ?? null,
                positiveColour: map.rgba?.positiveDiffColour ?? null,
                negativeColour: map.rgba?.negativeDiffColour ?? null,
            }))
            .sort((a: StoredMap, b: StoredMap) => a.name.localeCompare(b.name));
    }, session.url);

/** Map managers set the initial display when they mount, after the maps reach the store: wait until drawn */
const waitForMapsDrawn = async (page: Page, uniqueIds: string[]) => {
    await expect
        .poll(async () => (await getMapDisplays(page)).map(map => map.uniqueId).sort(), { timeout: 120_000 })
        .toEqual([...uniqueIds].sort());
    await waitForWebGLRenderSettle(page, { timeoutMs: 60_000 });
};

const loadSession = async (page: Page, session: SessionFile) => {
    const moorhen = await startAndGetInstance(page);
    const stored = await getStoredMaps(page, session);
    await moorhen.loadFiles([session]);
    await waitForMapsDrawn(page, stored.map(map => map.uniqueId));
    return stored;
};

/** Save the current session as protobuf and load it back */
const saveAndReload = (page: Page): Promise<number> =>
    page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const { moorhensession } = await import("/src/protobuf/MoorhenSession.js");
        const { MoorhenTimeCapsule } = await import("/src/utils/MoorhenTimeCapsule.ts");
        const session = await instance.getTimeCapsuleRef().current.fetchSession(true);
        const bytes = moorhensession.Session.encode(moorhensession.Session.fromObject(session)).finish();
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        return MoorhenTimeCapsule.loadSessionFromArrayBuffer(buffer, instance);
    });

const STYLE_ALPHAS = { lines: 0.3, solid: 0.6, "lit-lines": 0.9 };

/** Set an opacity for each style of a map, the way the map card does: select the style, then set its opacity */
const setAlphaPerStyle = (page: Page, uniqueId: string) =>
    page.evaluate(
        async ({ uniqueId, styleAlphas }) => {
            const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
            const { setMapStyle, setMapAlpha } = await import("/src/store/index.ts");
            const map = instance.store.getState().maps.find((item: any) => item.uniqueId === uniqueId);
            for (const [style, alpha] of Object.entries(styleAlphas)) {
                instance.dispatch(setMapStyle({ molNo: map.molNo, style }));
                instance.dispatch(setMapAlpha({ molNo: map.molNo, alpha }));
            }
        },
        { uniqueId, styleAlphas: STYLE_ALPHAS }
    );

/** Select each style of a map in turn and read back the opacity it shows */
const getAlphaPerStyle = (page: Page, uniqueId: string): Promise<Record<string, number>> =>
    page.evaluate(
        async ({ uniqueId, styles }) => {
            const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
            const { setMapStyle } = await import("/src/store/index.ts");
            const map = instance.store.getState().maps.find((item: any) => item.uniqueId === uniqueId);
            const alphas: Record<string, number> = {};
            for (const style of styles) {
                instance.dispatch(setMapStyle({ molNo: map.molNo, style }));
                alphas[style] = map.getMapContourParams().mapAlpha;
            }
            return alphas;
        },
        { uniqueId, styles: ["solid", "lines", "lit-lines"] }
    );

const MODE_RADII = { local: 30, full: 150 };

/** Set a radius for each draw mode of an EM map, the way the map card does: switch local / full map, then set its radius */
const setRadiusPerDrawMode = (page: Page, uniqueId: string) =>
    page.evaluate(
        async ({ uniqueId, modeRadii }) => {
            const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
            const { setMapRadius } = await import("/src/store/index.ts");
            const map = instance.store.getState().maps.find((item: any) => item.uniqueId === uniqueId);
            for (const [mode, radius] of Object.entries(modeRadii)) {
                map.toggleOriginLock(mode === "full");
                instance.dispatch(setMapRadius({ molNo: map.molNo, radius }));
            }
        },
        { uniqueId, modeRadii: MODE_RADII }
    );

/** Switch an EM map to each draw mode in turn and read back the radius it shows */
const getRadiusPerDrawMode = (page: Page, uniqueId: string): Promise<Record<string, number>> =>
    page.evaluate(async uniqueId => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const map = instance.store.getState().maps.find((item: any) => item.uniqueId === uniqueId);
        const radii: Record<string, number> = {};
        for (const mode of ["full", "local"]) {
            map.toggleOriginLock(mode === "full");
            radii[mode] = map.getMapContourParams().mapRadius;
        }
        return radii;
    }, uniqueId);

const toUnitColour = (rgb: RGB): RGB => ({ r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 });

const expectColourCloseTo = (received: RGB, expected: RGB) => {
    expect(received.r).toBeCloseTo(expected.r, 5);
    expect(received.g).toBeCloseTo(expected.g, 5);
    expect(received.b).toBeCloseTo(expected.b, 5);
};

/** Everything but the radius (known bug, tested on its own) */
const expectDisplayMatchesFile = (display: MapDisplaySummary, stored: StoredMap) => {
    expect(display.uniqueId).toBe(stored.uniqueId);
    expect(display.isDifference).toBe(stored.isDifference);
    expect(display.visible).toBe(stored.visible);
    expect(display.contourLevel).toBeCloseTo(stored.contourLevel, 5);
    expect(display.style).toBe(stored.style);
    // proto3 has no "unset" float: a missing alpha reads back as 0, which means the default (1)
    expect(display.alpha).toBeCloseTo(stored.alpha || 1, 5);
    if (stored.colour) expectColourCloseTo(display.colour, toUnitColour(stored.colour));
    if (stored.positiveColour) expectColourCloseTo(display.positiveColour, toUnitColour(stored.positiveColour));
    if (stored.negativeColour) expectColourCloseTo(display.negativeColour, toUnitColour(stored.negativeColour));
};

test.describe("Map display in session files", () => {
    test.beforeEach(({ browserName }) => {
        test.skip(browserName !== "chromium", "Session loading is browser independent; run once");
    });

    for (const session of [PRE_SCENE_SESSION, MAP_DISPLAY_SESSION]) {
        test(`${session.filename}: each map's uid and display are restored`, async ({ page }) => {
            test.setTimeout(180_000);
            const stored = await loadSession(page, session);
            const displays = await getMapDisplays(page);
            expect(displays.map(map => map.name)).toEqual(stored.map(map => map.name));
            displays.forEach((display, index) => expectDisplayMatchesFile(display, stored[index]));
        });
    }

    test("map-display.pb: map display survives a protobuf save and reload", async ({ page }) => {
        test.setTimeout(240_000);
        const stored = await loadSession(page, MAP_DISPLAY_SESSION);
        const before = await getMapDisplays(page);

        expect(await saveAndReload(page)).toBe(0);
        await waitForMapsDrawn(page, stored.map(map => map.uniqueId));

        const after = await getMapDisplays(page);
        expect(after.map(map => map.uniqueId)).toEqual(before.map(map => map.uniqueId));
        after.forEach((display, index) => {
            const expected = before[index];
            expect(display.visible).toBe(expected.visible);
            expect(display.contourLevel).toBeCloseTo(expected.contourLevel, 5);
            expect(display.style).toBe(expected.style);
            expect(display.alpha).toBeCloseTo(expected.alpha, 5);
            expectColourCloseTo(display.colour, expected.colour);
            expectColourCloseTo(display.positiveColour, expected.positiveColour);
            expectColourCloseTo(display.negativeColour, expected.negativeColour);
        });
    });

    test("map-display.pb: map radius survives a session load and a save and reload", async ({ page }) => {
        // Known bug: the MoorhenMapManager mount effect sets the radius to suggestedRadius * 1.2, and session
        // load sets suggestedRadius to the saved radius, so every load grows it by 20% (18 -> 21.6 -> 25.92).
        // Goes away with map display defaults computed at map load (.roadmaps/map-display.md); drop test.fail() then.
        test.fail();
        test.setTimeout(240_000);
        const stored = await loadSession(page, MAP_DISPLAY_SESSION);
        expect((await getMapDisplays(page)).map(map => map.radius)).toEqual(stored.map(map => map.radius));

        expect(await saveAndReload(page)).toBe(0);
        await waitForMapsDrawn(page, stored.map(map => map.uniqueId));
        expect((await getMapDisplays(page)).map(map => map.radius)).toEqual(stored.map(map => map.radius));
    });

    test("map-display.pb: each style keeps its own opacity when switching style", async ({ page }) => {
        // Known gap: one alpha per map in the store; the opacity per style (lines / lit-lines / solid) only lives
        // in MapSettingsAccordion's React state, so it is lost outside the map card. Planned for the map display
        // record (.roadmaps/map-display.md); drop test.fail() then.
        test.fail();
        test.setTimeout(180_000);
        const stored = await loadSession(page, MAP_DISPLAY_SESSION);
        const mapUid = stored.find(map => map.name === "map-1 ").uniqueId;
        await setAlphaPerStyle(page, mapUid);
        expect(await getAlphaPerStyle(page, mapUid)).toEqual(STYLE_ALPHAS);
    });

    test("map-display.pb: each style's opacity survives a protobuf save and reload", async ({ page }) => {
        // Known gap: sessions save one alpha per map (see the test above); drop test.fail() once both are saved.
        test.fail();
        test.setTimeout(240_000);
        const stored = await loadSession(page, MAP_DISPLAY_SESSION);
        const mapUid = stored.find(map => map.name === "map-1 ").uniqueId;
        await setAlphaPerStyle(page, mapUid);

        expect(await saveAndReload(page)).toBe(0);
        await waitForMapsDrawn(page, stored.map(map => map.uniqueId));
        expect(await getAlphaPerStyle(page, mapUid)).toEqual(STYLE_ALPHAS);
    });

    test("map-display.pb: an EM map keeps a radius per draw mode when switching local / full map", async ({ page }) => {
        // Known gap: one radius per map in the store; the radius per draw mode only lives in MapSettingsAccordion's
        // refs (lockedRadius / unLockedRadius). Planned for the map representation record (.roadmaps/map-display.md,
        // decision 4); drop test.fail() then.
        test.fail();
        test.setTimeout(180_000);
        const stored = await loadSession(page, MAP_DISPLAY_SESSION);
        const emMapUid = stored.find(map => map.name === "low-res-emd-32143").uniqueId;
        await setRadiusPerDrawMode(page, emMapUid);
        expect(await getRadiusPerDrawMode(page, emMapUid)).toEqual(MODE_RADII);
    });

    test("map-display.pb: an EM map's radius per draw mode survives a protobuf save and reload", async ({ page }) => {
        // Known gap: sessions save one radius per map, and no draw mode (see the test above)
        test.fail();
        test.setTimeout(240_000);
        const stored = await loadSession(page, MAP_DISPLAY_SESSION);
        const emMapUid = stored.find(map => map.name === "low-res-emd-32143").uniqueId;
        await setRadiusPerDrawMode(page, emMapUid);

        expect(await saveAndReload(page)).toBe(0);
        await waitForMapsDrawn(page, stored.map(map => map.uniqueId));
        expect(await getRadiusPerDrawMode(page, emMapUid)).toEqual(MODE_RADII);
    });

    test("map-display.pb: colouring by another map is restored", async ({ page }) => {
        // Known gap: colour by another map lives on the MoorhenMap instance (otherMapForColouring) and is not
        // saved in sessions. Planned for the map display record (.roadmaps/map-display.md); drop test.fail() then.
        test.fail();
        test.setTimeout(180_000);
        await loadSession(page, MAP_DISPLAY_SESSION);
        const colouredMap = (await getMapDisplays(page)).find(map => map.name === "Copy of map-1 coloured by diff");
        expect(colouredMap.colouredByMap).toBe(true);
    });
});
