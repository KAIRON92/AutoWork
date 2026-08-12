import { apiClient } from './apiClient';
import { Attachment } from '../types';

export const mockAttachments: Attachment[] = [
  {
    id: 'att-1',
    filename: 'Company_Brochure_2026.pdf',
    fileSize: 1420500,
    mimeType: 'application/pdf',
    pcloudFileId: 'pcloud-f-1001',
    createdAt: '2026-08-05T12:00:00Z',
  },
  {
    id: 'att-2',
    filename: 'Product_Overview_Deck.pdf',
    fileSize: 3200100,
    mimeType: 'application/pdf',
    pcloudFileId: 'pcloud-f-1002',
    createdAt: '2026-08-09T14:30:00Z',
  },
];

export const storageService = {
  async getAttachments(): Promise<Attachment[]> {
    try {
      const response = await apiClient.get('/attachments');
      return response.data;
    } catch (err) {
      return mockAttachments;
    }
  },

  async uploadAttachment(file: File): Promise<Attachment> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/attachments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (err) {
      const newAtt: Attachment = {
        id: `att-${Date.now()}`,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        pcloudFileId: `pcloud-file-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      mockAttachments.unshift(newAtt);
      return newAtt;
    }
  },
};
