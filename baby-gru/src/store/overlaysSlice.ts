import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Overlay2DFracPath {
    type: "FracPath";
    path: number[];
    fillStyle?: string;
    strokeStyle?: string;
    drawStyle?: string;
    gradientBoundary?: [number, number, number, number];
    gradientStops?: { stop: number; colour: string }[];
    lineWidth?: number;
    uniqueId: string;
    zIndex?: number;
}
export interface Overlay2DSvgPath {
    type: "SvgPath";
    path: string;
    /** Where the path has been moved to, in screen pixels, added to every coordinate in it. */
    offset?: [number, number];
    fillStyle?: string;
    strokeStyle?: string;
    drawStyle?: string;
    gradientBoundary?: [number, number, number, number];
    gradientStops?: { stop: number; colour: string }[];
    lineWidth?: number;
    uniqueId: string;
    zIndex?: number;
}

export interface Overlay2DTextFrac {
    type: "Text";
    x: number;
    y: number;
    text: string;
    fontFamily: string;
    fontPixelSize: number;
    fillStyle?: string;
    strokeStyle?: string;
    drawStyle?: string;
    lineWidth?: number;
    uniqueId: string;
    zIndex?: number;
    /** Clockwise turn in degrees, about the middle of the text. */
    rotation?: number;
    /**
     * Typeset `text` as LaTeX. fontPixelSize is then the em size; fontFamily, drawStyle and
     * lineWidth are kept but not used, and the colour is fillStyle (or strokeStyle).
     */
    latex?: boolean;
}

export interface Overlay2DImageSrcFrac {
    type: "Image";
    x: number;
    y: number;
    width: number;
    height: number;
    src: string;
    uniqueId: string;
    zIndex?: number;
    /** Clockwise turn in degrees, about the middle of the image. */
    rotation?: number;
}

/** What the drawn shapes share: where on the view, and how they are painted. */
interface Overlay2DShapeBase {
    /** The centre (circle, polygon) as a fraction of the view's width and height. */
    x: number;
    y: number;
    fillStyle?: string;
    strokeStyle?: string;
    drawStyle?: "fill" | "stroke";
    /** Outline width in screen pixels. */
    lineWidth?: number;
    uniqueId: string;
    zIndex?: number;
}

/**
 * A circle, or an ellipse once stretched. Radii are in screen pixels, so that a circle stays round
 * whatever the shape of the window, as text keeps its size.
 */
export interface Overlay2DCircle extends Overlay2DShapeBase {
    type: "Circle";
    radiusX: number;
    radiusY: number;
    /** Clockwise turn in degrees, about the centre. */
    rotation?: number;
}

/**
 * A closed polygon: regular when made, any shape once its corners are dragged.
 *
 * `points` are flat x, y pairs in screen pixels about the centre (x, y), before the rotation.
 * `sides` records the regular polygon it was made as; it is what the panel offers to change.
 */
export interface Overlay2DPolygon extends Overlay2DShapeBase {
    type: "Polygon";
    points: number[];
    sides: number;
    /** Clockwise turn in degrees, about the centre. */
    rotation?: number;
}

/** A straight line between two points given as fractions of the view, with optional arrow heads. */
export interface Overlay2DLine {
    type: "Line";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    arrowStart?: boolean;
    arrowEnd?: boolean;
    strokeStyle?: string;
    /** In screen pixels. */
    lineWidth?: number;
    uniqueId: string;
    zIndex?: number;
}

export type Overlay2DShape = Overlay2DCircle | Overlay2DPolygon | Overlay2DLine;

/** Any 2D overlay object the panel and the handles can edit. */
export type Overlay2DObject = Overlay2DTextFrac | Overlay2DImageSrcFrac | Overlay2DSvgPath | Overlay2DFracPath | Overlay2DShape;

/**
 * The corners of a regular polygon, flat x, y in pixels about its centre.
 *
 * Laid flat on its base (y points down the screen), so a triangle points up and a square is
 * square-on rather than a diamond.
 */
export const regularPolygonPoints = (sides: number, radius: number): number[] => {
    const n = Math.max(3, Math.round(sides));
    const points: number[] = [];
    for (let k = 0; k < n; k++) {
        const angle = Math.PI / 2 + Math.PI / n + (2 * Math.PI * k) / n;
        points.push(radius * Math.cos(angle), radius * Math.sin(angle));
    }
    return points;
};

