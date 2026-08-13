import { Module } from '@nestjs/common';
import { PCloudAccountsModule } from './accounts/accounts.module';
import { PCloudFilesModule } from './files/files.module';

@Module({
  imports: [PCloudAccountsModule, PCloudFilesModule],
  exports: [PCloudAccountsModule, PCloudFilesModule],
})
export class PCloudModule {}
