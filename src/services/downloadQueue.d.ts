import { Episode } from '../types';
import { DownloadProgress, DownloadResult } from './downloader';
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
export declare class DownloadQueue {
    private downloader;
    private retryManager;
    private queue;
    private isRunning;
    private isPaused;
    private config;
    private eventListeners;
    constructor(config?: Partial<QueueConfig>);
    /**
     * Add episodes to the download queue
     */
    addToQueue(episodes: Episode | Episode[]): void;
    /**
     * Start processing the download queue
     */
    start(): void;
    /**
     * Pause the download queue
     */
    pause(): void;
    /**
     * Resume the download queue
     */
    resume(): void;
    /**
     * Stop the download queue
     */
    stop(): void;
    /**
     * Clear the entire queue
     */
    clear(): void;
    /**
     * Remove specific episode from queue
     */
    removeFromQueue(episodeId: number): boolean;
    /**
     * Get current queue statistics
     */
    getStats(): QueueStats;
    /**
     * Check if queue is currently running
     */
    isQueueRunning(): boolean;
    /**
     * Add event listener
     */
    addEventListener(listener: (event: QueueEvent) => void): void;
    /**
     * Remove event listener
     */
    removeEventListener(listener: (event: QueueEvent) => void): void;
    /**
     * Update queue configuration
     */
    updateConfig(newConfig: Partial<QueueConfig>): void;
    /**
     * Process the download queue
     */
    private processQueue;
    /**
     * Start downloading a single episode
     */
    private startDownload;
    /**
     * Handle download failure and schedule retry if appropriate
     */
    private handleDownloadFailure;
    /**
     * Check if episode is in the queue
     */
    private isInQueue;
    /**
     * Sort queue by priority (date or other criteria)
     */
    private sortQueue;
    /**
     * Load configuration from database
     */
    private loadConfigFromDatabase;
    /**
     * Emit event to listeners
     */
    private emitEvent;
    /**
     * Add all pending episodes to queue
     */
    addAllPendingToQueue(): void;
    /**
     * Get current queue contents
     */
    getQueue(): Episode[];
}
//# sourceMappingURL=downloadQueue.d.ts.map