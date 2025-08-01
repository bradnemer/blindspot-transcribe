export declare class DirectoryManager {
    private baseDownloadDir;
    private completedDir;
    constructor();
    /**
     * Initialize the directory structure
     */
    initializeDirectories(): void;
    /**
     * Get the base download directory path
     */
    getDownloadDirectory(): string;
    /**
     * Get the completed/transcribed directory path
     */
    getCompletedDirectory(): string;
    /**
     * Update the base download directory
     */
    updateDownloadDirectory(newPath: string): void;
    /**
     * Check if directories exist and are writable
     */
    validateDirectories(): {
        isValid: boolean;
        issues: string[];
    };
    /**
     * Get available space in the download directory
     */
    getAvailableSpace(): number;
    /**
     * Check if there's enough space for a download
     */
    hasEnoughSpace(requiredBytes: number): boolean;
    /**
     * Get list of downloaded files
     */
    getDownloadedFiles(): string[];
    /**
     * Get list of completed/transcribed files
     */
    getCompletedFiles(): string[];
    /**
     * Clean up temporary or failed download files
     */
    cleanupTempFiles(): void;
}
//# sourceMappingURL=directoryManager.d.ts.map