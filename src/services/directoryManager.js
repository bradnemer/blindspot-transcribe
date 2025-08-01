import path from 'path';
import { FileSystemUtils } from '../utils/fileSystem';
import { dal } from '../database';
export class DirectoryManager {
    baseDownloadDir;
    completedDir;
    constructor() {
        this.baseDownloadDir = dal.settings.getDownloadDirectory();
        this.completedDir = path.join(this.baseDownloadDir, 'done');
    }
    /**
     * Initialize the directory structure
     */
    initializeDirectories() {
        try {
            // Create base download directory
            FileSystemUtils.ensureDirectoryExists(this.baseDownloadDir);
            // Create completed/transcribed directory
            FileSystemUtils.ensureDirectoryExists(this.completedDir);
            console.log(`Directories initialized:`);
            console.log(`  Downloads: ${this.baseDownloadDir}`);
            console.log(`  Completed: ${this.completedDir}`);
        }
        catch (error) {
            throw new Error(`Failed to initialize directories: ${error}`);
        }
    }
    /**
     * Get the base download directory path
     */
    getDownloadDirectory() {
        return this.baseDownloadDir;
    }
    /**
     * Get the completed/transcribed directory path
     */
    getCompletedDirectory() {
        return this.completedDir;
    }
    /**
     * Update the base download directory
     */
    updateDownloadDirectory(newPath) {
        this.baseDownloadDir = newPath;
        this.completedDir = path.join(newPath, 'done');
        // Update in database
        dal.settings.set('download_directory', newPath);
        // Ensure new directories exist
        this.initializeDirectories();
    }
    /**
     * Check if directories exist and are writable
     */
    validateDirectories() {
        const issues = [];
        try {
            // Check if base directory exists and is accessible
            if (!FileSystemUtils.fileExists(this.baseDownloadDir)) {
                issues.push(`Download directory does not exist: ${this.baseDownloadDir}`);
            }
            // Check if completed directory exists and is accessible
            if (!FileSystemUtils.fileExists(this.completedDir)) {
                issues.push(`Completed directory does not exist: ${this.completedDir}`);
            }
            // Try to create a test file to check write permissions
            const testFilePath = path.join(this.baseDownloadDir, '.write-test');
            try {
                FileSystemUtils.createWriteStream(testFilePath).end();
                FileSystemUtils.deleteFile(testFilePath);
            }
            catch (error) {
                issues.push(`No write permission to download directory: ${this.baseDownloadDir}`);
            }
        }
        catch (error) {
            issues.push(`Directory validation failed: ${error}`);
        }
        return {
            isValid: issues.length === 0,
            issues,
        };
    }
    /**
     * Get available space in the download directory
     */
    getAvailableSpace() {
        try {
            return FileSystemUtils.getAvailableSpace(this.baseDownloadDir);
        }
        catch (error) {
            console.warn(`Could not get available space: ${error}`);
            return 0;
        }
    }
    /**
     * Check if there's enough space for a download
     */
    hasEnoughSpace(requiredBytes) {
        const availableSpace = this.getAvailableSpace();
        const buffer = 1024 * 1024 * 100; // 100MB buffer
        return availableSpace > (requiredBytes + buffer);
    }
    /**
     * Get list of downloaded files
     */
    getDownloadedFiles() {
        try {
            return FileSystemUtils.listFiles(this.baseDownloadDir, '.mp3');
        }
        catch (error) {
            console.error(`Failed to list downloaded files: ${error}`);
            return [];
        }
    }
    /**
     * Get list of completed/transcribed files
     */
    getCompletedFiles() {
        try {
            return FileSystemUtils.listFiles(this.completedDir, '.mp3');
        }
        catch (error) {
            console.error(`Failed to list completed files: ${error}`);
            return [];
        }
    }
    /**
     * Clean up temporary or failed download files
     */
    cleanupTempFiles() {
        try {
            const tempFiles = FileSystemUtils.listFiles(this.baseDownloadDir)
                .filter(file => file.endsWith('.tmp') || file.endsWith('.part'));
            for (const tempFile of tempFiles) {
                const fullPath = path.join(this.baseDownloadDir, tempFile);
                FileSystemUtils.deleteFile(fullPath);
                console.log(`Cleaned up temp file: ${tempFile}`);
            }
        }
        catch (error) {
            console.error(`Failed to cleanup temp files: ${error}`);
        }
    }
}
//# sourceMappingURL=directoryManager.js.map