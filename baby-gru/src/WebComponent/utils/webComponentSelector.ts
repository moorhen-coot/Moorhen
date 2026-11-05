import { useCallback, useSyncExternalStore } from "react";
import type { RootState } from "../../store";
import { type MoorhenTarget, useMoorhenInstance } from "./useMoorhenInstance";

/**
 * For use with MoorhenWebComponent only.
 *
 * A value of the Moorhen store, kept up to date: the component re-renders when it changes.
 *
 * @template T - The type of the selected state value
 * @param target - The element id of the web component, or a ref to an element inside it
 * @param selector - A function that extracts the desired value from RootState
 * @returns The selected value from the store, or null while Moorhen is not ready yet
 *
 * The selector must return part of the state (as in the examples), not build a new object or array
 * on each call: React needs the same value back while the state has not changed, and reports an
 * infinite loop otherwise. Select the pieces separately, or derive from them in the component.
 *
 * @example
 * const molecules = useMoorhenSelector("moorhen-app", state => state.molecules.moleculeList);
 * const drawAxes = useMoorhenSelector(ref, state => state.sceneSettings.drawAxes);
 */
export const useMoorhenSelector = <T>(target: MoorhenTarget, selector: (state: RootState) => T): T | null => {
    const instance = useMoorhenInstance(target);
    const subscribe = useCallback((onChange: () => void) => (instance ? instance.store.subscribe(onChange) : () => {}), [instance]);
    // An inline selector is fine: it is called on each render and store change
    return useSyncExternalStore(subscribe, () => (instance ? selector(instance.store.getState()) : null));
};
