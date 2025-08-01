export interface Episode {
  id: number;
  title: string;
  published_date: string;
  audio_url?: string;
  description?: string;
  duration?: number;
  status: 'pending' | 'downloading' | 'downloaded' | 'failed' | 'transcribed';
  download_progress?: number;
  local_file_path?: string;
  transcription_file_path?: string;
  error_message?: string;
  retry_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Database interface (matches the actual DB schema)
export interface EpisodeDB {
  id?: number;
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
  created_at?: string;
  updated_at?: string;
}

export interface Settings {
  download_directory: string;
  max_concurrent_downloads: number;
  retry_attempts: number;
  retry_delay_seconds: number;
}

export interface CSVRow {
  'Episode ID': string;
  'Podcast ID': string;
  'Podcast Name': string;
  'Episode Title': string;
  'Published Date': string;
  'Audio URL': string;
}