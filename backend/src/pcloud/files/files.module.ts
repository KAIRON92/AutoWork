import { Module } from '@nestjs/common';
import { PCloudFilesController } from './files.controller';
import { PCloudFilesService } from './files.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PCloudAccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [PrismaModule, PCloudAccountsModule],
  controllers: [PCloudFilesController],
  providers: [PCloudFilesService],
  exports: [PCloudFilesService],
})
export class PCloudFilesModule {}
