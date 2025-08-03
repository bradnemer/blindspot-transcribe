import { apiClient } from '../api';

export interface TranscriptionStatus {
  whisperxAvailable: boolean;
  processing: boolean;
  queueLength: number;
  currentFile?: string;
}

/**
 * API service for transcription operations
 */
export const transcriptionApi = {
  /**
   * Get transcription service status
   */
  async getStatus(): Promise<TranscriptionStatus> {
    const response = await apiClient.get('/transcription/status');
    return response.data;
  },

  /**
   * Queue a file for transcription
   */
  async queueFile(filePath: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/transcription/queue', { filePath });
    return response.data;
  }
};