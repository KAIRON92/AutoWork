import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async login(email: string, passwordPlain: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail }, include: { organization: true } });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid email or password');

    const token = this.jwtService.sign({ sub: user.id, email: user.email, orgId: user.organizationId, role: 'ADMIN' });
    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, organizationId: user.organizationId, role: 'ADMIN' },
      organization: { id: user.organization.id, name: user.organization.name, slug: user.organization.slug },
      token,
    };
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string; organizationName: string }) {
    const email = data.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('User with this email already exists');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const slug = data.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const org = await this.prisma.organization.create({ data: { name: data.organizationName, slug: `${slug}-${Date.now().toString().slice(-4)}` } });
    const user = await this.prisma.user.create({ data: { email, passwordHash, firstName: data.firstName, lastName: data.lastName, organizationId: org.id } });
    const token = this.jwtService.sign({ sub: user.id, email: user.email, orgId: org.id, role: 'ADMIN' });

    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, organizationId: org.id, role: 'ADMIN' },
      organization: { id: org.id, name: org.name, slug: org.slug },
      token,
    };
  }

  async forgotPassword(email: string) {
    // Reset-token delivery is intentionally not faked. Wire this endpoint to a real
    // transactional provider when the product requirement supplies one.
    return { success: true, message: `If an account exists for ${email}, reset instructions will be generated.` };
  }

  async resetPassword(_token: string, _newPasswordPlain: string) {
    throw new BadRequestException('Password reset tokens are not configured yet');
  }
}
