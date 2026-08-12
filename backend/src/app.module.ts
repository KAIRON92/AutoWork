import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from './config/config.module';
import { JobsModule } from './jobs/jobs.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AccountsModule } from './accounts/accounts.module';
import { ContactsModule } from './contacts/contacts.module';
import { ImportsModule } from './imports/imports.module';
import { TemplatesModule } from './templates/templates.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AutomationsModule } from './automations/automations.module';
import { StorageModule } from './storage/storage.module';
import { LogsModule } from './logs/logs.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule,
    JobsModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AccountsModule,
    ContactsModule,
    ImportsModule,
    TemplatesModule,
    CampaignsModule,
    AutomationsModule,
    StorageModule,
    LogsModule,
    AdminModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
