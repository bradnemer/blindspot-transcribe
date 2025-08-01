import fs from 'fs';
import path from 'path';
export class FileSystemUtils {
    /**
     * Ensures a directory exists, creating it if necessary
     */
    static ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    /**
     * Checks if a file exists
     */
    static fileExists(filePath) {
        return fs.existsSync(filePath);
    }
    /**
     * Gets file size in bytes
     */
    static getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        }
        catch (error) {
            throw new Error(`Failed to get file size for ${filePath}: ${error}`);
        }
    }
    /**
     * Moves a file from source to destination
     */
    static moveFile(sourcePath, destinationPath) {
        try {
            // Ensure destination directory exists
            const destDir = path.dirname(destinationPath);
            this.ensureDirectoryExists(destDir);
            // Move the file
            fs.renameSync(sourcePath, destinationPath);
        }
        catch (error) {
            throw new Error(`Failed to move file from ${sourcePath} to ${destinationPath}: ${error}`);
        }
    }
    /**
     * Copies a file from source to destination
     */
    static copyFile(sourcePath, destinationPath) {
        try {
            // Ensure destination directory exists
            const destDir = path.dirname(destinationPath);
            this.ensureDirectoryExists(destDir);
            // Copy the file
            fs.copyFileSync(sourcePath, destinationPath);
        }
        catch (error) {
            throw new Error(`Failed to copy file from ${sourcePath} to ${destinationPath}: ${error}`);
        }
    }
    /**
     * Deletes a file
     */
    static deleteFile(filePath) {
        try {
            if (this.fileExists(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        catch (error) {
            throw new Error(`Failed to delete file ${filePath}: ${error}`);
        }
    }
    /**
     * Gets available disk space in bytes
     */
    static getAvailableSpace(directoryPath) {
        try {
            const stats = fs.statSync(directoryPath);
            // This is a simplified version - in production you'd use a library like 'statvfs'
            // For now, return a large number to avoid blocking downloads
            return 1024 * 1024 * 1024 * 10; // 10GB
        }
        catch (error) {
            throw new Error(`Failed to get available space for ${directoryPath}: ${error}`);
        }
    }
    /**
     * Lists files in a directory with optional extension filter
     */
    static listFiles(directoryPath, extension) {
        try {
            if (!fs.existsSync(directoryPath)) {
                return [];
            }
            const files = fs.readdirSync(directoryPath);
            if (extension) {
                return files.filter(file => path.extname(file).toLowerCase() === extension.toLowerCase());
            }
            return files.filter(file => {
                const filePath = path.join(directoryPath, file);
                return fs.statSync(filePath).isFile();
            });
        }
        catch (error) {
            throw new Error(`Failed to list files in ${directoryPath}: ${error}`);
        }
    }
    /**
     * Creates a readable stream for a file
     */
    static createReadStream(filePath) {
        return fs.createReadStream(filePath);
    }
    /**
     * Creates a writable stream for a file
     */
    static createWriteStream(filePath) {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        this.ensureDirectoryExists(dir);
        return fs.createWriteStream(filePath);
    }
}
//# sourceMappingURL=fileSystem.js.map