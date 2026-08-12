import { Module } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AutomationsController],
  providers: [AutomationsService, PrismaService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
