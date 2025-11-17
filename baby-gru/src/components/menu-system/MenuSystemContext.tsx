import React, { ReactNode, createContext, useContext, useEffect, useRef } from "react";
import { MoorhenMenuSystem } from "./MenuSystem";

// Create the context type
type MoorhenMenuSystemContextType = {
    menuSystem: MoorhenMenuSystem;
};

// Create the context
const MoorhenMenuSystemContext = createContext<MoorhenMenuSystemContextType | null>(null);

// Provider props interface
interface MoorhenMenuSystemProviderProps {
    children: ReactNode;
    instance?: MoorhenMenuSystem; // Optional - allows dependency injection for testing
}
export const MoorhenMenuSystemProvider: React.FC<MoorhenMenuSystemProviderProps> = ({ children, instance }) => {
    // Create or use provided instance - only created once per provider
    const menuRef = useRef<MoorhenMenuSystem>(instance || new MoorhenMenuSystem());
    const contextValue: MoorhenMenuSystemContextType = {
        menuSystem: menuRef.current,
    };

    return <MoorhenMenuSystemContext.Provider value={contextValue}>{children}</MoorhenMenuSystemContext.Provider>;
};

// hook
export const useMoorhenMenuSystem = (): MoorhenMenuSystem => {
    const context = useContext(MoorhenMenuSystemContext);

    if (!context) {
        throw new Error(
            "useMoorhenMenuSystem must be used within a MoorhenMenuSystemProvider. " +
                "Make sure your component is wrapped with <MoorhenMenuSystemProvider>."
        );
    }

    return context.menuSystem;
};
