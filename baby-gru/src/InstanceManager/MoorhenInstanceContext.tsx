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
}
export const MoorhenInstanceProvider: React.FC<MoorhenInstanceProviderProps> = ({ children }) => {
    // Create or use provided instance - only created once per provider
    const popOverContainerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<MoorhenInstance>(new MoorhenInstance(popOverContainerRef));

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
            <MoorhenInstanceContext.Provider value={contextValue}>{children}</MoorhenInstanceContext.Provider>
        </div>
    );
};

// Export the context for use in hooks
export { MoorhenInstanceContext };
