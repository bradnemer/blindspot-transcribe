import { Logger } from '../logger';

describe('Logger Service', () => {
  let logger: Logger;

  beforeEach(() => {
    // Reset the singleton instance for each test
    (Logger as any).instance = undefined;
    logger = Logger.getInstance();
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const logger1 = Logger.getInstance();
      const logger2 = Logger.getInstance();
      expect(logger1).toBe(logger2);
    });
  });

  describe('Basic Logging', () => {
    it('should log debug messages', () => {
      const logId = logger.debug('Test', 'Debug message', { test: true });
      expect(logId).toBeTruthy();
      expect(typeof logId).toBe('string');
    });

    it('should log info messages', () => {
      const logId = logger.info('Test', 'Info message');
      expect(logId).toBeTruthy();
    });

    it('should log warning messages', () => {
      const logId = logger.warn('Test', 'Warning message');
      expect(logId).toBeTruthy();
    });

    it('should log error messages', () => {
      const logId = logger.error('Test', 'Error message');
      expect(logId).toBeTruthy();
    });
  });

  describe('Configuration', () => {
    it('should respect log level configuration', () => {
      logger.configure({ logLevel: 'error' });
      
      const debugId = logger.debug('Test', 'Debug message');
      const infoId = logger.info('Test', 'Info message');
      const errorId = logger.error('Test', 'Error message');
      
      expect(debugId).toBe('');
      expect(infoId).toBe('');
      expect(errorId).toBeTruthy();
    });

    it('should allow disabling console output', () => {
      logger.configure({ enableConsoleOutput: false });
      const logId = logger.info('Test', 'Test message');
      expect(logId).toBeTruthy();
    });

    it('should allow disabling localStorage', () => {
      logger.configure({ enableLocalStorage: false });
      const logId = logger.info('Test', 'Test message');
      expect(logId).toBeTruthy();
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Specialized Logging Methods', () => {
    it('should log download start', () => {
      const logId = logger.logDownloadStart(1, 'Test Episode', 'http://example.com/episode.mp3');
      expect(logId).toBeTruthy();
    });

    it('should log download progress', () => {
      const logId = logger.logDownloadProgress(1, 50, 1024);
      expect(logId).toBeTruthy();
    });

    it('should log download complete', () => {
      const logId = logger.logDownloadComplete(1, 'Test Episode', '/path/to/file.mp3', 5000);
      expect(logId).toBeTruthy();
    });

    it('should log download error', () => {
      const error = new Error('Download failed');
      const logId = logger.logDownloadError(1, 'Test Episode', error);
      expect(logId).toBeTruthy();
    });

    it('should log import operations', () => {
      const startId = logger.logImportStart('test.csv', 100);
      const completeId = logger.logImportComplete('test.csv', 95, 3, 2);
      
      expect(startId).toBeTruthy();
      expect(completeId).toBeTruthy();
    });

    it('should log database operations', () => {
      const logId = logger.logDatabaseOperation('INSERT', 'episodes', 1);
      expect(logId).toBeTruthy();
    });

    it('should log user actions', () => {
      const logId = logger.logUserAction('click', 'DownloadButton', { episodeId: 1 });
      expect(logId).toBeTruthy();
    });

    it('should log performance metrics', () => {
      const logId = logger.logPerformance('database_query', 150, { table: 'episodes' });
      expect(logId).toBeTruthy();
    });
  });

  describe('Log Retrieval and Filtering', () => {
    beforeEach(() => {
      logger.info('Test', 'Info message');
      logger.warn('Test', 'Warning message');
      logger.error('Test', 'Error message');
      logger.debug('Other', 'Debug message');
    });

    it('should retrieve all logs', () => {
      const logs = logger.getLogs();
      expect(logs.length).toBe(4);
    });

    it('should filter logs by level', () => {
      const errorLogs = logger.getLogs({ level: 'error' });
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].level).toBe('error');
    });

    it('should filter logs by category', () => {
      const testLogs = logger.getLogs({ category: 'Test' });
      expect(testLogs.length).toBe(3);
    });

    it('should limit log results', () => {
      const limitedLogs = logger.getLogs({ limit: 2 });
      expect(limitedLogs.length).toBe(2);
    });
  });

  describe('Log Statistics', () => {
    beforeEach(() => {
      logger.info('Test', 'Info message');
      logger.warn('Test', 'Warning message');
      logger.error('Test', 'Error message');
    });

    it('should provide log statistics', () => {
      const stats = logger.getLogStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byLevel.info).toBe(1);
      expect(stats.byLevel.warn).toBe(1);
      expect(stats.byLevel.error).toBe(1);
      expect(stats.byCategory.Test).toBe(3);
    });
  });

  describe('Log Export', () => {
    beforeEach(() => {
      logger.info('Test', 'Test message');
    });

    it('should export logs as JSON', () => {
      const exported = logger.exportLogs('json');
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should export logs as CSV', () => {
      const exported = logger.exportLogs('csv');
      expect(exported).toContain('Timestamp,Level,Category,Message,Component,Action');
      expect(exported).toContain('info,Test,Test message');
    });
  });

  describe('Log Management', () => {
    it('should clear logs', () => {
      logger.info('Test', 'Test message');
      expect(logger.getLogs().length).toBe(1);
      
      logger.clearLogs();
      expect(logger.getLogs().length).toBe(0);
    });

    it('should respect maximum entries limit', () => {
      logger.configure({ maxEntries: 2 });
      
      logger.info('Test', 'Message 1');
      logger.info('Test', 'Message 2');
      logger.info('Test', 'Message 3');
      
      const logs = logger.getLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].message).toBe('Message 3'); // Most recent first
      expect(logs[1].message).toBe('Message 2');
    });
  });
});