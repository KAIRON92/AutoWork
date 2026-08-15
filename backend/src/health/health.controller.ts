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
      ]);
    } catch {
      redisStatus = 'UNAVAILABLE';
    }

    const status = dbStatus === 'HEALTHY' && redisStatus === 'HEALTHY' ? 'OK' : 'DEGRADED';

    return {
      status,
      timestamp: new Date().toISOString(),
      subsystems: {
        api: 'HEALTHY',
        database: dbStatus,
        redisQueue: redisStatus,
        // A true worker heartbeat requires a separate heartbeat/lease mechanism.
        // Keep this honest until that mechanism is implemented.
        pcloudWorker: 'UNKNOWN',
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  }
}
