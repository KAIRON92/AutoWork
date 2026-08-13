import axios from 'axios';
import { PCloudAccount } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const accountsService = {
  async getAll(): Promise<PCloudAccount[]> {
    try {
      const res = await axios.get(`${API_BASE}/v1/pcloud/accounts`);
      return res.data;
    } catch {
      return [
        {
          id: 'acc-1',
          organizationId: 'org-101',
          name: 'Primary pCloud Account',
          accountEmail: 'primary@autowork.com',
          provider: 'mock_pcloud',
          status: 'ACTIVE',
          dailyLimit: 500,
          sentToday: 142,
          hasCredentials: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'acc-2',
          organizationId: 'org-101',
          name: 'Enterprise pCloud Vault',
          accountEmail: 'enterprise@autowork.com',
          provider: 'pcloud',
          status: 'ACTIVE',
          dailyLimit: 1000,
          sentToday: 48,
          hasCredentials: true,
          createdAt: new Date().toISOString(),
        },
      ];
    }
  },

  async create(data: {
    name: string;
    accountEmail: string;
    provider?: 'pcloud' | 'mock_pcloud';
    accessToken?: string;
    dailyLimit?: number;
  }): Promise<PCloudAccount> {
    const res = await axios.post(`${API_BASE}/v1/pcloud/accounts`, data);
    return res.data;
  },

  async testConnection(id: string): Promise<{ connected: boolean; message: string }> {
    const res = await axios.post(`${API_BASE}/v1/pcloud/accounts/${id}/test`);
    return res.data;
  },

  async toggleStatus(id: string): Promise<PCloudAccount> {
    const res = await axios.patch(`${API_BASE}/v1/pcloud/accounts/${id}/status`);
    return res.data;
  },

  async delete(id: string): Promise<boolean> {
    await axios.delete(`${API_BASE}/v1/pcloud/accounts/${id}`);
    return true;
  },
};
