import React, { useState, useEffect } from 'react';
import { Episode, EpisodesAPI, DownloadsAPI, DirectoriesAPI, apiClient, transcriptionApi, TranscriptionProgress, TranscriptionStatus } from './api';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { OverallProgressBar, calculateProgressStats } from './components/OverallProgressBar';
import './styles/App.css';

function App() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress[]>([]);
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus | null>(null);
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
      
      // Load initial transcription progress and status
      await fetchTranscriptionProgress();
      await fetchTranscriptionStatus();
      
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
        // Refresh episodes to show updated status
        await loadEpisodes();
        toast.success(result.message);
      } else {
      }
    } catch (error) {
      handleError(`Failed to sync downloads: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const transcribeEpisode = async (episode: Episode) => {
    if (!episode.file_path) {
      handleError('No file path available for transcription');
      return;
    }

    try {
      await transcriptionApi.queueFile(episode.file_path);
      toast.success(`Queued transcription for "${episode.episode_title}"`);
      
      // Refresh episodes list to show updated status
      setTimeout(() => {
        loadEpisodes();
      }, 1000);
      
    } catch (error) {
      handleError(`Failed to start transcription for "${episode.episode_title}": ${error}`);
    }
  };

  const getEligibleEpisodesForTranscription = () => {
    return episodes.filter(episode => 
      episode.download_status === 'downloaded' && 
      episode.file_path && 
      episode.transcription_status !== 'completed' &&
      episode.transcription_status !== 'transcribing'
    );
  };

  const transcribeAllEpisodes = async () => {
    try {
      const eligibleEpisodes = getEligibleEpisodesForTranscription();

      if (eligibleEpisodes.length === 0) {
        toast.info('No episodes available for transcription');
        return;
      }

      const confirmMessage = `Queue ${eligibleEpisodes.length} episodes for transcription?\n\nThis will add all downloaded episodes that haven't been transcribed yet.`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      setLoading(true);
      let queuedCount = 0;
      let errorCount = 0;

      for (const episode of eligibleEpisodes) {
        try {
          await transcriptionApi.queueFile(episode.file_path!);
          queuedCount++;
            } catch (error) {
          console.error(`Failed to queue transcription for ${episode.episode_title}:`, error);
          errorCount++;
        }
      }

      if (queuedCount > 0) {
        toast.success(`Queued ${queuedCount} episodes for transcription${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        
        // Refresh episodes list and transcription status
        setTimeout(async () => {
          await loadEpisodes();
          await fetchTranscriptionStatus();
        }, 1000);
      } else {
        toast.error('Failed to queue any episodes for transcription');
      }
      
    } catch (error) {
      handleError(`Failed to queue episodes for transcription: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTranscriptionProgress = async () => {
    try {
      const progress = await transcriptionApi.getProgress();
      setTranscriptionProgress(progress);
    } catch (error) {
      console.error('Failed to fetch transcription progress:', error);
    }
  };

  const fetchTranscriptionStatus = async () => {
    try {
      const status = await transcriptionApi.getStatus();
      setTranscriptionStatus(status);
    } catch (error) {
      console.error('Failed to fetch transcription status:', error);
    }
  };

  const getTranscriptionStatus = (episode: Episode) => {
    if (!episode.transcription_status || episode.transcription_status === 'none') return null;
    
    // Find progress for this episode
    const progress = transcriptionProgress.find(p => p.episodeId === episode.id);
    
    if (progress && episode.transcription_status === 'transcribing') {
      return (
        <div className="transcription-status" style={{ 
          fontSize: '11px', 
          marginLeft: '8px', 
          marginTop: '4px',
          padding: '4px 6px',
          backgroundColor: '#f0f8ff',
          border: '1px solid #cce5ff',
          borderRadius: '4px',
          display: 'block'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span>🎙️ {progress.stage.replace('_', ' ')}</span>
            <span style={{ fontWeight: 'bold', color: '#007bff' }}>{progress.progress}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${progress.progress}%`, 
              height: '100%', 
              backgroundColor: '#007bff', 
              transition: 'width 0.5s ease'
            }}></div>
          </div>
          <div style={{ marginTop: '2px', color: '#666', fontSize: '10px' }}>
            {progress.message}
          </div>
        </div>
      );
    }
    
    const statusText = {
      'queued': '📝 Queued',
      'transcribing': '🎙️ Processing',
      'completed': '✅ Done',
      'failed': '❌ Failed'
    }[episode.transcription_status];
    
    return statusText ? (
      <span className="transcription-status" style={{ fontSize: '12px', marginLeft: '8px', opacity: 0.8 }}>
        {statusText}
      </span>
    ) : null;
  };

  // Auto-refresh episodes every 3 seconds to update download progress
  // Also sync downloads periodically to catch completed downloads
  useEffect(() => {
    const interval = setInterval(async () => {
      const hasDownloading = episodes.some(ep => ep.download_status === 'downloading');
      const hasTranscribing = episodes.some(ep => ep.transcription_status === 'transcribing');
      
      if (hasDownloading) {
        // If downloads are active, refresh frequently and sync
        await loadEpisodes();
        
        // Every 6th refresh (18 seconds), also sync with filesystem
        if (Math.random() < 0.16) { // ~1/6 chance
          try {
            await DownloadsAPI.syncDownloads();
          } catch (error) {
            // Background sync failed silently
          }
        }
      }
      
      if (hasTranscribing) {
        // If transcriptions are active, fetch progress updates
        await fetchTranscriptionProgress();
        await fetchTranscriptionStatus();
        await loadEpisodes(); // Also refresh episodes to get status updates
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
        
        /* Toast Notification Styles */
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 400px;
        }
        
        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-size: 14px;
          line-height: 1.4;
          cursor: pointer;
          transform: translateX(100%);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
          max-width: 100%;
          word-wrap: break-word;
        }
        
        .toast-visible {
          transform: translateX(0);
          opacity: 1;
        }
        
        .toast-leaving {
          transform: translateX(100%);
          opacity: 0;
        }
        
        .toast-success {
          background-color: #10b981;
          color: white;
          border-left: 4px solid #059669;
        }
        
        .toast-error {
          background-color: #ef4444;
          color: white;
          border-left: 4px solid #dc2626;
        }
        
        .toast-warning {
          background-color: #f59e0b;
          color: white;
          border-left: 4px solid #d97706;
        }
        
        .toast-info {
          background-color: #3b82f6;
          color: white;
          border-left: 4px solid #2563eb;
        }
        
        .toast-icon {
          font-size: 16px;
          flex-shrink: 0;
        }
        
        .toast-message {
          flex-grow: 1;
          margin-right: 8px;
        }
        
        .toast-close {
          background: none;
          border: none;
          color: inherit;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          opacity: 0.7;
          transition: opacity 0.2s;
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .toast-close:hover {
          opacity: 1;
        }
        
        .toast:hover {
          transform: translateX(-5px);
        }
        
        .toast-visible:hover {
          transform: translateX(-5px);
        }
        
        @media (max-width: 768px) {
          .toast-container {
            right: 10px;
            left: 10px;
            max-width: none;
          }
          
          .toast {
            font-size: 13px;
            padding: 10px 12px;
          }
        }

        /* Overall Progress Bar Styles */
        .overall-progress-container {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .progress-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #2d3748;
        }

        .progress-percentage {
          font-size: 20px;
          font-weight: bold;
          color: #4a5568;
        }

        .progress-bar-container {
          margin-bottom: 15px;
        }

        .progress-bar-track {
          position: relative;
          width: 100%;
          height: 12px;
          background-color: #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .progress-segment {
          position: absolute;
          top: 0;
          height: 100%;
          transition: width 0.3s ease-in-out;
        }

        .progress-downloaded {
          background: linear-gradient(90deg, #10b981, #059669);
        }

        .progress-downloading {
          background: linear-gradient(90deg, #3b82f6, #2563eb);
          animation: downloading-pulse 2s ease-in-out infinite;
        }

        .progress-failed {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }

        .progress-pending {
          background-color: #e2e8f0;
        }

        @keyframes downloading-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }


        .progress-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 13px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .legend-downloaded {
          background: linear-gradient(90deg, #10b981, #059669);
        }

        .legend-downloading {
          background: linear-gradient(90deg, #3b82f6, #2563eb);
        }

        .legend-failed {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }

        .legend-pending {
          background-color: #e2e8f0;
        }

        .episodes-progress-bar {
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .progress-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .progress-percentage {
            font-size: 18px;
          }

          .progress-legend {
            gap: 12px;
          }

          .legend-item {
            font-size: 12px;
          }
        }
      `}</style>
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
                      onClick={transcribeAllEpisodes}
                      className="btn btn-success"
                      disabled={loading}
                      style={{ marginLeft: '10px' }}
                      title={`Queue ${getEligibleEpisodesForTranscription().length} episodes for transcription`}
                    >
                      🎙️ Transcribe All ({getEligibleEpisodesForTranscription().length})
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
                
                {transcriptionStatus && (
                  <div className="transcription-queue-status" style={{
                    background: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '16px',
                    margin: '16px 0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>🎙️</span>
                          <strong>Transcription Queue</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
                          <div>
                            <span style={{ color: '#666' }}>Status: </span>
                            <span style={{ 
                              color: transcriptionStatus.paused 
                                ? '#ffc107' 
                                : transcriptionStatus.processing 
                                  ? '#28a745' 
                                  : '#6c757d',
                              fontWeight: 'bold'
                            }}>
                              {transcriptionStatus.paused 
                                ? '⏸️ Paused' 
                                : transcriptionStatus.processing 
                                  ? '🔄 Processing' 
                                  : '⏹️ Idle'}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#666' }}>Queue: </span>
                            <span style={{ fontWeight: 'bold' }}>
                              {transcriptionStatus.queueLength} files
                            </span>
                          </div>
                          {transcriptionStatus.currentFile && (
                            <div>
                              <span style={{ color: '#666' }}>Current: </span>
                              <span style={{ fontWeight: 'bold', color: '#007bff' }}>
                                {transcriptionStatus.currentFile}
                              </span>
                            </div>
                          )}
                          {transcriptionStatus.nextFile && (
                            <div>
                              <span style={{ color: '#666' }}>Next: </span>
                              <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                                {transcriptionStatus.nextFile}
                              </span>
                            </div>
                          )}
                          <div>
                            <span style={{ color: '#666' }}>WhisperX: </span>
                            <span style={{ 
                              color: transcriptionStatus.whisperxAvailable ? '#28a745' : '#dc3545',
                              fontWeight: 'bold'
                            }}>
                              {transcriptionStatus.whisperxAvailable ? '✅ Available' : '❌ Not Available'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {transcriptionStatus.paused ? (
                          <button 
                            onClick={async () => {
                              try {
                                const result = await transcriptionApi.resumeTranscription();
                                if (result.success) {
                                  toast.success(result.message);
                                  await fetchTranscriptionStatus();
                                } else {
                                  toast.error(result.message);
                                }
                              } catch (error) {
                                toast.error(`Failed to resume: ${error}`);
                              }
                            }}
                            className="btn btn-sm btn-success"
                            style={{ fontSize: '12px' }}
                          >
                            ▶️ Resume
                          </button>
                        ) : (
                          <button 
                            onClick={async () => {
                              try {
                                const result = await transcriptionApi.pauseTranscription();
                                if (result.success) {
                                  toast.success(result.message);
                                  await fetchTranscriptionStatus();
                                } else {
                                  toast.error(result.message);
                                }
                              } catch (error) {
                                toast.error(`Failed to pause: ${error}`);
                              }
                            }}
                            className="btn btn-sm btn-warning"
                            style={{ fontSize: '12px' }}
                            disabled={!transcriptionStatus.processing && transcriptionStatus.queueLength === 0}
                          >
                            ⏸️ Pause
                          </button>
                        )}
                        
                        <button 
                          onClick={async () => {
                            if (window.confirm('Stop transcription and clear queue? This will terminate the current transcription process.')) {
                              try {
                                const result = await transcriptionApi.stopTranscription();
                                if (result.success) {
                                  toast.success(result.message);
                                  await fetchTranscriptionStatus();
                                  await loadEpisodes();
                                } else {
                                  toast.error(result.message);
                                }
                              } catch (error) {
                                toast.error(`Failed to stop: ${error}`);
                              }
                            }
                          }}
                          className="btn btn-sm btn-danger"
                          style={{ fontSize: '12px' }}
                          disabled={!transcriptionStatus.processing && transcriptionStatus.queueLength === 0 && !transcriptionStatus.paused}
                        >
                          🛑 Stop
                        </button>
                      </div>
                    </div>
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
                          {getTranscriptionStatus(episode)}
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
                         episode.transcription_status !== 'completed' && 
                         episode.transcription_status !== 'transcribing' && (
                          <button 
                            onClick={() => transcribeEpisode(episode)}
                            className="btn btn-sm btn-primary"
                            style={{ marginLeft: '8px' }}
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