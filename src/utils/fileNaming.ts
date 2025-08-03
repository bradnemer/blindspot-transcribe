import path from 'path';
import { Episode } from '../types';

export class FileNamingUtils {
  /**
   * Generates a filename for an episode following the convention:
   * {podcast_id}_{episode_id}_{published_date}.mp3
   */
  public static generateFilename(episode: Episode): string {
    const publishedDate = this.formatDateForFilename(episode.published_date);
    const sanitizedTitle = this.sanitizeFilename(episode.title);
    
    // Main filename pattern: episode_{id}_{published_date}_{title}.mp3
    const filename = `episode_${episode.id}_${publishedDate}_${sanitizedTitle}.mp3`;
    
    return filename;
  }

  /**
   * Generates a full file path for an episode
   */
  public static generateFilePath(episode: Episode, downloadDirectory: string): string {
    const filename = this.generateFilename(episode);
    return path.join(downloadDirectory, filename);
  }

  /**
   * Generates a temporary filename for downloading
   */
  public static generateTempFilename(episode: Episode): string {
    const baseFilename = this.generateFilename(episode);
    const nameWithoutExt = path.parse(baseFilename).name;
    return `${nameWithoutExt}.tmp`;
  }

  /**
   * Generates a full temporary file path for downloading
   */
  public static generateTempFilePath(episode: Episode, downloadDirectory: string): string {
    const tempFilename = this.generateTempFilename(episode);
    return path.join(downloadDirectory, tempFilename);
  }

  /**
   * Formats a date string for use in filename (YYYY-MM-DD format)
   */
  private static formatDateForFilename(dateString: string): string {
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Failed to parse date ${dateString}, using fallback`);
        return 'unknown-date';
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      // Fallback to a safe default if date parsing fails
      console.warn(`Failed to parse date ${dateString}, using fallback`);
      return 'unknown-date';
    }
  }

  /**
   * Sanitizes a string for safe use in filenames
   */
  private static sanitizeFilename(input: string): string {
    return input
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 100); // Limit length to avoid filesystem issues
  }

  /**
   * Extracts episode information from a filename
   */
  public static parseFilename(filename: string): {
    id: number;
    published_date: string;
    title: string;
  } | null {
    try {
      // Remove extension
      const nameWithoutExt = path.parse(filename).name;
      
      // Expected pattern: episode_{id}_{published_date}_{title}
      const parts = nameWithoutExt.split('_');
      
      if (parts.length < 4 || parts[0] !== 'episode') {
        return null;
      }

      const id = parseInt(parts[1], 10);
      const published_date = parts[2];
      const title = parts.slice(3).join('_'); // Rejoin title parts

      if (isNaN(id)) {
        return null;
      }

      return {
        id,
        published_date,
        title,
      };
    } catch (error) {
      console.warn(`Failed to parse filename ${filename}: ${error}`);
      return null;
    }
  }

  /**
   * Checks if a filename follows the expected naming convention
   */
  public static isValidFilename(filename: string): boolean {
    return this.parseFilename(filename) !== null;
  }

  /**
   * Generates a unique filename if the original already exists
   */
  public static generateUniqueFilename(originalFilename: string, existingFiles: string[]): string {
    if (!existingFiles.includes(originalFilename)) {
      return originalFilename;
    }

    const parsed = path.parse(originalFilename);
    let counter = 1;
    let uniqueFilename: string;

    do {
      uniqueFilename = `${parsed.name}_${counter}${parsed.ext}`;
      counter++;
    } while (existingFiles.includes(uniqueFilename));

    return uniqueFilename;
  }

  /**
   * Gets the expected filename for an episode based on its database record
   */
  public static getExpectedFilename(episode: Episode): string {
    return this.generateFilename(episode);
  }

  /**
   * Validates that a file path matches the expected pattern for an episode
   */
  public static validateFilePath(filePath: string, episode: Episode): boolean {
    const actualFilename = path.basename(filePath);
    const expectedFilename = this.generateFilename(episode);
    return actualFilename === expectedFilename;
  }
}