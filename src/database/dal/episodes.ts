import { db } from '../connection';
import { Episode, EpisodeDB } from '../../types';

export class EpisodesDAL {
  private static instance: EpisodesDAL;
  private insertStatement: any;
  private updateStatement: any;
  private selectAllStatement: any;
  private selectByIdStatement: any;
  private selectByEpisodeIdStatement: any;
  private selectByStatusStatement: any;
  private selectByTitleAndDateStatement: any;
  private deleteStatement: any;

  // Singleton pattern
  public static getInstance(): EpisodesDAL {
    if (!EpisodesDAL.instance) {
      EpisodesDAL.instance = new EpisodesDAL();
    }
    return EpisodesDAL.instance;
  }

  // Map from database format to frontend format
  private mapDbToEpisode(db: EpisodeDB): Episode {
    return {
      id: db.id!,
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
  private mapEpisodeToDb(episode: Partial<Episode>): Partial<EpisodeDB> {
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

  private initializeStatements() {
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
  public create(episode: Omit<Episode, 'id' | 'created_at' | 'updated_at'>): Episode {
    // Generate a unique episode_id for now (this would normally come from external data)
    const episodeId = Date.now() + Math.floor(Math.random() * 1000);
    
    const result = this.insertStatement.run(
      episodeId,
      1, // Default podcast_id
      'Unknown Podcast', // Default podcast_name
      episode.title,
      episode.published_date,
      episode.audio_url || '',
      episode.status || 'pending',
      episode.download_progress || 0
    );

    return this.getById(result.lastInsertRowid as number)!;
  }

  // Legacy method for backward compatibility
  public insert(episode: Omit<EpisodeDB, 'id' | 'created_at' | 'updated_at'>): Episode {
    const result = this.insertStatement.run(
      episode.episode_id,
      episode.podcast_id,
      episode.podcast_name,
      episode.episode_title,
      episode.published_date,
      episode.audio_url,
      episode.download_status || 'pending',
      episode.download_progress || 0
    );

    return this.getById(result.lastInsertRowid as number)!;
  }

  public insertMany(episodes: Omit<Episode, 'id' | 'created_at' | 'updated_at'>[]): Episode[] {
    const transaction = db.transaction(() => {
      return episodes.map(episode => this.create(episode));
    });

    return transaction();
  }

  public update(id: number, updates: Partial<Episode>): Episode | null {
    const current = this.getById(id);
    if (!current) return null;

    this.updateStatement.run(
      updates.status ?? current.status,
      updates.download_progress ?? current.download_progress,
      updates.local_file_path ?? current.local_file_path,
      updates.error_message ?? current.error_message,
      updates.retry_count ?? current.retry_count,
      id
    );

    return this.getById(id);
  }

  public getAll(): Episode[] {
    const results = this.selectAllStatement.all() as EpisodeDB[];
    return results.map(db => this.mapDbToEpisode(db));
  }

  public getById(id: number): Episode | null {
    const result = this.selectByIdStatement.get(id) as EpisodeDB | undefined;
    return result ? this.mapDbToEpisode(result) : null;
  }

  public getByEpisodeId(episodeId: number): Episode | null {
    const result = this.selectByEpisodeIdStatement.get(episodeId) as EpisodeDB | undefined;
    return result ? this.mapDbToEpisode(result) : null;
  }

  public getByStatus(status: Episode['status']): Episode[] {
    const results = this.selectByStatusStatement.all(status) as EpisodeDB[];
    return results.map(db => this.mapDbToEpisode(db));
  }

  public delete(id: number): boolean {
    const result = this.deleteStatement.run(id);
    return result.changes > 0;
  }

  public getPendingDownloads(): Episode[] {
    return this.getByStatus('pending');
  }

  public getDownloading(): Episode[] {
    return this.getByStatus('downloading');
  }

  public getDownloaded(): Episode[] {
    return this.getByStatus('downloaded');
  }

  public getFailed(): Episode[] {
    return this.getByStatus('failed');
  }

  public exists(episodeId: number): boolean {
    return this.getByEpisodeId(episodeId) !== null;
  }

  public findByTitleAndDate(title: string, publishedDate: string): Episode | null {
    const result = this.selectByTitleAndDateStatement.get(title, publishedDate) as EpisodeDB | undefined;
    return result ? this.mapDbToEpisode(result) : null;
  }
}