/**
 * Several representations of a map in its card (.roadmaps/map-display.md): a representations card (chips and "+")
 * shown by a Draw Settings toggle, and always for a map with more than one; the selected one is what the card's
 * controls act on; "+" adds a copy of it; only one representation of a map can be a 2D slice.
 */
import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MapRepresentationsCard } from "../../src/components/card/MapCard/MapRepresentationChips";
import { MapSettingsAccordion } from "../../src/components/card/MapCard/MapSettingsAccordion";
import { MoorhenMenuSystem } from "../../src/components/menu-system/MenuSystem";
import { MoorhenInstanceProvider } from "../../src/InstanceManager";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { addMap } from "../../src/store/mapsSlice";
import { addMapRepresentation, selectMapRepresentationsOfMap, selectSelectedMapRepresentation } from "../../src/store/mapRepresentationsSlice";
import type { MapRepresentationData } from "../../src/utils/Representation/mapRepresentationData";
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
    defaultMapColour: { r: 0.3, g: 0.3, b: 0.7 },
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
    ...changes,
});

const renderCard = async (...records: MapRepresentationData[]) => {
    const store = createMoorhenStore();
    store.dispatch(addMap(map));
    records.forEach(item => store.dispatch(addMapRepresentation(item)));
    const menuSystem = new MoorhenMenuSystem();
    const selected = () => selectSelectedMapRepresentation(store.getState(), "map-3");
    const view = () => (
        <Provider store={store}>
            <MoorhenInstanceProvider menuSystem={menuSystem}>
                <MapRepresentationsCard map={map} />
                <MapSettingsAccordion map={map} mapIsVisible={true} mapStyle={selected()?.style} mapRadius={15} mapOpacity={1} offerSlice={true} />
            </MoorhenInstanceProvider>
        </Provider>
    );
    const { rerender } = render(view());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /keyboard/i }));
    return { store, user, selected, update: () => rerender(view()) };
};

const chips = () => screen.queryAllByRole("button", { pressed: undefined }).filter(element => element.classList.contains("moorhen__representation-chip"));

describe("a map's representations in its card", () => {
    const addButton = () => screen.queryByRole("button", { name: /add a copy of the selected representation/i });
    const presetsButton = () => screen.queryByRole("button", { name: /representation presets/i });
    const toggle = () => screen.getByRole("checkbox", { name: /multiple representations/i });

    test("one representation: no representations card until Draw Settings' toggle is on", async () => {
        const { user, update } = await renderCard(record("mesh"));
        expect(chips()).toHaveLength(0);
        expect(addButton()).toBeNull();
        expect(toggle()).not.toBeChecked();

        await user.click(toggle());
        update();
        expect(chips()).toHaveLength(1);
        // The last one cannot be deleted
        expect(within(chips()[0]).getByRole("button", { name: /delete this representation/i })).toBeDisabled();
        expect(addButton()).not.toBeNull();

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

    test("two: a chip each, with its style and level; clicking one selects it", async () => {
        const { user, selected } = await renderCard(record("mesh"), record("surface", { style: "solid", contourLevel: 0.5 }));
        expect(chips().map(chip => chip.textContent)).toEqual(["Mesh1.00σ", "Surface2.00σ"]);
        expect(selected().id).toBe("mesh");
        await user.click(chips()[1]);
        expect(selected().id).toBe("surface");
        expect(chips()[1]).toHaveAttribute("aria-pressed", "true");
    });

    test("each chip shows, hides and deletes its own representation", async () => {
        const { store, user, update } = await renderCard(record("mesh"), record("surface", { style: "solid" }));
        await user.click(chips()[1]);
        update();
        await user.click(within(chips()[1]).getByRole("button", { name: /hide this representation/i }));
        const byId = () => Object.fromEntries(selectMapRepresentationsOfMap(store.getState(), "map-3").map(item => [item.id, item.visible]));
        expect(byId()).toEqual({ mesh: true, surface: false });

        // Deleting the selected one: the card goes on with the other; the representations card goes (toggle off)
        update();
        await user.click(within(chips()[1]).getByRole("button", { name: /delete this representation/i }));
        expect(byId()).toEqual({ mesh: true });
        expect(selectSelectedMapRepresentation(store.getState(), "map-3").id).toBe("mesh");
        update();
        expect(chips()).toHaveLength(0);
    });

    test("+ adds a copy of the selected one, and selects it", async () => {
        const surface = record("surface", { style: "solid", contourLevel: 0.5, colour: { r: 1, g: 0, b: 0 } });
        const { store, user, selected, update } = await renderCard(record("mesh"), surface);
        await user.click(chips()[1]);
        update();
        await user.click(addButton());
        const records = selectMapRepresentationsOfMap(store.getState(), "map-3");
        expect(records).toHaveLength(3);
        expect(selected().id).toBe(records[2].id);
        expect(records[2]).toEqual({ ...surface, id: records[2].id });
    });

    test("a copy of a 2D slice is drawn as a mesh: one slice per map", async () => {
        const { store, user } = await renderCard(record("slice", { style: "slice" }), record("mesh"));
        await user.click(addButton());
        expect(selectMapRepresentationsOfMap(store.getState(), "map-3").map(item => item.style)).toEqual(["slice", "lines", "lines"]);
    });

    test("a preset replaces the map's representations, and selects its first", async () => {
        const { store, user, selected } = await renderCard(record("mesh"), record("surface", { style: "solid" }));
        await user.click(presetsButton());
        await user.click(await screen.findByRole("button", { name: "Preset: Cascade" }));
        const records = selectMapRepresentationsOfMap(store.getState(), "map-3");
        // 1, 2 and 3σ of an rms of 0.25
        expect(records.map(item => [item.style, item.contourLevel])).toEqual([
            ["solid", 0.25],
            ["solid", 0.5],
            ["solid", 0.75],
        ]);
        expect(records.some(item => item.id === "mesh" || item.id === "surface")).toBe(false);
        expect(selected().id).toBe(records[0].id);
    });

    test("only one representation of a map can be a 2D slice", async () => {
        const { user, update } = await renderCard(record("mesh"), record("slice", { style: "slice" }));
        // The mesh is selected: its slice option is taken by the other one
        expect(screen.getByRole("checkbox", { name: /draw as 2d slice/i })).toBeDisabled();
        await user.click(chips()[1]);
        update();
        expect(screen.getByRole("checkbox", { name: /draw as 2d slice/i })).not.toBeDisabled();
    });
});
