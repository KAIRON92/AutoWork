import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';

@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all campaigns' })
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details by ID' })
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new campaign wizard draft' })
  create(@Body() body: { name: string; templateId: string; accountIds: string[]; contactListIds?: string[]; attachmentIds?: string[] }) {
    return this.campaignsService.create(body);
  }

  @Post(':id/launch')
  @ApiOperation({ summary: 'Launch campaign background workers' })
  launch(@Param('id') id: string) {
    return this.campaignsService.launch(id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause running campaign queue' })
  pause(@Param('id') id: string) {
    return this.campaignsService.pause(id);
  }
}
