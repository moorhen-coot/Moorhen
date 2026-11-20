/*
 * The 2D handles layer: what it shows for each kind of object, picking by clicking, and that a
 * drag on a handle changes the object in the store.
 */
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import "./testUtils";
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import { setGlViewportHeight, setGlViewportWidth } from "@/store/sceneSettingsSlice";
import { setShownSidePanel } from "@/store/globalUISlice";
import { setSelected2DObject } from "@/store/generalStatesSlice";
import { addShapeOverlay, newCircleOverlay, newLineOverlay, newPolygonOverlay } from "@/store/overlaysSlice";
import { addTextOverlay } from "@/store/overlaysSlice";

// No MathJax here: LaTeX measures 2 by 1 pixels at a size of 1, its baseline 0.8 down.
jest.mock("@/utils/textStyle", () => ({
    ...jest.requireActual("@/utils/textStyle"),
    latexMetrics: async () => ({ width: 2, height: 1, ascent: 0.8 }),
}));

import { Overlay2DHandles } from "@/components/webMG/Overlay2DHandles";

// jsdom has no PointerEvent, so the events testing-library makes would carry no button or
// position. A MouseEvent with a pointer id is all the handles read.
if (typeof window.PointerEvent === "undefined") {
    class PointerEventStandIn extends MouseEvent {
        pointerId: number;
        constructor(type: string, init: PointerEventInit = {}) {
            super(type, init);
            this.pointerId = init.pointerId ?? 1;
        }
    }
    (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventStandIn;
}

const setup = (open = true) => {
    const store = createMoorhenStore();
    store.dispatch(setGlViewportWidth(1000));
    store.dispatch(setGlViewportHeight(500));
    if (open) store.dispatch(setShownSidePanel("overlay2DObjects"));
    store.dispatch(addShapeOverlay(newCircleOverlay({ uniqueId: "circle", x: 0.5, y: 0.5, radiusX: 40, radiusY: 40 })));
    store.dispatch(addShapeOverlay(newPolygonOverlay({ uniqueId: "square", x: 0.2, y: 0.5, sides: 4, points: [-10, -10, 10, -10, 10, 10, -10, 10] })));
    store.dispatch(addShapeOverlay(newLineOverlay({ uniqueId: "line", x1: 0.7, y1: 0.2, x2: 0.9, y2: 0.2 })));
    // A figure, as in the real view: picking listens on the handles layer's parent.
    const { container } = render(
        <Provider store={store}>
            <figure data-testid="figure" style={{ position: "relative" }}>
                <canvas data-testid="gl" />
                <Overlay2DHandles />
            </figure>
        </Provider>
    );
    const svg = container.querySelector("svg") as SVGSVGElement;
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    return { store, svg, canvas };
};

const click = (target: Element, x: number, y: number) => {
    act(() => {
        fireEvent.mouseDown(target, { button: 0, clientX: x, clientY: y });
        fireEvent.mouseUp(target, { button: 0, clientX: x, clientY: y });
    });
};

const drag = (svg: SVGSVGElement, target: Element, from: [number, number], to: [number, number]) => {
    act(() => {
        fireEvent.pointerDown(target, { button: 0, clientX: from[0], clientY: from[1], pointerId: 1 });
        fireEvent.pointerMove(svg, { clientX: to[0], clientY: to[1], pointerId: 1 });
        fireEvent.pointerUp(svg, { clientX: to[0], clientY: to[1], pointerId: 1 });
    });
};

describe("2D handles", () => {
    test("a click on a shape picks it, and a click on nothing lets it go", () => {
        const { store, canvas } = setup();
        click(canvas, 520, 250);
        expect(store.getState().generalStates.selected2DObjectId).toBe("circle");
        click(canvas, 800, 101);
        expect(store.getState().generalStates.selected2DObjectId).toBe("line");
        click(canvas, 50, 50);
        expect(store.getState().generalStates.selected2DObjectId).toBeNull();
    });

    test("nothing is picked while the 2D objects panel is closed", () => {
        const { store, canvas } = setup(false);
        click(canvas, 520, 250);
        expect(store.getState().generalStates.selected2DObjectId).toBeNull();
    });

    test("a drag is not a click", () => {
        const { store, canvas } = setup();
        act(() => {
            fireEvent.mouseDown(canvas, { button: 0, clientX: 500, clientY: 250 });
            fireEvent.mouseUp(canvas, { button: 0, clientX: 560, clientY: 250 });
        });
        expect(store.getState().generalStates.selected2DObjectId).toBeNull();
    });

    test("a circle has a box, four corners, four stretch handles and a rotate knob", () => {
        const { store, svg } = setup();
        act(() => {
            store.dispatch(setSelected2DObject("circle"));
        });
        // Corners and stretch handles are squares; the knob is a circle in a group.
        expect(svg.querySelectorAll("rect")).toHaveLength(8);
        expect(svg.querySelectorAll("g circle")).toHaveLength(1);
    });

    test("dragging a corner out scales the circle", async () => {
        const { store, svg } = setup();
        act(() => {
            store.dispatch(setSelected2DObject("circle"));
        });
        // The bottom-right corner sits at the box's corner, padded: (546, 296).
        const corner = [...svg.querySelectorAll("rect")].find(r => Number(r.getAttribute("x")) > 540 && Number(r.getAttribute("y")) > 290);
        // Half as far again from the opposite corner, (454, 204): half as big again.
        drag(svg, corner, [546, 296], [592, 342]);
        await waitFor(() => expect((store.getState().overlays.shapeOverlayList[0] as { radiusX: number }).radiusX).toBeCloseTo(60));
    });

    test("the rotate knob turns it", async () => {
        const { store, svg } = setup();
        act(() => {
            store.dispatch(setSelected2DObject("circle"));
        });
        const knob = svg.querySelector("g") as Element;
        // From above the centre round to its right is a quarter turn.
        drag(svg, knob, [500, 182], [568, 250]);
        await waitFor(() => expect((store.getState().overlays.shapeOverlayList[0] as { rotation: number }).rotation).toBeCloseTo(90));
    });

    test("a square has corner, edge and vertex handles; once a vertex is dragged off square, the edge handles go", async () => {
        const { store, svg } = setup();
        act(() => {
            store.dispatch(setSelected2DObject("square"));
        });
        expect(svg.querySelectorAll("rect")).toHaveLength(8);
        const vertices = [...svg.querySelectorAll("circle")].filter(c => c.getAttribute("r") === "4.5");
        expect(vertices).toHaveLength(4);
        drag(svg, vertices[2], [210, 260], [230, 280]);
        await waitFor(() => expect(svg.querySelectorAll("rect")).toHaveLength(4));
    });

    test("a line's ends move", async () => {
        const { store, svg } = setup();
        act(() => {
            store.dispatch(setSelected2DObject("line"));
        });
        const ends = [...svg.querySelectorAll("circle")];
        expect(ends).toHaveLength(2);
        drag(svg, ends[1], [900, 100], [950, 150]);
        await waitFor(() => expect(store.getState().overlays.shapeOverlayList[2]).toMatchObject({ x2: 0.95, y2: 0.3 }));
    });
});

describe("2D handles: drags that leave the handles", () => {
    test("a resize goes on outside the handles, ends wherever the button comes up, and does nothing after", async () => {
        const { store, svg } = setup();
        act(() => {
            store.dispatch(setSelected2DObject("circle"));
        });
        const radius = () => (store.getState().overlays.shapeOverlayList[0] as { radiusX: number }).radiusX;
        const corner = [...svg.querySelectorAll("rect")].find(r => Number(r.getAttribute("x")) > 540 && Number(r.getAttribute("y")) > 290);
        act(() => {
            fireEvent.pointerDown(corner, { button: 0, clientX: 546, clientY: 296, pointerId: 1 });
            // Over the 3D view, not over any handle.
            fireEvent.pointerMove(window, { clientX: 592, clientY: 342, pointerId: 1 });
        });
        await waitFor(() => expect(radius()).toBeCloseTo(60));
        act(() => {
            fireEvent.pointerUp(document.body, { clientX: 592, clientY: 342, pointerId: 1 });
            fireEvent.pointerMove(svg, { clientX: 700, clientY: 450, pointerId: 1 });
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(radius()).toBeCloseTo(60);
    });

    test("LaTeX keeps its handles while it is grown, and grows", async () => {
        const { store, svg } = setup();
        act(() => {
            store.dispatch(addTextOverlay({ x: 0.5, y: 0.2, text: "\\alpha", fontFamily: "serif", fontPixelSize: 20, uniqueId: "latex", latex: true }));
            store.dispatch(setSelected2DObject("latex"));
        });
        // Its box, 40 by 20 at size 20 with the baseline 16 down, is there once measured.
        await waitFor(() => expect(svg.querySelectorAll("rect")).toHaveLength(4));
        const size = () => store.getState().overlays.textOverlayList[0].fontPixelSize;
        // The bottom-right corner: (500 + 40 + 6, 100 + 4 + 6).
        const corner = [...svg.querySelectorAll("rect")].find(r => Number(r.getAttribute("x")) > 540 && Number(r.getAttribute("y")) > 105);
        act(() => {
            fireEvent.pointerDown(corner, { button: 0, clientX: 546, clientY: 110, pointerId: 1 });
            fireEvent.pointerMove(window, { clientX: 572, clientY: 120, pointerId: 1 });
        });
        await waitFor(() => expect(size()).toBeGreaterThan(25));
        // Still boxed at the new size, so the drag can carry on.
        expect(svg.querySelectorAll("rect")).toHaveLength(4);
        act(() => {
            fireEvent.pointerMove(window, { clientX: 640, clientY: 145, pointerId: 1 });
        });
        await waitFor(() => expect(size()).toBeGreaterThan(40));
        act(() => {
            fireEvent.pointerUp(window, { pointerId: 1 });
        });
    });
});

