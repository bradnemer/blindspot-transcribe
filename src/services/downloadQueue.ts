import { Episode } from '../types';
import { Downloader, DownloadProgress, DownloadResult } from './downloader';
import { RetryManager } from './retryManager';
import { dal } from '../database';
import { logger } from './logger';
import { errorHandler } from './errorHandler';

export interface QueueConfig {
  maxConcurrentDownloads: number;
  prioritizeByDate: boolean;
  autoStart: boolean;
}

export interface QueueStats {
  totalItems: number;
  pending: number;
  downloading: number;
  completed: number;
  failed: number;
  paused: number;
}

export type QueueEventType = 'started' | 'progress' | 'completed' | 'failed' | 'paused' | 'resumed';

export interface QueueEvent {
  type: QueueEventType;
  episode: Episode;
  progress?: DownloadProgress;
  result?: DownloadResult;
  error?: string;
}

export class DownloadQueue {
  private downloader: Downloader;
  private retryManager: RetryManager;
  private queue: Episode[] = [];
  private isRunning = false;
  private isPaused = false;
  private config: QueueConfig;
  private eventListeners: ((event: QueueEvent) => void)[] = [];

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxConcurrentDownloads: 3,
      prioritizeByDate: true,
      autoStart: true,
      ...config,
    };

    this.downloader = new Downloader();
    this.retryManager = new RetryManager();

    // Load configuration from database
    this.loadConfigFromDatabase();
  }

  /**
   * Add episodes to the download queue
   */
  public addToQueue(episodes: Episode | Episode[]): void {
    const episodesToAdd = Array.isArray(episodes) ? episodes : [episodes];
    
    for (const episode of episodesToAdd) {
      // Check if episode is already in queue or completed
      if (this.isInQueue(episode.episode_id) || 
          episode.download_status === 'downloaded' || 
          episode.download_status === 'transcribed') {
        continue;
      }

      // Update episode status to pending
      if (episode.id) {
        dal.episodes.update(episode.id, {
          download_status: 'pending',
          download_progress: 0,
        });
      }

      this.queue.push(episode);
    }

    // Sort queue if prioritizing by date
    if (this.config.prioritizeByDate) {
      this.sortQueue();
    }

    // Auto-start if configured and not already running
    if (this.config.autoStart && !this.isRunning && !this.isPaused) {
      this.start();
    }

    console.log(`Added ${episodesToAdd.length} episodes to download queue. Queue size: ${this.queue.length}`);
  }

  /**
   * Start processing the download queue
   */
  public start(): void {
    if (this.isRunning) {
      console.log('Download queue is already running');
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    console.log('Starting download queue');
    
    this.processQueue();
  }

  /**
   * Pause the download queue
   */
  public pause(): void {
    if (!this.isRunning) {
      console.log('Download queue is not running');
      return;
    }

    this.isPaused = true;
    console.log('Pausing download queue');

    // Cancel all active downloads
    this.downloader.cancelAllDownloads();

    // Emit pause events for downloading episodes
    const downloadingEpisodes = dal.episodes.getDownloading();
    for (const episode of downloadingEpisodes) {
      this.emitEvent({
        type: 'paused',
        episode,
      });
    }
  }

  /**
   * Resume the download queue
   */
  public resume(): void {
    if (!this.isPaused) {
      console.log('Download queue is not paused');
      return;
    }

    this.isPaused = false;
    console.log('Resuming download queue');

    // Reset downloading episodes back to pending
    const downloadingEpisodes = dal.episodes.getDownloading();
    for (const episode of downloadingEpisodes) {
      if (episode.id) {
        dal.episodes.update(episode.id, {
          download_status: 'pending',
        });
      }

      // Add back to queue if not already there
      if (!this.isInQueue(episode.episode_id)) {
        this.queue.unshift(episode); // Add to front of queue
      }

      this.emitEvent({
        type: 'resumed',
        episode,
      });
    }

    this.processQueue();
  }

  /**
   * Stop the download queue
   */
  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    
    // Cancel all active downloads
    this.downloader.cancelAllDownloads();
    
    // Cancel all retry schedules
    this.retryManager.cancelAllRetries();
    
    console.log('Download queue stopped');
  }

  /**
   * Clear the entire queue
   */
  public clear(): void {
    this.queue = [];
    this.stop();
    console.log('Download queue cleared');
  }

  /**
   * Remove specific episode from queue
   */
  public removeFromQueue(episodeId: number): boolean {
    const index = this.queue.findIndex(ep => ep.episode_id === episodeId);
    if (index !== -1) {
      const episode = this.queue[index];
      this.queue.splice(index, 1);
      
      // Cancel download if in progress
      this.downloader.cancelDownload(episodeId);
      
      // Cancel retry if scheduled
      this.retryManager.cancelRetry(episodeId);
      
      console.log(`Removed episode ${episodeId} from queue`);
      return true;
    }
    return false;
  }

  /**
   * Get current queue statistics
   */
  public getStats(): QueueStats {
    const allEpisodes = dal.episodes.getAll();
    
    return {
      totalItems: allEpisodes.length,
      pending: this.queue.length,
      downloading: this.downloader.getActiveDownloads().length,
      completed: dal.episodes.getDownloaded().length,
      failed: dal.episodes.getFailed().length,
      paused: this.isPaused ? this.queue.length : 0,
    };
  }

  /**
   * Check if queue is currently running
   */
  public isQueueRunning(): boolean {
    return this.isRunning && !this.isPaused;
  }

  /**
   * Add event listener
   */
  public addEventListener(listener: (event: QueueEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(listener: (event: QueueEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Update queue configuration
   */
  public updateConfig(newConfig: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Save to database
    dal.settings.set('max_concurrent_downloads', this.config.maxConcurrentDownloads.toString());
    
    console.log('Updated queue configuration:', this.config);
  }

  /**
   * Process the download queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    const activeDownloads = this.downloader.getActiveDownloads().length;
    const availableSlots = this.config.maxConcurrentDownloads - activeDownloads;

    if (availableSlots > 0 && this.queue.length > 0) {
      const episodesToStart = this.queue.splice(0, availableSlots);
      
      for (const episode of episodesToStart) {
        this.startDownload(episode);
      }
    }

    // Continue processing if there are items in queue
    if (this.queue.length > 0 || activeDownloads > 0) {
      setTimeout(() => this.processQueue(), 1000); // Check every second
    } else {
      this.isRunning = false;
      console.log('Download queue processing completed');
    }
  }

  /**
   * Start downloading a single episode
   */
  private async startDownload(episode: Episode): Promise<void> {
    try {
      this.emitEvent({
        type: 'started',
        episode,
      });

      const result = await this.downloader.downloadEpisode(
        episode,
        (progress) => {
          this.emitEvent({
            type: 'progress',
            episode,
            progress,
          });
        }
      );

      if (result.success) {
        this.emitEvent({
          type: 'completed',
          episode,
          result,
        });
        
        // Reset retry count on success
        this.retryManager.resetRetryCount(episode);
      } else {
        this.handleDownloadFailure(episode, result.error || 'Unknown error');
      }

    } catch (error) {
      this.handleDownloadFailure(episode, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle download failure and schedule retry if appropriate
   */
  private handleDownloadFailure(episode: Episode, error: string): void {
    this.emitEvent({
      type: 'failed',
      episode,
      error,
    });

    if (this.retryManager.shouldRetry(episode)) {
      this.retryManager.scheduleRetry(episode, error, async (retryEpisode) => {
        // Add back to front of queue for retry
        this.queue.unshift(retryEpisode);
        
        // Continue processing queue if not already running
        if (this.isRunning && !this.isPaused) {
          this.processQueue();
        }
      });
    }
  }

  /**
   * Check if episode is in the queue
   */
  private isInQueue(episodeId: number): boolean {
    return this.queue.some(ep => ep.episode_id === episodeId);
  }

  /**
   * Sort queue by priority (date or other criteria)
   */
  private sortQueue(): void {
    if (this.config.prioritizeByDate) {
      this.queue.sort((a, b) => {
        const dateA = new Date(a.published_date).getTime();
        const dateB = new Date(b.published_date).getTime();
        return dateB - dateA; // Newest first
      });
    }
  }

  /**
   * Load configuration from database
   */
  private loadConfigFromDatabase(): void {
    try {
      const maxConcurrent = dal.settings.getMaxConcurrentDownloads();
      this.config.maxConcurrentDownloads = maxConcurrent;
    } catch (error) {
      console.warn('Failed to load queue config from database:', error);
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: QueueEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in queue event listener:', error);
      }
    }
  }

  /**
   * Add all pending episodes to queue
   */
  public addAllPendingToQueue(): void {
    const pendingEpisodes = dal.episodes.getPendingDownloads();
    this.addToQueue(pendingEpisodes);
  }

  /**
   * Get current queue contents
   */
  public getQueue(): Episode[] {
    return [...this.queue]; // Return copy to prevent external modification
  }
}