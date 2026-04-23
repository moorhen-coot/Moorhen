import React, { ReactNode, createContext, useEffect, useRef } from "react";
import type { MoorhenMenuSystem } from "@/components/menu-system/MenuSystem";
import { MoorhenInstance } from ".";

// Create the context type
interface MoorhenInstanceContextType {
    instance: MoorhenInstance;
}

// Create the context
const MoorhenInstanceContext = createContext<MoorhenInstanceContextType | null>(null);

// Provider props interface
interface MoorhenInstanceProviderProps {
    children: ReactNode;
    menuSystem: MoorhenMenuSystem;
}
export const MoorhenInstanceProvider = (props: MoorhenInstanceProviderProps) => {
    // Create or use provided instance - only created once per provider
    const popOverContainerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<MoorhenInstance>(new MoorhenInstance(popOverContainerRef, props.menuSystem));

    // Add cleanup for unmount and HMR
    useEffect(() => {
        return () => {
            instanceRef.current.cleanup();
        };
    }, []);

    const contextValue: MoorhenInstanceContextType = {
        instance: instanceRef.current,
    };

    return (
        <div ref={popOverContainerRef}>
            <MoorhenInstanceContext.Provider value={contextValue}>{props.children}</MoorhenInstanceContext.Provider>
        </div>
    );
};

// Export the context for use in hooks
export { MoorhenInstanceContext };
