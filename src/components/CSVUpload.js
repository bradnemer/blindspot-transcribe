import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { parseCSV } from '../services/csvImporter';
export const CSVUpload = ({ onFileValidated, onError, }) => {
    const [dragActive, setDragActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        }
        else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };
    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };
    const handleFile = async (file) => {
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
        try {
            setIsProcessing(true);
            setProgress(0);
            // Read and parse the CSV file
            const episodes = await parseCSV(file, (progressPercent) => {
                setProgress(progressPercent);
            });
            setProgress(100);
            // Small delay to show 100% completion
            setTimeout(() => {
                setIsProcessing(false);
                setProgress(0);
                onFileValidated(episodes);
            }, 300);
        }
        catch (error) {
            setIsProcessing(false);
            setProgress(0);
            onError(`Failed to parse CSV: ${error}`);
        }
    };
    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };
    return (_jsxs("div", { className: "csv-upload", children: [_jsxs("div", { className: `upload-area ${dragActive ? 'drag-active' : ''} ${isProcessing ? 'processing' : ''}`, onDragEnter: handleDrag, onDragLeave: handleDrag, onDragOver: handleDrag, onDrop: handleDrop, onClick: handleButtonClick, children: [_jsx("input", { ref: fileInputRef, type: "file", accept: ".csv", onChange: handleFileInput, style: { display: 'none' }, disabled: isProcessing }), !isProcessing ? (_jsxs("div", { className: "upload-content", children: [_jsx("div", { className: "upload-icon", children: "\uD83D\uDCC4" }), _jsx("h3", { children: "Upload CSV File" }), _jsx("p", { children: "Drag and drop your episode CSV file here, or click to browse" }), _jsx("p", { className: "upload-hint", children: "Expected format: Episode ID, Podcast ID, Podcast Name, Episode Title, Published Date, Audio URL" }), _jsx("button", { type: "button", className: "upload-button", children: "Choose File" })] })) : (_jsxs("div", { className: "processing-content", children: [_jsxs("div", { className: "progress-container", children: [_jsx("div", { className: "progress-bar", children: _jsx("div", { className: "progress-fill", style: { width: `${progress}%` } }) }), _jsxs("p", { className: "progress-text", children: [Math.round(progress), "% Complete"] })] }), _jsx("p", { children: "Processing CSV file..." })] }))] }), _jsx("style", { jsx: true, children: `
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
      ` })] }));
};
//# sourceMappingURL=CSVUpload.js.map