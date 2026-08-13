import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService, CreateCampaignDto } from './campaigns.service';

@ApiTags('Campaigns')
@ApiBearerAuth()
@Controller('api/v1/campaigns')
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List all pCloud share campaigns for current tenant' })
  async findAll(@Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.campaignsService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details, recipient progress, and execution logs' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.campaignsService.findOne(id, orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new 8-step configured pCloud share campaign' })
  async create(@Body() dto: CreateCampaignDto, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.campaignsService.create(orgId, dto);
  }

  @Post(':id/launch')
  @ApiOperation({ summary: 'Launch campaign and begin pCloud share/transfer execution' })
  async launch(@Param('id') id: string, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.campaignsService.launch(id, orgId);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause campaign execution' })
  async pause(@Param('id') id: string, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.campaignsService.pause(id, orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign' })
  async remove(@Param('id') id: string, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.campaignsService.remove(id, orgId);
  }
}
