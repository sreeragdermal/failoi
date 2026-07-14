import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve uploads folder location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_UPLOAD_DIR = path.resolve(__dirname, '../../../uploads');

export interface StorageProvider {
  saveFile(buffer: Buffer, folder: string, filename: string): Promise<string>;
  deleteFile(relativeFilePath: string): Promise<void>;
  getFileUrl(relativeFilePath: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR 
      ? path.resolve(process.env.UPLOAD_DIR) 
      : DEFAULT_UPLOAD_DIR;
    
    // Ensure upload directory exists
    this.init();
  }

  private async init() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (err) {
      console.error('[StorageService] Failed to create uploads directory:', err);
    }
  }

  /**
   * Saves a file buffer to disk.
   * @param buffer File data
   * @param folder Target subdirectory (e.g. 'pdfs', 'thumbnails')
   * @param filename Target filename
   * @returns The relative path to the saved file (e.g. 'pdfs/my-file.pdf')
   */
  async saveFile(buffer: Buffer, folder: string, filename: string): Promise<string> {
    const targetFolder = path.join(this.uploadDir, folder);
    await fs.mkdir(targetFolder, { recursive: true });

    // Generate clean filename to avoid collisions
    const cleanFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fullPath = path.join(targetFolder, cleanFilename);
    
    await fs.writeFile(fullPath, buffer);
    
    // Return relative path (e.g., 'pdfs/17205432-document.pdf')
    return path.join(folder, cleanFilename);
  }

  /**
   * Deletes a file from disk.
   * @param relativeFilePath Relative file path returned by saveFile
   */
  async deleteFile(relativeFilePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, relativeFilePath);
    try {
      await fs.unlink(fullPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error(`[StorageService] Failed to delete file at ${fullPath}:`, err);
        throw err;
      }
    }
  }

  /**
   * Generates a fully-qualified public URL to access the asset.
   */
  getFileUrl(relativeFilePath: string): string {
    // Replace backslashes on Windows systems with forward slashes for URLs
    const cleanPath = relativeFilePath.replace(/\\/g, '/');
    return `/uploads/${cleanPath}`;
  }
}

// Export a single instance to be used throughout the app
const storageService = new LocalStorageProvider();
export default storageService;
