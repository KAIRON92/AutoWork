import { Controller, Get } from '@nestjs/common';
<<<<<<< HEAD
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
=======
import { ApiOperation, ApiTags } from '@nestjs/swagger';
>>>>>>> origin/main
import { JobsService } from '../jobs/jobs.service';

@ApiTags('Admin System Console')
@Controller('admin')
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('health')
<<<<<<< HEAD
  @ApiOperation({ summary: 'Get infrastructure and queue health status' })
=======
  @ApiOperation({ summary: 'Get infrastructure and worker queue health status' })
>>>>>>> origin/main
  async getHealth() {
    const [pcloudShare, campaign, imports] = await Promise.all([
      this.jobsService.pcloudShareQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      this.jobsService.campaignQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      this.jobsService.importQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    ]);

<<<<<<< HEAD
=======
    const activeWorkers = [
      pcloudShare.active > 0,
      campaign.active > 0,
      imports.active > 0,
    ].filter(Boolean).length;

>>>>>>> origin/main
    return {
      status: 'healthy',
      redis: { connected: true },
      bullmq: {
<<<<<<< HEAD
=======
        activeWorkers,
>>>>>>> origin/main
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
