import { Episode } from '../types';
import { dal } from '../database';
import { CSVParser, ParseResult } from './csvParser';

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  duplicates: number;
}

export class EpisodeImporter {
  /**
   * Import episodes from CSV file
   */
  public static async importFromFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ImportResult> {
    try {
      // Parse the CSV file
      const parseResult = await CSVParser.parseFile(file, (parseProgress) => {
        // Use 80% of progress for parsing, 20% for database operations
        if (onProgress) {
          onProgress(parseProgress * 0.8);
        }
      });

      if (!parseResult.success) {
        return {
          success: false,
          imported: 0,
          skipped: 0,
          errors: parseResult.errors,
          warnings: parseResult.warnings,
          duplicates: 0,
        };
      }

      // Import episodes to database
      const importResult = await this.importEpisodesToDatabase(
        parseResult.episodes,
        (importProgress) => {
          if (onProgress) {
            onProgress(80 + (importProgress * 0.2));
          }
        }
      );

      return {
        success: true,
        imported: importResult.imported,
        skipped: importResult.skipped,
        errors: [...parseResult.errors, ...importResult.errors],
        warnings: [...parseResult.warnings, ...importResult.warnings],
        duplicates: importResult.duplicates,
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [`Import failed: ${error}`],
        warnings: [],
        duplicates: 0,
      };
    }
  }

  /**
   * Import episodes directly from parsed data
   */
  public static async importEpisodes(episodes: Episode[]): Promise<ImportResult> {
    return this.importEpisodesToDatabase(episodes);
  }

  /**
   * Import episodes to database with duplicate checking
   */
  private static async importEpisodesToDatabase(
    episodes: Episode[],
    onProgress?: (progress: number) => void
  ): Promise<ImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;

    try {
      for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i];

        if (onProgress) {
          onProgress((i / episodes.length) * 100);
        }

        try {
          // Check if episode already exists
          const existing = dal.episodes.getByEpisodeId(episode.episode_id);
          
          if (existing) {
            duplicates++;
            
            // Check if we should update existing episode
            if (this.shouldUpdateEpisode(existing, episode)) {
              // Update existing episode with new data
              dal.episodes.update(existing.id!, {
                podcast_name: episode.podcast_name,
                episode_title: episode.episode_title,
                published_date: episode.published_date,
                audio_url: episode.audio_url,
              });
              
              warnings.push(
                `Updated existing episode ${episode.episode_id}: ${episode.episode_title}`
              );
              imported++;
            } else {
              warnings.push(
                `Skipped duplicate episode ${episode.episode_id}: ${episode.episode_title}`
              );
              skipped++;
            }
          } else {
            // Insert new episode
            dal.episodes.insert(episode);
            imported++;
          }
        } catch (error) {
          errors.push(
            `Failed to import episode ${episode.episode_id}: ${error}`
          );
          skipped++;
        }
      }

      if (onProgress) {
        onProgress(100);
      }

      return {
        success: errors.length === 0,
        imported,
        skipped,
        errors,
        warnings,
        duplicates,
      };
    } catch (error) {
      errors.push(`Database import failed: ${error}`);
      return {
        success: false,
        imported,
        skipped,
        errors,
        warnings,
        duplicates,
      };
    }
  }

  /**
   * Determine if an existing episode should be updated
   */
  private static shouldUpdateEpisode(existing: Episode, incoming: Episode): boolean {
    // Don't update if download is in progress or completed
    if (existing.download_status === 'downloading' || 
        existing.download_status === 'downloaded' || 
        existing.download_status === 'transcribed') {
      return false;
    }

    // Update if the incoming data has newer information
    return (
      existing.episode_title !== incoming.episode_title ||
      existing.podcast_name !== incoming.podcast_name ||
      existing.audio_url !== incoming.audio_url ||
      existing.published_date !== incoming.published_date
    );
  }

  /**
   * Get import statistics
   */
  public static getImportStats(): {
    totalEpisodes: number;
    pendingDownloads: number;
    downloadedEpisodes: number;
    failedDownloads: number;
    transcribedEpisodes: number;
  } {
    try {
      const allEpisodes = dal.episodes.getAll();
      
      return {
        totalEpisodes: allEpisodes.length,
        pendingDownloads: dal.episodes.getPendingDownloads().length,
        downloadedEpisodes: dal.episodes.getDownloaded().length,
        failedDownloads: dal.episodes.getFailed().length,
        transcribedEpisodes: dal.episodes.getByStatus('transcribed').length,
      };
    } catch (error) {
      console.error('Failed to get import stats:', error);
      return {
        totalEpisodes: 0,
        pendingDownloads: 0,
        downloadedEpisodes: 0,
        failedDownloads: 0,
        transcribedEpisodes: 0,
      };
    }
  }

  /**
   * Clear all episodes from database
   */
  public static async clearAllEpisodes(): Promise<{ success: boolean; deleted: number; error?: string }> {
    try {
      const allEpisodes = dal.episodes.getAll();
      let deleted = 0;

      for (const episode of allEpisodes) {
        if (episode.id && dal.episodes.delete(episode.id)) {
          deleted++;
        }
      }

      return {
        success: true,
        deleted,
      };
    } catch (error) {
      return {
        success: false,
        deleted: 0,
        error: `Failed to clear episodes: ${error}`,
      };
    }
  }

  /**
   * Validate CSV file before import
   */
  public static async validateCSVFile(file: File): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    episodeCount: number;
  }> {
    try {
      const parseResult = await CSVParser.parseFile(file);
      
      return {
        isValid: parseResult.success,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
        episodeCount: parseResult.validRows,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error}`],
        warnings: [],
        episodeCount: 0,
      };
    }
  }

  /**
   * Preview CSV file contents
   */
  public static async previewCSVFile(file: File, maxRows: number = 5): Promise<{
    success: boolean;
    episodes: Episode[];
    errors: string[];
    totalRows: number;
  }> {
    try {
      const parseResult = await CSVParser.parseFile(file);
      
      return {
        success: parseResult.success,
        episodes: parseResult.episodes.slice(0, maxRows),
        errors: parseResult.errors,
        totalRows: parseResult.totalRows,
      };
    } catch (error) {
      return {
        success: false,
        episodes: [],
        errors: [`Preview failed: ${error}`],
        totalRows: 0,
      };
    }
  }
}