import React, { useState, useEffect } from 'react';
import { Episode } from '../types';

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

  const handleStartQueue = () => {
    setIsQueueRunning(true);
    // This will be connected to the actual download queue
    console.log('Starting download queue with concurrent limit:', concurrentLimit);
    onError('Download queue will be connected in next integration phase');
  };

  const handlePauseQueue = () => {
    setIsQueueRunning(false);
    // This will pause all active downloads
    console.log('Pausing download queue');
  };

  const handleStopQueue = () => {
    setIsQueueRunning(false);
    // This will stop and clear the queue
    console.log('Stopping download queue');
    setDownloads([]);
  };

  const handleRetryFailed = () => {
    const failedDownloads = downloads.filter(item => item.status === 'failed');
    console.log('Retrying', failedDownloads.length, 'failed downloads');
    
    // Reset failed downloads to queued
    setDownloads(prev => prev.map(item => 
      item.status === 'failed' ? { ...item, status: 'queued', error: undefined } : item
    ));
  };

  const handleClearCompleted = () => {
    setDownloads(prev => prev.filter(item => item.status !== 'completed'));
  };

  const handleRemoveItem = (episodeId: number) => {
    setDownloads(prev => prev.filter(item => item.episode.id !== episodeId));
  };

  const handlePauseItem = (episodeId: number) => {
    setDownloads(prev => prev.map(item => 
      item.episode.id === episodeId 
        ? { ...item, status: 'paused' as const }
        : item
    ));
  };

  const handleResumeItem = (episodeId: number) => {
    setDownloads(prev => prev.map(item => 
      item.episode.id === episodeId 
        ? { ...item, status: 'queued' as const }
        : item
    ));
  };

  // Simulate some sample downloads for demo purposes
  useEffect(() => {
    if (downloads.length === 0) {
      const sampleDownloads: DownloadItem[] = [
        {
          episode: {
            id: 1,
            title: "Sample Episode 1: Introduction to Podcasting",
            published_date: "2025-01-01T00:00:00.000Z",
            audio_url: "https://example.com/episode1.mp3",
            status: "downloading",
            download_progress: 45
          },
          progress: 45,
          speed: 512000, // 512 KB/s
          eta: 180, // 3 minutes
          status: 'downloading'
        },
        {
          episode: {
            id: 2,
            title: "Sample Episode 2: Advanced Techniques",
            published_date: "2025-01-02T00:00:00.000Z",
            audio_url: "https://example.com/episode2.mp3",
            status: "pending"
          },
          progress: 0,
          speed: 0,
          eta: 0,
          status: 'queued'
        },
        {
          episode: {
            id: 3,
            title: "Sample Episode 3: Expert Interview",
            published_date: "2025-01-03T00:00:00.000Z",
            audio_url: "https://example.com/episode3.mp3",
            status: "downloaded"
          },
          progress: 100,
          speed: 0,
          eta: 0,
          status: 'completed'
        }
      ];
      setDownloads(sampleDownloads);
    }
  }, [downloads.length]);

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