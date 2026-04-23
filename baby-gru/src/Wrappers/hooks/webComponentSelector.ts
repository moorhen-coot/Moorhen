import { useEffect, useState } from "react";
import { RootState } from "../../store";
import { MoorhenWebComponent } from "../MoorhenWebComponent";

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
        const subscribe = async () => {
            const moorhen = document.getElementById(elementID) as MoorhenWebComponent;
            const moorhenInstance = await moorhen?.getMoorhenInstance();
            return moorhenInstance.subscribeToStore(selector, setSelectedValue);
        };

        const unsubscribePromise = subscribe();

        return () => {
            unsubscribePromise.then(unsubscribe => {
                if (unsubscribe) {
                    unsubscribe();
                }
            });
        };
    }, [elementID, selector]);

    return selectedValue;
};
