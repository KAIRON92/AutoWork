import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '../config/config.service';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly redis: Redis;
  private readonly windowSeconds = 15 * 60;
  private readonly loginLimit = 5;
  private readonly otherAuthLimit = 10;

  constructor(config: ConfigService) {
    this.redis = new Redis({
      host: config.get('redisHost'),
      port: config.get('redisPort'),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.route?.path || request.url || 'auth';
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : 'anonymous';
    const forwarded = request.headers?.['x-forwarded-for'];
    const ip = request.ip || (Array.isArray(forwarded) ? forwarded[0] : forwarded) || 'unknown';
    const bucket = path.includes('/login') ? this.loginLimit : this.otherAuthLimit;
    const key = `autowork:auth-rate:${path}:${ip}:${email}`;

    try {
      if (this.redis.status !== 'ready') await this.redis.connect();
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, this.windowSeconds);
      if (count > bucket) {
        // NestJS 10.4.x does not export a dedicated TooManyRequestsException.
        // Return the standard HttpException directly so the status remains 429.
        const error = new Error('Too many authentication attempts. Please try again later.') as Error & { status?: number };
        error.status = 429;
        throw error;
      }
      return true;
    } catch (error: any) {
      if (error?.status === 429) throw error;
      throw new ServiceUnavailableException('Authentication rate-limit service is unavailable');
    }
  }
}
