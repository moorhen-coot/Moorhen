import { use, useEffect } from "react";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";
import { useDocumentEventListener } from "../../hooks/useDocumentEventListener";

export const MapOriginListener = (props: { drawMap(): void }) => {
    const currentOrigin = useSelector((state: moorhen.State) => state.glRef.origin);

    useEffect(() => {
        {
            props.drawMap();
        }
    }, [currentOrigin]);

    return null;
};

export const MapOriginListenerMouseUp = (props: { drawMap(): void }) => {
    useEffect(() => {
        const handleMouseUp = (event: MouseEvent) => {
            props.drawMap();
        };
        useDocumentEventListener("mouseup", handleMouseUp, { capture: true });
    }, []);

    return null;
};
