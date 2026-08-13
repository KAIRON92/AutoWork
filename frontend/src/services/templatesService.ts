import axios from 'axios';
import { Template } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const templatesService = {
  async getAll(): Promise<Template[]> {
    try {
      const res = await axios.get(`${API_BASE}/v1/templates`);
      return res.data;
    } catch {
      return [
        {
          id: 'tpl-1',
          name: 'Executive Document Share',
          description: 'Official introduction and secure pCloud file transfer',
          content: 'Hello #NAME#,\n\nPlease find the confidential document shared from our secure pCloud repository.\n\nYour security verification code: #RANDOM#\n\nBest regards,\nExecutive Team',
          variables: JSON.stringify(['#NAME#', '#RANDOM#']),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }
  },

  async getById(id: string): Promise<Template> {
    const res = await axios.get(`${API_BASE}/v1/templates/${id}`);
    return res.data;
  },

  async create(data: { name: string; description?: string; content: string }): Promise<Template> {
    const res = await axios.post(`${API_BASE}/v1/templates`, data);
    return res.data;
  },

  async update(id: string, data: Partial<{ name: string; description?: string; content: string }>): Promise<Template> {
    const res = await axios.put(`${API_BASE}/v1/templates/${id}`, data);
    return res.data;
  },

  async preview(content: string, sampleRecipient?: any): Promise<any> {
    const res = await axios.post(`${API_BASE}/v1/templates/preview`, { content, sampleRecipient });
    return res.data;
  },

  async duplicate(id: string): Promise<Template> {
    const res = await axios.post(`${API_BASE}/v1/templates/${id}/duplicate`);
    return res.data;
  },

  async delete(id: string): Promise<boolean> {
    await axios.delete(`${API_BASE}/v1/templates/${id}`);
    return true;
  },
};
