import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAutomationPayload {
  name: string;
  definition: string;
  status?: string;
}

@Injectable()
export class AutomationsService {
  constructor(private prisma: PrismaService) {}

  async findAllByOrg(organizationId: string) {
    return this.prisma.automation.findMany({
      where: { organizationId },
      include: { versions: { orderBy: { version: 'desc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, organizationId },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!automation) throw new NotFoundException(`Automation ${id} not found`);
    return automation;
  }

  async create(organizationId: string, payload: CreateAutomationPayload) {
    return this.prisma.$transaction(async (tx) => {
      const automation = await tx.automation.create({
        data: {
          organizationId,
          name: payload.name,
          status: payload.status || 'DRAFT',
        },
      });

      await tx.automationVersion.create({
        data: {
          automationId: automation.id,
          organizationId,
          version: 1,
          definition: payload.definition,
        },
      });

      return tx.automation.findUnique({
        where: { id: automation.id },
        include: { versions: { orderBy: { version: 'desc' } } },
      });
    });
  }

  async update(id: string, organizationId: string, payload: Partial<CreateAutomationPayload>) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, organizationId },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!automation) throw new NotFoundException(`Automation ${id} not found`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.automation.update({
        where: { id: automation.id },
        data: {
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
        },
      });

      if (payload.definition !== undefined) {
        const nextVersion = (automation.versions[0]?.version || 0) + 1;
        await tx.automationVersion.create({
          data: {
            automationId: automation.id,
            organizationId,
            version: nextVersion,
            definition: payload.definition,
          },
        });
      }

      return tx.automation.findUnique({
        where: { id: updated.id },
        include: { versions: { orderBy: { version: 'desc' } } },
      });
    });
  }

  async remove(id: string, organizationId: string) {
    const automation = await this.prisma.automation.findFirst({ where: { id, organizationId } });
    if (!automation) throw new NotFoundException(`Automation ${id} not found`);
    await this.prisma.automation.delete({ where: { id } });
    return { success: true };
  }
}
