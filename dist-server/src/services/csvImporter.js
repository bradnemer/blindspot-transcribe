import * as Papa from 'papaparse';
export const validateEpisodeData = (episode) => {
    const errors = [];
    // Required fields
    if (!episode.title || episode.title.trim().length === 0) {
        errors.push('Title is required');
    }
    if (!episode.published_date || episode.published_date.trim().length === 0) {
        errors.push('Published date is required');
    }
    else {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
        if (!dateRegex.test(episode.published_date)) {
            errors.push('Published date must be in YYYY-MM-DD format');
        }
    }
    if (!episode.audio_url || episode.audio_url.trim().length === 0) {
        errors.push('Audio URL is required');
    }
    else {
        // Validate URL format
        try {
            new URL(episode.audio_url);
        }
        catch {
            errors.push('Audio URL must be a valid URL');
        }
    }
    // Optional field validations
    if (episode.duration !== undefined && episode.duration < 0) {
        errors.push('Duration must be a positive number');
    }
    if (episode.description && episode.description.length > 2000) {
        errors.push('Description must be less than 2000 characters');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
export const parseCSV = async (file, onProgress) => {
    return new Promise((resolve, reject) => {
        let processedRows = 0;
        const episodes = [];
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => {
                // Normalize common header variations
                const normalized = header.toLowerCase().trim();
                const headerMap = {
                    'episode title': 'title',
                    'episode_title': 'title',
                    'episode name': 'title',
                    'name': 'title',
                    'published date': 'published_date',
                    'publish_date': 'published_date',
                    'date published': 'published_date',
                    'date': 'published_date',
                    'release_date': 'published_date',
                    'url': 'audio_url',
                    'audio url': 'audio_url',
                    'audio_url': 'audio_url',
                    'download url': 'audio_url',
                    'download_url': 'audio_url',
                    'mp3 url': 'audio_url',
                    'mp3_url': 'audio_url',
                    'link': 'audio_url',
                    'summary': 'description',
                    'desc': 'description',
                    'episode description': 'description',
                    'episode_description': 'description',
                    'length': 'duration',
                    'runtime': 'duration',
                    'duration_seconds': 'duration'
                };
                return headerMap[normalized] || normalized;
            },
            step: (result) => {
                if (result.errors.length > 0) {
                    console.warn('CSV parsing errors:', result.errors);
                    return;
                }
                const row = result.data;
                // Skip rows without required fields
                if (!row.title || !row.published_date) {
                    processedRows++;
                    return;
                }
                try {
                    // Parse duration if it's a string
                    let duration;
                    if (row.duration) {
                        const parsed = parseInt(row.duration, 10);
                        if (!isNaN(parsed)) {
                            duration = parsed;
                        }
                    }
                    // Validate and format date
                    let publishedDate = row.published_date;
                    try {
                        const date = new Date(publishedDate);
                        if (isNaN(date.getTime())) {
                            // Try common date formats
                            const dateFormats = [
                                /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
                                /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
                                /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
                            ];
                            let validDate = false;
                            for (const format of dateFormats) {
                                const match = publishedDate.match(format);
                                if (match) {
                                    validDate = true;
                                    break;
                                }
                            }
                            if (!validDate) {
                                publishedDate = '2025-01-01T00:00:00.000Z'; // Fallback date
                            }
                        }
                        else {
                            publishedDate = date.toISOString();
                        }
                    }
                    catch {
                        publishedDate = '2025-01-01T00:00:00.000Z'; // Fallback date
                    }
                    const episode = {
                        id: 0, // Will be set by database
                        title: row.title.trim(),
                        published_date: publishedDate,
                        audio_url: row.audio_url?.trim(),
                        description: row.description?.trim(),
                        duration,
                        status: 'pending',
                        download_progress: 0
                    };
                    episodes.push(episode);
                }
                catch (error) {
                    console.warn('Failed to process CSV row:', row, error);
                }
                processedRows++;
                // Report progress
                if (onProgress) {
                    // We don't know total rows ahead of time, so estimate based on file size
                    // This is approximate progress
                    const estimatedProgress = Math.min(95, (processedRows / 100) * 100);
                    onProgress(estimatedProgress);
                }
            },
            complete: (results) => {
                if (results.errors.length > 0) {
                    const errorMessages = results.errors.map(err => err.message).join(', ');
                    reject(new Error(`CSV parsing errors: ${errorMessages}`));
                    return;
                }
                if (episodes.length === 0) {
                    reject(new Error('No valid episodes found in CSV file. Please check the format and required columns (title, published_date).'));
                    return;
                }
                if (onProgress) {
                    onProgress(100);
                }
                resolve(episodes);
            },
            error: (error) => {
                reject(new Error(`Failed to parse CSV file: ${error.message}`));
            }
        });
    });
};
