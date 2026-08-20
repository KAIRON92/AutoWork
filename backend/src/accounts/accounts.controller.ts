import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { Roles } from '../auth/roles.decorator';

function currentOrgId(req: any): string {
  const orgId = req.user?.orgId;
  if (!orgId) throw new UnauthorizedException('Organization context is missing');
  return orgId;
}

@ApiTags('Email Accounts (Legacy)')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all connected sending accounts' })
  findAll(@Req() req: any) {
    currentOrgId(req); // enforce authentication
    return this.accountsService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Connect new sending account' })
  create(@Body() body: { name: string; email: string; provider: string; dailyLimit?: number }, @Req() req: any) {
    currentOrgId(req); // enforce authentication
    return this.accountsService.create(body);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Toggle account active/paused status' })
  toggleStatus(@Param('id') id: string, @Req() req: any) {
    currentOrgId(req); // enforce authentication
    return this.accountsService.toggleStatus(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Disconnect sending account' })
  remove(@Param('id') id: string, @Req() req: any) {
    currentOrgId(req); // enforce authentication
    return this.accountsService.remove(id);
  }
}
