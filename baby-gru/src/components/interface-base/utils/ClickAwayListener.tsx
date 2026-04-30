import { RootState } from "@/store";
import React, { useEffect, useRef } from "react";
import { useStore } from 'react-redux';


export const MoorhenClickAwayListener = (props:{ onClickAway: (() => void) | ((event: MouseEvent) => void), children: React.ReactNode }) => {
    const clickawayRef = useRef<HTMLDivElement>(null);
    const syntheticEventRef = useRef(false);
    const store = useStore<RootState>()

    const handleClickAway = (event: MouseEvent) => {
        const insideReactTree = syntheticEventRef.current; // This flag is set to true when a click event originates from within the React tree because handleSyntheticEvent is normally executed before the event listener
        syntheticEventRef.current = false;

        const node = clickawayRef.current;
        if (!node) {
            return;
        }

        const target = event.target as Node | null;
        const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
        const insideDOMTree = path.length > 0 ? path.includes(node) : !!(target && node.contains(target));

        if (!insideDOMTree && !insideReactTree) {
            if (store.getState().globalUI.isClickAwayListenerActive) {
            props.onClickAway(event);
        console.log("click away detected")}
        }
    }

    const handleSyntheticEvent = () => {
        syntheticEventRef.current = true;
    }

    useEffect(() => {
        const timer = setTimeout(() => { // Delay the event listener registration to ensure it doesn't capture the click that triggered the popover
            document.addEventListener("click", handleClickAway);
        }, 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("click", handleClickAway);
        };
    }, []);
    return (
        <div ref={clickawayRef} onMouseDown={handleSyntheticEvent} onTouchStart={handleSyntheticEvent} onClick={handleSyntheticEvent}>
            {props.children}
        </div>
    );
}