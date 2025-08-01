import React, { useState } from 'react';
import { CSVUpload } from './CSVUpload';
import { EpisodeImporter, ImportResult } from '../services/episodeImporter';
import { Episode } from '../types';

interface CSVUploadContainerProps {
  onImportComplete?: (result: ImportResult) => void;
  onError?: (error: string) => void;
}

export const CSVUploadContainer: React.FC<CSVUploadContainerProps> = ({
  onImportComplete,
  onError,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [previewData, setPreviewData] = useState<Episode[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelected = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Validating file...');
    setPreviewData([]);
    setShowPreview(false);
    setImportResult(null);

    try {
      // First, validate the file
      const validation = await EpisodeImporter.validateCSVFile(file);
      
      if (!validation.isValid) {
        setIsProcessing(false);
        if (onError) {
          onError(`Validation failed: ${validation.errors.join(', ')}`);
        }
        return;
      }

      setProgress(10);
      setCurrentStep('Getting preview...');

      // Get preview data
      const preview = await EpisodeImporter.previewCSVFile(file, 3);
      setPreviewData(preview.episodes);
      setShowPreview(true);
      setProgress(20);
      setCurrentStep('Ready to import');

      // Auto-start import after preview
      setTimeout(() => {
        startImport(file);
      }, 2000);

    } catch (error) {
      setIsProcessing(false);
      if (onError) {
        onError(`File processing failed: ${error}`);
      }
    }
  };

  const startImport = async (file: File) => {
    setCurrentStep('Importing episodes...');
    setProgress(20);

    try {
      const result = await EpisodeImporter.importFromFile(file, (importProgress) => {
        setProgress(20 + (importProgress * 0.8));
      });

      setImportResult(result);
      setIsProcessing(false);
      setProgress(100);
      setCurrentStep('Import complete');

      if (onImportComplete) {
        onImportComplete(result);
      }

      if (!result.success && onError) {
        onError(`Import failed: ${result.errors.join(', ')}`);
      }

    } catch (error) {
      setIsProcessing(false);
      if (onError) {
        onError(`Import failed: ${error}`);
      }
    }
  };

  const handleReset = () => {
    setIsProcessing(false);
    setProgress(0);
    setCurrentStep('');
    setPreviewData([]);
    setShowPreview(false);
    setImportResult(null);
  };

  return (
    <div className="csv-upload-container">
      <CSVUpload
        onFileSelected={handleFileSelected}
        onUploadComplete={() => {}}
        onError={onError || (() => {})}
        isProcessing={isProcessing}
        progress={progress}
      />

      {currentStep && (
        <div className="status-section">
          <p className="status-text">{currentStep}</p>
        </div>
      )}

      {showPreview && previewData.length > 0 && (
        <div className="preview-section">
          <h3>Preview (first 3 episodes):</h3>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  <th>Episode ID</th>
                  <th>Podcast</th>
                  <th>Title</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((episode) => (
                  <tr key={episode.episode_id}>
                    <td>{episode.episode_id}</td>
                    <td>{episode.podcast_name}</td>
                    <td className="episode-title">{episode.episode_title}</td>
                    <td>{new Date(episode.published_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importResult && (
        <div className="result-section">
          <div className={`result-summary ${importResult.success ? 'success' : 'error'}`}>
            <h3>Import Results</h3>
            <div className="result-stats">
              <div className="stat">
                <span className="stat-label">Imported:</span>
                <span className="stat-value">{importResult.imported}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Skipped:</span>
                <span className="stat-value">{importResult.skipped}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Duplicates:</span>
                <span className="stat-value">{importResult.duplicates}</span>
              </div>
            </div>
          </div>

          {importResult.warnings.length > 0 && (
            <div className="warnings">
              <h4>Warnings:</h4>
              <ul>
                {importResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {importResult.errors.length > 0 && (
            <div className="errors">
              <h4>Errors:</h4>
              <ul>
                {importResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <button type="button" onClick={handleReset} className="reset-button">
            Import Another File
          </button>
        </div>
      )}

      <style jsx>{`
        .csv-upload-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 1rem;
        }

        .status-section {
          margin-top: 1rem;
          text-align: center;
        }

        .status-text {
          font-size: 1rem;
          color: #666;
          margin: 0;
        }

        .preview-section {
          margin-top: 2rem;
          padding: 1rem;
          background-color: #f8f9fa;
          border-radius: 8px;
        }

        .preview-section h3 {
          margin: 0 0 1rem 0;
          color: #333;
        }

        .preview-table {
          overflow-x: auto;
        }

        .preview-table table {
          width: 100%;
          border-collapse: collapse;
          background-color: white;
          border-radius: 4px;
          overflow: hidden;
        }

        .preview-table th,
        .preview-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        .preview-table th {
          background-color: #e9ecef;
          font-weight: 600;
          color: #495057;
        }

        .episode-title {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .result-section {
          margin-top: 2rem;
          padding: 1rem;
          border-radius: 8px;
        }

        .result-summary {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .result-summary.success {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }

        .result-summary.error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .result-summary h3 {
          margin: 0 0 1rem 0;
        }

        .result-stats {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #666;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 0.25rem;
        }

        .warnings,
        .errors {
          margin-top: 1rem;
        }

        .warnings h4,
        .errors h4 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        .warnings {
          color: #856404;
        }

        .errors {
          color: #721c24;
        }

        .warnings ul,
        .errors ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .warnings li,
        .errors li {
          margin-bottom: 0.25rem;
        }

        .reset-button {
          margin-top: 1rem;
          background-color: #007bff;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .reset-button:hover {
          background-color: #0056b3;
        }
      `}</style>
    </div>
  );
};