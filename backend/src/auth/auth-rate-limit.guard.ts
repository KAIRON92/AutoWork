<<<<<<< HEAD
import { CanActivate, ExecutionContext, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
=======
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
>>>>>>> origin/main
import Redis from 'ioredis';
import { ConfigService } from '../config/config.service';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
<<<<<<< HEAD
=======
  private readonly redis: Redis;
>>>>>>> origin/main
  private readonly windowSeconds = 15 * 60;
  private readonly loginLimit = 5;
  private readonly otherAuthLimit = 10;

<<<<<<< HEAD
  constructor(private readonly config: ConfigService) {}

  private getRedis(): Redis {
    return new Redis({
      host: this.config.get('redisHost'),
      port: this.config.get('redisPort'),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
=======
  constructor(config: ConfigService) {
    this.redis = new Redis({
      host: config.get('redisHost'),
      port: config.get('redisPort'),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
>>>>>>> origin/main
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.route?.path || request.url || 'auth';
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : 'anonymous';
<<<<<<< HEAD
    const forwarded = request.headers?.['x-forwarded-for'];
    const ip = request.ip || (Array.isArray(forwarded) ? forwarded[0] : forwarded) || 'unknown';
    const bucket = path.includes('/login') ? this.loginLimit : this.otherAuthLimit;
    const key = `autowork:auth-rate:${path}:${ip}:${email}`;
    const redis = this.getRedis();

    try {
      if (redis.status !== 'ready') await redis.connect();
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, this.windowSeconds);
      if (count > bucket) {
        throw new HttpException('Too many authentication attempts. Please try again later.', 429);
      }
      return true;
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 429) throw error;
      throw new ServiceUnavailableException('Authentication rate-limit service is unavailable');
    } finally {
      redis.disconnect();
=======
    const ip = request.ip || 'unknown';
    const bucket = path.includes('/login') ? this.loginLimit : this.otherAuthLimit;
    const key = `autowork:auth-rate:${path}:${ip}:${email}`;

    try {
      if (this.redis.status !== 'ready') await this.redis.connect();
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, this.windowSeconds);
      if (count > bucket) {
        throw new HttpException(
          { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Too many authentication attempts. Please try again later.' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Authentication rate-limit service is unavailable');
>>>>>>> origin/main
    }
  }
}
