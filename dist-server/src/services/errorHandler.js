export class ErrorHandler {
    static instance;
    errors = [];
    maxErrors = 1000; // Keep last 1000 errors
    listeners = [];
    static getInstance() {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }
    constructor() {
        // Set up global error handlers
        this.setupGlobalHandlers();
    }
    setupGlobalHandlers() {
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
    logError(message, error, level = 'error', context) {
        const errorId = this.generateErrorId();
        const timestamp = new Date().toISOString();
        let stack;
        let fullMessage = message;
        if (error instanceof Error) {
            fullMessage = `${message}: ${error.message}`;
            stack = error.stack;
        }
        else if (error) {
            fullMessage = `${message}: ${String(error)}`;
        }
        const loggedError = {
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
            }
            catch (err) {
                console.error('Error in error handler listener:', err);
            }
        });
        return errorId;
    }
    logDownloadError(episodeId, episodeTitle, error, context) {
        return this.logError(`Download failed for episode "${episodeTitle}"`, error, 'error', {
            component: 'DownloadManager',
            action: 'download',
            episodeId,
            episodeTitle,
            ...context
        });
    }
    logImportError(fileName, error, context) {
        return this.logError(`CSV import failed for file "${fileName}"`, error, 'error', {
            component: 'CSVImporter',
            action: 'import',
            ...context
        });
    }
    logDatabaseError(operation, error, context) {
        return this.logError(`Database operation failed: ${operation}`, error, 'error', {
            component: 'Database',
            action: operation,
            ...context
        });
    }
    logWarning(message, context) {
        return this.logError(message, undefined, 'warning', context);
    }
    logInfo(message, context) {
        return this.logError(message, undefined, 'info', context);
    }
    getErrors(level) {
        if (level) {
            return this.errors.filter(error => error.level === level);
        }
        return [...this.errors];
    }
    getRecentErrors(minutes = 5) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        return this.errors.filter(error => new Date(error.timestamp) >= cutoff);
    }
    clearErrors() {
        this.errors = [];
    }
    onError(listener) {
        this.listeners.push(listener);
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    exportErrors() {
        return JSON.stringify(this.errors, null, 2);
    }
    getErrorById(id) {
        return this.errors.find(error => error.id === id);
    }
    getErrorStats() {
        const byLevel = {
            error: 0,
            warning: 0,
            info: 0
        };
        const byComponent = {};
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
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
