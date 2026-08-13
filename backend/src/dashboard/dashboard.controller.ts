import { Controller, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get aggregated dashboard metrics for contacts, pCloud accounts, files, campaigns, and jobs' })
  async getMetrics(@Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.dashboardService.getMetrics(orgId);
  }
}
