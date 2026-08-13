import { apiClient } from './apiClient';
import { PCloudFile } from '../types';

export const mockAttachments: PCloudFile[] = [
  {
    id: 'att-1',
    pcloudAccountId: 'acc-1',
    name: 'Company_Brochure_2026.pdf',
    fileSize: 1420500,
    mimeType: 'application/pdf',
    fileId: 'pcloud-f-1001',
    createdAt: '2026-08-05T12:00:00Z',
  },
  {
    id: 'att-2',
    pcloudAccountId: 'acc-1',
    name: 'Product_Overview_Deck.pdf',
    fileSize: 3200100,
    mimeType: 'application/pdf',
    fileId: 'pcloud-f-1002',
    createdAt: '2026-08-09T14:30:00Z',
  },
];

export const storageService = {
  async getAttachments(): Promise<PCloudFile[]> {
    try {
      const response = await apiClient.get('/v1/pcloud/files');
      return response.data;
    } catch {
      return mockAttachments;
    }
  },

  async uploadAttachment(file: File): Promise<PCloudFile> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/v1/pcloud/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch {
      const newAtt: PCloudFile = {
        id: `att-${Date.now()}`,
        pcloudAccountId: 'acc-1',
        name: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        fileId: `pcloud-file-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      mockAttachments.unshift(newAtt);
      return newAtt;
    }
  },
};
