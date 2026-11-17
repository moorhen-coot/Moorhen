/*
 * The 3D and 2D object panels' coordinate sections: separate number boxes that edit the object,
 * and the 3D panel's "Current origin", which moves an object to the centre of the view.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import "./testUtils";
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import { setOrigin } from "@/store/sceneSettingsSlice";
import { MoorhenMenuSystem } from "@/components/menu-system/MenuSystem";
import { MoorhenInstanceProvider } from "@/InstanceManager";
import { Moorhen3DObjects } from "@/components/modal/Moorhen3DObjectsModal";
import { Moorhen2DCanvasObjects } from "@/components/modal/Moorhen2DCanvasObjectsModal";

// jsdom has no 2D canvas; the orientation widget only needs calls to succeed.
HTMLCanvasElement.prototype.getContext = (() => new Proxy({}, { get: () => () => undefined })) as never;
// Nor OffscreenCanvas, which the colour pickers use to read a colour name; a plain object stands in.
(globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas ??= class {
    getContext() {
        return { fillStyle: "#000000" };
    }
};

const renderPanel = (panel: React.ReactNode) => {
    const store = createMoorhenStore();
    render(
        <Provider store={store}>
            <MoorhenInstanceProvider menuSystem={new MoorhenMenuSystem()}>{panel}</MoorhenInstanceProvider>
        </Provider>
    );
    return store;
};

/** The number box for `label` ("x:", "y:" or "z:", in that order) in the section titled `title`. */
const box = (title: string, label: string): HTMLInputElement => {
    const section = screen.getByText(title).parentElement as HTMLElement;
    const inputs = [...section.querySelectorAll("input")];
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    return inputs[["x:", "y:", "z:"].indexOf(label)];
};

const click = (text: string) =>
    act(() => {
        fireEvent.click(screen.getByText(text));
    });

describe("3D objects panel", () => {
    test("position boxes edit the new object, and Current origin moves it to the view centre", async () => {
        const store = renderPanel(<Moorhen3DObjects />);
        act(() => {
            fireEvent.change(box("Position", "y:"), { target: { value: "4.5" } });
        });
        click("Apply");
        expect(store.getState().threeDObjects.objects[0].origin).toEqual([0, 4.5, 0]);

        // The scene origin is the negated centre of the view.
        act(() => {
            store.dispatch(setOrigin([-10, -20, -30]));
        });
        click("Current origin");
        // An existing object reaches the store on the next animation frame (the panel's live sync).
        await waitFor(() => expect(store.getState().threeDObjects.objects[0].origin).toEqual([10, 20, 30]));
    });
});

describe("2D objects panel", () => {
    test("text is placed from the x and y boxes", () => {
        const store = renderPanel(<Moorhen2DCanvasObjects />);
        act(() => {
            fireEvent.change(box("Position (fraction of the view)", "x:"), { target: { value: "0.25" } });
        });
        click("Apply");
        const text = store.getState().overlays.textOverlayList[0];
        expect(text.x).toBeCloseTo(0.25);
        expect(text.y).toBeCloseTo(0.9);
        // Text is filled unless asked otherwise.
        expect(text.drawStyle).toBe("fill");
    });
});
