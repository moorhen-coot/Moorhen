import { useEffect } from "react";
import { useSelector } from "react-redux";
import { moorhen } from "../types/moorhen";

/**
 * Custom React hook that runs a side effect whenever the selected state from the Redux store changes.
 *
 * @template T - The type of the state being selected.
 * @param selector - A function that selects a piece of state from the Redux store.
 * @param effect - A callback function that is invoked with the selected state whenever it changes.
 *
 * @example
 * useSelectorEffect(
 *   (state) => state.user,
 *   (user) => {
 *     console.log('User state changed:', user);
 *   }
 * );
 */

export const useSelectorEffect = <T = unknown>(
    selector: (state: moorhen.State) => T,
    effect: (selectedState: T) => void
) => {
    const selectedState = useSelector(selector);

    useEffect(() => {
        effect(selectedState);
    }, [selectedState, effect]);
};
