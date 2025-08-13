import { moorhen } from "../../../types/moorhen";
import { useDocumentEventListener } from "../../../hooks/useDocumentEventListener";
import { useSelectorEffect } from "../../../hooks/useSelectorEffect";

/**
 * React component that listens for changes to the map origin in the Redux store.
 * When the `origin` value in the global state changes, it triggers the provided `drawMap` callback.
 *
 * @param props - Component props.
 * @param props.drawMap - Callback function to redraw the map when the origin changes.
 *
 * @returns null - This component does not render any UI.
 */
export const MapOriginListener = (props: { drawMap(): void }) => {
    useSelectorEffect((state: moorhen.State) => state.glRef.origin, props.drawMap);
    return null;
};

export const MapOriginListenerMouseUp = (props: { drawMap(): void }) => {
    const handleMouseUp = () => {
            props.drawMap();
        };
    useDocumentEventListener("mouseup", handleMouseUp, { capture: true });
    return null;
};
