import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export class ErrorBoundary extends Component {
    state = {
        hasError: false,
        error: null,
        errorInfo: null
    };
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
        // Log error details for debugging
        this.logError(error, errorInfo);
    }
    logError = (error, errorInfo) => {
        const errorDetails = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        // Log to console for development
        console.group('🚨 Error Boundary Caught Error');
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Full Details:', errorDetails);
        console.groupEnd();
        // In production, you might want to send this to an error reporting service
        if (process.env.NODE_ENV === 'production') {
            // Example: sendErrorToService(errorDetails);
        }
    };
    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };
    handleReload = () => {
        window.location.reload();
    };
    copyErrorToClipboard = async () => {
        if (!this.state.error || !this.state.errorInfo)
            return;
        const errorText = `
Error: ${this.state.error.message}

Stack Trace:
${this.state.error.stack}

Component Stack:
${this.state.errorInfo.componentStack}

Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `.trim();
        try {
            await navigator.clipboard.writeText(errorText);
            alert('Error details copied to clipboard');
        }
        catch (err) {
            console.error('Failed to copy error details:', err);
            // Fallback: create a text area and select the text
            const textArea = document.createElement('textarea');
            textArea.value = errorText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Error details copied to clipboard (fallback method)');
        }
    };
    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsxs("div", { className: "error-boundary", children: [_jsxs("div", { className: "error-boundary-container", children: [_jsx("div", { className: "error-icon", children: "\u26A0\uFE0F" }), _jsx("h2", { className: "error-title", children: "Something went wrong" }), _jsx("p", { className: "error-description", children: "The application encountered an unexpected error. This might be due to a temporary issue or a bug in the application." }), _jsxs("div", { className: "error-actions", children: [_jsx("button", { className: "btn btn-primary", onClick: this.handleRetry, children: "Try Again" }), _jsx("button", { className: "btn btn-secondary", onClick: this.handleReload, children: "Reload Page" })] }), this.state.error && (_jsxs("details", { className: "error-details", children: [_jsx("summary", { children: "Technical Details" }), _jsxs("div", { className: "error-info", children: [_jsxs("div", { className: "error-section", children: [_jsx("h4", { children: "Error Message:" }), _jsx("code", { className: "error-message", children: this.state.error.message })] }), this.state.error.stack && (_jsxs("div", { className: "error-section", children: [_jsx("h4", { children: "Stack Trace:" }), _jsx("pre", { className: "error-stack", children: this.state.error.stack })] })), this.state.errorInfo?.componentStack && (_jsxs("div", { className: "error-section", children: [_jsx("h4", { children: "Component Stack:" }), _jsx("pre", { className: "error-component-stack", children: this.state.errorInfo.componentStack })] })), _jsx("div", { className: "error-actions-secondary", children: _jsx("button", { className: "btn btn-link", onClick: this.copyErrorToClipboard, children: "Copy Error Details" }) })] })] })), _jsxs("div", { className: "error-suggestions", children: [_jsx("h3", { children: "What you can try:" }), _jsxs("ul", { children: [_jsx("li", { children: "Refresh the page by clicking \"Reload Page\"" }), _jsx("li", { children: "Clear your browser cache and cookies" }), _jsx("li", { children: "Try closing and reopening the application" }), _jsx("li", { children: "Check if there are any browser console errors" }), _jsx("li", { children: "If the problem persists, copy the error details and report the issue" })] })] })] }), _jsx("style", { jsx: true, children: `
            .error-boundary {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
              background-color: #f8f9fa;
            }

            .error-boundary-container {
              max-width: 600px;
              width: 100%;
              background: white;
              border-radius: 8px;
              padding: 2rem;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              text-align: center;
            }

            .error-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }

            .error-title {
              color: #dc3545;
              margin-bottom: 1rem;
              font-size: 1.5rem;
            }

            .error-description {
              color: #666;
              margin-bottom: 2rem;
              line-height: 1.6;
            }

            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              margin-bottom: 2rem;
              flex-wrap: wrap;
            }

            .btn {
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 1rem;
              transition: background-color 0.2s;
            }

            .btn-primary {
              background-color: #007bff;
              color: white;
            }

            .btn-primary:hover {
              background-color: #0056b3;
            }

            .btn-secondary {
              background-color: #6c757d;
              color: white;
            }

            .btn-secondary:hover {
              background-color: #545b62;
            }

            .btn-link {
              background: none;
              color: #007bff;
              text-decoration: underline;
              padding: 0.5rem;
            }

            .btn-link:hover {
              color: #0056b3;
            }

            .error-details {
              margin-top: 2rem;
              text-align: left;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 1rem;
              background-color: #f8f9fa;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 600;
              margin-bottom: 1rem;
              color: #495057;
            }

            .error-section {
              margin-bottom: 1.5rem;
            }

            .error-section h4 {
              margin-bottom: 0.5rem;
              color: #495057;
              font-size: 0.9rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .error-message {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 3px;
              padding: 0.5rem;
              display: block;
              color: #856404;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            }

            .error-stack,
            .error-component-stack {
              background-color: #f8d7da;
              border: 1px solid #f5c6cb;
              border-radius: 3px;
              padding: 0.75rem;
              font-size: 0.8rem;
              color: #721c24;
              overflow-x: auto;
              white-space: pre-wrap;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              max-height: 200px;
              overflow-y: auto;
            }

            .error-actions-secondary {
              margin-top: 1rem;
              text-align: center;
            }

            .error-suggestions {
              margin-top: 2rem;
              text-align: left;
              background-color: #e7f3ff;
              border: 1px solid #b3d9ff;
              border-radius: 4px;
              padding: 1rem;
            }

            .error-suggestions h3 {
              margin-bottom: 0.75rem;
              color: #0066cc;
              font-size: 1rem;
            }

            .error-suggestions ul {
              margin: 0;
              padding-left: 1.25rem;
              color: #0066cc;
            }

            .error-suggestions li {
              margin-bottom: 0.5rem;
              line-height: 1.4;
            }

            @media (max-width: 640px) {
              .error-boundary {
                padding: 1rem;
              }

              .error-boundary-container {
                padding: 1.5rem;
              }

              .error-actions {
                flex-direction: column;
              }

              .btn {
                width: 100%;
              }
            }
          ` })] }));
        }
        return this.props.children;
    }
}
//# sourceMappingURL=ErrorBoundary.js.map