import React, { useState, useMemo, useCallback } from 'react';
import { Episode, EpisodesAPI, DownloadsAPI, transcriptionApi } from '../api';

interface EpisodeListProps {
  episodes: Episode[];
  onRefresh: () => void;
  onError: (message: string) => void;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({ 
  episodes, 
  onRefresh, 
  onError 
}) => {
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const getStatusBadge = (status: string, progress?: number) => {
    switch (status) {
      case 'downloading':
        return (
          <div className="status-badge downloading">
            <span className="status-text">Downloading</span>
            {progress !== undefined && (
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
                <span className="progress-text">{progress}%</span>
              </div>
            )}
          </div>
        );
      case 'downloaded':
        return <span className="status-badge downloaded">Downloaded</span>;
      case 'transcribed':
        return <span className="status-badge transcribed">Transcribed</span>;
      case 'failed':
        return <span className="status-badge failed">Failed</span>;
      case 'pending':
      default:
        return <span className="status-badge pending">Pending</span>;
    }
  };


  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown Date';
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const sortedAndFilteredEpisodes = useMemo(() => {
    return episodes
      .filter(episode => {
        if (filterStatus === 'all') return true;
        return episode.status === filterStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
          case 'title':
            return a.title.localeCompare(b.title);
          case 'status':
            return a.status.localeCompare(b.status);
          default:
            return 0;
        }
      });
  }, [episodes, filterStatus, sortBy]);

  const handleSelectEpisode = useCallback((episodeId: number) => {
    const newSelected = new Set(selectedEpisodes);
    if (newSelected.has(episodeId)) {
      newSelected.delete(episodeId);
    } else {
      newSelected.add(episodeId);
    }
    setSelectedEpisodes(newSelected);
  }, [selectedEpisodes]);

  const handleSelectAll = useCallback(() => {
    if (selectedEpisodes.size === episodes.length) {
      setSelectedEpisodes(new Set());
    } else {
      setSelectedEpisodes(new Set(episodes.map(ep => ep.id)));
    }
  }, [selectedEpisodes.size, episodes]);

  const handleBulkDownload = useCallback(async () => {
    if (selectedEpisodes.size === 0) {
      onError('No episodes selected for download');
      return;
    }
    
    const pendingEpisodes = episodes.filter(ep => 
      selectedEpisodes.has(ep.id) && ep.status === 'pending'
    );
    
    if (pendingEpisodes.length === 0) {
      onError('No pending episodes selected');
      return;
    }

    try {
      const downloadQueue = DownloadQueue.getInstance();
      const episodesDAL = EpisodesDAL.getInstance();
      
      // Add episodes to download queue
      for (const episode of pendingEpisodes) {
        // Ensure episode has audio_url for download
        if (!episode.audio_url) {
          console.warn(`Skipping episode "${episode.title}" - no audio URL`);
          continue;
        }
        
        // Update status to queued
        await episodesDAL.update(episode.id, { status: 'pending' });
        
        // Add to download queue
        downloadQueue.addEpisode(episode);
      }
      
      // Clear selection
      setSelectedEpisodes(new Set());
      
      // Refresh episodes list
      onRefresh();
      
      console.log(`Added ${pendingEpisodes.length} episodes to download queue`);
    } catch (error) {
      console.error('Failed to start bulk download:', error);
      onError('Failed to start bulk download');
    }
  }, [selectedEpisodes, episodes, onError, onRefresh]);

  const handleTranscribe = useCallback(async (episode: Episode) => {
    if (!episode.local_file_path) {
      onError('No file path available for transcription');
      return;
    }

    try {
      await transcriptionApi.queueFile(episode.local_file_path);
      console.log(`Queued transcription for episode: ${episode.title}`);
      
      // Refresh episodes list to show updated status
      onRefresh();
      
    } catch (error) {
      console.error('Failed to queue transcription:', error);
      onError(`Failed to start transcription for "${episode.title}"`);
    }
  }, [onError, onRefresh]);

  const statusCounts = useMemo(() => {
    const counts = {
      total: episodes.length,
      pending: 0,
      downloading: 0,
      downloaded: 0,
      transcribed: 0,
      failed: 0
    };

    episodes.forEach(episode => {
      counts[episode.status as keyof typeof counts]++;
    });

    return counts;
  }, [episodes]);

