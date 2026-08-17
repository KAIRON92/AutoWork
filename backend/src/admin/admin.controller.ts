import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { JobsService } from '../jobs/jobs.service';

@ApiTags('Admin System Console')
@Controller('admin')
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get infrastructure and worker queue health status' })
  async getHealth() {
    const [pcloudShare, campaign, imports] = await Promise.all([
      this.jobsService.pcloudShareQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      this.jobsService.campaignQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      this.jobsService.importQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    ]);

    const activeWorkers = [
      pcloudShare.active > 0,
      campaign.active > 0,
      imports.active > 0,
    ].filter(Boolean).length;

    return {
      status: 'healthy',
      redis: { connected: true },
      bullmq: {
        activeWorkers,
        queues: {
          pcloudShare,
          campaign,
          imports,
        },
      },
      storage: { provider: 'pcloud', status: 'production' },
      emailProvider: {
        status: 'not_configured',
        message: 'Transactional email delivery is not configured for this environment.',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
