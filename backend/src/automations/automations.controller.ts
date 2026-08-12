import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { AutomationsService, CreateAutomationPayload } from './automations.service';

@Controller('api/v1/automations')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  async findAll(@Req() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return this.automationsService.findAllByOrg(orgId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return this.automationsService.findOne(id, orgId);
  }

  @Post()
  async create(@Req() req: any, @Body() payload: CreateAutomationPayload) {
    const orgId = req.user?.orgId || 'org-101';
    return this.automationsService.create(orgId, payload);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Req() req: any, @Body() payload: Partial<CreateAutomationPayload>) {
    const orgId = req.user?.orgId || 'org-101';
    return this.automationsService.update(id, orgId, payload);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return this.automationsService.remove(id, orgId);
  }
}
