import { apiClient } from './apiClient';
import { mockAccounts } from './mockData';
import { EmailAccount } from '../types';

export interface CreateAccountPayload {
  name: string;
  email: string;
  provider: 'fake' | 'gmail' | 'microsoft' | 'smtp';
  dailyLimit?: number;
  credentials?: Record<string, any>;
}

export const accountsService = {
  async getAccounts(): Promise<EmailAccount[]> {
    try {
      const response = await apiClient.get('/accounts');
      return response.data;
    } catch (err) {
      return mockAccounts;
    }
  },

  async createAccount(payload: CreateAccountPayload): Promise<EmailAccount> {
    try {
      const response = await apiClient.post('/accounts', payload);
      return response.data;
    } catch (err) {
      const newAcc: EmailAccount = {
        id: `acc-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        provider: payload.provider,
        status: 'ACTIVE',
        dailyLimit: payload.dailyLimit || 500,
        sentToday: 0,
        createdAt: new Date().toISOString(),
      };
      mockAccounts.unshift(newAcc);
      return newAcc;
    }
  },

  async toggleStatus(id: string): Promise<EmailAccount> {
    try {
      const response = await apiClient.patch(`/accounts/${id}/status`);
      return response.data;
    } catch (err) {
      const acc = mockAccounts.find((a) => a.id === id);
      if (acc) {
        acc.status = acc.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        return { ...acc };
      }
      throw new Error('Account not found');
    }
  },

  async deleteAccount(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/accounts/${id}`);
      return true;
    } catch (err) {
      const index = mockAccounts.findIndex((a) => a.id === id);
      if (index !== -1) mockAccounts.splice(index, 1);
      return true;
    }
  },
};
