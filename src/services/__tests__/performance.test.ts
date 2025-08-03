import { PerformanceMonitor } from '../performance';

describe('PerformanceMonitor Service', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    // Reset the singleton instance for each test
    (PerformanceMonitor as any).instance = undefined;
    monitor = PerformanceMonitor.getInstance();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const monitor1 = PerformanceMonitor.getInstance();
      const monitor2 = PerformanceMonitor.getInstance();
      expect(monitor1).toBe(monitor2);
    });
  });

  describe('Basic Timing', () => {
    it('should start and end timing', () => {
      const id = monitor.startTiming('test-operation');
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      
      const duration = monitor.endTiming(id);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should return null for invalid timing id', () => {
      const duration = monitor.endTiming('invalid-id');
      expect(duration).toBeNull();
    });

    it('should include metadata in timing', () => {
      const metadata = { operation: 'test', recordCount: 5 };
      const id = monitor.startTiming('test-with-metadata', metadata);
      const duration = monitor.endTiming(id);
      
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Synchronous Measurement', () => {
    it('should measure synchronous functions', () => {
      const result = monitor.measure('sync-test', () => {
        return 'test-result';
      });
      
      expect(result).toBe('test-result');
    });

    it('should handle synchronous function errors', () => {
      expect(() => {
        monitor.measure('error-test', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });
  });

  describe('Asynchronous Measurement', () => {
    it('should measure asynchronous functions', async () => {
      const result = await monitor.measureAsync('async-test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      });
      
      expect(result).toBe('async-result');
    });

    it('should handle asynchronous function errors', async () => {
      await expect(
        monitor.measureAsync('async-error-test', async () => {
          throw new Error('Async test error');
        })
      ).rejects.toThrow('Async test error');
    });
  });

  describe('Performance Reports', () => {
    beforeEach(() => {
      // Add some test measurements
      monitor.measure('test-operation', () => 'result1');
      monitor.measure('test-operation', () => 'result2');
      monitor.measure('different-operation', () => 'result3');
    });

    it('should generate performance report for specific operation', () => {
      const report = monitor.getReport('test-operation');
      
      expect(report).toBeTruthy();
      expect(report!.count).toBe(2);
      expect(report!.totalDuration).toBeGreaterThanOrEqual(0);
      expect(report!.averageDuration).toBeGreaterThanOrEqual(0);
      expect(report!.minDuration).toBeGreaterThanOrEqual(0);
      expect(report!.maxDuration).toBeGreaterThanOrEqual(0);
    });

    it('should return null for non-existent operation', () => {
      const report = monitor.getReport('non-existent');
      expect(report).toBeNull();
    });

    it('should generate reports for all operations', () => {
      const reports = monitor.getAllReports();
      
      expect(Object.keys(reports).length).toBeGreaterThanOrEqual(2);
      expect(reports['test-operation']).toBeTruthy();
      expect(reports['different-operation']).toBeTruthy();
    });
  });

  describe('Slow Operations Detection', () => {
    beforeEach(() => {
      // Simulate slow operation
      const id = monitor.startTiming('slow-operation');
      // Mock a slow operation by manually setting timing
      const activeMetric = (monitor as any).activeMetrics.get(id);
      if (activeMetric) {
        activeMetric.startTime = performance.now() - 2000; // 2 seconds ago
      }
      monitor.endTiming(id);
    });

    it('should identify slow operations', () => {
      const slowOps = monitor.getSlowOperations(1000); // Operations slower than 1 second
      
      expect(slowOps.length).toBeGreaterThanOrEqual(1);
      const slowOp = slowOps.find(op => op.name === 'slow-operation');
      expect(slowOp).toBeTruthy();
    });

    it('should sort slow operations by average duration', () => {
      const slowOps = monitor.getSlowOperations(0);
      
      if (slowOps.length > 1) {
        for (let i = 1; i < slowOps.length; i++) {
          expect(slowOps[i-1].averageDuration).toBeGreaterThanOrEqual(slowOps[i].averageDuration);
        }
      }
    });
  });

  describe('Helper Methods', () => {
    it('should mark database operations', () => {
      const id = monitor.markDatabaseOperation('SELECT', 'episodes', 10);
      expect(id).toBeTruthy();
      
      const duration = monitor.endTiming(id);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should mark download operations', () => {
      const id = monitor.markDownloadOperation(1, 'http://example.com/episode.mp3');
      expect(id).toBeTruthy();
      
      const duration = monitor.endTiming(id);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should mark import operations', () => {
      const id = monitor.markImportOperation('test.csv', 100);
      expect(id).toBeTruthy();
      
      const duration = monitor.endTiming(id);
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memory Usage', () => {
    it('should handle missing memory API gracefully', () => {
      const memoryUsage = monitor.getMemoryUsage();
      // In test environment, this should return null
      expect(memoryUsage).toBeNull();
    });
  });

  describe('Resource Timing', () => {
    it('should get resource timings', () => {
      const timings = monitor.getResourceTimings();
      expect(Array.isArray(timings)).toBe(true);
    });

    it('should filter resource timings', () => {
      const timings = monitor.getResourceTimings('example.com');
      expect(Array.isArray(timings)).toBe(true);
    });
  });

  describe('Navigation Timing', () => {
    it('should get navigation timing', () => {
      const timing = monitor.getNavigationTiming();
      // In test environment, this should return null
      expect(timing).toBeNull();
    });
  });

  describe('Performance Recommendations', () => {
    it('should provide recommendations for slow operations', () => {
      // Create a slow operation
      const id = monitor.startTiming('db_SELECT_episodes');
      const activeMetric = (monitor as any).activeMetrics.get(id);
      if (activeMetric) {
        activeMetric.startTime = performance.now() - 1000; // 1 second ago
      }
      monitor.endTiming(id);
      
      const recommendations = monitor.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should provide memory recommendations when memory usage is high', () => {
      // Mock high memory usage
      jest.spyOn(monitor, 'getMemoryUsage').mockReturnValue({
        used: 85 * 1024 * 1024,
        total: 100 * 1024 * 1024,
        percentage: 85
      });
      
      const recommendations = monitor.getRecommendations();
      expect(recommendations.some(r => r.includes('memory usage'))).toBe(true);
      
      jest.restoreAllMocks();
    });
  });

  describe('Metrics Management', () => {
    beforeEach(() => {
      monitor.measure('test-clear', () => 'result');
    });

    it('should clear specific metrics', () => {
      let report = monitor.getReport('test-clear');
      expect(report).toBeTruthy();
      
      monitor.clearMetrics('test-clear');
      report = monitor.getReport('test-clear');
      expect(report).toBeNull();
    });

    it('should clear all metrics', () => {
      let reports = monitor.getAllReports();
      expect(Object.keys(reports).length).toBeGreaterThan(0);
      
      monitor.clearMetrics();
      reports = monitor.getAllReports();
      expect(Object.keys(reports).length).toBe(0);
    });
  });

  describe('Metrics Export', () => {
    beforeEach(() => {
      monitor.measure('export-test', () => 'result');
    });

    it('should export metrics as JSON', () => {
      const exported = monitor.exportMetrics();
      expect(() => JSON.parse(exported)).not.toThrow();
      
      const parsed = JSON.parse(exported);
      expect(parsed['export-test']).toBeDefined();
    });
  });
});