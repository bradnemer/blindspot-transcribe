import { db } from '../connection';
export class SettingsDAL {
    selectStatement;
    selectAllStatement;
    insertOrUpdateStatement;
    deleteStatement;
    constructor() {
        this.initializeStatements();
    }
    initializeStatements() {
        this.selectStatement = db.prepare(`
      SELECT key, value FROM settings WHERE key = ?
    `);
        this.selectAllStatement = db.prepare(`
      SELECT key, value FROM settings
    `);
        this.insertOrUpdateStatement = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `);
        this.deleteStatement = db.prepare(`
      DELETE FROM settings WHERE key = ?
    `);
    }
    get(key) {
        const result = this.selectStatement.get(key);
        return result?.value || null;
    }
    getAll() {
        const results = this.selectAllStatement.all();
        return results.reduce((acc, { key, value }) => {
            acc[key] = value;
            return acc;
        }, {});
    }
    set(key, value) {
        this.insertOrUpdateStatement.run(key, value);
    }
    setMany(settings) {
        const transaction = db.transaction(() => {
            for (const [key, value] of Object.entries(settings)) {
                this.set(key, value);
            }
        });
        transaction();
    }
    delete(key) {
        const result = this.deleteStatement.run(key);
        return result.changes > 0;
    }
    getSettings() {
        const settings = this.getAll();
        return {
            download_directory: settings.download_directory || '/Users/brad/blindspot-files',
            max_concurrent_downloads: parseInt(settings.max_concurrent_downloads || '3', 10),
            retry_attempts: parseInt(settings.retry_attempts || '3', 10),
            retry_delay_seconds: parseInt(settings.retry_delay_seconds || '30', 10),
        };
    }
    updateSettings(settings) {
        const updates = {};
        if (settings.download_directory !== undefined) {
            updates.download_directory = settings.download_directory;
        }
        if (settings.max_concurrent_downloads !== undefined) {
            updates.max_concurrent_downloads = settings.max_concurrent_downloads.toString();
        }
        if (settings.retry_attempts !== undefined) {
            updates.retry_attempts = settings.retry_attempts.toString();
        }
        if (settings.retry_delay_seconds !== undefined) {
            updates.retry_delay_seconds = settings.retry_delay_seconds.toString();
        }
        this.setMany(updates);
    }
    getDownloadDirectory() {
        return this.get('download_directory') || '/Users/brad/blindspot-files';
    }
    getMaxConcurrentDownloads() {
        const value = this.get('max_concurrent_downloads');
        return value ? parseInt(value, 10) : 3;
    }
    getRetryAttempts() {
        const value = this.get('retry_attempts');
        return value ? parseInt(value, 10) : 3;
    }
    getRetryDelaySeconds() {
        const value = this.get('retry_delay_seconds');
        return value ? parseInt(value, 10) : 30;
    }
}
//# sourceMappingURL=settings.js.map