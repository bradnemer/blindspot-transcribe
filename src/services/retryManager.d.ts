import { Episode } from '../types';
export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
}
export interface RetryAttempt {
    episodeId: number;
    attempt: number;
    error: string;
    timestamp: Date;
    nextRetryAt?: Date;
}
export declare class RetryManager {
    private config;
    private defaultConfig;
    private retryTimeouts;
    constructor(config?: RetryConfig);
    /**
     * Check if an episode should be retried
     */
    shouldRetry(episode: Episode): boolean;
    /**
     * Calculate delay for next retry attempt
     */
    calculateDelay(attemptNumber: number): number;
    /**
     * Schedule a retry for a failed episode
     */
    scheduleRetry(episode: Episode, error: string, retryCallback: (episode: Episode) => Promise<void>): void;
    /**
     * Cancel a scheduled retry
     */
    cancelRetry(episodeId: number): boolean;
    /**
     * Cancel all scheduled retries
     */
    cancelAllRetries(): void;
    /**
     * Get episodes that are pending retry
     */
    getPendingRetries(): Episode[];
    /**
     * Get retry statistics
     */
    getRetryStats(): {
        scheduledRetries: number;
        failedEpisodes: number;
        maxRetryAttempts: number;
        averageRetryCount: number;
    };
    /**
     * Reset retry count for an episode
     */
    resetRetryCount(episode: Episode): void;
    /**
     * Mark episode as permanently failed
     */
    private markAsFailed;
    /**
     * Clear retry timeout for an episode
     */
    private clearRetryTimeout;
    /**
     * Update retry configuration
     */
    updateConfig(newConfig: Partial<RetryConfig>): void;
    /**
     * Get current retry configuration
     */
    getConfig(): RetryConfig;
    /**
     * Check if episode has retry scheduled
     */
    hasScheduledRetry(episodeId: number): boolean;
    /**
     * Force immediate retry for an episode
     */
    forceRetry(episode: Episode, retryCallback: (episode: Episode) => Promise<void>): Promise<void>;
}
//# sourceMappingURL=retryManager.d.ts.map