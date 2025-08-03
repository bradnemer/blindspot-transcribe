/**
 * Represents a single log entry with metadata
 */
interface LogEntry {
  /** Unique identifier for the log entry */
  id: string;
  /** ISO timestamp of when the log entry was created */
  timestamp: string;
  /** Log level indicating severity */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Category/module that generated the log */
  category: string;
  /** Human-readable log message */
  message: string;
  /** Optional structured data associated with the log entry */
  data?: any;
  /** Optional context information for debugging */
  context?: {
    component?: string;
    action?: string;
    episodeId?: number;
    userId?: string;
    sessionId?: string;
  };
}

/**
 * Configuration options for the Logger
 */
interface LoggerConfig {
  /** Maximum number of log entries to keep in memory */
  maxEntries: number;
  /** Whether to output logs to the browser console */
  enableConsoleOutput: boolean;
  /** Whether to persist logs to localStorage */
  enableLocalStorage: boolean;
  /** Minimum log level to process (debug < info < warn < error) */
  logLevel: LogEntry['level'];
}

/**
 * Centralized logging service for the podcast manager application.
 * 
 * Provides structured logging with multiple output targets, log levels,
 * and specialized methods for common operations like downloads and imports.
 * 
 * @example
 * ```typescript
 * import { logger } from './services/logger';
 * 
 * // Basic logging
 * logger.info('App', 'Application started');
 * logger.error('Download', 'Failed to download episode', error);
 * 
 * // Specialized logging
 * logger.logDownloadStart(1, 'My Episode', 'http://example.com/audio.mp3');
 * logger.logImportComplete('episodes.csv', 95, 3, 2);
 * ```
 */
