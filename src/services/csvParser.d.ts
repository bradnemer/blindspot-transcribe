import { Episode } from '../types';
export interface ParseResult {
    success: boolean;
    episodes: Episode[];
    errors: string[];
    warnings: string[];
    totalRows: number;
    validRows: number;
}
export interface ValidationError {
    row: number;
    field: string;
    value: string;
    message: string;
}
export declare class CSVParser {
    private static readonly REQUIRED_COLUMNS;
    /**
     * Parse CSV file and return episodes with validation
     */
    static parseFile(file: File, onProgress?: (progress: number) => void): Promise<ParseResult>;
    /**
     * Validate CSV headers
     */
    static validateHeaders(headers: string[]): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Validate a single CSV row
     */
    private static validateRow;
    /**
     * Convert CSV row to Episode object
     */
    private static convertRowToEpisode;
    /**
     * Check for and remove duplicate episodes
     */
    private static checkForDuplicates;
    /**
     * Parse CSV text directly (for testing)
     */
    static parseText(csvText: string): ParseResult;
}
//# sourceMappingURL=csvParser.d.ts.map