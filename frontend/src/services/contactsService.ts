import { apiClient } from './apiClient';
import { mockContacts, mockContactLists } from './mockData';
import { Contact, ContactList, ImportJob } from '../types';

export interface CreateContactPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

export interface ImportContactsPayload {
  filename: string;
  rawText?: string;
  mappings: Record<string, string>; // e.g. { "0": "email", "1": "firstName" }
  contactListId?: string;
}

export const contactsService = {
  async getContacts(): Promise<Contact[]> {
    try {
      const response = await apiClient.get('/contacts');
      return response.data;
    } catch (err) {
      return mockContacts;
    }
  },

  async getContactLists(): Promise<ContactList[]> {
    try {
      const response = await apiClient.get('/contact-lists');
      return response.data;
    } catch (err) {
      return mockContactLists;
    }
  },

  async createContact(payload: CreateContactPayload): Promise<Contact> {
    try {
      const response = await apiClient.post('/contacts', payload);
      return response.data;
    } catch (err) {
      const newContact: Contact = {
        id: `cnt-${Date.now()}`,
        ...payload,
        createdAt: new Date().toISOString(),
      };
      mockContacts.unshift(newContact);
      return newContact;
    }
  },

  async createContactList(name: string, description?: string): Promise<ContactList> {
    try {
      const response = await apiClient.post('/contact-lists', { name, description });
      return response.data;
    } catch (err) {
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

  async importContacts(payload: ImportContactsPayload): Promise<ImportJob> {
    try {
      const response = await apiClient.post('/imports', payload);
      return response.data;
    } catch (err) {
      // Mock batch processing logic
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
