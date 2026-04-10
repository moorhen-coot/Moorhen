import { useEffect, useState } from "react";
import { MoorhenWebComponent } from "@/Wrappers/MoorhenWebComponent";
import { RootState } from "@/store";

export const useMoorhenSelector = <T>(elementID: string, selector: (state: RootState) => T) => {
    const [selectedValue, setSelectedValue] = useState<T | null>(null);

    useEffect(() => {
        const subscribe = () => {
            const moorhenInstance = document.getElementById(elementID) as MoorhenWebComponent;
            const unsubscribeFromStore = moorhenInstance?.moorhenInstance?.subscribeToStore(selector, value => {
                setSelectedValue(value);
            });
            return unsubscribeFromStore;
        };

        let unsubscribeFromStore: (() => void) | undefined;
        const moorhenElement = document.getElementById(elementID) as MoorhenWebComponent;
        if (!moorhenElement?.moorhenInstance) {
            window.addEventListener("moorhenReady", (e: Event) => {
                if ((e as CustomEvent).detail.id === elementID) {
                    unsubscribeFromStore = subscribe();
                    window.removeEventListener("moorhenReady", (e: Event) => {
                        if ((e as CustomEvent).detail.id === elementID) {
                            unsubscribeFromStore = subscribe();
                        }
                    });
                }
            });
        } else {
            unsubscribeFromStore = subscribe();
        }

        return () => {
            if (unsubscribeFromStore) {
                unsubscribeFromStore();
            }
        };
    }, [elementID, selector]);
    return selectedValue;
};
