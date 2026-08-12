import { apiClient } from './apiClient';
import { mockCampaigns } from './mockData';
import { Campaign } from '../types';

export interface CreateCampaignPayload {
  name: string;
  templateId: string;
  accountIds: string[];
  recipientIds?: string[];
  contactListIds?: string[];
  attachmentIds?: string[];
}

export const campaignsService = {
  async getCampaigns(): Promise<Campaign[]> {
    try {
      const response = await apiClient.get('/campaigns');
      return response.data;
    } catch (err) {
      return mockCampaigns;
    }
  },

  async getCampaignById(id: string): Promise<Campaign | undefined> {
    try {
      const response = await apiClient.get(`/campaigns/${id}`);
      return response.data;
    } catch (err) {
      return mockCampaigns.find((c) => c.id === id);
    }
  },

  async createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
    try {
      const response = await apiClient.post('/campaigns', payload);
      return response.data;
    } catch (err) {
      const newCampaign: Campaign = {
        id: `cmp-${Date.now()}`,
        name: payload.name,
        status: 'DRAFT',
        templateId: payload.templateId,
        templateName: 'Executive Introduction',
        accountIds: payload.accountIds,
        totalCount: (payload.recipientIds?.length || 0) + 5,
        sentCount: 0,
        failedCount: 0,
        createdAt: new Date().toISOString(),
      };
      mockCampaigns.unshift(newCampaign);
      return newCampaign;
    }
  },

  async launchCampaign(id: string): Promise<Campaign> {
    try {
      const response = await apiClient.post(`/campaigns/${id}/launch`);
      return response.data;
    } catch (err) {
      const cmp = mockCampaigns.find((c) => c.id === id);
      if (cmp) {
        cmp.status = 'PROCESSING';
        return { ...cmp };
      }
      throw new Error('Campaign not found');
    }
  },

  async pauseCampaign(id: string): Promise<Campaign> {
    try {
      const response = await apiClient.post(`/campaigns/${id}/pause`);
      return response.data;
    } catch (err) {
      const cmp = mockCampaigns.find((c) => c.id === id);
      if (cmp) {
        cmp.status = 'PAUSED';
        return { ...cmp };
      }
      throw new Error('Campaign not found');
    }
  },
};
