import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateVariableResolver, RecipientContext } from './template-variable.resolver';

export interface CreateTemplateDto {
  name: string;
  description?: string;
  content: string;
}

export interface PreviewTemplateDto {
  content: string;
  sampleRecipient?: RecipientContext;
}

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return await this.prisma.template.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, organizationId },
    });
    if (!template) throw new NotFoundException(`Template ${id} not found`);
    return template;
  }

  async create(organizationId: string, dto: CreateTemplateDto) {
    const variables = TemplateVariableResolver.detectVariables(dto.content);

    return await this.prisma.template.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description || null,
        content: dto.content,
        variables: JSON.stringify(variables),
      },
    });
  }

  async update(id: string, organizationId: string, dto: Partial<CreateTemplateDto>) {
    const template = await this.prisma.template.findFirst({
      where: { id, organizationId },
    });
    if (!template) throw new NotFoundException(`Template ${id} not found`);

    const variables = dto.content ? TemplateVariableResolver.detectVariables(dto.content) : undefined;

    return await this.prisma.template.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        content: dto.content,
        variables: variables ? JSON.stringify(variables) : undefined,
      },
    });
  }

  async duplicate(id: string, organizationId: string) {
    const original = await this.findOne(id, organizationId);
    return await this.create(organizationId, {
      name: `${original.name} (Copy)`,
      description: original.description || undefined,
      content: original.content,
    });
  }

  async remove(id: string, organizationId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, organizationId },
    });
    if (!template) throw new NotFoundException(`Template ${id} not found`);

    await this.prisma.template.delete({
      where: { id },
    });

    return { success: true, message: `Template ${id} removed` };
  }

  preview(dto: PreviewTemplateDto) {
    const sample: RecipientContext = dto.sampleRecipient || {
      email: 'alex.morgan@acmegrowth.com',
      firstName: 'Alex',
      lastName: 'Morgan',
      fullName: 'Alex Morgan',
      company: 'Acme Growth Labs',
      phone: '+1 (555) 234-5678',
      target: 'Enterprise Cloud Division',
    };

    const variables = TemplateVariableResolver.detectVariables(dto.content);
    const { resolvedText, randomCode } = TemplateVariableResolver.resolve(dto.content, sample);

    return {
      originalContent: dto.content,
      resolvedPreview: resolvedText,
      randomCodeGenerated: randomCode,
      detectedVariables: variables,
      sampleUsed: sample,
    };
  }
}
