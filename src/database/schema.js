export const createTables = () => {
    const { db } = require('./connection');
    // Create episodes table
    db.exec(`
    CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY,
      episode_id INTEGER UNIQUE NOT NULL,
      podcast_id INTEGER NOT NULL,
      podcast_name TEXT NOT NULL,
      episode_title TEXT NOT NULL,
      published_date TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      download_status TEXT DEFAULT 'pending' CHECK (download_status IN ('pending', 'downloading', 'downloaded', 'failed', 'transcribed')),
      download_progress INTEGER DEFAULT 0 CHECK (download_progress >= 0 AND download_progress <= 100),
      file_path TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Create indexes for performance
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(download_status);
    CREATE INDEX IF NOT EXISTS idx_episodes_podcast ON episodes(podcast_id);
    CREATE INDEX IF NOT EXISTS idx_episodes_episode_id ON episodes(episode_id);
  `);
    // Create settings table
    db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Insert default settings if they don't exist
    const insertDefaultSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
    const defaultSettings = [
        ['download_directory', '/Users/brad/blindspot-files'],
        ['max_concurrent_downloads', '3'],
        ['retry_attempts', '3'],
        ['retry_delay_seconds', '30'],
    ];
    const transaction = db.transaction(() => {
        for (const [key, value] of defaultSettings) {
            insertDefaultSetting.run(key, value);
        }
    });
    transaction();
};
export const createTriggers = () => {
    const { db } = require('./connection');
    // Trigger to update updated_at timestamp
    db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_episodes_timestamp 
    AFTER UPDATE ON episodes
    BEGIN
      UPDATE episodes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
    db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
    AFTER UPDATE ON settings
    BEGIN
      UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
    END;
  `);
};
//# sourceMappingURL=schema.js.map