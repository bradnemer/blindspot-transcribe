import apiClient from './client';

export interface AppSettings {
  download_directory: string;
  max_concurrent_downloads: string;
  retry_attempts: string;
  retry_delay_seconds: string;
  [key: string]: string;
}

export class SettingsAPI {
  // Get all settings
  static async getSettings(): Promise<AppSettings> {
    const response = await apiClient.get('/settings');
    return response.data;
  }

  // Update multiple settings
  static async updateSettings(settings: Partial<AppSettings>): Promise<boolean> {
    try {
      await apiClient.put('/settings', settings);
      return true;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  }

  // Update a single setting
  static async updateSetting(key: string, value: string): Promise<boolean> {
    return this.updateSettings({ [key]: value });
  }

  // Get a specific setting
  static async getSetting(key: string): Promise<string | null> {
    try {
      const settings = await this.getSettings();
      return settings[key] || null;
    } catch (error) {
      console.error('Failed to get setting:', error);
      return null;
    }
  }

  // Get download directory
  static async getDownloadDirectory(): Promise<string> {
    const settings = await this.getSettings();
    return settings.download_directory || '/Users/brad/blindspot-files';
  }

  // Set download directory
  static async setDownloadDirectory(path: string): Promise<boolean> {
    return this.updateSetting('download_directory', path);
  }

  // Get max concurrent downloads
  static async getMaxConcurrentDownloads(): Promise<number> {
    const settings = await this.getSettings();
    return parseInt(settings.max_concurrent_downloads) || 3;
  }

  // Set max concurrent downloads
  static async setMaxConcurrentDownloads(count: number): Promise<boolean> {
    return this.updateSetting('max_concurrent_downloads', count.toString());
  }

  // Get retry attempts
  static async getRetryAttempts(): Promise<number> {
    const settings = await this.getSettings();
    return parseInt(settings.retry_attempts) || 3;
  }

  // Set retry attempts
  static async setRetryAttempts(attempts: number): Promise<boolean> {
    return this.updateSetting('retry_attempts', attempts.toString());
  }

  // Get retry delay
  static async getRetryDelay(): Promise<number> {
    const settings = await this.getSettings();
    return parseInt(settings.retry_delay_seconds) || 30;
  }

  // Set retry delay
  static async setRetryDelay(seconds: number): Promise<boolean> {
    return this.updateSetting('retry_delay_seconds', seconds.toString());
  }
}