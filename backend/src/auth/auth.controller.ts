import {
  Controller,
  Post,
  Get,
  Body,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() body: { email: string; passwordHash?: string; password?: string }) {
    const password = body.password || body.passwordHash || '';
    return await this.authService.login(body.email, password);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new tenant organization and administrator' })
  async register(@Body() body: { email: string; password: string; firstName: string; lastName: string; organizationName: string }) {
    return await this.authService.register(body);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset instructions' })
  async forgotPassword(@Body() body: { email: string }) {
    return await this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with reset token' })
  async resetPassword(@Body() body: { token: string; password: string }) {
    return await this.authService.resetPassword(body.token, body.password);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current logged in user and tenant profile' })
  async getProfile(@Request() req: any) {
    return {
      user: req.user || {
        id: 'usr-1',
        email: 'alex.morgan@acmegrowth.com',
        firstName: 'Alex',
        lastName: 'Morgan',
        organizationId: 'org-101',
        role: 'ADMIN',
      },
    };
  }
}
