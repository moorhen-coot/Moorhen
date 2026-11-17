import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import type { RootState } from "../../store/MoorhenReduxStore";
import { setSelected2DObject } from "../../store/generalStatesSlice";
import { updateOverlay } from "../../store/overlaysSlice";
import type { Overlay2DObject, Overlay2DSvgPath, Overlay2DTextFrac } from "../../store/overlaysSlice";
import {
    Box,
    Frame,
    Vec2,
    ViewSize,
    boxCorners,
    ellipseEdgeChanges,
    ellipseEdgeHandles,
    frameOf,
    hitsObject,
    isRectangle,
    lineEndChanges,
    lineEnds,
    localToScreen,
    moveChanges,
    pairsOf,
    pickOrder,
    pivotOnScreen,
    rectangleEdgeChanges,
    rectangleEdgeHandles,
    rotateKnob,
    rotationForDrag,
    scaleChanges,
    scaleForDrag,
    textBoxFromMetrics,
    vertexChanges,
} from "../../utils/overlay2DGeometry";
import { fracPathPairs } from "../../store/overlaysSlice";
import { latexMetrics } from "../../utils/textStyle";

/** What a drag is doing: which handle was taken, and anything that says which one of its kind. */
type DragKind =
    | { kind: "move" }
    | { kind: "scale"; corner: number }
    | { kind: "rotate" }
    | { kind: "vertex"; index: number }
    | { kind: "rectEdge"; index: number }
    | { kind: "ellipseEdge"; index: number }
    | { kind: "lineEnd"; end: 0 | 1 };

const HANDLE_COLOUR = "#1e88e5";
const HANDLE_OUTLINE = "#ffffff";

/** A 2D context for measuring text and testing SVG paths, made once. */
let scratchContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;
const scratch = () => {
    if (scratchContext === undefined) {
        try {
            scratchContext =
                typeof OffscreenCanvas !== "undefined"
                    ? new OffscreenCanvas(1, 1).getContext("2d")
                    : document.createElement("canvas").getContext("2d");
        } catch {
            scratchContext = null;
        }
    }
    return scratchContext;
};

/**
 * LaTeX boxes are kept per string at a size of one pixel, and scaled: MathJax's output scales
 * exactly with the font size. So resizing never waits on typesetting, and the box is there for
 * every size a drag passes through. (Keyed by size as well, it was absent at each new size until
 * MathJax answered, and the handles - and the drag with them - vanished in the meantime.)
 */
const latexKey = (t: Overlay2DTextFrac) => t.text;

/**
 * A resize cursor that points the way a handle at `point` moves, given the object's pivot: so the
 * arrows still line up with the handle once the object has been turned.
 */
const resizeCursor = (pivot: Vec2, point: Vec2): string => {
    const degrees = ((Math.atan2(point[1] - pivot[1], point[0] - pivot[0]) * 180) / Math.PI + 360) % 180;
    const nearest = (Math.round(degrees / 45) * 45) % 180;
    return { 0: "ew-resize", 45: "nwse-resize", 90: "ns-resize", 135: "nesw-resize" }[nearest];
};

/** Whether an SVG path is under the pointer: only the browser can say, so ask a canvas. */
const hitsSvgPath = (obj: Overlay2DSvgPath, point: Vec2): boolean => {
    const ctx = scratch();
    if (!ctx || typeof Path2D === "undefined") return false;
    try {
        const path = new Path2D(obj.path);
        const [ox, oy] = obj.offset ?? [0, 0];
        const x = point[0] - ox;
        const y = point[1] - oy;
        ctx.lineWidth = (obj.lineWidth ?? 1) + 8;
        return (obj.drawStyle !== "stroke" && ctx.isPointInPath(path, x, y)) || ctx.isPointInStroke(path, x, y);
    } catch {
        return false;
    }
};

/**
 * Handles for moving, resizing, turning and reshaping the 2D overlay objects, and picking one by
 * clicking it.
 *
 * An SVG layer over the view. Only the handles themselves take the pointer, so everywhere else a
 * press still reaches the 3D view underneath; and picking listens for a click (a press and release
 * without moving), so that turning the molecule from on top of an object still turns it.
 *
 * All of it is live only while the 2D objects panel is open, so that a picture full of labels
 * behaves exactly as it always has while it is being looked at rather than edited.
 */
