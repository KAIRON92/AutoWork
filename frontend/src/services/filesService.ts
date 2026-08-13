import axios from 'axios';
import { PCloudFile } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const filesService = {
  async getAll(): Promise<PCloudFile[]> {
    try {
      const res = await axios.get(`${API_BASE}/v1/pcloud/files`);
      return res.data;
    } catch {
      return [
        {
          id: 'file-1',
          organizationId: 'org-101',
          name: 'Executive_Product_Overview.pdf',
          fileId: 'mock-file-101',
          fileSize: 2450800,
          mimeType: 'application/pdf',
          pcloudPath: '/Executive_Product_Overview.pdf',
          createdAt: new Date().toISOString(),
        },
      ];
    }
  },

  async browsePCloud(accountId?: string, folderId: string = '0'): Promise<any[]> {
    try {
      const res = await axios.get(`${API_BASE}/v1/pcloud/files/browse`, {
        params: { accountId, folderId },
      });
      return res.data;
    } catch {
      return [
        {
          fileId: 'mock-file-101',
          name: 'Product_Catalog_2026.pdf',
          isFolder: false,
          size: 2450800,
          mimeType: 'application/pdf',
          path: '/Product_Catalog_2026.pdf',
        },
        {
          fileId: 'mock-file-102',
          name: 'Enterprise_Solution_Brief.pdf',
          isFolder: false,
          size: 1150400,
          mimeType: 'application/pdf',
          path: '/Enterprise_Solution_Brief.pdf',
        },
      ];
    }
  },

  async upload(formData: FormData): Promise<PCloudFile> {
    const res = await axios.post(`${API_BASE}/v1/pcloud/files/upload`, formData, {
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
    const res = await axios.post(`${API_BASE}/v1/pcloud/files/register`, data);
    return res.data;
  },

  async delete(id: string): Promise<boolean> {
    await axios.delete(`${API_BASE}/v1/pcloud/files/${id}`);
    return true;
  },
};
