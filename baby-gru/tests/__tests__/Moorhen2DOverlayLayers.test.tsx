/*
 * Z-depth: each 2D object is drawn on the canvas of its depth, and those canvases are stacked in
 * depth order, so a deeper object is under a shallower one wherever they overlap.
 */
import { act, render } from "@testing-library/react";
import { Provider } from "react-redux";
import "./testUtils";
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import { setGlViewportHeight, setGlViewportWidth } from "@/store/sceneSettingsSlice";
import { addShapeOverlay, addTextOverlay, newCircleOverlay, updateOverlay } from "@/store/overlaysSlice";
import { Moorhen2DOverlay } from "@/components/webMG/Moorhen2DOverlay";

/** What was drawn on each canvas: text drawn, and shapes filled. */
const drawn = new Map<HTMLCanvasElement, string[]>();

const recordingContext = (canvas: HTMLCanvasElement) =>
    new Proxy(
        { canvas },
        {
            get(target, key) {
                if (key === "canvas") return canvas;
                if (key === "fillText" || key === "strokeText") return (text: string) => drawn.get(canvas)?.push("text:" + text);
                if (key === "ellipse") return () => drawn.get(canvas)?.push("circle");
                if (key === "measureText") return () => ({ width: 10, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
                if (key in target) return (target as Record<string | symbol, unknown>)[key];
                return () => undefined;
            },
            set(target, key, value) {
                (target as Record<string | symbol, unknown>)[key] = value;
                return true;
            },
        }
    );

beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
        if (!drawn.has(this)) drawn.set(this, []);
        return recordingContext(this);
    } as never;
});

const layersOf = (container: HTMLElement) => {
    const canvases = [...container.querySelectorAll("canvas")];
    return canvases.map(c => ({ zIndex: Number(c.style.zIndex), drawn: drawn.get(c) ?? [] }));
};

describe("2D z-depth", () => {
    test("each object is drawn on the canvas of its depth, stacked in depth order", async () => {
        const store = createMoorhenStore();
        store.dispatch(setGlViewportWidth(400));
        store.dispatch(setGlViewportHeight(300));
        store.dispatch(addTextOverlay({ x: 0.5, y: 0.5, text: "deep", fontFamily: "serif", fontPixelSize: 20, uniqueId: "deep", zIndex: 0 }));
        store.dispatch(addTextOverlay({ x: 0.5, y: 0.5, text: "top", fontFamily: "serif", fontPixelSize: 20, uniqueId: "top", zIndex: 3 }));
        store.dispatch(addShapeOverlay(newCircleOverlay({ uniqueId: "c", zIndex: 2 })));
        const { container } = render(
            <Provider store={store}>
                <Moorhen2DOverlay urlPrefix="" drawQuat={[0, 0, 0, -1]} />
            </Provider>
        );
        await act(async () => {});
        const layers = layersOf(container);
        expect(layers.map(l => l.zIndex)).toEqual([0, 1, 2, 3, 4]);
        expect(layers[0].drawn).toContain("text:deep");
        expect(layers[3].drawn).toContain("text:top");
        expect(layers[2].drawn).toContain("circle");
        expect(layers[0].drawn).not.toContain("text:top");

        // Moving one to another depth moves it to that canvas.
        drawn.forEach(list => list.splice(0));
        await act(async () => {
            store.dispatch(updateOverlay({ uniqueId: "deep", changes: { zIndex: 4 } }));
        });
        expect(layersOf(container)[4].drawn).toContain("text:deep");
        expect(layersOf(container)[0].drawn).not.toContain("text:deep");
    });
});
