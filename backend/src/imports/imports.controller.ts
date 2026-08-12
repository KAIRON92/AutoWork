import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ImportsService, ParseImportPayload, ColumnMappingPayload } from './imports.service';

@Controller('api/v1/imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('upload')
  async uploadFile(@Body() payload: ParseImportPayload) {
    return this.importsService.parseFile(payload);
  }

  @Post('preview')
  async previewMapping(@Body() payload: ColumnMappingPayload) {
    return this.importsService.validateMapping(payload);
  }

  @Post('confirm')
  async confirmImport(
    @Req() req: any,
    @Body() payload: { filename: string; rows: Record<string, string>[]; columnMap: Record<string, string>; listId?: string }
  ) {
    const orgId = req.user?.orgId || 'org-101';
    return this.importsService.confirmImport(orgId, payload);
  }

  @Get()
  async findAll(@Req() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return this.importsService.findAllByOrg(orgId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return this.importsService.findOne(id, orgId);
  }
}
