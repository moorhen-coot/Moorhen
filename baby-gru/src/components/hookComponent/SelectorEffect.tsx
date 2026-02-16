import { memo } from "react";
import { RootState } from "@/store";
import { useSelectorEffect } from "../../hooks/useSelectorEffect";

/**
 * React component that listens for changes in a selected state from the Redux store
 * and triggers a side effect when the selected state changes.
 *
 * @template T - The type of the state being selected.
 * @param props - Component props.
 * @param props.selector - A function that selects a piece of state from the Redux store.
 * @param props.effect - A callback function that is invoked with the selected state whenever it changes.
 *
 * @returns null - This component does not render any UI.
 */
export const SelectorEffect = memo(<T = unknown,>(props: { selector: (state: RootState) => T; effect: (selectedState: T) => void }) => {
    useSelectorEffect<T>(props.selector, props.effect);
    return null;
});

SelectorEffect.displayName = "SelectorEffect";
