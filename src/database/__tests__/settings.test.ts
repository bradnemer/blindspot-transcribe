import { SettingsDAL } from '../dal/settings';
import { db } from '../connection';
import { createTables } from '../schema';

describe('SettingsDAL', () => {
  let settingsDAL: SettingsDAL;

  beforeAll(() => {
    createTables();
    settingsDAL = new SettingsDAL();
  });

  beforeEach(() => {
    // Clear settings table before each test, but keep default settings
    db.exec('DELETE FROM settings');
    // Re-insert default settings
    const defaults = [
      ['download_directory', '/Users/brad/blindspot-files'],
      ['max_concurrent_downloads', '3'],
      ['retry_attempts', '3'],
      ['retry_delay_seconds', '30'],
    ];
    
    const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of defaults) {
      stmt.run(key, value);
    }
  });

  afterAll(() => {
    db.close();
  });

  describe('get and set', () => {
    it('should get and set individual settings', () => {
      settingsDAL.set('test_key', 'test_value');
      const value = settingsDAL.get('test_key');
      expect(value).toBe('test_value');
    });

    it('should return null for non-existent key', () => {
      const value = settingsDAL.get('non_existent_key');
      expect(value).toBeNull();
    });

    it('should update existing setting', () => {
      settingsDAL.set('test_key', 'initial_value');
      settingsDAL.set('test_key', 'updated_value');
      
      const value = settingsDAL.get('test_key');
      expect(value).toBe('updated_value');
    });
  });

  describe('getAll and setMany', () => {
    it('should get all settings', () => {
      const settings = settingsDAL.getAll();
      
      expect(settings).toMatchObject({
        download_directory: '/Users/brad/blindspot-files',
        max_concurrent_downloads: '3',
        retry_attempts: '3',
        retry_delay_seconds: '30',
      });
    });

    it('should set multiple settings at once', () => {
      const newSettings = {
        setting1: 'value1',
        setting2: 'value2',
        setting3: 'value3',
      };

      settingsDAL.setMany(newSettings);

      expect(settingsDAL.get('setting1')).toBe('value1');
      expect(settingsDAL.get('setting2')).toBe('value2');
      expect(settingsDAL.get('setting3')).toBe('value3');
    });
  });

  describe('getSettings', () => {
    it('should return typed settings object', () => {
      const settings = settingsDAL.getSettings();

      expect(settings).toEqual({
        download_directory: '/Users/brad/blindspot-files',
        max_concurrent_downloads: 3,
        retry_attempts: 3,
        retry_delay_seconds: 30,
      });
    });

    it('should handle missing settings with defaults', () => {
      db.exec('DELETE FROM settings');
      
      const settings = settingsDAL.getSettings();

      expect(settings).toEqual({
        download_directory: '/Users/brad/blindspot-files',
        max_concurrent_downloads: 3,
        retry_attempts: 3,
        retry_delay_seconds: 30,
      });
    });
  });

  describe('updateSettings', () => {
    it('should update partial settings', () => {
      settingsDAL.updateSettings({
        max_concurrent_downloads: 5,
        retry_attempts: 2,
      });

      const settings = settingsDAL.getSettings();
      expect(settings.max_concurrent_downloads).toBe(5);
      expect(settings.retry_attempts).toBe(2);
      expect(settings.download_directory).toBe('/Users/brad/blindspot-files');
      expect(settings.retry_delay_seconds).toBe(30);
    });
  });

  describe('specific getters', () => {
    it('should get download directory', () => {
      const dir = settingsDAL.getDownloadDirectory();
      expect(dir).toBe('/Users/brad/blindspot-files');
    });

    it('should get max concurrent downloads', () => {
      const max = settingsDAL.getMaxConcurrentDownloads();
      expect(max).toBe(3);
    });

    it('should get retry attempts', () => {
      const attempts = settingsDAL.getRetryAttempts();
      expect(attempts).toBe(3);
    });

    it('should get retry delay seconds', () => {
      const delay = settingsDAL.getRetryDelaySeconds();
      expect(delay).toBe(30);
    });
  });

  describe('delete', () => {
    it('should delete existing setting', () => {
      settingsDAL.set('temp_setting', 'temp_value');
      const deleted = settingsDAL.delete('temp_setting');

      expect(deleted).toBe(true);
      expect(settingsDAL.get('temp_setting')).toBeNull();
    });

    it('should return false for non-existent setting', () => {
      const deleted = settingsDAL.delete('non_existent_key');
      expect(deleted).toBe(false);
    });
  });
});