import * as dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  port: number;
  environment: string;
  databaseUrl: string;
  redisHost: string;
  redisPort: number;
  jwtSecret: string;
  pcloudAppKey: string;
  pcloudAppSecret: string;
  pcloudAccessToken: string;
}

export const configuration = (): AppConfig => ({
  port: parseInt(process.env.PORT || '3001', 10),
  environment: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  jwtSecret: process.env.JWT_SECRET || 'autowork-super-secret-jwt-key-2026',
  pcloudAppKey: process.env.PCLOUD_APP_KEY || 'placeholder_app_key',
  pcloudAppSecret: process.env.PCLOUD_APP_SECRET || 'placeholder_app_secret',
  pcloudAccessToken: process.env.PCLOUD_ACCESS_TOKEN || 'placeholder_access_token',
});
