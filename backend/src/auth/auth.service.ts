import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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

  async forgotPassword(email: string) {
    return { success: true, message: `If an account exists for ${email}, reset instructions will be generated.` };
  }

  async resetPassword(_token: string, _newPasswordPlain: string) {
    throw new BadRequestException('Password reset tokens are not configured yet');
  }
}
