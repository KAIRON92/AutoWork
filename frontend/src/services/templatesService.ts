import { apiClient } from './apiClient';
import { Template } from '../types';

export const templatesService = {
  async getAll(): Promise<Template[]> {
    const res = await apiClient.get('/v1/templates');
    return res.data;
  },

  async getById(id: string): Promise<Template> {
    const res = await apiClient.get(`/v1/templates/${id}`);
    return res.data;
  },

  async create(data: { name: string; description?: string; content: string }): Promise<Template> {
    const res = await apiClient.post('/v1/templates', data);
    return res.data;
  },

  async update(id: string, data: Partial<{ name: string; description?: string; content: string }>): Promise<Template> {
    const res = await apiClient.put(`/v1/templates/${id}`, data);
    return res.data;
  },

  async preview(content: string, sampleRecipient?: any): Promise<any> {
    const res = await apiClient.post('/v1/templates/preview', { content, sampleRecipient });
    return res.data;
  },

  async duplicate(id: string): Promise<Template> {
    const res = await apiClient.post(`/v1/templates/${id}/duplicate`);
    return res.data;
  },

  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/v1/templates/${id}`);
    return true;
  },
};
