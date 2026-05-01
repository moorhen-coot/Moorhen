import { useEffect, useRef, useState } from "react";
import { MoorhenInstance } from "../../InstanceManager/MoorhenInstance";
import { MoorhenWebComponent } from "../MoorhenWebComponent";

/**
 * For use with MoorhenWebComponent only.
 * This hook provides a ref object that will be populated with the MoorhenInstance corresponding to the specified elementID.
 * If the hook is used before the MoorhenWebComponent is ready, the ref will be updated once the instance is ready, and triggers a re-render of the component using the hook.
 * @param elementID
 * @returns A ref object containing the MoorhenInstance once Moorhen is ready.
 */
export const useWebComponentInstanceRef = (elementID: string) => {
    const instanceRef = useRef<MoorhenInstance | null>(null);
    const [_, setInstanceReady] = useState(false);

    useEffect(() => {
        const getInstance = async () => {
            const moorhenElement = document.getElementById(elementID) as MoorhenWebComponent;
            if (moorhenElement) {
                const instance = await moorhenElement.getMoorhenInstance();
                instanceRef.current = instance;
                setInstanceReady(true); // Trigger re-render when instance is ready
            }
        };
        getInstance();
    }, []);

    return instanceRef;
};
