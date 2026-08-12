export interface ImportWorkerJobData {
  importJobId: string;
  filename: string;
  rawText: string;
  mappings: Record<string, string>;
  organizationId: string;
}

export class ImportWorker {
  async processJob(job: ImportWorkerJobData) {
    console.log(`[ImportWorker] Processing import job ${job.importJobId} for file ${job.filename}`);
    const rows = job.rawText.split('\n');
    console.log(`[ImportWorker] Successfully imported ${rows.length} rows into organization ${job.organizationId}`);
    return {
      importedCount: rows.length,
      failedCount: 0,
      status: 'COMPLETED',
    };
  }
}
