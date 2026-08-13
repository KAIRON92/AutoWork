import { PCloudError, PCloudErrorCode } from '../pcloud.interface';

export class PCloudErrorMapper {
  static mapRawError(rawResult: number, rawErrorMsg?: string): PCloudError {
    const msg = rawErrorMsg || 'Unknown pCloud API Error';

    switch (rawResult) {
      case 1000:
      case 2000:
        return {
          code: PCloudErrorCode.PCLOUD_AUTH_FAILED,
          rawCode: rawResult,
          message: `pCloud Authentication Failed: ${msg}`,
          isTransient: false,
          timestamp: new Date().toISOString(),
        };

      case 2003:
        return {
          code: PCloudErrorCode.PCLOUD_PERMISSION_DENIED,
          rawCode: rawResult,
          message: `pCloud Permission Denied: ${msg}`,
          isTransient: false,
          timestamp: new Date().toISOString(),
        };

      case 2005:
      case 2009:
        return {
          code: PCloudErrorCode.PCLOUD_FILE_NOT_FOUND,
          rawCode: rawResult,
          message: `pCloud File or Folder Not Found: ${msg}`,
          isTransient: false,
          timestamp: new Date().toISOString(),
        };

      case 2010:
        return {
          code: PCloudErrorCode.PCLOUD_INVALID_RECIPIENT,
          rawCode: rawResult,
          message: `pCloud Invalid Recipient Email: ${msg}`,
          isTransient: false,
          timestamp: new Date().toISOString(),
        };

      case 2012:
        return {
          code: PCloudErrorCode.PCLOUD_SHARE_EXISTS,
          rawCode: rawResult,
          message: `pCloud Share Already Exists for this recipient: ${msg}`,
          isTransient: false,
          timestamp: new Date().toISOString(),
        };

      case 2004:
        return {
          code: PCloudErrorCode.PCLOUD_QUOTA_EXCEEDED,
          rawCode: rawResult,
          message: `pCloud Storage Quota Exceeded: ${msg}`,
          isTransient: false,
          timestamp: new Date().toISOString(),
        };

      case 2020:
        return {
          code: PCloudErrorCode.PCLOUD_VERIFICATION_REQUIRED,
          rawCode: rawResult,
          message: `pCloud Verification Required: ${msg}`,
          isTransient: false,
          timestamp: new Date().toISOString(),
        };

      case 4000:
        return {
          code: PCloudErrorCode.PCLOUD_RATE_LIMITED,
          rawCode: rawResult,
          message: `pCloud Rate Limit Exceeded: ${msg}`,
          isTransient: true,
          timestamp: new Date().toISOString(),
        };

      case 5000:
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          code: PCloudErrorCode.PCLOUD_TEMPORARY_ERROR,
          rawCode: rawResult,
          message: `pCloud Temporary Gateway/Server Error: ${msg}`,
          isTransient: true,
          timestamp: new Date().toISOString(),
        };

      default:
        return {
          code: PCloudErrorCode.PCLOUD_UNKNOWN_ERROR,
          rawCode: rawResult,
          message: `pCloud Unknown Error (${rawResult}): ${msg}`,
          isTransient: false,
          timestamp: new Date().toISOString(),
        };
    }
  }

  static fromNetworkError(err: Error): PCloudError {
    return {
      code: PCloudErrorCode.PCLOUD_TEMPORARY_ERROR,
      message: `Network Error contacting pCloud API: ${err.message}`,
      isTransient: true,
      timestamp: new Date().toISOString(),
    };
  }
}
