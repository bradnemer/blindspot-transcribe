import apiClient from './client';

export interface DirectoryInfo {
  downloadDirectory: string;
  doneDirectory: string;
  exists: {
    download: boolean;
    done: boolean;
  };
  permissions: {
    download: boolean;
    done: boolean;
  };
  diskSpace: {
    total: number;
    free: number;
    used: number;
  };
}

export class DirectoriesAPI {
  // Ensure directories exist
  static async ensureDirectoriesExist(): Promise<boolean> {
    try {
      await apiClient.post('/directories/ensure');
      return true;
    } catch (error) {
      console.error('Failed to ensure directories exist:', error);
      return false;
    }
  }

  // Get directory information
  static async getDirectoryInfo(): Promise<DirectoryInfo | null> {
    try {
      const response = await apiClient.get('/directories/info');
      return response.data;
    } catch (error) {
      console.error('Failed to get directory info:', error);
      return null;
    }
  }

  // Check if directories are properly set up
  static async checkDirectorySetup(): Promise<boolean> {
    const info = await this.getDirectoryInfo();
    if (!info) return false;
    
    return info.exists.download && info.exists.done && 
           info.permissions.download && info.permissions.done;
  }

  // Get available disk space in MB
  static async getAvailableDiskSpace(): Promise<number> {
    const info = await this.getDirectoryInfo();
    return info ? Math.round(info.diskSpace.free / (1024 * 1024)) : 0;
  }

  // Check if there's enough disk space for downloads (in MB)
  static async hasEnoughDiskSpace(requiredMB: number): Promise<boolean> {
    const availableMB = await this.getAvailableDiskSpace();
    return availableMB >= requiredMB;
  }
}