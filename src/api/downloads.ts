import apiClient from './client';

export interface DownloadResult {
  episodeId: number;
  status: 'queued' | 'stopped' | 'not_found';
}

export interface DownloadStatus {
  active: number;
  queued: number;
  completed: number;
  failed: number;
  scheduledRetries: number;
  retriedEpisodes: number;
  totalBytes: number;
  downloadedBytes: number;
  currentDownloads: Array<{
    episodeId: number;
    progress: number;
    speed: number;
    eta: number;
  }>;
}

export interface RetryStats {
  scheduledRetries: number;
  failedEpisodes: number;
  retriedEpisodes: number;
  maxRetryAttempts: number;
  averageRetryCount: number;
  retryConfig: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
  };
}

export class DownloadsAPI {
  // Start downloads for episodes
  static async startDownloads(episodeIds: number[]): Promise<DownloadResult[]> {
    const response = await apiClient.post('/downloads/start', { episodeIds });
    return response.data.results;
  }

  // Stop downloads for episodes
  static async stopDownloads(episodeIds: number[]): Promise<DownloadResult[]> {
    const response = await apiClient.post('/downloads/stop', { episodeIds });
    return response.data.results;
  }

  // Get current download status
  static async getDownloadStatus(): Promise<DownloadStatus> {
    const response = await apiClient.get('/downloads/status');
    return response.data;
  }

  // Start download for a single episode
  static async startDownload(episodeId: number): Promise<DownloadResult> {
    const results = await this.startDownloads([episodeId]);
    return results[0];
  }

  // Stop download for a single episode
  static async stopDownload(episodeId: number): Promise<DownloadResult> {
    const results = await this.stopDownloads([episodeId]);
    return results[0];
  }

  // Check if episode is currently downloading
  static async isDownloading(episodeId: number): Promise<boolean> {
    const status = await this.getDownloadStatus();
    return status.currentDownloads.some(download => download.episodeId === episodeId);
  }

  // Get download progress for an episode
  static async getDownloadProgress(episodeId: number): Promise<number | null> {
    const status = await this.getDownloadStatus();
    const currentDownload = status.currentDownloads.find(download => download.episodeId === episodeId);
    return currentDownload ? currentDownload.progress : null;
  }

  // Sync database with downloaded files
  static async syncDownloads(): Promise<{
    success: boolean;
    syncedCount: number;
    message: string;
  }> {
    const response = await apiClient.post('/downloads/sync');
    return response.data;
  }

  // Get retry statistics
  static async getRetryStats(): Promise<RetryStats> {
    const response = await apiClient.get('/downloads/retry-stats');
    return response.data;
  }

  // Manually retry a specific episode
  static async retryEpisode(episodeId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await apiClient.post(`/downloads/retry/${episodeId}`);
    return response.data;
  }

  // Cancel all scheduled retries
  static async cancelAllRetries(): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await apiClient.post('/downloads/cancel-retries');
    return response.data;
  }
}