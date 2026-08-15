import { apiClient } from './apiClient';
import { Contact, ContactList, ImportJob } from '../types';

export interface CreateContactPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  target?: string;
}

export interface ImportContactsPayload {
  filename: string;
  rawText?: string;
  mappings: Record<string, string>;
  contactListId?: string;
}

export const contactsService = {
  async getContacts(search?: string): Promise<Contact[]> {
    const response = await apiClient.get('/v1/contacts', { params: { search } });
    return response.data;
  },

  async getAllContacts(search?: string): Promise<Contact[]> {
    return this.getContacts(search);
  },

  async getContactLists(): Promise<ContactList[]> {
    const response = await apiClient.get('/v1/contact-lists');
    return response.data;
  },

  async getAllLists(): Promise<ContactList[]> {
    return this.getContactLists();
  },

  async createContact(payload: CreateContactPayload): Promise<Contact> {
    const response = await apiClient.post('/v1/contacts', payload);
    return response.data;
  },

  async deleteContact(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/v1/contacts/${id}`);
    return response.data;
  },

  async createContactList(name: string, description?: string): Promise<ContactList> {
    const response = await apiClient.post('/v1/contact-lists', { name, description });
    return response.data;
  },

  async deleteContactList(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/v1/contact-lists/${id}`);
    return response.data;
  },

  async importContacts(payload: ImportContactsPayload): Promise<ImportJob> {
    const response = await apiClient.post('/v1/imports', payload);
    return response.data;
  },
};
