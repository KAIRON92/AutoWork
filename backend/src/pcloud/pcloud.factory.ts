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
    if (provider === 'mock_pcloud') return this.mockInstance;
    return this.realInstance;
  }
}
