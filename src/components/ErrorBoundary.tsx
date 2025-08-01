import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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

  private logError = (error: Error, errorInfo: ErrorInfo) => {
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

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private copyErrorToClipboard = async () => {
    if (!this.state.error || !this.state.errorInfo) return;

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
    } catch (err) {
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

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-container">
            <div className="error-icon">⚠️</div>
            
            <h2 className="error-title">Something went wrong</h2>
            
            <p className="error-description">
              The application encountered an unexpected error. This might be due to a 
              temporary issue or a bug in the application.
            </p>

            <div className="error-actions">
              <button 
                className="btn btn-primary"
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              
              <button 
                className="btn btn-secondary"
                onClick={this.handleReload}
              >
                Reload Page
              </button>
            </div>

            {this.state.error && (
              <details className="error-details">
                <summary>Technical Details</summary>
                
                <div className="error-info">
                  <div className="error-section">
                    <h4>Error Message:</h4>
                    <code className="error-message">
                      {this.state.error.message}
                    </code>
                  </div>

                  {this.state.error.stack && (
                    <div className="error-section">
                      <h4>Stack Trace:</h4>
                      <pre className="error-stack">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}

                  {this.state.errorInfo?.componentStack && (
                    <div className="error-section">
                      <h4>Component Stack:</h4>
                      <pre className="error-component-stack">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}

                  <div className="error-actions-secondary">
                    <button 
                      className="btn btn-link"
                      onClick={this.copyErrorToClipboard}
                    >
                      Copy Error Details
                    </button>
                  </div>
                </div>
              </details>
            )}

            <div className="error-suggestions">
              <h3>What you can try:</h3>
              <ul>
                <li>Refresh the page by clicking "Reload Page"</li>
                <li>Clear your browser cache and cookies</li>
                <li>Try closing and reopening the application</li>
                <li>Check if there are any browser console errors</li>
                <li>If the problem persists, copy the error details and report the issue</li>
              </ul>
            </div>
          </div>

          <style jsx>{`
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
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}