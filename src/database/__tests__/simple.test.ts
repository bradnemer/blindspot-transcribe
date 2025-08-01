import Database from 'better-sqlite3';

describe('Database Basic Tests', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    
    // Create episodes table
    db.exec(`
      CREATE TABLE episodes (
        id INTEGER PRIMARY KEY,
        episode_id INTEGER UNIQUE NOT NULL,
        podcast_id INTEGER NOT NULL,
        podcast_name TEXT NOT NULL,
        episode_title TEXT NOT NULL,
        published_date TEXT NOT NULL,
        audio_url TEXT NOT NULL,
        download_status TEXT DEFAULT 'pending',
        download_progress INTEGER DEFAULT 0,
        file_path TEXT,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create settings table
    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterAll(() => {
    db.close();
  });

  test('should create and query episodes table', () => {
    const insert = db.prepare(`
      INSERT INTO episodes (episode_id, podcast_id, podcast_name, episode_title, published_date, audio_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(1001, 1, 'Test Podcast', 'Test Episode', '2025-01-01', 'https://example.com/test.mp3');
    expect(result.changes).toBe(1);
    expect(result.lastInsertRowid).toBeDefined();

    const select = db.prepare('SELECT * FROM episodes WHERE episode_id = ?');
    const episode = select.get(1001);
    
    expect(episode).toMatchObject({
      episode_id: 1001,
      podcast_id: 1,
      podcast_name: 'Test Podcast',
      episode_title: 'Test Episode',
      download_status: 'pending',
      download_progress: 0,
    });
  });

  test('should create and query settings table', () => {
    const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    const result = insert.run('test_key', 'test_value');
    
    expect(result.changes).toBe(1);

    const select = db.prepare('SELECT * FROM settings WHERE key = ?');
    const setting = select.get('test_key');
    
    expect(setting).toMatchObject({
      key: 'test_key',
      value: 'test_value',
    });
  });
});