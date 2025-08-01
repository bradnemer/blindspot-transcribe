import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
export const DownloadManager = ({ onError }) => {
    const [downloads, setDownloads] = useState([]);
    const [isQueueRunning, setIsQueueRunning] = useState(false);
    const [concurrentLimit, setConcurrentLimit] = useState(3);
    const [autoStart, setAutoStart] = useState(true);
    const getQueueStats = () => {
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
    const formatSpeed = (bytesPerSecond) => {
        if (bytesPerSecond === 0)
            return '0 B/s';
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        let speed = bytesPerSecond;
        let unitIndex = 0;
        while (speed >= 1024 && unitIndex < units.length - 1) {
            speed /= 1024;
            unitIndex++;
        }
        return `${speed.toFixed(1)} ${units[unitIndex]}`;
    };
    const formatETA = (seconds) => {
        if (seconds === 0 || !isFinite(seconds))
            return '--:--';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0)
            return '0 B';
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
        setDownloads(prev => prev.map(item => item.status === 'failed' ? { ...item, status: 'queued', error: undefined } : item));
    };
    const handleClearCompleted = () => {
        setDownloads(prev => prev.filter(item => item.status !== 'completed'));
    };
    const handleRemoveItem = (episodeId) => {
        setDownloads(prev => prev.filter(item => item.episode.id !== episodeId));
    };
    const handlePauseItem = (episodeId) => {
        setDownloads(prev => prev.map(item => item.episode.id === episodeId
            ? { ...item, status: 'paused' }
            : item));
    };
    const handleResumeItem = (episodeId) => {
        setDownloads(prev => prev.map(item => item.episode.id === episodeId
            ? { ...item, status: 'queued' }
            : item));
    };
    // Simulate some sample downloads for demo purposes
    useEffect(() => {
        if (downloads.length === 0) {
            const sampleDownloads = [
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
    return (_jsxs("div", { className: "download-manager", children: [_jsxs("div", { className: "download-header", children: [_jsx("h2", { children: "Download Manager" }), _jsx("p", { children: "Monitor and control podcast episode downloads" })] }), _jsxs("div", { className: "queue-controls", children: [_jsxs("div", { className: "queue-stats", children: [_jsxs("div", { className: "stat-item", children: [_jsx("span", { className: "stat-number", children: stats.total }), _jsx("span", { className: "stat-label", children: "Total" })] }), _jsxs("div", { className: "stat-item", children: [_jsx("span", { className: "stat-number downloading", children: stats.downloading }), _jsx("span", { className: "stat-label", children: "Downloading" })] }), _jsxs("div", { className: "stat-item", children: [_jsx("span", { className: "stat-number", children: stats.queued }), _jsx("span", { className: "stat-label", children: "Queued" })] }), _jsxs("div", { className: "stat-item", children: [_jsx("span", { className: "stat-number completed", children: stats.completed }), _jsx("span", { className: "stat-label", children: "Completed" })] }), stats.failed > 0 && (_jsxs("div", { className: "stat-item", children: [_jsx("span", { className: "stat-number failed", children: stats.failed }), _jsx("span", { className: "stat-label", children: "Failed" })] }))] }), _jsxs("div", { className: "queue-actions", children: [_jsxs("div", { className: "primary-controls", children: [!isQueueRunning ? (_jsx("button", { className: "btn btn-primary", onClick: handleStartQueue, disabled: stats.queued === 0 && stats.downloading === 0, children: "Start Queue" })) : (_jsx("button", { className: "btn btn-warning", onClick: handlePauseQueue, children: "Pause Queue" })), _jsx("button", { className: "btn btn-secondary", onClick: handleStopQueue, disabled: stats.total === 0, children: "Stop All" })] }), _jsxs("div", { className: "secondary-controls", children: [stats.failed > 0 && (_jsxs("button", { className: "btn btn-link", onClick: handleRetryFailed, children: ["Retry Failed (", stats.failed, ")"] })), stats.completed > 0 && (_jsxs("button", { className: "btn btn-link", onClick: handleClearCompleted, children: ["Clear Completed (", stats.completed, ")"] }))] })] }), _jsxs("div", { className: "queue-settings", children: [_jsxs("label", { htmlFor: "concurrent-limit", children: ["Concurrent Downloads:", _jsxs("select", { id: "concurrent-limit", value: concurrentLimit, onChange: (e) => setConcurrentLimit(Number(e.target.value)), children: [_jsx("option", { value: 1, children: "1" }), _jsx("option", { value: 2, children: "2" }), _jsx("option", { value: 3, children: "3" }), _jsx("option", { value: 4, children: "4" }), _jsx("option", { value: 5, children: "5" })] })] }), _jsxs("label", { className: "checkbox-label", children: [_jsx("input", { type: "checkbox", checked: autoStart, onChange: (e) => setAutoStart(e.target.checked) }), "Auto-start new downloads"] })] })] }), downloads.length === 0 ? (_jsxs("div", { className: "empty-downloads", children: [_jsx("h3", { children: "No Downloads" }), _jsx("p", { children: "Start downloading episodes from the Episodes tab" })] })) : (_jsx("div", { className: "download-list", children: downloads.map((item) => (_jsxs("div", { className: `download-item ${item.status}`, children: [_jsxs("div", { className: "download-info", children: [_jsx("h4", { className: "episode-title", title: item.episode.title, children: item.episode.title.length > 60
                                        ? `${item.episode.title.substring(0, 60)}...`
                                        : item.episode.title }), _jsxs("div", { className: "download-meta", children: [_jsx("span", { className: "episode-date", children: new Date(item.episode.published_date).toLocaleDateString() }), item.episode.audio_url && (_jsx("a", { href: item.episode.audio_url, target: "_blank", rel: "noopener noreferrer", className: "source-link", children: "Source" }))] })] }), _jsxs("div", { className: "download-progress", children: [item.status === 'downloading' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "progress-bar", children: [_jsx("div", { className: "progress-fill", style: { width: `${item.progress}%` } }), _jsxs("span", { className: "progress-text", children: [item.progress, "%"] })] }), _jsxs("div", { className: "progress-details", children: [_jsx("span", { className: "download-speed", children: formatSpeed(item.speed) }), _jsxs("span", { className: "download-eta", children: ["ETA: ", formatETA(item.eta)] })] })] })), item.status === 'completed' && (_jsxs("div", { className: "status-completed", children: [_jsx("span", { className: "status-icon", children: "\u2713" }), _jsx("span", { children: "Download Complete" })] })), item.status === 'failed' && (_jsxs("div", { className: "status-failed", children: [_jsx("span", { className: "status-icon", children: "\u2717" }), _jsxs("span", { children: ["Failed: ", item.error || 'Unknown error'] })] })), item.status === 'queued' && (_jsxs("div", { className: "status-queued", children: [_jsx("span", { className: "status-icon", children: "\u23F3" }), _jsx("span", { children: "Queued" })] })), item.status === 'paused' && (_jsxs("div", { className: "status-paused", children: [_jsx("span", { className: "status-icon", children: "\u23F8" }), _jsx("span", { children: "Paused" })] }))] }), _jsxs("div", { className: "download-actions", children: [item.status === 'downloading' && (_jsx("button", { className: "btn btn-sm btn-secondary", onClick: () => handlePauseItem(item.episode.id), children: "Pause" })), item.status === 'paused' && (_jsx("button", { className: "btn btn-sm btn-primary", onClick: () => handleResumeItem(item.episode.id), children: "Resume" })), item.status === 'failed' && (_jsx("button", { className: "btn btn-sm btn-primary", onClick: () => handleResumeItem(item.episode.id), children: "Retry" })), (item.status === 'queued' || item.status === 'completed' || item.status === 'failed') && (_jsx("button", { className: "btn btn-sm btn-link remove-btn", onClick: () => handleRemoveItem(item.episode.id), children: "Remove" }))] })] }, item.episode.id))) }))] }));
};
//# sourceMappingURL=DownloadManager.js.map