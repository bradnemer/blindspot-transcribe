import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { CSVUpload } from './CSVUpload';
import { EpisodesDAL } from '../database/dal/episodes';
export const CSVUploadContainer = ({ onImportComplete, onError, }) => {
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const handleFileValidated = (episodes) => {
        setPreviewData(episodes);
        setShowPreview(true);
        setImportProgress(null);
    };
    const handleConfirmImport = async () => {
        if (!previewData)
            return;
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
                    }
                    else {
                        setImportProgress(prev => prev ? {
                            ...prev,
                            errors: [...prev.errors, `Skipped duplicate: ${episode.title}`]
                        } : null);
                    }
                }
                catch (episodeError) {
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
        }
        catch (error) {
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
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        catch {
            return 'Invalid Date';
        }
    };
    const formatDuration = (seconds) => {
        if (!seconds)
            return '--:--';
        const hours = Math.floor(seconds / 60 / 60);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };
    if (isImporting && importProgress) {
        const percentage = Math.round((importProgress.processed / importProgress.total) * 100);
        return (_jsx("div", { className: "csv-upload-container importing", children: _jsxs("div", { className: "import-progress", children: [_jsx("h3", { children: "Importing Episodes..." }), _jsx("div", { className: "progress-bar large", children: _jsx("div", { className: "progress-fill", style: { width: `${percentage}%` } }) }), _jsxs("div", { className: "progress-stats", children: [_jsxs("span", { children: [importProgress.processed, " of ", importProgress.total, " episodes imported"] }), _jsxs("span", { className: "progress-percentage", children: [percentage, "%"] })] }), importProgress.errors.length > 0 && (_jsxs("div", { className: "import-errors", children: [_jsx("h4", { children: "Import Warnings:" }), _jsx("ul", { children: importProgress.errors.map((error, index) => (_jsx("li", { className: "error-item", children: error }, index))) })] }))] }) }));
    }
    if (showPreview && previewData) {
        return (_jsxs("div", { className: "csv-upload-container preview", children: [_jsxs("div", { className: "preview-header", children: [_jsx("h3", { children: "Import Preview" }), _jsxs("p", { children: ["Found ", previewData.length, " episodes to import"] })] }), _jsxs("div", { className: "preview-stats", children: [_jsxs("div", { className: "stat-card", children: [_jsx("span", { className: "stat-number", children: previewData.length }), _jsx("span", { className: "stat-label", children: "Total Episodes" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { className: "stat-number", children: previewData.filter(ep => ep.audio_url).length }), _jsx("span", { className: "stat-label", children: "With Audio URLs" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { className: "stat-number", children: previewData.filter(ep => ep.duration).length }), _jsx("span", { className: "stat-label", children: "With Duration" })] })] }), _jsxs("div", { className: "preview-table-container", children: [_jsxs("table", { className: "preview-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Title" }), _jsx("th", { children: "Date" }), _jsx("th", { children: "Duration" }), _jsx("th", { children: "Audio URL" })] }) }), _jsx("tbody", { children: previewData.slice(0, 10).map((episode, index) => (_jsxs("tr", { children: [_jsx("td", { className: "title-cell", title: episode.title, children: episode.title.length > 50
                                                    ? `${episode.title.substring(0, 50)}...`
                                                    : episode.title }), _jsx("td", { children: formatDate(episode.published_date) }), _jsx("td", { children: formatDuration(episode.duration) }), _jsx("td", { className: "url-cell", children: episode.audio_url ? (_jsx("a", { href: episode.audio_url, target: "_blank", rel: "noopener noreferrer", className: "url-link", children: "View URL" })) : (_jsx("span", { className: "no-url", children: "No URL" })) })] }, index))) })] }), previewData.length > 10 && (_jsx("div", { className: "preview-more", children: _jsxs("p", { children: ["... and ", previewData.length - 10, " more episodes"] }) }))] }), _jsxs("div", { className: "preview-actions", children: [_jsx("button", { className: "btn btn-secondary", onClick: handleCancelImport, children: "Cancel" }), _jsxs("button", { className: "btn btn-primary", onClick: handleConfirmImport, children: ["Import ", previewData.length, " Episodes"] })] })] }));
    }
    return (_jsxs("div", { className: "csv-upload-container", children: [_jsxs("div", { className: "upload-header", children: [_jsx("h2", { children: "Import Podcast Episodes" }), _jsx("p", { children: "Upload a CSV file containing podcast episode information" })] }), _jsxs("div", { className: "csv-format-info", children: [_jsx("h3", { children: "Required CSV Format" }), _jsxs("div", { className: "format-example", children: [_jsx("p", { children: "Your CSV file should include these columns:" }), _jsxs("ul", { children: [_jsxs("li", { children: [_jsx("strong", { children: "title" }), " - Episode title (required)"] }), _jsxs("li", { children: [_jsx("strong", { children: "published_date" }), " - Publication date (YYYY-MM-DD format)"] }), _jsxs("li", { children: [_jsx("strong", { children: "audio_url" }), " - Direct link to MP3 file (required for downloads)"] }), _jsxs("li", { children: [_jsx("strong", { children: "description" }), " - Episode description (optional)"] }), _jsxs("li", { children: [_jsx("strong", { children: "duration" }), " - Duration in seconds (optional)"] })] })] }), _jsxs("div", { className: "format-tips", children: [_jsx("h4", { children: "Tips:" }), _jsxs("ul", { children: [_jsx("li", { children: "Include column headers in the first row" }), _jsx("li", { children: "Dates should be in YYYY-MM-DD format (e.g., 2025-01-15)" }), _jsx("li", { children: "Audio URLs should be direct links to MP3 files" }), _jsx("li", { children: "Duration should be in seconds (e.g., 3600 for 1 hour)" }), _jsx("li", { children: "UTF-8 encoding is recommended for special characters" })] })] })] }), _jsx(CSVUpload, { onFileValidated: handleFileValidated, onError: onError }), _jsxs("div", { className: "upload-examples", children: [_jsx("h3", { children: "Sample CSV Content" }), _jsx("pre", { className: "csv-example", children: `title,published_date,audio_url,description,duration
"Episode 1: Getting Started",2025-01-01,https://example.com/ep1.mp3,"Introduction to the series",3600
"Episode 2: Advanced Topics",2025-01-08,https://example.com/ep2.mp3,"Deep dive into advanced concepts",4200` })] })] }));
};
//# sourceMappingURL=CSVUploadContainer.js.map