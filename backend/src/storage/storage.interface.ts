/**
 * Pluggable Storage Service Interface
 * 
 * Defines the contract for uploading, retrieving, and deleting campaign email attachments.
 */

export interface UploadFileOptions {
  filename: string;
  buffer: Buffer;
  mimeType: string;
  folderId?: string | number;
}

export interface StoredFileResult {
  fileId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  publicUrl?: string;
  pcloudPath?: string;
  metadata?: Record<string, any>;
}

export interface IStorageService {
  readonly providerName: string;

  /**
   * Upload file to storage provider
   */
  uploadFile(options: UploadFileOptions): Promise<StoredFileResult>;

  /**
   * Get temporary or public download link for an attachment
   */
  getFileUrl(fileId: string): Promise<string>;

  /**
   * Delete file from storage
   */
  deleteFile(fileId: string): Promise<boolean>;

  /**
   * Test connection and credentials
   */
  verifyConnection(): Promise<{ connected: boolean; message: string }>;
}