export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private config: LoggerConfig = {
    maxEntries: 2000,
    enableConsoleOutput: true,
    enableLocalStorage: true,
    logLevel: 'info'
  };
  private sessionId: string;

  /**
   * Gets the singleton instance of the Logger
   * @returns The Logger instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.loadStoredLogs();
    this.logInfo('Logger', 'Logger initialized', { sessionId: this.sessionId });
  }

  /**
   * Updates the logger configuration
   * @param config Partial configuration to merge with current settings
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.logInfo('Logger', 'Logger configuration updated', this.config);
  }

  private shouldLog(level: LogEntry['level']): boolean {
    const levels: Record<LogEntry['level'], number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levels[level] >= levels[this.config.logLevel];
  }

  private log(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: any,
    context?: LogEntry['context']
  ): string {
    if (!this.shouldLog(level)) {
      return '';
    }

    const id = this.generateLogId();
    const timestamp = new Date().toISOString();

    const entry: LogEntry = {
      id,
      timestamp,
      level,
      category,
      message,
      data,
      context: {
        ...context,
        sessionId: this.sessionId
      }
    };

    // Add to logs array
    this.logs.unshift(entry);

    // Keep only the last N entries
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(0, this.config.maxEntries);
    }

    // Console output
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(entry);
    }

    // Local storage
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage();
    }

    return id;
  }

  public debug(category: string, message: string, data?: any, context?: LogEntry['context']): string {
    return this.log('debug', category, message, data, context);
  }

  public info(category: string, message: string, data?: any, context?: LogEntry['context']): string {
    return this.log('info', category, message, data, context);
  }

  public warn(category: string, message: string, data?: any, context?: LogEntry['context']): string {
    return this.log('warn', category, message, data, context);
  }

  public error(category: string, message: string, data?: any, context?: LogEntry['context']): string {
    return this.log('error', category, message, data, context);
  }

  // Specialized logging methods
  public logDownloadStart(episodeId: number, episodeTitle: string, url: string): string {
    return this.info('Download', `Started download: ${episodeTitle}`, {
      url,
      episodeTitle
    }, {
      component: 'DownloadManager',
      action: 'start',
      episodeId
    });
  }

  public logDownloadProgress(episodeId: number, progress: number, speed: number): string {
    return this.debug('Download', `Download progress: ${progress}%`, {
      progress,
      speed,
      speedFormatted: this.formatSpeed(speed)
    }, {
      component: 'DownloadManager',
      action: 'progress',
      episodeId
    });
  }

  public logDownloadComplete(episodeId: number, episodeTitle: string, filePath: string, duration: number): string {
    return this.info('Download', `Completed download: ${episodeTitle}`, {
      filePath,
      duration,
      durationFormatted: `${duration}ms`
    }, {
      component: 'DownloadManager',
      action: 'complete',
      episodeId
    });
  }

  public logDownloadError(episodeId: number, episodeTitle: string, error: Error): string {
    return this.error('Download', `Download failed: ${episodeTitle}`, {
      error: error.message,
      stack: error.stack
    }, {
      component: 'DownloadManager',
      action: 'error',
      episodeId
    });
  }

  public logImportStart(fileName: string, episodeCount: number): string {
    return this.info('Import', `Started CSV import: ${fileName}`, {
      fileName,
      episodeCount
    }, {
      component: 'CSVImporter',
      action: 'start'
    });
  }

  public logImportComplete(fileName: string, imported: number, duplicates: number, errors: number): string {
    return this.info('Import', `Completed CSV import: ${fileName}`, {
      fileName,
      imported,
      duplicates,
      errors,
      total: imported + duplicates + errors
    }, {
      component: 'CSVImporter',
      action: 'complete'
    });
  }

  public logDatabaseOperation(operation: string, table: string, recordsAffected?: number): string {
    return this.debug('Database', `${operation} on ${table}`, {
      operation,
      table,
      recordsAffected
    }, {
      component: 'Database',
      action: operation.toLowerCase()
    });
  }

  public logUserAction(action: string, component: string, details?: any): string {
    return this.info('User', `User action: ${action}`, {
      action,
      details
    }, {
      component,
      action: 'userAction'
    });
  }

  public logPerformance(operation: string, duration: number, details?: any): string {
    return this.info('Performance', `${operation} took ${duration}ms`, {
      operation,
      duration,
      details
    }, {
      component: 'Performance',
      action: 'timing'
    });
  }

  // Query and export methods
  public getLogs(filters?: {
    level?: LogEntry['level'];
    category?: string;
    component?: string;
    since?: Date;
    limit?: number;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (filters) {
      if (filters.level) {
        filtered = filtered.filter(log => log.level === filters.level);
      }
      if (filters.category) {
        filtered = filtered.filter(log => log.category === filters.category);
      }
      if (filters.component) {
        filtered = filtered.filter(log => log.context?.component === filters.component);
      }
      if (filters.since) {
        filtered = filtered.filter(log => new Date(log.timestamp) >= filters.since!);
      }
      if (filters.limit) {
        filtered = filtered.slice(0, filters.limit);
      }
    }

    return filtered;
  }

  public getLogStats(): {
    total: number;
    byLevel: Record<LogEntry['level'], number>;
    byCategory: Record<string, number>;
    byComponent: Record<string, number>;
    recentCount: number;
  } {
    const byLevel: Record<LogEntry['level'], number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    };

    const byCategory: Record<string, number> = {};
    const byComponent: Record<string, number> = {};

    this.logs.forEach(log => {
      byLevel[log.level]++;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
      
      if (log.context?.component) {
        byComponent[log.context.component] = (byComponent[log.context.component] || 0) + 1;
      }
    });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = this.logs.filter(log => new Date(log.timestamp) >= oneHourAgo).length;

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      byComponent,
      recentCount
    };
  }

  public exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['Timestamp', 'Level', 'Category', 'Message', 'Component', 'Action'];
      const rows = this.logs.map(log => [
        log.timestamp,
        log.level,
        log.category,
        log.message,
        log.context?.component || '',
        log.context?.action || ''
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(this.logs, null, 2);
  }

  public clearLogs(): void {
    this.logs = [];
    this.saveToLocalStorage();
    this.info('Logger', 'Logs cleared');
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] ${entry.category}:`;
    
    const consoleMethod = entry.level === 'error' ? console.error :
                         entry.level === 'warn' ? console.warn :
                         entry.level === 'debug' ? console.debug :
                         console.log;

    if (entry.data) {
      consoleMethod(prefix, entry.message, entry.data);
    } else {
      consoleMethod(prefix, entry.message);
    }
  }

  private saveToLocalStorage(): void {
    if (typeof localStorage === 'undefined') {
      // Skip localStorage operations in Node.js environment
      return;
    }
    
    try {
      // Save only recent logs to avoid localStorage quota issues
      const recentLogs = this.logs.slice(0, 500);
      localStorage.setItem('podcast-manager-logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to save logs to localStorage:', error);
    }
  }

  private loadStoredLogs(): void {
    if (typeof localStorage === 'undefined') {
      // Skip localStorage operations in Node.js environment
      return;
    }
    
    try {
      const stored = localStorage.getItem('podcast-manager-logs');
      if (stored) {
        const logs = JSON.parse(stored) as LogEntry[];
        this.logs = logs.filter(log => {
          // Only load logs from the last 24 hours
          const logTime = new Date(log.timestamp);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return logTime >= oneDayAgo;
        });
      }
    } catch (error) {
      console.warn('Failed to load logs from localStorage:', error);
    }
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let speed = bytesPerSecond;
    let unitIndex = 0;
    
    while (speed >= 1024 && unitIndex < units.length - 1) {
      speed /= 1024;
      unitIndex++;
    }
    
    return `${speed.toFixed(1)} ${units[unitIndex]}`;
  }

  // Convenience methods that combine logging with error handling
  public logInfo = this.info.bind(this);
  public logError = this.error.bind(this);
  public logWarn = this.warn.bind(this);
  public logDebug = this.debug.bind(this);
}

// Export singleton instance
export const logger = Logger.getInstance();