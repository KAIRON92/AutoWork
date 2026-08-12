import { Module } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ImportsController],
  providers: [ImportsService, PrismaService],
  exports: [ImportsService],
})
export class ImportsModule {}
