import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { decryptProviderCredentials, encryptProviderCredentials } from './email.credentials';

interface OAuthState { orgId: string; userId: string; nonce: string; exp: number }

@Injectable()
export class EmailService {
  constructor(private readonly prisma: PrismaService) {}

  private secret() {
    const value = process.env.JWT_SECRET;
    if (!value) throw new Error('JWT_SECRET is required for OAuth state signing');
    return value;
  }

  private encodeState(state: OAuthState) {
    const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
    const sig = createHmac('sha256', this.secret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  private decodeState(value: string): OAuthState {
    const [payload, sig] = value.split('.');
    if (!payload || !sig) throw new BadRequestException('Invalid OAuth state');
    const expected = createHmac('sha256', this.secret()).update(payload).digest('base64url');
    if (sig.length !== expected.length || !Buffer.from(sig).equals(Buffer.from(expected))) throw new BadRequestException('Invalid OAuth state');
    const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;
    if (state.exp < Date.now()) throw new BadRequestException('OAuth state expired');
    return state;
  }

  private gmailConfigured() {
    return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REDIRECT_URI);
  }

  async list(organizationId: string) {
    const accounts = await this.prisma.emailAccount.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return accounts.map(({ credentials, ...safe }) => ({ ...safe, hasCredentials: Boolean(credentials) }));
  }

  async remove(id: string, organizationId: string) {
    const account = await this.prisma.emailAccount.findFirst({ where: { id, organizationId } });
    if (!account) throw new NotFoundException('Email account not found');
    await this.prisma.emailAccount.delete({ where: { id } });
    return { success: true };
  }

  async gmailAuthUrl(organizationId: string, userId: string) {
    if (!this.gmailConfigured()) throw new BadRequestException('Gmail OAuth is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REDIRECT_URI.');
    const state = this.encodeState({ orgId: organizationId, userId, nonce: randomBytes(16).toString('hex'), exp: Date.now() + 10 * 60 * 1000 });
    const params = new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      redirect_uri: process.env.GMAIL_REDIRECT_URI!,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
      state,
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  }

  async gmailCallback(code: string, stateValue: string) {
    if (!this.gmailConfigured()) throw new BadRequestException('Gmail OAuth is not configured');
    if (!code) throw new BadRequestException('Missing OAuth code');
    const state = this.decodeState(stateValue);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        redirect_uri: process.env.GMAIL_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) throw new BadRequestException('Gmail OAuth token exchange failed');

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.email) throw new BadRequestException('Unable to verify Gmail mailbox identity');

    const existing = await this.prisma.emailAccount.findFirst({ where: { organizationId: state.orgId, accountEmail: String(profile.email).toLowerCase(), provider: 'gmail' } });
    const encrypted = encryptProviderCredentials(JSON.stringify({
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000,
      scope: token.scope,
      tokenType: token.token_type,
    }));

    const data = {
      organizationId: state.orgId,
      provider: 'gmail',
      accountEmail: String(profile.email).toLowerCase(),
      displayName: profile.name || profile.email,
      status: 'VERIFIED',
      credentials: encrypted,
      scopes: token.scope || 'https://www.googleapis.com/auth/gmail.send',
      externalAccountId: profile.sub || null,
      lastVerifiedAt: new Date(),
    };

    const account = existing
      ? await this.prisma.emailAccount.update({ where: { id: existing.id }, data })
      : await this.prisma.emailAccount.create({ data });

    return { accountId: account.id, email: account.accountEmail, provider: account.provider, status: account.status };
  }

  async sendGmail(id: string, organizationId: string, payload: { to: string; subject: string; body: string }) {
    const account = await this.prisma.emailAccount.findFirst({ where: { id, organizationId, provider: 'gmail', status: 'VERIFIED' } });
    if (!account) throw new NotFoundException('Verified Gmail account not found');
    const credentials = JSON.parse(decryptProviderCredentials(account.credentials));
    let accessToken = credentials.accessToken as string;

    if (credentials.expiresAt && Date.now() >= Number(credentials.expiresAt) - 60_000 && credentials.refreshToken) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GMAIL_CLIENT_ID!,
          client_secret: process.env.GMAIL_CLIENT_SECRET!,
          refresh_token: credentials.refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });
      const refreshed = await refreshResponse.json();
      if (!refreshResponse.ok || !refreshed.access_token) throw new BadRequestException('Gmail access token refresh failed');
      accessToken = refreshed.access_token;
      credentials.accessToken = accessToken;
      credentials.expiresAt = Date.now() + Number(refreshed.expires_in || 3600) * 1000;
      await this.prisma.emailAccount.update({ where: { id }, data: { credentials: encryptProviderCredentials(JSON.stringify(credentials)), lastVerifiedAt: new Date() } });
    }

    const headers = [`To: ${payload.to}`, `Subject: ${payload.subject}`, 'Content-Type: text/plain; charset="UTF-8"', '', payload.body].join('\r\n');
    const raw = Buffer.from(headers).toString('base64url');
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    const result = await response.json();
    if (!response.ok || !result.id) throw new BadRequestException(result.error?.message || 'Gmail send failed');
    return { success: true, provider: 'gmail', messageId: result.id };
  }
}
