// Context Provider and related components
export { 
    MoorhenGlobalInstanceProvider,
    MoorhenGlobalInstanceContext 
} from './MoorhenGlobalInstanceContext';

// Hooks for accessing the context
export { 
    useMoorhenGlobalInstance,
    getMoorhenGlobalInstance 
} from '../hooks/useMoorhenGlobalInstance';

// Re-export the class for convenience
export { MoorhenGlobalInstance } from './MoorhenGlobalInstance';
