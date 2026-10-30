import React, { ReactNode, createContext, useEffect, useMemo, useRef, useState } from "react";
import type { MoorhenMenuSystem } from "@/components/menu-system/MenuSystem";
import { MoorhenInstance } from ".";

// Create the context type
interface MoorhenInstanceContextType {
    instance: MoorhenInstance;
}

// Create the context
const MoorhenInstanceContext = createContext<MoorhenInstanceContextType | null>(null);

// Provider props interface
export interface MoorhenInstanceProviderProps {
    children: ReactNode;
    menuSystem: MoorhenMenuSystem;
}
export const MoorhenInstanceProvider = (props: MoorhenInstanceProviderProps) => {
    const popOverContainerRef = useRef<HTMLDivElement>(null);
    // Lazy initialiser: the instance is only constructed once per provider, not on every render
    const [instance] = useState(() => new MoorhenInstance(popOverContainerRef, props.menuSystem));

    // Add cleanup for unmount and HMR
    useEffect(() => {
        return () => {
            instance.cleanup();
        };
    }, [instance]);

    const contextValue = useMemo<MoorhenInstanceContextType>(() => ({ instance }), [instance]);

    return (
        <div ref={popOverContainerRef}>
            <MoorhenInstanceContext.Provider value={contextValue}>{props.children}</MoorhenInstanceContext.Provider>
        </div>
    );
};

// Export the context for use in hooks
export { MoorhenInstanceContext };
