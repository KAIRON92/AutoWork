import { apiClient } from './apiClient';
import { PCloudFile } from '../types';

export const filesService = {
  async getAll(): Promise<PCloudFile[]> {
    const res = await apiClient.get('/v1/pcloud/files');
    return res.data;
  },

  async browsePCloud(accountId?: string, folderId: string = '0'): Promise<any[]> {
    const res = await apiClient.get('/v1/pcloud/files/browse', {
      params: { accountId, folderId },
    });
    return res.data;
  },

  async upload(formData: FormData): Promise<PCloudFile> {
    const res = await apiClient.post('/v1/pcloud/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async registerExisting(data: {
    name: string;
    fileId: string;
    folderId?: string;
    fileSize?: number;
    mimeType?: string;
    pcloudAccountId?: string;
    pcloudPath?: string;
  }): Promise<PCloudFile> {
    const res = await apiClient.post('/v1/pcloud/files/register', data);
    return res.data;
  },

  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/v1/pcloud/files/${id}`);
    return true;
  },
};
