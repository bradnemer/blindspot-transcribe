import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
const DEFAULT_SETTINGS = {
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
export const SettingsPanel = ({ onError }) => {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('downloads');
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
        }
        catch (error) {
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
        }
        catch (error) {
            onError(`Failed to save settings: ${error}`);
        }
        finally {
            setSaving(false);
        }
    };
    const resetToDefaults = () => {
        setSettings(DEFAULT_SETTINGS);
        setHasChanges(true);
    };
    const updateSetting = (category, key, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
        setHasChanges(true);
    };
    const renderDownloadSettings = () => (_jsxs("div", { className: "settings-section", children: [_jsx("h3", { children: "Download Settings" }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { htmlFor: "concurrent-limit", children: ["Concurrent Downloads", _jsxs("select", { id: "concurrent-limit", value: settings.downloads.concurrent_limit, onChange: (e) => updateSetting('downloads', 'concurrent_limit', Number(e.target.value)), children: [_jsx("option", { value: 1, children: "1" }), _jsx("option", { value: 2, children: "2" }), _jsx("option", { value: 3, children: "3" }), _jsx("option", { value: 4, children: "4" }), _jsx("option", { value: 5, children: "5" })] })] }), _jsx("p", { className: "setting-description", children: "Number of episodes to download simultaneously" })] }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { className: "checkbox-label", children: [_jsx("input", { type: "checkbox", checked: settings.downloads.auto_start, onChange: (e) => updateSetting('downloads', 'auto_start', e.target.checked) }), "Auto-start downloads"] }), _jsx("p", { className: "setting-description", children: "Automatically start downloading when episodes are added to queue" })] }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { htmlFor: "retry-attempts", children: ["Retry Attempts", _jsx("input", { id: "retry-attempts", type: "number", min: "1", max: "10", value: settings.downloads.retry_attempts, onChange: (e) => updateSetting('downloads', 'retry_attempts', Number(e.target.value)) })] }), _jsx("p", { className: "setting-description", children: "Number of times to retry failed downloads" })] }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { htmlFor: "timeout-seconds", children: ["Download Timeout (seconds)", _jsx("input", { id: "timeout-seconds", type: "number", min: "30", max: "3600", step: "30", value: settings.downloads.timeout_seconds, onChange: (e) => updateSetting('downloads', 'timeout_seconds', Number(e.target.value)) })] }), _jsx("p", { className: "setting-description", children: "Maximum time to wait for a download to complete" })] }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { htmlFor: "destination-folder", children: ["Download Folder", _jsx("input", { id: "destination-folder", type: "text", value: settings.downloads.destination_folder, onChange: (e) => updateSetting('downloads', 'destination_folder', e.target.value) })] }), _jsx("p", { className: "setting-description", children: "Directory where downloaded episodes will be saved" })] })] }));
    const renderStorageSettings = () => (_jsxs("div", { className: "settings-section", children: [_jsx("h3", { children: "Storage Settings" }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { htmlFor: "database-location", children: ["Database Location", _jsx("input", { id: "database-location", type: "text", value: settings.storage.database_location, onChange: (e) => updateSetting('storage', 'database_location', e.target.value) })] }), _jsx("p", { className: "setting-description", children: "Path to the SQLite database file" })] }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { className: "checkbox-label", children: [_jsx("input", { type: "checkbox", checked: settings.storage.auto_cleanup, onChange: (e) => updateSetting('storage', 'auto_cleanup', e.target.checked) }), "Auto-cleanup old files"] }), _jsx("p", { className: "setting-description", children: "Automatically delete old episodes when storage limit is reached" })] }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { htmlFor: "max-storage-gb", children: ["Maximum Storage (GB)", _jsx("input", { id: "max-storage-gb", type: "number", min: "1", max: "1000", value: settings.storage.max_storage_gb, onChange: (e) => updateSetting('storage', 'max_storage_gb', Number(e.target.value)) })] }), _jsx("p", { className: "setting-description", children: "Maximum disk space to use for downloaded episodes" })] })] }));
    const renderUISettings = () => (_jsxs("div", { className: "settings-section", children: [_jsx("h3", { children: "Interface Settings" }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { htmlFor: "theme", children: ["Theme", _jsxs("select", { id: "theme", value: settings.ui.theme, onChange: (e) => updateSetting('ui', 'theme', e.target.value), children: [_jsx("option", { value: "light", children: "Light" }), _jsx("option", { value: "dark", children: "Dark" }), _jsx("option", { value: "auto", children: "Auto (System)" })] })] }), _jsx("p", { className: "setting-description", children: "Choose the application color theme" })] }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { className: "checkbox-label", children: [_jsx("input", { type: "checkbox", checked: settings.ui.compact_view, onChange: (e) => updateSetting('ui', 'compact_view', e.target.checked) }), "Compact view"] }), _jsx("p", { className: "setting-description", children: "Use a more condensed layout for episode lists" })] }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { className: "checkbox-label", children: [_jsx("input", { type: "checkbox", checked: settings.ui.show_notifications, onChange: (e) => updateSetting('ui', 'show_notifications', e.target.checked) }), "Show notifications"] }), _jsx("p", { className: "setting-description", children: "Display system notifications for downloads and errors" })] }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { htmlFor: "auto-refresh-interval", children: ["Auto-refresh Interval (seconds)", _jsx("input", { id: "auto-refresh-interval", type: "number", min: "5", max: "300", step: "5", value: settings.ui.auto_refresh_interval, onChange: (e) => updateSetting('ui', 'auto_refresh_interval', Number(e.target.value)) })] }), _jsx("p", { className: "setting-description", children: "How often to automatically refresh the episode list" })] })] }));
    const renderTranscriptionSettings = () => (_jsxs("div", { className: "settings-section", children: [_jsx("h3", { children: "Transcription Settings" }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { className: "checkbox-label", children: [_jsx("input", { type: "checkbox", checked: settings.transcription.auto_transcribe, onChange: (e) => updateSetting('transcription', 'auto_transcribe', e.target.checked) }), "Auto-transcribe episodes"] }), _jsx("p", { className: "setting-description", children: "Automatically transcribe episodes after downloading" })] }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { htmlFor: "language", children: ["Language", _jsxs("select", { id: "language", value: settings.transcription.language, onChange: (e) => updateSetting('transcription', 'language', e.target.value), children: [_jsx("option", { value: "en", children: "English" }), _jsx("option", { value: "es", children: "Spanish" }), _jsx("option", { value: "fr", children: "French" }), _jsx("option", { value: "de", children: "German" }), _jsx("option", { value: "it", children: "Italian" }), _jsx("option", { value: "pt", children: "Portuguese" }), _jsx("option", { value: "auto", children: "Auto-detect" })] })] }), _jsx("p", { className: "setting-description", children: "Primary language for transcription" })] }), _jsxs("div", { className: "setting-group", children: [_jsxs("label", { htmlFor: "model-quality", children: ["Transcription Quality", _jsxs("select", { id: "model-quality", value: settings.transcription.model_quality, onChange: (e) => updateSetting('transcription', 'model_quality', e.target.value), children: [_jsx("option", { value: "fast", children: "Fast (lower quality)" }), _jsx("option", { value: "balanced", children: "Balanced" }), _jsx("option", { value: "accurate", children: "Accurate (slower)" })] })] }), _jsx("p", { className: "setting-description", children: "Balance between transcription speed and accuracy" })] })] }));
    return (_jsxs("div", { className: "settings-panel", children: [_jsxs("div", { className: "settings-header", children: [_jsx("h2", { children: "Settings" }), _jsx("p", { children: "Configure podcast manager preferences" })] }), _jsxs("div", { className: "settings-nav", children: [_jsx("button", { className: `nav-tab ${activeTab === 'downloads' ? 'active' : ''}`, onClick: () => setActiveTab('downloads'), children: "Downloads" }), _jsx("button", { className: `nav-tab ${activeTab === 'storage' ? 'active' : ''}`, onClick: () => setActiveTab('storage'), children: "Storage" }), _jsx("button", { className: `nav-tab ${activeTab === 'ui' ? 'active' : ''}`, onClick: () => setActiveTab('ui'), children: "Interface" }), _jsx("button", { className: `nav-tab ${activeTab === 'transcription' ? 'active' : ''}`, onClick: () => setActiveTab('transcription'), children: "Transcription" })] }), _jsxs("div", { className: "settings-content", children: [activeTab === 'downloads' && renderDownloadSettings(), activeTab === 'storage' && renderStorageSettings(), activeTab === 'ui' && renderUISettings(), activeTab === 'transcription' && renderTranscriptionSettings()] }), _jsxs("div", { className: "settings-actions", children: [_jsxs("div", { className: "action-buttons", children: [_jsx("button", { className: "btn btn-secondary", onClick: resetToDefaults, children: "Reset to Defaults" }), _jsx("button", { className: "btn btn-primary", onClick: saveSettings, disabled: !hasChanges || saving, children: saving ? 'Saving...' : 'Save Settings' })] }), hasChanges && (_jsx("p", { className: "unsaved-warning", children: "You have unsaved changes" }))] }), _jsxs("div", { className: "settings-info", children: [_jsx("h3", { children: "Application Information" }), _jsxs("div", { className: "info-grid", children: [_jsxs("div", { className: "info-item", children: [_jsx("span", { className: "info-label", children: "Version:" }), _jsx("span", { className: "info-value", children: "1.0.0" })] }), _jsxs("div", { className: "info-item", children: [_jsx("span", { className: "info-label", children: "Database:" }), _jsx("span", { className: "info-value", children: settings.storage.database_location })] }), _jsxs("div", { className: "info-item", children: [_jsx("span", { className: "info-label", children: "Downloads:" }), _jsx("span", { className: "info-value", children: settings.downloads.destination_folder })] })] })] })] }));
};
//# sourceMappingURL=SettingsPanel.js.map