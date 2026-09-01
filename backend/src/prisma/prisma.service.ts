import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected: boolean = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to PostgreSQL Database');
    } catch (err: any) {
      this.isConnected = false;
      const message = err?.message || 'Unknown PostgreSQL connection error';
      this.logger.error(`PostgreSQL connection failed: ${message}`);
      this.logger.error(
        'Authentication/login will not work until DATABASE_URL points to a reachable PostgreSQL instance with valid credentials. Run the local database repair/setup script or fix backend/.env.',
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {}
  }
}
