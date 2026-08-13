import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PCloudAccountsService, CreatePCloudAccountDto } from './accounts.service';

@ApiTags('pCloud Accounts')
@ApiBearerAuth()
@Controller('api/v1/pcloud/accounts')
export class PCloudAccountsController {
  constructor(private accountsService: PCloudAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List all connected pCloud accounts for current tenant' })
  async findAll(@Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.accountsService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single pCloud account details' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.accountsService.findOne(id, orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Connect a new pCloud account' })
  async create(@Body() dto: CreatePCloudAccountDto, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.accountsService.create(orgId, dto);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test connection for a pCloud account' })
  async testConnection(@Param('id') id: string, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.accountsService.testConnection(id, orgId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Toggle status (ACTIVE / PAUSED) of a pCloud account' })
  async toggleStatus(@Param('id') id: string, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.accountsService.toggleStatus(id, orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a connected pCloud account' })
  async remove(@Param('id') id: string, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.accountsService.remove(id, orgId);
  }
}
