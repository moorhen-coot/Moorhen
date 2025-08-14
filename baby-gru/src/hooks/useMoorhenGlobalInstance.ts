import { useContext } from 'react';
import { MoorhenGlobalInstanceContext } from '../InstanceManager/MoorhenGlobalInstanceContext';
import { MoorhenGlobalInstance } from '../InstanceManager/MoorhenGlobalInstance';

/**
 * Custom hook to access the MoorhenGlobalInstance from context
 * This provides the same interface as the previous singleton access
 */
export const useMoorhenGlobalInstance = (): MoorhenGlobalInstance => {
    const context = useContext(MoorhenGlobalInstanceContext);
    
    if (!context) {
        throw new Error(
            'useMoorhenGlobalInstance must be used within a MoorhenGlobalInstanceProvider. ' +
            'Make sure your component is wrapped with <MoorhenGlobalInstanceProvider>.'
        );
    }
    
    return context.instance;
};

/**
 * Legacy compatibility function that provides the same interface as the old singleton
 * This allows for gradual migration from singleton to context
 * @deprecated Use useMoorhenGlobalInstance hook instead
 */
export const getMoorhenGlobalInstance = (): MoorhenGlobalInstance => {
    // This function should only be used during migration
    // In the future, this could throw an error to enforce context usage
    console.warn(
        'getMoorhenGlobalInstance is deprecated. Use useMoorhenGlobalInstance hook instead.'
    );
    
    // For now, we'll try to get from context, but this won't work outside React components
    // This is intentional to encourage proper usage
    throw new Error(
        'getMoorhenGlobalInstance can only be replaced with useMoorhenGlobalInstance hook inside React components.'
    );
};
