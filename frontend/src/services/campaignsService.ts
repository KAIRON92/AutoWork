import axios from 'axios';
import { Campaign } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const campaignsService = {
  async getAll(): Promise<Campaign[]> {
    try {
      const res = await axios.get(`${API_BASE}/v1/campaigns`);
      return res.data;
    } catch {
      return [
        {
          id: 'cmp-1',
          name: 'Q3 Enterprise pCloud Share Campaign',
          status: 'PROCESSING',
          pcloudAccountId: 'acc-1',
          pcloudFileId: 'file-1',
          templateId: 'tpl-1',
          totalCount: 50,
          sharedCount: 38,
          failedCount: 1,
          retryingCount: 0,
          createdAt: new Date().toISOString(),
        },
      ];
    }
  },

  async getById(id: string): Promise<Campaign> {
    const res = await axios.get(`${API_BASE}/v1/campaigns/${id}`);
    return res.data;
  },

  async create(data: {
    name: string;
    pcloudAccountId: string;
    pcloudFileId: string;
    templateId: string;
    contactListId?: string;
    recipientContactIds?: string[];
    config?: any;
  }): Promise<Campaign> {
    const res = await axios.post(`${API_BASE}/v1/campaigns`, data);
    return res.data;
  },

  async launch(id: string): Promise<any> {
    const res = await axios.post(`${API_BASE}/v1/campaigns/${id}/launch`);
    return res.data;
  },

  async pause(id: string): Promise<any> {
    const res = await axios.post(`${API_BASE}/v1/campaigns/${id}/pause`);
    return res.data;
  },

  async delete(id: string): Promise<boolean> {
    await axios.delete(`${API_BASE}/v1/campaigns/${id}`);
    return true;
  },
};
