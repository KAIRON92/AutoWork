import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const path = request.originalUrl || request.url || '';

    // Public endpoints used before authentication and for operational health/docs.
    if (
      path.startsWith('/api/v1/auth/login') ||
      path.startsWith('/api/v1/auth/register') ||
      path.startsWith('/api/v1/auth/forgot-password') ||
      path.startsWith('/api/v1/auth/reset-password') ||
      path.startsWith('/api/health') ||
      path.startsWith('/api/docs')
    ) {
      return true;
    }

    const authorization = request.headers?.authorization as string | undefined;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) throw new UnauthorizedException('Authentication required');

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-token-key-autowork-2026',
      });
      if (!payload?.sub || !payload?.orgId) throw new UnauthorizedException('Invalid authentication token');
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
