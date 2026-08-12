import { Injectable } from '@nestjs/common';
import { configuration, AppConfig } from './configuration';

@Injectable()
export class ConfigService {
  private readonly config: AppConfig;

  constructor() {
    this.config = configuration();
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  get all(): AppConfig {
    return this.config;
  }
}
