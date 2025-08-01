import fs from 'fs';
export declare class FileSystemUtils {
    /**
     * Ensures a directory exists, creating it if necessary
     */
    static ensureDirectoryExists(dirPath: string): void;
    /**
     * Checks if a file exists
     */
    static fileExists(filePath: string): boolean;
    /**
     * Gets file size in bytes
     */
    static getFileSize(filePath: string): number;
    /**
     * Moves a file from source to destination
     */
    static moveFile(sourcePath: string, destinationPath: string): void;
    /**
     * Copies a file from source to destination
     */
    static copyFile(sourcePath: string, destinationPath: string): void;
    /**
     * Deletes a file
     */
    static deleteFile(filePath: string): void;
    /**
     * Gets available disk space in bytes
     */
    static getAvailableSpace(directoryPath: string): number;
    /**
     * Lists files in a directory with optional extension filter
     */
    static listFiles(directoryPath: string, extension?: string): string[];
    /**
     * Creates a readable stream for a file
     */
    static createReadStream(filePath: string): fs.ReadStream;
    /**
     * Creates a writable stream for a file
     */
    static createWriteStream(filePath: string): fs.WriteStream;
}
//# sourceMappingURL=fileSystem.d.ts.map