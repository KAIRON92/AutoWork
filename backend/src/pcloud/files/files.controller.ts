import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PCloudFilesService } from './files.service';

@ApiTags('pCloud Files')
@ApiBearerAuth()
@Controller('api/v1/pcloud/files')
export class PCloudFilesController {
  constructor(private filesService: PCloudFilesService) {}

  @Get('browse')
  @ApiOperation({ summary: 'Browse folders & files directly from connected pCloud account' })
  async browse(
    @Query('accountId') accountId: string,
    @Query('folderId') folderId: string = '0',
    @Request() req: any
  ) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.filesService.listFolder(orgId, accountId, folderId);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered pCloud files for current tenant' })
  async findAll(@Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.filesService.findAllStoredFiles(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single pCloud file metadata' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.filesService.findOneStoredFile(id, orgId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document directly to pCloud and register it' })
  async upload(
    @UploadedFile() file: any,
    @Body('accountId') accountId: string,
    @Body('folderId') folderId: string,
    @Request() req: any
  ) {
    const orgId = req.user?.orgId || 'org-101';
    const fileObj = file || {
      originalname: 'Document.pdf',
      buffer: Buffer.from('PDF Content Placeholder'),
      mimetype: 'application/pdf',
      size: 1024,
    };
    return await this.filesService.uploadAndRegister(orgId, fileObj, accountId, folderId);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register an existing pCloud file reference for use in campaigns' })
  async registerExisting(
    @Body() dto: { name: string; fileId: string; folderId?: string; fileSize?: number; mimeType?: string; pcloudAccountId?: string; pcloudPath?: string },
    @Request() req: any
  ) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.filesService.registerExistingPCloudFile(orgId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a registered pCloud file record' })
  async remove(@Param('id') id: string, @Request() req: any) {
    const orgId = req.user?.orgId || 'org-101';
    return await this.filesService.removeStoredFile(id, orgId);
  }
}
