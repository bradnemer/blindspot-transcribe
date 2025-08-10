import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

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

export interface ParakeetConfig {
  model: string;
  outputFormat: 'txt' | 'srt' | 'vtt' | 'json' | 'all';
  highlightWords: boolean;
  chunkDuration: number;
  overlapDuration: number;
  precision: 'fp32' | 'bf16';
  attention: 'full' | 'local';
  localAttentionContextSize: number;
  verbose: boolean;
}

export type TranscriptionEngine = 'whisperx' | 'parakeet';

export interface TranscriptionConfig {
  engine: TranscriptionEngine;
  whisperx: WhisperXConfig;
  parakeet: ParakeetConfig;
}

export class TranscriptionService {
  private whisperxPath: string;
  private parakeetPath: string;
  private isProcessing: boolean = false;
  private isPaused: boolean = false;
  private processingQueue: string[] = [];
  private config: TranscriptionConfig;
  private currentProgress: Map<string, TranscriptionProgress> = new Map();
  private currentProcess: any = null;
  private db: Database.Database;

  constructor(config?: Partial<TranscriptionConfig>) {
    // Initialize database connection (same as API server) - delayed to avoid version conflicts
    this.db = null as any; // Will be initialized lazily
    // Paths to transcription engines
    this.whisperxPath = path.join(process.cwd(), 'whisperx-env', 'bin', 'whisperx');
    this.parakeetPath = '/Users/brad/.local/bin/parakeet-mlx';
    
    // Default configuration
    this.config = {
      engine: 'parakeet',
      whisperx: {
        model: 'large-v3',
        computeType: 'int8',
        language: 'en',
        outputFormat: 'json',
        diarize: true,
        speakerEmbeddings: true,
        returnCharAlignments: false,
        beamSize: 5,
        bestOf: 5,
        temperature: 0,
        vadMethod: 'pyannote',
        segmentResolution: 'sentence',
        verbose: true,
        printProgress: true
      },
      parakeet: {
        model: 'mlx-community/parakeet-tdt-0.6b-v2',
        outputFormat: 'json',
        highlightWords: false,
        chunkDuration: 120,
        overlapDuration: 15,
        precision: 'bf16',
        attention: 'full',
        localAttentionContextSize: 256,
        verbose: true
      },
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
   * Check if Parakeet is available
   */
  async isParakeetAvailable(): Promise<boolean> {
    try {
      return fs.existsSync(this.parakeetPath);
    } catch (error) {
      console.error('Error checking Parakeet availability:', error);
      return false;
    }
  }

  /**
   * Check if the selected transcription engine is available
   */
  async isEngineAvailable(): Promise<boolean> {
    if (this.config.engine === 'whisperx') {
      return this.isWhisperXAvailable();
    } else if (this.config.engine === 'parakeet') {
      return this.isParakeetAvailable();
    }
    return false;
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

      // Check if the selected engine is available
      if (!(await this.isEngineAvailable())) {
        const engineName = this.config.engine === 'whisperx' ? 'WhisperX' : 'Parakeet';
        const installMessage = this.config.engine === 'whisperx' 
          ? 'Please ensure it is installed in whisperx-env/'
          : 'Please ensure parakeet-mlx is installed';
        return {
          success: false,
          error: `${engineName} not available. ${installMessage}`
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

      // Run the selected transcription engine
      const result = await this.runTranscription(audioFilePath, outputDir);
      
      if (result.success && fs.existsSync(transcriptionPath)) {
        const duration = Date.now() - startTime;
        console.log(`✅ Transcription completed: ${path.basename(transcriptionPath)} (${(duration / 1000).toFixed(1)}s)`);
        
        // Update database with completed transcription
        this.updateEpisodeTranscriptionStatus(audioFilePath, 'completed', transcriptionPath);
        
        // Keep progress for a short time so web UI can see completion
        // Progress will be cleared after a delay
        setTimeout(() => {
          this.currentProgress.delete(audioFilePath);
        }, 10000); // Keep for 10 seconds
        
        return {
          success: true,
          transcriptionPath,
          duration
        };
      } else {
        // Update database with failed transcription
        this.updateEpisodeTranscriptionStatus(audioFilePath, 'failed', undefined, result.error);
        
        // Keep failed progress for a short time so web UI can see it
        setTimeout(() => {
          this.currentProgress.delete(audioFilePath);
        }, 10000); // Keep for 10 seconds
        
        return {
          success: false,
          error: result.error || 'Transcription failed - output file not found'
        };
      }

    } catch (error) {
      // Keep error progress for a short time so web UI can see it
      this.updateProgress(audioFilePath, 'failed', 0, 'Transcription failed');
      setTimeout(() => {
        this.currentProgress.delete(audioFilePath);
      }, 10000); // Keep for 10 seconds
      
      return {
        success: false,
        error: `Transcription error: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Sort queue by episode published date (newest first)
   */
  private sortQueueByPublishedDate(): void {
    this.processingQueue.sort((a, b) => {
      const episodeA = this.getEpisodeByFilePath(a);
      const episodeB = this.getEpisodeByFilePath(b);
      
      if (!episodeA || !episodeB) return 0;
      
      // Parse published dates and sort newest first
      const dateA = new Date(episodeA.published_date || 0);
      const dateB = new Date(episodeB.published_date || 0);
      
      return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
    });
  }

  /**
   * Add file to transcription queue
   */
  async queueTranscription(audioFilePath: string): Promise<void> {
    if (!this.processingQueue.includes(audioFilePath)) {
      this.processingQueue.push(audioFilePath);
      console.log(`📝 Added to transcription queue: ${path.basename(audioFilePath)}`);
      
      // Sort queue by published date (newest first)
      this.sortQueueByPublishedDate();
      
      const episode = this.getEpisodeByFilePath(audioFilePath);
      if (episode) {
        console.log(`📅 Queue sorted by date - Next: ${path.basename(this.processingQueue[0])} (${episode.published_date})`);
      }
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

    while (this.processingQueue.length > 0 && !this.isPaused) {
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

    if (this.isPaused && this.processingQueue.length > 0) {
      console.log(`⏸️ Transcription queue paused with ${this.processingQueue.length} files remaining`);
    } else {
      console.log(`✅ Transcription queue processing complete`);
    }

    this.isProcessing = false;
  }

  /**
   * Build WhisperX command arguments array from configuration
   */
  private buildWhisperXArgs(audioFilePath: string, outputDir: string): string[] {
    const config = this.config.whisperx;
    const args = [
      audioFilePath,
      '--model', config.model,
      '--compute_type', config.computeType,
      '--language', config.language,
      '--output_format', config.outputFormat,
      '--output_dir', outputDir,
      '--beam_size', config.beamSize.toString(),
      '--best_of', config.bestOf.toString(),
      '--temperature', config.temperature.toString(),
      '--vad_method', config.vadMethod,
      '--segment_resolution', config.segmentResolution
    ];

    // Add boolean flags with values
    if (config.verbose) {
      args.push('--verbose', 'True');
    }
    
    if (config.printProgress) {
      args.push('--print_progress', 'True');
    }
    
    if (config.diarize) {
      args.push('--diarize');
    }
    
    if (config.speakerEmbeddings && config.diarize) {
      args.push('--speaker_embeddings');
    }
    
    if (config.returnCharAlignments) {
      args.push('--return_char_alignments');
    }
    
    if (config.minSpeakers) {
      args.push('--min_speakers', config.minSpeakers.toString());
    }
    
    if (config.maxSpeakers) {
      args.push('--max_speakers', config.maxSpeakers.toString());
    }

    return args;
  }

  /**
   * Build Parakeet command arguments array from configuration
   */
  private buildParakeetArgs(audioFilePath: string, outputDir: string): string[] {
    const config = this.config.parakeet;
    const args = [
      audioFilePath,
      '--model', config.model,
      '--output-dir', outputDir,
      '--output-format', config.outputFormat,
      '--chunk-duration', config.chunkDuration.toString(),
      '--overlap-duration', config.overlapDuration.toString(),
      '--local-attention-context-size', config.localAttentionContextSize.toString()
    ];

    // Add precision flag
    if (config.precision === 'fp32') {
      args.push('--fp32');
    } else {
      args.push('--bf16');
    }

    // Add attention type
    if (config.attention === 'local') {
      args.push('--local-attention');
    } else {
      args.push('--full-attention');
    }

    // Add boolean flags
    if (config.highlightWords) {
      args.push('--highlight-words');
    }
    
    if (config.verbose) {
      args.push('--verbose');
    }

    return args;
  }

  /**
   * Run the selected transcription engine
   */
  private async runTranscription(audioFilePath: string, outputDir: string): Promise<{ success: boolean; error?: string }> {
    if (this.config.engine === 'whisperx') {
      return this.runWhisperX(audioFilePath, outputDir);
    } else if (this.config.engine === 'parakeet') {
      return this.runParakeet(audioFilePath, outputDir);
    }
    return { success: false, error: 'Unknown transcription engine' };
  }

  /**
   * Run WhisperX command
   */
  private async runWhisperX(audioFilePath: string, outputDir: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Build WhisperX command with configuration
      const whisperxArgs = this.buildWhisperXArgs(audioFilePath, outputDir);
      
      console.log(`🎯 WhisperX path: ${this.whisperxPath}`);
      console.log(`🎯 Command args:`, whisperxArgs);

      const whisperxProcess = spawn(this.whisperxPath, whisperxArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PATH: `${path.join(process.cwd(), 'whisperx-env', 'bin')}:${process.env.PATH}` }
      });

      // Store the current process for potential termination
      this.currentProcess = whisperxProcess;

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
        this.currentProcess = null;
        
        if (code === 0) {
          const currentProgress = this.currentProgress.get(audioFilePath);
          if (currentProgress && currentProgress.stage !== 'completed') {
            this.updateProgress(audioFilePath, 'completed', 100, 'Transcription completed');
          }
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
        this.currentProcess = null;
        console.error(`❌ Failed to start WhisperX process:`, error);
        resolve({ 
          success: false, 
          error: `Failed to start WhisperX: ${error.message}` 
        });
      });
    });
  }

  /**
   * Run Parakeet command
   */
  private async runParakeet(audioFilePath: string, outputDir: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const parakeetArgs = this.buildParakeetArgs(audioFilePath, outputDir);
      
      console.log(`🎯 Parakeet path: ${this.parakeetPath}`);
      console.log(`🎯 Command args:`, parakeetArgs);

      const parakeetProcess = spawn(this.parakeetPath, parakeetArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.currentProcess = parakeetProcess;

      let stdout = '';
      let stderr = '';

      parakeetProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        const lines = output.trim().split('\n').filter(line => line.length > 0);
        lines.forEach(line => {
          console.log(`📊 Parakeet: ${line}`);
          this.parseParakeetProgressFromOutput(audioFilePath, line);
        });
      });

      parakeetProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        const lines = output.trim().split('\n').filter(line => line.length > 0);
        lines.forEach(line => {
          console.log(`📊 Parakeet: ${line}`);
          this.parseParakeetProgressFromOutput(audioFilePath, line);
        });
      });

      parakeetProcess.on('close', (code) => {
        this.currentProcess = null;
        
        if (code === 0) {
          const currentProgress = this.currentProgress.get(audioFilePath);
          if (currentProgress && currentProgress.stage !== 'completed') {
            this.updateProgress(audioFilePath, 'completed', 100, 'Transcription completed');
          }
          resolve({ success: true });
        } else {
          console.error(`❌ Parakeet failed with code ${code}`);
          console.error('STDOUT:', stdout);
          console.error('STDERR:', stderr);
          resolve({ 
            success: false, 
            error: `Parakeet process failed with code ${code}: ${stderr}` 
          });
        }
      });

      parakeetProcess.on('error', (error) => {
        this.currentProcess = null;
        console.error(`❌ Failed to start Parakeet process:`, error);
        resolve({ 
          success: false, 
          error: `Failed to start Parakeet: ${error.message}` 
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
  getQueueStatus(): { processing: boolean; queueLength: number; currentFile?: string; paused: boolean; nextFile?: string } {
    let nextFile: string | undefined;
    
    if (this.processingQueue.length > 0) {
      // If processing, next file is at index 1, otherwise at index 0
      const nextIndex = this.isProcessing ? 1 : 0;
      if (this.processingQueue[nextIndex]) {
        nextFile = path.basename(this.processingQueue[nextIndex]);
      }
    }
    
    return {
      processing: this.isProcessing,
      queueLength: this.processingQueue.length,
      currentFile: this.isProcessing && this.processingQueue.length > 0 
        ? path.basename(this.processingQueue[0]) 
        : undefined,
      nextFile,
      paused: this.isPaused
    };
  }

  /**
   * Pause the transcription queue
   */
  pauseTranscription(): { success: boolean; message: string } {
    if (this.isPaused) {
      return { success: false, message: 'Transcription is already paused' };
    }

    this.isPaused = true;
    console.log('⏸️ Transcription queue paused');
    return { success: true, message: 'Transcription queue paused' };
  }

  /**
   * Resume the transcription queue
   */
  resumeTranscription(): { success: boolean; message: string } {
    if (!this.isPaused) {
      return { success: false, message: 'Transcription is not paused' };
    }

    this.isPaused = false;
    console.log('▶️ Transcription queue resumed');
    
    // Restart processing if there are items in the queue
    if (this.processingQueue.length > 0 && !this.isProcessing) {
      this.processQueue();
    }
    
    return { success: true, message: 'Transcription queue resumed' };
  }

  /**
   * Stop current transcription and clear queue
   */
  stopTranscription(): { success: boolean; message: string } {
    const queueLength = this.processingQueue.length;
    const wasProcessing = this.isProcessing;
    
    // Clear the queue
    this.processingQueue = [];
    this.isPaused = false;
    
    // Kill current process if running
    if (this.currentProcess) {
      try {
        this.currentProcess.kill('SIGTERM');
        console.log('🛑 Killed current WhisperX process');
      } catch (error) {
        console.error('Failed to kill WhisperX process:', error);
      }
    }
    
    // Clear progress tracking
    this.currentProgress.clear();
    
    console.log(`🛑 Transcription stopped. Cleared ${queueLength} queued files`);
    
    return { 
      success: true, 
      message: `Transcription stopped. Cleared ${queueLength} queued files${wasProcessing ? ' and terminated current process' : ''}` 
    };
  }

  /**
   * Update transcription configuration
   */
  updateConfig(newConfig: Partial<TranscriptionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Updated transcription configuration:', newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): TranscriptionConfig {
    return { ...this.config };
  }

  /**
   * Set transcription engine
   */
  setEngine(engine: TranscriptionEngine): void {
    this.config.engine = engine;
    console.log(`🔧 Switched to ${engine} transcription engine`);
  }

  /**
   * Get current transcription engine
   */
  getEngine(): TranscriptionEngine {
    return this.config.engine;
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config = {
      engine: 'parakeet',
      whisperx: {
        model: 'large-v3',
        computeType: 'int8',
        language: 'en',
        outputFormat: 'json',
        diarize: true,
        speakerEmbeddings: true,
        returnCharAlignments: false,
        beamSize: 5,
        bestOf: 5,
        temperature: 0,
        vadMethod: 'pyannote',
        segmentResolution: 'sentence',
        verbose: true,
        printProgress: true
      },
      parakeet: {
        model: 'mlx-community/parakeet-tdt-0.6b-v2',
        outputFormat: 'json',
        highlightWords: false,
        chunkDuration: 120,
        overlapDuration: 15,
        precision: 'bf16',
        attention: 'full',
        localAttentionContextSize: 256,
        verbose: true
      }
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
      const episode = this.getEpisodeByFilePath(audioFilePath);
      console.log(`🔍 Found episode:`, episode ? {id: episode.id, episode_title: episode.episode_title} : 'null');
      
      if (episode && episode.id) {
        let updateQuery = 'UPDATE episodes SET transcription_status = ?, updated_at = CURRENT_TIMESTAMP';
        let updateParams: any[] = [status];

        if (transcriptionPath) {
          updateQuery += ', transcription_path = ?';
          updateParams.push(transcriptionPath);
        }

        if (error) {
          updateQuery += ', transcription_error = ?';
          updateParams.push(error);
        } else if (status !== 'failed') {
          // Clear error on non-failed status
          updateQuery += ', transcription_error = NULL';
        }

        updateQuery += ' WHERE id = ?';
        updateParams.push(episode.id);

        this.initializeDatabase();
        const stmt = this.db.prepare(updateQuery);
        stmt.run(...updateParams);
        console.log(`📊 Updated transcription status: ${episode.id}:${episode.episode_title} -> ${status}`);
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
    const episode = this.getEpisodeByFilePath(audioFilePath);
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
    console.log(`📊 Progress: ${episode.episode_title} - ${stage}: ${message}`);
    
    // Update database status when transcription completes
    if (stage === 'completed') {
      // Find the transcription file path
      const outputDir = path.dirname(audioFilePath);
      const baseName = path.basename(audioFilePath, path.extname(audioFilePath));
      const transcriptionPath = path.join(outputDir, `${baseName}.json`);
      
      // Update database with completed status and transcription path
      this.updateEpisodeTranscriptionStatus(audioFilePath, 'completed', transcriptionPath);
      
      // Keep completed progress for a short time so web UI can see it
      setTimeout(() => {
        this.currentProgress.delete(audioFilePath);
      }, 5000); // Keep for 5 seconds
    }
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
   * Parse progress information from WhisperX output
   */
  private parseProgressFromOutput(audioFilePath: string, line: string): void {
    // Model loading - set to transcribing to start showing progress
    if (line.includes('Loading model') || line.includes('Lightning automatically upgraded')) {
      this.updateProgress(audioFilePath, 'transcribing', 0, 'Loading model...');
    }
    // Look for actual percentage progress from WhisperX output
    else if (line.includes('%') && (line.includes('transcrib') || line.includes('process'))) {
      const match = line.match(/(\d+)%/);
      if (match) {
        const progress = parseInt(match[1]);
        this.updateProgress(audioFilePath, 'transcribing', progress, `${progress}%`);
      }
    }
    // General transcription activity
    else if (line.includes('transcrib') || line.includes('process')) {
      // If no percentage found, show generic progress
      const currentProgress = this.currentProgress.get(audioFilePath);
      if (!currentProgress || currentProgress.stage !== 'transcribing') {
        this.updateProgress(audioFilePath, 'transcribing', 50, 'Processing...');
      }
    }
    // Completion - detect various completion patterns
    else if (line.includes('Saved') || 
             line.includes('Output written') || 
             line.includes('transcription complete') ||
             line.includes('.json') ||
             line.includes('Writing output') ||
             line.match(/.*\.json.*written/i)) {
      this.updateProgress(audioFilePath, 'completed', 100, 'Transcription completed');
    }
  }

  /**
   * Parse progress information from Parakeet output
   */
  private parseParakeetProgressFromOutput(audioFilePath: string, line: string): void {
    // Model loading
    if (line.includes('Loading model') || line.includes('loading')) {
      this.updateProgress(audioFilePath, 'transcribing', 0, 'Loading model...');
    }
    // Look for actual percentage progress from Parakeet's output
    // Match percentage pattern at end: "... 19% 0:01:20" or just "19%"
    else if (line.match(/(\d+)%\s*(?:\d+:\d+:\d+)?\s*$/)) {
      const percentMatch = line.match(/(\d+)%\s*(?:\d+:\d+:\d+)?\s*$/);
      const progress = parseInt(percentMatch[1]);
      this.updateProgress(audioFilePath, 'transcribing', progress, `${progress}%`);
    }
    // General transcription activity
    else if (line.includes('Transcrib') || line.includes('transcrib') || line.includes('Processing')) {
      // If no percentage found, show generic progress
      const currentProgress = this.currentProgress.get(audioFilePath);
      if (!currentProgress || currentProgress.stage !== 'transcribing') {
        this.updateProgress(audioFilePath, 'transcribing', 50, 'Processing...');
      }
    }
    // Completion patterns
    else if (line.includes('Transcription complete') ||
             line.includes('saved') ||
             line.includes('written') ||
             line.includes('.json') ||
             line.includes('Done')) {
      this.updateProgress(audioFilePath, 'completed', 100, 'Transcription completed');
    }
  }

  /**
   * Initialize database connection lazily to avoid Node.js version conflicts
   */
  private initializeDatabase(): void {
    if (!this.db) {
      const dbPath = './podcast-manager.db';
      this.db = new Database(dbPath);
    }
  }

  /**
   * Get episode by file path from database
   */
  private getEpisodeByFilePath(filePath: string): any {
    try {
      this.initializeDatabase();
      const stmt = this.db.prepare('SELECT * FROM episodes WHERE file_path = ?');
      return stmt.get(filePath);
    } catch (error) {
      console.error('Error getting episode by file path:', error);
      return null;
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();

// Export types for UI
export type { TranscriptionEngine, TranscriptionConfig, WhisperXConfig, ParakeetConfig };