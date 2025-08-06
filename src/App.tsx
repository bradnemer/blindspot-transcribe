import React, { useState, useEffect } from 'react';
import { Episode, EpisodesAPI, DownloadsAPI, DirectoriesAPI, apiClient } from './api';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { OverallProgressBar, calculateProgressStats } from './components/OverallProgressBar';
import './styles/App.css';

function App() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if API server is running
      await apiClient.get('/health');
      
      // Ensure directories exist
      await DirectoriesAPI.ensureDirectoriesExist();
      
      // Load episodes
      await loadEpisodes();
      
    } catch (err) {
      setError(`Failed to initialize application: ${err}. Make sure the API server is running on port 3001.`);
      console.error('App initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEpisodes = async () => {
    try {
      const allEpisodes = await EpisodesAPI.getAllEpisodes();
      setEpisodes(allEpisodes);
    } catch (err) {
      console.error('Failed to load episodes:', err);
      setError('Failed to load episodes');
    }
  };

  const handleImportComplete = () => {
    // Reload episodes after successful import
    loadEpisodes();
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  const downloadEpisode = async (episodeId: number) => {
    try {
      setLoading(true);
      const result = await DownloadsAPI.startDownloads([episodeId]);
      console.log('Download started:', result);
      
      // Refresh episodes to show updated status
      setTimeout(() => {
        loadEpisodes();
      }, 1000);
      
    } catch (error) {
      handleError(`Failed to start download: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadAllEpisodes = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/downloads/start-all');
      console.log('All downloads started:', response.data);
      
      if (response.data.message) {
        toast.success(response.data.message);
      }
      
      // Refresh episodes to show updated status
      setTimeout(() => {
        loadEpisodes();
      }, 1000);
      
    } catch (error) {
      handleError(`Failed to start all downloads: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearAllEpisodes = async () => {
    const confirmMessage = `Are you sure you want to clear ALL episodes?\n\nThis will:\n• Delete all ${episodes.length} episodes from the database\n• Remove all downloaded audio files\n• This action cannot be undone`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      const result = await EpisodesAPI.clearAllEpisodes();
      
      if (result.success) {
        setEpisodes([]);
        toast.success(result.message);
        console.log('✅ All episodes cleared:', result);
      } else {
        handleError('Failed to clear episodes');
      }
    } catch (error) {
      handleError(`Failed to clear episodes: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const syncDownloads = async () => {
    try {
      setLoading(true);
      const result = await DownloadsAPI.syncDownloads();
      
      if (result.success && result.syncedCount > 0) {
        console.log('✅ Sync result:', result);
        // Refresh episodes to show updated status
        await loadEpisodes();
        toast.success(result.message);
      } else {
        console.log('ℹ️ Sync result:', result);
      }
    } catch (error) {
      handleError(`Failed to sync downloads: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh episodes every 3 seconds to update download progress
  // Also sync downloads periodically to catch completed downloads
  useEffect(() => {
    const interval = setInterval(async () => {
      const hasDownloading = episodes.some(ep => ep.download_status === 'downloading');
      
      if (hasDownloading) {
        // If downloads are active, refresh frequently and sync
        await loadEpisodes();
        
        // Every 6th refresh (18 seconds), also sync with filesystem
        if (Math.random() < 0.16) { // ~1/6 chance
          try {
            await DownloadsAPI.syncDownloads();
          } catch (error) {
            console.log('Background sync error:', error);
          }
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [episodes]);

  if (loading) {
    return (
      <div className="app loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing Podcast Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎙️ Podcast Episode Manager</h1>
        <p>Download and manage podcast episodes</p>
      </header>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button 
            className="error-close"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      <main className="app-main">
        <div className="episodes-tab">
          <div className="tab-header">
            <h2>Episodes</h2>
            <div className="header-actions">
              <button onClick={loadEpisodes} className="btn btn-secondary">
                🔄 Refresh
              </button>
              <label className="btn btn-primary" style={{ marginLeft: '10px', cursor: 'pointer' }}>
                📄 Upload CSV
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const result = await EpisodesAPI.importCSV(file);
                        if (result.success) {
                          handleImportComplete();
                          toast.success(`Successfully imported ${result.imported} episodes!`);
                        } else {
                          handleError(result.message);
                        }
                      } catch (error) {
                        handleError(`Failed to import CSV: ${error}`);
                      }
                    }
                    // Reset the input value so the same file can be uploaded again
                    e.target.value = '';
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              {episodes.length > 0 && (
                <>
                  <button 
                    onClick={downloadAllEpisodes}
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    📥 Download All
                  </button>
                  <button 
                    onClick={clearAllEpisodes}
                    className="btn btn-danger"
                    disabled={loading}
                    style={{ marginLeft: '10px' }}
                  >
                    🗑️ Clear All
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const result = await DownloadsAPI.cancelAllRetries();
                        toast.info(result.message);
                        setTimeout(loadEpisodes, 1000);
                      } catch (error) {
                        handleError(`Failed to cancel retries: ${error}`);
                      }
                    }}
                    className="btn btn-secondary"
                    disabled={loading}
                    style={{ marginLeft: '10px' }}
                  >
                    ⏹️ Cancel Retries
                  </button>
                </>
              )}
              <button 
                onClick={() => toast.info('Settings management features coming soon...')}
                className="btn btn-secondary"
                style={{ marginLeft: '10px' }}
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
          
          {episodes.length === 0 ? (
            <div className="empty-state">
              <h3>No episodes found</h3>
              <p>Use the "📄 Upload CSV" button above to import episodes and get started</p>
            </div>
          ) : (
            <>
              <OverallProgressBar 
                stats={calculateProgressStats(episodes)} 
                className="episodes-progress-bar"
              />
              
              <div className="episodes-list">
                {episodes.map((episode) => (
                  <div key={episode.id} className="episode-card">
                    <div className="episode-header">
                      <h4>{episode.episode_title}</h4>
                      <div className="episode-header-right">
                        <span className={`status-badge status-${episode.download_status}`}>
                          {episode.download_status}
                          {episode.download_status === 'downloading' && episode.download_progress && (
                            <span className="progress-text"> ({episode.download_progress}%)</span>
                          )}
                        </span>
                        {episode.download_status === 'pending' && (
                          <button 
                            onClick={() => downloadEpisode(episode.id)}
                            className="btn btn-sm btn-primary"
                            disabled={loading}
                          >
                            📥 Download
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="episode-meta">
                      <span className="podcast-name">{episode.podcast_name}</span>
                      <span className="published-date">
                        {new Date(episode.published_date).toLocaleDateString()}
                      </span>
                    </div>
                    {episode.download_progress > 0 && episode.download_status === 'downloading' && (
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${episode.download_progress}%` }}
                        ></div>
                      </div>
                    )}
                    <div className="episode-actions">
                      {episode.audio_url && (
                        <a 
                          href={episode.audio_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-secondary"
                        >
                          🔗 Audio URL
                        </a>
                      )}
                      {episode.file_path && (
                        <span className="file-info">
                          📁 Downloaded to: {episode.file_path}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}

export default App;