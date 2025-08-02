import apiClient from './client';

export interface Episode {
  id: number;
  episode_id: number;
  podcast_id: number;
  podcast_name: string;
  episode_title: string;
  published_date: string;
  audio_url: string;
  download_status: 'pending' | 'downloading' | 'downloaded' | 'failed' | 'transcribed';
  download_progress: number;
  file_path?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface EpisodeUpdate {
  download_status?: Episode['download_status'];
  download_progress?: number;
  file_path?: string;
  error_message?: string;
  retry_count?: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  errors: number;
  message: string;
}

export class EpisodesAPI {
  // Get all episodes
  static async getAllEpisodes(): Promise<Episode[]> {
    const response = await apiClient.get('/episodes');
    return response.data;
  }

  // Get episode by ID
  static async getEpisodeById(id: number): Promise<Episode | null> {
    try {
      const response = await apiClient.get(`/episodes/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // Update episode
  static async updateEpisode(id: number, updates: EpisodeUpdate): Promise<boolean> {
    try {
      await apiClient.put(`/episodes/${id}`, updates);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  // Delete episode
  static async deleteEpisode(id: number): Promise<boolean> {
    try {
      await apiClient.delete(`/episodes/${id}`);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  // Import CSV file
  static async importCSV(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('csvFile', file);

    const response = await apiClient.post('/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  // Get episodes by podcast ID
  static async getEpisodesByPodcastId(podcastId: number): Promise<Episode[]> {
    const allEpisodes = await this.getAllEpisodes();
    return allEpisodes.filter(episode => episode.podcast_id === podcastId);
  }

  // Get episodes by status
  static async getEpisodesByStatus(status: Episode['download_status']): Promise<Episode[]> {
    const allEpisodes = await this.getAllEpisodes();
    return allEpisodes.filter(episode => episode.download_status === status);
  }

  // Get download statistics
  static async getDownloadStats(): Promise<{
    total: number;
    pending: number;
    downloading: number;
    downloaded: number;
    failed: number;
    transcribed: number;
  }> {
    const episodes = await this.getAllEpisodes();
    
    return {
      total: episodes.length,
      pending: episodes.filter(e => e.download_status === 'pending').length,
      downloading: episodes.filter(e => e.download_status === 'downloading').length,
      downloaded: episodes.filter(e => e.download_status === 'downloaded').length,
      failed: episodes.filter(e => e.download_status === 'failed').length,
      transcribed: episodes.filter(e => e.download_status === 'transcribed').length,
    };
  }

  // Clear all episodes
  static async clearAllEpisodes(): Promise<{
    success: boolean;
    deletedEpisodes: number;
    deletedFiles: number;
    message: string;
  }> {
    const response = await apiClient.delete('/episodes');
    return response.data;
  }
}