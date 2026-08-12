import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async login(email: string, passwordHash: string) {
    // Demo / seed login handler
    const mockUser = {
      id: 'usr-1',
      email,
      firstName: 'Alex',
      lastName: 'Morgan',
      organizationId: 'org-101',
      role: 'ADMIN',
    };

    const token = this.jwtService.sign({
      sub: mockUser.id,
      email: mockUser.email,
      orgId: mockUser.organizationId,
      role: mockUser.role,
    });

    return {
      user: mockUser,
      organization: {
        id: 'org-101',
        name: 'Acme Growth Labs',
        slug: 'acme-growth',
      },
      token,
    };
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string; organizationName: string }) {
    const orgId = `org-${Date.now()}`;
    const userId = `usr-${Date.now()}`;

    const mockUser = {
      id: userId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      organizationId: orgId,
      role: 'ADMIN',
    };

    const token = this.jwtService.sign({
      sub: userId,
      email: data.email,
      orgId: orgId,
      role: 'ADMIN',
    });

    return {
      user: mockUser,
      organization: {
        id: orgId,
        name: data.organizationName,
        slug: data.organizationName.toLowerCase().replace(/\s+/g, '-'),
      },
      token,
    };
  }
}
