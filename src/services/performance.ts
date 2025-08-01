/**
 * Represents a single performance measurement
 */
interface PerformanceMetric {
  /** Name/identifier of the operation being measured */
  name: string;
  /** Start time in milliseconds */
  startTime: number;
  /** End time in milliseconds */
  endTime?: number;
  /** Calculated duration in milliseconds */
  duration?: number;
  /** Additional metadata about the operation */
  metadata?: Record<string, any>;
}

/**
 * Statistical report for a set of performance measurements
 */
interface PerformanceReport {
  /** Total time spent across all measurements */
  totalDuration: number;
  /** Average duration per measurement */
  averageDuration: number;
  /** Fastest recorded measurement */
  minDuration: number;
  /** Slowest recorded measurement */
  maxDuration: number;
  /** Number of measurements taken */
  count: number;
  /** Timestamp of the most recent measurement */
  lastExecuted: number;
}

/**
 * Performance monitoring service for tracking operation timing and resource usage.
 * 
 * Provides comprehensive performance measurement capabilities including:
 * - Manual timing with start/end markers
 * - Automatic timing for sync/async functions
 * - Performance reports and analysis
 * - Memory usage tracking
 * - Resource timing integration
 * - Performance recommendations
 * 
 * @example
 * ```typescript
 * import { performanceMonitor } from './services/performance';
 * 
 * // Manual timing
 * const id = performanceMonitor.startTiming('database-query');
 * // ... perform operation
 * const duration = performanceMonitor.endTiming(id);
 * 
 * // Automatic timing
 * const result = performanceMonitor.measure('api-call', () => {
 *   return fetch('/api/data');
 * });
 * 
 * // Get performance reports
 * const report = performanceMonitor.getReport('database-query');
 * const recommendations = performanceMonitor.getRecommendations();
 * ```
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeMetrics: Map<string, PerformanceMetric> = new Map();
  private maxMetricsPerOperation = 100; // Keep last 100 measurements per operation

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private constructor() {
    // Set up performance observer for web APIs
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.setupPerformanceObserver();
    }
  }

  private setupPerformanceObserver() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.recordMetric(entry.name, entry.startTime, entry.startTime + entry.duration);
          }
        }
      });
      
      observer.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('PerformanceObserver not supported:', error);
    }
  }

  public startTiming(name: string, metadata?: Record<string, any>): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    const metric: PerformanceMetric = {
      name,
      startTime,
      metadata
    };
    
    this.activeMetrics.set(id, metric);
    return id;
  }

  public endTiming(id: string): number | null {
    const metric = this.activeMetrics.get(id);
    if (!metric) {
      console.warn(`No active timing found for id: ${id}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    
    this.recordMetric(metric.name, metric.startTime, endTime, metric.metadata);
    this.activeMetrics.delete(id);
    
    return duration;
  }

  public measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const id = this.startTiming(name, metadata);
    try {
      const result = fn();
      this.endTiming(id);
      return result;
    } catch (error) {
      this.endTiming(id);
      throw error;
    }
  }

  public async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    const id = this.startTiming(name, metadata);
    try {
      const result = await fn();
      this.endTiming(id);
      return result;
    } catch (error) {
      this.endTiming(id);
      throw error;
    }
  }

  private recordMetric(
    name: string, 
    startTime: number, 
    endTime: number, 
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      startTime,
      endTime,
      duration: endTime - startTime,
      metadata
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.unshift(metric);

    // Keep only the last N metrics
    if (metrics.length > this.maxMetricsPerOperation) {
      metrics.splice(this.maxMetricsPerOperation);
    }
  }

  public getReport(name: string): PerformanceReport | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!);

    if (durations.length === 0) {
      return null;
    }

    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const averageDuration = totalDuration / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const lastExecuted = Math.max(...metrics.map(m => m.startTime));

    return {
      totalDuration,
      averageDuration,
      minDuration,
      maxDuration,
      count: durations.length,
      lastExecuted
    };
  }

  public getAllReports(): Record<string, PerformanceReport> {
    const reports: Record<string, PerformanceReport> = {};
    
    for (const name of this.metrics.keys()) {
      const report = this.getReport(name);
      if (report) {
        reports[name] = report;
      }
    }
    
    return reports;
  }

  public getSlowOperations(thresholdMs: number = 1000): Array<{
    name: string;
    averageDuration: number;
    maxDuration: number;
    count: number;
  }> {
    const reports = this.getAllReports();
    
    return Object.entries(reports)
      .filter(([, report]) => report.averageDuration > thresholdMs)
      .map(([name, report]) => ({
        name,
        averageDuration: report.averageDuration,
        maxDuration: report.maxDuration,
        count: report.count
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration);
  }

  public clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  public exportMetrics(): string {
    const data = Object.fromEntries(this.metrics.entries());
    return JSON.stringify(data, null, 2);
  }

  // Memory usage tracking
  public getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } | null {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
      };
    }
    return null;
  }

  // Resource timing
  public getResourceTimings(filter?: string): PerformanceResourceTiming[] {
    if (typeof window === 'undefined' || !('getEntriesByType' in performance)) {
      return [];
    }

    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    if (filter) {
      return entries.filter(entry => entry.name.includes(filter));
    }
    
    return entries;
  }

  // Navigation timing
  public getNavigationTiming(): PerformanceNavigationTiming | null {
    if (typeof window === 'undefined' || !('getEntriesByType' in performance)) {
      return null;
    }

    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return entries.length > 0 ? entries[0] : null;
  }

  // Helper methods for common operations
  public markDatabaseOperation(operation: string, table: string, recordCount?: number) {
    const name = `db_${operation}_${table}`;
    return this.startTiming(name, { operation, table, recordCount });
  }

  public markDownloadOperation(episodeId: number, url: string) {
    const name = `download_episode`;
    return this.startTiming(name, { episodeId, url });
  }

  public markImportOperation(fileName: string, recordCount: number) {
    const name = `import_csv`;
    return this.startTiming(name, { fileName, recordCount });
  }

  // Performance recommendations
  public getRecommendations(): string[] {
    const recommendations: string[] = [];
    const slowOps = this.getSlowOperations(500); // Operations slower than 500ms
    
    if (slowOps.length > 0) {
      recommendations.push(`Found ${slowOps.length} slow operations. Consider optimization.`);
      
      slowOps.forEach(op => {
        if (op.name.includes('db_')) {
          recommendations.push(`Database operation "${op.name}" is slow (${op.averageDuration.toFixed(2)}ms avg). Consider indexing or query optimization.`);
        } else if (op.name.includes('download_')) {
          recommendations.push(`Download operations are slow (${op.averageDuration.toFixed(2)}ms avg). Check network conditions or server performance.`);
        } else if (op.name.includes('import_')) {
          recommendations.push(`CSV imports are slow (${op.averageDuration.toFixed(2)}ms avg). Consider batch processing or worker threads.`);
        }
      });
    }

    const memory = this.getMemoryUsage();
    if (memory && memory.percentage > 80) {
      recommendations.push(`High memory usage (${memory.percentage}%). Consider implementing data pagination or cleanup.`);
    }

    return recommendations;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Utility decorators for automatic performance tracking
export function timed(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measure(operationName, () => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

export function timedAsync(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measureAsync(operationName, () => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}