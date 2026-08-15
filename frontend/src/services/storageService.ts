import { apiClient } from './apiClient';
import { PCloudFile } from '../types';

export const storageService = {
  async getAttachments(): Promise<PCloudFile[]> {
    const response = await apiClient.get('/v1/pcloud/files');
    return response.data;
  },

  async uploadAttachment(file: File): Promise<PCloudFile> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/v1/pcloud/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