export const Overlay2DHandles = () => {
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const overlays = useSelector((state: RootState) => state.overlays);
    const selectedId = useSelector((state: RootState) => state.generalStates.selected2DObjectId);
    const width = useSelector((state: RootState) => state.sceneSettings.GlViewportWidth);
    const height = useSelector((state: RootState) => state.sceneSettings.GlViewportHeight);
    const editing = useSelector(
        (state: RootState) =>
            state.globalUI.shownSidePanel === "overlay2DObjects" || state.modals.activeModals.some(modal => modal.key === "overlays-2d")
    );
    const view: ViewSize = useMemo(() => ({ width, height }), [width, height]);

    const svgRef = useRef<SVGSVGElement>(null);
    const [latexBoxes, setLatexBoxes] = useState<Record<string, Box>>({});
    const [dragging, setDragging] = useState<string | null>(null);

    /** A text's box: measured for plain text, from the typesetting for LaTeX (once it is known). */
    const textBox = (t: Overlay2DTextFrac): Box | null => {
        if (t.latex) {
            const unit = latexBoxes[latexKey(t)];
            return unit ? (unit.map(v => v * t.fontPixelSize) as Box) : null;
        }
        const ctx = scratch();
        if (!ctx) return null;
        ctx.font = Math.floor(t.fontPixelSize) + "px " + t.fontFamily;
        return textBoxFromMetrics(ctx.measureText(t.text));
    };

    // Typeset any LaTeX whose size is not known yet.
    useEffect(() => {
        if (!editing) return;
        let cancelled = false;
        const missing = overlays.textOverlayList.filter(t => t.latex && !(latexKey(t) in latexBoxes));
        if (missing.length === 0) return;
        (async () => {
            const found: Record<string, Box> = {};
            for (const t of missing) {
                const m = await latexMetrics(t.text, 1);
                if (m) found[latexKey(t)] = [0, -m.ascent, m.width, m.height - m.ascent];
            }
            if (!cancelled && Object.keys(found).length > 0) setLatexBoxes(prev => ({ ...prev, ...found }));
        })();
        return () => {
            cancelled = true;
        };
    }, [editing, overlays.textOverlayList, latexBoxes]);

    const all = useMemo(() => pickOrder(overlays), [overlays]);
    const selected = selectedId ? all.find(o => o.uniqueId === selectedId) ?? null : null;
    const frame = selected ? frameOf(selected, view, textBox) : null;

    // Held for the listeners, which are registered once, and brought up to date after each render.
    const latest = useRef({ all, view, textBox, selected, frame });
    useEffect(() => {
        latest.current = { all, view, textBox, selected, frame };
    });

    /** Pick by clicking: a press and a release a few pixels apart at most, off the handles. */
    useEffect(() => {
        const figure = svgRef.current?.parentElement;
        if (!figure || !editing) return;
        let down: Vec2 | null = null;
        const onDown = (event: MouseEvent) => {
            down = event.button === 0 && !svgRef.current?.contains(event.target as Node) ? [event.clientX, event.clientY] : null;
        };
        const onUp = (event: MouseEvent) => {
            if (!down) return;
            const moved = Math.hypot(event.clientX - down[0], event.clientY - down[1]);
            down = null;
            if (moved > 5) return;
            const rect = figure.getBoundingClientRect();
            const point: Vec2 = [event.clientX - rect.left, event.clientY - rect.top];
            const { all, view, textBox } = latest.current;
            const hit = all.find(o =>
                o.type === "SvgPath" ? hitsSvgPath(o, point) : hitsObject(o, frameOf(o, view, textBox), point, view)
            );
            dispatch(setSelected2DObject(hit ? hit.uniqueId : null));
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && store.getState().generalStates.selected2DObjectId) dispatch(setSelected2DObject(null));
        };
        figure.addEventListener("mousedown", onDown, true);
        figure.addEventListener("mouseup", onUp, true);
        document.addEventListener("keydown", onKey);
        return () => {
            figure.removeEventListener("mousedown", onDown, true);
            figure.removeEventListener("mouseup", onUp, true);
            document.removeEventListener("keydown", onKey);
        };
    }, [editing, dispatch, store]);

    // The drag as it stood when the pointer went down: everything is measured from there, so a
    // dropped frame costs nothing and a drag back to the start puts the object back exactly.
    const dragRef = useRef<{ what: DragKind; start: Vec2; object: Overlay2DObject; frame: Frame | null; corners: Vec2[] } | null>(null);
    const pending = useRef<{ frame: number | null; changes: Record<string, unknown> | null }>({ frame: null, changes: null });

    const pointerAt = (event: { clientX: number; clientY: number }): Vec2 => {
        const rect = svgRef.current.getBoundingClientRect();
        return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const publish = (uniqueId: string, changes: Record<string, unknown>) => {
        // At most once a frame: a pointer reports far more often than the overlay is redrawn.
        pending.current.changes = changes;
        if (pending.current.frame !== null) return;
        pending.current.frame = requestAnimationFrame(() => {
            pending.current.frame = null;
            if (pending.current.changes) dispatch(updateOverlay({ uniqueId, changes: pending.current.changes }));
            pending.current.changes = null;
        });
    };

    /**
     * A press on a handle. Which handle, and what it does, is written on the element (data-drag),
     * so that one listener serves them all rather than a new one being made for each on every
     * render.
     */
    const onPointerDown = (event: React.PointerEvent) => {
        const element = (event.target as Element).closest?.("[data-drag]");
        const { selected, frame } = latest.current;
        if (!element || !selected || event.button !== 0) return;
        const what = JSON.parse(element.getAttribute("data-drag")) as DragKind;
        event.stopPropagation();
        event.preventDefault();
        dragRef.current = { what, start: pointerAt(event), object: selected, frame, corners: frame ? boxCorners(frame) : [] };
        setDragging(what.kind);
        // Followed on the window rather than through the handle that was pressed. The handles are
        // redrawn as the object changes, and can disappear for a moment while they are; pointer
        // capture on one goes with it, the release then lands somewhere else, and the drag never
        // ends - every later movement over a handle went on resizing the object.
        stopListening.current?.();
        const move = (e: PointerEvent) => moveRef.current(e);
        const up = () => endDrag();
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        window.addEventListener("blur", up);
        stopListening.current = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", up);
            window.removeEventListener("blur", up);
            stopListening.current = null;
        };
    };

    const stopListening = useRef<(() => void) | null>(null);

    const endDrag = () => {
        stopListening.current?.();
        if (!dragRef.current) return;
        dragRef.current = null;
        setDragging(null);
    };

    const onPointerMove = (event: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        // A mouse moving with no button held has been released somewhere we did not hear about.
        if (event.pointerType === "mouse" && event.buttons === 0) {
            endDrag();
            return;
        }
        const point = pointerAt(event);
        const { what, start, object, frame: f } = drag;
        let changes: Record<string, unknown> | null = null;
        switch (what.kind) {
            case "move":
                changes = moveChanges(object, [point[0] - start[0], point[1] - start[1]], view);
                break;
            case "scale": {
                const fixed = drag.corners[(what.corner + 2) % 4];
                changes = f ? scaleChanges(object, f, fixed, scaleForDrag(fixed, start, point), view) : null;
                break;
            }
            case "rotate":
                changes = f ? { rotation: rotationForDrag(("rotation" in object && object.rotation) || 0, f, start, point, event.shiftKey) } : null;
                break;
            case "vertex":
                changes = f && object.type === "Polygon" ? vertexChanges(object, f, what.index, point, view) : null;
                break;
            case "rectEdge":
                changes = f && object.type === "Polygon" ? rectangleEdgeChanges(object, f, what.index, point, view) : null;
                break;
            case "ellipseEdge":
                changes = f ? ellipseEdgeChanges(f, what.index, point) : null;
                break;
            case "lineEnd":
                changes = lineEndChanges(what.end, point, view);
                break;
        }
        if (changes) publish(object.uniqueId, changes);
    };

    // The window listeners call the latest of this, so it always sees the current view.
    const moveRef = useRef(onPointerMove);
    useEffect(() => {
        moveRef.current = onPointerMove;
    });

    useEffect(
        () => () => {
            stopListening.current?.();
            if (pending.current.frame !== null) cancelAnimationFrame(pending.current.frame);
        },
        []
    );

    const handles: React.ReactNode[] = [];
    if (editing && selected) {
        const square = (key: string, [x, y]: Vec2, cursor: string, what: DragKind, size = 8) =>
            handles.push(
                <rect
                    key={key}
                    x={x - size / 2}
                    y={y - size / 2}
                    width={size}
                    height={size}
                    fill={HANDLE_COLOUR}
                    stroke={HANDLE_OUTLINE}
                    strokeWidth={1}
                    style={{ cursor, pointerEvents: "all" }}
                    data-drag={JSON.stringify(what)}
                />
            );
        const dot = (key: string, [x, y]: Vec2, cursor: string, what: DragKind, r = 5) =>
            handles.push(
                <circle
                    key={key}
                    cx={x}
                    cy={y}
                    r={r}
                    fill={HANDLE_OUTLINE}
                    stroke={HANDLE_COLOUR}
                    strokeWidth={2}
                    style={{ cursor, pointerEvents: "all" }}
                    data-drag={JSON.stringify(what)}
                />
            );
        const moveCursor = dragging === "move" ? "grabbing" : "grab";

        if (selected.type === "Line") {
            const [a, b] = lineEnds(selected, view);
            handles.push(
                <line
                    key="body"
                    x1={a[0]}
                    y1={a[1]}
                    x2={b[0]}
                    y2={b[1]}
                    stroke={HANDLE_COLOUR}
                    strokeOpacity={0.35}
                    strokeWidth={Math.max(10, (selected.lineWidth ?? 2) + 8)}
                    strokeLinecap="round"
                    style={{ cursor: moveCursor, pointerEvents: "stroke" }}
                    data-drag={JSON.stringify({ kind: "move" })}
                />
            );
            dot("start", a, "move", { kind: "lineEnd", end: 0 }, 6);
            dot("end", b, "move", { kind: "lineEnd", end: 1 }, 6);
        } else if (selected.type === "SvgPath" || selected.type === "FracPath") {
            const outline =
                selected.type === "SvgPath" ? (
                    <path
                        key="body"
                        d={selected.path}
                        transform={selected.offset ? `translate(${selected.offset[0]} ${selected.offset[1]})` : undefined}
                        fill={selected.drawStyle === "stroke" ? "none" : HANDLE_COLOUR}
                        fillOpacity={0.12}
                        stroke={HANDLE_COLOUR}
                        strokeDasharray="4 3"
                        strokeWidth={1.5}
                        style={{ cursor: moveCursor, pointerEvents: "all" }}
                        data-drag={JSON.stringify({ kind: "move" })}
                    />
                ) : (
                    <polygon
                        key="body"
                        points={fracPathPairs(selected.path)
                            .map(([x, y]) => `${x * view.width},${y * view.height}`)
                            .join(" ")}
                        fill={selected.drawStyle === "stroke" ? "none" : HANDLE_COLOUR}
                        fillOpacity={0.12}
                        stroke={HANDLE_COLOUR}
                        strokeDasharray="4 3"
                        strokeWidth={1.5}
                        style={{ cursor: moveCursor, pointerEvents: "all" }}
                        data-drag={JSON.stringify({ kind: "move" })}
                    />
                );
            handles.push(outline);
        } else if (frame) {
            const corners = boxCorners(frame);
            const pivot = pivotOnScreen(frame);
            // The faint box, slightly outside the object: dragging inside it moves the object.
            handles.push(
                <polygon
                    key="box"
                    points={corners.map(([x, y]) => `${x},${y}`).join(" ")}
                    fill={HANDLE_COLOUR}
                    fillOpacity={0.04}
                    stroke={HANDLE_COLOUR}
                    strokeOpacity={0.7}
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    style={{ cursor: moveCursor, pointerEvents: "all" }}
                    data-drag={JSON.stringify({ kind: "move" })}
                />
            );
            // The rotate knob on its stalk above the box.
            const { knob, stalk } = rotateKnob(frame);
            handles.push(
                <line key="stalk" x1={stalk[0]} y1={stalk[1]} x2={knob[0]} y2={knob[1]} stroke={HANDLE_COLOUR} strokeWidth={1} style={{ pointerEvents: "none" }} />
            );
            handles.push(
                <g key="knob" style={{ cursor: dragging === "rotate" ? "grabbing" : "grab", pointerEvents: "all" }} data-drag={JSON.stringify({ kind: "rotate" })}>
                    <circle cx={knob[0]} cy={knob[1]} r={7} fill={HANDLE_OUTLINE} stroke={HANDLE_COLOUR} strokeWidth={2} />
                    {/* A small turning arrow, so the knob says what it does. */}
                    <path
                        d={`M ${knob[0] + 3.5} ${knob[1] - 1} A 3.5 3.5 0 1 0 ${knob[0] + 1.5} ${knob[1] + 3}`}
                        fill="none"
                        stroke={HANDLE_COLOUR}
                        strokeWidth={1.3}
                    />
                    <path d={`M ${knob[0] + 1.6} ${knob[1] - 2.4} L ${knob[0] + 4.4} ${knob[1] - 1.2} L ${knob[0] + 3.6} ${knob[1] + 1.6} Z`} fill={HANDLE_COLOUR} />
                </g>
            );
            corners.forEach((corner, i) => square(`corner${i}`, corner, resizeCursor(pivot, corner), { kind: "scale", corner: i }));

            if (selected.type === "Circle") {
                ellipseEdgeHandles(selected, frame).forEach((p, i) =>
                    square(`edge${i}`, p, resizeCursor(pivot, p), { kind: "ellipseEdge", index: i }, 7)
                );
            }
            if (selected.type === "Polygon") {
                if (isRectangle(selected.points)) {
                    rectangleEdgeHandles(selected, frame).forEach((p, i) =>
                        square(`edge${i}`, p, resizeCursor(pivot, p), { kind: "rectEdge", index: i }, 7)
                    );
                }
                pairsOf(selected.points).forEach((p, i) => dot(`vertex${i}`, localToScreen(frame, p), "move", { kind: "vertex", index: i }, 4.5));
            }
        }
    }

    return (
        <svg
            ref={svgRef}
            width={width}
            height={height}
            style={{ position: "absolute", top: 0, left: 0, zIndex: 10, pointerEvents: "none", overflow: "visible" }}
            onPointerDown={onPointerDown}
            data-testid="overlay-2d-handles"
        >
            {handles}
        </svg>
    );
};

