import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { dal } from '../database';

export interface TranscriptionResult {
  success: boolean;
  transcriptionPath?: string;
  error?: string;
  duration?: number;
}

export interface WhisperXConfig {
  model: string;
  computeType: 'float16' | 'float32' | 'int8';
  language: string;
  outputFormat: 'txt' | 'json' | 'srt' | 'vtt' | 'tsv' | 'all';
  diarize: boolean;
  speakerEmbeddings: boolean;
  returnCharAlignments: boolean;
  beamSize: number;
  bestOf: number;
  temperature: number;
  vadMethod: 'pyannote' | 'silero';
  segmentResolution: 'sentence' | 'chunk';
  minSpeakers?: number;
  maxSpeakers?: number;
  verbose: boolean;
  printProgress: boolean;
}

export class TranscriptionService {
  private whisperxPath: string;
  private isProcessing: boolean = false;
  private processingQueue: string[] = [];
  private config: WhisperXConfig;

  constructor(config?: Partial<WhisperXConfig>) {
    // Path to the WhisperX virtual environment
    this.whisperxPath = path.join(process.cwd(), 'whisperx-env', 'bin', 'whisperx');
    
    // Default configuration matching your exact specifications
    this.config = {
      model: 'large-v3',
      computeType: 'int8',
      language: 'en',
      outputFormat: 'json',
      diarize: true,
      speakerEmbeddings: true,
      returnCharAlignments: false, // Not specified in your command
      beamSize: 5,
      bestOf: 5,
      temperature: 0,
      vadMethod: 'pyannote',
      segmentResolution: 'sentence',
      verbose: true,
      printProgress: true,
      ...config // Allow overrides
    };
  }

  /**
   * Check if WhisperX is available
   */
  async isWhisperXAvailable(): Promise<boolean> {
    try {
      const envPath = path.join(process.cwd(), 'whisperx-env');
      return fs.existsSync(envPath) && fs.existsSync(this.whisperxPath);
    } catch (error) {
      console.error('Error checking WhisperX availability:', error);
      return false;
    }
  }

