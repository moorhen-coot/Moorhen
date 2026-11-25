/**
 * Geometry of 2D overlay objects on the view: where they are, what is under the pointer, and how
 * dragging a handle changes them.
 *
 * Everything here is pure arithmetic in screen (CSS) pixels with y pointing down, so that the
 * handles, the picking and the tests all agree without a canvas.
 *
 * An object is described by a Frame: its stored position (the anchor) in pixels, a box about the
 * anchor before rotation, the point it turns about (the pivot), and the turn. A positive turn is
 * clockwise on screen, as the canvas's own rotate() is.
 */
import type {
    Overlay2DCircle,
    Overlay2DLine,
    Overlay2DObject,
    Overlay2DPolygon,
    Overlay2DTextFrac,
} from "../store/overlaysSlice";
import { fracPathPairs } from "../store/overlaysSlice";

export type Vec2 = [number, number];
export type Box = [number, number, number, number];

/** The view's size in CSS pixels. Positions stored as fractions are of this. */
export interface ViewSize {
    width: number;
    height: number;
}

export interface Frame {
    /** The stored position, in pixels: a text baseline's start, an image's top left, a shape's centre. */
    anchor: Vec2;
    /** minX, minY, maxX, maxY about the anchor, before rotation. */
    box: Box;
    /** What it turns about, relative to the anchor. */
    pivot: Vec2;
    /** Radians, clockwise. */
    rotation: number;
}

/** How far the selection box sits outside the object, in pixels. */
export const BOX_PADDING = 6;
/** How far above the selection box the rotate knob sits. */
export const ROTATE_KNOB_DISTANCE = 22;
/** Smallest radius, size or font a drag may shrink something to, in pixels. */
export const MIN_SIZE = 3;

const DEG = Math.PI / 180;

const rotate = ([x, y]: Vec2, angle: number): Vec2 => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [c * x - s * y, s * x + c * y];
};
const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Vec2, s: number): Vec2 => [a[0] * s, a[1] * s];
const dot = (a: Vec2, b: Vec2) => a[0] * b[0] + a[1] * b[1];
const length = (a: Vec2) => Math.hypot(a[0], a[1]);

export const boxOfPoints = (points: Vec2[]): Box => {
    if (points.length === 0) return [0, 0, 0, 0];
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of points) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }
    return [minX, minY, maxX, maxY];
};
export const boxCentre = (box: Box): Vec2 => [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];

