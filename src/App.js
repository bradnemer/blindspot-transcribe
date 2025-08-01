import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { CSVUploadContainer } from './components/CSVUploadContainer';
import { EpisodeList } from './components/EpisodeList';
import { DownloadManager } from './components/DownloadManager';
import { SettingsPanel } from './components/SettingsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeDatabase } from './database';
import { EpisodesDAL } from './database/dal/episodes';
import './styles/App.css';
function App() {
    const [activeTab, setActiveTab] = useState('episodes');
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        initializeApp();
    }, []);
    const initializeApp = async () => {
        try {
            setLoading(true);
            setError(null);
            // Initialize database
            initializeDatabase();
            // Load episodes
            await loadEpisodes();
        }
        catch (err) {
            setError(`Failed to initialize application: ${err}`);
            console.error('App initialization error:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const loadEpisodes = async () => {
        try {
            const episodesDAL = EpisodesDAL.getInstance();
            const allEpisodes = await episodesDAL.getAll();
            setEpisodes(allEpisodes);
        }
        catch (err) {
            console.error('Failed to load episodes:', err);
            setError('Failed to load episodes');
        }
    };
    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };
    const handleImportComplete = () => {
        // Reload episodes after successful import
        loadEpisodes();
        // Switch to episodes tab to see imported episodes
        setActiveTab('episodes');
    };
    const handleError = (errorMessage) => {
        setError(errorMessage);
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
    };
    if (loading) {
        return (_jsx("div", { className: "app loading", children: _jsxs("div", { className: "loading-spinner", children: [_jsx("div", { className: "spinner" }), _jsx("p", { children: "Initializing Podcast Manager..." })] }) }));
    }
    return (_jsx(ErrorBoundary, { children: _jsxs("div", { className: "app", children: [_jsxs("header", { className: "app-header", children: [_jsx("h1", { children: "Podcast Manager" }), _jsx("p", { children: "Download and manage podcast episodes" }), _jsxs("nav", { className: "app-nav", children: [_jsx("button", { className: `nav-tab ${activeTab === 'episodes' ? 'active' : ''}`, onClick: () => handleTabClick('episodes'), children: "Episodes" }), _jsx("button", { className: `nav-tab ${activeTab === 'upload' ? 'active' : ''}`, onClick: () => handleTabClick('upload'), children: "Upload CSV" }), _jsx("button", { className: `nav-tab ${activeTab === 'downloads' ? 'active' : ''}`, onClick: () => handleTabClick('downloads'), children: "Downloads" }), _jsx("button", { className: `nav-tab ${activeTab === 'settings' ? 'active' : ''}`, onClick: () => handleTabClick('settings'), children: "Settings" })] })] }), error && (_jsxs("div", { className: "error-banner", children: [_jsx("span", { className: "error-icon", children: "\u26A0\uFE0F" }), _jsx("span", { className: "error-message", children: error }), _jsx("button", { className: "error-close", onClick: () => setError(null), children: "\u00D7" })] })), _jsxs("main", { className: "app-main", children: [activeTab === 'episodes' && (_jsx(EpisodeList, { episodes: episodes, onRefresh: loadEpisodes, onError: handleError })), activeTab === 'upload' && (_jsx(CSVUploadContainer, { onImportComplete: handleImportComplete, onError: handleError })), activeTab === 'downloads' && (_jsx(DownloadManager, { onError: handleError })), activeTab === 'settings' && (_jsx(SettingsPanel, { onError: handleError }))] })] }) }));
}
export default App;
//# sourceMappingURL=App.js.map