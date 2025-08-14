import React from 'react';
import { render, screen } from '@testing-library/react';
import { MoorhenGlobalInstanceProvider } from '../InstanceManager/MoorhenGlobalInstanceContext';
import { MoorhenGlobalInstance, useMoorhenGlobalInstance } from '../InstanceManager';

// Mock component to test the hook
const TestComponent: React.FC = () => {
    const globalInstance = useMoorhenGlobalInstance();
    return <div data-testid="test-component">Instance loaded: {globalInstance ? 'Yes' : 'No'}</div>;
};

describe('MoorhenGlobalInstance Context', () => {
    test('provides access to global instance via hook', () => {
        render(
            <MoorhenGlobalInstanceProvider>
                <TestComponent />
            </MoorhenGlobalInstanceProvider>
        );

        expect(screen.getByTestId('test-component')).toHaveTextContent('Instance loaded: Yes');
    });

    test('allows dependency injection for testing', () => {
        // Create a mock instance for testing
        const mockInstance = new MoorhenGlobalInstance();
        
        render(
            <MoorhenGlobalInstanceProvider instance={mockInstance}>
                <TestComponent />
            </MoorhenGlobalInstanceProvider>
        );

        expect(screen.getByTestId('test-component')).toHaveTextContent('Instance loaded: Yes');
    });

    test('throws error when used outside provider', () => {
        // This should throw an error
        const consoleError = jest.spyOn(console, 'error').mockImplementation();
        
        expect(() => {
            render(<TestComponent />);
        }).toThrow();
        
        consoleError.mockRestore();
    });
});
