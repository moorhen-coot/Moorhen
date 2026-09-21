import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { centreOfObject, updateObject } from "../../store/threeDObjectsSlice";
import {
    actionOfTag,
    angleAboutAxis,
    axisOfTag,
    distanceAlongAxis,
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
    } | null>(null);

    // Held in a ref so the listeners, registered once, always see the current scene.
    const sceneRef = useRef({ objects, selectedId });
    sceneRef.current = { objects, selectedId };

    useEffect(() => {
        const referenceFor = (axis: number[]) =>
            Math.abs(axis[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];

        const onStart = (event: CustomEvent) => {
            const { tag, front, back } = event.detail;
            const { objects: current, selectedId: id } = sceneRef.current;
            const object = current.find(item => item.uniqueId === id);
            const axis = axisOfTag(tag);
            const action = actionOfTag(tag);
            if (!object || !axis || !action) {
                return;
            }
            const centre = centreOfObject(object);
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
            if (!object || !axis || !action) return;

            if (action === "translate" && drag.startDistance !== null) {
                const now = distanceAlongAxis(drag.centre, axis, front, back);
                // Null where the axis points at the viewer and the question has no answer. Doing
                // nothing is right: the alternative is the object leaping about as the maths
                // becomes unstable near that view.
                if (now === null) return;
                // Everything shifts by the same vector, always measured from where the drag
                // began - so the shape is carried along rigidly and repeated moves cannot drift.
                const shift = axis.map(component => component * (now - drag.startDistance));
                const moveFrom = (point: number[]) =>
                    point.map((c, i) => c + shift[i]) as [number, number, number];
                dispatch(updateObject({
                    ...object,
                    origin: moveFrom(drag.origin),
                    ...(drag.farPoint && "end" in object && { end: moveFrom(drag.farPoint) }),
                    ...(drag.farPoint && "top" in object && { top: moveFrom(drag.farPoint) }),
                } as typeof object));
            }

            if (action === "rotate" && drag.startAngle !== null && drag.orientation) {
                const now = angleAboutAxis(drag.centre, axis, referenceFor(axis), front, back);
                if (now === null) return;
                const turned = shortestAngleBetween(drag.startAngle, now);
                dispatch(updateObject({
                    ...object,
                    orientation: rotatedOrientation(drag.orientation, axis, turned),
                } as typeof object));
            }
        };

        const onEnd = () => { dragRef.current = null; };

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
