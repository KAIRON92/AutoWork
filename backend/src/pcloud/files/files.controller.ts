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
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PCloudFilesService } from './files.service';
import { Roles } from '../../auth/roles.decorator';

function currentOrgId(req: any): string {
  const orgId = req.user?.orgId;
  if (!orgId) throw new UnauthorizedException('Organization context is missing');
  return orgId;
}

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
    @Request() req: any,
  ) {
    if (!accountId) throw new BadRequestException('accountId is required');
    return this.filesService.listFolder(currentOrgId(req), accountId, folderId);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered pCloud files for current tenant' })
  async findAll(@Request() req: any) {
    return this.filesService.findAllStoredFiles(currentOrgId(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single pCloud file metadata' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.filesService.findOneStoredFile(id, currentOrgId(req));
  }

  @Post('upload')
  @Roles('ADMIN', 'MEMBER')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document directly to pCloud and register it' })
  async upload(
    @UploadedFile() file: any,
    @Body('accountId') accountId: string,
    @Body('folderId') folderId: string,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('A file is required');
    return this.filesService.uploadAndRegister(currentOrgId(req), file, accountId, folderId);
  }

  @Post('register')
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Register an existing pCloud file reference for use in campaigns' })
  async registerExisting(
    @Body() dto: { name: string; fileId: string; folderId?: string; fileSize?: number; mimeType?: string; pcloudAccountId?: string; pcloudPath?: string },
    @Request() req: any,
  ) {
    return this.filesService.registerExistingPCloudFile(currentOrgId(req), dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a registered pCloud file record' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.filesService.removeStoredFile(id, currentOrgId(req));
  }
}
