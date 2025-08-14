import React, { createContext, useRef, ReactNode } from 'react';
import { MoorhenGlobalInstance } from './MoorhenGlobalInstance';

// Create the context type
interface MoorhenGlobalInstanceContextType {
    instance: MoorhenGlobalInstance;
}

// Create the context
const MoorhenGlobalInstanceContext = createContext<MoorhenGlobalInstanceContextType | null>(null);

// Provider props interface
interface MoorhenGlobalInstanceProviderProps {
    children: ReactNode;
    instance?: MoorhenGlobalInstance; // Optional - allows dependency injection for testing
}

/**
 * Provider component that creates and provides a MoorhenGlobalInstance
 * This replaces the singleton pattern with a context-based approach
 */
export const MoorhenGlobalInstanceProvider: React.FC<MoorhenGlobalInstanceProviderProps> = ({ 
    children, 
    instance 
}) => {
    // Create or use provided instance - only created once per provider
    const instanceRef = useRef<MoorhenGlobalInstance>(
        instance || new MoorhenGlobalInstance()
    );

    const contextValue: MoorhenGlobalInstanceContextType = {
        instance: instanceRef.current
    };

    return (
        <MoorhenGlobalInstanceContext.Provider value={contextValue}>
            {children}
        </MoorhenGlobalInstanceContext.Provider>
    );
};

// Export the context for use in hooks
export { MoorhenGlobalInstanceContext };
