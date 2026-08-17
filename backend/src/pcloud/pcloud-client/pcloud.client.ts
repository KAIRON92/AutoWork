import { PCloudErrorMapper } from './pcloud.errors';
import {
  PCloudErrorCode,
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

  private getAlternateHost(host: string): string {
    if (host.includes('eapi.pcloud.com')) {
      return host.replace('eapi.pcloud.com', 'api.pcloud.com');
    }
    if (host.includes('api.pcloud.com')) {
      return host.replace('api.pcloud.com', 'eapi.pcloud.com');
    }
    return 'https://eapi.pcloud.com';
  }

  async getUserInfo(accessToken: string, apiHost?: string): Promise<PCloudUserInfo> {
    const host = this.getHost(apiHost);
    try {
      const res = await fetch(`${host}/userinfo?auth=${encodeURIComponent(accessToken)}`);
      const data = await res.json();
      if (data.result === 0) {
        return {
          userId: data.userid?.toString() || 'unknown',
          email: data.email || '',
          quota: data.quota || 0,
          usedQuota: data.usedquota || 0,
          freeQuota: (data.quota || 0) - (data.usedquota || 0),
          emailVerified: !!data.emailverified,
          registered: data.registered || new Date().toISOString(),
          resolvedApiHost: host,
        };
      }
      if (data.result === 2321) {
        const altHost = this.getAlternateHost(host);
        const altRes = await fetch(`${altHost}/userinfo?auth=${encodeURIComponent(accessToken)}`);
        const altData = await altRes.json();
        if (altData.result === 0) {
          return {
            userId: altData.userid?.toString() || 'unknown',
            email: altData.email || '',
            quota: altData.quota || 0,
            usedQuota: altData.usedquota || 0,
            freeQuota: (altData.quota || 0) - (altData.usedquota || 0),
            emailVerified: !!altData.emailverified,
            registered: altData.registered || new Date().toISOString(),
            resolvedApiHost: altHost,
          };
        }
      }
      throw PCloudErrorMapper.mapRawError(data.result, data.error);
    } catch (err: any) {
      if (err.code) throw err;
      throw PCloudErrorMapper.fromNetworkError(err);
    }
  }

  async listFolder(folderId = '0', accessToken: string, apiHost?: string): Promise<PCloudItemMetadata[]> {
    const host = this.getHost(apiHost);
    try {
      const res = await fetch(`${host}/listfolder?auth=${encodeURIComponent(accessToken)}&folderid=${encodeURIComponent(folderId)}`);
      const data = await res.json();
      if (data.result === 0 && data.metadata && Array.isArray(data.metadata.contents)) {
        return data.metadata.contents.map((item: any) => ({
          fileId: item.fileid?.toString(),
          folderId: item.folderid?.toString(),
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
      if (data.result === 2321) {
        const altHost = this.getAlternateHost(host);
        const altRes = await fetch(`${altHost}/listfolder?auth=${encodeURIComponent(accessToken)}&folderid=${encodeURIComponent(folderId)}`);
        const altData = await altRes.json();
        if (altData.result === 0 && altData.metadata && Array.isArray(altData.metadata.contents)) {
          return altData.metadata.contents.map((item: any) => ({
            fileId: item.fileid?.toString(),
            folderId: item.folderid?.toString(),
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
      const res = await fetch(`${host}/stat?auth=${encodeURIComponent(accessToken)}&fileid=${encodeURIComponent(fileId)}`);
      const data = await res.json();
      if (data.result === 0 && data.metadata) {
        const meta = data.metadata;
        return {
          fileId: meta.fileid?.toString() || fileId,
          folderId: meta.parentfolderid?.toString(),
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
      if (data.result === 2321) {
        const altHost = this.getAlternateHost(host);
        const altRes = await fetch(`${altHost}/stat?auth=${encodeURIComponent(accessToken)}&fileid=${encodeURIComponent(fileId)}`);
        const altData = await altRes.json();
        if (altData.result === 0 && altData.metadata) {
          const meta = altData.metadata;
          return {
            fileId: meta.fileid?.toString() || fileId,
            folderId: meta.parentfolderid?.toString(),
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
      }
      throw PCloudErrorMapper.mapRawError(data.result, data.error);
    } catch (err: any) {
      if (err.code) throw err;
      throw PCloudErrorMapper.fromNetworkError(err);
    }
  }

  async uploadFile(filename: string, buffer: Buffer, mimeType: string, folderId = '0', accessToken: string, apiHost?: string): Promise<PCloudItemMetadata> {
    const host = this.getHost(apiHost);
    try {
      const formData = new FormData();
      formData.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
      const res = await fetch(`${host}/uploadfile?auth=${encodeURIComponent(accessToken)}&folderid=${encodeURIComponent(folderId)}&filename=${encodeURIComponent(filename)}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.result === 0 && data.metadata?.length) {
        const meta = data.metadata[0];
        return {
          fileId: meta.fileid?.toString(),
          folderId: meta.parentfolderid?.toString() || folderId,
          name: meta.name,
          isFolder: false,
          size: meta.size || buffer.length,
          mimeType,
          path: meta.path || `/${meta.name}`,
          created: meta.created || new Date().toISOString(),
          modified: meta.modified || new Date().toISOString(),
          metadata: meta,
        };
      }
      if (data.result === 2321) {
        const altHost = this.getAlternateHost(host);
        const altFormData = new FormData();
        altFormData.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
        const altRes = await fetch(`${altHost}/uploadfile?auth=${encodeURIComponent(accessToken)}&folderid=${encodeURIComponent(folderId)}&filename=${encodeURIComponent(filename)}`, { method: 'POST', body: altFormData });
        const altData = await altRes.json();
        if (altData.result === 0 && altData.metadata?.length) {
          const meta = altData.metadata[0];
          return {
            fileId: meta.fileid?.toString(),
            folderId: meta.parentfolderid?.toString() || folderId,
            name: meta.name,
            isFolder: false,
            size: meta.size || buffer.length,
            mimeType,
            path: meta.path || `/${meta.name}`,
            created: meta.created || new Date().toISOString(),
            modified: meta.modified || new Date().toISOString(),
            metadata: meta,
          };
        }
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
    const permissions = options.permissions !== undefined ? options.permissions : 0;
    try {
      if (options.fileId) {
        const selected = await this.getFileMetadata(options.fileId, accessToken, apiHost);
        if (!selected.isFolder) {
          return {
            success: false,
            operationType: 'sharefolder',
            recipientEmail: options.recipientEmail,
            descriptionSnapshot: options.message,
            pcloudAccountId: options.pcloudAccountId || 'default',
            pcloudFileId: options.fileId,
            error: {
              code: PCloudErrorCode.PCLOUD_FILE_SHARE_UNSUPPORTED,
              message: 'pCloud sharefolder accepts folders only. Use uploadtransfer for a file campaign.',
              isTransient: false,
              timestamp: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          };
        }
      }
      let url = `${host}/sharefolder?auth=${encodeURIComponent(accessToken)}&folderid=${encodeURIComponent(targetFolderId)}&mail=${encodeURIComponent(options.recipientEmail)}&permissions=${permissions}`;
      if (options.message) url += `&message=${encodeURIComponent(options.message)}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (data.result === 0) {
        return {
          success: true,
          operationType: 'sharefolder',
          pcloudReferenceId: data.shareid?.toString() || `share-${Date.now()}`,
          recipientEmail: options.recipientEmail,
          descriptionSnapshot: options.message,
          pcloudAccountId: options.pcloudAccountId || 'default',
          pcloudFileId: options.fileId || targetFolderId,
          timestamp: new Date().toISOString(),
        };
      }
      if (data.result === 2321) {
        const altHost = this.getAlternateHost(host);
        let altUrl = `${altHost}/sharefolder?auth=${encodeURIComponent(accessToken)}&folderid=${encodeURIComponent(targetFolderId)}&mail=${encodeURIComponent(options.recipientEmail)}&permissions=${permissions}`;
        if (options.message) altUrl += `&message=${encodeURIComponent(options.message)}`;
        const altRes = await fetch(altUrl, { method: 'POST' });
        const altData = await altRes.json();
        if (altData.result === 0) {
          return {
            success: true,
            operationType: 'sharefolder',
            pcloudReferenceId: altData.shareid?.toString() || `share-${Date.now()}`,
            recipientEmail: options.recipientEmail,
            descriptionSnapshot: options.message,
            pcloudAccountId: options.pcloudAccountId || 'default',
            pcloudFileId: options.fileId || targetFolderId || '0',
            timestamp: new Date().toISOString(),
          };
        }
      }
      const error = PCloudErrorMapper.mapRawError(data.result, data.error);
      return {
        success: false,
        operationType: 'sharefolder',
        recipientEmail: options.recipientEmail,
        descriptionSnapshot: options.message || undefined,
        pcloudAccountId: options.pcloudAccountId || 'default',
        pcloudFileId: options.fileId || targetFolderId || '0',
        error,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const error = err.code ? err : PCloudErrorMapper.fromNetworkError(err);
      return {
        success: false,
        operationType: 'sharefolder',
        recipientEmail: options.recipientEmail,
        descriptionSnapshot: options.message || undefined,
        pcloudAccountId: options.pcloudAccountId || 'default',
        pcloudFileId: options.fileId || targetFolderId || '0',
        error,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async downloadFileBuffer(fileId: string, accessToken: string, apiHost?: string): Promise<{ buffer: Buffer; name: string; mimeType: string }> {
    let host = this.getHost(apiHost);
    const metadata = await this.getFileMetadata(fileId, accessToken, apiHost);
    if (metadata.isFolder) throw new Error('uploadtransfer requires a file, not a folder');
    let linkRes = await fetch(`${host}/getfilelink?auth=${encodeURIComponent(accessToken)}&fileid=${encodeURIComponent(fileId)}`);
    let linkData = await linkRes.json();
    if (linkData.result === 2321) {
      host = this.getAlternateHost(host);
      linkRes = await fetch(`${host}/getfilelink?auth=${encodeURIComponent(accessToken)}&fileid=${encodeURIComponent(fileId)}`);
      linkData = await linkRes.json();
    }
    if (linkData.result !== 0 || !linkData.hosts?.length || !linkData.path) {
      throw PCloudErrorMapper.mapRawError(linkData.result, linkData.error);
    }
    const fileRes = await fetch(`https://${linkData.hosts[0]}${linkData.path}`);
    if (!fileRes.ok) throw new Error(`pCloud file download failed with HTTP ${fileRes.status}`);
    return { buffer: Buffer.from(await fileRes.arrayBuffer()), name: metadata.name, mimeType: metadata.mimeType };
  }

  async uploadTransfer(options: PCloudTransferOptions, accessToken: string, apiHost?: string): Promise<PCloudShareResult> {
    const host = this.getHost(apiHost);
    const recipientEmail = options.recipientEmails[0] || '';
    try {
      if (!options.fileId) throw new Error('A pCloud fileId is required for uploadtransfer');
      const file = await this.downloadFileBuffer(options.fileId, accessToken, apiHost);
      const formData = new FormData();
      formData.append('sendermail', options.senderEmail);
      formData.append('receivermails', options.recipientEmails.join(','));
      if (options.message) formData.append('message', options.message.slice(0, 160));
      formData.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }), options.filename || file.name);
      const res = await fetch(`${host}/uploadtransfer`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.result === 0) {
        return {
          success: true,
          operationType: 'uploadtransfer',
          pcloudReferenceId: data.progresshash || data.transferid || `transfer-${Date.now()}`,
          recipientEmail,
          descriptionSnapshot: options.message || undefined,
          pcloudAccountId: options.pcloudAccountId || 'default',
          pcloudFileId: options.fileId || '0',
          timestamp: new Date().toISOString(),
        };
      }
      if (data.result === 2321) {
        const altHost = this.getAlternateHost(host);
        const altFormData = new FormData();
        altFormData.append('sendermail', options.senderEmail);
        altFormData.append('receivermails', options.recipientEmails.join(','));
        if (options.message) altFormData.append('message', options.message.slice(0, 160));
        altFormData.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }), options.filename || file.name);
        const altRes = await fetch(`${altHost}/uploadtransfer`, { method: 'POST', body: altFormData });
        const altData = await altRes.json();
        if (altData.result === 0) {
          return {
            success: true,
            operationType: 'uploadtransfer',
            pcloudReferenceId: altData.progresshash || altData.transferid || `transfer-${Date.now()}`,
            recipientEmail,
            descriptionSnapshot: options.message || undefined,
            pcloudAccountId: options.pcloudAccountId || 'default',
            pcloudFileId: options.fileId || '0',
            timestamp: new Date().toISOString(),
          };
        }
      }
      const error = PCloudErrorMapper.mapRawError(data.result, data.error);
      return {
        success: false,
        operationType: 'uploadtransfer',
        recipientEmail,
        descriptionSnapshot: options.message || undefined,
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
        recipientEmail,
        descriptionSnapshot: options.message || undefined,
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
      const res = await fetch(`${host}/deletefile?auth=${encodeURIComponent(accessToken)}&fileid=${encodeURIComponent(fileId)}`);
      const data = await res.json();
      if (data.result === 0) return true;
      if (data.result === 2321) {
        const altHost = this.getAlternateHost(host);
        const altRes = await fetch(`${altHost}/deletefile?auth=${encodeURIComponent(accessToken)}&fileid=${encodeURIComponent(fileId)}`);
        const altData = await altRes.json();
        return altData.result === 0;
      }
      return false;
    } catch {
      return false;
    }
  }
}
