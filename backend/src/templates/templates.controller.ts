import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TemplatesService, CreateTemplateDto, PreviewTemplateDto } from './templates.service';
import { Roles } from '../auth/roles.decorator';

function currentOrgId(req: any): string {
  const orgId = req.user?.orgId;
  if (!orgId) throw new UnauthorizedException('Organization context is missing');
  return orgId;
}

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('api/v1/templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all description templates for current tenant' })
  async findAll(@Request() req: any) {
    return this.templatesService.findAll(currentOrgId(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single description template' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.findOne(id, currentOrgId(req));
  }

  @Post()
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Create new description template' })
  async create(@Body() dto: CreateTemplateDto, @Request() req: any) {
    return this.templatesService.create(currentOrgId(req), dto);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Live preview of a template with sample recipient and #RANDOM# code generation' })
  preview(@Body() dto: PreviewTemplateDto) {
    return this.templatesService.preview(dto);
  }

  @Post(':id/duplicate')
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Duplicate an existing template' })
  async duplicate(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.duplicate(id, currentOrgId(req));
  }

  @Put(':id')
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Update an existing template' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>, @Request() req: any) {
    return this.templatesService.update(id, currentOrgId(req), dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a template' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.remove(id, currentOrgId(req));
  }
}
