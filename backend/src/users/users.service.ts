import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitize(user: any) {
    if (!user) return user;
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  private async validateRole(organizationId: string, roleId?: string) {
    if (!roleId) return undefined;
    const role = await this.prisma.role.findFirst({ where: { id: roleId, organizationId } });
    if (!role) throw new BadRequestException('The selected role does not belong to your organization');
    return role.id;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true, role: true },
    });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);
    return this.sanitize(user);
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { ...data, ...(data.email ? { email: data.email.trim().toLowerCase() } : {}) },
      include: { role: true },
    });
    return this.sanitize(user);
  }

  async findAllByOrg(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((user) => this.sanitize(user));
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      include: { role: true },
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return this.sanitize(user);
  }

  async create(organizationId: string, data: { email: string; firstName: string; lastName: string; roleId?: string; password: string }) {
    const roleId = await this.validateRole(organizationId, data.roleId);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        organizationId,
        roleId,
      },
      include: { role: true },
    });
    return this.sanitize(user);
  }

  async update(id: string, organizationId: string, data: { firstName?: string; lastName?: string; email?: string; roleId?: string }) {
    await this.findOne(id, organizationId);
    const roleId = await this.validateRole(organizationId, data.roleId);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(data.email ? { email: data.email.trim().toLowerCase() } : {}),
        ...(data.roleId !== undefined ? { roleId } : {}),
      },
      include: { role: true },
    });
    return this.sanitize(user);
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
