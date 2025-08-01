import * as Papa from 'papaparse';
import { Episode } from '../types';

interface CSVRow {
  title?: string;
  published_date?: string;
  audio_url?: string;
  description?: string;
  duration?: string;
  [key: string]: string | undefined;
}

export const parseCSV = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<Episode[]> => {
  return new Promise((resolve, reject) => {
    let processedRows = 0;
    const episodes: Episode[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize common header variations
        const normalized = header.toLowerCase().trim();
        const headerMap: Record<string, string> = {
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

        const row = result.data as CSVRow;
        
        // Skip rows without required fields
        if (!row.title || !row.published_date) {
          processedRows++;
          return;
        }

        try {
          // Parse duration if it's a string
          let duration: number | undefined;
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
            } else {
              publishedDate = date.toISOString();
            }
          } catch {
            publishedDate = '2025-01-01T00:00:00.000Z'; // Fallback date
          }

          const episode: Episode = {
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
        } catch (error) {
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