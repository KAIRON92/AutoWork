import { Injectable } from '@nestjs/common';

@Injectable()
export class ContactsService {
  private contacts = [
    {
      id: 'cnt-1',
      email: 'sarah.connor@cyberdyne.io',
      firstName: 'Sarah',
      lastName: 'Connor',
      phone: '+1 555-0192',
      company: 'Cyberdyne Systems',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cnt-2',
      email: 'bruce.wayne@wayneenterprises.com',
      firstName: 'Bruce',
      lastName: 'Wayne',
      phone: '+1 555-0144',
      company: 'Wayne Enterprises',
      createdAt: new Date().toISOString(),
    },
  ];

  private lists = [
    {
      id: 'lst-1',
      name: 'Enterprise VIP Prospects',
      description: 'Tier-1 executive contacts',
      memberCount: 2,
      createdAt: new Date().toISOString(),
    },
  ];

  async findAllContacts() {
    return this.contacts;
  }

  async findAllLists() {
    return this.lists;
  }

  async createContact(data: any) {
    const newC = {
      id: `cnt-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.contacts.unshift(newC);
    return newC;
  }

  async createList(name: string, description?: string) {
    const newList = {
      id: `lst-${Date.now()}`,
      name,
      description,
      memberCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.lists.unshift(newList);
    return newList;
  }
}