/** Flat x, y pairs as points. */
export const pairsOf = (flat: number[]): Vec2[] => {
    const out: Vec2[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
    return out;
};

export const localToScreen = (frame: Frame, local: Vec2): Vec2 =>
    add(add(frame.anchor, frame.pivot), rotate(sub(local, frame.pivot), frame.rotation));

export const screenToLocal = (frame: Frame, point: Vec2): Vec2 =>
    add(frame.pivot, rotate(sub(sub(point, frame.anchor), frame.pivot), -frame.rotation));

/** The pivot on screen. */
export const pivotOnScreen = (frame: Frame): Vec2 => add(frame.anchor, frame.pivot);

/**
 * A plain text's box about the start of its baseline, from canvas metrics: from what overhangs to
 * the left to the further of the advance and what overhangs to the right, and from the ascent to
 * the descent.
 */
export const textBoxFromMetrics = (m: Pick<TextMetrics, "width" | "actualBoundingBoxLeft" | "actualBoundingBoxRight" | "actualBoundingBoxAscent" | "actualBoundingBoxDescent">): Box => [
    -Math.max(0, m.actualBoundingBoxLeft),
    -m.actualBoundingBoxAscent,
    Math.max(m.width, m.actualBoundingBoxRight),
    m.actualBoundingBoxDescent,
];

/**
 * A text's box about the start of its baseline, before rotation: what the handles draw round and
 * what it turns about. Plain text is measured; LaTeX comes from the typeset image.
 */
export type TextBoxOf = (text: Overlay2DTextFrac) => Box | null;

/**
 * The frame of an object, or null for one the handles place another way (an SVG path, whose
 * extent only the browser can work out) or that cannot be measured yet.
 */
export const frameOf = (obj: Overlay2DObject, view: ViewSize, textBox: TextBoxOf): Frame | null => {
    switch (obj.type) {
        case "Text": {
            const box = textBox(obj);
            if (!box) return null;
            return { anchor: [obj.x * view.width, obj.y * view.height], box, pivot: boxCentre(box), rotation: (obj.rotation ?? 0) * DEG };
        }
        case "Image": {
            const box: Box = [0, 0, obj.width, obj.height];
            return { anchor: [obj.x * view.width, obj.y * view.height], box, pivot: boxCentre(box), rotation: (obj.rotation ?? 0) * DEG };
        }
        case "Circle": {
            // An outline is drawn centred on the edge, so half of it lies outside.
            const edge = obj.drawStyle === "stroke" ? (obj.lineWidth ?? 1) / 2 : 0;
            return {
                anchor: [obj.x * view.width, obj.y * view.height],
                box: [-obj.radiusX - edge, -obj.radiusY - edge, obj.radiusX + edge, obj.radiusY + edge],
                pivot: [0, 0],
                rotation: (obj.rotation ?? 0) * DEG,
            };
        }
        case "Polygon": {
            const edge = obj.drawStyle === "stroke" ? (obj.lineWidth ?? 1) / 2 : 0;
            const [minX, minY, maxX, maxY] = boxOfPoints(pairsOf(obj.points));
            return {
                anchor: [obj.x * view.width, obj.y * view.height],
                box: [minX - edge, minY - edge, maxX + edge, maxY + edge],
                pivot: [0, 0],
                rotation: (obj.rotation ?? 0) * DEG,
            };
        }
        case "Line": {
            const start: Vec2 = [obj.x1 * view.width, obj.y1 * view.height];
            const end: Vec2 = [obj.x2 * view.width, obj.y2 * view.height];
            return { anchor: start, box: boxOfPoints([[0, 0], sub(end, start)]), pivot: [0, 0], rotation: 0 };
        }
        case "FracPath": {
            const points = fracPathPairs(obj.path).map(([x, y]) => [x * view.width, y * view.height] as Vec2);
            return { anchor: [0, 0], box: boxOfPoints(points), pivot: [0, 0], rotation: 0 };
        }
        default:
            return null;
    }
};

/** The selection box's corners on screen, padded, in order top-left, top-right, bottom-right, bottom-left. */
export const boxCorners = (frame: Frame, padding = BOX_PADDING): Vec2[] => {
    const [minX, minY, maxX, maxY] = frame.box;
    const local: Vec2[] = [
        [minX - padding, minY - padding],
        [maxX + padding, minY - padding],
        [maxX + padding, maxY + padding],
        [minX - padding, maxY + padding],
    ];
    return local.map(p => localToScreen(frame, p));
};

/** Where the rotate knob sits on screen, and the top of its stalk. */
export const rotateKnob = (frame: Frame, padding = BOX_PADDING): { knob: Vec2; stalk: Vec2 } => {
    const [minX, minY, maxX] = frame.box;
    const midX = (minX + maxX) / 2;
    return {
        stalk: localToScreen(frame, [midX, minY - padding]),
        knob: localToScreen(frame, [midX, minY - padding - ROTATE_KNOB_DISTANCE]),
    };
};

/** The pointer's direction from the pivot, in radians: the handle turns the object by its change. */
export const angleFromPivot = (frame: Frame, point: Vec2): number => {
    const d = sub(point, pivotOnScreen(frame));
    return Math.atan2(d[1], d[0]);
};

/**
 * The turn for a rotate drag, in degrees and in (-180, 180]. With `snap`, to the nearest 15.
 */
export const rotationForDrag = (startDegrees: number, frame: Frame, from: Vec2, to: Vec2, snap = false): number => {
    let degrees = startDegrees + (angleFromPivot(frame, to) - angleFromPivot(frame, from)) / DEG;
    if (snap) degrees = Math.round(degrees / 15) * 15;
    degrees = ((((degrees + 180) % 360) + 360) % 360) - 180;
    return degrees === -180 ? 180 : degrees;
};

/**
 * How much a corner drag scales by: the pointer's progress along the line from the fixed corner
 * through where the drag began. Measured along that line rather than by distance, so moving across
 * it does nothing rather than something odd.
 */
export const scaleForDrag = (fixed: Vec2, from: Vec2, to: Vec2): number => {
    const start = sub(from, fixed);
    const lengthSquared = dot(start, start);
    if (lengthSquared < 1e-6) return 1;
    return Math.max(0.02, dot(sub(to, fixed), start) / lengthSquared);
};

/** Changes, in store units, that move an object by `delta` pixels. */
export const moveChanges = (obj: Overlay2DObject, delta: Vec2, view: ViewSize): Record<string, unknown> => {
    const dx = delta[0] / view.width;
    const dy = delta[1] / view.height;
    switch (obj.type) {
        case "Line":
            return { x1: obj.x1 + dx, y1: obj.y1 + dy, x2: obj.x2 + dx, y2: obj.y2 + dy };
        case "SvgPath": {
            const [ox, oy] = obj.offset ?? [0, 0];
            return { offset: [ox + delta[0], oy + delta[1]] };
        }
        case "FracPath":
            return { path: fracPathPairs(obj.path).flatMap(([x, y]) => [x + dx, y + dy]) };
        default:
            return { x: obj.x + dx, y: obj.y + dy };
    }
};

/**
 * Changes that scale an object uniformly by `s` about the fixed screen point.
 *
 * Every frame here turns about a pivot that scales with the object, so the anchor simply scales
 * about the fixed point as any other point of the object does.
 */
export const scaleChanges = (obj: Overlay2DObject, frame: Frame, fixed: Vec2, s: number, view: ViewSize): Record<string, unknown> => {
    const anchor = add(fixed, scale(sub(frame.anchor, fixed), s));
    const position = { x: anchor[0] / view.width, y: anchor[1] / view.height };
    switch (obj.type) {
        case "Text":
            return { ...position, fontPixelSize: Math.max(MIN_SIZE, obj.fontPixelSize * s) };
        case "Image":
            return { ...position, width: Math.max(MIN_SIZE, obj.width * s), height: Math.max(MIN_SIZE, obj.height * s) };
        case "Circle":
            return { ...position, radiusX: Math.max(MIN_SIZE, obj.radiusX * s), radiusY: Math.max(MIN_SIZE, obj.radiusY * s) };
        case "Polygon":
            return { ...position, points: obj.points.map(v => v * s) };
        default:
            return {};
    }
};

/**
 * Move a polygon's points so that their box is centred on the anchor, moving the anchor so that
 * nothing on screen moves. Keeps the centre the middle of the shape after a reshape, so that it
 * still turns about its middle.
 */
const recentred = (points: Vec2[], frame: Frame, view: ViewSize): { points: number[]; x: number; y: number } => {
    const centre = boxCentre(boxOfPoints(points));
    const anchor = add(frame.anchor, rotate(centre, frame.rotation));
    return {
        points: points.flatMap(p => sub(p, centre)),
        x: anchor[0] / view.width,
        y: anchor[1] / view.height,
    };
};

/** Changes that put one corner of a polygon under the pointer. */
export const vertexChanges = (polygon: Overlay2DPolygon, frame: Frame, index: number, point: Vec2, view: ViewSize) => {
    const points = pairsOf(polygon.points);
    points[index] = screenToLocal(frame, point);
    return recentred(points, frame, view);
};

const RIGHT_ANGLE_TOLERANCE = 0.02;

/** Whether a polygon is a rectangle (four corners, all square), and so has edge handles. */
export const isRectangle = (flat: number[]): boolean => {
    const points = pairsOf(flat);
    if (points.length !== 4) return false;
    for (let i = 0; i < 4; i++) {
        const a = sub(points[(i + 3) % 4], points[i]);
        const b = sub(points[(i + 1) % 4], points[i]);
        const la = length(a);
        const lb = length(b);
        if (la < 1e-6 || lb < 1e-6) return false;
        if (Math.abs(dot(a, b) / (la * lb)) > RIGHT_ANGLE_TOLERANCE) return false;
    }
    return true;
};

/** The middle of each edge of a rectangle (edge i runs from corner i to corner i + 1), on screen. */
export const rectangleEdgeHandles = (polygon: Overlay2DPolygon, frame: Frame): Vec2[] => {
    const points = pairsOf(polygon.points);
    return points.map((p, i) => localToScreen(frame, scale(add(p, points[(i + 1) % points.length]), 0.5)));
};

/**
 * Changes that move one edge of a rectangle to the pointer, square to itself, so it stays a
 * rectangle. The edge cannot be pulled through the one opposite.
 */
export const rectangleEdgeChanges = (polygon: Overlay2DPolygon, frame: Frame, edge: number, point: Vec2, view: ViewSize) => {
    const points = pairsOf(polygon.points);
    const a = points[edge];
    const b = points[(edge + 1) % 4];
    const along = sub(b, a);
    let normal: Vec2 = [-along[1], along[0]];
    normal = scale(normal, 1 / (length(normal) || 1));
    // Outward: away from the opposite edge.
    const opposite = points[(edge + 2) % 4];
    if (dot(sub(a, opposite), normal) < 0) normal = scale(normal, -1);
    const width = dot(sub(a, opposite), normal);
    const pulled = dot(sub(screenToLocal(frame, point), a), normal);
    const shift = Math.max(MIN_SIZE - width, pulled);
    points[edge] = add(a, scale(normal, shift));
    points[(edge + 1) % 4] = add(b, scale(normal, shift));
    return recentred(points, frame, view);
};

/** The four stretch handles of a circle or ellipse, on screen: right, bottom, left, top. */
export const ellipseEdgeHandles = (circle: Overlay2DCircle, frame: Frame): Vec2[] =>
    ([
        [circle.radiusX, 0],
        [0, circle.radiusY],
        [-circle.radiusX, 0],
        [0, -circle.radiusY],
    ] as Vec2[]).map(p => localToScreen(frame, p));

/** Changes for dragging stretch handle `which` (as ellipseEdgeHandles) to the pointer; both sides move. */
export const ellipseEdgeChanges = (frame: Frame, which: number, point: Vec2) => {
    const local = screenToLocal(frame, point);
    return which % 2 === 0 ? { radiusX: Math.max(MIN_SIZE, Math.abs(local[0])) } : { radiusY: Math.max(MIN_SIZE, Math.abs(local[1])) };
};

const distanceToSegment = (p: Vec2, a: Vec2, b: Vec2): number => {
    const ab = sub(b, a);
    const lengthSquared = dot(ab, ab);
    const t = lengthSquared < 1e-9 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / lengthSquared));
    return length(sub(p, add(a, scale(ab, t))));
};

