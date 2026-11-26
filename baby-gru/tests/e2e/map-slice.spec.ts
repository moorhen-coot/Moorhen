import { expect, test, type Page } from "@playwright/test";
import { startAndGetInstance, waitForWebGLRenderSettle } from "./helpers";

/**
 * A map drawn as a 2D slice (the "slice" style): where the slice is and how it is contoured are the map's display
 * record's `slice` (.roadmaps/map-display.md). Made through the view centre when first drawn, redrawn when moved,
 * and saved in sessions so that it comes back where it was.
 */

const MAP_DISPLAY_SESSION = { url: "/tests/test_data/session/map-display.pb", filename: "map-display.pb" };

type SliceState = { slice: { origin: number[]; nodalLines: boolean; contourSpacing: string } | null; sliceBuffers: number; firstBufferId: string | null };

/** The slice of the first crystallographic map's record, and the buffers it is drawn with */
const sliceState = (page: Page): Promise<SliceState> =>
    page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const map = instance.store.getState().maps.find((item: any) => item.name === "map-1 ");
        const buffers = map.displayObjects.Slice ?? [];
        return { slice: map.primaryRepresentation?.slice ?? null, sliceBuffers: buffers.length, firstBufferId: buffers[0]?.id ?? null };
    });

const saveAndReload = (page: Page): Promise<number> =>
    page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const { moorhensession } = await import("/src/protobuf/MoorhenSession.js");
        const { MoorhenTimeCapsule } = await import("/src/utils/MoorhenTimeCapsule.ts");
        const session = await instance.getTimeCapsuleRef().current.fetchSession(true);
        const bytes = moorhensession.Session.encode(moorhensession.Session.fromObject(session)).finish();
        return MoorhenTimeCapsule.loadSessionFromArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), instance);
    });

test("a map drawn as a 2D slice is made at the view, redrawn when moved, and kept in sessions", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Slices are browser independent; run once");
    test.setTimeout(240_000);
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([MAP_DISPLAY_SESSION]);
    await expect.poll(async () => page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        return instance.store.getState().maps.length;
    }), { timeout: 120_000 }).toBe(5);
    await waitForWebGLRenderSettle(page, { timeoutMs: 60_000 });
    expect((await sliceState(page)).slice).toBeNull();

    // Drawn as a slice: one is made through the centre of the view, and drawn
    const viewCentre = await page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const { setPrimaryMapRepresentation } = await import("/src/store/mapRepresentationsSlice.ts");
        const map = instance.store.getState().maps.find((item: any) => item.name === "map-1 ");
        instance.dispatch(setPrimaryMapRepresentation({ mapUid: map.uniqueId, changes: { visible: true, style: "slice" } }));
        return instance.store.getState().sceneSettings.origin.map((coord: number) => -coord);
    });
    await expect.poll(async () => (await sliceState(page)).sliceBuffers, { timeout: 60_000 }).toBeGreaterThan(0);
    const made = await sliceState(page);
    made.slice.origin.forEach((coord, i) => expect(coord).toBeCloseTo(viewCentre[i], 3));

    // Moved, with nodal lines and doubling contours: drawn again
    await page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const { setMapRepresentationSlice } = await import("/src/store/mapRepresentationsSlice.ts");
        const map = instance.store.getState().maps.find((item: any) => item.name === "map-1 ");
        const id = map.primaryRepresentation.id;
        const [x, y, z] = map.primaryRepresentation.slice.origin;
        instance.dispatch(setMapRepresentationSlice({ id, changes: { origin: [x + 2, y, z], nodalLines: true, contourSpacing: "geometric" } }));
    });
    await expect.poll(async () => (await sliceState(page)).firstBufferId, { timeout: 60_000 }).not.toBe(made.firstBufferId);
    const moved = await sliceState(page);
    expect(moved.slice.origin[0]).toBeCloseTo(made.slice.origin[0] + 2, 3);

    // Saved and loaded back: where it was, as it was, drawn
    expect(await saveAndReload(page)).toBe(0);
    await expect.poll(async () => (await sliceState(page)).sliceBuffers, { timeout: 120_000 }).toBeGreaterThan(0);
    const reloaded = await sliceState(page);
    reloaded.slice.origin.forEach((coord, i) => expect(coord).toBeCloseTo(moved.slice.origin[i], 3));
    expect(reloaded.slice.nodalLines).toBe(true);
    expect(reloaded.slice.contourSpacing).toBe("geometric");
});
