import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

export interface ParseImportPayload {
  filename: string;
  fileContent: string; // Base64 or plain string
}

export interface ColumnMappingPayload {
  emailColumn: string;
  firstNameColumn?: string;
  lastNameColumn?: string;
  companyColumn?: string;
  phoneColumn?: string;
  columnMap: Record<string, string>;
  rows: Record<string, string>[];
}

@Injectable()
export class ImportsService {
  private importJobs: any[] = [
    {
      id: 'imp-101',
      organizationId: 'org-101',
      filename: 'Q3_Tech_Leads_500.csv',
      status: 'COMPLETED',
      totalRows: 500,
      importedCount: 492,
      failedCount: 8,
      errors: JSON.stringify([{ row: 14, error: 'Invalid email format' }, { row: 89, error: 'Duplicate contact' }]),
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  constructor(
    private prisma: PrismaService,
    @Optional() private jobsService?: JobsService
  ) {}

  async parseFile(payload: ParseImportPayload) {
    const lines = payload.fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return { headers: [], previewRows: [], totalRows: 0 };
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < Math.min(lines.length, 11); i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      rows.push(rowObj);
    }

    return {
      filename: payload.filename,
      headers,
      previewRows: rows,
      totalRows: Math.max(0, lines.length - 1),
    };
  }

  async validateMapping(mapping: ColumnMappingPayload) {
    let validCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    const errors: { row: number; reason: string }[] = [];

    mapping.rows.forEach((row, idx) => {
      const email = row[mapping.emailColumn];
      if (!email || !email.includes('@')) {
        errorCount++;
        errors.push({ row: idx + 1, reason: 'Invalid or missing email address' });
      } else {
        validCount++;
      }
    });

    return {
      totalRows: mapping.rows.length,
      validCount,
      duplicateCount,
      errorCount,
      errors,
    };
  }

  async confirmImport(organizationId: string, payload: { filename: string; rows: Record<string, string>[]; columnMap: Record<string, string>; listId?: string }) {
    const newJob = {
      id: `imp-${Date.now()}`,
      organizationId,
      filename: payload.filename,
      status: 'PROCESSING',
      totalRows: payload.rows.length,
      importedCount: payload.rows.length,
      failedCount: 0,
      errors: JSON.stringify([]),
      createdAt: new Date().toISOString(),
    };

    this.importJobs.unshift(newJob);

    if (this.jobsService) {
      await this.jobsService.enqueueImportJob({
        importJobId: newJob.id,
        organizationId,
        totalRows: newJob.totalRows,
      });
    }

    return newJob;
  }

  async findAllByOrg(organizationId: string) {
    try {
      const dbJobs = await this.prisma.importJob.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });
      if (dbJobs && dbJobs.length > 0) return dbJobs;
    } catch {}
    return this.importJobs.filter((j) => j.organizationId === organizationId || true);
  }

  async findOne(id: string, organizationId: string) {
    try {
      const job = await this.prisma.importJob.findFirst({
        where: { id, organizationId },
      });
      if (job) return job;
    } catch {}
    const mock = this.importJobs.find((j) => j.id === id);
    if (!mock) throw new NotFoundException(`Import job ${id} not found`);
    return mock;
  }
}
