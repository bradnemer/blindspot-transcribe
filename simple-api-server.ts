import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import Papa from 'papaparse';
import axios from 'axios';
import { transcriptionService } from './src/services/transcriptionService';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Initialize database
const dbPath = './podcast-manager.db';
const db = new Database(dbPath);

// Enable WAL mode
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS episodes (
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
    transcription_status TEXT DEFAULT 'none' CHECK (transcription_status IN ('none', 'queued', 'transcribing', 'completed', 'failed')),
    transcription_path TEXT,
    transcription_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(download_status);
  CREATE INDEX IF NOT EXISTS idx_episodes_podcast ON episodes(podcast_id);
  CREATE INDEX IF NOT EXISTS idx_episodes_transcription_status ON episodes(transcription_status);
  
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Insert default settings
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
insertSetting.run('download_directory', '/Users/brad/blindspot-files');
insertSetting.run('max_concurrent_downloads', '3');
insertSetting.run('retry_attempts', '3');
insertSetting.run('retry_delay_seconds', '30');

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 'http://127.0.0.1:5173', 
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://192.168.1.96:3000', 'http://192.168.1.96:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Episodes endpoints
app.get('/api/episodes', (req, res) => {
  try {
    const episodes = db.prepare('SELECT * FROM episodes ORDER BY created_at DESC').all();
    res.json(episodes);
  } catch (error) {
    console.error('Error fetching episodes:', error);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
});

app.get('/api/episodes/:id', (req, res) => {
  try {
    const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(req.params.id);
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    res.json(episode);
  } catch (error) {
    console.error('Error fetching episode:', error);
    res.status(500).json({ error: 'Failed to fetch episode' });
  }
});

app.put('/api/episodes/:id', (req, res) => {
  try {
    const updates = req.body;
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    const stmt = db.prepare(`UPDATE episodes SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    const result = stmt.run(...values, req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating episode:', error);
    res.status(500).json({ error: 'Failed to update episode' });
  }
});

app.delete('/api/episodes/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM episodes WHERE id = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting episode:', error);
    res.status(500).json({ error: 'Failed to delete episode' });
  }
});

app.delete('/api/episodes', (req, res) => {
  try {
    console.log('🗑️  Clearing all episodes from database...');
    
    // Get all episodes to clean up downloaded files
    const episodes = db.prepare('SELECT * FROM episodes WHERE file_path IS NOT NULL').all();
    
    // Clean up downloaded files
    const downloadDir = '/Users/brad/blindspot-files';
    let filesDeleted = 0;
    
    for (const episode of episodes) {
      if (episode.file_path && fs.existsSync(episode.file_path)) {
        try {
          fs.unlinkSync(episode.file_path);
          filesDeleted++;
        } catch (fileError) {
          console.warn(`⚠️  Could not delete file: ${episode.file_path}`, fileError);
        }
      }
    }
    
    // Delete all episodes from database
    const stmt = db.prepare('DELETE FROM episodes');
    const result = stmt.run();
    
    console.log(`✅ Cleared ${result.changes} episodes from database`);
    console.log(`🗑️  Deleted ${filesDeleted} downloaded files`);
    
    res.json({ 
      success: true, 
      deletedEpisodes: result.changes,
      deletedFiles: filesDeleted,
      message: `Cleared ${result.changes} episodes and deleted ${filesDeleted} files`
    });
  } catch (error) {
    console.error('Error clearing episodes:', error);
    res.status(500).json({ error: 'Failed to clear episodes' });
  }
});

// CSV upload endpoint
app.post('/api/upload-csv', upload.single('csvFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the uploaded file
    const filePath = req.file.path;
    const csvContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_')
    });

    if (parseResult.errors.length > 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: 'CSV parsing failed', 
        details: parseResult.errors 
      });
    }

    const episodes = parseResult.data;
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    // Prepare statements
    const insertStmt = db.prepare(`
      INSERT INTO episodes (episode_id, podcast_id, podcast_name, episode_title, published_date, audio_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const checkStmt = db.prepare('SELECT id FROM episodes WHERE episode_id = ?');

    // Process episodes
    for (const episode of episodes) {
      try {
        // Check if episode already exists
        const existing = checkStmt.get(episode.episode_id);
        
        if (existing) {
          duplicates++;
          continue;
        }

        // Insert new episode
        insertStmt.run(
          episode.episode_id,
          episode.podcast_id,
          episode.podcast_name,
          episode.episode_title,
          episode.published_date,
          episode.audio_url
        );
        imported++;
      } catch (err) {
        console.error('Error importing episode:', err);
        errors++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      imported,
      duplicates,
      errors,
      message: `Successfully imported ${imported} episodes. ${duplicates} duplicates skipped. ${errors} errors occurred.`
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Failed to import CSV: ' + error.message });
  }
});

// Enhanced download manager with retry functionality
class SimpleDownloadManager {
  private activeDownloads = new Map();
  private downloadQueue = [];
  private maxConcurrent = 3;
  private retryTimeouts = new Map();
  private retryConfig = {
    maxAttempts: 3,
    baseDelay: 5000, // 5 seconds
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
    jitter: true,
  };

  // Check if an episode should be retried
  shouldRetry(episode) {
    return (episode.retry_count || 0) < this.retryConfig.maxAttempts;
  }

  // Calculate delay for next retry attempt with exponential backoff
  calculateRetryDelay(attemptNumber) {
    let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attemptNumber - 1);
    
    // Cap at maximum delay
    delay = Math.min(delay, this.retryConfig.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.retryConfig.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.max(delay, 1000); // Minimum 1 second delay
  }

  // Schedule a retry for a failed episode
  scheduleRetry(episode, error) {
    if (!this.shouldRetry(episode)) {
      console.log(`❌ Max retry attempts (${this.retryConfig.maxAttempts}) reached for episode ${episode.episode_id}`);
      // Mark as permanently failed
      const finalFailStmt = db.prepare('UPDATE episodes SET download_status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      finalFailStmt.run('failed', `Max retries exceeded: ${error}`, episode.id);
      return;
    }

    const nextAttempt = (episode.retry_count || 0) + 1;
    const delay = this.calculateRetryDelay(nextAttempt);
    
    // Update episode with retry information
    const retryUpdateStmt = db.prepare('UPDATE episodes SET download_status = ?, retry_count = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    retryUpdateStmt.run('pending', nextAttempt, `Retry ${nextAttempt}/${this.retryConfig.maxAttempts}: ${error}`, episode.id);

    console.log(`🔄 Scheduling retry ${nextAttempt}/${this.retryConfig.maxAttempts} for episode ${episode.episode_id} in ${Math.round(delay / 1000)}s`);

    // Clear any existing timeout
    if (this.retryTimeouts.has(episode.episode_id)) {
      clearTimeout(this.retryTimeouts.get(episode.episode_id));
    }

    // Schedule the retry
    const timeout = setTimeout(async () => {
      try {
        console.log(`🔄 Retrying download for episode ${episode.episode_id} (attempt ${nextAttempt})`);
        
        // Get updated episode data
        const updatedEpisode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episode.id);
        if (updatedEpisode) {
          await this.downloadEpisode(updatedEpisode);
        }
      } catch (retryError) {
        console.error(`💥 Retry failed for episode ${episode.episode_id}:`, retryError);
        // Schedule another retry if possible
        this.scheduleRetry(episode, `Retry failed: ${retryError.message}`);
      } finally {
        this.retryTimeouts.delete(episode.episode_id);
      }
    }, delay);

    this.retryTimeouts.set(episode.episode_id, timeout);
  }

  // Cancel a scheduled retry
  cancelRetry(episodeId) {
    const timeout = this.retryTimeouts.get(episodeId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(episodeId);
      return true;
    }
    return false;
  }

  // Cancel all scheduled retries
  cancelAllRetries() {
    for (const [episodeId, timeout] of this.retryTimeouts) {
      clearTimeout(timeout);
      console.log(`Cancelled retry for episode ${episodeId}`);
    }
    this.retryTimeouts.clear();
  }

  async downloadEpisode(episode) {
    const downloadDir = '/Users/brad/blindspot-files';
    
    // Ensure download directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    try {
      
      // Update status to downloading
      const updateStmt = db.prepare('UPDATE episodes SET download_status = ?, download_progress = ? WHERE id = ?');
      updateStmt.run('downloading', 0, episode.id);

      // Create filename with new format: p{PodcastID}-e{EpisodeID}-{Date}.mp3
      const filename = `p${episode.podcast_id}-e${episode.episode_id}-${episode.published_date.slice(0, 10)}.mp3`;
      const filePath = path.join(downloadDir, filename);

      // Download the file
      const response = await axios({
        method: 'GET',
        url: episode.audio_url,
        responseType: 'stream',
        timeout: 30000,
        onDownloadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded || 0;
          const total = progressEvent.total || 0;
          const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
          
          // Update progress in database
          updateStmt.run('downloading', percentage, episode.id);
        }
      });

      // Save to file
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', async () => {
          try {
            // Verify file was written successfully
            const stats = fs.statSync(filePath);
            if (stats.size > 0) {
              // Update status to downloaded with file info
              const finalUpdateStmt = db.prepare('UPDATE episodes SET download_status = ?, download_progress = ?, file_path = ?, transcription_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
              finalUpdateStmt.run('downloaded', 100, filePath, 'queued', episode.id);
              
              console.log(`✅ Downloaded: ${filename} (${Math.round(stats.size / 1024 / 1024)}MB)`);
              
              // Queue transcription automatically
              try {
                await transcriptionService.queueTranscription(filePath);
              } catch (transcriptionError) {
                console.error('Failed to queue transcription:', transcriptionError);
              }
              
              resolve({ success: true, filePath, fileSize: stats.size });
            } else {
              throw new Error('Downloaded file is empty');
            }
          } catch (error) {
            console.error(`❌ Download verification failed: ${filename}`, error);
            
            // Schedule retry for verification failure
            this.scheduleRetry(episode, `File verification failed: ${error.message}`);
            reject(error);
          }
        });

        writer.on('error', (error) => {
          console.error(`❌ Download failed: ${filename}`, error);
          
          // Schedule retry instead of immediate failure
          this.scheduleRetry(episode, error.message);
          reject(error);
        });
      });

    } catch (error) {
      console.error(`❌ Download error for episode ${episode.episode_id}:`, error);
      
      // Schedule retry instead of immediate failure
      this.scheduleRetry(episode, error.message);
      throw error;
    }
  }

  async startDownloads(episodeIds) {
    const results = [];
    
    for (const episodeId of episodeIds) {
      try {
        const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episodeId);
        if (!episode) {
          results.push({ episodeId, status: 'not_found' });
          continue;
        }

        if (episode.download_status === 'downloaded' || episode.download_status === 'downloading') {
          results.push({ episodeId, status: 'already_processed' });
          continue;
        }

        // Start download (don't await - run in background)
        this.downloadEpisode(episode).catch(error => {
          console.error(`Background download failed for episode ${episodeId}:`, error);
        });

        results.push({ episodeId, status: 'queued' });
      } catch (error) {
        results.push({ episodeId, status: 'error', error: error.message });
      }
    }

    return results;
  }

  getDownloadStatus() {
    const episodes = db.prepare('SELECT download_status, retry_count FROM episodes').all();
    
    const statusCounts = episodes.reduce((acc, ep) => {
      acc[ep.download_status] = (acc[ep.download_status] || 0) + 1;
      return acc;
    }, {});

    // Count episodes with retries scheduled
    const scheduledRetries = this.retryTimeouts.size;
    
    // Count episodes that have been retried
    const retriedEpisodes = episodes.filter(ep => (ep.retry_count || 0) > 0).length;

    return {
      active: statusCounts.downloading || 0,
      queued: statusCounts.pending || 0,
      completed: statusCounts.downloaded || 0,
      failed: statusCounts.failed || 0,
      scheduledRetries,
      retriedEpisodes,
      totalBytes: 0,
      downloadedBytes: 0,
      currentDownloads: []
    };
  }

  // Get retry statistics
  getRetryStats() {
    const episodes = db.prepare('SELECT retry_count, download_status, error_message FROM episodes WHERE retry_count > 0').all();
    
    return {
      scheduledRetries: this.retryTimeouts.size,
      failedEpisodes: episodes.filter(ep => ep.download_status === 'failed').length,
      retriedEpisodes: episodes.length,
      maxRetryAttempts: this.retryConfig.maxAttempts,
      averageRetryCount: episodes.length > 0 ? 
        Math.round((episodes.reduce((sum, ep) => sum + (ep.retry_count || 0), 0) / episodes.length) * 100) / 100 : 0,
      retryConfig: this.retryConfig
    };
  }
}

const downloadManager = new SimpleDownloadManager();

// Download management endpoints
app.post('/api/downloads/start', async (req, res) => {
  try {
    const { episodeIds } = req.body;
    if (!Array.isArray(episodeIds)) {
      return res.status(400).json({ error: 'episodeIds must be an array' });
    }
    
    const results = await downloadManager.startDownloads(episodeIds);
    res.json({ results });
  } catch (error) {
    console.error('Error starting downloads:', error);
    res.status(500).json({ error: 'Failed to start downloads' });
  }
});

app.post('/api/downloads/start-all', async (req, res) => {
  try {
    // Get all pending episodes
    const pendingEpisodes = db.prepare('SELECT id FROM episodes WHERE download_status = ?').all('pending');
    const episodeIds = pendingEpisodes.map(ep => ep.id);
    
    if (episodeIds.length === 0) {
      return res.json({ results: [], message: 'No pending episodes to download' });
    }
    
    const results = await downloadManager.startDownloads(episodeIds);
    res.json({ results, message: `Started downloads for ${episodeIds.length} episodes` });
  } catch (error) {
    console.error('Error starting all downloads:', error);
    res.status(500).json({ error: 'Failed to start all downloads' });
  }
});

app.post('/api/downloads/stop', (req, res) => {
  try {
    const { episodeIds } = req.body;
    const results = episodeIds.map(id => ({ episodeId: id, status: 'stopped' }));
    res.json({ results });
  } catch (error) {
    console.error('Error stopping downloads:', error);
    res.status(500).json({ error: 'Failed to stop downloads' });
  }
});

app.get('/api/downloads/status', (req, res) => {
  try {
    const status = downloadManager.getDownloadStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting download status:', error);
    res.status(500).json({ error: 'Failed to get download status' });
  }
});

app.post('/api/downloads/sync', async (req, res) => {
  try {
    console.log('🔄 Syncing database with downloaded files...');
    
    const downloadDir = '/Users/brad/blindspot-files';
    let syncedCount = 0;
    
    if (!fs.existsSync(downloadDir)) {
      return res.json({ success: true, syncedCount: 0, message: 'Download directory does not exist' });
    }
    
    // Get all episodes that are marked as downloading but might be complete
    const episodes = db.prepare('SELECT * FROM episodes WHERE download_status IN (?, ?)').all('downloading', 'pending');
    
    for (const episode of episodes) {
      // Check if file exists for this episode with new format
      const expectedFilename = `p${episode.podcast_id}-e${episode.episode_id}-${episode.published_date.slice(0, 10)}.mp3`;
      const expectedPath = path.join(downloadDir, expectedFilename);
      
      if (fs.existsSync(expectedPath)) {
        const stats = fs.statSync(expectedPath);
        if (stats.size > 0) {
          // Update status to downloaded and reset retry count
          const updateStmt = db.prepare('UPDATE episodes SET download_status = ?, download_progress = ?, file_path = ?, transcription_status = ?, retry_count = 0, error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
          updateStmt.run('downloaded', 100, expectedPath, 'queued', episode.id);
          
          // Cancel any scheduled retry for this episode
          downloadManager.cancelRetry(episode.episode_id);
          
          // Queue transcription for synced file
          try {
            await transcriptionService.queueTranscription(expectedPath);
          } catch (transcriptionError) {
            console.error('Failed to queue transcription for synced file:', transcriptionError);
          }
          
          syncedCount++;
        }
      }
    }
    
    console.log(`✅ Synced ${syncedCount} completed downloads`);
    
    res.json({ 
      success: true, 
      syncedCount,
      message: `Synced ${syncedCount} completed downloads`
    });
  } catch (error) {
    console.error('Error syncing downloads:', error);
    res.status(500).json({ error: 'Failed to sync downloads' });
  }
});

// Retry management endpoints
app.get('/api/downloads/retry-stats', (req, res) => {
  try {
    const stats = downloadManager.getRetryStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting retry stats:', error);
    res.status(500).json({ error: 'Failed to get retry stats' });
  }
});

app.post('/api/downloads/retry/:id', async (req, res) => {
  try {
    const episodeId = parseInt(req.params.id);
    const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episodeId);
    
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    
    // Cancel any existing retry
    downloadManager.cancelRetry(episode.episode_id);
    
    // Reset status and start immediate retry
    const resetStmt = db.prepare('UPDATE episodes SET download_status = ?, error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    resetStmt.run('pending', episodeId);
    
    // Start download immediately
    downloadManager.downloadEpisode(episode).catch(error => {
      console.error(`Manual retry failed for episode ${episode.episode_id}:`, error);
    });
    
    res.json({ success: true, message: `Manual retry started for episode ${episode.episode_id}` });
  } catch (error) {
    console.error('Error retrying episode:', error);
    res.status(500).json({ error: 'Failed to retry episode' });
  }
});

app.post('/api/downloads/cancel-retries', (req, res) => {
  try {
    downloadManager.cancelAllRetries();
    res.json({ success: true, message: 'All scheduled retries cancelled' });
  } catch (error) {
    console.error('Error cancelling retries:', error);
    res.status(500).json({ error: 'Failed to cancel retries' });
  }
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    
    for (const [key, value] of Object.entries(req.body)) {
      stmt.run(key, value);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Directory management endpoints (basic stubs)
app.post('/api/directories/ensure', (req, res) => {
  try {
    // Create basic directory structure
    const downloadDir = '/Users/brad/blindspot-files';
    const doneDir = path.join(downloadDir, 'done');
    
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    if (!fs.existsSync(doneDir)) {
      fs.mkdirSync(doneDir, { recursive: true });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error ensuring directories:', error);
    res.status(500).json({ error: 'Failed to ensure directories exist' });
  }
});

app.get('/api/directories/info', (req, res) => {
  try {
    const downloadDir = '/Users/brad/blindspot-files';
    const doneDir = path.join(downloadDir, 'done');
    
    const info = {
      downloadDirectory: downloadDir,
      doneDirectory: doneDir,
      exists: {
        download: fs.existsSync(downloadDir),
        done: fs.existsSync(doneDir)
      },
      permissions: {
        download: true, // Simplified for now
        done: true
      },
      diskSpace: {
        total: 0,
        free: 0,
        used: 0
      }
    };
    
    res.json(info);
  } catch (error) {
    console.error('Error getting directory info:', error);
    res.status(500).json({ error: 'Failed to get directory info' });
  }
});

// Transcription endpoints
app.get('/api/transcription/status', async (req, res) => {
  try {
    const isAvailable = await transcriptionService.isWhisperXAvailable();
    const queueStatus = transcriptionService.getQueueStatus();
    const config = transcriptionService.getConfig();
    
    res.json({
      whisperxAvailable: isAvailable,
      ...queueStatus,
      configuration: config
    });
  } catch (error) {
    console.error('Error getting transcription status:', error);
    res.status(500).json({ error: 'Failed to get transcription status' });
  }
});

app.post('/api/transcription/queue', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }
    
    await transcriptionService.queueTranscription(filePath);
    res.json({ success: true, message: 'File queued for transcription' });
  } catch (error) {
    console.error('Error queueing transcription:', error);
    res.status(500).json({ error: 'Failed to queue transcription' });
  }
});

app.post('/api/transcription/config', (req, res) => {
  try {
    const newConfig = req.body;
    transcriptionService.updateConfig(newConfig);
    res.json({ success: true, config: transcriptionService.getConfig() });
  } catch (error) {
    console.error('Error updating transcription config:', error);
    res.status(500).json({ error: 'Failed to update transcription config' });
  }
});

app.get('/api/transcription/download/:id', async (req, res) => {
  try {
    const episodeId = parseInt(req.params.id);
    const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episodeId);
    
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    
    if (!episode.transcription_path || !fs.existsSync(episode.transcription_path)) {
      return res.status(404).json({ error: 'Transcription file not found' });
    }
    
    res.download(episode.transcription_path);
  } catch (error) {
    console.error('Error downloading transcription:', error);
    res.status(500).json({ error: 'Failed to download transcription' });
  }
});

// Get transcription progress
app.get('/api/transcription/progress', (req, res) => {
  try {
    const progress = transcriptionService.getProgress();
    res.json(progress);
  } catch (error) {
    console.error('Error getting transcription progress:', error);
    res.status(500).json({ error: 'Failed to get transcription progress' });
  }
});

// Pause transcription
app.post('/api/transcription/pause', (req, res) => {
  try {
    const result = transcriptionService.pauseTranscription();
    res.json(result);
  } catch (error) {
    console.error('Error pausing transcription:', error);
    res.status(500).json({ error: 'Failed to pause transcription' });
  }
});

// Resume transcription
app.post('/api/transcription/resume', (req, res) => {
  try {
    const result = transcriptionService.resumeTranscription();
    res.json(result);
  } catch (error) {
    console.error('Error resuming transcription:', error);
    res.status(500).json({ error: 'Failed to resume transcription' });
  }
});

// Stop transcription
app.post('/api/transcription/stop', (req, res) => {
  try {
    const result = transcriptionService.stopTranscription();
    res.json(result);
  } catch (error) {
    console.error('Error stopping transcription:', error);
    res.status(500).json({ error: 'Failed to stop transcription' });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 Network API available at http://192.168.1.96:${PORT}/api`);
});

export default app;