import { apiClient } from './apiClient';
import { Campaign } from '../types';

export const campaignsService = {
  async getAll(): Promise<Campaign[]> {
    const res = await apiClient.get('/v1/campaigns');
    return res.data;
  },

  async getById(id: string): Promise<Campaign> {
    const res = await apiClient.get(`/v1/campaigns/${id}`);
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
    const res = await apiClient.post('/v1/campaigns', data);
    return res.data;
  },

  async launch(id: string): Promise<any> {
    const res = await apiClient.post(`/v1/campaigns/${id}/launch`);
    return res.data;
  },

  async pause(id: string): Promise<any> {
    const res = await apiClient.post(`/v1/campaigns/${id}/pause`);
    return res.data;
  },

  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/v1/campaigns/${id}`);
    return true;
  },
};
