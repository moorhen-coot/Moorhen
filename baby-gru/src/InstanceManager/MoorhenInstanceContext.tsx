import React, { ReactNode, createContext, useEffect, useRef } from "react";
import { MoorhenInstance } from "./MoorhenInstance";

// Create the context type
interface MoorhenInstanceContextType {
    instance: MoorhenInstance;
}

// Create the context
const MoorhenInstanceContext = createContext<MoorhenInstanceContextType | null>(null);

// Provider props interface
interface MoorhenInstanceProviderProps {
    children: ReactNode;
    instance?: MoorhenInstance; // Optional - allows dependency injection for testing
}
export const MoorhenInstanceProvider: React.FC<MoorhenInstanceProviderProps> = ({ children, instance }) => {
    // Create or use provided instance - only created once per provider
    const instanceRef = useRef<MoorhenInstance>(instance || new MoorhenInstance());

    // Add cleanup for unmount and HMR
    useEffect(() => {
        return () => {
            instanceRef.current.cleanup();
        };
    }, []);

    const contextValue: MoorhenInstanceContextType = {
        instance: instanceRef.current,
    };

    return <MoorhenInstanceContext.Provider value={contextValue}>{children}</MoorhenInstanceContext.Provider>;
};

// Export the context for use in hooks
export { MoorhenInstanceContext };
