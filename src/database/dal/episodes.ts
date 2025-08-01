import { db } from '../connection';
import { Episode } from '../../types';

export class EpisodesDAL {
  private insertStatement: any;
  private updateStatement: any;
  private selectAllStatement: any;
  private selectByIdStatement: any;
  private selectByEpisodeIdStatement: any;
  private selectByStatusStatement: any;
  private deleteStatement: any;

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

    this.deleteStatement = db.prepare(`
      DELETE FROM episodes WHERE id = ?
    `);
  }

  public insert(episode: Omit<Episode, 'id' | 'created_at' | 'updated_at'>): Episode {
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
      return episodes.map(episode => this.insert(episode));
    });

    return transaction();
  }

  public update(id: number, updates: Partial<Episode>): Episode | null {
    const current = this.getById(id);
    if (!current) return null;

    this.updateStatement.run(
      updates.download_status ?? current.download_status,
      updates.download_progress ?? current.download_progress,
      updates.file_path ?? current.file_path,
      updates.error_message ?? current.error_message,
      updates.retry_count ?? current.retry_count,
      id
    );

    return this.getById(id);
  }

  public getAll(): Episode[] {
    return this.selectAllStatement.all() as Episode[];
  }

  public getById(id: number): Episode | null {
    const result = this.selectByIdStatement.get(id) as Episode | undefined;
    return result || null;
  }

  public getByEpisodeId(episodeId: number): Episode | null {
    const result = this.selectByEpisodeIdStatement.get(episodeId) as Episode | undefined;
    return result || null;
  }

  public getByStatus(status: Episode['download_status']): Episode[] {
    return this.selectByStatusStatement.all(status) as Episode[];
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
}