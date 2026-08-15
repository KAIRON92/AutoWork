import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PCloudAccountsService, CreatePCloudAccountDto } from './accounts.service';
import { Roles } from '../../auth/roles.decorator';

function currentOrgId(req: any): string {
  const orgId = req.user?.orgId;
  if (!orgId) throw new UnauthorizedException('Organization context is missing');
  return orgId;
}

@ApiTags('pCloud Accounts')
@ApiBearerAuth()
@Controller('api/v1/pcloud/accounts')
export class PCloudAccountsController {
  constructor(private accountsService: PCloudAccountsService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.accountsService.findAll(currentOrgId(req));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.accountsService.findOne(id, currentOrgId(req));
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Connect a new pCloud account' })
  async create(@Body() dto: CreatePCloudAccountDto, @Request() req: any) {
    return this.accountsService.create(currentOrgId(req), dto);
  }

  @Post(':id/test')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Test connection for a pCloud account' })
  async testConnection(@Param('id') id: string, @Request() req: any) {
    return this.accountsService.testConnection(id, currentOrgId(req));
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Toggle status (ACTIVE / PAUSED) of a pCloud account' })
  async toggleStatus(@Param('id') id: string, @Request() req: any) {
    return this.accountsService.toggleStatus(id, currentOrgId(req));
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a connected pCloud account' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.accountsService.remove(id, currentOrgId(req));
  }
}
