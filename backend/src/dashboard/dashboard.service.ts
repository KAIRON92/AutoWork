import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(organizationId: string) {
    const [
      totalContacts,
      connectedAccounts,
      availableFiles,
      activeCampaigns,
      completedCampaigns,
      executions,
      recentCampaigns,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { organizationId } }),
      this.prisma.pCloudAccount.count({ where: { organizationId, status: 'ACTIVE' } }),
      this.prisma.pCloudFile.count({ where: { organizationId } }),
      this.prisma.campaign.count({ where: { organizationId, status: 'PROCESSING' } }),
      this.prisma.campaign.count({ where: { organizationId, status: 'COMPLETED' } }),
      this.prisma.pCloudShareExecution.findMany({
        where: { organizationId },
        select: { status: true },
      }),
      this.prisma.campaign.findMany({
        where: { organizationId },
        include: {
          pcloudAccount: { select: { name: true, accountEmail: true } },
          pcloudFile: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const totalJobs = executions.length;
    const successfulJobs = executions.filter((e) => e.status === 'SUCCESS').length;
    const failedJobs = executions.filter((e) => e.status === 'FAILED').length;

    return {
      totalContacts,
      connectedPCloudAccounts: connectedAccounts,
      availableFiles,
      activeCampaigns,
      completedCampaigns,
      totalShareTransferJobs: totalJobs,
      successfulJobs,
      failedJobs,
      successRate: totalJobs > 0 ? ((successfulJobs / totalJobs) * 100).toFixed(1) : '100.0',
      recentCampaigns,
    };
  }
}
