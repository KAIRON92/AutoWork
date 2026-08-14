import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('api')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'System Health Check for API, Database, Redis, and Worker subsystems' })
  async checkHealth() {
    let dbStatus = 'HEALTHY';
    try {
      if (this.prisma.isConnected) {
        await this.prisma.$queryRaw`SELECT 1`;
      }
    } catch {
      dbStatus = 'UNAVAILABLE';
    }

    return {
      status: dbStatus === 'HEALTHY' ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      subsystems: {
        api: 'HEALTHY',
        database: dbStatus,
        redisQueue: 'UNKNOWN',
        pcloudWorker: 'UNKNOWN',
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  }
}
