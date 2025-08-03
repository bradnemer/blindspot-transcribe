interface ErrorContext {
  component?: string;
  action?: string;
  episodeId?: number;
  episodeTitle?: string;
  url?: string;
  retryCount?: number;
  timestamp?: string;
}

interface LoggedError {
  id: string;
  message: string;
  level: 'error' | 'warning' | 'info';
  context?: ErrorContext;
  timestamp: string;
  stack?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: LoggedError[] = [];
  private maxErrors = 1000; // Keep last 1000 errors
  private listeners: Array<(error: LoggedError) => void> = [];

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private constructor() {
    // Set up global error handlers
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', event.reason, 'error', {
        component: 'Global',
        action: 'unhandledRejection'
      });
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      this.logError('Global Error', event.error || event.message, 'error', {
        component: 'Global',
        action: 'globalError',
        url: event.filename
      });
    });
  }

  public logError(
    message: string, 
    error?: Error | unknown, 
    level: LoggedError['level'] = 'error',
    context?: ErrorContext
  ): string {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();

    let stack: string | undefined;
    let fullMessage = message;

    if (error instanceof Error) {
      fullMessage = `${message}: ${error.message}`;
      stack = error.stack;
    } else if (error) {
      fullMessage = `${message}: ${String(error)}`;
    }

    const loggedError: LoggedError = {
      id: errorId,
      message: fullMessage,
      level,
      context: {
        ...context,
        timestamp
      },
      timestamp,
      stack
    };

    // Add to errors array
    this.errors.unshift(loggedError);

    // Keep only the last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? console.error : 
                           level === 'warning' ? console.warn : console.log;
      
      consoleMethod('ErrorHandler:', {
        id: errorId,
        message: fullMessage,
        level,
        context,
        error
      });
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(loggedError);
      } catch (err) {
        console.error('Error in error handler listener:', err);
      }
    });

    return errorId;
  }

  public logDownloadError(
    episodeId: number,
    episodeTitle: string,
    error: Error | unknown,
    context?: Partial<ErrorContext>
  ): string {
    return this.logError(
      `Download failed for episode "${episodeTitle}"`,
      error,
      'error',
      {
        component: 'DownloadManager',
        action: 'download',
        episodeId,
        episodeTitle,
        ...context
      }
    );
  }

  public logImportError(
    fileName: string,
    error: Error | unknown,
    context?: Partial<ErrorContext>
  ): string {
    return this.logError(
      `CSV import failed for file "${fileName}"`,
      error,
      'error',
      {
        component: 'CSVImporter',
        action: 'import',
        ...context
      }
    );
  }

  public logDatabaseError(
    operation: string,
    error: Error | unknown,
    context?: Partial<ErrorContext>
  ): string {
    return this.logError(
      `Database operation failed: ${operation}`,
      error,
      'error',
      {
        component: 'Database',
        action: operation,
        ...context
      }
    );
  }

  public logWarning(
    message: string, 
    context?: ErrorContext
  ): string {
    return this.logError(message, undefined, 'warning', context);
  }

  public logInfo(
    message: string, 
    context?: ErrorContext
  ): string {
    return this.logError(message, undefined, 'info', context);
  }

  public getErrors(level?: LoggedError['level']): LoggedError[] {
    if (level) {
      return this.errors.filter(error => error.level === level);
    }
    return [...this.errors];
  }

  public getRecentErrors(minutes: number = 5): LoggedError[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.errors.filter(error => new Date(error.timestamp) >= cutoff);
  }

  public clearErrors(): void {
    this.errors = [];
  }

  public onError(listener: (error: LoggedError) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  public getErrorById(id: string): LoggedError | undefined {
    return this.errors.find(error => error.id === id);
  }

  public getErrorStats(): {
    total: number;
    byLevel: Record<LoggedError['level'], number>;
    byComponent: Record<string, number>;
    recentCount: number;
  } {
    const byLevel: Record<LoggedError['level'], number> = {
      error: 0,
      warning: 0,
      info: 0
    };

    const byComponent: Record<string, number> = {};
    
    this.errors.forEach(error => {
      byLevel[error.level]++;
      
      if (error.context?.component) {
        byComponent[error.context.component] = (byComponent[error.context.component] || 0) + 1;
      }
    });

    return {
      total: this.errors.length,
      byLevel,
      byComponent,
      recentCount: this.getRecentErrors().length
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();