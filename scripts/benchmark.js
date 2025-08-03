#!/usr/bin/env node

/**
 * Performance Benchmarking Script
 * 
 * This script runs performance benchmarks for the Podcast Manager application
 * to establish baseline performance metrics and identify optimization opportunities.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Benchmark configuration
const BENCHMARK_CONFIG = {
  csvParsingTests: {
    smallFile: 100,   // 100 episodes
    mediumFile: 1000, // 1000 episodes
    largeFile: 10000  // 10000 episodes
  },
  memoryThresholds: {
    initial: 50,      // 50MB
    afterLoad: 100,   // 100MB
    afterProcessing: 150 // 150MB
  },
  performanceThresholds: {
    csvParsing: 1000,     // 1 second for large files
    dbOperations: 100,    // 100ms for single operations
    bulkInsert: 5000      // 5 seconds for bulk operations
  }
};

class PerformanceBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      system: this.getSystemInfo(),
      benchmarks: {}
    };
  }

  getSystemInfo() {
    const os = require('os');
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
      nodeVersion: process.version
    };
  }

  measureMemory() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    };
  }

  async benchmark(name, fn) {
    console.log(`🔍 Running benchmark: ${name}`);
    
    const memoryBefore = this.measureMemory();
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const endTime = performance.now();
      const memoryAfter = this.measureMemory();
      
      const benchmarkResult = {
        duration: Math.round(endTime - startTime),
        memoryBefore,
        memoryAfter,
        memoryDelta: {
          rss: memoryAfter.rss - memoryBefore.rss,
          heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed
        },
        success: true,
        result
      };
      
      this.results.benchmarks[name] = benchmarkResult;
      console.log(`✅ ${name}: ${benchmarkResult.duration}ms (${benchmarkResult.memoryDelta.heapUsed}MB heap)`);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const memoryAfter = this.measureMemory();
      
      this.results.benchmarks[name] = {
        duration: Math.round(endTime - startTime),
        memoryBefore,
        memoryAfter,
        success: false,
        error: error.message
      };
      
      console.log(`❌ ${name}: Failed - ${error.message}`);
      throw error;
    }
  }

  generateCSVData(episodeCount) {
    const headers = ['Episode ID', 'Podcast ID', 'Podcast Name', 'Episode Title', 'Published Date', 'Audio URL'];
    const rows = [headers.join(',')];
    
    for (let i = 1; i <= episodeCount; i++) {
      const row = [
        i,
        Math.floor(i / 100) + 1,
        `"Test Podcast ${Math.floor(i / 100) + 1}"`,
        `"Episode ${i} - Test Episode Title"`,
        new Date(Date.now() - i * 86400000).toISOString(),
        `"https://example.com/episode-${i}.mp3"`
      ];
      rows.push(row.join(','));
    }
    
    return rows.join('\n');
  }

  async benchmarkCSVParsing() {
    const Papa = require('papaparse');
    
    for (const [size, count] of Object.entries(BENCHMARK_CONFIG.csvParsingTests)) {
      await this.benchmark(`CSV Parsing - ${size} (${count} episodes)`, async () => {
        const csvData = this.generateCSVData(count);
        const result = Papa.parse(csvData, { 
          header: true, 
          skipEmptyLines: true,
          transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_')
        });
        
        return {
          rowCount: result.data.length,
          columnCount: result.meta.fields?.length || 0,
          errors: result.errors.length
        };
      });
    }
  }

  async benchmarkDatabaseOperations() {
    const Database = require('better-sqlite3');
    let sharedDb = null; // Shared database for all operations
    
    await this.benchmark('Database - Connection and Schema', async () => {
      sharedDb = new Database(':memory:');
      
      // Create schema
      sharedDb.exec(`
        CREATE TABLE episodes (
          id INTEGER PRIMARY KEY,
          episode_id INTEGER UNIQUE NOT NULL,
          podcast_id INTEGER NOT NULL,
          podcast_name TEXT NOT NULL,
          episode_title TEXT NOT NULL,
          published_date TEXT NOT NULL,
          audio_url TEXT NOT NULL,
          download_status TEXT DEFAULT 'pending',
          download_progress INTEGER DEFAULT 0,
          file_path TEXT,
          error_message TEXT,
          retry_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_episodes_status ON episodes(download_status);
        CREATE INDEX idx_episodes_podcast ON episodes(podcast_id);
      `);
      
      return { success: true };
    });

    await this.benchmark('Database - Single Insert', async () => {
      const stmt = sharedDb.prepare(`
        INSERT INTO episodes (episode_id, podcast_id, podcast_name, episode_title, published_date, audio_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(1, 1, 'Test Podcast', 'Test Episode', new Date().toISOString(), 'https://example.com/test.mp3');
      
      return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    });

    await this.benchmark('Database - Bulk Insert (1000 episodes)', async () => {
      const stmt = sharedDb.prepare(`
        INSERT INTO episodes (episode_id, podcast_id, podcast_name, episode_title, published_date, audio_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const transaction = sharedDb.transaction((episodes) => {
        for (const episode of episodes) {
          stmt.run(...episode);
        }
      });
      
      const episodes = [];
      for (let i = 2; i <= 1001; i++) { // Start from 2 to avoid conflict with single insert
        episodes.push([
          i,
          Math.floor(i / 100) + 1,
          `Test Podcast ${Math.floor(i / 100) + 1}`,
          `Episode ${i}`,
          new Date().toISOString(),
          `https://example.com/episode-${i}.mp3`
        ]);
      }
      
      transaction(episodes);
      
      return { episodeCount: episodes.length };
    });
    
    // Clean up
    if (sharedDb) {
      sharedDb.close();
    }
  }

  async run() {
    console.log('🚀 Starting Performance Benchmarks\n');
    console.log('System Information:');
    console.log(JSON.stringify(this.results.system, null, 2));
    console.log('\n');

    try {
      await this.benchmarkCSVParsing();
      console.log('');
      await this.benchmarkDatabaseOperations();
      console.log('');
      
      this.generateReport();
      this.saveResults();
      
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    }
  }

  generateReport() {
    console.log('📊 Performance Report\n');
    console.log('='.repeat(50));
    
    Object.entries(this.results.benchmarks).forEach(([name, result]) => {
      if (result.success) {
        console.log(`${name}:`);
        console.log(`  Duration: ${result.duration}ms`);
        console.log(`  Memory Delta: ${result.memoryDelta.heapUsed}MB heap`);
        console.log(`  Status: ✅ PASS`);
      } else {
        console.log(`${name}:`);
        console.log(`  Status: ❌ FAIL - ${result.error}`);
      }
      console.log('');
    });
    
    console.log('='.repeat(50));
    this.checkThresholds();
  }

  checkThresholds() {
    console.log('⚡ Performance Threshold Analysis\n');
    
    const csvLarge = this.results.benchmarks['CSV Parsing - largeFile (10000 episodes)'];
    if (csvLarge && csvLarge.success) {
      const threshold = BENCHMARK_CONFIG.performanceThresholds.csvParsing;
      const status = csvLarge.duration <= threshold ? '✅ PASS' : '⚠️  SLOW';
      console.log(`CSV Parsing (Large): ${csvLarge.duration}ms (threshold: ${threshold}ms) ${status}`);
    }
    
    const dbSingle = this.results.benchmarks['Database - Single Insert'];
    if (dbSingle && dbSingle.success) {
      const threshold = BENCHMARK_CONFIG.performanceThresholds.dbOperations;
      const status = dbSingle.duration <= threshold ? '✅ PASS' : '⚠️  SLOW';
      console.log(`Database Single Op: ${dbSingle.duration}ms (threshold: ${threshold}ms) ${status}`);
    }
    
    const dbBulk = this.results.benchmarks['Database - Bulk Insert (1000 episodes)'];
    if (dbBulk && dbBulk.success) {
      const threshold = BENCHMARK_CONFIG.performanceThresholds.bulkInsert;
      const status = dbBulk.duration <= threshold ? '✅ PASS' : '⚠️  SLOW';
      console.log(`Database Bulk Insert: ${dbBulk.duration}ms (threshold: ${threshold}ms) ${status}`);
    }
  }

  saveResults() {
    const resultsDir = path.join(__dirname, '..', 'benchmark-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const filename = `benchmark-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(resultsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`💾 Results saved to: ${filepath}`);
  }
}

// Run benchmarks if this script is executed directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.run().catch(console.error);
}

module.exports = PerformanceBenchmark;