import React from 'react';

export interface ProgressStats {
  total: number;
  downloaded: number;
  downloading: number;
  pending: number;
  failed: number;
  percentage: number;
}

interface OverallProgressBarProps {
  stats: ProgressStats;
  className?: string;
}

export const OverallProgressBar: React.FC<OverallProgressBarProps> = ({ stats, className = '' }) => {
  const { total, downloaded, downloading, pending, failed, percentage } = stats;

  if (total === 0) {
    return null;
  }

  const downloadedWidth = (downloaded / total) * 100;
  const downloadingWidth = (downloading / total) * 100;
  const failedWidth = (failed / total) * 100;
  const pendingWidth = (pending / total) * 100;

  return (
    <div className={`overall-progress-container ${className}`}>
      <div className="progress-header">
        <h3 className="progress-title">Overall Download Progress</h3>
        <span className="progress-percentage">{percentage.toFixed(1)}%</span>
      </div>
      
      <div className="progress-bar-container">
        <div className="progress-bar-track">
          {/* Downloaded segments */}
          <div 
            className="progress-segment progress-downloaded"
            style={{ width: `${downloadedWidth}%` }}
          />
          {/* Downloading segments */}
          <div 
            className="progress-segment progress-downloading"
            style={{ 
              width: `${downloadingWidth}%`,
              left: `${downloadedWidth}%`
            }}
          />
          {/* Failed segments */}
          <div 
            className="progress-segment progress-failed"
            style={{ 
              width: `${failedWidth}%`,
              left: `${downloadedWidth + downloadingWidth}%`
            }}
          />
          {/* Pending segments (fills remaining space) */}
          <div 
            className="progress-segment progress-pending"
            style={{ 
              width: `${pendingWidth}%`,
              left: `${downloadedWidth + downloadingWidth + failedWidth}%`
            }}
          />
        </div>
      </div>
      
      <div className="progress-legend">
        <div className="legend-item">
          <div className="legend-color legend-downloaded"></div>
          <span>{downloaded} Downloaded</span>
        </div>
        {downloading > 0 && (
          <div className="legend-item">
            <div className="legend-color legend-downloading"></div>
            <span>{downloading} Downloading</span>
          </div>
        )}
        {pending > 0 && (
          <div className="legend-item">
            <div className="legend-color legend-pending"></div>
            <span>{pending} Pending</span>
          </div>
        )}
        {failed > 0 && (
          <div className="legend-item">
            <div className="legend-color legend-failed"></div>
            <span>{failed} Failed</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to calculate progress stats from episodes
export const calculateProgressStats = (episodes: any[]): ProgressStats => {
  const total = episodes.length;
  const downloaded = episodes.filter(ep => ep.download_status === 'downloaded').length;
  const downloading = episodes.filter(ep => ep.download_status === 'downloading').length;
  const pending = episodes.filter(ep => ep.download_status === 'pending').length;
  const failed = episodes.filter(ep => ep.download_status === 'failed').length;
  
  const percentage = total > 0 ? (downloaded / total) * 100 : 0;
  
  return {
    total,
    downloaded,
    downloading,
    pending,
    failed,
    percentage
  };
};

export default OverallProgressBar;