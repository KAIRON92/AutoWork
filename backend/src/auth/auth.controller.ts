import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user and return JWT bearer token' })
  async login(@Body() body: { email: string; passwordHash: string }) {
    return this.authService.login(body.email, body.passwordHash);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new organization tenant and admin user' })
  async register(
    @Body() body: { email: string; password: string; firstName: string; lastName: string; organizationName: string }
  ) {
    return this.authService.register(body);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user & organization profile' })
  async getProfile() {
    return {
      user: {
        id: 'usr-1',
        email: 'alex.director@autowork.com',
        firstName: 'Alex',
        lastName: 'Morgan',
        organizationId: 'org-101',
        role: 'ADMIN',
      },
      organization: {
        id: 'org-101',
        name: 'Acme Growth Labs',
        slug: 'acme-growth',
      },
    };
  }
}
