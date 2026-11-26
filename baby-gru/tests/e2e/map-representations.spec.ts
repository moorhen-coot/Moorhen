import { expect, test, type Page } from "@playwright/test";
import { startAndGetInstance, waitForWebGLRenderSettle } from "./helpers";

/**
 * Two representations of one map drawn at once (.roadmaps/map-display.md): a map's display is a list of records, each
 * drawn by its own MapRepresentation with its own buffers. No UI adds one yet; the store, the driver, the scenes and
 * the sessions already take several.
 */

const MAP_DISPLAY_SESSION = { url: "/tests/test_data/session/map-display.pb", filename: "map-display.pb" };

type Drawn = { id: string; style: string; visible: boolean; buffers: string[]; triangles: number }[];

/** The representations drawing "map-1 ": their record's style and visibility, their buffers and triangle count */
const drawn = (page: Page): Promise<Drawn> =>
    page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const map = instance.store.getState().maps.find((item: any) => item.name === "map-1 ");
        return instance.mapDisplay.getRepresentations(map.uniqueId).map((representation: any) => ({
            id: representation.id,
            style: representation.data?.style,
            visible: representation.data?.visible,
            buffers: representation.displayBuffers.map((buffer: any) => buffer.id),
            triangles: representation.displayBuffers.reduce(
                (sum: number, buffer: any) => sum + buffer.triangleIndexs.reduce((n: number, indices: number[]) => n + indices.length / 3, 0),
                0
            ),
        }));
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

const dispatch = (page: Page, action: "add" | "hide" | "remove") =>
    page.evaluate(async action => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const { addMapRepresentation, setMapRepresentation, removeMapRepresentation, selectPrimaryMapRepresentation } = await import(
            "/src/store/mapRepresentationsSlice.ts"
        );
        const map = instance.store.getState().maps.find((item: any) => item.name === "map-1 ");
        const primary = selectPrimaryMapRepresentation(instance.store.getState(), map.uniqueId);
        if (action === "add") {
            // The same map as a solid surface, at a higher level, half transparent
            instance.dispatch(
                addMapRepresentation({
                    ...structuredClone(primary),
                    id: "second-representation",
                    visible: true,
                    style: "solid",
                    contourLevel: primary.contourLevel * 2,
                    alpha: { ...primary.alpha, solid: 0.5 },
                })
            );
        } else if (action === "hide") {
            instance.dispatch(setMapRepresentation({ id: "second-representation", changes: { visible: false } }));
        } else {
            instance.dispatch(removeMapRepresentation("second-representation"));
        }
    }, action);

test("one map drawn by two representations at once, each with its own buffers, kept over save and reload", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Map drawing is browser independent; run once");
    test.setTimeout(240_000);
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([MAP_DISPLAY_SESSION]);
    await expect.poll(async () => (await drawn(page)).length, { timeout: 120_000 }).toBe(1);
    // Shown as a mesh with lit lines (the fixture's style)
    await page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const { setPrimaryMapRepresentation } = await import("/src/store/mapRepresentationsSlice.ts");
        const map = instance.store.getState().maps.find((item: any) => item.name === "map-1 ");
        instance.dispatch(setPrimaryMapRepresentation({ mapUid: map.uniqueId, changes: { visible: true } }));
    });
    await expect.poll(async () => (await drawn(page))[0].buffers.length, { timeout: 60_000 }).toBeGreaterThan(0);
    await waitForWebGLRenderSettle(page, { timeoutMs: 60_000 });
    const [first] = await drawn(page);

    // A second one: drawn too, with buffers of its own; the first is not drawn again
    await dispatch(page, "add");
    await expect.poll(async () => (await drawn(page)).map(item => item.buffers.length > 0), { timeout: 60_000 }).toEqual([true, true]);
    const [mesh, surface] = await drawn(page);
    expect(mesh.buffers).toEqual(first.buffers);
    expect(surface).toMatchObject({ id: "second-representation", style: "solid" });
    expect(surface.buffers.some(id => mesh.buffers.includes(id))).toBe(false);
    // A higher level encloses less density
    expect(surface.triangles).toBeLessThan(mesh.triangles);

    // Hidden: its buffers go, the first one's stay as they were
    await dispatch(page, "hide");
    await expect.poll(async () => (await drawn(page))[1].buffers.length, { timeout: 30_000 }).toBe(0);
    expect((await drawn(page))[0].buffers).toEqual(mesh.buffers);

    // Both are in the scene, so in the session
    expect(await saveAndReload(page)).toBe(0);
    await expect.poll(async () => (await drawn(page)).map(item => [item.id === "second-representation", item.style, item.visible]), {
        timeout: 120_000,
    }).toEqual([
        [false, "lit-lines", true],
        [true, "solid", false],
    ]);

    // Removed: the first is drawn alone
    await dispatch(page, "remove");
    await expect.poll(async () => (await drawn(page)).length, { timeout: 30_000 }).toBe(1);
    await expect.poll(async () => (await drawn(page))[0].buffers.length, { timeout: 60_000 }).toBeGreaterThan(0);
});
