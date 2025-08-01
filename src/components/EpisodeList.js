import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const EpisodeList = ({ episodes, onRefresh, onError }) => {
    const [selectedEpisodes, setSelectedEpisodes] = useState(new Set());
    const [sortBy, setSortBy] = useState('date');
    const [filterStatus, setFilterStatus] = useState('all');
    const getStatusBadge = (status, progress) => {
        switch (status) {
            case 'downloading':
                return (_jsxs("div", { className: "status-badge downloading", children: [_jsx("span", { className: "status-text", children: "Downloading" }), progress !== undefined && (_jsxs("div", { className: "progress-bar", children: [_jsx("div", { className: "progress-fill", style: { width: `${progress}%` } }), _jsxs("span", { className: "progress-text", children: [progress, "%"] })] }))] }));
            case 'downloaded':
                return _jsx("span", { className: "status-badge downloaded", children: "Downloaded" });
            case 'transcribed':
                return _jsx("span", { className: "status-badge transcribed", children: "Transcribed" });
            case 'failed':
                return _jsx("span", { className: "status-badge failed", children: "Failed" });
            case 'pending':
            default:
                return _jsx("span", { className: "status-badge pending", children: "Pending" });
        }
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
            return 'Unknown Date';
        }
    };
    const formatDuration = (seconds) => {
        if (!seconds)
            return '--:--';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    const sortedAndFilteredEpisodes = episodes
        .filter(episode => {
        if (filterStatus === 'all')
            return true;
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
    const handleSelectEpisode = (episodeId) => {
        const newSelected = new Set(selectedEpisodes);
        if (newSelected.has(episodeId)) {
            newSelected.delete(episodeId);
        }
        else {
            newSelected.add(episodeId);
        }
        setSelectedEpisodes(newSelected);
    };
    const handleSelectAll = () => {
        if (selectedEpisodes.size === episodes.length) {
            setSelectedEpisodes(new Set());
        }
        else {
            setSelectedEpisodes(new Set(episodes.map(ep => ep.id)));
        }
    };
    const handleBulkDownload = () => {
        if (selectedEpisodes.size === 0) {
            onError('No episodes selected for download');
            return;
        }
        const pendingEpisodes = episodes.filter(ep => selectedEpisodes.has(ep.id) && ep.status === 'pending');
        if (pendingEpisodes.length === 0) {
            onError('No pending episodes selected');
            return;
        }
        // This will be implemented when we connect the download queue
        console.log('Starting bulk download for episodes:', pendingEpisodes.map(ep => ep.id));
        onError('Download functionality will be connected in next phase');
    };
    const getStatusCounts = () => {
        const counts = {
            total: episodes.length,
            pending: 0,
            downloading: 0,
            downloaded: 0,
            transcribed: 0,
            failed: 0
        };
        episodes.forEach(episode => {
            counts[episode.status]++;
        });
        return counts;
    };
    const statusCounts = getStatusCounts();
    if (episodes.length === 0) {
        return (_jsx("div", { className: "episode-list empty", children: _jsxs("div", { className: "empty-state", children: [_jsx("h3", { children: "No Episodes Yet" }), _jsx("p", { children: "Upload a CSV file to import podcast episodes" }), _jsx("button", { className: "btn btn-secondary", onClick: onRefresh, children: "Refresh" })] }) }));
    }
    return (_jsxs("div", { className: "episode-list", children: [_jsxs("div", { className: "episode-list-header", children: [_jsxs("div", { className: "list-stats", children: [_jsxs("span", { className: "stat-item", children: ["Total: ", _jsx("strong", { children: statusCounts.total })] }), _jsxs("span", { className: "stat-item", children: ["Pending: ", _jsx("strong", { children: statusCounts.pending })] }), _jsxs("span", { className: "stat-item", children: ["Downloaded: ", _jsx("strong", { children: statusCounts.downloaded })] }), _jsxs("span", { className: "stat-item", children: ["Transcribed: ", _jsx("strong", { children: statusCounts.transcribed })] }), statusCounts.failed > 0 && (_jsxs("span", { className: "stat-item error", children: ["Failed: ", _jsx("strong", { children: statusCounts.failed })] }))] }), _jsxs("div", { className: "list-controls", children: [_jsxs("div", { className: "filter-controls", children: [_jsx("label", { htmlFor: "status-filter", children: "Filter:" }), _jsxs("select", { id: "status-filter", value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), children: [_jsx("option", { value: "all", children: "All Episodes" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "downloading", children: "Downloading" }), _jsx("option", { value: "downloaded", children: "Downloaded" }), _jsx("option", { value: "transcribed", children: "Transcribed" }), _jsx("option", { value: "failed", children: "Failed" })] })] }), _jsxs("div", { className: "sort-controls", children: [_jsx("label", { htmlFor: "sort-by", children: "Sort by:" }), _jsxs("select", { id: "sort-by", value: sortBy, onChange: (e) => setSortBy(e.target.value), children: [_jsx("option", { value: "date", children: "Date" }), _jsx("option", { value: "title", children: "Title" }), _jsx("option", { value: "status", children: "Status" })] })] }), _jsx("button", { className: "btn btn-secondary", onClick: onRefresh, children: "Refresh" })] })] }), _jsxs("div", { className: "bulk-actions", children: [_jsxs("label", { className: "select-all", children: [_jsx("input", { type: "checkbox", checked: selectedEpisodes.size === episodes.length, onChange: handleSelectAll }), "Select All (", selectedEpisodes.size, " selected)"] }), selectedEpisodes.size > 0 && (_jsx("div", { className: "bulk-buttons", children: _jsxs("button", { className: "btn btn-primary", onClick: handleBulkDownload, children: ["Download Selected (", selectedEpisodes.size, ")"] }) }))] }), _jsx("div", { className: "episode-grid", children: sortedAndFilteredEpisodes.map((episode) => (_jsxs("div", { className: "episode-card", children: [_jsxs("div", { className: "episode-header", children: [_jsx("label", { className: "episode-select", children: _jsx("input", { type: "checkbox", checked: selectedEpisodes.has(episode.id), onChange: () => handleSelectEpisode(episode.id) }) }), _jsx("div", { className: "episode-status", children: getStatusBadge(episode.status, episode.download_progress) })] }), _jsxs("div", { className: "episode-content", children: [_jsx("h3", { className: "episode-title", title: episode.title, children: episode.title }), _jsxs("div", { className: "episode-meta", children: [_jsx("span", { className: "episode-date", children: formatDate(episode.published_date) }), episode.duration && (_jsx("span", { className: "episode-duration", children: formatDuration(episode.duration) }))] }), episode.description && (_jsx("p", { className: "episode-description", title: episode.description, children: episode.description.length > 150
                                        ? `${episode.description.substring(0, 150)}...`
                                        : episode.description })), _jsxs("div", { className: "episode-actions", children: [episode.audio_url && (_jsx("a", { href: episode.audio_url, target: "_blank", rel: "noopener noreferrer", className: "btn btn-link btn-sm", children: "Original URL" })), episode.status === 'downloaded' && episode.local_file_path && (_jsx("button", { className: "btn btn-link btn-sm", onClick: () => {
                                                // This will open the file when we implement it
                                                console.log('Open file:', episode.local_file_path);
                                            }, children: "Open File" })), episode.status === 'failed' && (_jsx("button", { className: "btn btn-link btn-sm error", onClick: () => {
                                                // This will retry the download
                                                console.log('Retry download for episode:', episode.id);
                                            }, children: "Retry" }))] })] })] }, episode.id))) })] }));
};
//# sourceMappingURL=EpisodeList.js.map