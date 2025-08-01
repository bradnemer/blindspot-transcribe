import Papa from 'papaparse';
export class CSVParser {
    static REQUIRED_COLUMNS = [
        'Episode ID',
        'Podcast ID',
        'Podcast Name',
        'Episode Title',
        'Published Date',
        'Audio URL'
    ];
    /**
     * Parse CSV file and return episodes with validation
     */
    static async parseFile(file, onProgress) {
        return new Promise((resolve) => {
            const errors = [];
            const warnings = [];
            const episodes = [];
            let totalRows = 0;
            let validRows = 0;
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.trim(),
                step: (result, parser) => {
                    totalRows++;
                    if (onProgress) {
                        // Estimate progress based on file position
                        const progress = Math.min((totalRows / 1000) * 100, 95);
                        onProgress(progress);
                    }
                    if (result.errors.length > 0) {
                        errors.push(`Row ${totalRows}: ${result.errors.map(e => e.message).join(', ')}`);
                        return;
                    }
                    const validation = this.validateRow(result.data, totalRows);
                    if (validation.isValid) {
                        const episode = this.convertRowToEpisode(result.data);
                        episodes.push(episode);
                        validRows++;
                    }
                    else {
                        errors.push(...validation.errors.map(e => `Row ${e.row}: ${e.field} - ${e.message}`));
                    }
                },
                complete: () => {
                    if (onProgress) {
                        onProgress(100);
                    }
                    // Final validation
                    if (totalRows === 0) {
                        errors.push('CSV file is empty');
                    }
                    if (validRows === 0 && errors.length === 0) {
                        errors.push('No valid episodes found in CSV file');
                    }
                    // Check for duplicate episode IDs
                    const duplicateCheck = this.checkForDuplicates(episodes);
                    warnings.push(...duplicateCheck.warnings);
                    resolve({
                        success: errors.length === 0 && validRows > 0,
                        episodes: duplicateCheck.uniqueEpisodes,
                        errors,
                        warnings,
                        totalRows,
                        validRows: duplicateCheck.uniqueEpisodes.length,
                    });
                },
                error: (error) => {
                    errors.push(`CSV parsing error: ${error.message}`);
                    resolve({
                        success: false,
                        episodes: [],
                        errors,
                        warnings,
                        totalRows,
                        validRows: 0,
                    });
                }
            });
        });
    }
    /**
     * Validate CSV headers
     */
    static validateHeaders(headers) {
        const errors = [];
        const normalizedHeaders = headers.map(h => h.trim());
        for (const requiredColumn of this.REQUIRED_COLUMNS) {
            if (!normalizedHeaders.includes(requiredColumn)) {
                errors.push(`Missing required column: ${requiredColumn}`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Validate a single CSV row
     */
    static validateRow(row, rowNumber) {
        const errors = [];
        // Check Episode ID
        const episodeId = row['Episode ID']?.trim();
        if (!episodeId) {
            errors.push({
                row: rowNumber,
                field: 'Episode ID',
                value: episodeId || '',
                message: 'Episode ID is required'
            });
        }
        else if (!/^\d+$/.test(episodeId)) {
            errors.push({
                row: rowNumber,
                field: 'Episode ID',
                value: episodeId,
                message: 'Episode ID must be a number'
            });
        }
        // Check Podcast ID
        const podcastId = row['Podcast ID']?.trim();
        if (!podcastId) {
            errors.push({
                row: rowNumber,
                field: 'Podcast ID',
                value: podcastId || '',
                message: 'Podcast ID is required'
            });
        }
        else if (!/^\d+$/.test(podcastId)) {
            errors.push({
                row: rowNumber,
                field: 'Podcast ID',
                value: podcastId,
                message: 'Podcast ID must be a number'
            });
        }
        // Check Podcast Name
        const podcastName = row['Podcast Name']?.trim();
        if (!podcastName) {
            errors.push({
                row: rowNumber,
                field: 'Podcast Name',
                value: podcastName || '',
                message: 'Podcast Name is required'
            });
        }
        // Check Episode Title
        const episodeTitle = row['Episode Title']?.trim();
        if (!episodeTitle) {
            errors.push({
                row: rowNumber,
                field: 'Episode Title',
                value: episodeTitle || '',
                message: 'Episode Title is required'
            });
        }
        // Check Published Date
        const publishedDate = row['Published Date']?.trim();
        if (!publishedDate) {
            errors.push({
                row: rowNumber,
                field: 'Published Date',
                value: publishedDate || '',
                message: 'Published Date is required'
            });
        }
        else {
            const date = new Date(publishedDate);
            if (isNaN(date.getTime())) {
                errors.push({
                    row: rowNumber,
                    field: 'Published Date',
                    value: publishedDate,
                    message: 'Published Date is not a valid date'
                });
            }
        }
        // Check Audio URL
        const audioUrl = row['Audio URL']?.trim();
        if (!audioUrl) {
            errors.push({
                row: rowNumber,
                field: 'Audio URL',
                value: audioUrl || '',
                message: 'Audio URL is required'
            });
        }
        else {
            try {
                new URL(audioUrl);
                if (!audioUrl.toLowerCase().includes('.mp3')) {
                    // Warning: not an error, but we expect MP3 files
                }
            }
            catch {
                errors.push({
                    row: rowNumber,
                    field: 'Audio URL',
                    value: audioUrl,
                    message: 'Audio URL is not a valid URL'
                });
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Convert CSV row to Episode object
     */
    static convertRowToEpisode(row) {
        return {
            episode_id: parseInt(row['Episode ID'].trim(), 10),
            podcast_id: parseInt(row['Podcast ID'].trim(), 10),
            podcast_name: row['Podcast Name'].trim(),
            episode_title: row['Episode Title'].trim(),
            published_date: row['Published Date'].trim(),
            audio_url: row['Audio URL'].trim(),
            download_status: 'pending',
            download_progress: 0,
            retry_count: 0,
        };
    }
    /**
     * Check for and remove duplicate episodes
     */
    static checkForDuplicates(episodes) {
        const warnings = [];
        const seen = new Set();
        const uniqueEpisodes = [];
        for (const episode of episodes) {
            if (seen.has(episode.episode_id)) {
                warnings.push(`Duplicate episode ID found: ${episode.episode_id} - skipping duplicate`);
            }
            else {
                seen.add(episode.episode_id);
                uniqueEpisodes.push(episode);
            }
        }
        return { uniqueEpisodes, warnings };
    }
    /**
     * Parse CSV text directly (for testing)
     */
    static parseText(csvText) {
        const errors = [];
        const warnings = [];
        const episodes = [];
        let totalRows = 0;
        let validRows = 0;
        const parseResult = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
        });
        if (parseResult.errors.length > 0) {
            errors.push(...parseResult.errors.map(e => e.message));
        }
        // Validate headers
        if (parseResult.meta.fields) {
            const headerValidation = this.validateHeaders(parseResult.meta.fields);
            if (!headerValidation.isValid) {
                errors.push(...headerValidation.errors);
            }
        }
        // Process rows
        for (let i = 0; i < parseResult.data.length; i++) {
            totalRows++;
            const row = parseResult.data[i];
            const validation = this.validateRow(row, i + 1);
            if (validation.isValid) {
                const episode = this.convertRowToEpisode(row);
                episodes.push(episode);
                validRows++;
            }
            else {
                errors.push(...validation.errors.map(e => `Row ${e.row}: ${e.field} - ${e.message}`));
            }
        }
        // Check for duplicates
        const duplicateCheck = this.checkForDuplicates(episodes);
        warnings.push(...duplicateCheck.warnings);
        return {
            success: errors.length === 0 && validRows > 0,
            episodes: duplicateCheck.uniqueEpisodes,
            errors,
            warnings,
            totalRows,
            validRows: duplicateCheck.uniqueEpisodes.length,
        };
    }
}
//# sourceMappingURL=csvParser.js.map