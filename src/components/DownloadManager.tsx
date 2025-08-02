import React, { useState, useEffect } from 'react';
import { Episode, EpisodesAPI, DownloadsAPI } from '../api';

interface DownloadManagerProps {
  onError: (message: string) => void;
}

interface DownloadItem {
  episode: Episode;
  progress: number;
  speed: number;
  eta: number;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  error?: string;
}

interface QueueStats {
  total: number;
  downloading: number;
  queued: number;
  completed: number;
  failed: number;
  paused: number;
}

export const DownloadManager: React.FC<DownloadManagerProps> = ({ onError }) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [concurrentLimit, setConcurrentLimit] = useState(3);
  const [autoStart, setAutoStart] = useState(true);
  const [downloadQueue] = useState(() => DownloadQueue.getInstance());

  const getQueueStats = (): QueueStats => {
    return downloads.reduce((stats, item) => {
      stats.total++;
      stats[item.status]++;
      return stats;
    }, {
      total: 0,
      downloading: 0,
      queued: 0,
      completed: 0,
      failed: 0,
      paused: 0
    });
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let speed = bytesPerSecond;
    let unitIndex = 0;
    
    while (speed >= 1024 && unitIndex < units.length - 1) {
      speed /= 1024;
      unitIndex++;
    }
    
    return `${speed.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatETA = (seconds: number): string => {
    if (seconds === 0 || !isFinite(seconds)) return '--:--';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const handleStartQueue = async () => {
    try {
      downloadQueue.setMaxConcurrency(concurrentLimit);
      await downloadQueue.start();
      setIsQueueRunning(true);
    } catch (error) {
      console.error('Failed to start download queue:', error);
      onError('Failed to start download queue');
    }
  };

  const handlePauseQueue = async () => {
    try {
      await downloadQueue.pause();
      setIsQueueRunning(false);
    } catch (error) {
      console.error('Failed to pause download queue:', error);
      onError('Failed to pause download queue');
    }
  };

  const handleStopQueue = async () => {
    try {
      await downloadQueue.stop();
      setIsQueueRunning(false);
      loadDownloadData(); // Refresh to show updated state
    } catch (error) {
      console.error('Failed to stop download queue:', error);
      onError('Failed to stop download queue');
    }
  };

  const handleRetryFailed = async () => {
    try {
      const failedDownloads = downloads.filter(item => item.status === 'failed');
      const episodesDAL = EpisodesDAL.getInstance();
      
      for (const item of failedDownloads) {
        // Reset episode status to pending
        await episodesDAL.update(item.episode.id, {
          status: 'pending',
          error_message: undefined,
          retry_count: 0
        });
        
        // Add back to download queue
        downloadQueue.addEpisode(item.episode);
      }
      
      loadDownloadData(); // Refresh to show updated state
    } catch (error) {
      console.error('Failed to retry failed downloads:', error);
      onError('Failed to retry failed downloads');
    }
  };

  const handleClearCompleted = async () => {
    try {
      const completedItems = downloads.filter(item => item.status === 'completed');
      
      for (const item of completedItems) {
        downloadQueue.removeEpisode(item.episode.id);
      }
      
      loadDownloadData(); // Refresh to show updated state
    } catch (error) {
      console.error('Failed to clear completed downloads:', error);
      onError('Failed to clear completed downloads');
    }
  };

  const handleRemoveItem = async (episodeId: number) => {
    try {
      downloadQueue.removeEpisode(episodeId);
      loadDownloadData(); // Refresh to show updated state
    } catch (error) {
      console.error('Failed to remove download:', error);
      onError('Failed to remove download');
    }
  };

  const handlePauseItem = async (episodeId: number) => {
    try {
      downloadQueue.pauseEpisode(episodeId);
      loadDownloadData(); // Refresh to show updated state
    } catch (error) {
      console.error('Failed to pause download:', error);
      onError('Failed to pause download');
    }
  };

  const handleResumeItem = async (episodeId: number) => {
    try {
      downloadQueue.resumeEpisode(episodeId);
      loadDownloadData(); // Refresh to show updated state
    } catch (error) {
      console.error('Failed to resume download:', error);
      onError('Failed to resume download');
    }
  };

  // Load download queue data and set up real-time updates
  useEffect(() => {
    loadDownloadData();
    
    // Set up download queue event listeners
    const handleProgressUpdate = (episodeId: number, progress: number, speed: number, eta: number) => {
      setDownloads(prev => prev.map(item => 
        item.episode.id === episodeId 
          ? { ...item, progress, speed, eta }
          : item
      ));
    };

    const handleStatusChange = (episodeId: number, newStatus: DownloadItem['status'], error?: string) => {
      setDownloads(prev => prev.map(item => 
        item.episode.id === episodeId 
          ? { ...item, status: newStatus, error }
          : item
      ));
    };

    const handleQueueChange = () => {
      loadDownloadData();
    };

    // Subscribe to download queue events
    downloadQueue.on('progress', handleProgressUpdate);
    downloadQueue.on('statusChange', handleStatusChange);
    downloadQueue.on('queueChange', handleQueueChange);

    // Set up periodic refresh for real-time updates
    const refreshInterval = setInterval(loadDownloadData, 5000);

    return () => {
      downloadQueue.off('progress', handleProgressUpdate);
      downloadQueue.off('statusChange', handleStatusChange);
      downloadQueue.off('queueChange', handleQueueChange);
      clearInterval(refreshInterval);
    };
  }, [downloadQueue]);

  const loadDownloadData = async () => {
    try {
      const episodesDAL = EpisodesDAL.getInstance();
      
      // Get episodes that are in download states
      const downloadingEpisodes = await episodesDAL.getByStatus('downloading');
      const pendingEpisodes = await episodesDAL.getByStatus('pending');
      const failedEpisodes = await episodesDAL.getByStatus('failed');
      
      // Convert to download items
      const downloadItems: DownloadItem[] = [
        ...downloadingEpisodes.map(episode => ({
          episode,
          progress: episode.download_progress || 0,
          speed: 0, // Will be updated by progress events
          eta: 0, // Will be updated by progress events
          status: 'downloading' as const,
          error: episode.error_message
        })),
        ...pendingEpisodes.map(episode => ({
          episode,
          progress: 0,
          speed: 0,
          eta: 0,
          status: 'queued' as const,
          error: episode.error_message
        })),
        ...failedEpisodes.map(episode => ({
          episode,
          progress: episode.download_progress || 0,
          speed: 0,
          eta: 0,
          status: 'failed' as const,
          error: episode.error_message
        }))
      ];

      setDownloads(downloadItems);
      setIsQueueRunning(downloadQueue.isRunning());
    } catch (error) {
      console.error('Failed to load download data:', error);
      onError('Failed to load download queue');
    }
  };

  const stats = getQueueStats();

  return (
    <div className="download-manager">
      <div className="download-header">
        <h2>Download Manager</h2>
        <p>Monitor and control podcast episode downloads</p>
      </div>

      <div className="queue-controls">
        <div className="queue-stats">
          <div className="stat-item">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-number downloading">{stats.downloading}</span>
            <span className="stat-label">Downloading</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.queued}</span>
            <span className="stat-label">Queued</span>
          </div>
          <div className="stat-item">
            <span className="stat-number completed">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
          {stats.failed > 0 && (
            <div className="stat-item">
              <span className="stat-number failed">{stats.failed}</span>
              <span className="stat-label">Failed</span>
            </div>
          )}
        </div>

        <div className="queue-actions">
          <div className="primary-controls">
            {!isQueueRunning ? (
              <button 
                className="btn btn-primary"
                onClick={handleStartQueue}
                disabled={stats.queued === 0 && stats.downloading === 0}
              >
                Start Queue
              </button>
            ) : (
              <button 
                className="btn btn-warning"
                onClick={handlePauseQueue}
              >
                Pause Queue
              </button>
            )}
            
            <button 
              className="btn btn-secondary"
              onClick={handleStopQueue}
              disabled={stats.total === 0}
            >
              Stop All
            </button>
          </div>

          <div className="secondary-controls">
            {stats.failed > 0 && (
              <button 
                className="btn btn-link"
                onClick={handleRetryFailed}
              >
                Retry Failed ({stats.failed})
              </button>
            )}
            
            {stats.completed > 0 && (
              <button 
                className="btn btn-link"
                onClick={handleClearCompleted}
              >
                Clear Completed ({stats.completed})
              </button>
            )}
          </div>
        </div>

        <div className="queue-settings">
          <label htmlFor="concurrent-limit">
            Concurrent Downloads:
            <select
              id="concurrent-limit"
              value={concurrentLimit}
              onChange={(e) => setConcurrentLimit(Number(e.target.value))}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
            />
            Auto-start new downloads
          </label>
        </div>
      </div>

      {downloads.length === 0 ? (
        <div className="empty-downloads">
          <h3>No Downloads</h3>
          <p>Start downloading episodes from the Episodes tab</p>
        </div>
      ) : (
        <div className="download-list">
          {downloads.map((item) => (
            <div key={item.episode.id} className={`download-item ${item.status}`}>
              <div className="download-info">
                <h4 className="episode-title" title={item.episode.title}>
                  {item.episode.title.length > 60 
                    ? `${item.episode.title.substring(0, 60)}...`
                    : item.episode.title
                  }
                </h4>
                
                <div className="download-meta">
                  <span className="episode-date">
                    {new Date(item.episode.published_date).toLocaleDateString()}
                  </span>
                  
                  {item.episode.audio_url && (
                    <a 
                      href={item.episode.audio_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      Source
                    </a>
                  )}
                </div>
              </div>

              <div className="download-progress">
                {item.status === 'downloading' && (
                  <>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${item.progress}%` }}
                      ></div>
                      <span className="progress-text">{item.progress}%</span>
                    </div>
                    <div className="progress-details">
                      <span className="download-speed">{formatSpeed(item.speed)}</span>
                      <span className="download-eta">ETA: {formatETA(item.eta)}</span>
                    </div>
                  </>
                )}

                {item.status === 'completed' && (
                  <div className="status-completed">
                    <span className="status-icon">✓</span>
                    <span>Download Complete</span>
                  </div>
                )}

                {item.status === 'failed' && (
                  <div className="status-failed">
                    <span className="status-icon">✗</span>
                    <span>Failed: {item.error || 'Unknown error'}</span>
                  </div>
                )}

                {item.status === 'queued' && (
                  <div className="status-queued">
                    <span className="status-icon">⏳</span>
                    <span>Queued</span>
                  </div>
                )}

                {item.status === 'paused' && (
                  <div className="status-paused">
                    <span className="status-icon">⏸</span>
                    <span>Paused</span>
                  </div>
                )}
              </div>

              <div className="download-actions">
                {item.status === 'downloading' && (
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => handlePauseItem(item.episode.id)}
                  >
                    Pause
                  </button>
                )}

                {item.status === 'paused' && (
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => handleResumeItem(item.episode.id)}
                  >
                    Resume
                  </button>
                )}

                {item.status === 'failed' && (
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => handleResumeItem(item.episode.id)}
                  >
                    Retry
                  </button>
                )}

                {(item.status === 'queued' || item.status === 'completed' || item.status === 'failed') && (
                  <button 
                    className="btn btn-sm btn-link remove-btn"
                    onClick={() => handleRemoveItem(item.episode.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};