import React, { useState, useEffect } from 'react';
import { Episode, EpisodesAPI, DownloadsAPI, DirectoriesAPI, apiClient } from './api';
import type { RetryStats } from './api/downloads';
import './styles/App.css';

type TabType = 'episodes' | 'upload' | 'downloads' | 'settings';

// Downloads Tab Component
const DownloadsTab: React.FC<{
  episodes: Episode[];
  onRefresh: () => void;
  onError: (message: string) => void;
}> = ({ episodes, onRefresh, onError }) => {
  const [downloadStatus, setDownloadStatus] = useState<any>(null);
  const [retryStats, setRetryStats] = useState<RetryStats | null>(null);
  
  const loadDownloadStatus = async () => {
    try {
      const [status, retryStatsData] = await Promise.all([
        DownloadsAPI.getDownloadStatus(),
        DownloadsAPI.getRetryStats()
      ]);
      setDownloadStatus(status);
      setRetryStats(retryStatsData);
    } catch (error) {
      console.error('Failed to load download status:', error);
    }
  };

  useEffect(() => {
    loadDownloadStatus();
    const interval = setInterval(loadDownloadStatus, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const downloadingEpisodes = episodes.filter(ep => ep.download_status === 'downloading');
  const downloadedEpisodes = episodes.filter(ep => ep.download_status === 'downloaded');
  const failedEpisodes = episodes.filter(ep => ep.download_status === 'failed');

  return (
    <div className="downloads-tab">
      <div className="tab-header">
        <h2>Download Manager</h2>
        <div className="header-actions">
          <button onClick={onRefresh} className="btn btn-secondary">
            🔄 Refresh
          </button>
          <button 
            onClick={async () => {
              try {
                const result = await DownloadsAPI.syncDownloads();
                if (result.syncedCount > 0) {
                  onRefresh();
                  alert(result.message);
                } else {
                  alert('All downloads are already synced');
                }
              } catch (error) {
                onError(`Failed to sync: ${error}`);
              }
            }} 
            className="btn btn-primary"
          >
            🔄 Sync Status
          </button>
          <button 
            onClick={async () => {
              try {
                const result = await DownloadsAPI.cancelAllRetries();
                alert(result.message);
                loadDownloadStatus();
              } catch (error) {
                onError(`Failed to cancel retries: ${error}`);
              }
            }} 
            className="btn btn-secondary"
          >
            ⏹️ Cancel Retries
          </button>
        </div>
      </div>

      {downloadStatus && (
        <div className="download-overview">
          <div className="status-cards">
            <div className="status-card">
              <span className="status-number">{downloadStatus.active}</span>
              <span className="status-label">Active Downloads</span>
            </div>
            <div className="status-card">
              <span className="status-number">{downloadStatus.queued}</span>
              <span className="status-label">Queued</span>
            </div>
            <div className="status-card">
              <span className="status-number">{downloadStatus.completed}</span>
              <span className="status-label">Completed</span>
            </div>
            <div className="status-card">
              <span className="status-number">{downloadStatus.failed}</span>
              <span className="status-label">Failed</span>
            </div>
            <div className="status-card">
              <span className="status-number">{downloadStatus.scheduledRetries || 0}</span>
              <span className="status-label">Scheduled Retries</span>
            </div>
            <div className="status-card">
              <span className="status-number">{downloadStatus.retriedEpisodes || 0}</span>
              <span className="status-label">Episodes Retried</span>
            </div>
          </div>
        </div>
      )}

      {retryStats && (retryStats.scheduledRetries > 0 || retryStats.retriedEpisodes > 0) && (
        <div className="retry-overview">
          <h3>Retry Information</h3>
          <div className="retry-config">
            <p><strong>Max Retry Attempts:</strong> {retryStats.maxRetryAttempts}</p>
            <p><strong>Currently Scheduled:</strong> {retryStats.scheduledRetries}</p>
            <p><strong>Episodes Retried:</strong> {retryStats.retriedEpisodes}</p>
            <p><strong>Average Retry Count:</strong> {retryStats.averageRetryCount}</p>
            <p><strong>Base Delay:</strong> {Math.round(retryStats.retryConfig.baseDelay / 1000)}s (exponential backoff)</p>
          </div>
        </div>
      )}

      {downloadingEpisodes.length > 0 && (
        <div className="downloading-section">
          <h3>Currently Downloading</h3>
          <div className="downloading-list">
            {downloadingEpisodes.map(episode => (
              <div key={episode.id} className="download-item">
                <div className="download-info">
                  <strong>{episode.episode_title}</strong>
                  <span className="podcast-name">{episode.podcast_name}</span>
                </div>
                <div className="download-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${episode.download_progress || 0}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{episode.download_progress || 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {downloadedEpisodes.length > 0 && (
        <div className="completed-section">
          <h3>Completed Downloads ({downloadedEpisodes.length})</h3>
          <div className="completed-list">
            {downloadedEpisodes.slice(0, 10).map(episode => (
              <div key={episode.id} className="completed-item">
                <div className="episode-info">
                  <strong>{episode.episode_title}</strong>
                  <span className="podcast-name">{episode.podcast_name}</span>
                  {episode.file_path && (
                    <span className="file-path">📁 {episode.file_path}</span>
                  )}
                </div>
                <span className="status-badge status-downloaded">✅ Downloaded</span>
              </div>
            ))}
            {downloadedEpisodes.length > 10 && (
              <p>... and {downloadedEpisodes.length - 10} more completed downloads</p>
            )}
          </div>
        </div>
      )}

      {failedEpisodes.length > 0 && (
        <div className="failed-section">
          <h3>Failed Downloads ({failedEpisodes.length})</h3>
          <div className="failed-list">
            {failedEpisodes.map(episode => (
              <div key={episode.id} className="failed-item">
                <div className="episode-info">
                  <strong>{episode.episode_title}</strong>
                  <span className="podcast-name">{episode.podcast_name}</span>
                  {episode.retry_count > 0 && (
                    <span className="retry-info">🔄 Attempted {episode.retry_count}/{retryStats?.maxRetryAttempts || 3} times</span>
                  )}
                  {episode.error_message && (
                    <span className="error-message">❌ {episode.error_message}</span>
                  )}
                </div>
                <div className="failed-actions">
                  <button 
                    onClick={async () => {
                      try {
                        const result = await DownloadsAPI.retryEpisode(episode.id);
                        alert(result.message);
                        setTimeout(onRefresh, 1000);
                      } catch (error) {
                        onError(`Failed to retry download: ${error}`);
                      }
                    }}
                    className="btn btn-sm btn-primary"
                  >
                    🔄 Manual Retry
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await DownloadsAPI.startDownloads([episode.id]);
                        setTimeout(onRefresh, 1000);
                      } catch (error) {
                        onError(`Failed to restart download: ${error}`);
                      }
                    }}
                    className="btn btn-sm btn-secondary"
                  >
                    🔄 Restart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {episodes.length > 0 && downloadingEpisodes.length === 0 && downloadedEpisodes.length === 0 && failedEpisodes.length === 0 && (
        <div className="empty-downloads">
          <h3>No downloads yet</h3>
          <p>Go to the Episodes tab to start downloading audio files.</p>
        </div>
      )}
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('episodes');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleImportComplete = () => {
    // Reload episodes after successful import
    loadEpisodes();
    // Switch to episodes tab to see imported episodes
    setActiveTab('episodes');
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
        alert(response.data.message);
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
        alert(result.message);
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
        alert(result.message);
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
      <style>{`
        .btn-danger {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-danger:hover {
          background-color: #c82333;
        }
        .btn-danger:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .retry-overview {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          padding: 15px;
          margin: 15px 0;
        }
        .retry-config {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .retry-config p {
          margin: 5px 0;
          font-size: 14px;
        }
        .retry-info {
          color: #007bff;
          font-size: 12px;
          font-weight: bold;
          display: block;
          margin: 4px 0;
        }
        .failed-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
      `}</style>
      <header className="app-header">
        <h1>🎙️ Podcast Episode Manager</h1>
        <p>Download and manage podcast episodes</p>
        
        <nav className="app-nav">
          <button 
            className={`nav-tab ${activeTab === 'episodes' ? 'active' : ''}`}
            onClick={() => handleTabClick('episodes')}
          >
            Episodes ({episodes.length})
          </button>
          <button 
            className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => handleTabClick('upload')}
          >
            Upload CSV
          </button>
          <button 
            className={`nav-tab ${activeTab === 'downloads' ? 'active' : ''}`}
            onClick={() => handleTabClick('downloads')}
          >
            Downloads
          </button>
          <button 
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabClick('settings')}
          >
            Settings
          </button>
        </nav>
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
        {activeTab === 'episodes' && (
          <div className="episodes-tab">
            <div className="tab-header">
              <h2>Episodes</h2>
              <div className="header-actions">
                <button onClick={loadEpisodes} className="btn btn-secondary">
                  🔄 Refresh
                </button>
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
                  </>
                )}
              </div>
            </div>
            
            {episodes.length === 0 ? (
              <div className="empty-state">
                <h3>No episodes found</h3>
                <p>Upload a CSV file to get started</p>
                <button 
                  onClick={() => setActiveTab('upload')}
                  className="btn btn-primary"
                >
                  Upload CSV
                </button>
              </div>
            ) : (
              <>
                <div className="episodes-stats">
                  <div className="stat-card">
                    <span className="stat-number">{episodes.length}</span>
                    <span className="stat-label">Total Episodes</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-number">
                      {episodes.filter(ep => ep.download_status === 'downloaded').length}
                    </span>
                    <span className="stat-label">Downloaded</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-number">
                      {episodes.filter(ep => ep.download_status === 'downloading').length}
                    </span>
                    <span className="stat-label">Downloading</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-number">
                      {episodes.filter(ep => ep.download_status === 'pending').length}
                    </span>
                    <span className="stat-label">Pending</span>
                  </div>
                </div>
                
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
        )}
        
        {activeTab === 'upload' && (
          <div className="upload-tab">
            <div className="tab-header">
              <h2>Upload CSV</h2>
            </div>
            
            <div className="upload-section">
              <div className="upload-info">
                <h3>CSV Format</h3>
                <p>Your CSV should include these columns:</p>
                <ul>
                  <li><strong>Episode ID</strong> - Unique identifier</li>
                  <li><strong>Podcast ID</strong> - Podcast identifier</li>
                  <li><strong>Podcast Name</strong> - Name of the podcast</li>
                  <li><strong>Episode Title</strong> - Episode title</li>
                  <li><strong>Published Date</strong> - ISO date format</li>
                  <li><strong>Audio URL</strong> - Direct MP3 download link</li>
                </ul>
              </div>
              
              <div className="upload-area">
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
                          alert(`Successfully imported ${result.imported} episodes!`);
                        } else {
                          handleError(result.message);
                        }
                      } catch (error) {
                        handleError(`Failed to import CSV: ${error}`);
                      }
                    }
                  }}
                  className="file-input"
                />
                <div className="upload-placeholder">
                  <span>📄</span>
                  <p>Choose CSV file to upload</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'downloads' && (
          <DownloadsTab 
            episodes={episodes} 
            onRefresh={loadEpisodes}
            onError={handleError}
          />
        )}
        
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <div className="tab-header">
              <h2>Settings</h2>
            </div>
            <p>Settings management features coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;