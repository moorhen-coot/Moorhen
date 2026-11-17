/*
 * The 3D and 2D object panels' coordinate sections: separate number boxes that edit the object,
 * and the 3D panel's "Current origin", which moves an object to the centre of the view.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import "./testUtils";
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import { setOrigin } from "@/store/sceneSettingsSlice";
import { addSvgPathOverlay, addTextOverlay, updateOverlay } from "@/store/overlaysSlice";
import { setSelected2DObject } from "@/store/generalStatesSlice";
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

describe("2D objects panel: shapes", () => {
    const chooseType = (value: string) => {
        const select = screen.getByDisplayValue("Text") as HTMLSelectElement;
        act(() => {
            fireEvent.change(select, { target: { value } });
        });
    };

    test("a new polygon is a filled square in the middle of the view, and selected", () => {
        const store = renderPanel(<Moorhen2DCanvasObjects />);
        chooseType("polygon");
        click("Apply");
        const [polygon] = store.getState().overlays.shapeOverlayList;
        expect(polygon).toMatchObject({ type: "Polygon", sides: 4, x: 0.5, y: 0.5, drawStyle: "fill" });
        expect(polygon.type === "Polygon" && polygon.points).toHaveLength(8);
        expect(store.getState().generalStates.selected2DObjectId).toBe(polygon.uniqueId);
    });

    test("changing the sides makes a regular polygon of that many", () => {
        const store = renderPanel(<Moorhen2DCanvasObjects />);
        chooseType("polygon");
        const sidesInput = screen.getByLabelText("Sides") as HTMLInputElement;
        expect(sidesInput.value).toBe("4");
        act(() => {
            fireEvent.change(sidesInput, { target: { value: "6" } });
        });
        click("Apply");
        const [polygon] = store.getState().overlays.shapeOverlayList;
        expect(polygon).toMatchObject({ type: "Polygon", sides: 6 });
        expect(polygon.type === "Polygon" && polygon.points).toHaveLength(12);
    });

    test("a new line has an arrow at its end, and one can be added at its start", () => {
        const store = renderPanel(<Moorhen2DCanvasObjects />);
        chooseType("line");
        const startArrow = screen.getByText("Arrow at start").nextElementSibling.querySelector("input") as HTMLInputElement;
        act(() => {
            fireEvent.click(startArrow);
        });
        click("Apply");
        expect(store.getState().overlays.shapeOverlayList[0]).toMatchObject({ type: "Line", arrowStart: true, arrowEnd: true });
    });
});

describe("2D objects panel: z-depth", () => {
    const depthSelect = () => screen.getByDisplayValue("0") as HTMLSelectElement;

    test.each([["text"], ["polygon"]])("a new %s goes to the depth chosen", type => {
        const store = renderPanel(<Moorhen2DCanvasObjects />);
        if (type !== "text") {
            act(() => {
                fireEvent.change(screen.getByDisplayValue("Text"), { target: { value: type } });
            });
        }
        act(() => {
            fireEvent.change(depthSelect(), { target: { value: "3" } });
        });
        click("Apply");
        const all = [...store.getState().overlays.textOverlayList, ...store.getState().overlays.shapeOverlayList];
        expect(all).toHaveLength(1);
        expect(all[0].zIndex).toBe(3);
    });

    test("an existing object moves to a new depth, and stays there", () => {
        const store = renderPanel(<Moorhen2DCanvasObjects />);
        click("Apply");
        act(() => {
            fireEvent.change(depthSelect(), { target: { value: "2" } });
        });
        click("Apply");
        expect(store.getState().overlays.textOverlayList.map(t => t.zIndex)).toEqual([2]);
    });
});

describe("2D objects panel: Apply changes an object in place", () => {
    test("a moved SVG path keeps its move when something else about it is changed", () => {
        const store = renderPanel(<Moorhen2DCanvasObjects />);
        act(() => {
            store.dispatch(addSvgPathOverlay({ path: "M 10 10 L 50 50", drawStyle: "stroke", strokeStyle: "#000000ff", uniqueId: "svg" }));
            // As the handles move it.
            store.dispatch(updateOverlay({ uniqueId: "svg", changes: { offset: [30, 20] } }));
            store.dispatch(setSelected2DObject("svg"));
        });
        act(() => {
            fireEvent.change(screen.getByDisplayValue("Outline"), { target: { value: "fill" } });
        });
        click("Apply");
        expect(store.getState().overlays.svgPathOverlayList).toEqual([expect.objectContaining({ uniqueId: "svg", drawStyle: "fill", offset: [30, 20] })]);
    });

    test("applying the lower of two objects at one depth leaves it lower, and keeps its turn", () => {
        const store = renderPanel(<Moorhen2DCanvasObjects />);
        act(() => {
            store.dispatch(addTextOverlay({ x: 0.5, y: 0.5, text: "lower", fontFamily: "serif", fontPixelSize: 20, uniqueId: "lower", rotation: 30 }));
            store.dispatch(addTextOverlay({ x: 0.5, y: 0.5, text: "upper", fontFamily: "serif", fontPixelSize: 20, uniqueId: "upper" }));
            store.dispatch(setSelected2DObject("lower"));
        });
        act(() => {
            fireEvent.change(screen.getByDisplayValue("lower"), { target: { value: "still lower" } });
        });
        click("Apply");
        const texts = store.getState().overlays.textOverlayList;
        expect(texts.map(t => t.text)).toEqual(["still lower", "upper"]);
        expect(texts[0].rotation).toBe(30);
    });
});

