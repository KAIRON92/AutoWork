import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

@ApiTags('Health')
@Controller('api')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'System Health Check for API, Database, Redis, and Worker subsystems' })
  async checkHealth() {
    let dbStatus = 'HEALTHY';
    try {
      if (this.prisma.isConnected) {
        await this.prisma.$queryRaw`SELECT 1`;
      } else {
        dbStatus = 'UNAVAILABLE';
      }
    } catch {
      dbStatus = 'UNAVAILABLE';
    }

    let redisStatus = 'HEALTHY';
    try {
      await Promise.all([
        this.jobsService.pcloudShareQueue.getJobCounts(),
        this.jobsService.campaignQueue.getJobCounts(),
        this.jobsService.importQueue.getJobCounts(),
        this.jobsService.emailDispatchQueue.getJobCounts(),
      ]);
    } catch {
      redisStatus = 'UNAVAILABLE';
    }

    let pcloudWorkerStatus = 'OFFLINE';
    let campaignWorkerStatus = 'OFFLINE';
    let emailWorkerStatus = 'OFFLINE';

    if (redisStatus === 'HEALTHY') {
      try {
        const [pcloudWorkers, campaignWorkers, emailWorkers] = await Promise.all([
          this.jobsService.pcloudShareQueue.getWorkers(),
          this.jobsService.campaignQueue.getWorkers(),
          this.jobsService.emailDispatchQueue.getWorkers(),
        ]);
        pcloudWorkerStatus = pcloudWorkers.length > 0 ? 'LISTENING' : 'OFFLINE';
        campaignWorkerStatus = campaignWorkers.length > 0 ? 'LISTENING' : 'OFFLINE';
        emailWorkerStatus = emailWorkers.length > 0 ? 'LISTENING' : 'OFFLINE';
      } catch {
        pcloudWorkerStatus = 'UNKNOWN';
        campaignWorkerStatus = 'UNKNOWN';
        emailWorkerStatus = 'UNKNOWN';
      }
    }

    const status = dbStatus === 'HEALTHY' && redisStatus === 'HEALTHY' ? 'OK' : 'DEGRADED';

    return {
      status,
      timestamp: new Date().toISOString(),
      subsystems: {
        api: 'HEALTHY',
        database: dbStatus,
        redisQueue: redisStatus,
        pcloudWorker: pcloudWorkerStatus,
        campaignWorker: campaignWorkerStatus,
        emailWorker: emailWorkerStatus,
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  }
}