  /**
   * Transcribe a single audio file
   */
  async transcribeFile(audioFilePath: string): Promise<TranscriptionResult> {
    const startTime = Date.now();
    
    try {
      // Check if file exists
      if (!fs.existsSync(audioFilePath)) {
        return {
          success: false,
          error: `Audio file not found: ${audioFilePath}`
        };
      }

      // Check if WhisperX is available
      if (!(await this.isWhisperXAvailable())) {
        return {
          success: false,
          error: 'WhisperX not available. Please ensure it is installed in whisperx-env/'
        };
      }

      const outputDir = path.dirname(audioFilePath);
      const baseName = path.basename(audioFilePath, path.extname(audioFilePath));
      const transcriptionPath = path.join(outputDir, `${baseName}.json`);

      // Skip if transcription already exists
      if (fs.existsSync(transcriptionPath)) {
        console.log(`📄 Transcription already exists: ${transcriptionPath}`);
        return {
          success: true,
          transcriptionPath,
          duration: Date.now() - startTime
        };
      }

      console.log(`🎙️ Starting transcription: ${path.basename(audioFilePath)}`);

      // Update database to show transcription in progress
      this.updateEpisodeTranscriptionStatus(audioFilePath, 'transcribing');

      // Run WhisperX with optimized settings for M2 MacBook Air
      const result = await this.runWhisperX(audioFilePath, outputDir);
      
      if (result.success && fs.existsSync(transcriptionPath)) {
        const duration = Date.now() - startTime;
        console.log(`✅ Transcription completed: ${path.basename(transcriptionPath)} (${(duration / 1000).toFixed(1)}s)`);
        
        // Update database with completed transcription
        this.updateEpisodeTranscriptionStatus(audioFilePath, 'completed', transcriptionPath);
        
        return {
          success: true,
          transcriptionPath,
          duration
        };
      } else {
        // Update database with failed transcription
        this.updateEpisodeTranscriptionStatus(audioFilePath, 'failed', undefined, result.error);
        
        return {
          success: false,
          error: result.error || 'Transcription failed - output file not found'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Transcription error: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Add file to transcription queue
   */
  async queueTranscription(audioFilePath: string): Promise<void> {
    if (!this.processingQueue.includes(audioFilePath)) {
      this.processingQueue.push(audioFilePath);
      console.log(`📝 Added to transcription queue: ${path.basename(audioFilePath)}`);
    }

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the transcription queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing transcription queue: ${this.processingQueue.length} files`);

    while (this.processingQueue.length > 0) {
      const audioFilePath = this.processingQueue.shift();
      if (audioFilePath) {
        try {
          await this.transcribeFile(audioFilePath);
        } catch (error) {
          console.error(`❌ Error transcribing ${audioFilePath}:`, error);
        }
        
        // Small delay between transcriptions to prevent system overload
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessing = false;
    console.log(`✅ Transcription queue processing complete`);
  }

  /**
   * Build WhisperX command string from configuration
   */
  private buildWhisperXCommand(audioFilePath: string, outputDir: string): string {
    const args = [
      `whisperx "${audioFilePath}"`,
      `--model ${this.config.model}`,
      `--compute_type ${this.config.computeType}`,
      `--language ${this.config.language}`,
      `--output_format ${this.config.outputFormat}`,
      `--output_dir "${outputDir}"`,
      `--beam_size ${this.config.beamSize}`,
      `--best_of ${this.config.bestOf}`,
      `--temperature ${this.config.temperature}`,
      `--vad_method ${this.config.vadMethod}`,
      `--segment_resolution ${this.config.segmentResolution}`,
      `--verbose ${this.config.verbose}`,
      `--print_progress ${this.config.printProgress}`
    ];

    // Add optional flags
    if (this.config.diarize) {
      args.push('--diarize');
    }
    
    if (this.config.speakerEmbeddings && this.config.diarize) {
      args.push('--speaker_embeddings');
    }
    
    if (this.config.returnCharAlignments) {
      args.push('--return_char_alignments');
    }
    
    if (this.config.minSpeakers) {
      args.push(`--min_speakers ${this.config.minSpeakers}`);
    }
    
    if (this.config.maxSpeakers) {
      args.push(`--max_speakers ${this.config.maxSpeakers}`);
    }

    return args.join(' ');
  }

  /**
   * Run WhisperX command
   */
  private async runWhisperX(audioFilePath: string, outputDir: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Build WhisperX command with configuration
      const whisperxArgs = this.buildWhisperXCommand(audioFilePath, outputDir);
      
      // Activate virtual environment and run whisperx
      const command = 'bash';
      const args = [
        '-c',
        `source ${path.join(process.cwd(), 'whisperx-env', 'bin', 'activate')} && ${whisperxArgs}`
      ];

      console.log(`🎯 Running: whisperx with int8 compute type for ${path.basename(audioFilePath)}`);

      const process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
        // Log progress for longer files
        const output = data.toString();
        if (output.includes('%') || output.includes('Processing')) {
          console.log(`📊 ${output.trim()}`);
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          console.error(`❌ WhisperX failed with code ${code}`);
          console.error('STDOUT:', stdout);
          console.error('STDERR:', stderr);
          resolve({ 
            success: false, 
            error: `WhisperX process failed with code ${code}: ${stderr}` 
          });
        }
      });

      process.on('error', (error) => {
        console.error(`❌ Failed to start WhisperX process:`, error);
        resolve({ 
          success: false, 
          error: `Failed to start WhisperX: ${error.message}` 
        });
      });
    });
  }

  /**
   * Get transcription status for a file
   */
  getTranscriptionStatus(audioFilePath: string): 'exists' | 'queued' | 'processing' | 'none' {
    const outputDir = path.dirname(audioFilePath);
    const baseName = path.basename(audioFilePath, path.extname(audioFilePath));
    const transcriptionPath = path.join(outputDir, `${baseName}.json`);

    if (fs.existsSync(transcriptionPath)) {
      return 'exists';
    }

    if (this.processingQueue.includes(audioFilePath)) {
      return 'queued';
    }

    if (this.isProcessing && this.processingQueue.length === 0) {
      // Currently processing but queue is empty, likely processing this file
      return 'processing';
    }

    return 'none';
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { processing: boolean; queueLength: number; currentFile?: string } {
    return {
      processing: this.isProcessing,
      queueLength: this.processingQueue.length,
      currentFile: this.isProcessing && this.processingQueue.length > 0 
        ? path.basename(this.processingQueue[0]) 
        : undefined
    };
  }

  /**
   * Update transcription configuration
   */
  updateConfig(newConfig: Partial<WhisperXConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Updated WhisperX configuration:', newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): WhisperXConfig {
    return { ...this.config };
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config = {
      model: 'large-v2',
      computeType: 'int8',
      language: 'en',
      outputFormat: 'json',
      diarize: true,
      speakerEmbeddings: true,
      returnCharAlignments: true,
      beamSize: 5,
      bestOf: 5,
      temperature: 0,
      vadMethod: 'pyannote',
      segmentResolution: 'sentence',
      maxSpeakers: 5,
      verbose: true,
      printProgress: true
    };
  }

  /**
   * Update episode transcription status in database
   */
  private updateEpisodeTranscriptionStatus(
    audioFilePath: string, 
    status: 'queued' | 'transcribing' | 'completed' | 'failed',
    transcriptionPath?: string,
    error?: string
  ): void {
    try {
      // Find episode by file path
      const episode = dal.episodes.getByFilePath(audioFilePath);
      if (episode && episode.id) {
        const updateData: any = {
          transcription_status: status
        };

        if (transcriptionPath) {
          updateData.transcription_path = transcriptionPath;
        }

        if (error) {
          updateData.transcription_error = error;
        } else if (status !== 'failed') {
          // Clear error on non-failed status
          updateData.transcription_error = null;
        }

        dal.episodes.update(episode.id, updateData);
        console.log(`📊 Updated transcription status: ${episode.episode_title} -> ${status}`);
      }
    } catch (error) {
      console.error('Failed to update episode transcription status:', error);
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();