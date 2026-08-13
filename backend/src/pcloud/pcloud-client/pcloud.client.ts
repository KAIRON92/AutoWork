import { PCloudErrorMapper } from './pcloud.errors';
import {
  PCloudUserInfo,
  PCloudItemMetadata,
  PCloudShareOptions,
  PCloudTransferOptions,
  PCloudShareResult,
} from '../pcloud.interface';

export class PCloudClient {
  private defaultApiHost: string;

  constructor(defaultApiHost: string = 'https://api.pcloud.com') {
    this.defaultApiHost = defaultApiHost;
  }

  private getHost(customHost?: string): string {
    return customHost || this.defaultApiHost;
  }

  async getUserInfo(accessToken: string, apiHost?: string): Promise<PCloudUserInfo> {
    const host = this.getHost(apiHost);
    try {
      const res = await fetch(`${host}/userinfo?auth=${encodeURIComponent(accessToken)}`);
      const data = await res.json();

      if (data.result === 0) {
        return {
          userId: data.userid ? data.userid.toString() : 'unknown',
          email: data.email || '',
          quota: data.quota || 0,
          usedQuota: data.usedquota || 0,
          freeQuota: (data.quota || 0) - (data.usedquota || 0),
          emailVerified: !!data.emailverified,
          registered: data.registered || new Date().toISOString(),
        };
      }

      throw PCloudErrorMapper.mapRawError(data.result, data.error);
    } catch (err: any) {
      if (err.code) throw err;
      throw PCloudErrorMapper.fromNetworkError(err);
    }
  }

  async listFolder(folderId: string = '0', accessToken: string, apiHost?: string): Promise<PCloudItemMetadata[]> {
    const host = this.getHost(apiHost);
    try {
      const res = await fetch(
        `${host}/listfolder?auth=${encodeURIComponent(accessToken)}&folderid=${encodeURIComponent(folderId)}`
      );
      const data = await res.json();

      if (data.result === 0 && data.metadata && Array.isArray(data.metadata.contents)) {
        return data.metadata.contents.map((item: any) => ({
          fileId: item.fileid ? item.fileid.toString() : undefined,
          folderId: item.folderid ? item.folderid.toString() : undefined,
          name: item.name,
          isFolder: !!item.isfolder,
          size: item.size || 0,
          mimeType: item.contenttype || (item.isfolder ? 'folder' : 'application/octet-stream'),
          path: item.path || `/${item.name}`,
          created: item.created || new Date().toISOString(),
          modified: item.modified || new Date().toISOString(),
          metadata: item,
        }));
      }

      throw PCloudErrorMapper.mapRawError(data.result, data.error);
    } catch (err: any) {
      if (err.code) throw err;
      throw PCloudErrorMapper.fromNetworkError(err);
    }
  }

  async getFileMetadata(fileId: string, accessToken: string, apiHost?: string): Promise<PCloudItemMetadata> {
    const host = this.getHost(apiHost);
    try {
      const res = await fetch(
        `${host}/stat?auth=${encodeURIComponent(accessToken)}&fileid=${encodeURIComponent(fileId)}`
      );
      const data = await res.json();

      if (data.result === 0 && data.metadata) {
        const meta = data.metadata;
        return {
          fileId: meta.fileid ? meta.fileid.toString() : fileId,
          folderId: meta.parentfolderid ? meta.parentfolderid.toString() : undefined,
          name: meta.name,
          isFolder: !!meta.isfolder,
          size: meta.size || 0,
          mimeType: meta.contenttype || 'application/octet-stream',
          path: meta.path || `/${meta.name}`,
          created: meta.created || new Date().toISOString(),
          modified: meta.modified || new Date().toISOString(),
          metadata: meta,
        };
      }

      throw PCloudErrorMapper.mapRawError(data.result, data.error);
    } catch (err: any) {
      if (err.code) throw err;
      throw PCloudErrorMapper.fromNetworkError(err);
    }
  }

