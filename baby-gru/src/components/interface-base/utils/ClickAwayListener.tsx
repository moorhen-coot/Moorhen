import { useStore } from "react-redux";
import React, { useEffect, useRef } from "react";
import { RootState } from "@/store";

const isSelectRelated = (node: Node | null): boolean =>
    node instanceof HTMLSelectElement ||
    node instanceof HTMLOptionElement ||
    node instanceof HTMLOptGroupElement;

export const MoorhenClickAwayListener = (props: {
    onClickAway: (() => void) | ((event: MouseEvent) => void);
    children: React.ReactNode;
}) => {
    const clickawayRef = useRef<HTMLDivElement>(null);
    const syntheticEventRef = useRef(false);
    const store = useStore<RootState>();

    const handleClickAway = (event: MouseEvent) => {
        const insideReactTree = syntheticEventRef.current; // This flag is set to true when a click event originates from within the React tree because handleSyntheticEvent is normally executed before the event listener
        syntheticEventRef.current = false;

        const node = clickawayRef.current;
        if (!node) {
            return;
        }

        const target = event.target as Node | null;
        const path = typeof event.composedPath === "function" ? event.composedPath() : [];
        const insideDOMTree = path.length > 0 ? path.includes(node) : !!(target && node.contains(target));

        if (insideDOMTree || insideReactTree) {
            return;
        }

        // A native <select> dropdown is rendered by the OS outside the DOM, so clicks on its
        // options can arrive here as "away" clicks even though the user is interacting with a
        // control that belongs to this popup. While a <select> is focused (its dropdown is
        // open) - or when the click itself targets a select/option - don't treat it as an
        // away click. This removes the need for <select> to globally pause this listener.
        const activeElement = document.activeElement;
        const isSelectInteraction = isSelectRelated(activeElement) || isSelectRelated(target);

        if (isSelectInteraction) {
            return;
        }

        if (store.getState().globalUI.clickAwayListenerPauseCount === 0) {
            props.onClickAway(event);
        }
    };

    const handleSyntheticEvent = () => {
        syntheticEventRef.current = true;
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            // Delay the event listener registration to ensure it doesn't capture the click that triggered the popover
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
};
