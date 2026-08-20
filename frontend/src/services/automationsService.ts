import { apiClient } from './apiClient';

export interface Automation {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  versions?: any[];
  jobs?: any[];
}

export const automationsService = {
  async getAll(): Promise<Automation[]> {
    const response = await apiClient.get('/v1/automations');
    return response.data;
  },

  async getOne(id: string): Promise<Automation> {
    const response = await apiClient.get(`/v1/automations/${id}`);
    return response.data;
  },

  async create(payload: { name: string; definition?: string }): Promise<Automation> {
    const response = await apiClient.post('/v1/automations', payload);
    return response.data;
  },

  async update(id: string, payload: Partial<{ name: string; status: string; definition: string }>): Promise<Automation> {
    const response = await apiClient.patch(`/v1/automations/${id}`, payload);
    return response.data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/v1/automations/${id}`);
    return response.data;
  },
};
