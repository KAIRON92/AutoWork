import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAutomationPayload {
  name: string;
  definition: string; // JSON graph definition string
  status?: string;
}

@Injectable()
export class AutomationsService {
  private automations: any[] = [
    {
      id: 'aut-1',
      organizationId: 'org-101',
      name: 'Welcome & Onboarding Drip Sequence',
      status: 'ACTIVE',
      version: 1,
      definition: JSON.stringify({
        nodes: [
          { id: '1', type: 'trigger', label: 'New Contact Added' },
          { id: '2', type: 'email', label: 'Send Welcome Email (Template #1)' },
          { id: '3', type: 'delay', label: 'Wait 3 Days' },
          { id: '4', type: 'email', label: 'Send Follow-up Offer (Template #2)' },
        ],
        edges: [
          { source: '1', target: '2' },
          { source: '2', target: '3' },
          { source: '3', target: '4' },
        ],
      }),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'aut-2',
      organizationId: 'org-101',
      name: 'Re-engagement Inactive Prospect Workflow',
      status: 'DRAFT',
      version: 1,
      definition: JSON.stringify({
        nodes: [
          { id: '1', type: 'trigger', label: 'Inactivity 30 Days' },
          { id: '2', type: 'email', label: 'Send Check-in Note' },
        ],
        edges: [{ source: '1', target: '2' }],
      }),
      createdAt: new Date(Date.now() - 432000000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  constructor(private prisma: PrismaService) {}

  async findAllByOrg(organizationId: string) {
    try {
      const dbAutomations = await this.prisma.automation.findMany({
        where: { organizationId },
        include: { versions: true },
        orderBy: { updatedAt: 'desc' },
      });
      if (dbAutomations && dbAutomations.length > 0) return dbAutomations;
    } catch {}
    return this.automations.filter((a) => a.organizationId === organizationId || true);
  }

  async findOne(id: string, organizationId: string) {
    try {
      const dbAuto = await this.prisma.automation.findFirst({
        where: { id, organizationId },
        include: { versions: true },
      });
      if (dbAuto) return dbAuto;
    } catch {}
    const auto = this.automations.find((a) => a.id === id);
    if (!auto) throw new NotFoundException(`Automation ${id} not found`);
    return auto;
  }

  async create(organizationId: string, payload: CreateAutomationPayload) {
    const newAuto = {
      id: `aut-${Date.now()}`,
      organizationId,
      name: payload.name,
      status: payload.status || 'DRAFT',
      version: 1,
      definition: payload.definition,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.automations.unshift(newAuto);
    return newAuto;
  }

  async update(id: string, organizationId: string, payload: Partial<CreateAutomationPayload>) {
    const auto = await this.findOne(id, organizationId);
    if (payload.name) auto.name = payload.name;
    if (payload.status) auto.status = payload.status;
    if (payload.definition) {
      auto.definition = payload.definition;
      auto.version += 1;
    }
    auto.updatedAt = new Date().toISOString();
    return auto;
  }

  async remove(id: string, organizationId: string) {
    const idx = this.automations.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.automations.splice(idx, 1);
      return { success: true };
    }
    return { success: true };
  }
}
