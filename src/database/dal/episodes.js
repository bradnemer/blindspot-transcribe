import { db } from '../connection';
export class EpisodesDAL {
    static instance;
    insertStatement;
    updateStatement;
    selectAllStatement;
    selectByIdStatement;
    selectByEpisodeIdStatement;
    selectByStatusStatement;
    selectByTitleAndDateStatement;
    deleteStatement;
    // Singleton pattern
    static getInstance() {
        if (!EpisodesDAL.instance) {
            EpisodesDAL.instance = new EpisodesDAL();
        }
        return EpisodesDAL.instance;
    }
    // Map from database format to frontend format
    mapDbToEpisode(db) {
        return {
            id: db.id,
            title: db.episode_title,
            published_date: db.published_date,
            audio_url: db.audio_url,
            description: undefined, // Not in current DB schema
            duration: undefined, // Not in current DB schema
            status: db.download_status,
            download_progress: db.download_progress,
            local_file_path: db.file_path,
            transcription_file_path: undefined, // Not in current DB schema
            error_message: db.error_message,
            retry_count: db.retry_count,
            created_at: db.created_at,
            updated_at: db.updated_at
        };
    }
    // Map from frontend format to database format
    mapEpisodeToDb(episode) {
        return {
            episode_title: episode.title,
            published_date: episode.published_date,
            audio_url: episode.audio_url,
            download_status: episode.status,
            download_progress: episode.download_progress || 0,
            file_path: episode.local_file_path,
            error_message: episode.error_message,
            retry_count: episode.retry_count || 0
        };
    }
    constructor() {
        this.initializeStatements();
    }
    initializeStatements() {
        this.insertStatement = db.prepare(`
      INSERT INTO episodes (
        episode_id, podcast_id, podcast_name, episode_title, 
        published_date, audio_url, download_status, download_progress
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        this.updateStatement = db.prepare(`
      UPDATE episodes 
      SET download_status = ?, download_progress = ?, file_path = ?, 
          error_message = ?, retry_count = ?
      WHERE id = ?
    `);
        this.selectAllStatement = db.prepare(`
      SELECT * FROM episodes ORDER BY published_date DESC
    `);
        this.selectByIdStatement = db.prepare(`
      SELECT * FROM episodes WHERE id = ?
    `);
        this.selectByEpisodeIdStatement = db.prepare(`
      SELECT * FROM episodes WHERE episode_id = ?
    `);
        this.selectByStatusStatement = db.prepare(`
      SELECT * FROM episodes WHERE download_status = ? ORDER BY published_date DESC
    `);
        this.selectByTitleAndDateStatement = db.prepare(`
      SELECT * FROM episodes WHERE episode_title = ? AND published_date = ?
    `);
        this.deleteStatement = db.prepare(`
      DELETE FROM episodes WHERE id = ?
    `);
    }
    // Create a new episode from frontend data
    create(episode) {
        // Generate a unique episode_id for now (this would normally come from external data)
        const episodeId = Date.now() + Math.floor(Math.random() * 1000);
        const result = this.insertStatement.run(episodeId, 1, // Default podcast_id
        'Unknown Podcast', // Default podcast_name
        episode.title, episode.published_date, episode.audio_url || '', episode.status || 'pending', episode.download_progress || 0);
        return this.getById(result.lastInsertRowid);
    }
    // Legacy method for backward compatibility
    insert(episode) {
        const result = this.insertStatement.run(episode.episode_id, episode.podcast_id, episode.podcast_name, episode.episode_title, episode.published_date, episode.audio_url, episode.download_status || 'pending', episode.download_progress || 0);
        return this.getById(result.lastInsertRowid);
    }
    insertMany(episodes) {
        const transaction = db.transaction(() => {
            return episodes.map(episode => this.create(episode));
        });
        return transaction();
    }
    update(id, updates) {
        const current = this.getById(id);
        if (!current)
            return null;
        this.updateStatement.run(updates.status ?? current.status, updates.download_progress ?? current.download_progress, updates.local_file_path ?? current.local_file_path, updates.error_message ?? current.error_message, updates.retry_count ?? current.retry_count, id);
        return this.getById(id);
    }
    getAll() {
        const results = this.selectAllStatement.all();
        return results.map(db => this.mapDbToEpisode(db));
    }
    getById(id) {
        const result = this.selectByIdStatement.get(id);
        return result ? this.mapDbToEpisode(result) : null;
    }
    getByEpisodeId(episodeId) {
        const result = this.selectByEpisodeIdStatement.get(episodeId);
        return result ? this.mapDbToEpisode(result) : null;
    }
    getByStatus(status) {
        const results = this.selectByStatusStatement.all(status);
        return results.map(db => this.mapDbToEpisode(db));
    }
    delete(id) {
        const result = this.deleteStatement.run(id);
        return result.changes > 0;
    }
    getPendingDownloads() {
        return this.getByStatus('pending');
    }
    getDownloading() {
        return this.getByStatus('downloading');
    }
    getDownloaded() {
        return this.getByStatus('downloaded');
    }
    getFailed() {
        return this.getByStatus('failed');
    }
    exists(episodeId) {
        return this.getByEpisodeId(episodeId) !== null;
    }
    findByTitleAndDate(title, publishedDate) {
        const result = this.selectByTitleAndDateStatement.get(title, publishedDate);
        return result ? this.mapDbToEpisode(result) : null;
    }
}
//# sourceMappingURL=episodes.js.map