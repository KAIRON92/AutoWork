import { Controller, Get, Patch, Body, Param, Req } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

@Controller('api/v1/organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  async getMyOrganization(@Req() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return this.organizationsService.findOne(orgId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; slug?: string }) {
    return this.organizationsService.update(id, body);
  }
}
