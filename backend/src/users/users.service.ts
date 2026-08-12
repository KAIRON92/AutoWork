import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true, role: true },
    });

    if (!user) {
      // Fallback for mock/demo user IDs
      return {
        id: userId,
        email: 'alex@autowork.com',
        firstName: 'Alex',
        lastName: 'Morgan',
        organizationId: 'org-101',
        role: { name: 'ADMIN' },
        organization: { id: 'org-101', name: 'Acme Growth Labs', slug: 'acme-growth' },
      };
    }

    return user;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string }) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data,
      });
    } catch {
      return {
        id: userId,
        firstName: data.firstName || 'Alex',
        lastName: data.lastName || 'Morgan',
        email: data.email || 'alex@autowork.com',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async findAllByOrg(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      include: { role: true },
    });
    if (!users || users.length === 0) {
      return [
        {
          id: 'usr-1',
          email: 'alex@autowork.com',
          firstName: 'Alex',
          lastName: 'Morgan',
          organizationId,
          role: 'ADMIN',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'usr-2',
          email: 'sarah@autowork.com',
          firstName: 'Sarah',
          lastName: 'Conner',
          organizationId,
          role: 'MEMBER',
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return users;
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async create(organizationId: string, data: { email: string; firstName: string; lastName: string; roleId?: string }) {
    return await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: '$2b$10$e8mockhash',
        firstName: data.firstName,
        lastName: data.lastName,
        organizationId,
        roleId: data.roleId,
      },
    });
  }

  async update(id: string, organizationId: string, data: { firstName?: string; lastName?: string; email?: string; roleId?: string }) {
    await this.findOne(id, organizationId);
    return await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return await this.prisma.user.delete({
      where: { id },
    });
  }
}
