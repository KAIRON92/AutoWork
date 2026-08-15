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

    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);
    return user;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async findAllByOrg(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });
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

  async create(organizationId: string, data: { email: string; firstName: string; lastName: string; roleId?: string; passwordHash: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        organizationId,
        roleId: data.roleId,
      },
    });
  }

  async update(id: string, organizationId: string, data: { firstName?: string; lastName?: string; email?: string; roleId?: string }) {
    await this.findOne(id, organizationId);
    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(data.email ? { email: data.email.trim().toLowerCase() } : {}),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.user.delete({ where: { id } });
  }
}