/** New shapes' defaults: what the panel starts from and what a session leaves out is read as. */
export const newCircleOverlay = (overrides: Partial<Overlay2DCircle> = {}): Overlay2DCircle => ({
    type: "Circle",
    x: 0.5,
    y: 0.5,
    radiusX: 40,
    radiusY: 40,
    rotation: 0,
    drawStyle: "fill",
    lineWidth: 2,
    zIndex: 0,
    uniqueId: "",
    ...overrides,
});

export const newPolygonOverlay = (overrides: Partial<Overlay2DPolygon> = {}): Overlay2DPolygon => {
    const sides = Math.max(3, Math.round(overrides.sides ?? 4));
    return {
        type: "Polygon",
        x: 0.5,
        y: 0.5,
        rotation: 0,
        drawStyle: "fill",
        lineWidth: 2,
        zIndex: 0,
        uniqueId: "",
        ...overrides,
        sides,
        points: overrides.points && overrides.points.length >= 6 ? overrides.points : regularPolygonPoints(sides, 40),
    };
};

export const newLineOverlay = (overrides: Partial<Overlay2DLine> = {}): Overlay2DLine => ({
    type: "Line",
    x1: 0.4,
    y1: 0.5,
    x2: 0.6,
    y2: 0.5,
    arrowStart: false,
    arrowEnd: true,
    lineWidth: 2,
    zIndex: 0,
    uniqueId: "",
    ...overrides,
});

/**
 * The shapes from a saved session's lists, with their type put back and the defaults filled in
 * for anything protobuf left out (a coordinate of 0 is not written).
 */
export const shapesFromSession = (data: {
    circle2D?: Partial<Overlay2DCircle>[];
    polygon2D?: Partial<Overlay2DPolygon>[];
    line2D?: Partial<Overlay2DLine>[];
}): Overlay2DShape[] => {
    const defined = <T extends object>(d: T): Partial<T> =>
        Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
    return [
        ...(data.circle2D ?? []).map(d => newCircleOverlay({ x: 0, y: 0, ...defined(d), type: "Circle" })),
        ...(data.polygon2D ?? []).map(d => newPolygonOverlay({ x: 0, y: 0, ...defined(d), type: "Polygon" })),
        ...(data.line2D ?? []).map(d => newLineOverlay({ x1: 0, y1: 0, x2: 0, y2: 0, arrowEnd: false, ...defined(d), type: "Line" })),
    ];
};

/**
 * A fractional path's points as pairs.
 *
 * Written both ways: flat [x0, y0, x1, y1...] (what the panel and the dev menu make, and what the
 * type says) and as pairs (what the drawing code read, so flat paths never drew).
 */
export const fracPathPairs = (path: number[] | number[][]): [number, number][] => {
    if (!Array.isArray(path) || path.length === 0) return [];
    if (Array.isArray(path[0])) return (path as number[][]).map(p => [p[0], p[1]]);
    const flat = path as number[];
    const pairs: [number, number][] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) pairs.push([flat[i], flat[i + 1]]);
    return pairs;
};

/**
 * The old separate LaTeX overlay. LaTeX is now text with `latex: true`; this shape is still
 * accepted by addLatexOverlay, and read from sessions saved before the change.
 */
export interface Overlay2DLatexSrcFrac {
    type: "Latex";
    x: number;
    y: number;
    height: number;
    text: string;
    uniqueId: string;
    zIndex?: number;
}

/**
 * A LaTeX overlay in the old shape, as text.
 *
 * The old `height` was the typeset image's height in pixels. A one-line formula is about one em
 * tall, so it carries over as the em size (fontPixelSize).
 */
export const latexToTextOverlay = (latex: Omit<Overlay2DLatexSrcFrac, "type">): Overlay2DTextFrac => ({
    type: "Text",
    x: latex.x,
    y: latex.y,
    text: latex.text,
    fontFamily: "serif",
    fontPixelSize: latex.height,
    drawStyle: "fill",
    uniqueId: latex.uniqueId,
    zIndex: latex.zIndex,
    latex: true,
});

const initialState: {
    imageOverlayList: Overlay2DImageSrcFrac[];
    textOverlayList: Overlay2DTextFrac[];
    svgPathOverlayList: Overlay2DSvgPath[];
    fracPathOverlayList: Overlay2DFracPath[];
    shapeOverlayList: Overlay2DShape[];
    callBacks: Function[];
} = {
    imageOverlayList: [],
    textOverlayList: [],
    svgPathOverlayList: [],
    fracPathOverlayList: [],
    shapeOverlayList: [],
    callBacks: [],
};

