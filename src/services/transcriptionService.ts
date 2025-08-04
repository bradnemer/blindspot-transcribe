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

export interface TranscriptionProgress {
  episodeId: number;
  filename: string;
  stage: 'queued' | 'loading_model' | 'preprocessing' | 'transcribing' | 'diarizing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  startTime: number;
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
  private currentProgress: Map<string, TranscriptionProgress> = new Map();

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

      // Initialize progress tracking
      this.updateProgress(audioFilePath, 'loading_model', 0, 'Initializing transcription');

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
          console.log(`🎯 Processing file: ${audioFilePath}`);
          const result = await this.transcribeFile(audioFilePath);
          console.log(`🎯 Transcription result:`, result);
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
   * Build WhisperX command arguments array from configuration
   */
  private buildWhisperXArgs(audioFilePath: string, outputDir: string): string[] {
    const args = [
      audioFilePath,
      '--model', this.config.model,
      '--compute_type', this.config.computeType,
      '--language', this.config.language,
      '--output_format', this.config.outputFormat,
      '--output_dir', outputDir,
      '--beam_size', this.config.beamSize.toString(),
      '--best_of', this.config.bestOf.toString(),
      '--temperature', this.config.temperature.toString(),
      '--vad_method', this.config.vadMethod,
      '--segment_resolution', this.config.segmentResolution
    ];

    // Add boolean flags with values
    if (this.config.verbose) {
      args.push('--verbose', 'True');
    }
    
    if (this.config.printProgress) {
      args.push('--print_progress', 'True');
    }
    
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
      args.push('--min_speakers', this.config.minSpeakers.toString());
    }
    
    if (this.config.maxSpeakers) {
      args.push('--max_speakers', this.config.maxSpeakers.toString());
    }

    return args;
  }

  /**
   * Run WhisperX command
   */
  private async runWhisperX(audioFilePath: string, outputDir: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Build WhisperX command with configuration
      const whisperxArgs = this.buildWhisperXArgs(audioFilePath, outputDir);
      
      // Use the WhisperX executable from the virtual environment directly
      const whisperxPath = path.join(process.cwd(), 'whisperx-env', 'bin', 'whisperx');
      
      console.log(`🎯 WhisperX path: ${whisperxPath}`);
      console.log(`🎯 Command args:`, whisperxArgs);

      const whisperxProcess = spawn(whisperxPath, whisperxArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PATH: `${path.join(process.cwd(), 'whisperx-env', 'bin')}:${process.env.PATH}` }
      });

      let stdout = '';
      let stderr = '';

      whisperxProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        // Log all stdout output from WhisperX and track progress
        const lines = output.trim().split('\n').filter(line => line.length > 0);
        lines.forEach(line => {
          console.log(`📊 WhisperX: ${line}`);
          this.parseProgressFromOutput(audioFilePath, line);
        });
      });

      whisperxProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        // Log stderr output (often contains progress info) and track progress
        const lines = output.trim().split('\n').filter(line => line.length > 0);
        lines.forEach(line => {
          console.log(`📊 WhisperX: ${line}`);
          this.parseProgressFromOutput(audioFilePath, line);
        });
      });

      whisperxProcess.on('close', (code) => {
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

      whisperxProcess.on('error', (error) => {
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
      console.log(`🔍 Looking for episode with file path: ${audioFilePath}`);
      const episode = dal.episodes.getByFilePath(audioFilePath);
      console.log(`🔍 Found episode:`, episode ? {id: episode.id, title: episode.title} : 'null');
      
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
        console.log(`📊 Updated transcription status: ${episode.id}:${episode.title} -> ${status}`);
      } else {
        console.log(`⚠️ Episode not found for file path: ${audioFilePath}`);
      }
    } catch (error) {
      console.error('Failed to update episode transcription status:', error);
    }
  }

  /**
   * Update transcription progress
   */
  private updateProgress(audioFilePath: string, stage: TranscriptionProgress['stage'], progress: number, message: string): void {
    const episode = dal.episodes.getByFilePath(audioFilePath);
    if (!episode) return;

    const progressData: TranscriptionProgress = {
      episodeId: episode.id,
      filename: path.basename(audioFilePath),
      stage,
      progress,
      message,
      startTime: this.currentProgress.get(audioFilePath)?.startTime || Date.now()
    };

    this.currentProgress.set(audioFilePath, progressData);
    console.log(`📊 Progress: ${episode.title} - ${stage} (${progress}%): ${message}`);
  }

  /**
   * Get current transcription progress
   */
  getProgress(audioFilePath?: string): TranscriptionProgress | TranscriptionProgress[] {
    if (audioFilePath) {
      return this.currentProgress.get(audioFilePath) || null;
    }
    return Array.from(this.currentProgress.values());
  }

  /**
   * Clear completed progress
   */
  private clearProgress(audioFilePath: string): void {
    this.currentProgress.delete(audioFilePath);
  }

  /**
   * Parse progress information from WhisperX output
   */
  private parseProgressFromOutput(audioFilePath: string, line: string): void {
    // Model loading
    if (line.includes('Loading model') || line.includes('Lightning automatically upgraded')) {
      this.updateProgress(audioFilePath, 'loading_model', 10, 'Loading AI models');
    }
    // Audio preprocessing
    else if (line.includes('Loading audio') || line.includes('Detecting language')) {
      this.updateProgress(audioFilePath, 'preprocessing', 20, 'Processing audio file');
    }
    // Transcription progress
    else if (line.includes('%') && (line.includes('transcrib') || line.includes('process'))) {
      const match = line.match(/(\d+)%/);
      if (match) {
        const progress = Math.min(90, 30 + parseInt(match[1]) * 0.6); // Scale to 30-90%
        this.updateProgress(audioFilePath, 'transcribing', progress, `Transcribing audio: ${match[1]}%`);
      }
    }
    // Speaker diarization
    else if (line.includes('diariz') || line.includes('speaker')) {
      this.updateProgress(audioFilePath, 'diarizing', 95, 'Identifying speakers');
    }
    // Completion
    else if (line.includes('Saved') || line.includes('Output written')) {
      this.updateProgress(audioFilePath, 'completed', 100, 'Transcription completed');
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();