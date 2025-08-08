import { apiClient } from '../api';

export interface TranscriptionStatus {
  whisperxAvailable: boolean;
  processing: boolean;
  queueLength: number;
  currentFile?: string;
  nextFile?: string;
  paused?: boolean;
}

export interface TranscriptionProgress {
  episodeId: number;
  filename: string;
  stage: 'queued' | 'loading_model' | 'preprocessing' | 'transcribing' | 'diarizing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  startTime: number;
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
  },

  /**
   * Get transcription progress for all active transcriptions
   */
  async getProgress(): Promise<TranscriptionProgress[]> {
    const response = await apiClient.get('/transcription/progress');
    return response.data;
  },

  /**
   * Pause transcription processing
   */
  async pauseTranscription(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/transcription/pause');
    return response.data;
  },

  /**
   * Resume transcription processing
   */
  async resumeTranscription(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/transcription/resume');
    return response.data;
  },

  /**
   * Stop transcription and clear queue
   */
  async stopTranscription(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/transcription/stop');
    return response.data;
  },

  /**
   * Sync transcription queue with database
   */
  async syncTranscription(): Promise<{ success: boolean; message: string; syncedCount: number; totalFound: number }> {
    const response = await apiClient.post('/transcription/sync');
    return response.data;
  }
};