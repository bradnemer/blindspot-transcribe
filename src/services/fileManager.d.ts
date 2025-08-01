import { Episode } from '../types';
import { DirectoryManager } from './directoryManager';
export declare class FileManager {
    private directoryManager;
    constructor();
    /**
     * Initialize file management system
     */
    initialize(): void;
    /**
     * Move a downloaded file to the completed directory
     */
    moveToCompleted(episode: Episode): void;
    /**
     * Move a file back from completed to downloads directory
     */
    moveBackToDownloads(episode: Episode): void;
    /**
     * Get the expected file path for an episode
     */
    getExpectedFilePath(episode: Episode): string;
    /**
     * Get the temporary file path for downloading an episode
     */
    getTempFilePath(episode: Episode): string;
    /**
     * Finalize a download by renaming temp file to final file
     */
    finalizeDownload(episode: Episode): string;
    /**
     * Clean up a failed download
     */
    cleanupFailedDownload(episode: Episode): void;
    /**
     * Check if an episode file exists
     */
    episodeFileExists(episode: Episode): boolean;
    /**
     * Get file size for an episode
     */
    getEpisodeFileSize(episode: Episode): number | null;
    /**
     * Validate episode file integrity
     */
    validateEpisodeFile(episode: Episode): {
        isValid: boolean;
        issues: string[];
    };
    /**
     * Get directory manager instance
     */
    getDirectoryManager(): DirectoryManager;
    /**
     * Sync database with actual files on disk
     */
    syncWithFileSystem(): {
        synced: number;
        issues: string[];
    };
}
//# sourceMappingURL=fileManager.d.ts.map