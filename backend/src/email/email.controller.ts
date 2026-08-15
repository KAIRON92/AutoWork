import { BadRequestException, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { EmailService } from './email.service';

function context(req: any): { orgId: string; userId: string } {
  const orgId = req.user?.orgId;
  const userId = req.user?.sub;
  if (!orgId || !userId) throw new BadRequestException('Authenticated organization context is required');
  return { orgId, userId };
}

@ApiTags('Email Accounts')
@ApiBearerAuth()
@Controller('api/v1/email/accounts')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  @ApiOperation({ summary: 'List authenticated sender accounts for current tenant' })
  async list(@Req() req: any) {
    return this.emailService.list(context(req).orgId);
  }

  @Get('gmail/oauth-url')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create an official Gmail OAuth authorization URL' })
  async gmailOAuthUrl(@Req() req: any) {
    const { orgId, userId } = context(req);
    return this.emailService.gmailAuthUrl(orgId, userId);
  }

  @Get('gmail/callback')
  @ApiOperation({ summary: 'Complete the Gmail OAuth callback and verify the mailbox' })
  async gmailCallback(@Query('code') code: string, @Query('state') state: string) {
    return this.emailService.gmailCallback(code, state);
  }

  @Post(':id/test')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Send one controlled test email using a verified sender account' })
  async test(@Param('id') id: string, @Req() req: any) {
    const { orgId } = context(req);
    const to = String(req.body?.to || '').trim();
    const subject = String(req.body?.subject || 'AutoWork sender verification').trim();
    const body = String(req.body?.body || 'AutoWork controlled sender verification message.').trim();
    if (!to || !to.includes('@')) throw new BadRequestException('A valid test recipient email is required');
    const account = (await this.emailService.list(orgId)).find((item: any) => item.id === id);
    if (!account) throw new BadRequestException('Sender account not found');
    if (account.provider !== 'gmail') throw new BadRequestException(`Controlled test is not implemented for provider ${account.provider}`);
    return this.emailService.sendGmail(id, orgId, { to, subject, body });
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove AutoWork sender account and encrypted provider credentials' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.emailService.remove(id, context(req).orgId);
  }
}