const insidePolygon = (p: Vec2, points: Vec2[]): boolean => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
};

const nearPolyline = (p: Vec2, points: Vec2[], tolerance: number, closed: boolean): boolean => {
    const n = closed ? points.length : points.length - 1;
    for (let i = 0; i < n; i++) {
        if (distanceToSegment(p, points[i], points[(i + 1) % points.length]) <= tolerance) return true;
    }
    return false;
};

/** A line's ends on screen. */
export const lineEnds = (line: Overlay2DLine, view: ViewSize): [Vec2, Vec2] => [
    [line.x1 * view.width, line.y1 * view.height],
    [line.x2 * view.width, line.y2 * view.height],
];

/** Changes that put one end of a line (0 start, 1 end) under the pointer. */
export const lineEndChanges = (end: 0 | 1, point: Vec2, view: ViewSize) =>
    end === 0 ? { x1: point[0] / view.width, y1: point[1] / view.height } : { x2: point[0] / view.width, y2: point[1] / view.height };

/** How long an arrow head is for a line of this width, in pixels. */
export const arrowHeadLength = (lineWidth: number) => Math.max(14, 5 * lineWidth);

/**
 * An arrow head at `tip`, pointing away from `from`: its three corners, tip first. The line itself
 * should stop at the head's base (the second value), or its square end shows past the point.
 */
