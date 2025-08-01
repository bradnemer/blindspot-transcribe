import React, { useState } from 'react';
import { CSVUpload } from './CSVUpload';
import { EpisodesDAL } from '../database/dal/episodes';
import { Episode } from '../types';

interface CSVUploadContainerProps {
  onImportComplete: () => void;
  onError: (message: string) => void;
}

interface ImportProgress {
  total: number;
  processed: number;
  errors: string[];
}

export const CSVUploadContainer: React.FC<CSVUploadContainerProps> = ({
  onImportComplete,
  onError,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [previewData, setPreviewData] = useState<Episode[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileValidated = (episodes: Episode[]) => {
    setPreviewData(episodes);
    setShowPreview(true);
    setImportProgress(null);
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    try {
      setIsImporting(true);
      setShowPreview(false);
      
      setImportProgress({
        total: previewData.length,
        processed: 0,
        errors: []
      });

      const episodesDAL = EpisodesDAL.getInstance();
      
      for (let i = 0; i < previewData.length; i++) {
        const episode = previewData[i];
        
        try {
          // Check if episode already exists (by title and published_date)
          const existing = await episodesDAL.findByTitleAndDate(episode.title, episode.published_date);
          
          if (!existing) {
            // Create new episode
            await episodesDAL.create({
              title: episode.title,
              published_date: episode.published_date,
              audio_url: episode.audio_url,
              description: episode.description,
              duration: episode.duration,
              status: 'pending'
            });
          } else {
            setImportProgress(prev => prev ? {
              ...prev,
              errors: [...prev.errors, `Skipped duplicate: ${episode.title}`]
            } : null);
          }
        } catch (episodeError) {
          setImportProgress(prev => prev ? {
            ...prev,
            errors: [...prev.errors, `Failed to import "${episode.title}": ${episodeError}`]
          } : null);
        }
        
        setImportProgress(prev => prev ? {
          ...prev,
          processed: i + 1
        } : null);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Complete import
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(null);
        setPreviewData(null);
        onImportComplete();
      }, 500);

    } catch (error) {
      setIsImporting(false);
      setImportProgress(null);
      onError(`Import failed: ${error}`);
    }
  };

  const handleCancelImport = () => {
    setShowPreview(false);
    setPreviewData(null);
    setImportProgress(null);
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
      return 'Invalid Date';
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const hours = Math.floor(seconds / 60 / 60);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isImporting && importProgress) {
    const percentage = Math.round((importProgress.processed / importProgress.total) * 100);
    
    return (
      <div className="csv-upload-container importing">
        <div className="import-progress">
          <h3>Importing Episodes...</h3>
          
          <div className="progress-bar large">
            <div 
              className="progress-fill" 
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          
          <div className="progress-stats">
            <span>
              {importProgress.processed} of {importProgress.total} episodes imported
            </span>
            <span className="progress-percentage">{percentage}%</span>
          </div>

          {importProgress.errors.length > 0 && (
            <div className="import-errors">
              <h4>Import Warnings:</h4>
              <ul>
                {importProgress.errors.map((error, index) => (
                  <li key={index} className="error-item">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showPreview && previewData) {
    return (
      <div className="csv-upload-container preview">
        <div className="preview-header">
          <h3>Import Preview</h3>
          <p>Found {previewData.length} episodes to import</p>
        </div>

        <div className="preview-stats">
          <div className="stat-card">
            <span className="stat-number">{previewData.length}</span>
            <span className="stat-label">Total Episodes</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {previewData.filter(ep => ep.audio_url).length}
            </span>
            <span className="stat-label">With Audio URLs</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {previewData.filter(ep => ep.duration).length}
            </span>
            <span className="stat-label">With Duration</span>
          </div>
        </div>

        <div className="preview-table-container">
          <table className="preview-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Duration</th>
                <th>Audio URL</th>
              </tr>
            </thead>
            <tbody>
              {previewData.slice(0, 10).map((episode, index) => (
                <tr key={index}>
                  <td className="title-cell" title={episode.title}>
                    {episode.title.length > 50 
                      ? `${episode.title.substring(0, 50)}...`
                      : episode.title
                    }
                  </td>
                  <td>{formatDate(episode.published_date)}</td>
                  <td>{formatDuration(episode.duration)}</td>
                  <td className="url-cell">
                    {episode.audio_url ? (
                      <a 
                        href={episode.audio_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="url-link"
                      >
                        View URL
                      </a>
                    ) : (
                      <span className="no-url">No URL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {previewData.length > 10 && (
            <div className="preview-more">
              <p>... and {previewData.length - 10} more episodes</p>
            </div>
          )}
        </div>

        <div className="preview-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleCancelImport}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleConfirmImport}
          >
            Import {previewData.length} Episodes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="csv-upload-container">
      <div className="upload-header">
        <h2>Import Podcast Episodes</h2>
        <p>Upload a CSV file containing podcast episode information</p>
      </div>

      <div className="csv-format-info">
        <h3>Required CSV Format</h3>
        <div className="format-example">
          <p>Your CSV file should include these columns:</p>
          <ul>
            <li><strong>title</strong> - Episode title (required)</li>
            <li><strong>published_date</strong> - Publication date (YYYY-MM-DD format)</li>
            <li><strong>audio_url</strong> - Direct link to MP3 file (required for downloads)</li>
            <li><strong>description</strong> - Episode description (optional)</li>
            <li><strong>duration</strong> - Duration in seconds (optional)</li>
          </ul>
        </div>

        <div className="format-tips">
          <h4>Tips:</h4>
          <ul>
            <li>Include column headers in the first row</li>
            <li>Dates should be in YYYY-MM-DD format (e.g., 2025-01-15)</li>
            <li>Audio URLs should be direct links to MP3 files</li>
            <li>Duration should be in seconds (e.g., 3600 for 1 hour)</li>
            <li>UTF-8 encoding is recommended for special characters</li>
          </ul>
        </div>
      </div>

      <CSVUpload
        onFileValidated={handleFileValidated}
        onError={onError}
      />

      <div className="upload-examples">
        <h3>Sample CSV Content</h3>
        <pre className="csv-example">
{`title,published_date,audio_url,description,duration
"Episode 1: Getting Started",2025-01-01,https://example.com/ep1.mp3,"Introduction to the series",3600
"Episode 2: Advanced Topics",2025-01-08,https://example.com/ep2.mp3,"Deep dive into advanced concepts",4200`}
        </pre>
      </div>
    </div>
  );
};