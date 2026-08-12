import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    const userId = req.user?.sub || 'usr-1';
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  async updateProfile(@Req() req: any, @Body() body: { firstName?: string; lastName?: string; email?: string }) {
    const userId = req.user?.sub || 'usr-1';
    return this.usersService.updateProfile(userId, body);
  }

  @Get()
  async findAll(@Req() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return this.usersService.findAllByOrg(orgId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return this.usersService.findOne(id, orgId);
  }

  @Post()
  async create(@Req() req: any, @Body() body: { email: string; firstName: string; lastName: string; roleId?: string }) {
    const orgId = req.user?.orgId || 'org-101';
    return this.usersService.create(orgId, body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Req() req: any, @Body() body: { firstName?: string; lastName?: string; email?: string; roleId?: string }) {
    const orgId = req.user?.orgId || 'org-101';
    return this.usersService.update(id, orgId, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return this.usersService.remove(id, orgId);
  }
}
