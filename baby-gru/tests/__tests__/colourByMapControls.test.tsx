/**
 * Colouring a map representation by another map from its colour swatch (ColourByMapControls.tsx, beside the "Colour
 * map by other map" modal; .roadmaps/map-display.md): in the swatch's popover, which map (a local resolution map if
 * there is one), a range guessed from that map's values on this representation's contour, apply to the representation
 * (or, from the card's title, to all of the map's), and back to a plain colour.
 */
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MapColourSelector } from "../../src/components/card/MapCard/MapColourSelector";
import { MoorhenMenuSystem } from "../../src/components/menu-system/MenuSystem";
import { MoorhenInstanceProvider } from "../../src/InstanceManager";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { addMap } from "../../src/store/mapsSlice";
import { addMapRepresentation, selectMapRepresentationsOfMap } from "../../src/store/mapRepresentationsSlice";
import type { MapRepresentationData } from "../../src/utils/Representation/mapRepresentationData";
import { moorhen } from "../../src/types/moorhen";
import "./testUtils";

const fakeMap = (molNo: number, name: string) =>
    ({
        molNo,
        uniqueId: `map-${molNo}`,
        name,
        isEM: true,
        isDifference: false,
        mapRmsd: 0.1,
        defaultMapColour: { r: 0.3, g: 0.3, b: 0.7 },
        defaultPositiveMapColour: { r: 0.4, g: 0.8, b: 0.4 },
        defaultNegativeMapColour: { r: 0.8, g: 0.4, b: 0.4 },
        // Values 2 to 6 on the contour (40 bins of 0.1)
        getVerticesHistogram: jest.fn(async () => ({ base: 2, bin_width: 0.1, counts: new Array(40).fill(1) })),
    }) as unknown as moorhen.Map & { getVerticesHistogram: jest.Mock };

const record = (id: string, changes: Partial<MapRepresentationData> = {}): MapRepresentationData => ({
    id,
    mapUid: "map-1",
    visible: true,
    contourLevel: 0.25,
    radius: { local: 15, full: 40 },
    style: "solid",
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

const setUp = (recordId?: string) => {
    const density = fakeMap(1, "run_locres_filtered");
    const other = fakeMap(2, "half_map");
    const locres = fakeMap(3, "run_locres");
    const store = createMoorhenStore();
    [density, other, locres].forEach(item => store.dispatch(addMap(item)));
    [record("a"), record("b", { contourLevel: 0.5 })].forEach(item => store.dispatch(addMapRepresentation(item)));
    render(
        <Provider store={store}>
            <MoorhenInstanceProvider menuSystem={new MoorhenMenuSystem()}>
                <MapColourSelector map={density} mapIsVisible={true} recordId={recordId} />
            </MoorhenInstanceProvider>
        </Provider>
    );
    const records = () => selectMapRepresentationsOfMap(store.getState(), "map-1");
    return { density, records, user: userEvent.setup() };
};

const open = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: "Colour picker" }));
    await user.click(await screen.findByRole("button", { name: /colour by another map/i }));
};

describe("colour by another map, from the colour swatch", () => {
    test("offers the local resolution map, guesses the range on this representation's contour, colours only it", async () => {
        const { density, records, user } = setUp("b");
        await open(user);
        expect(screen.getByRole("combobox", { name: /by this map/i })).toHaveValue("map-3");
        // The other map's values on "b"'s contour: its level, its radius in its draw mode (local)
        await waitFor(() => expect(density.getVerticesHistogram).toHaveBeenCalledWith(3, 200, { contourLevel: 0.5, radius: 15 }));
        await waitFor(() => expect(screen.getByDisplayValue("6.00")).toBeInTheDocument());
        expect(screen.getByDisplayValue("2.00")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Apply" }));
        const [a, b] = records();
        expect(a.colourByMap).toBeNull();
        expect(b.colourByMap).toMatchObject({ mapUid: "map-3", min: 2, max: 6 });
        expect(b.colourByMap.gradient.length).toBeGreaterThan(1);

        // Now coloured: back to a plain colour
        await user.click(await screen.findByRole("button", { name: "Plain colour" }));
        expect(records()[1].colourByMap).toBeNull();
    });

    test("another map chosen: a new guess, with it", async () => {
        const { density, user } = setUp("b");
        await open(user);
        await waitFor(() => expect(density.getVerticesHistogram).toHaveBeenCalledTimes(1));
        await user.selectOptions(screen.getByRole("combobox", { name: /by this map/i }), "map-2");
        await waitFor(() => expect(density.getVerticesHistogram).toHaveBeenLastCalledWith(2, 200, { contourLevel: 0.5, radius: 15 }));
    });

    test("from the card's title: every representation of the map", async () => {
        const { records, user } = setUp();
        await open(user);
        await waitFor(() => expect(screen.getByDisplayValue("6.00")).toBeInTheDocument());
        await user.click(screen.getByRole("button", { name: "Apply" }));
        expect(records().map(item => item.colourByMap?.mapUid)).toEqual(["map-3", "map-3"]);
    });
});
