import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountsService {
  private accounts = [
    {
      id: 'acc-1',
      name: 'Primary Outbound',
      email: 'outbound@acmegrowth.com',
      provider: 'fake',
      status: 'ACTIVE',
      dailyLimit: 500,
      sentToday: 142,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'acc-2',
      name: 'Secondary Sender',
      email: 'sales@acmegrowth.com',
      provider: 'fake',
      status: 'ACTIVE',
      dailyLimit: 250,
      sentToday: 89,
      createdAt: new Date().toISOString(),
    },
  ];

  async findAll() {
    return this.accounts;
  }

  async create(data: { name: string; email: string; provider: string; dailyLimit?: number }) {
    const newAcc = {
      id: `acc-${Date.now()}`,
      name: data.name,
      email: data.email,
      provider: data.provider || 'fake',
      status: 'ACTIVE',
      dailyLimit: data.dailyLimit || 500,
      sentToday: 0,
      createdAt: new Date().toISOString(),
    };
    this.accounts.unshift(newAcc);
    return newAcc;
  }

  async toggleStatus(id: string) {
    const acc = this.accounts.find((a) => a.id === id);
    if (acc) {
      acc.status = acc.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      return acc;
    }
    throw new Error('Account not found');
  }

  async remove(id: string) {
    this.accounts = this.accounts.filter((a) => a.id !== id);
    return true;
  }
}
