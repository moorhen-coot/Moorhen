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
import { showMap } from "../../src/store/mapContourSettingsSlice";
import { moorhen } from "../../src/types/moorhen";
import "./testUtils";

const orbital = { molNo: 7, isEM: false, isDifference: true, headerInfo: null, isOriginLocked: false } as unknown as moorhen.Map;
const density = { ...orbital, isDifference: false } as unknown as moorhen.Map;

const renderSettings = async (offerSlice: boolean, map = orbital) => {
    const store = createMoorhenStore();
    store.dispatch(showMap(map));
    const styleOf = () => store.getState().mapContourSettings.mapStyles.find(item => item.molNo === 7)?.style ?? "lines";
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
        expect(store.getState().mapContourSettings.mapStyles.find(item => item.molNo === 7)?.style).toBe("slice");
        update();
        await user.click(screen.getByText("Move & turn"));
        expect(store.getState().generalStates.movingMapSlice).toBe(7);

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
        await user.click(screen.getByText("Nodal lines"));
        expect(store.getState().mapContourSettings.mapSliceNodalLines).toEqual([7]);
        update();
        await user.click(screen.getByText("Nodal lines"));
        expect(store.getState().mapContourSettings.mapSliceNodalLines).toEqual([]);
    });

    test("spaces its contours in equal steps unless asked to double them", async () => {
        const { store, user, update } = await renderSettings(true);
        await user.click(screen.getByText("Draw as 2D slice"));
        update();
        const spacing = screen.getByLabelText("Contours") as HTMLSelectElement;
        expect(spacing.value).toBe("linear");
        await user.selectOptions(spacing, "geometric");
        expect(store.getState().mapContourSettings.mapSliceContourSpacings).toEqual([{ molNo: 7, spacing: "geometric" }]);
    });

    test("offers no nodal lines for a map that is never negative", async () => {
        const { user, update } = await renderSettings(true, density);
        await user.click(screen.getByText("Draw as 2D slice"));
        update();
        expect(screen.getByText("Move & turn")).toBeInTheDocument();
        expect(screen.queryByText("Nodal lines")).toBeNull();
    });
});
