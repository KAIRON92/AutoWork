import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UnauthorizedException } from '@nestjs/common';
import { AutomationsService, CreateAutomationPayload } from './automations.service';
import { Roles } from '../auth/roles.decorator';

function currentOrgId(req: any): string {
  const orgId = req.user?.orgId;
  if (!orgId) throw new UnauthorizedException('Organization context is missing');
  return orgId;
}

@Controller('api/v1/automations')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.automationsService.findAllByOrg(currentOrgId(req));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.automationsService.findOne(id, currentOrgId(req));
  }

  @Post()
  @Roles('ADMIN', 'MEMBER')
  async create(@Req() req: any, @Body() payload: CreateAutomationPayload) {
    return this.automationsService.create(currentOrgId(req), payload);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MEMBER')
  async update(@Param('id') id: string, @Req() req: any, @Body() payload: Partial<CreateAutomationPayload>) {
    return this.automationsService.update(id, currentOrgId(req), payload);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.automationsService.remove(id, currentOrgId(req));
  }
}
