import { useEffect, useState } from "react";
import { MoorhenWebComponent } from "@/Wrappers/MoorhenWebComponent";
import { RootState } from "@/store";

/**
 * For use with MoorhenWebComponent only.
 *
 * This hook allows React components to access and subscribe to state from the Moorhen store.
 *
 * @template T - The type of the selected state value
 * @param elementID - The HTML element ID of the MoorhenWebComponent
 * @param selector - A function that extracts the desired value from RootState
 * @returns The selected value from the store, or null if not yet initialized
 *
 * @example
 * const myValue = useMoorhenSelector<MyType>('moorhen-app', (state) => state.myValue);
 */
export const useMoorhenSelector = <T>(elementID: string, selector: (state: RootState) => T) => {
    const [selectedValue, setSelectedValue] = useState<T | null>(null);

    useEffect(() => {
        let unsubscribeFromStore: (() => void) | undefined;
        let unsubscribeFromEvent: (() => void) | undefined;

        const subscribe = () => {
            const moorhenInstance = document.getElementById(elementID) as MoorhenWebComponent;
            return moorhenInstance?.moorhenInstance?.subscribeToStore(selector, setSelectedValue);
        };

        const moorhenElement = document.getElementById(elementID) as MoorhenWebComponent;
        if (moorhenElement?.moorhenInstance) {
            unsubscribeFromStore = subscribe();
        } else {
            const handleMoorhenReady = (e: Event) => {
                if ((e as CustomEvent).detail.id === elementID) {
                    unsubscribeFromStore = subscribe();
                    window.removeEventListener("moorhenReady", handleMoorhenReady);
                }
            };
            window.addEventListener("moorhenReady", handleMoorhenReady);
            unsubscribeFromEvent = () => window.removeEventListener("moorhenReady", handleMoorhenReady);
        }

        return () => {
            unsubscribeFromStore?.();
            unsubscribeFromEvent?.();
        };
    }, [elementID, selector]);

    return selectedValue;
};
