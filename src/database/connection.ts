import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'podcast-manager.db');

export class DatabaseConnection {
  private static instance: Database.Database | null = null;

  public static getInstance(): Database.Database {
    if (!this.instance) {
      // Ensure database directory exists
      const dbDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.instance = new Database(DB_PATH);
      this.instance.pragma('journal_mode = WAL');
      this.instance.pragma('foreign_keys = ON');
    }
    return this.instance;
  }

  public static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}

export const db = DatabaseConnection.getInstance();