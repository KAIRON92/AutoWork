import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

const AUTH_COOKIE = 'autowork_jwt_token';
const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function setAuthCookie(res: Response, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${AUTH_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure}`,
  );
}

function clearAuthCookie(res: Response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${AUTH_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
  );
}

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body.email, body.password);
    setAuthCookie(res, result.token);
    const { token: _token, ...safeResponse } = result;
    return safeResponse;
  }

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  @ApiOperation({ summary: 'Register a new tenant organization and administrator' })
  async register(
    @Body() body: { email: string; password: string; firstName: string; lastName: string; organizationName: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(body);
    setAuthCookie(res, result.token);
    const { token: _token, ...safeResponse } = result;
    return safeResponse;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Clear the current authentication session' })
  async logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res);
    return { success: true };
  }

  @Post('forgot-password')
  @UseGuards(AuthRateLimitGuard)
  @ApiOperation({ summary: 'Request password reset instructions' })
  async forgotPassword(@Body() body: { email: string }) {
    return await this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @UseGuards(AuthRateLimitGuard)
  @ApiOperation({ summary: 'Reset password with reset token' })
  async resetPassword(@Body() body: { token: string; password: string }) {
    return await this.authService.resetPassword(body.token, body.password);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current logged in user and tenant profile' })
  async getProfile(@Request() req: any) {
    return { user: req.user };
  }
}
