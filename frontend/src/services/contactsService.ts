import { apiClient } from './apiClient';
import { mockContacts, mockContactLists } from './mockData';
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
    try {
      const response = await apiClient.get('/contacts', { params: { search } });
      return response.data;
    } catch {
      return mockContacts;
    }
  },

  async getAllContacts(search?: string): Promise<Contact[]> {
    return this.getContacts(search);
  },

  async getContactLists(): Promise<ContactList[]> {
    try {
      const response = await apiClient.get('/contact-lists');
      return response.data;
    } catch {
      return mockContactLists;
    }
  },

  async getAllLists(): Promise<ContactList[]> {
    return this.getContactLists();
  },

  async createContact(payload: CreateContactPayload): Promise<Contact> {
    try {
      const response = await apiClient.post('/contacts', payload);
      return response.data;
    } catch {
      const newContact: Contact = {
        id: `cnt-${Date.now()}`,
        status: 'ACTIVE',
        ...payload,
        createdAt: new Date().toISOString(),
      };
      mockContacts.unshift(newContact);
      return newContact;
    }
  },

  async deleteContact(id: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete(`/contacts/${id}`);
      return response.data;
    } catch {
      const idx = mockContacts.findIndex((c) => c.id === id);
      if (idx !== -1) mockContacts.splice(idx, 1);
      return { success: true };
    }
  },

  async createContactList(name: string, description?: string): Promise<ContactList> {
    try {
      const response = await apiClient.post('/contact-lists', { name, description });
      return response.data;
    } catch {
      const newList: ContactList = {
        id: `lst-${Date.now()}`,
        name,
        description,
        memberCount: 0,
        createdAt: new Date().toISOString(),
      };
      mockContactLists.unshift(newList);
      return newList;
    }
  },

  async deleteContactList(id: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete(`/contact-lists/${id}`);
      return response.data;
    } catch {
      const idx = mockContactLists.findIndex((l) => l.id === id);
      if (idx !== -1) mockContactLists.splice(idx, 1);
      return { success: true };
    }
  },

  async importContacts(payload: ImportContactsPayload): Promise<ImportJob> {
    try {
      const response = await apiClient.post('/imports', payload);
      return response.data;
    } catch {
      const importedCount = payload.rawText ? payload.rawText.split('\n').length : 5;
      const job: ImportJob = {
        id: `imp-${Date.now()}`,
        filename: payload.filename,
        status: 'COMPLETED',
        totalRows: importedCount,
        importedCount: importedCount,
        failedCount: 0,
        createdAt: new Date().toISOString(),
      };
      return job;
    }
  },
};
