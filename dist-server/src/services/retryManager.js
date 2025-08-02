import { dal } from '../database';
export class RetryManager {
    config;
    defaultConfig = {
        maxAttempts: 3,
        baseDelay: 5000, // 5 seconds
        maxDelay: 300000, // 5 minutes
        backoffMultiplier: 2,
        jitter: true,
    };
    retryTimeouts = new Map();
    constructor(config = {}) {
        this.config = config;
        this.config = { ...this.defaultConfig, ...config };
    }
    /**
     * Check if an episode should be retried
     */
    shouldRetry(episode) {
        return episode.retry_count < this.config.maxAttempts;
    }
    /**
     * Calculate delay for next retry attempt
     */
    calculateDelay(attemptNumber) {
        let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attemptNumber - 1);
        // Cap at maximum delay
        delay = Math.min(delay, this.config.maxDelay);
        // Add jitter to prevent thundering herd
        if (this.config.jitter) {
            const jitterAmount = delay * 0.1; // 10% jitter
            delay += (Math.random() - 0.5) * 2 * jitterAmount;
        }
        return Math.max(delay, 1000); // Minimum 1 second delay
    }
    /**
     * Schedule a retry for a failed episode
     */
    scheduleRetry(episode, error, retryCallback) {
        if (!this.shouldRetry(episode)) {
            console.log(`Max retry attempts reached for episode ${episode.episode_id}`);
            this.markAsFailed(episode, error);
            return;
        }
        const nextAttempt = episode.retry_count + 1;
        const delay = this.calculateDelay(nextAttempt);
        const nextRetryAt = new Date(Date.now() + delay);
        // Update episode with retry information
        if (episode.id) {
            dal.episodes.update(episode.id, {
                retry_count: nextAttempt,
                error_message: error,
                download_status: 'pending', // Reset to pending for retry
            });
        }
        // Log retry attempt
        console.log(`Scheduling retry ${nextAttempt}/${this.config.maxAttempts} for episode ${episode.episode_id} in ${Math.round(delay / 1000)}s`);
        // Clear any existing timeout for this episode
        this.clearRetryTimeout(episode.episode_id);
        // Schedule the retry
        const timeout = setTimeout(async () => {
            try {
                console.log(`Retrying download for episode ${episode.episode_id} (attempt ${nextAttempt})`);
                // Get updated episode data
                const updatedEpisode = episode.id ? dal.episodes.getById(episode.id) : episode;
                if (updatedEpisode) {
                    await retryCallback(updatedEpisode);
                }
            }
            catch (retryError) {
                console.error(`Retry failed for episode ${episode.episode_id}:`, retryError);
                this.scheduleRetry(episode, `Retry failed: ${retryError}`, retryCallback);
            }
            finally {
                this.retryTimeouts.delete(episode.episode_id);
            }
        }, delay);
        this.retryTimeouts.set(episode.episode_id, timeout);
    }
    /**
     * Cancel a scheduled retry
     */
    cancelRetry(episodeId) {
        return this.clearRetryTimeout(episodeId);
    }
    /**
     * Cancel all scheduled retries
     */
    cancelAllRetries() {
        for (const [episodeId, timeout] of this.retryTimeouts) {
            clearTimeout(timeout);
            console.log(`Cancelled retry for episode ${episodeId}`);
        }
        this.retryTimeouts.clear();
    }
    /**
     * Get episodes that are pending retry
     */
    getPendingRetries() {
        const allEpisodes = dal.episodes.getAll();
        return allEpisodes.filter(episode => episode.download_status === 'pending' &&
            episode.retry_count > 0 &&
            episode.retry_count < this.config.maxAttempts);
    }
    /**
     * Get retry statistics
     */
    getRetryStats() {
        const scheduledRetries = this.retryTimeouts.size;
        const failedEpisodes = dal.episodes.getFailed().length;
        const allEpisodes = dal.episodes.getAll();
        const episodesWithRetries = allEpisodes.filter(ep => ep.retry_count > 0);
        const averageRetryCount = episodesWithRetries.length > 0
            ? episodesWithRetries.reduce((sum, ep) => sum + ep.retry_count, 0) / episodesWithRetries.length
            : 0;
        return {
            scheduledRetries,
            failedEpisodes,
            maxRetryAttempts: this.config.maxAttempts,
            averageRetryCount: Math.round(averageRetryCount * 100) / 100,
        };
    }
    /**
     * Reset retry count for an episode
     */
    resetRetryCount(episode) {
        if (episode.id) {
            dal.episodes.update(episode.id, {
                retry_count: 0,
                error_message: null,
            });
        }
        // Cancel any scheduled retry
        this.cancelRetry(episode.episode_id);
    }
    /**
     * Mark episode as permanently failed
     */
    markAsFailed(episode, error) {
        if (episode.id) {
            dal.episodes.update(episode.id, {
                download_status: 'failed',
                error_message: error,
            });
        }
        console.error(`Episode ${episode.episode_id} marked as failed after ${episode.retry_count} attempts: ${error}`);
    }
    /**
     * Clear retry timeout for an episode
     */
    clearRetryTimeout(episodeId) {
        const timeout = this.retryTimeouts.get(episodeId);
        if (timeout) {
            clearTimeout(timeout);
            this.retryTimeouts.delete(episodeId);
            return true;
        }
        return false;
    }
    /**
     * Update retry configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Get current retry configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Check if episode has retry scheduled
     */
    hasScheduledRetry(episodeId) {
        return this.retryTimeouts.has(episodeId);
    }
    /**
     * Force immediate retry for an episode
     */
    async forceRetry(episode, retryCallback) {
        // Cancel any scheduled retry
        this.cancelRetry(episode.episode_id);
        // Reset status to pending
        if (episode.id) {
            dal.episodes.update(episode.id, {
                download_status: 'pending',
                error_message: null,
            });
        }
        // Execute retry immediately
        await retryCallback(episode);
    }
}
