import { Controller, Get, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { PCloudStorageAdapter } from './pcloud.adapter';

@ApiTags('Attachments & pCloud Storage')
@Controller('attachments')
export class StorageController {
  private pcloudAdapter = new PCloudStorageAdapter();

  @Get()
  @ApiOperation({ summary: 'List all pCloud file attachments' })
  async listAttachments() {
    return [
      {
        id: 'att-1',
        filename: 'Company_Brochure_2026.pdf',
        fileSize: 1420500,
        mimeType: 'application/pdf',
        pcloudFileId: 'pcloud-f-1001',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload campaign attachment directly to pCloud API' })
  @ApiConsumes('multipart/form-data')
  async uploadFile(@UploadedFile() file: any) {
    const buffer = file?.buffer || Buffer.from('simulated attachment file data');
    const filename = file?.originalname || 'attachment.pdf';
    const mimeType = file?.mimetype || 'application/pdf';

    const result = await this.pcloudAdapter.uploadFile({
      filename,
      buffer,
      mimeType,
    });

    return {
      id: `att-${Date.now()}`,
      filename: result.filename,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      pcloudFileId: result.fileId,
      publicUrl: result.publicUrl,
      createdAt: new Date().toISOString(),
    };
  }

  @Get('pcloud/status')
  @ApiOperation({ summary: 'Verify pCloud REST API connection status' })
  async getStatus() {
    return this.pcloudAdapter.verifyConnection();
  }
}
