import { db } from './connection';
import { createTables, createTriggers } from './schema';

interface Migration {
  version: number;
  name: string;
  up: () => void;
  down?: () => void;
}

export class MigrationManager {
  private migrations: Migration[] = [
    {
      version: 1,
      name: 'initial_schema',
      up: () => {
        createTables();
        createTriggers();
      },
      down: () => {
        db.exec('DROP TABLE IF EXISTS episodes');
        db.exec('DROP TABLE IF EXISTS settings');
      },
    },
  ];

  private createMigrationsTable(): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private getCurrentVersion(): number {
    this.createMigrationsTable();
    const result = db.prepare('SELECT MAX(version) as version FROM migrations').get() as {
      version: number | null;
    };
    return result.version || 0;
  }

  private recordMigration(version: number, name: string): void {
    const stmt = db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)');
    stmt.run(version, name);
  }

  private removeMigration(version: number): void {
    const stmt = db.prepare('DELETE FROM migrations WHERE version = ?');
    stmt.run(version);
  }

  public migrate(): void {
    const currentVersion = this.getCurrentVersion();
    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('Database is up to date');
      return;
    }

    console.log(`Running ${pendingMigrations.length} migrations...`);

    const transaction = db.transaction(() => {
      for (const migration of pendingMigrations) {
        console.log(`Applying migration ${migration.version}: ${migration.name}`);
        migration.up();
        this.recordMigration(migration.version, migration.name);
      }
    });

    transaction();
    console.log('All migrations completed successfully');
  }

  public rollback(targetVersion: number = 0): void {
    const currentVersion = this.getCurrentVersion();
    const migrationsToRollback = this.migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    if (migrationsToRollback.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    console.log(`Rolling back ${migrationsToRollback.length} migrations...`);

    const transaction = db.transaction(() => {
      for (const migration of migrationsToRollback) {
        if (migration.down) {
          console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
          migration.down();
          this.removeMigration(migration.version);
        } else {
          throw new Error(`Migration ${migration.version} does not support rollback`);
        }
      }
    });

    transaction();
    console.log('Rollback completed successfully');
  }

  public getStatus(): { version: number; name: string; applied_at: string }[] {
    this.createMigrationsTable();
    return db.prepare('SELECT * FROM migrations ORDER BY version').all() as {
      version: number;
      name: string;
      applied_at: string;
    }[];
  }

  public reset(): void {
    console.log('Resetting database...');
    this.rollback(0);
    this.migrate();
    console.log('Database reset completed');
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager();