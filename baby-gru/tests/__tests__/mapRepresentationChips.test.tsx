/**
 * Several representations of a map in its card (.roadmaps/map-display.md): a "Multiple representations" switch and the map
 * wizard (presets) at the top; a representations card (chips) shown by the switch, and always for a map with more than one; each
 * chip acts on its own representation (eye, edit popover with its colour, level and draw settings, duplicate, delete);
 * the card's level moves all shown ones together; only one representation of a map can be a 2D slice.
 */
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MapRepresentationsCard, MapRepresentationsToolbar } from "../../src/components/card/MapCard/MapRepresentationChips";
import { mapChipTint } from "../../src/components/card/MapCard/mapChipTint";
import { MapLevelControls } from "../../src/components/card/MapCard/MapLevelControls";
import { MapRepresentationEditor } from "../../src/components/card/MapCard/MapRepresentationEditor";
import { MapColourSelector } from "../../src/components/card/MapCard/MapColourSelector";
import { MoorhenMenuSystem } from "../../src/components/menu-system/MenuSystem";
import { MoorhenInstanceProvider } from "../../src/InstanceManager";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { addMap } from "../../src/store/mapsSlice";
import { addMapRepresentation, selectMapRepresentationsOfMap } from "../../src/store/mapRepresentationsSlice";
import type { MapRepresentationData } from "../../src/utils/Representation/mapRepresentationData";
import { MAP_REPRESENTATION_PRESETS } from "../../src/utils/Representation/mapRepresentationPresets";
import { moorhen } from "../../src/types/moorhen";
import "./testUtils";

const map = {
    molNo: 3,
    uniqueId: "map-3",
    name: "map.mtz",
    isEM: false,
    isDifference: false,
    headerInfo: null,
    mapRmsd: 0.25,
    levelRange: [0.01, 2],
    defaultMapColour: { r: 0.3, g: 0.3, b: 0.7 },
    defaultPositiveMapColour: { r: 0.4, g: 0.8, b: 0.4 },
    defaultNegativeMapColour: { r: 0.8, g: 0.4, b: 0.4 },
} as unknown as moorhen.Map;

const record = (id: string, changes: Partial<MapRepresentationData> = {}): MapRepresentationData => ({
    id,
    mapUid: "map-3",
    visible: true,
    contourLevel: 0.25,
    radius: { local: 15, full: 15 },
    style: "lines",
    alpha: { lines: 1, "lit-lines": 1, solid: 1, slice: 1 },
    colour: null,
    positiveColour: null,
    negativeColour: null,
    colourByMap: null,
    originLock: null,
    slice: null,
    viewDependentTransparency: false,
    ...changes,
});

const renderCard = async (...initial: MapRepresentationData[]) => {
    const store = createMoorhenStore();
    store.dispatch(addMap(map));
    initial.forEach(item => store.dispatch(addMapRepresentation(item)));
    const menuSystem = new MoorhenMenuSystem();
    const view = () => (
        <Provider store={store}>
            <MoorhenInstanceProvider menuSystem={menuSystem}>
                <MapRepresentationsToolbar map={map} />
                <MapRepresentationsCard
                    map={map}
                    editor={recordId => (
                        <MapRepresentationEditor map={map} recordId={recordId} level={<MapLevelControls map={map} recordId={recordId} />} offerSlice={true} />
                    )}
                />
            </MoorhenInstanceProvider>
        </Provider>
    );
    const { rerender } = render(view());
    const user = userEvent.setup();
    const records = () => selectMapRepresentationsOfMap(store.getState(), "map-3");
    return { store, user, records, update: () => rerender(view()) };
};

const chips = () => screen.queryAllByTestId("map-representation-chip");

