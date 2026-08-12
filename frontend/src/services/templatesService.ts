import { apiClient } from './apiClient';
import { mockTemplates } from './mockData';
import { Template } from '../types';

export interface CreateTemplatePayload {
  name: string;
  subject: string;
  body: string;
}

export const templatesService = {
  async getTemplates(): Promise<Template[]> {
    try {
      const response = await apiClient.get('/templates');
      return response.data;
    } catch (err) {
      return mockTemplates;
    }
  },

  async createTemplate(payload: CreateTemplatePayload): Promise<Template> {
    try {
      const response = await apiClient.post('/templates', payload);
      return response.data;
    } catch (err) {
      const newTpl: Template = {
        id: `tpl-${Date.now()}`,
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockTemplates.unshift(newTpl);
      return newTpl;
    }
  },

  async updateTemplate(id: string, payload: Partial<CreateTemplatePayload>): Promise<Template> {
    try {
      const response = await apiClient.put(`/templates/${id}`, payload);
      return response.data;
    } catch (err) {
      const tpl = mockTemplates.find((t) => t.id === id);
      if (tpl) {
        Object.assign(tpl, payload, { updatedAt: new Date().toISOString() });
        return { ...tpl };
      }
      throw new Error('Template not found');
    }
  },

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/templates/${id}`);
      return true;
    } catch (err) {
      const index = mockTemplates.findIndex((t) => t.id === id);
      if (index !== -1) mockTemplates.splice(index, 1);
      return true;
    }
  },

  resolvePreview(text: string, sampleData: Record<string, string>): string {
    let result = text;
    const vars: Record<string, string> = {
      '#NAME#': sampleData.name || 'Sarah Connor',
      '#FIRSTNAME#': sampleData.firstName || 'Sarah',
      '#LASTNAME#': sampleData.lastName || 'Connor',
      '#EMAIL#': sampleData.email || 'sarah.connor@cyberdyne.io',
      '#PHONE#': sampleData.phone || '+1 555-0192',
      '#COMPANY#': sampleData.company || 'Cyberdyne Systems',
      '#RANDOM#': Math.random().toString(36).substring(2, 8).toUpperCase(),
    };

    for (const [key, val] of Object.entries(vars)) {
      result = result.replace(new RegExp(key, 'g'), val);
    }
    return result;
  },
};
