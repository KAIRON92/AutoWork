import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';

function currentUserId(req: any): string {
  const userId = req.user?.sub;
  if (!userId) throw new UnauthorizedException('User context is missing');
  return userId;
}

function currentOrgId(req: any): string {
  const orgId = req.user?.orgId;
  if (!orgId) throw new UnauthorizedException('Organization context is missing');
  return orgId;
}

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(currentUserId(req));
  }

  @Patch('me')
  async updateProfile(@Req() req: any, @Body() body: { firstName?: string; lastName?: string; email?: string }) {
    return this.usersService.updateProfile(currentUserId(req), body);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.usersService.findAllByOrg(currentOrgId(req));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.usersService.findOne(id, currentOrgId(req));
  }

  @Post()
  async create(@Req() req: any, @Body() body: { email: string; firstName: string; lastName: string; roleId?: string }) {
    return this.usersService.create(currentOrgId(req), body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Req() req: any, @Body() body: { firstName?: string; lastName?: string; email?: string; roleId?: string }) {
    return this.usersService.update(id, currentOrgId(req), body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.usersService.remove(id, currentOrgId(req));
  }
}
