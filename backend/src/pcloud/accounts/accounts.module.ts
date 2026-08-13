import { Module } from '@nestjs/common';
import { PCloudAccountsController } from './accounts.controller';
import { PCloudAccountsService } from './accounts.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PCloudAccountsController],
  providers: [PCloudAccountsService],
  exports: [PCloudAccountsService],
})
export class PCloudAccountsModule {}
