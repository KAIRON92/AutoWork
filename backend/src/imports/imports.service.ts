import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { FileParserUtil } from './file-parser.util';

export interface ParseImportPayload {
  filename: string;
  fileContent: string;
}

export interface ColumnMappingPayload {
  emailColumn: string;
  firstNameColumn?: string;
  lastNameColumn?: string;
  fullNameColumn?: string;
  companyColumn?: string;
  phoneColumn?: string;
  targetColumn?: string;
  columnMap?: Record<string, string>;
  rows: Record<string, string>[];
}

export interface ConfirmImportPayload {
  filename: string;
  rows: Record<string, string>[];
  mapping: ColumnMappingPayload;
  contactListName?: string;
  contactListId?: string;
}

@Injectable()
export class ImportsService {
  constructor(
    private prisma: PrismaService,
    @Optional() private jobsService?: JobsService,
  ) {}

  async parseFile(payload: ParseImportPayload) {
    const lowerName = payload.filename.toLowerCase();
    const isWorkbook = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

    if (lowerName.endsWith('.xls')) {
      throw new BadRequestException('Legacy .xls workbooks are not yet supported. Save the workbook as .xlsx or CSV before importing.');
    }

    let result;
    if (isWorkbook) {
      const base64 = payload.fileContent.includes('base64,')
        ? payload.fileContent.split('base64,')[1]
        : payload.fileContent;
      result = await FileParserUtil.parseWorkbookBase64(base64);
    } else {
      let content = payload.fileContent;
      if (content.startsWith('data:') && content.includes('base64,')) {
        content = Buffer.from(content.split('base64,')[1], 'base64').toString('utf-8');
      }
      result = FileParserUtil.parseTextOrCsv(content);
    }

    return {
      filename: payload.filename,
      headers: result.headers,
      previewRows: result.rows.slice(0, 10),
      allRows: result.rows,
      totalRows: result.totalRows,
      detectedMapping: result.detectedMapping,
    };
  }

  async validateMapping(organizationId: string, mapping: ColumnMappingPayload) {
    let validCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    const errors: { row: number; reason: string; email?: string }[] = [];
    const seenInBatch = new Set<string>();

    const existingContacts = await this.prisma.contact.findMany({
      where: { organizationId },
      select: { email: true },
    });
    const existingEmailSet = new Set(existingContacts.map((c) => c.email.toLowerCase().trim()));

    mapping.rows.forEach((row, idx) => {
      const rawEmail = row[mapping.emailColumn];
      const email = rawEmail ? rawEmail.toLowerCase().trim() : '';
      if (!email || !email.includes('@') || !email.includes('.')) {
        errorCount++;
        errors.push({ row: idx + 1, reason: 'Invalid or missing email address', email: rawEmail });
      } else if (seenInBatch.has(email) || existingEmailSet.has(email)) {
        duplicateCount++;
        errors.push({ row: idx + 1, reason: 'Duplicate email address', email });
      } else {
        seenInBatch.add(email);
        validCount++;
      }
    });

    return { totalRows: mapping.rows.length, validCount, duplicateCount, errorCount, errors: errors.slice(0, 100) };
  }

  async confirmImport(organizationId: string, payload: ConfirmImportPayload) {
    const mapping = payload.mapping;
    const importJob = await this.prisma.importJob.create({
      data: {
        organizationId,
        filename: payload.filename,
        status: 'PROCESSING',
        totalRows: payload.rows.length,
        importedCount: 0,
        failedCount: 0,
        duplicateCount: 0,
        detectedMap: JSON.stringify(mapping),
      },
    });

    let targetListId = payload.contactListId;
    if (!targetListId && payload.contactListName) {
      const newList = await this.prisma.contactList.create({
        data: { organizationId, name: payload.contactListName, description: `Created from import: ${payload.filename}` },
      });
      targetListId = newList.id;
    }

    let importedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    const errorDetails: any[] = [];

    const existingContacts = await this.prisma.contact.findMany({ where: { organizationId }, select: { id: true, email: true } });
    const existingMap = new Map<string, string>(existingContacts.map((c) => [c.email.toLowerCase().trim(), c.id]));

    for (let i = 0; i < payload.rows.length; i++) {
      const row = payload.rows[i];
      const rawEmail = row[mapping.emailColumn];
      const email = rawEmail ? rawEmail.toLowerCase().trim() : '';
      if (!email || !email.includes('@')) {
        failedCount++;
        errorDetails.push({ row: i + 1, error: 'Invalid email' });
        continue;
      }

      const firstName = mapping.firstNameColumn ? row[mapping.firstNameColumn] : undefined;
      const lastName = mapping.lastNameColumn ? row[mapping.lastNameColumn] : undefined;
      const fullName = mapping.fullNameColumn ? row[mapping.fullNameColumn] : firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : undefined;
      const company = mapping.companyColumn ? row[mapping.companyColumn] : undefined;
      const phone = mapping.phoneColumn ? row[mapping.phoneColumn] : undefined;
      const target = mapping.targetColumn ? row[mapping.targetColumn] : undefined;

      try {
        let contactId = existingMap.get(email);
        if (!contactId) {
          const contact = await this.prisma.contact.create({
            data: {
              organizationId,
              email,
              firstName: firstName || null,
              lastName: lastName || null,
              fullName: fullName || null,
              company: company || null,
              phone: phone || null,
              target: target || null,
              source: 'import',
              status: 'ACTIVE',
            },
          });
          contactId = contact.id;
          existingMap.set(email, contactId);
          importedCount++;
        } else duplicateCount++;

        if (targetListId && contactId) {
          await this.prisma.contactListMember.upsert({
            where: { contactId_contactListId: { contactId, contactListId: targetListId } },
            create: { contactId, contactListId: targetListId },
            update: {},
          });
        }
      } catch (err: any) {
        failedCount++;
        errorDetails.push({ row: i + 1, email, error: err.message });
      }
    }

    const updatedJob = await this.prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status: failedCount > 0 && importedCount === 0 ? 'FAILED' : 'COMPLETED',
        importedCount,
        failedCount,
        duplicateCount,
        errors: JSON.stringify(errorDetails),
      },
    });

    return { ...updatedJob, targetListId };
  }

  async findAllByOrg(organizationId: string) {
    return this.prisma.importJob.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string, organizationId: string) {
    const job = await this.prisma.importJob.findFirst({ where: { id, organizationId } });
    if (!job) throw new NotFoundException(`Import job ${id} not found`);
    return job;
  }
}
