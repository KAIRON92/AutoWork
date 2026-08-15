import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            pcloudAccounts: true,
            pcloudFiles: true,
            contacts: true,
            campaigns: true,
            templates: true,
            automations: true,
          },
        },
      },
    });

    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async update(id: string, data: { name?: string; slug?: string }) {
    await this.findOne(id);
    return this.prisma.organization.update({ where: { id }, data });
  }
}