  async uploadFile(
    filename: string,
    buffer: Buffer,
    mimeType: string,
    folderId: string = '0',
    accessToken: string,
    apiHost?: string
  ): Promise<PCloudItemMetadata> {
    const host = this.getHost(apiHost);
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
      formData.append('file', blob, filename);

      const url = `${host}/uploadfile?auth=${encodeURIComponent(accessToken)}&folderid=${encodeURIComponent(folderId)}&filename=${encodeURIComponent(filename)}`;
      const res = await fetch(url, { method: 'POST', body: formData });
      const data = await res.json();

      if (data.result === 0 && data.metadata && data.metadata.length > 0) {
        const meta = data.metadata[0];
        return {
          fileId: meta.fileid ? meta.fileid.toString() : undefined,
          folderId: meta.parentfolderid ? meta.parentfolderid.toString() : folderId,
          name: meta.name,
          isFolder: false,
          size: meta.size || buffer.length,
          mimeType: mimeType,
          path: meta.path || `/${meta.name}`,
          created: meta.created || new Date().toISOString(),
          modified: meta.modified || new Date().toISOString(),
          metadata: meta,
        };
      }

      throw PCloudErrorMapper.mapRawError(data.result, data.error);
    } catch (err: any) {
      if (err.code) throw err;
      throw PCloudErrorMapper.fromNetworkError(err);
    }
  }

  async shareFolder(options: PCloudShareOptions, accessToken: string, apiHost?: string): Promise<PCloudShareResult> {
    const host = this.getHost(apiHost);
    const targetFolderId = options.folderId || '0';
    const permissions = options.permissions !== undefined ? options.permissions : 0; // Default read-only

    try {
      let url = `${host}/sharefolder?auth=${encodeURIComponent(accessToken)}&folderid=${encodeURIComponent(targetFolderId)}&mail=${encodeURIComponent(options.recipientEmail)}&permissions=${permissions}`;
      if (options.message) {
        url += `&message=${encodeURIComponent(options.message)}`;
      }

      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();

      if (data.result === 0) {
        return {
          success: true,
          operationType: 'sharefolder',
          pcloudReferenceId: data.shareid ? data.shareid.toString() : `share-${Date.now()}`,
          recipientEmail: options.recipientEmail,
          descriptionSnapshot: options.message,
          pcloudAccountId: options.pcloudAccountId || 'default',
          pcloudFileId: options.fileId || targetFolderId,
          timestamp: new Date().toISOString(),
        };
      }

      const error = PCloudErrorMapper.mapRawError(data.result, data.error);
      return {
        success: false,
        operationType: 'sharefolder',
        recipientEmail: options.recipientEmail,
        descriptionSnapshot: options.message,
        pcloudAccountId: options.pcloudAccountId || 'default',
        pcloudFileId: options.fileId || targetFolderId,
        error,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const error = err.code ? err : PCloudErrorMapper.fromNetworkError(err);
      return {
        success: false,
        operationType: 'sharefolder',
        recipientEmail: options.recipientEmail,
        descriptionSnapshot: options.message,
        pcloudAccountId: options.pcloudAccountId || 'default',
        pcloudFileId: options.fileId || targetFolderId,
        error,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async uploadTransfer(options: PCloudTransferOptions, accessToken: string, apiHost?: string): Promise<PCloudShareResult> {
    const host = this.getHost(apiHost);
    try {
      const receiverMails = options.recipientEmails.join(',');
      let url = `${host}/uploadtransfer?auth=${encodeURIComponent(accessToken)}&sendermail=${encodeURIComponent(options.senderEmail)}&receivermails=${encodeURIComponent(receiverMails)}`;
      if (options.message) {
        url += `&message=${encodeURIComponent(options.message)}`;
      }

      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();

      if (data.result === 0) {
        return {
          success: true,
          operationType: 'uploadtransfer',
          pcloudReferenceId: data.progresshash || data.transferid || `transfer-${Date.now()}`,
          recipientEmail: options.recipientEmails[0] || '',
          descriptionSnapshot: options.message,
          pcloudAccountId: options.pcloudAccountId || 'default',
          pcloudFileId: options.fileId || '0',
          timestamp: new Date().toISOString(),
        };
      }

      const error = PCloudErrorMapper.mapRawError(data.result, data.error);
      return {
        success: false,
        operationType: 'uploadtransfer',
        recipientEmail: options.recipientEmails[0] || '',
        descriptionSnapshot: options.message,
        pcloudAccountId: options.pcloudAccountId || 'default',
        pcloudFileId: options.fileId || '0',
        error,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const error = err.code ? err : PCloudErrorMapper.fromNetworkError(err);
      return {
        success: false,
        operationType: 'uploadtransfer',
        recipientEmail: options.recipientEmails[0] || '',
        descriptionSnapshot: options.message,
        pcloudAccountId: options.pcloudAccountId || 'default',
        pcloudFileId: options.fileId || '0',
        error,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async deleteFile(fileId: string, accessToken: string, apiHost?: string): Promise<boolean> {
    const host = this.getHost(apiHost);
    try {
      const res = await fetch(
        `${host}/deletefile?auth=${encodeURIComponent(accessToken)}&fileid=${encodeURIComponent(fileId)}`
      );
      const data = await res.json();
      return data.result === 0;
    } catch {
      return false;
    }
  }
}
