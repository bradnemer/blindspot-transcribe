import { db } from '../connection';
import { Settings } from '../../types';

export class SettingsDAL {
  private selectStatement: any;
  private selectAllStatement: any;
  private insertOrUpdateStatement: any;
  private deleteStatement: any;

  constructor() {
    this.initializeStatements();
  }

  private initializeStatements() {
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

  public get(key: string): string | null {
    const result = this.selectStatement.get(key) as { key: string; value: string } | undefined;
    return result?.value || null;
  }

  public getAll(): Record<string, string> {
    const results = this.selectAllStatement.all() as Array<{ key: string; value: string }>;
    return results.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  }

  public set(key: string, value: string): void {
    this.insertOrUpdateStatement.run(key, value);
  }

  public setMany(settings: Record<string, string>): void {
    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        this.set(key, value);
      }
    });

    transaction();
  }

  public delete(key: string): boolean {
    const result = this.deleteStatement.run(key);
    return result.changes > 0;
  }

  public getSettings(): Settings {
    const settings = this.getAll();
    return {
      download_directory: settings.download_directory || '/Users/brad/blindspot-files',
      max_concurrent_downloads: parseInt(settings.max_concurrent_downloads || '3', 10),
      retry_attempts: parseInt(settings.retry_attempts || '3', 10),
      retry_delay_seconds: parseInt(settings.retry_delay_seconds || '30', 10),
    };
  }

  public updateSettings(settings: Partial<Settings>): void {
    const updates: Record<string, string> = {};
    
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

  public getDownloadDirectory(): string {
    return this.get('download_directory') || '/Users/brad/blindspot-files';
  }

  public getMaxConcurrentDownloads(): number {
    const value = this.get('max_concurrent_downloads');
    return value ? parseInt(value, 10) : 3;
  }

  public getRetryAttempts(): number {
    const value = this.get('retry_attempts');
    return value ? parseInt(value, 10) : 3;
  }

  public getRetryDelaySeconds(): number {
    const value = this.get('retry_delay_seconds');
    return value ? parseInt(value, 10) : 30;
  }
}