export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET is required and must be at least 32 characters long.');
  }

  if (isProduction && !process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required in production.');
  }

  const allowMock = process.env.PCLOUD_ALLOW_MOCK === 'true';
  if (isProduction && allowMock) {
    throw new Error('PCLOUD_ALLOW_MOCK must be false in production.');
  }

  const provider = process.env.PCLOUD_DEFAULT_PROVIDER || 'pcloud';
  if (isProduction && provider !== 'pcloud') {
    throw new Error('PCLOUD_DEFAULT_PROVIDER must be "pcloud" in production.');
  }

  if (isProduction || provider === 'pcloud') {
    const encryptionKey = process.env.PCLOUD_CREDENTIAL_ENCRYPTION_KEY?.trim();
    if (!encryptionKey) {
      throw new Error('PCLOUD_CREDENTIAL_ENCRYPTION_KEY is required for real pCloud credentials.');
    }

    let decodedLength = 0;
    try {
      decodedLength = Buffer.from(encryptionKey, 'base64').length;
    } catch {
      throw new Error('PCLOUD_CREDENTIAL_ENCRYPTION_KEY must be valid base64.');
    }
    if (decodedLength !== 32) {
      throw new Error('PCLOUD_CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes.');
    }
  }
}