const overlaysSlice = createSlice({
    name: "overlays",
    initialState: initialState,
    reducers: {
        addImageOverlay: (state, action: PayloadAction<Omit<Overlay2DImageSrcFrac, "type">>) => {
            const imageOverlay: Overlay2DImageSrcFrac = {
                ...action.payload,
                type: "Image",
            };
            state.imageOverlayList.push(imageOverlay);
        },
        removeImageOverlay: (state, action: PayloadAction<Overlay2DImageSrcFrac>) => {
            state.imageOverlayList = state.imageOverlayList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        /** Add LaTeX given in the old shape. It becomes a text overlay with `latex: true`. */
        addLatexOverlay: (state, action: PayloadAction<Omit<Overlay2DLatexSrcFrac, "type">>) => {
            state.textOverlayList.push(latexToTextOverlay(action.payload));
        },
        /** Remove LaTeX added with addLatexOverlay; the same as removeTextOverlay. */
        removeLatexOverlay: (state, action: PayloadAction<{ uniqueId: string }>) => {
            state.textOverlayList = state.textOverlayList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        addTextOverlay: (state, action: PayloadAction<Omit<Overlay2DTextFrac, "type">>) => {
            const textOverlay: Overlay2DTextFrac = {
                ...action.payload,
                type: "Text",
            };
            state.textOverlayList.push(textOverlay);
        },
        removeTextOverlay: (state, action: PayloadAction<Overlay2DTextFrac>) => {
            state.textOverlayList = state.textOverlayList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        addSvgPathOverlay: (state, action: PayloadAction<Omit<Overlay2DSvgPath, "type">>) => {
            const svgPathOverlay: Overlay2DSvgPath = {
                ...action.payload,
                type: "SvgPath",
            };
            state.svgPathOverlayList.push(svgPathOverlay);
        },
        removeSvgPathOverlay: (state, action: PayloadAction<Overlay2DSvgPath>) => {
            state.svgPathOverlayList = state.svgPathOverlayList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        addFracPathOverlay: (state, action: PayloadAction<Omit<Overlay2DFracPath, "type">>) => {
            const fracPathOverlay: Overlay2DFracPath = {
                ...action.payload,
                type: "FracPath",
            };
            state.fracPathOverlayList.push(fracPathOverlay);
        },
        removeFracPathOverlay: (state, action: PayloadAction<Overlay2DFracPath>) => {
            state.fracPathOverlayList = state.fracPathOverlayList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        addShapeOverlay: (state, action: PayloadAction<Overlay2DShape>) => {
            state.shapeOverlayList.push(action.payload);
        },
        removeShapeOverlay: (state, action: PayloadAction<{ uniqueId: string }>) => {
            state.shapeOverlayList = state.shapeOverlayList.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        /**
         * Change some fields of any 2D object in place, keeping its place in its list (so its
         * place in the drawing order). The handles move objects through this many times a second.
         */
        updateOverlay: (state, action: PayloadAction<{ uniqueId: string; changes: Record<string, unknown> }>) => {
            const { uniqueId, changes } = action.payload;
            const { uniqueId: _ignored, type: _type, ...rest } = changes;
            for (const list of [
                state.textOverlayList,
                state.imageOverlayList,
                state.svgPathOverlayList,
                state.fracPathOverlayList,
                state.shapeOverlayList,
            ] as { uniqueId: string }[][]) {
                const index = list.findIndex(item => item.uniqueId === uniqueId);
                if (index >= 0) {
                    list[index] = { ...list[index], ...rest };
                    return;
                }
            }
        },
        addCallback: (state, action: PayloadAction<Function>) => {
            state.callBacks.push(action.payload);
        },
        emptyOverlays: () => {
            return initialState;
        },
    },
});

export const {
    addImageOverlay,
    addTextOverlay,
    addSvgPathOverlay,
    addFracPathOverlay,
    emptyOverlays,
    addCallback,
    addLatexOverlay,
    removeImageOverlay,
    removeLatexOverlay,
    removeTextOverlay,
    removeSvgPathOverlay,
    removeFracPathOverlay,
    addShapeOverlay,
    removeShapeOverlay,
    updateOverlay,
} = overlaysSlice.actions;

export default overlaysSlice.reducer;
