import { BadRequestException } from '@nestjs/common';
import { IPCloudAdapter } from './pcloud.interface';
import { PCloudRealAdapter } from './sharing/pcloud.adapter';
import { MockPCloudAdapter } from './mock-pcloud/mock-pcloud.adapter';

export class PCloudAdapterFactory {
  private static mockInstance: MockPCloudAdapter = new MockPCloudAdapter();
  private static realInstance: PCloudRealAdapter = new PCloudRealAdapter();

  static getMockAdapter(): MockPCloudAdapter {
    return this.mockInstance;
  }

  static getAdapter(provider: string = 'pcloud'): IPCloudAdapter {
    if (provider === 'mock_pcloud') {
      if (process.env.PCLOUD_ALLOW_MOCK !== 'true') {
        throw new BadRequestException('Mock pCloud provider is disabled. Enable PCLOUD_ALLOW_MOCK=true only for explicit dry-run testing.');
      }
      return this.mockInstance;
    }

    if (provider !== 'pcloud') {
      throw new BadRequestException(`Unsupported pCloud provider: ${provider}`);
    }

    return this.realInstance;
  }
}
