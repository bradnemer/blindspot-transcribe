import { Episode } from '../types';
export interface DownloadProgress {
    episodeId: number;
    loaded: number;
    total: number;
    percentage: number;
    speed: number;
    estimatedTimeRemaining: number;
}
export interface DownloadResult {
    success: boolean;
    episodeId: number;
    filePath?: string;
    error?: string;
    bytesDownloaded: number;
    duration: number;
}
export declare class Downloader {
    private fileManager;
    private activeDownloads;
    private downloadStartTimes;
    constructor();
    /**
     * Download a single episode
     */
    downloadEpisode(episode: Episode, onProgress?: (progress: DownloadProgress) => void): Promise<DownloadResult>;
    /**
     * Cancel a download in progress
     */
    cancelDownload(episodeId: number): boolean;
    /**
     * Check if an episode is currently downloading
     */
    isDownloading(episodeId: number): boolean;
    /**
     * Get list of currently downloading episodes
     */
    getActiveDownloads(): number[];
    /**
     * Cancel all active downloads
     */
    cancelAllDownloads(): void;
    /**
     * Test if a URL is accessible
     */
    testUrl(url: string): Promise<{
        accessible: boolean;
        contentLength?: number;
        contentType?: string;
        finalUrl?: string;
        error?: string;
    }>;
    /**
     * Cleanup after a failed download
     */
    private cleanupFailedDownload;
    /**
     * Get download statistics
     */
    getDownloadStats(): {
        activeDownloads: number;
        totalSpeed: number;
        averageSpeed: number;
    };
}
//# sourceMappingURL=downloader.d.ts.map