describe("a map's representations in its card", () => {
    const wizardButton = () => screen.getByRole("button", { name: /map wizard/i });
    const toggle = () => screen.getByRole("checkbox", { name: /multiple representations/i });
    const chipButton = (chip: HTMLElement, name: RegExp) => within(chip).getByRole("button", { name });

    test("one representation: no representations card until the toggle is on", async () => {
        const { user, update } = await renderCard(record("mesh"));
        expect(chips()).toHaveLength(0);
        expect(toggle()).not.toBeChecked();

        await user.click(toggle());
        update();
        expect(chips()).toHaveLength(1);
        // The last one cannot be deleted
        expect(chipButton(chips()[0], /delete this representation/i)).toBeDisabled();

        await user.click(toggle());
        update();
        expect(chips()).toHaveLength(0);
    });

    test("more than one: always shown, the toggle on and locked", async () => {
        await renderCard(record("mesh"), record("surface", { style: "solid" }));
        expect(chips()).toHaveLength(2);
        expect(toggle()).toBeChecked();
        expect(toggle()).toBeDisabled();
    });

    test("a chip each, with its style and level", async () => {
        await renderCard(record("mesh"), record("surface", { style: "solid", contourLevel: 0.5 }));
        expect(chips().map(chip => chip.textContent)).toEqual(["Mesh1.00σ", "Surface2.00σ"]);
    });

    test("each chip shows, hides, duplicates and deletes its own representation", async () => {
        const surface = record("surface", { style: "solid", contourLevel: 0.5, colour: { r: 1, g: 0, b: 0 } });
        const { user, update, records } = await renderCard(record("mesh"), surface);
        await user.click(chipButton(chips()[1], /hide this representation/i));
        expect(records().map(item => [item.id, item.visible])).toEqual([
            ["mesh", true],
            ["surface", false],
        ]);

        // A copy of exactly that one, shown
        update();
        await user.click(chipButton(chips()[1], /duplicate this representation/i));
        expect(records()).toHaveLength(3);
        expect(records()[2]).toEqual({ ...surface, id: records()[2].id, visible: true });

        update();
        await user.click(chipButton(chips()[1], /delete this representation/i));
        expect(records().map(item => item.id)).toEqual(["mesh", records()[1].id]);
        expect(records()[1].style).toBe("solid");
    });

    test("a duplicate of a 2D slice is drawn as a mesh: one slice per map", async () => {
        const { user, records } = await renderCard(record("slice", { style: "slice" }), record("mesh"));
        await user.click(chipButton(chips()[0], /duplicate this representation/i));
        expect(records().map(item => item.style)).toEqual(["slice", "lines", "lines"]);
    });

    test("the wizard, beside the switch, is there with one representation too", async () => {
        await renderCard(record("mesh"));
        expect(wizardButton()).toBeEnabled();
    });

    test("a wizard preset replaces the map's representations, at multiples of the map's level (the lowest shown)", async () => {
        const { user, records } = await renderCard(record("mesh", { contourLevel: 0.4 }), record("surface", { style: "solid", contourLevel: 0.2 }));
        await user.click(wizardButton());
        await user.click(await screen.findByRole("button", { name: "Wizard: Cascade" }));
        const cascade = MAP_REPRESENTATION_PRESETS.find(preset => preset.id === "cascade");
        expect(records().map(item => [item.style, Number(item.contourLevel.toFixed(4))])).toEqual(
            cascade.layers.map(layer => ["solid", Number((0.2 * layer.times).toFixed(4))])
        );
        expect(records().some(item => item.id === "mesh" || item.id === "surface")).toBe(false);
    });

    test("the card's level, in multi-representation mode, moves every shown representation by the same amount", async () => {
        const store = createMoorhenStore();
        store.dispatch(addMap(map));
        [record("mesh"), record("surface", { style: "solid", contourLevel: 0.5 }), record("hidden", { visible: false, contourLevel: 1 })].forEach(item =>
            store.dispatch(addMapRepresentation(item))
        );
        render(
            <Provider store={store}>
                <MoorhenInstanceProvider menuSystem={new MoorhenMenuSystem()}>
                    <MapLevelControls map={map} allShown />
                </MoorhenInstanceProvider>
            </Provider>
        );
        const user = userEvent.setup();
        // Shows the lowest shown level, 0.25 (1.00 rms)
        const rmsInput = screen.getAllByRole("textbox").find(input => (input as HTMLInputElement).value === "1.00") as HTMLInputElement;
        await user.clear(rmsInput);
        await user.type(rmsInput, "2{Enter}");
        // + 1 rms (0.25) for each shown one
        expect(selectMapRepresentationsOfMap(store.getState(), "map-3").map(item => [item.id, item.contourLevel])).toEqual([
            ["mesh", 0.5],
            ["surface", 0.75],
            ["hidden", 1],
        ]);
    });

    test("dragging that slider's thumb moves the levels to where it is, the gaps kept (it used to run away to NaN)", async () => {
        const store = createMoorhenStore();
        store.dispatch(addMap(map));
        [record("mesh"), record("surface", { style: "solid", contourLevel: 0.5 })].forEach(item => store.dispatch(addMapRepresentation(item)));
        const { container } = render(
            <Provider store={store}>
                <MoorhenInstanceProvider menuSystem={new MoorhenMenuSystem()}>
                    <MapLevelControls map={map} allShown />
                </MoorhenInstanceProvider>
            </Provider>
        );
        // The slider follows the pointer through window listeners made when the drag starts, with the handler of that
        // moment: the levels must be read when it is called. The track is given 1000 px (jsdom lays nothing out); the
        // scale is log, from 0.01 to 2 (levelRange).
        const track = container.querySelector(".moorhen__slider-track") as HTMLElement;
        Object.defineProperty(track, "clientWidth", { value: 1000 });
        track.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1000, bottom: 10, width: 1000, height: 10, x: 0, y: 0, toJSON: () => ({}) });
        const positionOf = (level: number) => Math.round((1000 * (Math.log10(level) - Math.log10(0.01))) / (Math.log10(2) - Math.log10(0.01)));
        fireEvent.mouseDown(container.querySelector(".moorhen__slider-thumb"));
        for (const level of [0.3, 0.4, 0.6]) {
            act(() => {
                window.dispatchEvent(new MouseEvent("pointermove", { clientX: positionOf(level), cancelable: true }));
            });
        }
        act(() => {
            window.dispatchEvent(new MouseEvent("pointerup"));
        });
        const levels = selectMapRepresentationsOfMap(store.getState(), "map-3").map(item => item.contourLevel);
        levels.forEach(level => expect(Number.isFinite(level)).toBe(true));
        expect(levels[0]).toBeCloseTo(0.6, 2);
        // The gap between them as it was (0.25)
        expect(levels[1] - levels[0]).toBeCloseTo(0.25, 6);
    });

    test("coloured by another map: its chip is tinted with the gradient, its colour swatch names the map", async () => {
        const gradient: [number, [number, number, number]][] = [
            [0, [0, 0, 255]],
            [0.5, [255, 255, 255]],
            [1, [255, 0, 0]],
        ];
        const coloured = record("coloured", { colourByMap: { mapUid: "map-4", min: 0, max: 1, gradient } });
        // (jsdom drops CSS gradients: what the chip and the swatch draw is checked in map-colour-by-map.spec.ts)
        expect(mapChipTint(map, coloured)).toEqual({
            backgroundImage: "linear-gradient(to right, rgba(0,0,255,0.5) 0%, rgba(255,255,255,0.5) 50%, rgba(255,0,0,0.5) 100%)",
            borderColor: "rgb(255, 255, 255)",
        });
        expect(mapChipTint(map, { ...coloured, visible: false }).backgroundImage).toContain("rgba(0,0,255,0.1)");
        expect(mapChipTint(map, record("mesh"))).toEqual({ backgroundColor: "rgba(76.5, 76.5, 178.5, 0.5)", borderColor: "rgb(76.5, 76.5, 178.5)" });

        const store = createMoorhenStore();
        store.dispatch(addMap(map));
        store.dispatch(addMap({ ...map, molNo: 4, uniqueId: "map-4", name: "local-resolution.map" } as unknown as moorhen.Map));
        store.dispatch(addMapRepresentation(coloured));
        render(
            <Provider store={store}>
                <MoorhenInstanceProvider menuSystem={new MoorhenMenuSystem()}>
                    <MapColourSelector map={map} mapIsVisible={true} recordId="coloured" />
                </MoorhenInstanceProvider>
            </Provider>
        );
        await userEvent.setup().hover(screen.getByRole("button", { name: "Colour picker" }));
        expect(await screen.findByText(/coloured by local-resolution\.map/i)).toBeInTheDocument();
    });

    const openEditor = async (user: ReturnType<typeof userEvent.setup>, chip: HTMLElement) =>
        user.click(within(chip).getByRole("button", { name: /edit this representation/i }));

    test("a chip's edit popover holds its colour, level and draw settings, and changes only it", async () => {
        const { user, records } = await renderCard(record("mesh"), record("surface", { style: "solid", contourLevel: 0.5 }));
        await openEditor(user, chips()[1]);
        expect(await screen.findByRole("checkbox", { name: /draw as a surface/i })).toBeChecked();
        expect(screen.getByRole("checkbox", { name: /draw as mesh/i })).not.toBeChecked();
        expect(screen.getByText("Colour")).toBeInTheDocument();
        // Its level in rms, 2.00: set to 3, the mesh stays at 1
        const rmsInput = screen.getAllByRole("textbox").find(input => (input as HTMLInputElement).value === "2.00") as HTMLInputElement;
        await user.clear(rmsInput);
        await user.type(rmsInput, "3{Enter}");
        expect(records().map(item => [item.id, item.contourLevel])).toEqual([
            ["mesh", 0.25],
            ["surface", 0.75],
        ]);
    });

    test("only one representation of a map can be a 2D slice", async () => {
        const { user } = await renderCard(record("mesh"), record("slice", { style: "slice" }));
        // The mesh's slice option is taken by the other one
        await openEditor(user, chips()[0]);
        expect(await screen.findByRole("checkbox", { name: /draw as 2d slice/i })).toBeDisabled();
    });
});
