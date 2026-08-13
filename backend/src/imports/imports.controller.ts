import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImportsService, ParseImportPayload, ColumnMappingPayload, ConfirmImportPayload } from './imports.service';

@ApiTags('Imports')
@ApiBearerAuth()
@Controller('api/v1/imports')
export class ImportsController {
  constructor(private importsService: ImportsService) {}

  @Get()
  @ApiOperation({ summary: 'List all import jobs for current tenant' })
  async findAll(@Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.importsService.findAllByOrg(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single import job status' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.importsService.findOne(id, orgId);
  }

  @Post('parse')
  @ApiOperation({ summary: 'Parse uploaded CSV/TXT file and auto-detect columns' })
  async parseFile(@Body() payload: ParseImportPayload) {
    return await this.importsService.parseFile(payload);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate mapped columns against rows, checking format and duplicates' })
  async validateMapping(@Body() mapping: ColumnMappingPayload, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.importsService.validateMapping(orgId, mapping);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm import and create contacts and optional contact list' })
  async confirmImport(@Body() payload: ConfirmImportPayload, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.importsService.confirmImport(orgId, payload);
  }
}
