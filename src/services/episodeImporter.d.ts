import { Episode } from '../types';
export interface ImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
    warnings: string[];
    duplicates: number;
}
export declare class EpisodeImporter {
    /**
     * Import episodes from CSV file
     */
    static importFromFile(file: File, onProgress?: (progress: number) => void): Promise<ImportResult>;
    /**
     * Import episodes directly from parsed data
     */
    static importEpisodes(episodes: Episode[]): Promise<ImportResult>;
    /**
     * Import episodes to database with duplicate checking
     */
    private static importEpisodesToDatabase;
    /**
     * Determine if an existing episode should be updated
     */
    private static shouldUpdateEpisode;
    /**
     * Get import statistics
     */
    static getImportStats(): {
        totalEpisodes: number;
        pendingDownloads: number;
        downloadedEpisodes: number;
        failedDownloads: number;
        transcribedEpisodes: number;
    };
    /**
     * Clear all episodes from database
     */
    static clearAllEpisodes(): Promise<{
        success: boolean;
        deleted: number;
        error?: string;
    }>;
    /**
     * Validate CSV file before import
     */
    static validateCSVFile(file: File): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
        episodeCount: number;
    }>;
    /**
     * Preview CSV file contents
     */
    static previewCSVFile(file: File, maxRows?: number): Promise<{
        success: boolean;
        episodes: Episode[];
        errors: string[];
        totalRows: number;
    }>;
}
//# sourceMappingURL=episodeImporter.d.ts.map