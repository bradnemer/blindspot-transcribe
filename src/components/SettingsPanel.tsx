import React, { useState, useEffect } from 'react';

interface SettingsPanelProps {
  onError: (message: string) => void;
}

interface AppSettings {
  downloads: {
    concurrent_limit: number;
    auto_start: boolean;
    retry_attempts: number;
    timeout_seconds: number;
    destination_folder: string;
  };
  storage: {
    database_location: string;
    auto_cleanup: boolean;
    max_storage_gb: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    compact_view: boolean;
    show_notifications: boolean;
    auto_refresh_interval: number;
  };
  transcription: {
    auto_transcribe: boolean;
    language: string;
    model_quality: 'fast' | 'balanced' | 'accurate';
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  downloads: {
    concurrent_limit: 3,
    auto_start: true,
    retry_attempts: 3,
    timeout_seconds: 300,
    destination_folder: './downloads'
  },
  storage: {
    database_location: './podcast-manager.db',
    auto_cleanup: false,
    max_storage_gb: 10
  },
  ui: {
    theme: 'auto',
    compact_view: false,
    show_notifications: true,
    auto_refresh_interval: 30
  },
  transcription: {
    auto_transcribe: false,
    language: 'en',
    model_quality: 'balanced'
  }
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onError }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof AppSettings>('downloads');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // This will load settings from localStorage or config file
      const savedSettings = localStorage.getItem('podcast-manager-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      onError('Failed to load settings');
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Save to localStorage for now - will be connected to backend later
      localStorage.setItem('podcast-manager-settings', JSON.stringify(settings));
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setHasChanges(false);
      
      // Show success message briefly
      const successMsg = 'Settings saved successfully';
      console.log(successMsg);
      
    } catch (error) {
      onError(`Failed to save settings: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  const updateSetting = <T extends keyof AppSettings>(
    category: T,
    key: keyof AppSettings[T],
    value: AppSettings[T][keyof AppSettings[T]]
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const renderDownloadSettings = () => (
    <div className="settings-section">
      <h3>Download Settings</h3>
      
      <div className="setting-group">
        <label htmlFor="concurrent-limit">
          Concurrent Downloads
          <select
            id="concurrent-limit"
            value={settings.downloads.concurrent_limit}
            onChange={(e) => updateSetting('downloads', 'concurrent_limit', Number(e.target.value))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </label>
        <p className="setting-description">
          Number of episodes to download simultaneously
        </p>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.downloads.auto_start}
            onChange={(e) => updateSetting('downloads', 'auto_start', e.target.checked)}
          />
          Auto-start downloads
        </label>
        <p className="setting-description">
          Automatically start downloading when episodes are added to queue
        </p>
      </div>

      <div className="setting-group">
        <label htmlFor="retry-attempts">
          Retry Attempts
          <input
            id="retry-attempts"
            type="number"
            min="1"
            max="10"
            value={settings.downloads.retry_attempts}
            onChange={(e) => updateSetting('downloads', 'retry_attempts', Number(e.target.value))}
          />
        </label>
        <p className="setting-description">
          Number of times to retry failed downloads
        </p>
      </div>

      <div className="setting-group">
        <label htmlFor="timeout-seconds">
          Download Timeout (seconds)
          <input
            id="timeout-seconds"
            type="number"
            min="30"
            max="3600"
            step="30"
            value={settings.downloads.timeout_seconds}
            onChange={(e) => updateSetting('downloads', 'timeout_seconds', Number(e.target.value))}
          />
        </label>
        <p className="setting-description">
          Maximum time to wait for a download to complete
        </p>
      </div>

      <div className="setting-group">
        <label htmlFor="destination-folder">
          Download Folder
          <input
            id="destination-folder"
            type="text"
            value={settings.downloads.destination_folder}
            onChange={(e) => updateSetting('downloads', 'destination_folder', e.target.value)}
          />
        </label>
        <p className="setting-description">
          Directory where downloaded episodes will be saved
        </p>
      </div>
    </div>
  );

  const renderStorageSettings = () => (
    <div className="settings-section">
      <h3>Storage Settings</h3>
      
      <div className="setting-group">
        <label htmlFor="database-location">
          Database Location
          <input
            id="database-location"
            type="text"
            value={settings.storage.database_location}
            onChange={(e) => updateSetting('storage', 'database_location', e.target.value)}
          />
        </label>
        <p className="setting-description">
          Path to the SQLite database file
        </p>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.storage.auto_cleanup}
            onChange={(e) => updateSetting('storage', 'auto_cleanup', e.target.checked)}
          />
          Auto-cleanup old files
        </label>
        <p className="setting-description">
          Automatically delete old episodes when storage limit is reached
        </p>
      </div>

      <div className="setting-group">
        <label htmlFor="max-storage-gb">
          Maximum Storage (GB)
          <input
            id="max-storage-gb"
            type="number"
            min="1"
            max="1000"
            value={settings.storage.max_storage_gb}
            onChange={(e) => updateSetting('storage', 'max_storage_gb', Number(e.target.value))}
          />
        </label>
        <p className="setting-description">
          Maximum disk space to use for downloaded episodes
        </p>
      </div>
    </div>
  );

  const renderUISettings = () => (
    <div className="settings-section">
      <h3>Interface Settings</h3>
      
      <div className="setting-group">
        <label htmlFor="theme">
          Theme
          <select
            id="theme"
            value={settings.ui.theme}
            onChange={(e) => updateSetting('ui', 'theme', e.target.value as 'light' | 'dark' | 'auto')}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
        </label>
        <p className="setting-description">
          Choose the application color theme
        </p>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.ui.compact_view}
            onChange={(e) => updateSetting('ui', 'compact_view', e.target.checked)}
          />
          Compact view
        </label>
        <p className="setting-description">
          Use a more condensed layout for episode lists
        </p>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.ui.show_notifications}
            onChange={(e) => updateSetting('ui', 'show_notifications', e.target.checked)}
          />
          Show notifications
        </label>
        <p className="setting-description">
          Display system notifications for downloads and errors
        </p>
      </div>

      <div className="setting-group">
        <label htmlFor="auto-refresh-interval">
          Auto-refresh Interval (seconds)
          <input
            id="auto-refresh-interval"
            type="number"
            min="5"
            max="300"
            step="5"
            value={settings.ui.auto_refresh_interval}
            onChange={(e) => updateSetting('ui', 'auto_refresh_interval', Number(e.target.value))}
          />
        </label>
        <p className="setting-description">
          How often to automatically refresh the episode list
        </p>
      </div>
    </div>
  );

  const renderTranscriptionSettings = () => (
    <div className="settings-section">
      <h3>Transcription Settings</h3>
      
      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.transcription.auto_transcribe}
            onChange={(e) => updateSetting('transcription', 'auto_transcribe', e.target.checked)}
          />
          Auto-transcribe episodes
        </label>
        <p className="setting-description">
          Automatically transcribe episodes after downloading
        </p>
      </div>

      <div className="setting-group">
        <label htmlFor="language">
          Language
          <select
            id="language"
            value={settings.transcription.language}
            onChange={(e) => updateSetting('transcription', 'language', e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="auto">Auto-detect</option>
          </select>
        </label>
        <p className="setting-description">
          Primary language for transcription
        </p>
      </div>

      <div className="setting-group">
        <label htmlFor="model-quality">
          Transcription Quality
          <select
            id="model-quality"
            value={settings.transcription.model_quality}
            onChange={(e) => updateSetting('transcription', 'model_quality', e.target.value as 'fast' | 'balanced' | 'accurate')}
          >
            <option value="fast">Fast (lower quality)</option>
            <option value="balanced">Balanced</option>
            <option value="accurate">Accurate (slower)</option>
          </select>
        </label>
        <p className="setting-description">
          Balance between transcription speed and accuracy
        </p>
      </div>
    </div>
  );

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Configure podcast manager preferences</p>
      </div>

      <div className="settings-nav">
        <button 
          className={`nav-tab ${activeTab === 'downloads' ? 'active' : ''}`}
          onClick={() => setActiveTab('downloads')}
        >
          Downloads
        </button>
        <button 
          className={`nav-tab ${activeTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveTab('storage')}
        >
          Storage
        </button>
        <button 
          className={`nav-tab ${activeTab === 'ui' ? 'active' : ''}`}
          onClick={() => setActiveTab('ui')}
        >
          Interface
        </button>
        <button 
          className={`nav-tab ${activeTab === 'transcription' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcription')}
        >
          Transcription
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'downloads' && renderDownloadSettings()}
        {activeTab === 'storage' && renderStorageSettings()}
        {activeTab === 'ui' && renderUISettings()}
        {activeTab === 'transcription' && renderTranscriptionSettings()}
      </div>

      <div className="settings-actions">
        <div className="action-buttons">
          <button 
            className="btn btn-secondary"
            onClick={resetToDefaults}
          >
            Reset to Defaults
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={saveSettings}
            disabled={!hasChanges || saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {hasChanges && (
          <p className="unsaved-warning">
            You have unsaved changes
          </p>
        )}
      </div>

      <div className="settings-info">
        <h3>Application Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Version:</span>
            <span className="info-value">1.0.0</span>
          </div>
          <div className="info-item">
            <span className="info-label">Database:</span>
            <span className="info-value">{settings.storage.database_location}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Downloads:</span>
            <span className="info-value">{settings.downloads.destination_folder}</span>
          </div>
        </div>
      </div>
    </div>
  );
};