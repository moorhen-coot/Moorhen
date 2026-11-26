/**
 * Offering a map's 2D slice in its Draw Settings: a fourth way to draw it, and once chosen, a
 * switch to move and turn it by its handles.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MapSettingsAccordion } from "../../src/components/card/MapCard/MapSettingsAccordion";
import { MoorhenMenuSystem } from "../../src/components/menu-system/MenuSystem";
import { MoorhenInstanceProvider } from "../../src/InstanceManager";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { addMap } from "../../src/store/mapsSlice";
import { addMapRepresentation, selectPrimaryMapRepresentation, setMapRepresentationSlice } from "../../src/store/mapRepresentationsSlice";
import { setQuat } from "../../src/store/glRefSlice";
import { quatToMat4 } from "../../src/WebGLgComponents/quatToMat4.js";
import { moorhen } from "../../src/types/moorhen";
import "./testUtils";

const orbital = { molNo: 7, uniqueId: "orbital-7", isEM: false, isDifference: true, headerInfo: null, isOriginLocked: false } as unknown as moorhen.Map;
const density = { ...orbital, isDifference: false } as unknown as moorhen.Map;

const renderSettings = async (offerSlice: boolean, map = orbital) => {
    const store = createMoorhenStore();
    // What the map shows is its display record (map-display.md)
    store.dispatch(addMap(map));
    store.dispatch(addMapRepresentation({
        id: "rep-7", mapUid: map.uniqueId, visible: true, contourLevel: 0.02, radius: { local: 5, full: 5 }, style: "lines",
        alpha: { lines: 1, "lit-lines": 1, solid: 1, slice: 1 }, colour: null, positiveColour: null, negativeColour: null,
        colourByMap: null, originLock: null, slice: null,
    }));
    const styleOf = () => selectPrimaryMapRepresentation(store.getState(), map.uniqueId)?.style;
    const menuSystem = new MoorhenMenuSystem();
    const view = () => (
        <Provider store={store}>
            <MoorhenInstanceProvider menuSystem={menuSystem}>
                <MapSettingsAccordion map={map} mapIsVisible={true} mapStyle={styleOf()} mapRadius={5} mapOpacity={1} hideRadiusControls={true} offerSlice={offerSlice} />
            </MoorhenInstanceProvider>
        </Provider>
    );
    const { rerender } = render(view());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /keyboard/i }));
    return { store, user, update: () => rerender(view()) };
};

describe("the 2D slice in a map's Draw Settings", () => {
    test("is not offered unless asked for", async () => {
        await renderSettings(false);
        expect(screen.getByText("Draw as mesh")).toBeInTheDocument();
        expect(screen.queryByText("Draw as 2D slice")).toBeNull();
    });

    test("is a way to draw the map, with a switch for its handles once chosen", async () => {
        const { store, user, update } = await renderSettings(true);
        expect(screen.queryByText("Move & turn")).toBeNull();

        await user.click(screen.getByText("Draw as 2D slice"));
        expect(selectPrimaryMapRepresentation(store.getState(), "orbital-7")?.style).toBe("slice");
        update();
        await user.click(screen.getByText("Move & turn"));
        // The handles are the representation's
        expect(store.getState().generalStates.movingMapSlice).toBe("rep-7");

        // Drawn another way, the slice puts its handles away.
        update();
        await user.click(screen.getByText("Draw as a surface"));
        expect(store.getState().generalStates.movingMapSlice).toBeNull();
        update();
        expect(screen.queryByText("Move & turn")).toBeNull();
    });

    test("can show an orbital's nodal lines", async () => {
        const { store, user, update } = await renderSettings(true);
        await user.click(screen.getByText("Draw as 2D slice"));
        update();
        const sliceOf = () => selectPrimaryMapRepresentation(store.getState(), "orbital-7")?.slice;
        await user.click(screen.getByText("Nodal lines"));
        expect(sliceOf()?.nodalLines).toBe(true);
        update();
        await user.click(screen.getByText("Nodal lines"));
        expect(sliceOf()?.nodalLines).toBe(false);
    });

    test("spaces its contours in equal steps unless asked to double them", async () => {
        const { store, user, update } = await renderSettings(true);
        await user.click(screen.getByText("Draw as 2D slice"));
        update();
        const spacing = screen.getByLabelText("Contours") as HTMLSelectElement;
        expect(spacing.value).toBe("linear");
        await user.selectOptions(spacing, "geometric");
        expect(selectPrimaryMapRepresentation(store.getState(), "orbital-7")?.slice?.contourSpacing).toBe("geometric");
    });

    test("can turn the view to look straight at the slice, centred on it", async () => {
        const { store, user, update } = await renderSettings(true);
        await user.click(screen.getByText("Draw as 2D slice"));
        // A slice standing in the xz plane (normal -y), away from the view's centre.
        store.dispatch(setMapRepresentationSlice({ id: "rep-7", changes: { origin: [3, 4, 5], orientation: [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1] } }));
        store.dispatch(setQuat([0.1, 0.05, 0, -0.99]));
        update();
        await user.click(screen.getByText("Align view"));
        const m = quatToMat4(store.getState().glRef.quat);
        // The line of sight along the normal; the slice's side nearest the screen's x along it.
        expect(Math.abs(m[6])).toBeCloseTo(1, 6);
        expect(m[0]).toBeCloseTo(1, 6);
        expect(store.getState().sceneSettings.origin).toEqual([-3, -4, -5]);
    });

    test("offers no nodal lines for a map that is never negative", async () => {
        const { user, update } = await renderSettings(true, density);
        await user.click(screen.getByText("Draw as 2D slice"));
        update();
        expect(screen.getByText("Move & turn")).toBeInTheDocument();
        expect(screen.queryByText("Nodal lines")).toBeNull();
    });
});
