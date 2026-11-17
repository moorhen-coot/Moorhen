/**
 * The geometry behind the 2D handles: frames, picking, and what each kind of drag does.
 */
import {
    arrowHead,
    boxCorners,
    ellipseEdgeChanges,
    frameOf,
    hitsObject,
    isRectangle,
    localToScreen,
    moveChanges,
    pickOrder,
    rectangleEdgeChanges,
    rotationForDrag,
    scaleChanges,
    scaleForDrag,
    screenToLocal,
    vertexChanges,
    type Vec2,
} from "../../src/utils/overlay2DGeometry";
import { moorhensession } from "../../src/protobuf/MoorhenSession";
import {
    fracPathPairs,
    newCircleOverlay,
    newLineOverlay,
    newPolygonOverlay,
    regularPolygonPoints,
    shapesFromSession,
    type Overlay2DImageSrcFrac,
    type Overlay2DTextFrac,
} from "../../src/store/overlaysSlice";

const view = { width: 1000, height: 500 };
const noText = () => null;
const close = (a: number[], b: number[], digits = 6) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], digits));

describe("regular polygons", () => {
    test("a square is square-on, and a triangle points up", () => {
        const square = regularPolygonPoints(4, Math.SQRT2);
        close(square, [-1, 1, -1, -1, 1, -1, 1, 1]);
        expect(isRectangle(square)).toBe(true);
        const triangle = regularPolygonPoints(3, 1);
        // The top corner is the one with the smallest y (y points down the screen).
        const ys = [triangle[1], triangle[3], triangle[5]];
        expect(Math.min(...ys)).toBeCloseTo(-1);
    });

    test("isRectangle needs four square corners", () => {
        expect(isRectangle([0, 0, 4, 0, 4, 2, 0, 2])).toBe(true);
        expect(isRectangle([0, 0, 4, 0, 5, 2, 0, 2])).toBe(false);
        expect(isRectangle(regularPolygonPoints(5, 10))).toBe(false);
        expect(isRectangle([0, 0, 0, 0, 4, 2, 0, 2])).toBe(false);
    });
});

describe("frames", () => {
    test("local and screen coordinates are inverse, about the pivot", () => {
        const circle = newCircleOverlay({ x: 0.5, y: 0.5, radiusX: 40, radiusY: 20, rotation: 90 });
        const frame = frameOf(circle, view, noText);
        // A quarter turn clockwise takes the right-hand end of the long axis to the bottom.
        close(localToScreen(frame, [40, 0]), [500, 290]);
        close(screenToLocal(frame, localToScreen(frame, [12, -7])), [12, -7]);
    });

    test("an image turns about its middle", () => {
        const image: Overlay2DImageSrcFrac = { type: "Image", x: 0.1, y: 0.2, width: 100, height: 50, src: "", uniqueId: "i", rotation: 180 };
        const frame = frameOf(image, view, noText);
        // Its top left corner, turned half way round its middle, is where its bottom right was.
        close(localToScreen(frame, [0, 0]), [200, 150]);
    });

    test("text needs measuring, and has no frame until it can be", () => {
        const text: Overlay2DTextFrac = { type: "Text", x: 0.5, y: 0.5, text: "x", fontFamily: "serif", fontPixelSize: 20, uniqueId: "t" };
        expect(frameOf(text, view, noText)).toBeNull();
        const frame = frameOf(text, view, () => [0, -15, 30, 5]);
        expect(frame.pivot).toEqual([15, -5]);
    });
});

