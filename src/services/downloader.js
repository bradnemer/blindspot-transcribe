import axios from 'axios';
import fs from 'fs';
import { FileManager } from './fileManager';
import { dal } from '../database';
export class Downloader {
    fileManager;
    activeDownloads = new Map();
    downloadStartTimes = new Map();
    constructor() {
        this.fileManager = new FileManager();
        this.fileManager.initialize();
    }
    /**
     * Download a single episode
     */
    async downloadEpisode(episode, onProgress) {
        const startTime = Date.now();
        this.downloadStartTimes.set(episode.episode_id, startTime);
        try {
            // Check available disk space
            const directoryManager = this.fileManager.getDirectoryManager();
            if (!directoryManager.hasEnoughSpace(100 * 1024 * 1024)) { // 100MB minimum
                throw new Error('Insufficient disk space for download');
            }
            // Update episode status to downloading
            if (episode.id) {
                dal.episodes.update(episode.id, {
                    download_status: 'downloading',
                    download_progress: 0,
                });
            }
            // Get temporary file path for download
            const tempFilePath = this.fileManager.getTempFilePath(episode);
            // Create cancel token for this download
            const cancelToken = axios.CancelToken.source();
            this.activeDownloads.set(episode.episode_id, cancelToken);
            // Configure axios for download with redirect handling
            const response = await axios({
                method: 'GET',
                url: episode.audio_url,
                responseType: 'stream',
                timeout: 30000, // 30 second timeout
                maxRedirects: 5, // Handle up to 5 redirects
                cancelToken: cancelToken.token,
                onDownloadProgress: (progressEvent) => {
                    const loaded = progressEvent.loaded || 0;
                    const total = progressEvent.total || 0;
                    const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
                    // Calculate download speed
                    const elapsed = Date.now() - startTime;
                    const speed = elapsed > 0 ? loaded / (elapsed / 1000) : 0;
                    // Estimate time remaining
                    const remaining = total > loaded && speed > 0 ? (total - loaded) / speed : 0;
                    // Update database progress
                    if (episode.id) {
                        dal.episodes.update(episode.id, {
                            download_progress: percentage,
                        });
                    }
                    // Call progress callback
                    if (onProgress) {
                        onProgress({
                            episodeId: episode.episode_id,
                            loaded,
                            total,
                            percentage,
                            speed,
                            estimatedTimeRemaining: remaining,
                        });
                    }
                },
            });
            // Save response stream to file
            const writer = fs.createWriteStream(tempFilePath);
            response.data.pipe(writer);
            return new Promise((resolve, reject) => {
                writer.on('finish', async () => {
                    try {
                        // Move temp file to final location
                        const finalPath = this.fileManager.finalizeDownload(episode);
                        const duration = Date.now() - startTime;
                        const fileSize = fs.statSync(finalPath).size;
                        // Clean up
                        this.activeDownloads.delete(episode.episode_id);
                        this.downloadStartTimes.delete(episode.episode_id);
                        resolve({
                            success: true,
                            episodeId: episode.episode_id,
                            filePath: finalPath,
                            bytesDownloaded: fileSize,
                            duration,
                        });
                    }
                    catch (error) {
                        reject(new Error(`Failed to finalize download: ${error}`));
                    }
                });
                writer.on('error', (error) => {
                    this.cleanupFailedDownload(episode);
                    reject(new Error(`File write error: ${error}`));
                });
                response.data.on('error', (error) => {
                    this.cleanupFailedDownload(episode);
                    reject(new Error(`Download stream error: ${error.message}`));
                });
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.cleanupFailedDownload(episode);
            if (axios.isCancel(error)) {
                return {
                    success: false,
                    episodeId: episode.episode_id,
                    error: 'Download cancelled',
                    bytesDownloaded: 0,
                    duration,
                };
            }
            let errorMessage = 'Unknown download error';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
                }
                else if (error.request) {
                    errorMessage = 'Network error - no response received';
                }
                else {
                    errorMessage = error.message;
                }
            }
            return {
                success: false,
                episodeId: episode.episode_id,
                error: errorMessage,
                bytesDownloaded: 0,
                duration,
            };
        }
    }
    /**
     * Cancel a download in progress
     */
    cancelDownload(episodeId) {
        const cancelToken = this.activeDownloads.get(episodeId);
        if (cancelToken) {
            cancelToken.cancel('Download cancelled by user');
            this.activeDownloads.delete(episodeId);
            this.downloadStartTimes.delete(episodeId);
            // Update episode status
            const episode = dal.episodes.getByEpisodeId(episodeId);
            if (episode) {
                this.fileManager.cleanupFailedDownload(episode);
            }
            return true;
        }
        return false;
    }
    /**
     * Check if an episode is currently downloading
     */
    isDownloading(episodeId) {
        return this.activeDownloads.has(episodeId);
    }
    /**
     * Get list of currently downloading episodes
     */
    getActiveDownloads() {
        return Array.from(this.activeDownloads.keys());
    }
    /**
     * Cancel all active downloads
     */
    cancelAllDownloads() {
        for (const [episodeId, cancelToken] of this.activeDownloads) {
            cancelToken.cancel('All downloads cancelled');
            // Clean up episode
            const episode = dal.episodes.getByEpisodeId(episodeId);
            if (episode) {
                this.fileManager.cleanupFailedDownload(episode);
            }
        }
        this.activeDownloads.clear();
        this.downloadStartTimes.clear();
    }
    /**
     * Test if a URL is accessible
     */
    async testUrl(url) {
        try {
            const response = await axios.head(url, {
                timeout: 10000,
                maxRedirects: 5,
            });
            return {
                accessible: true,
                contentLength: parseInt(response.headers['content-length'] || '0', 10),
                contentType: response.headers['content-type'],
                finalUrl: response.config.url,
            };
        }
        catch (error) {
            let errorMessage = 'Unknown error';
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
                }
                else if (error.request) {
                    errorMessage = 'Network error - no response received';
                }
                else {
                    errorMessage = error.message;
                }
            }
            return {
                accessible: false,
                error: errorMessage,
            };
        }
    }
    /**
     * Cleanup after a failed download
     */
    cleanupFailedDownload(episode) {
        try {
            this.fileManager.cleanupFailedDownload(episode);
            this.activeDownloads.delete(episode.episode_id);
            this.downloadStartTimes.delete(episode.episode_id);
        }
        catch (error) {
            console.error(`Failed to cleanup episode ${episode.episode_id}:`, error);
        }
    }
    /**
     * Get download statistics
     */
    getDownloadStats() {
        const activeCount = this.activeDownloads.size;
        // This is a simplified version - in practice you'd track speeds per download
        return {
            activeDownloads: activeCount,
            totalSpeed: 0, // Would need to be calculated from active downloads
            averageSpeed: 0, // Would need to be calculated from completed downloads
        };
    }
}
//# sourceMappingURL=downloader.js.map