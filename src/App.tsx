import React, { useState, useEffect } from 'react';
import { Episode, EpisodesAPI, DownloadsAPI, DirectoriesAPI, apiClient } from './api';
import { transcriptionApi, TranscriptionStatus, TranscriptionProgress } from './api/transcription';
import { TranscriptionEngine, TranscriptionConfig } from './services/transcriptionService';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { OverallProgressBar, calculateProgressStats } from './components/OverallProgressBar';
import './styles/App.css';

function App() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress[]>([]);
  const [transcriptionConfig, setTranscriptionConfig] = useState<TranscriptionConfig | null>(null);
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
      
      // Load episodes and transcription status
      await loadEpisodes();
      await loadTranscriptionStatus();
      await loadTranscriptionConfig();
      
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

  const loadTranscriptionStatus = async () => {
    try {
      const status = await transcriptionApi.getStatus();
      setTranscriptionStatus(status);
      
      const progress = await transcriptionApi.getProgress();
      setTranscriptionProgress(progress);
    } catch (err) {
      console.error('Failed to load transcription status:', err);
      // Don't set error for transcription status as it's not critical
    }
  };

  const loadTranscriptionConfig = async () => {
    try {
      const config = await transcriptionApi.getConfig();
      setTranscriptionConfig(config);
    } catch (err) {
      console.error('Failed to load transcription config:', err);
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

  const handleTranscriptionQueue = async (action: 'pause' | 'resume' | 'stop' | 'sync') => {
    try {
      let result;
      switch (action) {
        case 'pause':
          result = await transcriptionApi.pauseTranscription();
          break;
        case 'resume':
          result = await transcriptionApi.resumeTranscription();
          break;
        case 'stop':
          result = await transcriptionApi.stopTranscription();
          break;
        case 'sync':
          result = await transcriptionApi.syncTranscription();
          break;
      }
      
      if (result.success) {
        toast.success(result.message);
        await loadTranscriptionStatus();
        // Refresh episodes after sync to show updated statuses
        if (action === 'sync') {
          await loadEpisodes();
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      handleError(`Failed to ${action} transcription: ${error}`);
    }
  };

  const handleTranscribeEpisode = async (episode: Episode) => {
    if (!episode.file_path) {
      toast.error('No file path available for transcription');
      return;
    }

    try {
      const result = await transcriptionApi.queueFile(episode.file_path);
      if (result.success) {
        toast.success(`Queued transcription for "${episode.episode_title}"`);
        await loadTranscriptionStatus();
        await loadEpisodes();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      handleError(`Failed to queue transcription: ${error}`);
    }
  };

  const handleQueueAllDownloadedEpisodes = async () => {
    try {
      setLoading(true);
      
      // Find all downloaded episodes that haven't been transcribed
      const downloadedEpisodes = episodes.filter(episode => {
        if (episode.download_status !== 'downloaded' || !episode.file_path) return false;
        const transcriptionStatus = getEpisodeTranscriptionStatus(episode);
        return ['none', 'failed'].includes(transcriptionStatus.status);
      });
      
      if (downloadedEpisodes.length === 0) {
        // Check what status the downloaded episodes have
        const downloadedCount = episodes.filter(ep => ep.download_status === 'downloaded').length;
        const queuedCount = episodes.filter(ep => {
          const status = getEpisodeTranscriptionStatus(ep);
          return status.status === 'queued';
        }).length;
        const completedCount = episodes.filter(ep => {
          const status = getEpisodeTranscriptionStatus(ep);
          return status.status === 'completed';
        }).length;
        const processingCount = episodes.filter(ep => {
          const status = getEpisodeTranscriptionStatus(ep);
          return status.status === 'transcribing';
        }).length;
        
        toast.info(`All ${downloadedCount} downloaded episodes are already processed: ${queuedCount} queued, ${processingCount} transcribing, ${completedCount} completed`);
        return;
      }

      // Queue each episode for transcription
      let queuedCount = 0;
      for (const episode of downloadedEpisodes) {
        try {
          const result = await transcriptionApi.queueFile(episode.file_path);
          if (result.success) {
            queuedCount++;
          }
        } catch (error) {
          console.error(`Failed to queue ${episode.episode_title}:`, error);
        }
      }
      
      if (queuedCount > 0) {
        toast.success(`Queued ${queuedCount} episodes for transcription`);
        await loadTranscriptionStatus();
        await loadEpisodes();
      } else {
        toast.error('Failed to queue any episodes for transcription');
      }
      
    } catch (error) {
      handleError(`Failed to queue episodes for transcription: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEngineSwitch = async (engine: TranscriptionEngine) => {
    try {
      const result = await transcriptionApi.setEngine(engine);
      if (result.success) {
        toast.success(`Switched to ${engine} transcription engine`);
        await loadTranscriptionStatus();
        await loadTranscriptionConfig();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      handleError(`Failed to switch engine: ${error}`);
    }
  };

  // Unified function to get transcription status for an episode
  const getEpisodeTranscriptionStatus = (episode: Episode) => {
    // First check if there's real-time progress for this episode
    const realtimeProgress = transcriptionProgress.find(
      progress => progress.episodeId === episode.id || 
      progress.filename === episode.file_path?.split('/').pop()
    );

    if (realtimeProgress) {
      // Use real-time progress data
      const isPercentageOnly = realtimeProgress.message.match(/^\d+%$/);
      const isProcessing = realtimeProgress.message.includes('Processing...');
      
      return {
        status: realtimeProgress.stage,
        badge: isPercentageOnly ? 
          `🎙️ ${realtimeProgress.message}` : 
          isProcessing ?
          '🎙️ Processing...' :
          `🎙️ ${realtimeProgress.stage}`,
        hasRealTimeData: true,
        progress: realtimeProgress
      };
    }

    // Fall back to database status
    if (!episode.transcription_status || episode.transcription_status === 'none') {
      return { status: 'none', badge: null, hasRealTimeData: false };
    }

    const badges = {
      'queued': '📝 Queued',
      'transcribing': '🎙️ Processing',
      'completed': '✅ Transcribed',
      'failed': '❌ Failed'
    };

    return {
      status: episode.transcription_status,
      badge: badges[episode.transcription_status] || null,
      hasRealTimeData: false
    };
  };

  // Auto-refresh episodes every 3 seconds to update download and transcription progress
  useEffect(() => {
    const interval = setInterval(async () => {
      const hasDownloading = episodes.some(ep => ep.download_status === 'downloading');
      const hasTranscribing = transcriptionStatus?.processing || transcriptionStatus?.queueLength > 0;
      
      if (hasDownloading || hasTranscribing) {
        // Refresh episodes and transcription status if active
        await loadEpisodes();
        await loadTranscriptionStatus();
        await loadTranscriptionConfig();
        
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
  }, [episodes, transcriptionStatus]);

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
                  <button 
                    onClick={handleQueueAllDownloadedEpisodes}
                    className="btn btn-secondary"
                    disabled={loading}
                    style={{ marginLeft: '10px' }}
                  >
                    🎙️ Transcribe All Downloaded
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
              
              {/* Transcription Status Panel */}
              {transcriptionStatus && (
                <div className="transcription-panel">
                  <div className="transcription-header">
                    <h3>🎙️ Transcription Status</h3>
                    <div className="transcription-info">
                      <div className="engine-status">
                        <span className="engine-info">
                          Current Engine: <strong>{transcriptionStatus.currentEngine.toUpperCase()}</strong>
                        </span>
                      </div>
                      {(!transcriptionStatus.whisperxAvailable && !transcriptionStatus.parakeetAvailable) ? (
                        <span className="status-warning">⚠️ No transcription engines available</span>
                      ) : (
                        <>
                          <span className="status-info">
                            Queue: {transcriptionStatus.queueLength} | 
                            Status: {transcriptionStatus.processing ? '🎙️ Processing' : '⏸️ Idle'}
                            {transcriptionStatus.paused && ' (Paused)'}
                          </span>
                          {transcriptionStatus.currentFile && (
                            <span className="current-file">
                              Processing: {transcriptionStatus.currentFile}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {(transcriptionStatus.whisperxAvailable || transcriptionStatus.parakeetAvailable) && (
                    <div className="transcription-controls">
                      {/* Engine Selection */}
                      <div className="engine-selector" style={{ marginBottom: '10px' }}>
                        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Engine:</label>
                        <select 
                          value={transcriptionStatus.currentEngine} 
                          onChange={(e) => handleEngineSwitch(e.target.value as TranscriptionEngine)}
                          disabled={transcriptionStatus.processing || loading}
                          style={{ marginRight: '10px', padding: '5px' }}
                        >
                          {transcriptionStatus.whisperxAvailable && (
                            <option value="whisperx">WhisperX (with diarization)</option>
                          )}
                          {transcriptionStatus.parakeetAvailable && (
                            <option value="parakeet">Parakeet (fast, no diarization)</option>
                          )}
                        </select>
                        {transcriptionConfig && (
                          <span className="config-info">
                            {transcriptionStatus.currentEngine === 'whisperx' ? 
                              `Model: ${transcriptionConfig.whisperx.model}` : 
                              `Model: ${transcriptionConfig.parakeet.model.split('/').pop()}`
                            }
                          </span>
                        )}
                      </div>

                      {/* Control Buttons */}
                      {!transcriptionStatus.processing && transcriptionStatus.queueLength === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="status-idle">No transcription tasks</span>
                          <button 
                            onClick={() => handleTranscriptionQueue('sync')}
                            className="btn btn-sm btn-secondary"
                            disabled={loading}
                          >
                            🔄 Sync Queue
                          </button>
                        </div>
                      ) : (
                        <>
                          {transcriptionStatus.paused ? (
                            <button 
                              onClick={() => handleTranscriptionQueue('resume')}
                              className="btn btn-sm btn-success"
                              disabled={loading}
                            >
                              ▶️ Resume
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleTranscriptionQueue('pause')}
                              className="btn btn-sm btn-warning"
                              disabled={loading}
                            >
                              ⏸️ Pause
                            </button>
                          )}
                          <button 
                            onClick={() => handleTranscriptionQueue('stop')}
                            className="btn btn-sm btn-danger"
                            disabled={loading}
                            style={{ marginLeft: '10px' }}
                          >
                            🛑 Stop & Clear Queue
                          </button>
                          <button 
                            onClick={() => handleTranscriptionQueue('sync')}
                            className="btn btn-sm btn-secondary"
                            disabled={loading}
                            style={{ marginLeft: '10px' }}
                          >
                            🔄 Sync Queue
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Transcription Progress */}
                  {transcriptionProgress.length > 0 && (
                    <div className="transcription-progress">
                      {transcriptionProgress.map((progress, index) => (
                        <div key={index} className="progress-item">
                          <div className="progress-header">
                            <span className="filename">{progress.filename}</span>
                            <span className="stage">
                              {progress.message.match(/^\d+%$/) ? 
                                `transcribing (${progress.message})` : 
                                progress.message.includes('Processing...') ?
                                'transcribing (processing...)' :
                                `${progress.stage} (${progress.progress}%)`
                              }
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${progress.progress}%` }}
                            ></div>
                          </div>
                          {!progress.message.match(/^\d+%$/) && !progress.message.includes('Processing...') && (
                            <div className="progress-message">{progress.message}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
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
                        {(() => {
                          const transcriptionStatus = getEpisodeTranscriptionStatus(episode);
                          return transcriptionStatus.badge && (
                            <span className={`transcription-badge transcription-${transcriptionStatus.status} ${transcriptionStatus.hasRealTimeData ? 'realtime' : ''}`}>
                              {transcriptionStatus.badge}
                            </span>
                          );
                        })()}
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
                      {episode.download_status === 'downloaded' && episode.file_path && 
                       (() => {
                         const transcriptionStatus = getEpisodeTranscriptionStatus(episode);
                         return ['none', 'failed'].includes(transcriptionStatus.status);
                       })() && (
                        <button 
                          onClick={() => handleTranscribeEpisode(episode)}
                          className="btn btn-sm btn-secondary"
                          disabled={loading}
                        >
                          🎙️ Transcribe
                        </button>
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