import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { ThreeDObject, centreOfObject, updateObject } from "../../store/threeDObjectsSlice";
import {
    actionOfTag,
    angleAboutAxis,
    axisOfTag,
    distanceAlongAxis,
    pointOnPlane,
    rotatedOrientation,
    shortestAngleBetween,
} from "../../utils/handleDrag";

/**
 * Moving and turning an object by its handles.
 *
 * The renderer reports three things - a grab began, the pointer moved, the grab ended - each
 * carrying a label it does not interpret and the pointer as a ray through the scene. Here that
 * label is read as an axis and an action, and the ray is turned into a distance or an angle.
 *
 * Everything is measured against where the drag started rather than accumulated step by step,
 * so a slow drag and a fast one over the same distance end in the same place, and a dropped
 * frame costs nothing.
 */
export const DragHandles = () => {
    const dispatch = useDispatch();
    const objects = useSelector((state: RootState) => state.threeDObjects.objects);
    const selectedId = useSelector((state: RootState) => state.generalStates.selectedThreeDObjectId);

    // The drag as it stood when the pointer went down. Held in a ref rather than state because
    // it changes on every mouse move and nothing renders from it.
    const dragRef = useRef<{
        tag: string;
        objectId: string;
        centre: number[];
        origin: number[];
        // A cylinder and a cone are pinned by two points, and both have to travel together.
        farPoint: number[] | null;
        orientation: number[] | null;
        startDistance: number | null;
        startAngle: number | null;
        // For the free handle: the plane it moves in and where the pointer first met it. Both
        // fixed at the grab, so that the drag is measured from the start like the others.
        planeNormal: number[] | null;
        startHit: number[] | null;
    } | null>(null);

    // Held in a ref so the listeners, registered once, always see the current scene.
    const sceneRef = useRef({ objects, selectedId });
    sceneRef.current = { objects, selectedId };

    /**
     * The move waiting to be published, and the frame that will publish it.
     *
     * A pointer reports far more often than the scene can be rebuilt - every change rebuilds
     * each object's geometry and uploads it to the card - so dispatching per event makes the
     * events queue up, each one paying the full cost for a position already superseded. Holding
     * only the latest and sending it once a frame means the work done is the work that shows.
     *
     * Dropping the intermediate positions is free here because every move is measured from
     * where the drag began: the latest is the whole answer, and the ones skipped were only ever
     * going to be overwritten.
     */
    const pendingRef = useRef<{ frame: number | null; next: ThreeDObject | null }>({
        frame: null, next: null,
    });

    useEffect(() => {
        const referenceFor = (axis: number[]) =>
            Math.abs(axis[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];

        /** Put this version of the object on the next frame, replacing any not yet sent. */
        const publish = (updated: ThreeDObject) => {
            pendingRef.current.next = updated;
            if (pendingRef.current.frame !== null) return;
            pendingRef.current.frame = requestAnimationFrame(() => {
                pendingRef.current.frame = null;
                const next = pendingRef.current.next;
                pendingRef.current.next = null;
                if (next) dispatch(updateObject(next));
            });
        };

        /** ...and make sure the last one is not left waiting when the drag ends. */
        const flush = () => {
            if (pendingRef.current.frame !== null) {
                cancelAnimationFrame(pendingRef.current.frame);
                pendingRef.current.frame = null;
            }
            const next = pendingRef.current.next;
            pendingRef.current.next = null;
            if (next) dispatch(updateObject(next));
        };

        const onStart = (event: CustomEvent) => {
            const { tag, front, back } = event.detail;
            const { objects: current, selectedId: id } = sceneRef.current;
            const object = current.find(item => item.uniqueId === id);
            const axis = axisOfTag(tag);
            const action = actionOfTag(tag);
            // The free handle names no axis, which is the one case where that is not a fault.
            if (!object || !action || (!axis && action !== "planar")) {
                return;
            }
            const centre = centreOfObject(object);
            // Which way the viewer is looking, taken from the pointer ray itself rather than
            // from the camera: the ray runs from the front of the scene to the back through the
            // cursor, so its direction is the view direction, and under the orthographic
            // projection it is the same for every pixel. That is the whole reason the free
            // handle needs no camera state - and it cannot go wrong, because a plane facing the
            // viewer is the one plane the pointer can never run parallel to.
            const viewDirection = [back[0] - front[0], back[1] - front[1], back[2] - front[2]];
            dragRef.current = {
                tag,
                objectId: object.uniqueId,
                centre,
                origin: [...object.origin],
                farPoint:
                    "end" in object ? [...object.end]
                    : "top" in object ? [...object.top]
                    : null,
                orientation: "orientation" in object ? [...object.orientation] : null,
                startDistance: action === "translate" ? distanceAlongAxis(centre, axis, front, back) : null,
                startAngle:
                    action === "rotate"
                        ? angleAboutAxis(centre, axis, referenceFor(axis), front, back)
                        : null,
                planeNormal: action === "planar" ? viewDirection : null,
                startHit: action === "planar"
                    ? pointOnPlane(centre, viewDirection, front, back)
                    : null,
            };
        };

        const onMove = (event: CustomEvent) => {
            const drag = dragRef.current;
            if (!drag) return;
            const { front, back } = event.detail;
            const { objects: current } = sceneRef.current;
            const object = current.find(item => item.uniqueId === drag.objectId);
            const axis = axisOfTag(drag.tag);
            const action = actionOfTag(drag.tag);
            if (!object || !action || (!axis && action !== "planar")) return;

            // Everything shifts by the same vector, always measured from where the drag began -
            // so the shape is carried along rigidly and repeated moves cannot drift. One
            // function for it, because a move along an axis and a move in the plane differ only
            // in how the vector is arrived at, and both have to carry a cylinder's far end.
            const moveBy = (shift: number[]) => {
                const moveFrom = (point: number[]) =>
                    point.map((c, i) => c + shift[i]) as [number, number, number];
                publish({
                    ...object,
                    origin: moveFrom(drag.origin),
                    ...(drag.farPoint && "end" in object && { end: moveFrom(drag.farPoint) }),
                    ...(drag.farPoint && "top" in object && { top: moveFrom(drag.farPoint) }),
                } as typeof object);
            };

            if (action === "translate" && drag.startDistance !== null) {
                const now = distanceAlongAxis(drag.centre, axis, front, back);
                // Null where the axis points at the viewer and the question has no answer. Doing
                // nothing is right: the alternative is the object leaping about as the maths
                // becomes unstable near that view.
                if (now === null) return;
                moveBy(axis.map(component => component * (now - drag.startDistance)));
            }

            if (action === "planar" && drag.startHit && drag.planeNormal) {
                // The plane was fixed when the handle was grabbed, so the object follows the
                // pointer exactly and cannot drift towards or away from the viewer however far
                // the drag goes. Nothing to guard against here: a plane facing the viewer is
                // the one the pointer can never run parallel to, so this never comes back null.
                const now = pointOnPlane(drag.centre, drag.planeNormal, front, back);
                if (!now) return;
                moveBy(now.map((c, i) => c - drag.startHit[i]));
            }

            if (action === "rotate" && drag.startAngle !== null && drag.orientation) {
                const now = angleAboutAxis(drag.centre, axis, referenceFor(axis), front, back);
                if (now === null) return;
                const turned = shortestAngleBetween(drag.startAngle, now);
                publish({
                    ...object,
                    orientation: rotatedOrientation(drag.orientation, axis, turned),
                } as typeof object);
            }
        };

        const onEnd = () => { dragRef.current = null; flush(); };

        document.addEventListener("handleGrabStart", onStart);
        document.addEventListener("handleGrabMove", onMove);
        document.addEventListener("handleGrabEnd", onEnd);
        return () => {
            document.removeEventListener("handleGrabStart", onStart);
            document.removeEventListener("handleGrabMove", onMove);
            document.removeEventListener("handleGrabEnd", onEnd);
        };
    }, [dispatch]);

    return null;
};
