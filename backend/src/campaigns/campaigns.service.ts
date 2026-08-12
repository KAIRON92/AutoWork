import { Injectable, Optional } from '@nestjs/common';
import { EmailAdapterFactory } from '../../../automation-modules/email/email.factory';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class CampaignsService {
  constructor(@Optional() private jobsService?: JobsService) {}

  private campaigns = [
    {
      id: 'cmp-1',
      name: 'Q3 Enterprise Outreach Campaign',
      status: 'PROCESSING',
      templateId: 'tpl-1',
      templateName: 'Executive Introduction',
      accountIds: ['acc-1', 'acc-2'],
      totalCount: 50,
      sentCount: 38,
      failedCount: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cmp-2',
      name: 'SaaS Founders Nurture Sequence',
      status: 'COMPLETED',
      templateId: 'tpl-1',
      templateName: 'Executive Introduction',
      accountIds: ['acc-1'],
      totalCount: 42,
      sentCount: 42,
      failedCount: 0,
      createdAt: new Date().toISOString(),
    },
  ];

  async findAll() {
    return this.campaigns;
  }

  async findOne(id: string) {
    return this.campaigns.find((c) => c.id === id);
  }

  async create(data: { name: string; templateId: string; accountIds: string[]; contactListIds?: string[]; attachmentIds?: string[] }) {
    const newCamp = {
      id: `cmp-${Date.now()}`,
      name: data.name,
      status: 'DRAFT',
      templateId: data.templateId,
      templateName: 'Executive Introduction',
      accountIds: data.accountIds,
      totalCount: 10,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.campaigns.unshift(newCamp);
    return newCamp;
  }

  async launch(id: string) {
    const camp = this.campaigns.find((c) => c.id === id);
    if (camp) {
      camp.status = 'PROCESSING';

      if (this.jobsService) {
        await this.jobsService.enqueueCampaignJob({ campaignId: camp.id, accountIds: camp.accountIds });
      }
      
      // Background Queue Dispatch Simulation via FakeEmailAdapter
      this.simulateWorkerSending(camp);
      return camp;
    }
    throw new Error('Campaign not found');
  }

  async pause(id: string) {
    const camp = this.campaigns.find((c) => c.id === id);
    if (camp) {
      camp.status = 'PAUSED';
      return camp;
    }
    throw new Error('Campaign not found');
  }

  private async simulateWorkerSending(campaign: any) {
    const adapter = EmailAdapterFactory.getAdapter(process.env.EMAIL_PROVIDER_ACTIVE || 'fake');

    for (let i = campaign.sentCount; i < campaign.totalCount; i++) {
      if (campaign.status !== 'PROCESSING') break;

      const accountId = campaign.accountIds[i % campaign.accountIds.length];
      const result = await adapter.sendEmail({
        to: { email: `recipient_${i + 1}@prospect.io`, name: `Prospect ${i + 1}` },
        subject: `Quick inquiry regarding prospect organization (${i})`,
        body: `Hi Prospect,\n\nThis is an automated test dispatch.`,
        campaignId: campaign.id,
      });

      if (result.success) {
        campaign.sentCount += 1;
      } else {
        campaign.failedCount += 1;
      }

      if (campaign.sentCount + campaign.failedCount >= campaign.totalCount) {
        campaign.status = 'COMPLETED';
      }
    }
  }
}
