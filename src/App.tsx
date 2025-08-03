import React, { useState, useEffect } from 'react';
import { CSVUploadContainer } from './components/CSVUploadContainer';
import { EpisodeList } from './components/EpisodeList';
import { DownloadManager } from './components/DownloadManager';
import { SettingsPanel } from './components/SettingsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EpisodesAPI, Episode, DirectoriesAPI, apiClient } from './api';
import './styles/App.css';

type TabType = 'episodes' | 'upload' | 'downloads' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('episodes');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if API server is running
      await apiClient.get('/health');
      
      // Ensure directories exist
      await DirectoriesAPI.ensureDirectoriesExist();
      
      // Load episodes
      await loadEpisodes();
      
    } catch (err) {
      setError(`Failed to initialize application: ${err}. Make sure the API server is running on port 3001.`);
      console.error('App initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEpisodes = async () => {
    try {
      const allEpisodes = await EpisodesAPI.getAllEpisodes();
      setEpisodes(allEpisodes);
    } catch (err) {
      console.error('Failed to load episodes:', err);
      setError('Failed to load episodes');
    }
  };

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleImportComplete = () => {
    // Reload episodes after successful import
    loadEpisodes();
    // Switch to episodes tab to see imported episodes
    setActiveTab('episodes');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  if (loading) {
    return (
      <div className="app loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing Podcast Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <header className="app-header">
          <h1>Podcast Episode Manager</h1>
          <p>Download and manage podcast episodes</p>
          
          <nav className="app-nav">
            <button 
              className={`nav-tab ${activeTab === 'episodes' ? 'active' : ''}`}
              onClick={() => handleTabClick('episodes')}
            >
              Episodes
            </button>
            <button 
              className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => handleTabClick('upload')}
            >
              Upload CSV
            </button>
            <button 
              className={`nav-tab ${activeTab === 'downloads' ? 'active' : ''}`}
              onClick={() => handleTabClick('downloads')}
            >
              Downloads
            </button>
            <button 
              className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabClick('settings')}
            >
              Settings
            </button>
          </nav>
        </header>

        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button 
              className="error-close"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}

        <main className="app-main">
          {activeTab === 'episodes' && (
            <EpisodeList 
              data-testid="episode-list"
              episodes={episodes}
              onRefresh={loadEpisodes}
              onError={handleError}
            />
          )}
          
          {activeTab === 'upload' && (
            <CSVUploadContainer
              data-testid="csv-upload"
              onImportComplete={handleImportComplete}
              onError={handleError}
            />
          )}
          
          {activeTab === 'downloads' && (
            <DownloadManager
              data-testid="download-manager"
              onError={handleError}
            />
          )}
          
          {activeTab === 'settings' && (
            <SettingsPanel
              onError={handleError}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;