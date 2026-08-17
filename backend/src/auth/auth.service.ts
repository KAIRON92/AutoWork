import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  private async ensureAdminRole(organizationId: string) {
    const existing = await this.prisma.role.findFirst({ where: { organizationId, name: 'ADMIN' } });
    if (existing) return existing;
    return this.prisma.role.create({
      data: { organizationId, name: 'ADMIN', description: 'Full administrative access' },
    });
  }

  async login(email: string, passwordPlain: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid email or password');

    let role = user.role;
    if (!role) {
      role = await this.ensureAdminRole(user.organizationId);
      await this.prisma.user.update({ where: { id: user.id }, data: { roleId: role.id } });
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      orgId: user.organizationId,
      role: role.name,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        role: role.name,
      },
      organization: { id: user.organization.id, name: user.organization.name, slug: user.organization.slug },
      token,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Authenticated user no longer exists');

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        role: user.role?.name || 'MEMBER',
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
      },
    };
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string; organizationName: string }) {
    const email = data.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('User with this email already exists');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const slug = data.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const org = await this.prisma.organization.create({
      data: { name: data.organizationName, slug: `${slug}-${Date.now().toString().slice(-4)}` },
    });
    const role = await this.prisma.role.create({
      data: { organizationId: org.id, name: 'ADMIN', description: 'Full administrative access' },
    });
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        organizationId: org.id,
        roleId: role.id,
      },
    });

    const token = this.jwtService.sign({ sub: user.id, email: user.email, orgId: org.id, role: role.name });
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: org.id,
        role: role.name,
      },
      organization: { id: org.id, name: org.name, slug: org.slug },
      token,
    };
  }

  /**
   * Generate a cryptographically random reset token, hash it for storage,
   * and persist it with a 1-hour expiry. The raw token is returned for
   * delivery to the user (via email — requires transactional email infra).
   *
   * Security: always returns the same success message regardless of whether
   * the email exists, to prevent user enumeration.
   */
  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always return the same message to prevent user enumeration
    const successMessage = `If an account exists for ${normalizedEmail}, a password reset link has been sent.`;

    if (!user) {
      return { success: true, message: successMessage };
    }

    // Invalidate any existing unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate a 32-byte random token and hash it for storage
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // TODO: Send the reset email via transactional email infrastructure.
    // The raw token should be included in a link like:
    // ${FRONTEND_URL}/reset-password?token=${rawToken}
    // For now, log it in development mode only.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Auth] Password reset token for ${normalizedEmail}: ${rawToken}`);
    }

    return { success: true, message: successMessage };
  }

  /**
   * Validate a reset token (by hashing the provided raw token and comparing
   * to stored hashes), enforce expiry and single-use, then update the password.
   */
  async resetPassword(rawToken: string, newPasswordPlain: string) {
    if (!rawToken?.trim()) {
      throw new BadRequestException('A valid password reset token is required.');
    }
    if (!newPasswordPlain || newPasswordPlain.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters.');
    }

    const tokenHash = createHash('sha256').update(rawToken.trim()).digest('hex');

    const resetRecord = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    if (resetRecord.usedAt) {
      throw new BadRequestException('This password reset token has already been used.');
    }

    if (new Date() > resetRecord.expiresAt) {
      // Mark as used so it can't be retried
      await this.prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });
      throw new BadRequestException('This password reset token has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(newPasswordPlain, 12);

    // Update password and mark token as used in a transaction
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true, message: 'Password has been reset successfully. You can now log in with your new password.' };
  }
}
