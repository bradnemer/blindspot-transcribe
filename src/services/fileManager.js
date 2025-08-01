import path from 'path';
import { FileSystemUtils } from '../utils/fileSystem';
import { FileNamingUtils } from '../utils/fileNaming';
import { DirectoryManager } from './directoryManager';
import { dal } from '../database';
export class FileManager {
    directoryManager;
    constructor() {
        this.directoryManager = new DirectoryManager();
    }
    /**
     * Initialize file management system
     */
    initialize() {
        this.directoryManager.initializeDirectories();
    }
    /**
     * Move a downloaded file to the completed directory
     */
    moveToCompleted(episode) {
        if (!episode.file_path) {
            throw new Error('Episode does not have a file path');
        }
        const sourceFile = episode.file_path;
        const completedDir = this.directoryManager.getCompletedDirectory();
        const filename = path.basename(sourceFile);
        const destinationFile = path.join(completedDir, filename);
        try {
            // Check if source file exists
            if (!FileSystemUtils.fileExists(sourceFile)) {
                throw new Error(`Source file does not exist: ${sourceFile}`);
            }
            // Move the file
            FileSystemUtils.moveFile(sourceFile, destinationFile);
            // Update episode record in database
            dal.episodes.update(episode.id, {
                file_path: destinationFile,
                download_status: 'transcribed',
            });
            console.log(`Moved episode ${episode.episode_id} to completed directory`);
        }
        catch (error) {
            throw new Error(`Failed to move episode ${episode.episode_id} to completed: ${error}`);
        }
    }
    /**
     * Move a file back from completed to downloads directory
     */
    moveBackToDownloads(episode) {
        if (!episode.file_path) {
            throw new Error('Episode does not have a file path');
        }
        const sourceFile = episode.file_path;
        const downloadDir = this.directoryManager.getDownloadDirectory();
        const filename = path.basename(sourceFile);
        const destinationFile = path.join(downloadDir, filename);
        try {
            // Check if source file exists
            if (!FileSystemUtils.fileExists(sourceFile)) {
                throw new Error(`Source file does not exist: ${sourceFile}`);
            }
            // Move the file
            FileSystemUtils.moveFile(sourceFile, destinationFile);
            // Update episode record in database
            dal.episodes.update(episode.id, {
                file_path: destinationFile,
                download_status: 'downloaded',
            });
            console.log(`Moved episode ${episode.episode_id} back to downloads directory`);
        }
        catch (error) {
            throw new Error(`Failed to move episode ${episode.episode_id} back to downloads: ${error}`);
        }
    }
    /**
     * Get the expected file path for an episode
     */
    getExpectedFilePath(episode) {
        const downloadDir = this.directoryManager.getDownloadDirectory();
        return FileNamingUtils.generateFilePath(episode, downloadDir);
    }
    /**
     * Get the temporary file path for downloading an episode
     */
    getTempFilePath(episode) {
        const downloadDir = this.directoryManager.getDownloadDirectory();
        return FileNamingUtils.generateTempFilePath(episode, downloadDir);
    }
    /**
     * Finalize a download by renaming temp file to final file
     */
    finalizeDownload(episode) {
        const tempPath = this.getTempFilePath(episode);
        const finalPath = this.getExpectedFilePath(episode);
        try {
            // Check if temp file exists
            if (!FileSystemUtils.fileExists(tempPath)) {
                throw new Error(`Temporary file does not exist: ${tempPath}`);
            }
            // Move temp file to final location
            FileSystemUtils.moveFile(tempPath, finalPath);
            // Update episode in database
            dal.episodes.update(episode.id, {
                file_path: finalPath,
                download_status: 'downloaded',
                download_progress: 100,
            });
            console.log(`Finalized download for episode ${episode.episode_id}`);
            return finalPath;
        }
        catch (error) {
            throw new Error(`Failed to finalize download for episode ${episode.episode_id}: ${error}`);
        }
    }
    /**
     * Clean up a failed download
     */
    cleanupFailedDownload(episode) {
        const tempPath = this.getTempFilePath(episode);
        try {
            if (FileSystemUtils.fileExists(tempPath)) {
                FileSystemUtils.deleteFile(tempPath);
                console.log(`Cleaned up failed download for episode ${episode.episode_id}`);
            }
            // Update episode status in database
            dal.episodes.update(episode.id, {
                download_status: 'failed',
                file_path: null,
            });
        }
        catch (error) {
            console.error(`Failed to cleanup episode ${episode.episode_id}: ${error}`);
        }
    }
    /**
     * Check if an episode file exists
     */
    episodeFileExists(episode) {
        if (!episode.file_path) {
            return false;
        }
        return FileSystemUtils.fileExists(episode.file_path);
    }
    /**
     * Get file size for an episode
     */
    getEpisodeFileSize(episode) {
        if (!episode.file_path || !this.episodeFileExists(episode)) {
            return null;
        }
        try {
            return FileSystemUtils.getFileSize(episode.file_path);
        }
        catch (error) {
            console.error(`Failed to get file size for episode ${episode.episode_id}: ${error}`);
            return null;
        }
    }
    /**
     * Validate episode file integrity
     */
    validateEpisodeFile(episode) {
        const issues = [];
        if (!episode.file_path) {
            issues.push('No file path specified');
            return { isValid: false, issues };
        }
        // Check if file exists
        if (!FileSystemUtils.fileExists(episode.file_path)) {
            issues.push(`File does not exist: ${episode.file_path}`);
        }
        // Check if filename matches expected pattern
        if (!FileNamingUtils.validateFilePath(episode.file_path, episode)) {
            issues.push('Filename does not match expected pattern');
        }
        // Check file size (should be > 0)
        try {
            const fileSize = FileSystemUtils.getFileSize(episode.file_path);
            if (fileSize === 0) {
                issues.push('File is empty (0 bytes)');
            }
        }
        catch (error) {
            issues.push(`Cannot read file: ${error}`);
        }
        return {
            isValid: issues.length === 0,
            issues,
        };
    }
    /**
     * Get directory manager instance
     */
    getDirectoryManager() {
        return this.directoryManager;
    }
    /**
     * Sync database with actual files on disk
     */
    syncWithFileSystem() {
        const issues = [];
        let synced = 0;
        try {
            // Get all episodes that should have files
            const downloadedEpisodes = dal.episodes.getByStatus('downloaded');
            const transcribedEpisodes = dal.episodes.getByStatus('transcribed');
            const allEpisodes = [...downloadedEpisodes, ...transcribedEpisodes];
            for (const episode of allEpisodes) {
                if (!episode.file_path) {
                    continue;
                }
                const validation = this.validateEpisodeFile(episode);
                if (!validation.isValid) {
                    issues.push(`Episode ${episode.episode_id}: ${validation.issues.join(', ')}`);
                    // Mark as failed if file doesn't exist
                    if (validation.issues.some(issue => issue.includes('does not exist'))) {
                        dal.episodes.update(episode.id, {
                            download_status: 'failed',
                            file_path: null,
                        });
                        synced++;
                    }
                }
            }
            return { synced, issues };
        }
        catch (error) {
            issues.push(`Sync failed: ${error}`);
            return { synced, issues };
        }
    }
}
//# sourceMappingURL=fileManager.js.map