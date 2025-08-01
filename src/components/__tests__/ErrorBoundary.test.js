import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '../ErrorBoundary';
// Mock console methods to avoid noise in test output
const originalError = console.error;
const originalGroup = console.group;
const originalGroupEnd = console.groupEnd;
beforeAll(() => {
    console.error = jest.fn();
    console.group = jest.fn();
    console.groupEnd = jest.fn();
});
afterAll(() => {
    console.error = originalError;
    console.group = originalGroup;
    console.groupEnd = originalGroupEnd;
});
// Component that throws an error for testing
const ThrowError = ({ shouldThrow = true }) => {
    if (shouldThrow) {
        throw new Error('Test error message');
    }
    return _jsx("div", { children: "No error" });
};
describe('ErrorBoundary', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('renders children when there is no error', () => {
        render(_jsx(ErrorBoundary, { children: _jsx("div", { children: "Test content" }) }));
        expect(screen.getByText('Test content')).toBeInTheDocument();
    });
    it('renders error UI when child component throws', () => {
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText(/The application encountered an unexpected error/)).toBeInTheDocument();
    });
    it('displays error message', () => {
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        // Open technical details
        const detailsElement = screen.getByText('Technical Details');
        fireEvent.click(detailsElement);
        expect(screen.getByText('Error Message:')).toBeInTheDocument();
        expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
    it('shows try again and reload buttons', () => {
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        expect(screen.getByText('Try Again')).toBeInTheDocument();
        expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });
    it('resets error state when try again is clicked', () => {
        const { rerender } = render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Try Again'));
        // Re-render with non-throwing component
        rerender(_jsx(ErrorBoundary, { children: _jsx(ThrowError, { shouldThrow: false }) }));
        expect(screen.getByText('No error')).toBeInTheDocument();
    });
    it('calls onError callback when provided', () => {
        const onError = jest.fn();
        render(_jsx(ErrorBoundary, { onError: onError, children: _jsx(ThrowError, {}) }));
        expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
            componentStack: expect.any(String)
        }));
    });
    it('renders custom fallback when provided', () => {
        const customFallback = _jsx("div", { children: "Custom error message" });
        render(_jsx(ErrorBoundary, { fallback: customFallback, children: _jsx(ThrowError, {}) }));
        expect(screen.getByText('Custom error message')).toBeInTheDocument();
        expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
    it('shows technical details when expanded', () => {
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        const detailsElement = screen.getByText('Technical Details');
        fireEvent.click(detailsElement);
        expect(screen.getByText('Error Message:')).toBeInTheDocument();
        expect(screen.getByText('Stack Trace:')).toBeInTheDocument();
        expect(screen.getByText('Component Stack:')).toBeInTheDocument();
    });
    it('shows copy error details button', () => {
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        const detailsElement = screen.getByText('Technical Details');
        fireEvent.click(detailsElement);
        expect(screen.getByText('Copy Error Details')).toBeInTheDocument();
    });
    it('shows helpful suggestions', () => {
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        expect(screen.getByText('What you can try:')).toBeInTheDocument();
        expect(screen.getByText(/Refresh the page by clicking "Reload Page"/)).toBeInTheDocument();
        expect(screen.getByText(/Clear your browser cache and cookies/)).toBeInTheDocument();
    });
    it('logs error details to console', () => {
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        expect(console.error).toHaveBeenCalledWith('ErrorBoundary caught an error:', expect.any(Error), expect.any(Object));
        expect(console.group).toHaveBeenCalledWith('🚨 Error Boundary Caught Error');
        expect(console.groupEnd).toHaveBeenCalled();
    });
    it('handles copy to clipboard with modern API', async () => {
        // Mock navigator.clipboard
        const mockWriteText = jest.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: mockWriteText,
            },
        });
        // Mock window.alert
        window.alert = jest.fn();
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        const detailsElement = screen.getByText('Technical Details');
        fireEvent.click(detailsElement);
        const copyButton = screen.getByText('Copy Error Details');
        fireEvent.click(copyButton);
        expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('Error: Test error message'));
    });
    it('handles copy to clipboard fallback', async () => {
        // Mock navigator.clipboard to not exist
        Object.assign(navigator, {
            clipboard: undefined,
        });
        // Mock document.execCommand
        document.execCommand = jest.fn().mockReturnValue(true);
        document.body.appendChild = jest.fn();
        document.body.removeChild = jest.fn();
        window.alert = jest.fn();
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        const detailsElement = screen.getByText('Technical Details');
        fireEvent.click(detailsElement);
        const copyButton = screen.getByText('Copy Error Details');
        fireEvent.click(copyButton);
        expect(document.execCommand).toHaveBeenCalledWith('copy');
        expect(window.alert).toHaveBeenCalledWith('Error details copied to clipboard (fallback method)');
    });
    it('reloads page when reload button is clicked', () => {
        // Mock window.location.reload
        const mockReload = jest.fn();
        Object.defineProperty(window.location, 'reload', {
            value: mockReload,
            writable: true,
        });
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        fireEvent.click(screen.getByText('Reload Page'));
        expect(mockReload).toHaveBeenCalled();
    });
    it('shows error icon', () => {
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        expect(screen.getByText('⚠️')).toBeInTheDocument();
    });
    it('handles errors with no stack trace', () => {
        // Create an error without a stack trace
        const ErrorWithoutStack = () => {
            const error = new Error('Error without stack');
            delete error.stack;
            throw error;
        };
        render(_jsx(ErrorBoundary, { children: _jsx(ErrorWithoutStack, {}) }));
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        const detailsElement = screen.getByText('Technical Details');
        fireEvent.click(detailsElement);
        expect(screen.getByText('Error without stack')).toBeInTheDocument();
    });
    it('provides responsive design', () => {
        render(_jsx(ErrorBoundary, { children: _jsx(ThrowError, {}) }));
        const errorBoundary = screen.getByText('Something went wrong').closest('.error-boundary');
        expect(errorBoundary).toHaveStyle({ minHeight: '100vh' });
        expect(errorBoundary).toHaveStyle({ display: 'flex' });
    });
});
//# sourceMappingURL=ErrorBoundary.test.js.map