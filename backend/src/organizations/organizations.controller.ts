import { Controller, Get, Patch, Body, Param, Req, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

function currentOrgId(req: any): string {
  const orgId = req.user?.orgId;
  if (!orgId) throw new UnauthorizedException('Organization context is missing');
  return orgId;
}

@Controller('api/v1/organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  async getMyOrganization(@Req() req: any) {
    return this.organizationsService.findOne(currentOrgId(req));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const orgId = currentOrgId(req);
    if (id !== orgId) throw new ForbiddenException('You cannot access another organization');
    return this.organizationsService.findOne(orgId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; slug?: string }, @Req() req: any) {
    const orgId = currentOrgId(req);
    if (id !== orgId) throw new ForbiddenException('You cannot modify another organization');
    return this.organizationsService.update(orgId, body);
  }
}
