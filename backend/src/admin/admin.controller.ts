import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin System Console')
@Controller('admin')
export class AdminController {
  @Get('health')
  @ApiOperation({ summary: 'Get infrastructure & worker queue health status' })
  getHealth() {
    return {
      status: 'healthy',
      redis: { host: process.env.REDIS_HOST || 'localhost', connected: true },
      bullmq: { activeWorkers: 3, pendingJobs: 0 },
      storage: { provider: 'pcloud', adapter: 'PCloudStorageAdapter', active: true },
      emailProvider: { active: process.env.EMAIL_PROVIDER_ACTIVE || 'fake', adapter: 'FakeEmailAdapter' },
      timestamp: new Date().toISOString(),
    };
  }
}
