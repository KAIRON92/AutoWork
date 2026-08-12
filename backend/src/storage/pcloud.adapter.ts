import { IStorageService, UploadFileOptions, StoredFileResult } from './storage.interface';

export class PCloudStorageAdapter implements IStorageService {
  readonly providerName = 'pcloud';

  private apiHost: string;
  private accessToken: string;
  private folderId: string;

  constructor() {
    this.apiHost = process.env.PCLOUD_API_HOST || 'https://api.pcloud.com';
    this.accessToken = process.env.PCLOUD_ACCESS_TOKEN || 'placeholder_pcloud_access_token';
    this.folderId = process.env.PCLOUD_FOLDER_ID || '0';
  }

  private isPlaceholderToken(): boolean {
    return (
      !this.accessToken ||
      this.accessToken.includes('placeholder') ||
      this.accessToken.trim() === ''
    );
  }

  async verifyConnection(): Promise<{ connected: boolean; message: string }> {
    if (this.isPlaceholderToken()) {
      return {
        connected: true,
        message: 'pCloud Adapter running in simulation mode (awaiting real PCLOUD_ACCESS_TOKEN in env)',
      };
    }

    try {
      const response = await fetch(`${this.apiHost}/userinfo?access_token=${this.accessToken}`);
      const data = await response.json();

      if (data.result === 0) {
        return {
          connected: true,
          message: `Connected to pCloud account: ${data.email} (${data.quota - data.usedquota} bytes free)`,
        };
      } else {
        return {
          connected: false,
          message: `pCloud API error: ${data.error || 'Invalid access token'} (code ${data.result})`,
        };
      }
    } catch (err: any) {
      return {
        connected: false,
        message: `Failed to contact pCloud API at ${this.apiHost}: ${err.message}`,
      };
    }
  }

  async uploadFile(options: UploadFileOptions): Promise<StoredFileResult> {
    const targetFolderId = options.folderId || this.folderId;

    if (this.isPlaceholderToken()) {
      // Simulation mode fallback until client supplies API keys
      const simulatedId = `pcloud-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      return {
        fileId: simulatedId,
        filename: options.filename,
        fileSize: options.buffer.length,
        mimeType: options.mimeType,
        publicUrl: `https://api.pcloud.com/simulated-download/${simulatedId}/${encodeURIComponent(options.filename)}`,
        pcloudPath: `/autowork_attachments/${options.filename}`,
        metadata: { simulated: true, provider: 'pcloud' },
      };
    }

    // Real pCloud REST API multipart file upload
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(options.buffer)], { type: options.mimeType });
      formData.append('file', blob, options.filename);

      const uploadUrl = `${this.apiHost}/uploadfile?access_token=${this.accessToken}&folderid=${targetFolderId}&filename=${encodeURIComponent(options.filename)}`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.result === 0 && data.metadata && data.metadata.length > 0) {
        const meta = data.metadata[0];
        return {
          fileId: meta.fileid.toString(),
          filename: meta.name,
          fileSize: meta.size,
          mimeType: options.mimeType,
          pcloudPath: meta.path || `/folder_${targetFolderId}/${meta.name}`,
          metadata: meta,
        };
      } else {
        throw new Error(`pCloud upload failed (result code ${data.result}): ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      throw new Error(`pCloud Storage Adapter Error: ${error.message}`);
    }
  }

  async getFileUrl(fileId: string): Promise<string> {
    if (this.isPlaceholderToken() || fileId.startsWith('pcloud-file-')) {
      return `https://my.pcloud.com/publink/show?code=SIMULATED_${fileId}`;
    }

    try {
      const response = await fetch(`${this.apiHost}/getfilelink?access_token=${this.accessToken}&fileid=${fileId}`);
      const data = await response.json();

      if (data.result === 0 && data.hosts && data.hosts.length > 0 && data.path) {
        return `https://${data.hosts[0]}${data.path}`;
      } else {
        throw new Error(`Failed to generate pCloud file link: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      throw new Error(`pCloud getFileUrl error: ${error.message}`);
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    if (this.isPlaceholderToken() || fileId.startsWith('pcloud-file-')) {
      return true;
    }

    try {
      const response = await fetch(`${this.apiHost}/deletefile?access_token=${this.accessToken}&fileid=${fileId}`);
      const data = await response.json();
      return data.result === 0;
    } catch (error) {
      return false;
    }
  }
}
