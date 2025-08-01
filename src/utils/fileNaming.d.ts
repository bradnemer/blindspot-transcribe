import { Episode } from '../types';
export declare class FileNamingUtils {
    /**
     * Generates a filename for an episode following the convention:
     * {podcast_id}_{episode_id}_{published_date}.mp3
     */
    static generateFilename(episode: Episode): string;
    /**
     * Generates a full file path for an episode
     */
    static generateFilePath(episode: Episode, downloadDirectory: string): string;
    /**
     * Generates a temporary filename for downloading
     */
    static generateTempFilename(episode: Episode): string;
    /**
     * Generates a full temporary file path for downloading
     */
    static generateTempFilePath(episode: Episode, downloadDirectory: string): string;
    /**
     * Formats a date string for use in filename (YYYY-MM-DD format)
     */
    private static formatDateForFilename;
    /**
     * Sanitizes a string for safe use in filenames
     */
    private static sanitizeFilename;
    /**
     * Extracts episode information from a filename
     */
    static parseFilename(filename: string): {
        podcast_id: number;
        episode_id: number;
        published_date: string;
    } | null;
    /**
     * Checks if a filename follows the expected naming convention
     */
    static isValidFilename(filename: string): boolean;
    /**
     * Generates a unique filename if the original already exists
     */
    static generateUniqueFilename(originalFilename: string, existingFiles: string[]): string;
    /**
     * Gets the expected filename for an episode based on its database record
     */
    static getExpectedFilename(episode: Episode): string;
    /**
     * Validates that a file path matches the expected pattern for an episode
     */
    static validateFilePath(filePath: string, episode: Episode): boolean;
}
//# sourceMappingURL=fileNaming.d.ts.map