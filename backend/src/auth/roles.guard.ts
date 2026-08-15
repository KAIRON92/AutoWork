import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Reflector,
} from '@nestjs/common';
import { AppRole, ROLES_KEY } from './roles.decorator';

const ROLE_RANK: Record<AppRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
};

function isPublicPath(path: string): boolean {
  return (
    path.startsWith('/api/v1/auth/login') ||
    path.startsWith('/api/v1/auth/register') ||
    path.startsWith('/api/v1/auth/forgot-password') ||
    path.startsWith('/api/v1/auth/reset-password') ||
    path.startsWith('/api/health') ||
    path.startsWith('/api/docs')
  );
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const path = request.originalUrl || request.url || '';
    if (isPublicPath(path)) return true;

    const allowed = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const role = request.user?.role as AppRole | undefined;

    if (!role || !(role in ROLE_RANK)) {
      throw new ForbiddenException('A valid application role is required');
    }

    if (!allowed || allowed.length === 0) {
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
      return ROLE_RANK[role] >= ROLE_RANK.MEMBER;
    }

    if (allowed.includes(role)) return true;
    throw new ForbiddenException('You do not have permission to perform this action');
  }
}
