import { useContext } from 'react';
import { MoorhenGlobalInstanceContext } from './MoorhenGlobalInstanceContext';
import { MoorhenGlobalInstance } from './MoorhenGlobalInstance';

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