describe("dragging", () => {
    test("move works in fractions for positions and in pixels for an SVG path", () => {
        expect(moveChanges(newCircleOverlay({ x: 0.5, y: 0.5 }), [100, 50], view)).toEqual({ x: 0.6, y: 0.6 });
        expect(moveChanges(newLineOverlay({ x1: 0, y1: 0, x2: 0.5, y2: 0.5 }), [100, 50], view)).toEqual({ x1: 0.1, y1: 0.1, x2: 0.6, y2: 0.6 });
        expect(moveChanges({ type: "SvgPath", path: "M0 0", uniqueId: "s", offset: [5, 5] }, [10, -5], view)).toEqual({ offset: [15, 0] });
        expect(moveChanges({ type: "FracPath", path: [0.1, 0.1, 0.2, 0.2], uniqueId: "f" }, [100, 50], view).path).toEqual([0.2, 0.2, 0.30000000000000004, 0.30000000000000004]);
    });

    test("a corner scales about the opposite corner, which stays put", () => {
        const circle = newCircleOverlay({ x: 0.5, y: 0.5, radiusX: 40, radiusY: 40, rotation: 30 });
        const frame = frameOf(circle, view, noText);
        const corners = boxCorners(frame);
        const fixed = corners[2];
        const from = corners[0];
        const to: Vec2 = [fixed[0] + (from[0] - fixed[0]) * 2, fixed[1] + (from[1] - fixed[1]) * 2];
        const s = scaleForDrag(fixed, from, to);
        expect(s).toBeCloseTo(2);
        const changes = scaleChanges(circle, frame, fixed, s, view) as { x: number; y: number; radiusX: number };
        expect(changes.radiusX).toBeCloseTo(80);
        // The centre moved away from the fixed corner, twice as far as it was.
        const centre: Vec2 = [changes.x * view.width, changes.y * view.height];
        close(centre, [fixed[0] + 2 * (500 - fixed[0]), fixed[1] + 2 * (250 - fixed[1])]);
    });

    test("scaling text changes its size, and keeps it proportioned", () => {
        const text: Overlay2DTextFrac = { type: "Text", x: 0.5, y: 0.5, text: "x", fontFamily: "serif", fontPixelSize: 20, uniqueId: "t" };
        const frame = frameOf(text, view, () => [0, -15, 30, 5]);
        expect((scaleChanges(text, frame, [0, 0], 1.5, view) as { fontPixelSize: number }).fontPixelSize).toBeCloseTo(30);
    });

    test("rotation follows the pointer round the pivot, and snaps to 15 degrees with shift", () => {
        const frame = frameOf(newCircleOverlay({ x: 0.5, y: 0.5 }), view, noText);
        // From straight above to straight right is a quarter turn clockwise.
        expect(rotationForDrag(0, frame, [500, 100], [700, 250])).toBeCloseTo(90);
        expect(rotationForDrag(170, frame, [500, 100], [700, 250])).toBeCloseTo(-100);
        const snapped = rotationForDrag(0, frame, [500, 100], [700, 240], true);
        expect(snapped % 15).toBe(0);
    });

    test("dragging a corner of a polygon reshapes it and keeps the rest where it was", () => {
        const square = newPolygonOverlay({ x: 0.5, y: 0.5, sides: 4, points: [-10, -10, 10, -10, 10, 10, -10, 10] });
        const frame = frameOf(square, view, noText);
        const changes = vertexChanges(square, frame, 2, [530, 280], view);
        const anchor: Vec2 = [changes.x * view.width, changes.y * view.height];
        const onScreen = [];
        for (let i = 0; i < changes.points.length; i += 2) onScreen.push(changes.points[i] + anchor[0], changes.points[i + 1] + anchor[1]);
        close(onScreen, [490, 240, 510, 240, 530, 280, 490, 260]);
        expect(isRectangle(changes.points)).toBe(false);
    });

    test("an edge of a rectangle moves square to itself and cannot pass the opposite edge", () => {
        const rect = newPolygonOverlay({ x: 0.5, y: 0.5, sides: 4, points: [-10, -10, 10, -10, 10, 10, -10, 10] });
        const frame = frameOf(rect, view, noText);
        // Edge 1 runs from corner 1 (top right) to corner 2 (bottom right): the right-hand side.
        const changes = rectangleEdgeChanges(rect, frame, 1, [540, 999], view);
        expect(isRectangle(changes.points)).toBe(true);
        const xs = [0, 2, 4, 6].map(i => changes.points[i] + changes.x * view.width);
        expect(Math.max(...xs)).toBeCloseTo(540);
        expect(Math.min(...xs)).toBeCloseTo(490);
        const squashed = rectangleEdgeChanges(rect, frame, 1, [0, 250], view);
        const width = Math.max(...[0, 2, 4, 6].map(i => squashed.points[i])) - Math.min(...[0, 2, 4, 6].map(i => squashed.points[i]));
        expect(width).toBeGreaterThan(0);
    });

    test("an ellipse's edge handle sets one radius", () => {
        const frame = frameOf(newCircleOverlay({ x: 0.5, y: 0.5, rotation: 90 }), view, noText);
        // Turned a quarter, the x radius points down the screen.
        expect(ellipseEdgeChanges(frame, 0, [500, 310])).toEqual({ radiusX: expect.closeTo(60, 6) });
        expect(ellipseEdgeChanges(frame, 1, [470, 250])).toEqual({ radiusY: expect.closeTo(30, 6) });
    });
});

describe("picking", () => {
    test("shapes, lines and fractional paths answer by what they look like", () => {
        const circle = newCircleOverlay({ x: 0.5, y: 0.5, radiusX: 40, radiusY: 10 });
        const f = frameOf(circle, view, noText);
        expect(hitsObject(circle, f, [535, 250], view)).toBe(true);
        expect(hitsObject(circle, f, [500, 280], view)).toBe(false);

        const line = newLineOverlay({ x1: 0, y1: 0, x2: 1, y2: 1 });
        expect(hitsObject(line, null, [502, 250], view)).toBe(true);
        expect(hitsObject(line, null, [500, 300], view)).toBe(false);

        const outline = { type: "FracPath" as const, path: [0.1, 0.1, 0.9, 0.1, 0.9, 0.9], drawStyle: "stroke", uniqueId: "f" };
        expect(hitsObject(outline, frameOf(outline, view, noText), [500, 51], view)).toBe(true);
        expect(hitsObject(outline, frameOf(outline, view, noText), [700, 100], view)).toBe(false);
        const filled = { ...outline, drawStyle: "fill" };
        expect(hitsObject(filled, frameOf(filled, view, noText), [700, 100], view)).toBe(true);
    });

    test("the topmost is tried first: by depth, then the later drawn", () => {
        const a = newCircleOverlay({ uniqueId: "a", zIndex: 0 });
        const b = newCircleOverlay({ uniqueId: "b", zIndex: 0 });
        const c = newCircleOverlay({ uniqueId: "c", zIndex: 2 });
        const text: Overlay2DTextFrac = { type: "Text", x: 0, y: 0, text: "t", fontFamily: "serif", fontPixelSize: 10, uniqueId: "t", zIndex: 3 };
        const order = pickOrder({ textOverlayList: [text], svgPathOverlayList: [], imageOverlayList: [], fracPathOverlayList: [], shapeOverlayList: [a, b, c] });
        expect(order.map(o => o.uniqueId)).toEqual(["t", "c", "b", "a"]);
    });
});

