import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import our existing services
import { DatabaseConnection } from './src/database/connection';
import { EpisodesDAL } from './src/database/dal/episodes';
import { CSVImporter } from './src/services/csvImporter';
import { DirectoryManager } from './src/services/directoryManager';
import { DownloadManager } from './src/services/downloader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Initialize services
let db: any;
let episodesDAL: EpisodesDAL;
let csvImporter: CSVImporter;
let directoryManager: DirectoryManager;
let downloadManager: DownloadManager;

// Initialize database and services
async function initializeServices() {
  try {
    // Initialize database
    db = DatabaseConnection.getInstance();
    
    // Initialize DAL
    episodesDAL = EpisodesDAL.getInstance();
    
    // Initialize services
    csvImporter = new CSVImporter();
    directoryManager = new DirectoryManager();
    downloadManager = new DownloadManager();
    
    console.log('✅ Services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
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
app.get('/api/episodes', async (req, res) => {
  try {
    const episodes = await episodesDAL.getAllEpisodes();
    res.json(episodes);
  } catch (error) {
    console.error('Error fetching episodes:', error);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
});

app.get('/api/episodes/:id', async (req, res) => {
  try {
    const episode = await episodesDAL.getEpisodeById(parseInt(req.params.id));
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    res.json(episode);
  } catch (error) {
    console.error('Error fetching episode:', error);
    res.status(500).json({ error: 'Failed to fetch episode' });
  }
});

app.put('/api/episodes/:id', async (req, res) => {
  try {
    const success = await episodesDAL.updateEpisode(parseInt(req.params.id), req.body);
    if (!success) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating episode:', error);
    res.status(500).json({ error: 'Failed to update episode' });
  }
});

app.delete('/api/episodes/:id', async (req, res) => {
  try {
    const success = await episodesDAL.deleteEpisode(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting episode:', error);
    res.status(500).json({ error: 'Failed to delete episode' });
  }
});

// CSV upload endpoint
app.post('/api/upload-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the uploaded file
    const filePath = req.file.path;
    const csvContent = fs.readFileSync(filePath, 'utf8');
    
    // Import the CSV
    const result = await csvImporter.importCSV(csvContent);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json(result);
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Failed to import CSV: ' + error.message });
  }
});

// Download management endpoints
app.post('/api/downloads/start', async (req, res) => {
  try {
    const { episodeIds } = req.body;
    if (!Array.isArray(episodeIds)) {
      return res.status(400).json({ error: 'episodeIds must be an array' });
    }
    
    const results = [];
    for (const episodeId of episodeIds) {
      const episode = await episodesDAL.getEpisodeById(episodeId);
      if (episode) {
        downloadManager.queueDownload(episode);
        results.push({ episodeId, status: 'queued' });
      } else {
        results.push({ episodeId, status: 'not_found' });
      }
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Error starting downloads:', error);
    res.status(500).json({ error: 'Failed to start downloads' });
  }
});

app.post('/api/downloads/stop', async (req, res) => {
  try {
    const { episodeIds } = req.body;
    if (!Array.isArray(episodeIds)) {
      return res.status(400).json({ error: 'episodeIds must be an array' });
    }
    
    const results = [];
    for (const episodeId of episodeIds) {
      const stopped = downloadManager.stopDownload(episodeId);
      results.push({ episodeId, status: stopped ? 'stopped' : 'not_found' });
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Error stopping downloads:', error);
    res.status(500).json({ error: 'Failed to stop downloads' });
  }
});

app.get('/api/downloads/status', async (req, res) => {
  try {
    const status = downloadManager.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting download status:', error);
    res.status(500).json({ error: 'Failed to get download status' });
  }
});

// Settings endpoints
app.get('/api/settings', async (req, res) => {
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

app.put('/api/settings', async (req, res) => {
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

// Directory management endpoints
app.post('/api/directories/ensure', async (req, res) => {
  try {
    await directoryManager.ensureDirectoriesExist();
    res.json({ success: true });
  } catch (error) {
    console.error('Error ensuring directories:', error);
    res.status(500).json({ error: 'Failed to ensure directories exist' });
  }
});

app.get('/api/directories/info', async (req, res) => {
  try {
    const info = await directoryManager.getDirectoryInfo();
    res.json(info);
  } catch (error) {
    console.error('Error getting directory info:', error);
    res.status(500).json({ error: 'Failed to get directory info' });
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
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}

startServer().catch(console.error);

export default app;