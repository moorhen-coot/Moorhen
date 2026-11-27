import { expect, test } from "@playwright/test";
import { startAndGetInstance, waitForWebGLRenderSettle } from "./helpers";

/**
 * Colouring a map by another map (see .roadmaps/map-display.md): the gradient is the map's own, in its display record.
 * Coot has one colour map for all maps, so the worker sets it and contours in one command
 * (shim_get_map_contours_mesh_coloured_by_other_map): two maps coloured with different gradients, contoured at the
 * same time, must each get their own colours.
 */

const MAP_DISPLAY_SESSION = { url: "/tests/test_data/session/map-display.pb", filename: "map-display.pb" };

const RED: [number, [number, number, number]][] = [[0, [255, 0, 0]], [1, [255, 0, 0]]];
const BLUE: [number, [number, number, number]][] = [[0, [0, 0, 255]], [1, [0, 0, 255]]];

test("two maps coloured by another map with different gradients each keep their own", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Coot's colouring is browser independent; run once");
    test.setTimeout(180_000);
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([MAP_DISPLAY_SESSION]);
    await expect.poll(async () => page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        return instance.store.getState().maps.length;
    }), { timeout: 120_000 }).toBe(5);
    await waitForWebGLRenderSettle(page, { timeoutMs: 60_000 });

    // Two crystallographic maps, coloured by the difference map, one red and one blue, dispatched together
    const uids = await page.evaluate(async ({ red, blue }) => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const { setPrimaryMapRepresentation } = await import("/src/store/mapRepresentationsSlice.ts");
        const maps = instance.store.getState().maps;
        const difference = maps.find((map: any) => map.isDifference);
        const [first, second] = maps.filter((map: any) => !map.isDifference && !map.isEM);
        for (const [map, gradient] of [[first, red], [second, blue]] as const) {
            instance.dispatch(setPrimaryMapRepresentation({
                mapUid: map.uniqueId,
                changes: { visible: true, style: "lines", colourByMap: { mapUid: difference.uniqueId, min: -0.5, max: 0.5, gradient } },
            }));
        }
        return [first.uniqueId, second.uniqueId];
    }, { red: RED, blue: BLUE });

    // The mean vertex colour of each map's contour (Coot's colours, kept as they are when coloured by a map)
    const meanColours = () => page.evaluate(async uids => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        return uids.map((uid: string) => {
            const buffers = instance.mapDisplay.getRepresentations(uid)[0]?.displayBuffers ?? [];
            const sum = [0, 0, 0];
            let n = 0;
            buffers.forEach((buffer: any) => buffer.triangleColours.forEach((colours: number[]) => {
                for (let i = 0; i < colours.length; i += 4) {
                    sum[0] += colours[i]; sum[1] += colours[i + 1]; sum[2] += colours[i + 2]; n++;
                }
            }));
            return n === 0 ? null : sum.map(value => value / n);
        });
    }, uids);

    await expect.poll(async () => (await meanColours()).every(colour => colour !== null), { timeout: 60_000 }).toBe(true);
    // Let any contour still queued land
    await waitForWebGLRenderSettle(page, { timeoutMs: 60_000 });
    const [red, blue] = await meanColours();
    expect(red[0]).toBeGreaterThan(0.9);
    expect(red[2]).toBeLessThan(0.1);
    expect(blue[2]).toBeGreaterThan(0.9);
    expect(blue[0]).toBeLessThan(0.1);

    // The cards show it: each map's colour swatch is its gradient, left to right (a difference map's is two colours,
    // diagonally), and so is the chip of a map in multi-representation
    // mode (jsdom drops CSS gradients, so this is only checked here)
    await page.evaluate(async uid => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const { setMapMultiRepresentation } = await import("/src/store/generalStatesSlice.ts");
        instance.dispatch(setMapMultiRepresentation({ mapUid: uid, on: true }));
    }, uids[0]);
    await moorhen.buttonClick("Open Maps Panel");
    const backgrounds = (locator: ReturnType<typeof moorhen.host.locator>) =>
        locator.evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundImage));
    const swatches = moorhen.host.getByRole("button", { name: "Colour picker" });
    await expect.poll(async () => (await backgrounds(swatches)).filter(image => image.startsWith("linear-gradient(to right")).length, { timeout: 30_000 }).toBe(2);
    const gradients = (await backgrounds(swatches)).filter(image => image.startsWith("linear-gradient(to right"));
    expect(gradients.filter(image => image.includes("rgb(255, 0, 0)"))).toHaveLength(1);
    expect(gradients.filter(image => image.includes("rgb(0, 0, 255)"))).toHaveLength(1);
    const chips = moorhen.host.getByTestId("map-representation-chip");
    await expect(chips).toHaveCount(1);
    expect((await backgrounds(chips))[0]).toContain("rgba(255, 0, 0, 0.5)");
});

test("opening a RELION local resolution folder colours the density by the local resolution, gradient applied", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Browser independent; run once");
    test.setTimeout(180_000);
    const moorhen = await startAndGetInstance(page);
    // Any map will do for the two (the names make it a local resolution folder: FileLoading)
    const map = "/tests/test_data/low-res-emd-32143.map";
    await moorhen.loadFiles([
        { url: map, filename: "run_class001_locres_filtered.mrc" },
        { url: map, filename: "run_class001_locres.mrc" },
    ]);
    // The modal opens, sets itself up and applies: the density coloured by the other map, in the modal's gradient,
    // from the guessed range, drawn as a surface
    await expect.poll(async () => page.evaluate(async () => {
        const instance = await (document.getElementById("moorhen-test") as any).getMoorhenInstance();
        const { selectPrimaryMapRepresentation } = await import("/src/store/mapRepresentationsSlice.ts");
        const state = instance.store.getState();
        const density = state.maps.find((item: any) => /_locres_filtered/.test(item.name));
        const values = state.maps.find((item: any) => /_locres(\.mrc)?$/.test(item.name));
        const record = density && selectPrimaryMapRepresentation(state, density.uniqueId);
        if (!record?.colourByMap) return null;
        return {
            byValues: record.colourByMap.mapUid === values.uniqueId,
            rangeGuessed: record.colourByMap.min !== 2 || record.colourByMap.max !== 6,
            gradient: record.colourByMap.gradient.length > 1,
            style: record.style,
        };
    }), { timeout: 120_000 }).toEqual({ byValues: true, rangeGuessed: true, gradient: true, style: "solid" });
    await expect(moorhen.host.getByText("Colour map by other map...")).toBeVisible();

    // Opened docked, so narrow: the gradient is a button, the picker (with min and max) in its popover
    await expect(moorhen.host.getByText("Set min and max values for the colour map:")).toHaveCount(0);
    const gradientButton = moorhen.host.getByRole("button", { name: "Colour gradient", exact: true });
    await expect(gradientButton).toBeVisible();
    await gradientButton.click();
    await expect(moorhen.host.getByText("Points:")).toBeVisible();
});
