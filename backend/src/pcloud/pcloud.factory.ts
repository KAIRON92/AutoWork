import { IPCloudAdapter } from './pcloud.interface';
import { PCloudRealAdapter } from './sharing/pcloud.adapter';
import { MockPCloudAdapter } from './mock-pcloud/mock-pcloud.adapter';

export class PCloudAdapterFactory {
  private static mockInstance: MockPCloudAdapter = new MockPCloudAdapter();
  private static realInstance: PCloudRealAdapter = new PCloudRealAdapter();

  static getMockAdapter(): MockPCloudAdapter {
    return this.mockInstance;
  }

  static getAdapter(provider: string = 'mock_pcloud'): IPCloudAdapter {
    if (provider === 'pcloud') {
      return this.realInstance;
    }
    return this.mockInstance;
  }
}
