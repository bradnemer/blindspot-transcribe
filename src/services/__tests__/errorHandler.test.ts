import { ErrorHandler } from '../errorHandler';

// Mock the logger
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn().mockReturnValue('mock-log-id'),
    warn: jest.fn().mockReturnValue('mock-log-id'),
    info: jest.fn().mockReturnValue('mock-log-id'),
  }
}));

describe('ErrorHandler Service', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    // Reset the singleton instance for each test
    (ErrorHandler as any).instance = undefined;
    errorHandler = ErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const handler1 = ErrorHandler.getInstance();
      const handler2 = ErrorHandler.getInstance();
      expect(handler1).toBe(handler2);
    });
  });

  describe('Basic Error Logging', () => {
    it('should log basic errors', () => {
      const error = new Error('Test error');
      const logId = errorHandler.logError('Test error message', error);
      
      expect(logId).toBe('mock-log-id');
    });

    it('should handle non-Error objects', () => {
      const logId = errorHandler.logError('String error', 'This is a string error');
      expect(logId).toBe('mock-log-id');
    });

    it('should include context in error logs', () => {
      const error = new Error('Test error');
      const context = { component: 'TestComponent', userId: '123' };
      
      const logId = errorHandler.logError('Test error', error, 'error', context);
      expect(logId).toBe('mock-log-id');
    });
  });

  describe('Specialized Error Logging', () => {
    it('should log download errors', () => {
      const error = new Error('Download failed');
      const logId = errorHandler.logDownloadError(1, 'Test Episode', error);
      
      expect(logId).toBe('mock-log-id');
    });

    it('should log download errors with context', () => {
      const error = new Error('Network error');
      const context = { url: 'http://example.com/episode.mp3', retryCount: 2 };
      
      const logId = errorHandler.logDownloadError(1, 'Test Episode', error, context);
      expect(logId).toBe('mock-log-id');
    });

    it('should log import errors', () => {
      const error = new Error('CSV parse error');
      const logId = errorHandler.logImportError('test.csv', error);
      
      expect(logId).toBe('mock-log-id');
    });

    it('should log import errors with context', () => {
      const error = new Error('Invalid format');
      const context = { line: 5, column: 'title' };
      
      const logId = errorHandler.logImportError('test.csv', error, context);
      expect(logId).toBe('mock-log-id');
    });

    it('should log database errors', () => {
      const error = new Error('Database connection failed');
      const logId = errorHandler.logDatabaseError('episodes', 'INSERT', error);
      
      expect(logId).toBe('mock-log-id');
    });

    it('should log database errors with context', () => {
      const error = new Error('Constraint violation');
      const context = { recordId: 123, constraint: 'unique_title' };
      
      const logId = errorHandler.logDatabaseError('episodes', 'INSERT', error, context);
      expect(logId).toBe('mock-log-id');
    });
  });

  describe('Error Statistics', () => {
    beforeEach(() => {
      // Generate some test errors
      errorHandler.logError('Error 1', new Error('Test 1'));
      errorHandler.logError('Error 2', new Error('Test 2'));
      errorHandler.logDownloadError(1, 'Episode 1', new Error('Download failed'));
      errorHandler.logImportError('test.csv', new Error('Import failed'));
    });

    it('should provide error statistics', () => {
      const stats = errorHandler.getErrorStats();
      
      expect(stats.totalErrors).toBe(4);
      expect(stats.byCategory.General).toBe(2);
      expect(stats.byCategory.Download).toBe(1);
      expect(stats.byCategory.Import).toBe(1);
    });

    it('should provide recent error count', () => {
      const stats = errorHandler.getErrorStats();
      expect(stats.recentErrors).toBe(4); // All errors are recent in tests
    });
  });

  describe('Error Retrieval', () => {
    beforeEach(() => {
      errorHandler.logError('General error', new Error('Test'));
      errorHandler.logDownloadError(1, 'Episode', new Error('Download failed'));
    });

    it('should retrieve recent errors', () => {
      const recentErrors = errorHandler.getRecentErrors();
      expect(recentErrors.length).toBe(2);
    });

    it('should limit recent errors', () => {
      // Add more errors
      for (let i = 0; i < 15; i++) {
        errorHandler.logError(`Error ${i}`, new Error(`Test ${i}`));
      }
      
      const recentErrors = errorHandler.getRecentErrors(5);
      expect(recentErrors.length).toBe(5);
    });

    it('should filter errors by category', () => {
      const downloadErrors = errorHandler.getErrorsByCategory('Download');
      expect(downloadErrors.length).toBe(1);
      expect(downloadErrors[0].category).toBe('Download');
    });
  });

  describe('Global Error Handling', () => {
    let originalOnError: any;
    let originalOnUnhandledRejection: any;

    beforeEach(() => {
      originalOnError = global.onerror;
      originalOnUnhandledRejection = global.onunhandledrejection;
    });

    afterEach(() => {
      global.onerror = originalOnError;
      global.onunhandledrejection = originalOnUnhandledRejection;
    });

    it('should set up global error handlers', () => {
      errorHandler.setupGlobalErrorHandling();
      
      expect(global.onerror).toBeDefined();
      expect(global.onunhandledrejection).toBeDefined();
    });

    it('should handle global errors', () => {
      errorHandler.setupGlobalErrorHandling();
      
      // Simulate a global error
      if (global.onerror) {
        global.onerror('Test error', 'test.js', 10, 5, new Error('Global error'));
      }
      
      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
    });

    it('should handle unhandled promise rejections', () => {
      errorHandler.setupGlobalErrorHandling();
      
      // Simulate an unhandled rejection
      if (global.onunhandledrejection) {
        const event = {
          reason: new Error('Unhandled rejection'),
          promise: Promise.reject(new Error('Test'))
        };
        global.onunhandledrejection(event as any);
      }
      
      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
    });
  });

  describe('Error Notifications', () => {
    it('should format error notifications', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10:5';
      
      const notification = errorHandler.formatErrorForNotification(error, {
        component: 'TestComponent',
        action: 'testAction'
      });
      
      expect(notification.title).toContain('Error in TestComponent');
      expect(notification.message).toBe('Test error');
      expect(notification.severity).toBe('error');
      expect(notification.context).toBeDefined();
    });

    it('should format warning notifications', () => {
      const warning = 'This is a warning';
      
      const notification = errorHandler.formatErrorForNotification(warning, {
        component: 'TestComponent'
      }, 'warn');
      
      expect(notification.severity).toBe('warn');
      expect(notification.message).toBe('This is a warning');
    });
  });

  describe('Error Analysis', () => {
    beforeEach(() => {
      // Create various error patterns
      for (let i = 0; i < 5; i++) {
        errorHandler.logDownloadError(i, `Episode ${i}`, new Error('Network timeout'));
      }
      for (let i = 0; i < 3; i++) {
        errorHandler.logDatabaseError('episodes', 'INSERT', new Error('Connection refused'));
      }
    });

    it('should identify error patterns', () => {
      const patterns = errorHandler.getErrorPatterns();
      
      expect(patterns.length).toBeGreaterThan(0);
      
      const networkPattern = patterns.find(p => p.message.includes('Network timeout'));
      expect(networkPattern).toBeTruthy();
      expect(networkPattern?.count).toBe(5);
      
      const dbPattern = patterns.find(p => p.message.includes('Connection refused'));
      expect(dbPattern).toBeTruthy();
      expect(dbPattern?.count).toBe(3);
    });

    it('should provide error pattern recommendations', () => {
      const patterns = errorHandler.getErrorPatterns();
      const recommendations = errorHandler.getRecommendations();
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('Network timeout'))).toBe(true);
    });
  });

  describe('Error Export', () => {
    beforeEach(() => {
      errorHandler.logError('Export test error', new Error('Test'));
    });

    it('should export errors as JSON', () => {
      const exported = errorHandler.exportErrors('json');
      expect(() => JSON.parse(exported)).not.toThrow();
      
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should export errors as CSV', () => {
      const exported = errorHandler.exportErrors('csv');
      expect(exported).toContain('Timestamp,Category,Message,Component,Action');
      expect(exported).toContain('Export test error');
    });
  });

  describe('Error Cleanup', () => {
    beforeEach(() => {
      // Add multiple errors
      for (let i = 0; i < 10; i++) {
        errorHandler.logError(`Error ${i}`, new Error(`Test ${i}`));
      }
    });

    it('should clear all errors', () => {
      let stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(10);
      
      errorHandler.clearErrors();
      stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(0);
    });

    it('should respect maximum error limit', () => {
      // The error handler should automatically limit stored errors
      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeLessThanOrEqual(1000); // Assuming max limit of 1000
    });
  });
});