import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';

@ApiTags('Templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  findAll() {
    return this.templatesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create new template' })
  create(@Body() body: { name: string; subject: string; body: string }) {
    return this.templatesService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update existing template' })
  update(@Param('id') id: string, @Body() body: Partial<{ name: string; subject: string; body: string }>) {
    return this.templatesService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }
}
