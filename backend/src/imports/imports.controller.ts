import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImportsService, ParseImportPayload, ColumnMappingPayload, ConfirmImportPayload } from './imports.service';

function currentOrgId(req: any): string {
  const orgId = req.user?.orgId;
  if (!orgId) throw new UnauthorizedException('Organization context is missing');
  return orgId;
}

@ApiTags('Imports')
@ApiBearerAuth()
@Controller('api/v1/imports')
export class ImportsController {
  constructor(private importsService: ImportsService) {}

  @Get()
  @ApiOperation({ summary: 'List all import jobs for current tenant' })
  async findAll(@Request() req: any) {
    return this.importsService.findAllByOrg(currentOrgId(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single import job status' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.importsService.findOne(id, currentOrgId(req));
  }

  @Post('parse')
  @ApiOperation({ summary: 'Parse uploaded CSV/TXT file and auto-detect columns' })
  async parseFile(@Body() payload: ParseImportPayload) {
    return this.importsService.parseFile(payload);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate mapped columns against rows, checking format and duplicates' })
  async validateMapping(@Body() mapping: ColumnMappingPayload, @Request() req: any) {
    return this.importsService.validateMapping(currentOrgId(req), mapping);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm import and create contacts and optional contact list' })
  async confirmImport(@Body() payload: ConfirmImportPayload, @Request() req: any) {
    return this.importsService.confirmImport(currentOrgId(req), payload);
  }
}
