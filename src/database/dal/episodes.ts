import { db } from '../connection';
import { Episode, EpisodeDB } from '../../types';
import { performanceMonitor } from '../../services/performance';
import { logger } from '../../services/logger';

/**
 * Data Access Layer for managing podcast episodes in the database.
 * 
 * Provides a high-level interface for episode CRUD operations with features including:
 * - Automatic performance monitoring and logging
 * - In-memory caching with TTL support
 * - Data mapping between frontend and database formats
 * - Singleton pattern for consistent access
 * - Specialized query methods for different episode states
 * 
 * @example
 * ```typescript
 * import { EpisodesDAL } from './database/dal/episodes';
 * 
 * const dal = EpisodesDAL.getInstance();
 * 
 * // Create a new episode
 * const episode = dal.create({
 *   title: 'My Episode',
 *   published_date: '2023-01-01',
 *   audio_url: 'http://example.com/audio.mp3',
 *   status: 'pending'
 * });
 * 
 * // Query episodes
 * const allEpisodes = dal.getAll();
 * const pendingEpisodes = dal.getPendingDownloads();
 * const existingEpisode = dal.findByTitleAndDate('My Episode', '2023-01-01');
 * 
 * // Update episode status
 * dal.update(episode.id, { status: 'downloading', download_progress: 50 });
 * ```
 */
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
  
  // Simple in-memory cache for frequently accessed data
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private cacheEnabled = true;
  private defaultCacheTtl = 30000; // 30 seconds

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

  // Cache management methods
  private getCacheKey(operation: string, ...params: any[]): string {
    return `${operation}_${params.join('_')}`;
  }

  private getFromCache<T>(key: string): T | null {
    if (!this.cacheEnabled) return null;
    
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.defaultCacheTtl): void {
    if (!this.cacheEnabled) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private invalidateCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  public enableCache(enabled: boolean = true): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.cache.clear();
    }
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
          error_message = ?, retry_count = ?, transcription_status = ?, 
          transcription_path = ?, transcription_error = ?, updated_at = CURRENT_TIMESTAMP
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
    const timingId = performanceMonitor.markDatabaseOperation('INSERT', 'episodes', 1);
    try {
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

      // Invalidate relevant caches
      this.invalidateCache('getAll');
      this.invalidateCache('getByStatus');
      
      logger.logDatabaseOperation('INSERT', 'episodes', 1);
      const newEpisode = this.getById(result.lastInsertRowid as number)!;
      
      return newEpisode;
    } finally {
      performanceMonitor.endTiming(timingId);
    }
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

  public update(id: number, updates: Partial<Episode & { transcription_status?: string; transcription_path?: string; transcription_error?: string }>): Episode | null {
    const timingId = performanceMonitor.markDatabaseOperation('UPDATE', 'episodes', 1);
    try {
      const current = this.getById(id);
      if (!current) return null;

      // Get current transcription data from database since it's not in the Episode type yet
      const currentDbRecord = this.selectByIdStatement.get(id) as any;

      this.updateStatement.run(
        updates.status ?? current.status,
        updates.download_progress ?? current.download_progress,
        updates.local_file_path ?? current.local_file_path,
        updates.error_message ?? current.error_message,
        updates.retry_count ?? current.retry_count,
        updates.transcription_status ?? currentDbRecord?.transcription_status ?? 'none',
        updates.transcription_path ?? currentDbRecord?.transcription_path ?? null,
        updates.transcription_error ?? currentDbRecord?.transcription_error ?? null,
        id
      );

      // Invalidate relevant caches
      this.invalidateCache('getAll');
      this.invalidateCache('getByStatus');
      this.invalidateCache(`getById_${id}`);
      
      logger.logDatabaseOperation('UPDATE', 'episodes', 1);
      return this.getById(id);
    } finally {
      performanceMonitor.endTiming(timingId);
    }
  }

  public getAll(): Episode[] {
    const cacheKey = this.getCacheKey('getAll');
    const cached = this.getFromCache<Episode[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const timingId = performanceMonitor.markDatabaseOperation('SELECT', 'episodes');
    try {
      const results = this.selectAllStatement.all() as EpisodeDB[];
      const episodes = results.map(db => this.mapDbToEpisode(db));
      
      this.setCache(cacheKey, episodes, 10000); // Cache for 10 seconds
      logger.logDatabaseOperation('SELECT ALL', 'episodes', results.length);
      
      return episodes;
    } finally {
      performanceMonitor.endTiming(timingId);
    }
  }

  public getById(id: number): Episode | null {
    const cacheKey = this.getCacheKey('getById', id);
    const cached = this.getFromCache<Episode | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const timingId = performanceMonitor.markDatabaseOperation('SELECT', 'episodes', 1);
    try {
      const result = this.selectByIdStatement.get(id) as EpisodeDB | undefined;
      const episode = result ? this.mapDbToEpisode(result) : null;
      
      this.setCache(cacheKey, episode, 60000); // Cache for 1 minute
      logger.logDatabaseOperation('SELECT BY ID', 'episodes', result ? 1 : 0);
      
      return episode;
    } finally {
      performanceMonitor.endTiming(timingId);
    }
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

  public getByFilePath(filePath: string): Episode | null {
    const stmt = db.prepare('SELECT * FROM episodes WHERE file_path = ?');
    const result = stmt.get(filePath) as EpisodeDB | undefined;
    return result ? this.mapDbToEpisode(result) : null;
  }
}