export const arrowHead = (tip: Vec2, from: Vec2, lineWidth: number): { corners: Vec2[]; base: Vec2 } => {
    const direction = sub(tip, from);
    const len = length(direction) || 1;
    const unit = scale(direction, 1 / len);
    const headLength = Math.min(arrowHeadLength(lineWidth), len);
    const halfWidth = headLength * 0.45;
    const base = sub(tip, scale(unit, headLength));
    const across: Vec2 = [-unit[1], unit[0]];
    return { corners: [tip, add(base, scale(across, halfWidth)), sub(base, scale(across, halfWidth))], base };
};

/**
 * Whether the pointer is on an object. Generous by `tolerance` pixels, so that thin lines and
 * outlines can be clicked. SVG paths are not answered here: only the browser can test those (see
 * the handles layer).
 */
export const hitsObject = (obj: Overlay2DObject, frame: Frame | null, point: Vec2, view: ViewSize, tolerance = 4): boolean => {
    switch (obj.type) {
        case "Text":
        case "Image": {
            if (!frame) return false;
            const [lx, ly] = screenToLocal(frame, point);
            const [minX, minY, maxX, maxY] = frame.box;
            return lx >= minX - tolerance && lx <= maxX + tolerance && ly >= minY - tolerance && ly <= maxY + tolerance;
        }
        case "Circle": {
            if (!frame) return false;
            const [lx, ly] = screenToLocal(frame, point);
            const rx = obj.radiusX + tolerance;
            const ry = obj.radiusY + tolerance;
            return (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1;
        }
        case "Polygon": {
            if (!frame) return false;
            const local = screenToLocal(frame, point);
            const points = pairsOf(obj.points);
            return insidePolygon(local, points) || nearPolyline(local, points, tolerance, true);
        }
        case "Line": {
            const [start, end] = lineEnds(obj, view);
            return distanceToSegment(point, start, end) <= Math.max(tolerance, (obj.lineWidth ?? 1) / 2 + 2);
        }
        case "FracPath": {
            const points = fracPathPairs(obj.path).map(([x, y]) => [x * view.width, y * view.height] as Vec2);
            if (points.length < 2) return false;
            const filled = obj.drawStyle !== "stroke";
            return (filled && insidePolygon(point, points)) || nearPolyline(point, points, Math.max(tolerance, (obj.lineWidth ?? 1) / 2 + 2), filled);
        }
        default:
            return false;
    }
};

/**
 * The objects in the order a click should try them: the topmost first.
 *
 * The reverse of how drawOn2DContext paints them: by depth (zIndex) and, within a depth, text,
 * SVG paths, images, fractional paths and then shapes, each in list order.
 */
export const pickOrder = (lists: {
    textOverlayList: Overlay2DObject[];
    svgPathOverlayList: Overlay2DObject[];
    imageOverlayList: Overlay2DObject[];
    fracPathOverlayList: Overlay2DObject[];
    shapeOverlayList: Overlay2DObject[];
}): Overlay2DObject[] => {
    // LaTeX text is painted typeset, after the image overlays (see drawOn2DContext), not with the
    // plain text.
    const isLatex = (o: Overlay2DObject) => "latex" in o && !!o.latex;
    const painted = [
        ...lists.textOverlayList.filter(o => !isLatex(o)),
        ...lists.svgPathOverlayList,
        ...lists.imageOverlayList,
        ...lists.textOverlayList.filter(isLatex),
        ...lists.fracPathOverlayList,
        ...lists.shapeOverlayList,
    ];
    const depth = (o: Overlay2DObject) => o.zIndex ?? 0;
    // A stable sort by depth keeps the painting order within each depth.
    return painted
        .map((o, i) => ({ o, i }))
        .sort((a, b) => depth(a.o) - depth(b.o) || a.i - b.i)
        .map(({ o }) => o)
        .reverse();
};