  if (episodes.length === 0) {
    return (
      <div className="episode-list empty">
        <div className="empty-state">
          <h3>No Episodes Yet</h3>
          <p>Upload a CSV file to import podcast episodes</p>
          <button className="btn btn-secondary" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="episode-list">
      <div className="episode-list-header">
        <div className="list-stats">
          <span className="stat-item">
            Total: <strong>{statusCounts.total}</strong>
          </span>
          <span className="stat-item">
            Pending: <strong>{statusCounts.pending}</strong>
          </span>
          <span className="stat-item">
            Downloaded: <strong>{statusCounts.downloaded}</strong>
          </span>
          <span className="stat-item">
            Transcribed: <strong>{statusCounts.transcribed}</strong>
          </span>
          {statusCounts.failed > 0 && (
            <span className="stat-item error">
              Failed: <strong>{statusCounts.failed}</strong>
            </span>
          )}
        </div>

        <div className="list-controls">
          <div className="filter-controls">
            <label htmlFor="status-filter">Filter:</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Episodes</option>
              <option value="pending">Pending</option>
              <option value="downloading">Downloading</option>
              <option value="downloaded">Downloaded</option>
              <option value="transcribed">Transcribed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="sort-controls">
            <label htmlFor="sort-by">Sort by:</label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'status')}
            >
              <option value="date">Date</option>
              <option value="title">Title</option>
              <option value="status">Status</option>
            </select>
          </div>

          <button className="btn btn-secondary" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="bulk-actions">
        <label className="select-all">
          <input
            type="checkbox"
            checked={selectedEpisodes.size === episodes.length}
            onChange={handleSelectAll}
          />
          Select All ({selectedEpisodes.size} selected)
        </label>

        {selectedEpisodes.size > 0 && (
          <div className="bulk-buttons">
            <button 
              className="btn btn-primary"
              onClick={handleBulkDownload}
            >
              Download Selected ({selectedEpisodes.size})
            </button>
          </div>
        )}
      </div>

      <div className="episode-grid">
        {sortedAndFilteredEpisodes.map((episode) => (
          <div key={episode.id} className="episode-card">
            <div className="episode-header">
              <label className="episode-select">
                <input
                  type="checkbox"
                  checked={selectedEpisodes.has(episode.id)}
                  onChange={() => handleSelectEpisode(episode.id)}
                />
              </label>
              <div className="episode-status">
                {getStatusBadge(episode.status, episode.download_progress)}
              </div>
            </div>

            <div className="episode-content">
              <h3 className="episode-title" title={episode.title}>
                {episode.title}
              </h3>
              
              <div className="episode-meta">
                <span className="episode-date">
                  {formatDate(episode.published_date)}
                </span>
                {episode.duration && (
                  <span className="episode-duration">
                    {formatDuration(episode.duration)}
                  </span>
                )}
              </div>

              {episode.description && (
                <p className="episode-description" title={episode.description}>
                  {episode.description.length > 150 
                    ? `${episode.description.substring(0, 150)}...`
                    : episode.description
                  }
                </p>
              )}

              <div className="episode-actions">
                {episode.audio_url && (
                  <a 
                    href={episode.audio_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-link btn-sm"
                  >
                    Original URL
                  </a>
                )}
                
                {episode.status === 'downloaded' && episode.local_file_path && (
                  <button 
                    className="btn btn-link btn-sm"
                    onClick={() => {
                      // This will open the file when we implement it
                      console.log('Open file:', episode.local_file_path);
                    }}
                  >
                    Open File
                  </button>
                )}

                {episode.status === 'downloaded' && episode.local_file_path && 
                 (!episode.transcription_status || 
                  episode.transcription_status === 'none' || 
                  episode.transcription_status === 'failed') && (
                  <button 
                    className="btn btn-link btn-sm"
                    onClick={() => handleTranscribe(episode)}
                  >
                    🎙️ Transcribe
                  </button>
                )}

                {episode.status === 'failed' && (
                  <button 
                    className="btn btn-link btn-sm error"
                    onClick={() => {
                      // This will retry the download
                      console.log('Retry download for episode:', episode.id);
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};