describe("drawing helpers", () => {
    test("an arrow head points at its tip and the line stops at its base", () => {
        const { corners, base } = arrowHead([100, 0], [0, 0], 2);
        expect(corners[0]).toEqual([100, 0]);
        expect(base[0]).toBeLessThan(100);
        expect(base[1]).toBeCloseTo(0);
        expect(corners[1][1]).toBeCloseTo(-corners[2][1]);
    });

    test("fractional paths are read flat or as pairs", () => {
        expect(fracPathPairs([0.1, 0.2, 0.3, 0.4])).toEqual([[0.1, 0.2], [0.3, 0.4]]);
        expect(fracPathPairs([[0.1, 0.2], [0.3, 0.4]] as never)).toEqual([[0.1, 0.2], [0.3, 0.4]]);
    });

    test("shapes from a session get their type back and defaults for what was not written", () => {
        const shapes = shapesFromSession({ circle2D: [{ radiusX: 10, uniqueId: "c" }], line2D: [{ x2: 0.5, uniqueId: "l" }] });
        expect(shapes[0]).toMatchObject({ type: "Circle", x: 0, y: 0, radiusX: 10, radiusY: 40, uniqueId: "c" });
        expect(shapes[1]).toMatchObject({ type: "Line", x1: 0, y1: 0, x2: 0.5, y2: 0, arrowEnd: false, uniqueId: "l" });
    });
});

describe("sessions", () => {
    test("shapes, turns and a moved SVG path survive a protobuf round trip", () => {
        const circle = newCircleOverlay({ uniqueId: "c", x: 0.25, y: 0.75, radiusX: 30, radiusY: 12, rotation: 45, drawStyle: "stroke", lineWidth: 3, strokeStyle: "#ff0000ff", zIndex: 2 });
        const polygon = newPolygonOverlay({ uniqueId: "p", x: 0.5, y: 0.5, sides: 5, rotation: -30, fillStyle: "#00ff00ff" });
        const line = newLineOverlay({ uniqueId: "l", x1: 0, y1: 0.25, x2: 0.5, y2: 0.5, arrowStart: true, arrowEnd: false, lineWidth: 4 });
        const overlay2dData = {
            circle2D: [circle],
            polygon2D: [polygon],
            line2D: [line],
            textFracPath2D: [{ x: 0.5, y: 0.5, text: "t", fontFamily: "serif", fontPixelSize: 20, uniqueId: "t", rotation: 15 }],
            imageFracPath2D: [{ x: 0.1, y: 0.1, width: 64, height: 32, src: "data:", uniqueId: "i", rotation: 90, zIndex: 3 }],
            svgPath2D: [{ path: "M0 0 L10 10", uniqueId: "s", offset: [12, -4], zIndex: 1 }],
        };
        const bytes = moorhensession.Session.encode(moorhensession.Session.fromObject({ version: "1", overlay2dData } as never)).finish();
        const back = (moorhensession.Session.toObject(moorhensession.Session.decode(bytes)) as { overlay2dData: Record<string, any[]> }).overlay2dData;
        const shapes = shapesFromSession(back);
        expect(shapes).toHaveLength(3);
        expect(shapes[0]).toMatchObject({ type: "Circle", radiusX: 30, radiusY: 12, rotation: 45, drawStyle: "stroke", zIndex: 2 });
        expect(shapes[0].type === "Circle" && shapes[0].x).toBeCloseTo(0.25);
        expect(shapes[1]).toMatchObject({ type: "Polygon", sides: 5, uniqueId: "p" });
        expect(shapes[1].type === "Polygon" && shapes[1].points).toHaveLength(10);
        expect(shapes[2]).toMatchObject({ type: "Line", x1: 0, arrowStart: true, arrowEnd: false, lineWidth: 4 });
        expect(back.textFracPath2D[0].rotation).toBe(15);
        expect(back.imageFracPath2D[0]).toMatchObject({ rotation: 90, zIndex: 3 });
        expect(back.svgPath2D[0]).toMatchObject({ offset: [12, -4], zIndex: 1 });
    });
});

