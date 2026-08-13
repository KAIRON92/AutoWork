import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateContactDto {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  company?: string;
  target?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  contactListIds?: string[];
}

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAllContacts(organizationId: string, search?: string) {
    const where: any = { organizationId };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.contact.findMany({
      where,
      include: {
        memberships: {
          include: {
            contactList: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneContact(id: string, organizationId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId },
      include: { memberships: { include: { contactList: true } } },
    });
    if (!contact) throw new NotFoundException(`Contact ${id} not found`);
    return contact;
  }

  async createContact(organizationId: string, dto: CreateContactDto) {
    const email = dto.email.toLowerCase().trim();
    const fullName = dto.fullName || `${dto.firstName || ''} ${dto.lastName || ''}`.trim() || undefined;

    const contact = await this.prisma.contact.create({
      data: {
        organizationId,
        email,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        fullName: fullName || null,
        phone: dto.phone || null,
        company: dto.company || null,
        target: dto.target || null,
        tags: dto.tags ? JSON.stringify(dto.tags) : null,
        customFields: dto.customFields ? JSON.stringify(dto.customFields) : null,
        source: 'manual',
      },
    });

    if (dto.contactListIds && dto.contactListIds.length > 0) {
      for (const listId of dto.contactListIds) {
        await this.prisma.contactListMember.create({
          data: {
            contactId: contact.id,
            contactListId: listId,
          },
        });
      }
    }

    return contact;
  }

  async updateContact(id: string, organizationId: string, dto: Partial<CreateContactDto>) {
    const existing = await this.prisma.contact.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException(`Contact ${id} not found`);

    return await this.prisma.contact.update({
      where: { id },
      data: {
        email: dto.email ? dto.email.toLowerCase().trim() : undefined,
        firstName: dto.firstName,
        lastName: dto.lastName,
        fullName: dto.fullName,
        phone: dto.phone,
        company: dto.company,
        target: dto.target,
        tags: dto.tags ? JSON.stringify(dto.tags) : undefined,
        customFields: dto.customFields ? JSON.stringify(dto.customFields) : undefined,
      },
    });
  }

  async removeContact(id: string, organizationId: string) {
    const existing = await this.prisma.contact.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException(`Contact ${id} not found`);

    await this.prisma.contact.delete({ where: { id } });
    return { success: true, message: `Contact ${id} removed` };
  }

  // Contact Lists
  async findAllLists(organizationId: string) {
    const lists = await this.prisma.contactList.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return lists.map((l) => ({
      ...l,
      memberCount: l._count.members,
    }));
  }

  async findOneList(id: string, organizationId: string) {
    const list = await this.prisma.contactList.findFirst({
      where: { id, organizationId },
      include: {
        members: {
          include: {
            contact: true,
          },
        },
      },
    });
    if (!list) throw new NotFoundException(`Contact list ${id} not found`);
    return {
      ...list,
      memberCount: list.members.length,
      contacts: list.members.map((m) => m.contact),
    };
  }

  async createList(organizationId: string, name: string, description?: string) {
    return await this.prisma.contactList.create({
      data: {
        organizationId,
        name,
        description: description || null,
      },
    });
  }

  async removeList(id: string, organizationId: string) {
    const existing = await this.prisma.contactList.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException(`Contact list ${id} not found`);

    await this.prisma.contactList.delete({ where: { id } });
    return { success: true, message: `Contact list ${id} removed` };
  }
}
