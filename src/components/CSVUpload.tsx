import React, { useState, useRef } from 'react';
import { CSVRow } from '../types';

interface CSVUploadProps {
  onFileSelected: (file: File) => void;
  onUploadComplete: (episodes: CSVRow[]) => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
  progress?: number;
}

export const CSVUpload: React.FC<CSVUploadProps> = ({
  onFileSelected,
  onUploadComplete,
  onError,
  isProcessing = false,
  progress = 0,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError('Please select a CSV file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError('File size must be less than 10MB');
      return;
    }

    onFileSelected(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="csv-upload">
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${
          isProcessing ? 'processing' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={isProcessing}
        />

        {!isProcessing ? (
          <div className="upload-content">
            <div className="upload-icon">📄</div>
            <h3>Upload CSV File</h3>
            <p>
              Drag and drop your episode CSV file here, or click to browse
            </p>
            <p className="upload-hint">
              Expected format: Episode ID, Podcast ID, Podcast Name, Episode Title, Published Date, Audio URL
            </p>
            <button type="button" className="upload-button">
              Choose File
            </button>
          </div>
        ) : (
          <div className="processing-content">
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="progress-text">{Math.round(progress)}% Complete</p>
            </div>
            <p>Processing CSV file...</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .csv-upload {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .upload-area {
          border: 2px dashed #ddd;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background-color: #fafafa;
        }

        .upload-area:hover {
          border-color: #007bff;
          background-color: #f8f9ff;
        }

        .upload-area.drag-active {
          border-color: #007bff;
          background-color: #e6f3ff;
        }

        .upload-area.processing {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .upload-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .upload-content h3 {
          margin: 0;
          color: #333;
          font-size: 1.5rem;
        }

        .upload-content p {
          margin: 0;
          color: #666;
          font-size: 1rem;
        }

        .upload-hint {
          font-size: 0.875rem !important;
          color: #888 !important;
          font-style: italic;
        }

        .upload-button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          margin-top: 0.5rem;
        }

        .upload-button:hover {
          background-color: #0056b3;
        }

        .processing-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .progress-container {
          width: 100%;
          max-width: 300px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background-color: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background-color: #007bff;
          transition: width 0.3s ease;
        }

        .progress-text {
          margin: 0;
          font-size: 0.875rem;
          color: #666;
          text-align: center;
        }
      `}</style>
    </div>
  );
};