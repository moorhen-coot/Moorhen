import { useContext } from 'react';
import { MoorhenInstance } from './MoorhenInstance';
import { MoorhenInstanceContext } from './MoorhenInstanceContext';

/**
 * Custom hook to access the MoorhenInstance from context
 * This provides the same interface as the previous singleton access
 */
export const useMoorhenInstance = (): MoorhenInstance => {
    const context = useContext(MoorhenInstanceContext);

    if (!context) {
        throw new Error(
            'useMoorhenInstance must be used within a MoorhenInstanceProvider. ' +
                'Make sure your component is wrapped with <MoorhenInstanceProvider>.'
        );
    }

    return context.instance;
};
